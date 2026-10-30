import { GAME_FAMILY_MODE_IDS } from './gameFamilyModes.mjs';

const number = value => typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : 0;
export const emptyProfile = () => ({ version: 1, playTimeMs: 0, singleplayerPlayTimeMs: 0, multiplayerPlayTimeMs: 0, matches: {} });

export function normalizeProfile(value) {
  if (!value || value.version !== 1) return emptyProfile();
  return { version: 1, playTimeMs: number(value.playTimeMs), singleplayerPlayTimeMs: number(value.singleplayerPlayTimeMs), multiplayerPlayTimeMs: number(value.multiplayerPlayTimeMs), matches: Object.fromEntries(
    Object.entries(value.matches || {}).filter(([, match]) => match && GAME_FAMILY_MODE_IDS[match.family]?.includes(match.mode)).map(([id, match]) => [id, {
      family: match.family, mode: match.mode, difficulty: ['easy', 'normal', 'hard'].includes(match.difficulty) ? match.difficulty : 'easy',
      multiplayer: Boolean(match.multiplayer), createdAt: number(match.createdAt), rounds: number(match.rounds),
      average: match.mode !== 'odd' && number(match.rounds) > 0 && typeof match.average === 'number' && Number.isFinite(match.average) ? Math.min(10, number(match.average)) : null,
      bestRound: match.mode !== 'odd' && typeof match.bestRound === 'number' && Number.isFinite(match.bestRound) ? Math.min(10, number(match.bestRound)) : null,
      levels: number(match.levels), perfect: Math.min(number(match.perfect), number(match.rounds)),
      outcome: ['win', 'loss', 'draw'].includes(match.outcome) ? match.outcome : null,
    }]),
  ) };
}

// Keep only statistics, never scene assets, room codes or other players' names.
export function summarizeMatch(entry) {
  if (typeof entry?.id !== 'string' || !entry.id || ['__proto__', 'constructor', 'prototype'].includes(entry.id) || !GAME_FAMILY_MODE_IDS[entry.gameFamily]?.includes(entry.gameMode)) return null;
  const multiplayer = entry.gameType === 'multiplayer';
  const rows = Array.isArray(entry.leaderboard?.leaderboard) ? entry.leaderboard.leaderboard : [];
  const current = rows.find(row => row.playerId === entry.currentPlayerId);
  const rawResults = multiplayer ? current?.roundResults : entry.results;
  const results = Array.isArray(rawResults) ? rawResults : [];
  const odd = entry.gameMode === 'odd';
  const metric = row => number(odd ? row.oddLevelsCleared : row.totalScore);
  let outcome = null;
  if (multiplayer && current && rows.length > 1) {
    const rivals = rows.filter(row => row !== current);
    const bestRival = Math.max(...rivals.map(metric));
    outcome = metric(current) > bestRival ? 'win' : metric(current) === bestRival ? 'draw' : 'loss';
  }
  const rounds = number(multiplayer && current ? results.length : entry.rounds);
  const score = number(current ? current.totalScore : entry.totalScore);
  const bestRound = odd ? null : results.reduce((best, result) => Math.max(best, Math.min(10, number(result?.score))), 0);
  return {
    family: entry.gameFamily, mode: entry.gameMode, difficulty: entry.difficulty || 'easy',
    multiplayer, createdAt: number(entry.createdAt) || Date.now(), rounds,
    average: odd || !rounds ? null : Math.min(10, score / rounds),
    bestRound: results.length && !odd ? bestRound : null,
    levels: odd ? number(current ? current.oddLevelsCleared : entry.progressValue) : 0,
    perfect: odd ? 0 : results.filter(result => number(result.score) >= 10).length,
    outcome,
  };
}

export function mergeProfileMatches(value, entries) {
  const profile = normalizeProfile(value);
  for (const entry of entries) {
    const summary = summarizeMatch(entry);
    if (!summary) continue;
    const previous = profile.matches[entry.id];
    // A legacy history entry cannot erase a newer, identified multiplayer result.
    if (previous?.outcome && !summary.outcome) continue;
    profile.matches[entry.id] = { ...summary, createdAt: previous?.createdAt || summary.createdAt };
  }
  return profile;
}

export function getProfileStats(value) {
  const profile = normalizeProfile(value);
  const matches = Object.values(profile.matches).filter(match => !match.multiplayer).sort((a,b) => a.createdAt - b.createdAt);
  const families = Object.keys(GAME_FAMILY_MODE_IDS).map(id => {
    const games = matches.filter(match => match.family === id);
    const scored = games.filter(match => match.average !== null);
    return { id, count: games.length, best: scored.reduce((best, match) => !best || match.average > best.average ? match : best, null) };
  });
  const scored = matches.filter(match => match.average !== null);
  const outcomes = matches.filter(match => match.outcome);
  let streak = 0, bestStreak = 0;
  for (const match of outcomes) { streak = match.outcome === 'win' ? streak + 1 : 0; bestStreak = Math.max(bestStreak, streak); }
  const favorite = [...families].sort((a,b) => b.count - a.count)[0];
  const wins = outcomes.filter(match => match.outcome === 'win').length;
  const modes = new Map();
  for (const match of matches) { const key = match.family + ':' + match.mode; const item = modes.get(key) || { family: match.family, mode: match.mode, count: 0 }; item.count++; modes.set(key,item); }
  const modeBreakdown = [...modes.values()].sort((a,b) => b.count - a.count);
  return {
    total: matches.length, rounds: matches.reduce((sum, match) => sum + match.rounds, 0),
    playTimeMs: profile.singleplayerPlayTimeMs, perfect: matches.reduce((sum, match) => sum + match.perfect, 0),
    best: scored.reduce((best, match) => !best || match.average > best.average ? match : best, null),
    bestRound: matches.reduce((best, match) => match.bestRound !== null && (!best || match.bestRound > best) ? match.bestRound : best, null),
    average: scored.length ? scored.reduce((sum, match) => sum + match.average * match.rounds, 0) / scored.reduce((sum, match) => sum + match.rounds, 0) : null,
    oddBest: Math.max(0, ...matches.filter(match => match.mode === 'odd').map(match => match.levels)),
    wins, losses: outcomes.filter(match => match.outcome === 'loss').length,
    draws: outcomes.filter(match => match.outcome === 'draw').length,
    competitive: outcomes.length, winRate: outcomes.length ? wins / outcomes.length * 100 : null,
    streak, bestStreak, families, favorite: favorite?.count ? favorite : null,
    favoriteMode: modeBreakdown[0] || null,
    explored: families.filter(family => family.count).length,
  };
}
