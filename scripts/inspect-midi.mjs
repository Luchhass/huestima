import fs from "node:fs/promises";

const inputPath = process.argv[2];
const outputPath = process.argv[3];
const themeStartTick = Number(process.argv[4] || 0);
const exportPrefix = process.argv[5] || "MIDI_THEME";
if (!inputPath) throw new Error("Usage: node scripts/inspect-midi.mjs <file.mid> [output.js]");

const data = await fs.readFile(inputPath);
let offset = 0;

function text(bytes) {
  return data.subarray(bytes.start, bytes.end).toString("utf8");
}

function u16() {
  const value = data.readUInt16BE(offset);
  offset += 2;
  return value;
}

function u32() {
  const value = data.readUInt32BE(offset);
  offset += 4;
  return value;
}

function vlq(end) {
  let value = 0;
  let byte;
  do {
    if (offset >= end) throw new Error("Unexpected end of MIDI VLQ");
    byte = data[offset++];
    value = (value << 7) | (byte & 0x7f);
  } while (byte & 0x80);
  return value;
}

if (data.subarray(0, 4).toString("ascii") !== "MThd") {
  throw new Error("Not a MIDI file");
}

offset = 4;
const headerLength = u32();
const format = u16();
const trackCount = u16();
const division = u16();
offset = 8 + headerLength;

const tracks = [];
for (let trackIndex = 0; trackIndex < trackCount; trackIndex += 1) {
  const chunk = data.subarray(offset, offset + 4).toString("ascii");
  offset += 4;
  const length = u32();
  const end = offset + length;
  if (chunk !== "MTrk") throw new Error(`Expected MTrk, found ${chunk}`);

  let tick = 0;
  let runningStatus = null;
  let name = `Track ${trackIndex + 1}`;
  const notes = [];
  const programs = [];
  const tempos = [];
  const active = new Map();

  while (offset < end) {
    tick += vlq(end);
    let status = data[offset++];
    if (status < 0x80) {
      offset -= 1;
      if (runningStatus === null) throw new Error("Missing running status");
      status = runningStatus;
    } else if (status < 0xf0) {
      runningStatus = status;
    }

    if (status === 0xff) {
      const type = data[offset++];
      const metaLength = vlq(end);
      const start = offset;
      offset += metaLength;
      if (type === 0x03) name = text({ start, end: offset });
      if (type === 0x51 && metaLength === 3) {
        const microseconds = data.readUIntBE(start, 3);
        tempos.push({ tick, bpm: Math.round(60_000_000 / microseconds) });
      }
      continue;
    }

    if (status === 0xf0 || status === 0xf7) {
      offset += vlq(end);
      continue;
    }

    const type = status >> 4;
    const channel = status & 0x0f;
    const first = data[offset++];
    const second = type === 0x0c || type === 0x0d ? null : data[offset++];

    if (type === 0x0c) programs.push({ tick, channel, program: first });
    if (type === 0x09 && second > 0) {
      const key = `${channel}:${first}`;
      const stack = active.get(key) || [];
      stack.push({ tick, velocity: second });
      active.set(key, stack);
    }
    if (type === 0x08 || (type === 0x09 && second === 0)) {
      const key = `${channel}:${first}`;
      const stack = active.get(key);
      const start = stack?.shift();
      if (start) notes.push({ tick: start.tick, duration: tick - start.tick, note: first, velocity: start.velocity, channel });
    }
  }

  tracks.push({ name, notes, programs, tempos });
  offset = end;
}

const summary = {
  format,
  division,
  trackCount,
  tracks: tracks.map((track, index) => ({
    index,
    name: track.name,
    noteCount: track.notes.length,
    range: track.notes.length
      ? [Math.min(...track.notes.map(({ note }) => note)), Math.max(...track.notes.map(({ note }) => note))]
      : null,
    firstTick: track.notes[0]?.tick ?? null,
    lastTick: track.notes.at(-1)?.tick ?? null,
    endTick: track.notes.length
      ? Math.max(...track.notes.map(({ tick, duration }) => tick + duration))
      : null,
    offGridNotes: track.notes.filter(({ tick, duration }) => tick % 120 || duration % 120).length,
    channels: [...new Set(track.notes.map(({ channel }) => channel))],
    programs: track.programs,
    tempos: track.tempos,
  })),
};

if (!outputPath) {
  console.log(JSON.stringify(summary, null, 2));
} else {
  const ticksPerStep = division / 4;
  const events = tracks
    .flatMap((track, trackIndex) => track.notes
      .filter(({ tick }) => tick >= themeStartTick)
      .map(({ tick, duration, note, velocity }) => [
        Math.round((tick - themeStartTick) / ticksPerStep),
        Math.max(1, Math.round(duration / ticksPerStep)),
        note,
        velocity,
        trackIndex,
      ]))
    .sort((left, right) => left[0] - right[0] || left[4] - right[4] || left[2] - right[2]);
  const finalStep = Math.max(...events.map(([step, duration]) => step + duration));
  const loopSteps = Math.ceil(finalStep / 16) * 16;
  const bpm = tracks.flatMap(({ tempos }) => tempos)[0]?.bpm || 120;
  const generated =
    "// Generated from the user-provided licensed MIDI arrangement.\n" +
    "// Rebuild with the matching package.json music build command.\n" +
    `export const ${exportPrefix}_BPM = ${bpm};\n` +
    `export const ${exportPrefix}_LOOP_STEPS = ${loopSteps};\n` +
    `export const ${exportPrefix}_EVENTS = ${JSON.stringify(events)};\n`;
  await fs.writeFile(outputPath, generated);
  console.log(`Wrote ${events.length} notes across ${loopSteps} steps to ${outputPath}.`);
}
