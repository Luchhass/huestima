"use client";

import { emptyProfile, mergeProfileMatches, normalizeProfile } from '../../shared/profileStats.mjs';
export { getProfileStats } from '../../shared/profileStats.mjs';
export const PROFILE_STORAGE_KEY = 'huestima-local-profile';
export const PROFILE_CHANGE_EVENT = 'huestima-profile-change';

export function readProfile() {
  try { return normalizeProfile(JSON.parse(window.localStorage.getItem(PROFILE_STORAGE_KEY))); }
  catch { return emptyProfile(); }
}
function saveProfile(profile) {
  try {
    window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
    window.dispatchEvent(new Event(PROFILE_CHANGE_EVENT));
  } catch { /* Gameplay remains available when storage is disabled or full. */ }
}
export function recordProfileMatches(entries) {
  if (typeof window === 'undefined') return;
  saveProfile(mergeProfileMatches(readProfile(), entries));
}
export function addProfilePlayTime(milliseconds, multiplayer = false) {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) return;
  const profile = readProfile();
  profile.playTimeMs += milliseconds;
  if (multiplayer) profile.multiplayerPlayTimeMs += milliseconds;
  else profile.singleplayerPlayTimeMs += milliseconds;
  saveProfile(profile);
}
export function importProfileHistory() {
  try {
    const history = JSON.parse(window.localStorage.getItem('huestima-match-history'));
    if (Array.isArray(history) && history.length) recordProfileMatches(history);
  } catch { /* A damaged history does not prevent opening the profile. */ }
}
