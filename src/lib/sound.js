"use client";

import { SOUND_STORAGE_KEY } from "./constants";

const MASTER_VOLUME = 0.92;
const MUTED_VOLUME = 0.0001;
const SOUND_CHANGE_EVENT = "huestima-sound-change";

let audioContext = null;
let mixBus = null;
let masterGain = null;
let noiseBuffer = null;
let userActivated = false;
let soundEnabled = true;
let soundPreferenceLoaded = false;
let didPrimeGraph = false;

const lastPlayedAt = new Map();

function readStoredSoundPreference() {
  if (typeof window === "undefined") return true;

  const stored = window.localStorage.getItem(SOUND_STORAGE_KEY);
  return stored !== "off";
}

function loadSoundPreference() {
  if (soundPreferenceLoaded) return soundEnabled;

  soundEnabled = readStoredSoundPreference();
  soundPreferenceLoaded = true;
  return soundEnabled;
}

function notifySoundPreferenceChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(SOUND_CHANGE_EVENT));
}

function applyMasterGain({ immediate = false } = {}) {
  if (!audioContext || !masterGain) return;

  const targetGain = loadSoundPreference() ? MASTER_VOLUME : MUTED_VOLUME;
  const gain = masterGain.gain;
  const now = audioContext.currentTime;

  gain.cancelScheduledValues(now);

  if (immediate) {
    gain.setValueAtTime(targetGain, now);
    return;
  }

  gain.setTargetAtTime(targetGain, now, 0.012);
}

function isSoundEnabled() {
  return loadSoundPreference();
}

function getAudioContextConstructor() {
  if (typeof window === "undefined") return null;
  return window.AudioContext || window.webkitAudioContext || null;
}

function ensureAudioContext() {
  if (typeof window === "undefined") return null;

  if (audioContext?.state === "closed") {
    audioContext = null;
    mixBus = null;
    masterGain = null;
    noiseBuffer = null;
  }

  if (!audioContext) {
    const AudioContextConstructor = getAudioContextConstructor();
    if (!AudioContextConstructor) return null;

    audioContext = new AudioContextConstructor();

    const compressor = audioContext.createDynamicsCompressor();
    compressor.threshold.value = -20;
    compressor.knee.value = 18;
    compressor.ratio.value = 6;
    compressor.attack.value = 0.004;
    compressor.release.value = 0.18;

    masterGain = audioContext.createGain();
    masterGain.gain.value = loadSoundPreference()
      ? MASTER_VOLUME
      : MUTED_VOLUME;

    compressor.connect(masterGain);
    masterGain.connect(audioContext.destination);
    mixBus = compressor;
    didPrimeGraph = false;
  }

  applyMasterGain({ immediate: true });
  return audioContext;
}

function getPlayableContext() {
  if (!isSoundEnabled()) return null;
  if (!userActivated && audioContext?.state !== "running") return null;

  const context = ensureAudioContext();
  if (!context) return null;

  if (context.state === "suspended") {
    context
      .resume()
      .then(primeAudioGraph)
      .catch(() => {});
  }

  return context;
}

function getNowMs() {
  if (typeof performance === "undefined") return Date.now();
  return performance.now();
}

function primeAudioGraph() {
  const context = audioContext;
  if (!context || !mixBus || didPrimeGraph || !isSoundEnabled()) return;

  didPrimeGraph = true;

  const startTime = context.currentTime + 0.001;
  const oscillator = context.createOscillator();
  const envelope = context.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(220, startTime);
  envelope.gain.setValueAtTime(0.0001, startTime);
  envelope.gain.setValueAtTime(0.0001, startTime + 0.02);

  oscillator.connect(envelope);
  envelope.connect(mixBus);
  oscillator.start(startTime);
  oscillator.stop(startTime + 0.025);
}

function allowSound(key, spacingMs) {
  const now = getNowMs();
  const previous = lastPlayedAt.get(key) || 0;

  if (now - previous < spacingMs) return false;

  lastPlayedAt.set(key, now);
  return true;
}

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function getNoiseBuffer(context) {
  if (noiseBuffer && noiseBuffer.sampleRate === context.sampleRate) {
    return noiseBuffer;
  }

  const length = Math.floor(context.sampleRate * 1.4);
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  let previous = 0;

  for (let index = 0; index < length; index += 1) {
    const white = Math.random() * 2 - 1;
    previous = previous * 0.54 + white * 0.46;
    data[index] = previous;
  }

  noiseBuffer = buffer;
  return buffer;
}

export function prepareAudio() {
  if (!isSoundEnabled()) return;

  const context = ensureAudioContext();
  if (!context) return;

  getNoiseBuffer(context);

  if (context.state === "running") {
    userActivated = true;
    primeAudioGraph();
  }
}

function connectWithPan(context, source, destination, pan) {
  if (typeof context.createStereoPanner !== "function" || pan === 0) {
    source.connect(destination);
    return;
  }

  const panner = context.createStereoPanner();
  panner.pan.value = pan;
  source.connect(panner);
  panner.connect(destination);
}

function scheduleTone(
  context,
  {
    frequency,
    endFrequency,
    type = "sine",
    gain = 0.04,
    duration = 0.1,
    delay = 0,
    attack = 0.006,
    pan = 0,
  },
) {
  if (!mixBus) return;

  const startTime = context.currentTime + delay;
  const endTime = startTime + duration;
  const attackTime = Math.min(attack, duration * 0.45);
  const oscillator = context.createOscillator();
  const envelope = context.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(Math.max(1, frequency), startTime);

  if (endFrequency) {
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(1, endFrequency),
      endTime,
    );
  }

  envelope.gain.setValueAtTime(0.0001, startTime);
  envelope.gain.linearRampToValueAtTime(gain, startTime + attackTime);
  envelope.gain.exponentialRampToValueAtTime(0.0001, endTime);

  oscillator.connect(envelope);
  connectWithPan(context, envelope, mixBus, pan);
  oscillator.start(startTime);
  oscillator.stop(endTime + 0.04);
}

function scheduleNoise(
  context,
  {
    duration = 0.025,
    gain = 0.025,
    delay = 0,
    filterFrequency = 2200,
    filterType = "bandpass",
    q = 6,
    pan = 0,
  } = {},
) {
  if (!mixBus) return;

  const startTime = context.currentTime + delay;
  const endTime = startTime + duration;
  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const envelope = context.createGain();
  const buffer = getNoiseBuffer(context);
  const offsetLimit = Math.max(0, buffer.duration - duration - 0.01);

  source.buffer = buffer;
  filter.type = filterType;
  filter.frequency.setValueAtTime(filterFrequency, startTime);
  filter.Q.value = q;

  envelope.gain.setValueAtTime(0.0001, startTime);
  envelope.gain.linearRampToValueAtTime(
    gain,
    startTime + Math.min(0.004, duration * 0.45),
  );
  envelope.gain.exponentialRampToValueAtTime(0.0001, endTime);

  source.connect(filter);
  filter.connect(envelope);
  connectWithPan(context, envelope, mixBus, pan);
  source.start(startTime, Math.random() * offsetLimit, duration);
  source.stop(endTime + 0.02);
}

function scheduleMechanicTick(context, step, progress, intensity = 1) {
  const accent = step % 8 === 0 ? 1.16 : 1;
  const pitch = 1040 + progress * 540 + (step % 3) * 38;
  const pan = ((step % 4) - 1.5) * 0.028;

  scheduleNoise(context, {
    duration: 0.006,
    gain: 0.006 * intensity * accent,
    filterFrequency: 6200 + progress * 2100,
    filterType: "highpass",
    q: 3,
    pan,
  });

  scheduleTone(context, {
    frequency: pitch,
    endFrequency: pitch * 1.09,
    type: "square",
    gain: 0.0065 * intensity * accent,
    duration: 0.013,
    attack: 0.001,
    pan,
  });
}

export function unlockAudio() {
  userActivated = true;

  const context = ensureAudioContext();
  if (!context) return;

  if (context?.state === "suspended") {
    context
      .resume()
      .then(primeAudioGraph)
      .catch(() => {});
    return;
  }

  primeAudioGraph();
}

export function resumeAudioIfAllowed() {
  if (!userActivated || !isSoundEnabled()) return;

  const context = ensureAudioContext();
  if (!context) return;

  if (context.state === "suspended") {
    context
      .resume()
      .then(primeAudioGraph)
      .catch(() => {});
    return;
  }

  applyMasterGain();
}

export function getSoundEnabledSnapshot() {
  return isSoundEnabled();
}

export function setSoundEnabled(enabled) {
  soundEnabled = Boolean(enabled);
  soundPreferenceLoaded = true;

  if (typeof window !== "undefined") {
    window.localStorage.setItem(SOUND_STORAGE_KEY, soundEnabled ? "on" : "off");
  }

  applyMasterGain();
  notifySoundPreferenceChange();

  if (soundEnabled) {
    unlockAudio();
  }
}

export function subscribeToSoundPreference(callback) {
  if (typeof window === "undefined") return () => {};

  const handleStorage = (event) => {
    if (event.key !== SOUND_STORAGE_KEY) return;

    soundEnabled = event.newValue !== "off";
    soundPreferenceLoaded = true;
    applyMasterGain();
    callback();
  };

  const handleLocalChange = () => {
    loadSoundPreference();
    callback();
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(SOUND_CHANGE_EVENT, handleLocalChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(SOUND_CHANGE_EVENT, handleLocalChange);
  };
}

export function playButtonHover() {
  const context = getPlayableContext();
  if (!context || !allowSound("button-hover", 58)) return;

  scheduleNoise(context, {
    duration: 0.018,
    gain: 0.019,
    filterFrequency: 5200,
    filterType: "highpass",
    q: 2,
  });

  scheduleTone(context, {
    frequency: 172,
    endFrequency: 214,
    type: "sine",
    gain: 0.021,
    duration: 0.105,
    attack: 0.01,
  });

  scheduleTone(context, {
    frequency: 380,
    endFrequency: 640,
    type: "triangle",
    gain: 0.043,
    duration: 0.078,
    attack: 0.003,
  });

  scheduleTone(context, {
    frequency: 1180,
    endFrequency: 1580,
    type: "sine",
    gain: 0.019,
    duration: 0.086,
    delay: 0.018,
    attack: 0.007,
  });
}

export function playButtonClick() {
  const context = getPlayableContext();
  if (!context || !allowSound("button-click", 34)) return;

  scheduleNoise(context, {
    duration: 0.03,
    gain: 0.058,
    filterFrequency: 1520,
    filterType: "bandpass",
    q: 7,
  });

  scheduleTone(context, {
    frequency: 92,
    endFrequency: 64,
    type: "sine",
    gain: 0.102,
    duration: 0.105,
    attack: 0.003,
  });

  scheduleTone(context, {
    frequency: 305,
    endFrequency: 480,
    type: "triangle",
    gain: 0.068,
    duration: 0.1,
    delay: 0.008,
    attack: 0.004,
  });

  scheduleTone(context, {
    frequency: 1040,
    endFrequency: 820,
    type: "sine",
    gain: 0.032,
    duration: 0.085,
    delay: 0.038,
    attack: 0.006,
  });
}

export function playCloseHover() {
  const context = getPlayableContext();
  if (!context || !allowSound("close-hover", 70)) return;

  scheduleNoise(context, {
    duration: 0.022,
    gain: 0.027,
    filterFrequency: 1900,
    filterType: "bandpass",
    q: 7,
  });

  scheduleTone(context, {
    frequency: 360,
    endFrequency: 220,
    type: "triangle",
    gain: 0.047,
    duration: 0.11,
    attack: 0.004,
  });

  scheduleTone(context, {
    frequency: 690,
    endFrequency: 430,
    type: "sine",
    gain: 0.019,
    duration: 0.09,
    delay: 0.012,
    attack: 0.008,
  });
}

export function playCloseClick() {
  const context = getPlayableContext();
  if (!context || !allowSound("close-click", 52)) return;

  scheduleNoise(context, {
    duration: 0.045,
    gain: 0.067,
    filterFrequency: 760,
    filterType: "bandpass",
    q: 8,
  });

  scheduleTone(context, {
    frequency: 330,
    endFrequency: 118,
    type: "sawtooth",
    gain: 0.069,
    duration: 0.155,
    attack: 0.002,
  });

  scheduleTone(context, {
    frequency: 82,
    endFrequency: 38,
    type: "sine",
    gain: 0.105,
    duration: 0.18,
    attack: 0.003,
  });

  scheduleTone(context, {
    frequency: 515,
    endFrequency: 295,
    type: "triangle",
    gain: 0.038,
    duration: 0.105,
    delay: 0.025,
    attack: 0.004,
  });
}

export function playDifficultyHover(index = 1) {
  const context = getPlayableContext();
  if (!context || !allowSound("difficulty-hover", 48)) return;

  const base = 255 + index * 74;
  const pan = (index - 1) * 0.05;

  scheduleNoise(context, {
    duration: 0.012,
    gain: 0.016,
    filterFrequency: 2450 + index * 420,
    filterType: "bandpass",
    q: 5,
    pan,
  });

  scheduleTone(context, {
    frequency: base,
    endFrequency: base * 1.38,
    type: "triangle",
    gain: 0.045,
    duration: 0.118,
    attack: 0.012,
    pan,
  });

  scheduleTone(context, {
    frequency: base * 2.05,
    endFrequency: base * 2.32,
    type: "sine",
    gain: 0.025,
    duration: 0.125,
    delay: 0.008,
    attack: 0.018,
    pan: (index - 1) * 0.04,
  });
}

export function playGameModeHover(index = 0) {
  const context = getPlayableContext();
  if (!context || !allowSound("game-mode-hover", 52)) return;

  const base = 360 + index * 94;
  const pan = (index - 1) * 0.045;

  scheduleTone(context, {
    frequency: base,
    endFrequency: base * 1.22,
    type: "triangle",
    gain: 0.04,
    duration: 0.09,
    attack: 0.006,
    pan,
  });

  scheduleNoise(context, {
    duration: 0.012,
    gain: 0.019,
    delay: 0.01,
    filterFrequency: 2600 + index * 780,
    filterType: "bandpass",
    q: 5,
    pan,
  });

  scheduleTone(context, {
    frequency: base * 0.48,
    endFrequency: base * 0.56,
    type: "sine",
    gain: 0.018,
    duration: 0.105,
    delay: 0.004,
    attack: 0.012,
    pan: -pan * 0.5,
  });
}

export function playDifficultySwitch(index = 1) {
  const context = getPlayableContext();
  if (!context || !allowSound("difficulty-switch", 90)) return;

  const base = 188 + index * 46;

  scheduleNoise(context, {
    duration: 0.036,
    gain: 0.059,
    filterFrequency: 1120 + index * 160,
    filterType: "bandpass",
    q: 8,
  });

  scheduleTone(context, {
    frequency: base,
    endFrequency: base * 0.72,
    type: "triangle",
    gain: 0.076,
    duration: 0.105,
    attack: 0.003,
  });

  scheduleTone(context, {
    frequency: base * 2.12,
    endFrequency: base * 2.52,
    type: "sine",
    gain: 0.052,
    duration: 0.145,
    delay: 0.035,
    attack: 0.009,
  });

  scheduleNoise(context, {
    duration: 0.018,
    gain: 0.031,
    delay: 0.072,
    filterFrequency: 3600,
    filterType: "highpass",
    q: 5,
  });
}

export function playDifficultySelect(difficultyId = "normal", index = 1) {
  const context = getPlayableContext();
  if (!context || !allowSound(`difficulty-select-${difficultyId}`, 120)) return;

  const presets = {
    easy: {
      start: 1020,
      end: 360,
      sub: 78,
      duration: 0.155,
      wave: "square",
      gain: 0.086,
      subGain: 0.078,
      noise: 3200,
      noiseGain: 0.052,
      tailFrequency: 540,
      tailGain: 0.032,
    },
    normal: {
      start: 760,
      end: 170,
      sub: 54,
      duration: 0.2,
      wave: "sawtooth",
      gain: 0.09,
      subGain: 0.092,
      noise: 2200,
      noiseGain: 0.05,
      tailFrequency: 265,
      tailGain: 0.026,
    },
    hard: {
      start: 520,
      end: 58,
      sub: 36,
      duration: 0.28,
      wave: "sawtooth",
      gain: 0.088,
      subGain: 0.1,
      noise: 1250,
      noiseGain: 0.05,
      tailFrequency: 88,
      tailGain: 0.032,
    },
  };

  const preset = presets[difficultyId] || presets.normal;
  const lift = 1 + index * 0.035;

  scheduleTone(context, {
    frequency: preset.start * lift,
    endFrequency: preset.end,
    type: preset.wave,
    gain: preset.gain,
    duration: preset.duration,
    attack: 0.001,
  });

  scheduleTone(context, {
    frequency: preset.sub,
    endFrequency: preset.sub * 0.55,
    type: "sine",
    gain: preset.subGain,
    duration: preset.duration * 0.9,
    attack: 0.002,
  });

  scheduleNoise(context, {
    duration: 0.028,
    gain: preset.noiseGain,
    filterFrequency: preset.noise,
    filterType: "bandpass",
    q: 6,
  });

  if (preset.tailGain > 0) {
    scheduleTone(context, {
      frequency: preset.tailFrequency,
      endFrequency:
        difficultyId === "easy"
          ? preset.tailFrequency * 1.18
          : preset.tailFrequency * 0.78,
      type: "sine",
      gain: preset.tailGain,
      duration: difficultyId === "hard" ? 0.18 : 0.105,
      delay: preset.duration * 0.62,
      attack: 0.01,
    });
  }
}

export function playGameModeSelect(gameModeId = "normal", index = 0) {
  const context = getPlayableContext();
  if (!context || !allowSound(`game-mode-select-${gameModeId}`, 105)) return;

  const presets = {
    normal: {
      start: 520,
      end: 260,
      body: 122,
      bodyEnd: 98,
      duration: 0.15,
      gain: 0.072,
      bodyGain: 0.043,
      noiseGain: 0.038,
      type: "triangle",
      noise: 1500,
      echo: false,
    },
    flash: {
      start: 1280,
      end: 420,
      body: 156,
      bodyEnd: 128,
      duration: 0.09,
      gain: 0.074,
      bodyGain: 0.039,
      noiseGain: 0.045,
      type: "square",
      noise: 4200,
      echo: false,
    },
    sequence: {
      start: 420,
      end: 230,
      body: 110,
      bodyEnd: 86,
      duration: 0.12,
      gain: 0.07,
      bodyGain: 0.044,
      noiseGain: 0.04,
      type: "triangle",
      noise: 2100,
      echo: true,
    },
    timed: {
      start: 880,
      end: 330,
      body: 180,
      bodyEnd: 116,
      duration: 0.11,
      gain: 0.068,
      bodyGain: 0.04,
      noiseGain: 0.03,
      type: "triangle",
      noise: 2600,
      echo: false,
    },
    gradient: {
      start: 680,
      end: 360,
      body: 136,
      bodyEnd: 182,
      duration: 0.14,
      gain: 0.066,
      bodyGain: 0.038,
      noiseGain: 0.032,
      type: "sine",
      noise: 3200,
      echo: true,
    },
    duel: {
      start: 980,
      end: 280,
      body: 92,
      bodyEnd: 148,
      duration: 0.13,
      gain: 0.074,
      bodyGain: 0.045,
      noiseGain: 0.046,
      type: "sawtooth",
      noise: 3800,
      echo: true,
    },
  };

  const preset = presets[gameModeId] || presets.normal;
  const lift = 1 + index * 0.025;

  scheduleTone(context, {
    frequency: preset.start * lift,
    endFrequency: preset.end,
    type: preset.type,
    gain: preset.gain,
    duration: preset.duration,
    attack: 0.001,
  });

  scheduleTone(context, {
    frequency: preset.body,
    endFrequency: preset.bodyEnd,
    type: "sine",
    gain: preset.bodyGain,
    duration: preset.duration + 0.07,
    delay: 0.006,
    attack: 0.006,
  });

  scheduleNoise(context, {
    duration: gameModeId === "flash" ? 0.018 : 0.024,
    gain: preset.noiseGain,
    filterFrequency: preset.noise,
    filterType: "bandpass",
    q: gameModeId === "flash" ? 8 : 5,
  });

  if (preset.echo) {
    [0.07, 0.14].forEach((delay, echoIndex) => {
      scheduleTone(context, {
        frequency: preset.end * (1 + echoIndex * 0.24),
        endFrequency: preset.end * (0.86 + echoIndex * 0.1),
        type: "sine",
        gain: 0.028 - echoIndex * 0.006,
        duration: 0.095,
        delay,
        attack: 0.006,
      });
    });
  }
}

export function playSequenceColorStep(index = 0) {
  const context = getPlayableContext();
  if (!context || !allowSound(`sequence-color-step-${index}`, 220)) return;

  const notes = [392, 466.16, 523.25, 622.25, 698.46];
  const root = notes[index % notes.length];
  const pan = (index - 2) * 0.045;

  scheduleNoise(context, {
    duration: 0.018,
    gain: 0.014,
    filterFrequency: 2500 + index * 360,
    filterType: "bandpass",
    q: 7,
    pan,
  });

  scheduleTone(context, {
    frequency: root * 2.05,
    endFrequency: root * 1.42,
    type: "square",
    gain: 0.028,
    duration: 0.082,
    attack: 0.001,
    pan,
  });

  scheduleTone(context, {
    frequency: root,
    endFrequency: root * 0.92,
    type: "triangle",
    gain: 0.032,
    duration: 0.15,
    delay: 0.01,
    attack: 0.004,
    pan,
  });

  scheduleTone(context, {
    frequency: root * 2.8,
    endFrequency: root * 2.2,
    type: "sine",
    gain: 0.01,
    duration: 0.12,
    delay: 0.052,
    attack: 0.008,
    pan: -pan * 0.6,
  });
}

export function startRgbHoverDrive() {
  const context = getPlayableContext();
  if (!context) return () => {};

  let isActive = true;
  let timerId = null;
  let step = 0;
  const startedAt = getNowMs();

  const pulse = () => {
    if (!isActive) return;

    const progress = clamp01((getNowMs() - startedAt) / 1500);
    const interval = Math.max(96, 210 - progress * 116);
    const base = 88 + progress * 42 + (step % 3) * 6;

    scheduleTone(context, {
      frequency: base,
      endFrequency: base * (1.08 + progress * 0.08),
      type: "sine",
      gain: 0.022 + progress * 0.014,
      duration: Math.min(0.18, interval / 1000 + 0.035),
      attack: 0.025,
      pan: Math.sin(step * 0.9) * 0.06,
    });

    scheduleTone(context, {
      frequency: base * 2.5,
      endFrequency: base * 2.75,
      type: "triangle",
      gain: 0.012 + progress * 0.009,
      duration: 0.105,
      delay: 0.018,
      attack: 0.018,
      pan: Math.sin(step * 0.9 + 1.4) * 0.05,
    });

    step += 1;
    timerId = window.setTimeout(pulse, interval);
  };

  timerId = window.setTimeout(pulse, 120);

  return () => {
    isActive = false;
    if (timerId) window.clearTimeout(timerId);
  };
}

export function playIntroStep(stepIndex) {
  const context = getPlayableContext();
  if (!context || !allowSound(`intro-step-${stepIndex}`, 260)) return;

  const root = [330, 392, 523][stepIndex] || 440;

  scheduleNoise(context, {
    duration: 0.023,
    gain: 0.018,
    filterFrequency: 1850 + stepIndex * 540,
    filterType: "bandpass",
    q: 7,
  });

  scheduleTone(context, {
    frequency: root,
    endFrequency: root * 0.96,
    type: "square",
    gain: 0.046,
    duration: 0.15,
    attack: 0.005,
  });

  scheduleTone(context, {
    frequency: root * 2,
    endFrequency: root * 2.18,
    type: "triangle",
    gain: 0.017,
    duration: 0.12,
    delay: 0.018,
    attack: 0.006,
  });

  if (stepIndex === 2) {
    scheduleTone(context, {
      frequency: 720,
      endFrequency: 980,
      type: "sine",
      gain: 0.03,
      duration: 0.18,
      delay: 0.13,
      attack: 0.012,
    });
  }
}

// Saniye rakamı geçişi için ayrı accent.
// Artık rastgele mekanik tick döngüsüne bağlı değil.
export function playMemorizeSecondTick(progress = 0) {
  const context = getPlayableContext();
  if (!context || !allowSound("memorize-second-tick", 420)) return;

  const normalizedProgress = clamp01(progress);
  const pitch = 1040 + normalizedProgress * 540;

  scheduleTone(context, {
    frequency: pitch * 0.5,
    endFrequency: pitch * 0.56,
    type: "sine",
    gain: 0.022 * 0.9,
    duration: 0.035,
    attack: 0.004,
  });
}

export function startMemorizeMechanism(durationMs = 5000) {
  const context = getPlayableContext();
  if (!context) return () => {};

  let isActive = true;
  let step = 0;
  let timerId = null;
  const startedAt = getNowMs();

  scheduleTone(context, {
    frequency: 920,
    endFrequency: 1320,
    type: "triangle",
    gain: 0.016,
    duration: 0.11,
    attack: 0.012,
  });

  scheduleTone(context, {
    frequency: 210,
    endFrequency: 260,
    type: "sine",
    gain: 0.014,
    duration: 0.16,
    attack: 0.025,
  });

  const tick = () => {
    if (!isActive) return;

    const elapsed = getNowMs() - startedAt;
    if (elapsed >= durationMs) return;

    const progress = clamp01(elapsed / durationMs);
    scheduleMechanicTick(context, step, progress, 0.9);
    step += 1;

    const interval = 58 + (step % 2) * 9 + (step % 6 === 0 ? 8 : 0);
    timerId = window.setTimeout(tick, interval);
  };

  timerId = window.setTimeout(tick, 42);

  return () => {
    isActive = false;
    if (timerId) window.clearTimeout(timerId);
  };
}

export function playSliderRatchet(position = 0.5) {
  const context = getPlayableContext();
  if (!context || !allowSound("slider-ratchet", 42)) return;

  const normalized = clamp01(position);
  const scale = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
  const noteIndex = Math.min(
    scale.length - 1,
    Math.max(0, Math.round(normalized * (scale.length - 1))),
  );
  const pitch = 146.83 * 2 ** (scale[noteIndex] / 12);

  scheduleNoise(context, {
    duration: 0.012,
    gain: 0.011,
    filterFrequency: 720 + normalized * 1450,
    filterType: "bandpass",
    q: 7,
  });

  scheduleTone(context, {
    frequency: pitch,
    endFrequency: pitch * 0.86,
    type: "triangle",
    gain: 0.023,
    duration: 0.046,
    attack: 0.003,
  });

  scheduleTone(context, {
    frequency: pitch * 2,
    endFrequency: pitch * 1.94,
    type: "sine",
    gain: 0.008,
    duration: 0.042,
    delay: 0.004,
    attack: 0.004,
  });
}

export function startScoreCountSound({ duration = 2.55, score = 0 } = {}) {
  const context = getPlayableContext();
  if (!context) {
    return {
      stop: () => {},
      finish: () => {},
    };
  }

  let isActive = true;
  let timerId = null;
  const durationMs = duration * 1000;
  const scoreLift = clamp01(Number(score) / 10 || 0);
  const isZeroScore = scoreLift <= 0.005;
  const isLowScore = scoreLift < 0.25;
  const startedAt = getNowMs();
  const activeNodes = [];

  if (isZeroScore) {
    scheduleNoise(context, {
      duration: 0.045,
      gain: 0.026,
      delay: Math.min(0.18, duration * 0.22),
      filterFrequency: 520,
      filterType: "bandpass",
      q: 8,
    });

    scheduleTone(context, {
      frequency: 138,
      endFrequency: 62,
      type: "sine",
      gain: 0.05,
      duration: Math.min(0.34, duration * 0.52),
      delay: Math.min(0.1, duration * 0.16),
      attack: 0.004,
    });

    return {
      stop: () => {
        isActive = false;
      },

      finish: () => {
        if (!isActive) return;

        isActive = false;
        playScoreResolve(score);
      },
    };
  }

  const startTime = context.currentTime;
  const endTime = startTime + duration;
  const riser = context.createOscillator();
  const riserGain = context.createGain();

  riser.type = isLowScore ? "sine" : "triangle";
  riser.frequency.setValueAtTime(
    isLowScore ? 172 : 155 + scoreLift * 55,
    startTime,
  );
  riser.frequency.exponentialRampToValueAtTime(
    isLowScore ? 108 : 360 + scoreLift * 135,
    endTime,
  );

  riserGain.gain.setValueAtTime(0.0001, startTime);
  riserGain.gain.linearRampToValueAtTime(
    isLowScore ? 0.012 : 0.02 + scoreLift * 0.011,
    startTime + 0.16,
  );
  riserGain.gain.linearRampToValueAtTime(
    isLowScore ? 0.017 : 0.03 + scoreLift * 0.016,
    Math.max(startTime + 0.18, endTime - 0.18),
  );
  riserGain.gain.exponentialRampToValueAtTime(0.0001, endTime);

  riser.connect(riserGain);
  riserGain.connect(mixBus);
  riser.start(startTime);
  riser.stop(endTime + 0.04);
  activeNodes.push(riser);

  const accents =
    scoreLift < 0.25
      ? [0.38, 0.78]
      : scoreLift < 0.55
        ? [0.22, 0.52, 0.82]
        : scoreLift < 0.85
          ? [0.16, 0.36, 0.58, 0.8]
          : [0.12, 0.29, 0.47, 0.66, 0.83];
  let step = 0;

  const tick = () => {
    if (!isActive) return;

    const elapsed = getNowMs() - startedAt;
    const progress = clamp01(elapsed / durationMs);
    if (step >= accents.length) return;

    const root = isLowScore ? 176 : 190 + scoreLift * 86;
    const semitone = isLowScore
      ? [0, -3][step] - progress * 2
      : [0, 3, 7, 10, 14][step] + progress * 5;
    const frequency = root * 2 ** (semitone / 12);

    scheduleTone(context, {
      frequency,
      endFrequency: frequency * (isLowScore ? 0.9 : 1.045),
      type: isLowScore ? "sine" : "triangle",
      gain: isLowScore ? 0.016 : 0.024 + progress * 0.018,
      duration: isLowScore ? 0.12 : 0.095,
      attack: 0.004,
      pan: ((step % 3) - 1) * 0.035,
    });

    scheduleNoise(context, {
      duration: isLowScore ? 0.015 : 0.01,
      gain: isLowScore ? 0.005 : 0.005 + progress * 0.006,
      filterFrequency: isLowScore ? 760 : 2100 + progress * 2100,
      filterType: isLowScore ? "bandpass" : "highpass",
      q: isLowScore ? 6 : 3,
      pan: ((step % 3) - 1) * 0.035,
    });

    step += 1;

    if (step < accents.length) {
      const nextAccentAt = accents[step] * durationMs;
      timerId = window.setTimeout(tick, Math.max(80, nextAccentAt - elapsed));
    }
  };

  timerId = window.setTimeout(tick, accents[0] * durationMs);

  return {
    stop: () => {
      isActive = false;
      if (timerId) window.clearTimeout(timerId);

      activeNodes.forEach((node) => {
        try {
          node.stop();
        } catch {}
      });
    },

    finish: () => {
      if (!isActive) return;

      isActive = false;
      if (timerId) window.clearTimeout(timerId);
      playScoreResolve(score);
    },
  };
}

export function playScoreResolve(score = 0) {
  const context = getPlayableContext();
  if (!context || !allowSound("score-resolve", 180)) return;

  const quality = clamp01(Number(score) / 10 || 0);

  if (quality <= 0.005) {
    scheduleNoise(context, {
      duration: 0.055,
      gain: 0.034,
      filterFrequency: 420,
      filterType: "bandpass",
      q: 7,
    });

    scheduleTone(context, {
      frequency: 150,
      endFrequency: 58,
      type: "sine",
      gain: 0.072,
      duration: 0.28,
      attack: 0.003,
    });

    scheduleTone(context, {
      frequency: 74,
      endFrequency: 42,
      type: "triangle",
      gain: 0.044,
      duration: 0.22,
      delay: 0.055,
      attack: 0.004,
    });

    return;
  }

  if (quality < 0.25) {
    const root = 185 + quality * 32;

    scheduleNoise(context, {
      duration: 0.034,
      gain: 0.018,
      filterFrequency: 780,
      filterType: "bandpass",
      q: 6,
    });

    [
      { ratio: 1, delay: 0, gain: 0.036, duration: 0.18 },
      { ratio: 0.84, delay: 0.105, gain: 0.03, duration: 0.22 },
    ].forEach((note, index) => {
      scheduleTone(context, {
        frequency: root * note.ratio,
        endFrequency: root * note.ratio * 0.9,
        type: index === 0 ? "triangle" : "sine",
        gain: note.gain,
        duration: note.duration,
        delay: note.delay,
        attack: 0.008,
        pan: (index - 0.5) * 0.05,
      });
    });

    return;
  }

  const root = 300 + quality * 150;

  if (quality < 0.55) {
    scheduleNoise(context, {
      duration: 0.024,
      gain: 0.012,
      filterFrequency: 1450,
      filterType: "bandpass",
      q: 5,
    });

    [
      { ratio: 1, delay: 0, gain: 0.034 },
      { ratio: 1.2, delay: 0.075, gain: 0.029 },
      { ratio: 1.5, delay: 0.165, gain: 0.026 },
    ].forEach((note, index) => {
      scheduleTone(context, {
        frequency: root * note.ratio,
        endFrequency: root * note.ratio * 0.985,
        type: index === 0 ? "triangle" : "sine",
        gain: note.gain,
        duration: 0.16,
        delay: note.delay,
        attack: 0.01,
        pan: (index - 1) * 0.045,
      });
    });

    return;
  }

  scheduleNoise(context, {
    duration: quality >= 0.85 ? 0.04 : 0.026,
    gain: quality >= 0.85 ? 0.023 : 0.017,
    filterFrequency: quality >= 0.85 ? 4300 : 3200,
    filterType: "highpass",
    q: 3,
  });

  const ratios = quality >= 0.85 ? [1, 1.25, 1.5, 2, 2.5] : [1, 1.25, 1.5, 2];

  ratios.forEach((ratio, index) => {
    scheduleTone(context, {
      frequency: root * ratio,
      endFrequency: root * ratio * (quality >= 0.85 ? 1.018 : 1.012),
      type: index === 0 ? "triangle" : "sine",
      gain: Math.max(0.018, 0.038 + quality * 0.008 - index * 0.004),
      duration: index >= 3 ? 0.28 : 0.13,
      delay: index * (quality >= 0.85 ? 0.058 : 0.052),
      attack: 0.008,
      pan: (index - (ratios.length - 1) / 2) * 0.055,
    });
  });
}

export function playFinalScore(totalScore = 0, maxScore = 50) {
  const context = getPlayableContext();
  if (!context || !allowSound("final-score", 600)) return;

  const ratio = clamp01(totalScore / Math.max(1, maxScore));
  const root = 185 + ratio * 110;

  const patterns =
    ratio >= 0.9
      ? [
          { ratio: 1, delay: 0, gain: 0.05 },
          { ratio: 1.25, delay: 0.07, gain: 0.046 },
          { ratio: 1.5, delay: 0.14, gain: 0.044 },
          { ratio: 2, delay: 0.23, gain: 0.048 },
          { ratio: 2.5, delay: 0.34, gain: 0.034 },
        ]
      : ratio >= 0.7
        ? [
            { ratio: 1, delay: 0, gain: 0.044 },
            { ratio: 1.25, delay: 0.09, gain: 0.039 },
            { ratio: 1.5, delay: 0.18, gain: 0.038 },
            { ratio: 2, delay: 0.31, gain: 0.035 },
          ]
        : ratio >= 0.45
          ? [
              { ratio: 1, delay: 0, gain: 0.038 },
              { ratio: 1.2, delay: 0.11, gain: 0.032 },
              { ratio: 1.5, delay: 0.24, gain: 0.03 },
            ]
          : [
              { ratio: 1, delay: 0, gain: 0.036 },
              { ratio: 0.84, delay: 0.12, gain: 0.032 },
              { ratio: 0.75, delay: 0.26, gain: 0.028 },
            ];

  scheduleNoise(context, {
    duration: ratio >= 0.7 ? 0.052 : 0.032,
    gain: ratio >= 0.7 ? 0.028 : 0.014,
    filterFrequency: ratio >= 0.7 ? 3600 : 1300,
    filterType: ratio >= 0.7 ? "highpass" : "bandpass",
    q: 4,
  });

  patterns.forEach((note, index) => {
    scheduleTone(context, {
      frequency: root * note.ratio,
      endFrequency: root * note.ratio * (ratio >= 0.45 ? 1.018 : 0.94),
      type: index % 2 === 0 ? "triangle" : "sine",
      gain: note.gain,
      duration: ratio >= 0.7 ? 0.26 : 0.22,
      delay: note.delay,
      attack: 0.014,
    });
  });

  if (ratio >= 0.9) {
    scheduleNoise(context, {
      duration: 0.08,
      gain: 0.018,
      delay: 0.34,
      filterFrequency: 5400,
      filterType: "highpass",
      q: 2,
    });
  }
}

playMemorizeSecondTick;
