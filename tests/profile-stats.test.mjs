import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyProfile, getProfileStats, mergeProfileMatches, normalizeProfile } from '../shared/profileStats.mjs';

const single = (id, overrides = {}) => ({ id, createdAt: 1000, gameType: 'singleplayer', gameFamily: 'color', gameMode: 'normal', difficulty: 'hard', rounds: 1, totalScore: 8, results: [{ score: 8 }], ...overrides });
const multi = (id, own, rivals, overrides = {}) => single(id, { gameType: 'multiplayer', currentPlayerId: 'me', leaderboard: { leaderboard: [{ playerId: 'me', totalScore: own, roundResults: [{ score: own }] }, ...rivals.map((score, i) => ({ playerId: 'rival' + i, totalScore: score, roundResults: [{ score }] }))] }, ...overrides });

test('profile migrates history idempotently and retains games beyond the history cap', () => {
  const entries = Array.from({ length: 30 }, (_, index) => single('match-' + index));
  const first = mergeProfileMatches({ ...emptyProfile(), playTimeMs: 12345 }, entries);
  const updated = mergeProfileMatches(first, entries.slice(-20));
  assert.equal(getProfileStats(updated).total, 30);
  assert.equal(updated.playTimeMs, 12345);
  assert.equal(getProfileStats(mergeProfileMatches(updated, [single('match-29', { totalScore: 10 })])).total, 30);
});

test('profile averages are weighted by completed rounds, with separate Odd records', () => {
  const stats = getProfileStats(mergeProfileMatches(null, [single('short', { totalScore: 10, results: [{ score: 10 }] }), single('long', { rounds: 9, totalScore: 45 }), single('odd', { gameFamily: 'perception', gameMode: 'odd', progressValue: 12, rounds: 12, totalScore: 0 })]));
  assert.equal(stats.average, 5.5);
  assert.equal(stats.best.average, 10);
  assert.equal(stats.oddBest, 12);
  assert.equal(stats.perfect, 1);
  assert.equal(stats.rounds, 22);
  assert.equal(stats.favorite.id, 'color');
});

test('only identified games with opponents count as wins losses or draws', () => {
  const entries = [multi('win', 9, [8]), multi('draw', 9, [9]), multi('loss', 8, [9]), multi('solo', 10, []), multi('legacy', 10, [8], { currentPlayerId: undefined }), single('practice')];
  const stats = getProfileStats(mergeProfileMatches(null, entries));
  assert.equal(stats.total, 6);
  assert.equal(stats.wins, 1); assert.equal(stats.losses, 1); assert.equal(stats.draws, 1);
  assert.equal(stats.competitive, 3);
  assert.ok(Math.abs(stats.winRate - 100 / 3) < 1e-10);
});

test('win streaks use chronological competitive results and survive repeated imports', () => {
  const entries = [multi('one', 9, [8], { createdAt: 1000 }), multi('two', 9, [8], { createdAt: 2000 }), multi('three', 8, [9], { createdAt: 3000 }), multi('four', 9, [8], { createdAt: 4000 })];
  const profile = mergeProfileMatches(null, entries.reverse());
  const stats = getProfileStats(profile);
  assert.equal(stats.bestStreak, 2); assert.equal(stats.streak, 1);
  assert.equal(getProfileStats(mergeProfileMatches(profile, [{ ...entries[0], currentPlayerId: undefined }])).wins, 3);
});

test('Odd multiplayer compares cleared levels instead of zero numeric scores', () => {
  const entry = multi('odd-win', 0, [0], { gameFamily: 'perception', gameMode: 'odd' });
  entry.leaderboard.leaderboard[0].oddLevelsCleared = 7;
  entry.leaderboard.leaderboard[1].oddLevelsCleared = 4;
  const stats = getProfileStats(mergeProfileMatches(null, [entry]));
  assert.equal(stats.wins, 1); assert.equal(stats.oddBest, 7); assert.equal(stats.average, null);
});

test('damaged profile data cannot introduce NaN or invalid game families', () => {
  const profile = normalizeProfile({ version: 1, playTimeMs: -100, matches: { bad: { family: 'fake', mode: 'normal' }, incomplete: { family: 'color', mode: 'normal', average: 'broken' } } });
  const stats = getProfileStats(profile);
  assert.equal(stats.total, 1); assert.equal(stats.playTimeMs, 0); assert.equal(stats.rounds, 0); assert.equal(stats.average, null);
  assert.deepEqual(mergeProfileMatches(null, [single('__proto__')]), emptyProfile());
});
