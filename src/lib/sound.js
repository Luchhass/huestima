"use client";

import { SOUND_STORAGE_KEY } from "./constants";

const SOUND_EFFECT_GAIN_BOOST = 15;
const MASTER_VOLUME = 0.92 * 5 * SOUND_EFFECT_GAIN_BOOST;
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

    const limiter = audioContext.createDynamicsCompressor();
    limiter.threshold.value = -1;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.002;
    limiter.release.value = 0.08;

    compressor.connect(masterGain);
    masterGain.connect(limiter);
    limiter.connect(audioContext.destination);
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
    releaseFloor = 0.0001,
    stopPadding = 0.04,
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

  envelope.gain.setValueAtTime(releaseFloor, startTime);
  envelope.gain.linearRampToValueAtTime(gain, startTime + attackTime);
  envelope.gain.exponentialRampToValueAtTime(releaseFloor, endTime);

  oscillator.connect(envelope);
  connectWithPan(context, envelope, mixBus, pan);
  oscillator.start(startTime);
  oscillator.stop(endTime + stopPadding);
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

export function playNavigationHover() {
  const context = getPlayableContext();
  if (!context || !allowSound("navigation-hover", 64)) return;

  scheduleNoise(context, {
    duration: 0.028,
    gain: 0.012,
    filterFrequency: 6800,
    filterType: "highpass",
    q: 1.4,
    pan: 0.12,
  });

  scheduleTone(context, {
    frequency: 520,
    endFrequency: 780,
    type: "sine",
    gain: 0.026,
    duration: 0.09,
    attack: 0.008,
    pan: -0.1,
  });

  scheduleTone(context, {
    frequency: 1040,
    endFrequency: 1320,
    type: "sine",
    gain: 0.014,
    duration: 0.075,
    delay: 0.018,
    attack: 0.006,
    pan: 0.14,
  });
}

export function playNavigationClick() {
  const context = getPlayableContext();
  if (!context || !allowSound("navigation-click", 42)) return;

  scheduleNoise(context, {
    duration: 0.025,
    gain: 0.025,
    filterFrequency: 2400,
    filterType: "bandpass",
    q: 4.5,
  });

  scheduleTone(context, {
    frequency: 196,
    endFrequency: 146,
    type: "sine",
    gain: 0.055,
    duration: 0.115,
    attack: 0.004,
    pan: -0.08,
  });

  scheduleTone(context, {
    frequency: 587,
    endFrequency: 784,
    type: "triangle",
    gain: 0.038,
    duration: 0.11,
    delay: 0.012,
    attack: 0.005,
    pan: 0.1,
  });

  scheduleTone(context, {
    frequency: 1175,
    endFrequency: 988,
    type: "sine",
    gain: 0.018,
    duration: 0.09,
    delay: 0.045,
    attack: 0.006,
    pan: 0.16,
  });
}

export function playSwitchHover() {
  const context = getPlayableContext();
  if (!context || !allowSound("switch-hover", 58)) return;

  scheduleNoise(context, {
    duration: 0.012,
    gain: 0.018,
    filterFrequency: 4100,
    filterType: "highpass",
    q: 2.6,
  });

  scheduleTone(context, {
    frequency: 880,
    endFrequency: 1040,
    type: "square",
    gain: 0.018,
    duration: 0.045,
    attack: 0.002,
    pan: -0.08,
  });

  scheduleTone(context, {
    frequency: 1320,
    endFrequency: 1560,
    type: "sine",
    gain: 0.014,
    duration: 0.06,
    delay: 0.012,
    attack: 0.003,
    pan: 0.08,
  });
}

export function playSwitchClick() {
  const context = getPlayableContext();
  if (!context || !allowSound("switch-click", 38)) return;

  scheduleNoise(context, {
    duration: 0.018,
    gain: 0.035,
    filterFrequency: 1900,
    filterType: "bandpass",
    q: 7,
  });

  scheduleTone(context, {
    frequency: 132,
    endFrequency: 104,
    type: "sine",
    gain: 0.066,
    duration: 0.075,
    attack: 0.002,
  });

  scheduleTone(context, {
    frequency: 740,
    endFrequency: 980,
    type: "square",
    gain: 0.032,
    duration: 0.055,
    delay: 0.006,
    attack: 0.002,
    pan: -0.1,
  });

  scheduleTone(context, {
    frequency: 1110,
    endFrequency: 1480,
    type: "sine",
    gain: 0.025,
    duration: 0.07,
    delay: 0.038,
    attack: 0.003,
    pan: 0.12,
  });
}

export function playCreditsArrival() {
  const context = getPlayableContext();
  if (!context || !allowSound("credits-arrival", 1800)) return;

  // Ceremonial pulse: a measured three-beat entrance and a broader final hit.
  [
    { delay: 0, frequency: 146.83, pan: -0.08, accent: 0.9 },
    { delay: 0.18, frequency: 146.83, pan: 0.08, accent: 0.66 },
    { delay: 0.36, frequency: 146.83, pan: -0.04, accent: 0.78 },
    { delay: 0.68, frequency: 146.83, pan: 0, accent: 0.95 },
  ].forEach(({ delay, frequency, pan, accent }) => {
    scheduleNoise(context, {
      delay,
      duration: 0.03,
      gain: 0.012 * accent,
      filterFrequency: 900,
      filterType: "bandpass",
      q: 2,
      pan,
    });
    scheduleTone(context, {
      delay,
      frequency,
      type: "sine",
      gain: 0.035 * accent,
      duration: 0.2,
      attack: 0.012,
      pan,
    });
  });

  // A repeated fifth-based fanfare motif keeps the contour firm and ceremonial.
  [
    { frequency: 293.66, delay: 0.02, duration: 0.22, pan: -0.12 },
    { frequency: 293.66, delay: 0.15, duration: 0.24, pan: 0.1 },
    { frequency: 440, delay: 0.29, duration: 0.26, pan: -0.06 },
    { frequency: 440, delay: 0.43, duration: 0.28, pan: 0.08 },
    { frequency: 587.33, delay: 0.57, duration: 0.3, pan: -0.08 },
    { frequency: 587.33, delay: 0.74, duration: 1.05, pan: 0 },
  ].forEach(({ frequency, delay, duration, pan }) => {
    scheduleTone(context, {
      frequency,
      type: "triangle",
      gain: 0.027,
      duration,
      delay,
      attack: 0.025,
      pan,
    });
  });

  // The resolving D-major chord carries the proud, sustained finish.
  [
    { frequency: 293.66, pan: -0.2, gain: 0.023 },
    { frequency: 369.99, pan: -0.07, gain: 0.02 },
    { frequency: 440, pan: 0.08, gain: 0.019 },
    { frequency: 587.33, pan: 0.2, gain: 0.017 },
  ].forEach(({ frequency, pan, gain }) => {
    scheduleTone(context, {
      frequency,
      type: "triangle",
      gain,
      duration: 1.4,
      delay: 0.73,
      attack: 0.07,
      pan,
      releaseFloor: 0.000001,
      stopPadding: 0.7,
    });
  });

  // A rising bell cascade supplies the polished shine without overpowering it.
  [
    { frequency: 587.33, delay: 0.32, pan: -0.22, gain: 0.008 },
    { frequency: 880, delay: 0.49, pan: 0.16, gain: 0.008 },
    { frequency: 1174.66, delay: 0.66, pan: -0.1, gain: 0.009 },
    { frequency: 1174.66, delay: 0.85, pan: 0.12, gain: 0.009 },
  ].forEach(({ frequency, delay, pan, gain }, index) => {
    scheduleTone(context, {
      frequency,
      type: "sine",
      gain,
      duration: index === 3 ? 1.1 : 0.42,
      delay,
      attack: 0.018,
      pan,
      releaseFloor: 0.000001,
      stopPadding: 0.7,
    });
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

  const tier = Math.max(0, Math.min(2, index));
  const pan = (tier - 1) * 0.025;
  const base = [147, 98, 73][tier];

  // A short, light preview of the click motif: the same transient,
  // descending body and harmonic accent in three intensity tiers.
  scheduleNoise(context, {
    duration: [0.014, 0.02, 0.028][tier],
    gain: [0.012, 0.017, 0.022][tier],
    filterFrequency: [1550, 820, 610][tier],
    filterType: "bandpass",
    q: 6.5,
    pan,
  });

  scheduleTone(context, {
    frequency: base,
    endFrequency: [110, 65, 49][tier],
    type: "triangle",
    gain: [0.028, 0.035, 0.041][tier],
    duration: [0.085, 0.105, 0.125][tier],
    attack: 0.004,
    pan,
  });

  scheduleTone(context, {
    frequency: [294, 196, 147][tier],
    endFrequency: [220, 120, 82][tier],
    type: "triangle",
    gain: [0.012, 0.017, 0.021][tier],
    duration: [0.075, 0.095, 0.115][tier],
    delay: 0.018,
    attack: 0.005,
    pan: -pan,
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

export function playDifficultySelect(difficultyId = "normal") {
  const context = getPlayableContext();
  if (!context || !allowSound(`difficulty-select-${difficultyId}`, 120)) return;

  // Easy inherits the former Normal sound, Normal inherits former Hard,
  // and Hard adds a new, heavier fourth tier of the same motif.
  const tier = difficultyId === "easy" ? 1 : difficultyId === "hard" ? 3 : 2;
  const pan = (tier - 2) * 0.025;
  const fundamental = [196, 147, 98, 73][tier];

  // Shared cabinet-button transient, synchronized with the origin flash.
  scheduleNoise(context, {
    duration: [0.018, 0.032, 0.052, 0.072][tier],
    gain: [0.021, 0.034, 0.049, 0.062][tier],
    filterFrequency: [2700, 1550, 820, 610][tier],
    filterType: "bandpass",
    q: 6.5,
    pan,
  });

  // The same tonal logo grows lower, longer and heavier at each level.
  scheduleTone(context, {
    frequency: fundamental,
    endFrequency: [294, 82, 42, 31][tier],
    type: "triangle",
    gain: [0.06, 0.079, 0.098, 0.105][tier],
    duration: [0.14, 0.205, 0.275, 0.34][tier],
    attack: 0.002,
    pan,
  });

  scheduleTone(context, {
    frequency: [110, 82, 58, 46][tier],
    endFrequency: [72, 48, 32, 24][tier],
    type: "sine",
    gain: [0.055, 0.082, 0.108, 0.102][tier],
    duration: [0.17, 0.23, 0.31, 0.39][tier],
    delay: 0.004,
    attack: 0.002,
  });

  // Secondary pulse lands as the color front clears the switch.
  scheduleTone(context, {
    frequency: [392, 294, 196, 147][tier],
    endFrequency: [523, 196, 98, 62][tier],
    type: "triangle",
    gain: [0.027, 0.04, 0.052, 0.064][tier],
    duration: 0.13 + tier * 0.032,
    delay: 0.058 + tier * 0.015,
    attack: 0.004,
    pan: -pan,
  });

  if (tier >= 1) {
    scheduleNoise(context, {
      duration: 0.026 + tier * 0.012,
      gain: 0.019 + tier * 0.009,
      delay: 0.07,
      filterFrequency: [2050, 2050, 980, 690][tier],
      filterType: "bandpass",
      q: 7,
    });

    scheduleTone(context, {
      frequency: [294, 294, 196, 147][tier],
      endFrequency: [147, 147, 73, 49][tier],
      type: "square",
      gain: [0.012, 0.012, 0.022, 0.032][tier],
      duration: [0.12, 0.12, 0.19, 0.24][tier],
      delay: 0.082,
      attack: 0.003,
      pan: -pan,
    });
  }

  if (tier >= 2) {
    scheduleTone(context, {
      frequency: tier === 3 ? 294 : 330,
      endFrequency: tier === 3 ? 98 : 147,
      type: "square",
      gain: tier === 3 ? 0.035 : 0.032,
      duration: tier === 3 ? 0.21 : 0.15,
      delay: 0.145,
      attack: 0.004,
      pan: 0.04,
    });
    scheduleTone(context, {
      frequency: tier === 3 ? 38 : 46,
      endFrequency: tier === 3 ? 22 : 29,
      type: "sine",
      gain: tier === 3 ? 0.09 : 0.086,
      duration: tier === 3 ? 0.31 : 0.23,
      delay: 0.13,
      attack: 0.004,
    });
  }

  if (tier === 3) {
    scheduleNoise(context, {
      duration: 0.085,
      gain: 0.024,
      delay: 0.17,
      filterFrequency: 480,
      filterType: "bandpass",
      q: 5.5,
    });
    scheduleTone(context, {
      frequency: 73,
      endFrequency: 36,
      type: "sawtooth",
      gain: 0.013,
      duration: 0.22,
      delay: 0.18,
      attack: 0.004,
    });
  }
}

export function playHintReveal() {
  const context = getPlayableContext();
  if (!context || !allowSound("hint-reveal", 220)) return;

  scheduleNoise(context, {
    duration: 0.07,
    gain: 0.028,
    filterFrequency: 1450,
    filterType: "bandpass",
    q: 5.2,
  });

  scheduleTone(context, {
    frequency: 246,
    endFrequency: 412,
    type: "triangle",
    gain: 0.04,
    duration: 0.24,
    attack: 0.012,
    pan: -0.08,
  });

  scheduleTone(context, {
    frequency: 522,
    endFrequency: 784,
    type: "sine",
    gain: 0.03,
    duration: 0.28,
    delay: 0.035,
    attack: 0.016,
    pan: 0.05,
  });

  scheduleTone(context, {
    frequency: 940,
    endFrequency: 1310,
    type: "triangle",
    gain: 0.018,
    duration: 0.22,
    delay: 0.085,
    attack: 0.01,
    pan: 0.12,
  });

  scheduleNoise(context, {
    duration: 0.035,
    gain: 0.014,
    delay: 0.12,
    filterFrequency: 4200,
    filterType: "highpass",
    q: 3,
    pan: 0.1,
  });
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

export function startRgbHoverDrive(onDriveUpdate) {
  const context = getPlayableContext();
  if (!context) return () => {};

  let isActive = true;
  let timerId = null;
  let step = 0;
  const startedAt = getNowMs();

  const pulse = () => {
    if (!isActive) return;

    const elapsed = getNowMs() - startedAt;
    const drive = elapsed / 900;
    const acceleration = Math.log2(1 + drive);
    const interval = Math.max(12, 200 / (1 + elapsed / 700) ** 0.67);
    const base = 90 + acceleration * 68 + (step % 3) * 7;
    const playbackRate = 1 + (elapsed / 800) ** 0.78 * 0.85;

    onDriveUpdate?.({ acceleration, elapsed, playbackRate });

    scheduleNoise(context, {
      duration: Math.min(0.016, interval / 5200),
      gain: 0.006 + Math.min(0.008, acceleration * 0.0025),
      filterFrequency: 1100 + acceleration * 760,
      filterType: "bandpass",
      q: 5.5,
      pan: Math.sin(step * 1.18) * 0.07,
    });

    scheduleTone(context, {
      frequency: base,
      endFrequency: base * (1.08 + Math.min(0.24, acceleration * 0.07)),
      type: "sine",
      gain: 0.022 + Math.min(0.02, acceleration * 0.01),
      duration: Math.min(0.18, interval / 1000 + 0.03),
      attack: Math.max(0.006, Math.min(0.025, interval / 5000)),
      pan: Math.sin(step * 0.9) * 0.06,
    });

    scheduleTone(context, {
      frequency: base * 2.5,
      endFrequency: base * 2.75,
      type: "triangle",
      gain: 0.012 + Math.min(0.012, acceleration * 0.006),
      duration: Math.min(0.105, interval / 740),
      delay: Math.min(0.018, interval / 4000),
      attack: Math.max(0.004, Math.min(0.018, interval / 6000)),
      pan: Math.sin(step * 0.9 + 1.4) * 0.05,
    });

    step += 1;
    timerId = window.setTimeout(pulse, interval);
  };

  timerId = window.setTimeout(pulse, 90);

  return () => {
    isActive = false;
    if (timerId) window.clearTimeout(timerId);
  };
}

export function playPageIntroLogoAppear() {
  const context = getPlayableContext();
  if (!context || !allowSound("page-intro-logo-appear", 1800)) return;

  scheduleNoise(context, {
    duration: 0.11,
    gain: 0.008,
    filterFrequency: 5200,
    filterType: "highpass",
    q: 1.4,
  });

  scheduleTone(context, {
    frequency: 523.25,
    endFrequency: 659.25,
    type: "sine",
    gain: 0.022,
    duration: 0.38,
    attack: 0.035,
    pan: -0.06,
  });

  scheduleTone(context, {
    frequency: 1046.5,
    endFrequency: 1318.51,
    type: "sine",
    gain: 0.011,
    duration: 0.3,
    delay: 0.09,
    attack: 0.028,
    pan: 0.08,
  });
}

export function playPageIntroBrandReveal() {
  const context = getPlayableContext();
  if (!context || !allowSound("page-intro-brand-reveal", 1800)) return;

  scheduleNoise(context, {
    duration: 0.48,
    gain: 0.008,
    filterFrequency: 5600,
    filterType: "highpass",
    q: 1.1,
    pan: -0.1,
  });

  scheduleTone(context, {
    frequency: 220,
    endFrequency: 246.94,
    type: "sine",
    gain: 0.02,
    duration: 0.82,
    attack: 0.11,
    pan: -0.06,
  });

  [
    { delay: 0.12, frequency: 440, pan: 0.1, gain: 0.018 },
    { delay: 0.4, frequency: 587.33, pan: -0.1, gain: 0.02 },
  ].forEach(({ delay, frequency, pan, gain }) => {
    scheduleTone(context, {
      frequency,
      type: "sine",
      gain,
      duration: 0.58,
      delay,
      attack: 0.06,
      pan,
      releaseFloor: 0.000001,
      stopPadding: 0.45,
    });
  });

  [
    { frequency: 293.66, pan: -0.2, gain: 0.018 },
    { frequency: 369.99, pan: -0.07, gain: 0.016 },
    { frequency: 440, pan: 0.08, gain: 0.015 },
    { frequency: 587.33, pan: 0.2, gain: 0.012 },
  ].forEach(({ frequency, pan, gain }) => {
    scheduleTone(context, {
      frequency,
      type: "sine",
      gain,
      duration: 1.24,
      delay: 0.5,
      attack: 0.12,
      pan,
      releaseFloor: 0.000001,
      stopPadding: 0.75,
    });
  });

  scheduleTone(context, {
    frequency: 1174.66,
    endFrequency: 1318.51,
    type: "sine",
    gain: 0.006,
    duration: 0.78,
    delay: 0.64,
    attack: 0.055,
    pan: 0.12,
    releaseFloor: 0.000001,
    stopPadding: 0.6,
  });
}

export function playPageIntroBrandExit() {
  const context = getPlayableContext();
  if (!context || !allowSound("page-intro-brand-exit", 1800)) return;

  scheduleNoise(context, {
    duration: 0.32,
    gain: 0.018,
    filterFrequency: 1250,
    filterType: "bandpass",
    q: 2.8,
  });

  scheduleTone(context, {
    frequency: 620,
    endFrequency: 174,
    type: "triangle",
    gain: 0.04,
    duration: 0.43,
    attack: 0.025,
    pan: 0.08,
  });

  scheduleTone(context, {
    frequency: 156,
    endFrequency: 92,
    type: "sine",
    gain: 0.048,
    duration: 0.45,
    attack: 0.03,
    pan: -0.06,
  });
}

export function playPageIntroCardMorph() {
  const context = getPlayableContext();
  if (!context || !allowSound("page-intro-card-morph", 1800)) return;

  scheduleNoise(context, {
    duration: 0.88,
    gain: 0.034,
    filterFrequency: 720,
    filterType: "lowpass",
    q: 1.4,
  });

  scheduleTone(context, {
    frequency: 128,
    endFrequency: 48,
    type: "sine",
    gain: 0.075,
    duration: 1.08,
    attack: 0.055,
  });

  scheduleTone(context, {
    frequency: 740,
    endFrequency: 196,
    type: "triangle",
    gain: 0.036,
    duration: 0.92,
    delay: 0.04,
    attack: 0.045,
    pan: -0.1,
  });

  scheduleTone(context, {
    frequency: 1040,
    endFrequency: 330,
    type: "sine",
    gain: 0.02,
    duration: 0.78,
    delay: 0.12,
    attack: 0.055,
    pan: 0.12,
  });
}

export function playPageIntroCardSettle() {
  const context = getPlayableContext();
  if (!context || !allowSound("page-intro-card-settle", 1800)) return;

  scheduleNoise(context, {
    duration: 0.04,
    gain: 0.048,
    filterFrequency: 980,
    filterType: "bandpass",
    q: 4.5,
  });

  scheduleTone(context, {
    frequency: 82,
    endFrequency: 52,
    type: "sine",
    gain: 0.092,
    duration: 0.16,
    attack: 0.004,
  });

  scheduleTone(context, {
    frequency: 392,
    endFrequency: 294,
    type: "triangle",
    gain: 0.034,
    duration: 0.13,
    delay: 0.018,
    attack: 0.004,
  });
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

export function playLevelCountStep(index = 0, total = 5) {
  const context = getPlayableContext();
  if (!context || !allowSound("level-count-step", 42)) return;

  const tier = Math.max(0, Math.min(Math.max(total - 1, 0), index));
  const normalized = total > 1 ? clamp01(tier / (total - 1)) : 0;
  const switchTone = [150, 180, 215, 260, 320][tier] || 320;
  const bodyTone = [95, 110, 128, 150, 178][tier] || 178;
  const primaryGain = [0.026, 0.034, 0.043, 0.054, 0.067][tier] || 0.067;
  const bodyGain = [0.034, 0.038, 0.043, 0.049, 0.056][tier] || 0.056;
  const bodyEndRatio = [0.62, 0.66, 0.7, 0.74, 0.78][tier] || 0.78;
  const bodyDuration = [0.105, 0.095, 0.087, 0.079, 0.072][tier] || 0.072;

  // A bright front click keeps the textured switch tone readable on small speakers.
  scheduleNoise(context, {
    duration: 0.018 - normalized * 0.005,
    gain: 0.009 + normalized * 0.012,
    filterFrequency: 1800 + normalized * 1700,
    filterType: "bandpass",
    q: 7.5,
  });

  // All layers start together, so every level reads as one tactile click.
  scheduleTone(context, {
    frequency: bodyTone,
    endFrequency: bodyTone * bodyEndRatio,
    type: "sine",
    gain: bodyGain,
    duration: bodyDuration,
    attack: 0.001,
  });

  scheduleTone(context, {
    frequency: switchTone,
    endFrequency: switchTone * 0.68,
    type: "triangle",
    gain: primaryGain,
    duration: 0.088 - normalized * 0.02,
    attack: 0.001,
  });

  scheduleTone(context, {
    frequency: switchTone * 1.72,
    endFrequency: switchTone * 1.08,
    type: "sawtooth",
    gain: primaryGain * (0.18 + normalized * 0.16),
    duration: 0.052 - normalized * 0.012,
    delay: 0.002,
    attack: 0.001,
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
