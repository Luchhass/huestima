export function now() {
  return Date.now();
}

export function isoNow() {
  return new Date().toISOString();
}

export function seconds(valueMs) {
  return Math.round(valueMs / 1000);
}
