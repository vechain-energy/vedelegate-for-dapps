import { describe, it, expect } from 'vitest';
import { validateVotes, voteKey, readVotePreference } from '../src/modules/veDelegate/voting';
const a = '0x' + 'a'.repeat(64), b = '0x' + 'b'.repeat(64);
describe('vote preferences', () => {
  it('retains integer allocations and removes zero entries', () => {
    expect(validateVotes({ appIds: [a, b], percentages: [100, 0] })).toEqual({ appIds: [a], percentages: [100] });
  });
  it.each([[99], [101], [-1], [NaN], [100.5], []])('rejects invalid allocation %j', percentages => {
    expect(() => validateVotes({ appIds: [a], percentages })).toThrow();
  });
  it('rejects duplicates and unavailable apps', () => {
    expect(() => validateVotes({ appIds: [a, a.toUpperCase()], percentages: [50, 50] })).toThrow();
    expect(() => validateVotes({ appIds: [a], percentages: [100] }, new Set([b]))).toThrow();
  });
  it('compares allocations independently of order and zero entries', () => {
    expect(voteKey({ appIds: [b, a], percentages: [0, 100] })).toBe(voteKey({ appIds: [a], percentages: [100] }));
  });
  it('distinguishes empty preferences from malformed reads', () => {
    expect(readVotePreference([[], []])).toEqual({ appIds: [], percentages: [] });
    expect(readVotePreference([[a], [100n]])).toEqual({ appIds: [a], percentages: [100] });
    expect(() => readVotePreference(null)).toThrow();
    expect(() => readVotePreference([[a], []])).toThrow();
  });
});
it('explains how to fix fractional user input', () => {
  expect(() => validateVotes({ appIds: [a, b], percentages: [50.5, 49.5] })).toThrow(/whole percentages/i);
});
