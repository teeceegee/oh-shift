import { describe, expect, it } from 'vitest';
import { getBundledDictionary } from '../../src/data/loadDictionary';
import {
  applyShift,
  createNewGame,
  DEFAULT_ECONOMY,
  dispatchAction,
  findMatchesStartingAt,
} from '../../src/engine';

const dict = getBundledDictionary();

describe('Oh! Shift v4 — Deliberate 1-Tap First-Letter Word Claiming', () => {
  const sampleBoard = [
    ['S', 'T', 'A', 'R', 'E'],
    ['P', 'L', 'O', 'N', 'D'],
    ['C', 'A', 'T', 'I', 'M'],
    ['B', 'R', 'E', 'A', 'K'],
    ['G', 'H', 'O', 'U', 'L'],
  ];

  it('Shifting never triggers accidental word claims or tile replacements', () => {
    const base = createNewGame({ seed: 'no-accidents', dict, minMatchLength: 3 });
    const board = [
      ['T', 'P', 'L', 'A', 'N'],
      ['X', 'Q', 'Z', 'J', 'K'],
      ['V', 'W', 'X', 'Z', 'Q'],
      ['J', 'K', 'X', 'V', 'Z'],
      ['Q', 'Z', 'J', 'X', 'W'],
    ];
    const state = { ...base, board };

    // Shift row 0 left -> spells PLANT, but must NOT fire until player taps 'P'!
    const shifted = dispatchAction(
      state,
      { type: 'SHIFT', op: { axis: 'row', index: 0, direction: 'left' } },
      dict,
    );
    expect(shifted.flash).toBeNull();
    expect(shifted.state.board[0].join('')).toBe('PLANT');
    expect(shifted.state.savedWords).toHaveLength(0);

    // Now tap the first letter 'P' at (0, 0) -> claims PLANT, flashes, saves, replaces!
    const claimed = dispatchAction(shifted.state, { type: 'CLAIM_AT', coord: { row: 0, col: 0 } }, dict);
    expect(claimed.error).toBeUndefined();
    expect(claimed.flash).not.toBeNull();
    expect(claimed.flash!.matches[0].word).toBe('PLANT');
    expect(claimed.state.savedWords[0].word).toBe('PLANT');
    expect(claimed.state.score).toBe(DEFAULT_ECONOMY.scoreFiveLetter);
    expect(claimed.state.board[0].join('')).not.toBe('PLANT');
  });

  it('Tapping a shared first letter claims BOTH horizontal and vertical words with Cross-Word Bonus', () => {
    const base = createNewGame({ seed: 'cross-bonus', dict, minMatchLength: 3 });
    // (0,0) = 'S': horizontal 'STARE' (50) + vertical 'SLIM' (25) + Cross Bonus (25) = 100!
    const board = [
      ['S', 'T', 'A', 'R', 'E'],
      ['L', 'Q', 'Z', 'J', 'K'],
      ['I', 'W', 'X', 'Z', 'Q'],
      ['M', 'K', 'X', 'V', 'Z'],
      ['X', 'Z', 'J', 'X', 'W'],
    ];
    const state = { ...base, board };

    const res = dispatchAction(state, { type: 'CLAIM_AT', coord: { row: 0, col: 0 } }, dict);
    expect(res.error).toBeUndefined();
    expect(res.flash!.crossBonus).toBe(true);
    expect(res.flash!.matches.map((m) => m.word).sort()).toEqual(['SLIM', 'STARE']);
    expect(res.state.score).toBe(
      DEFAULT_ECONOMY.scoreFiveLetter +
        DEFAULT_ECONOMY.scoreFourLetter +
        DEFAULT_ECONOMY.crossWordBonus,
    );
    expect(res.state.stats.crossWordsFound).toBe(1);
  });

  it('Picks the longest valid word starting at the tapped tile and handles RIPE', () => {
    const ripeBoard = [
      ['C', 'K', 'P', 'L', 'I'],
      ['R', 'I', 'P', 'E', 'Y'],
      ['U', 'D', 'T', 'G', 'P'],
      ['I', 'M', 'B', 'O', 'B'],
      ['A', 'A', 'M', 'M', 'P'],
    ];
    const matches = findMatchesStartingAt(ripeBoard, { row: 1, col: 0 }, dict, 3);
    expect(matches.some((m) => m.word === 'RIPE' && m.axis === 'horizontal')).toBe(true);

    // Tapping a letter that starts no valid word returns a clean error without mutating board
    const base = createNewGame({ seed: 'miss-tap', dict, minMatchLength: 4 });
    const miss = dispatchAction(
      { ...base, board: ripeBoard },
      { type: 'CLAIM_AT', coord: { row: 4, col: 4 } },
      dict,
    );
    expect(miss.error).toMatch(/no 4\+ letter/i);
    expect(miss.flash).toBeNull();
  });

  it('Row and column wraparound shifts reverse cleanly and Undo works', () => {
    const right = applyShift(sampleBoard, { axis: 'row', index: 0, direction: 'right' });
    expect(right[0]).toEqual(['E', 'S', 'T', 'A', 'R']);
    expect(applyShift(right, { axis: 'row', index: 0, direction: 'left' })[0]).toEqual([
      'S', 'T', 'A', 'R', 'E',
    ]);

    const state = createNewGame({ seed: 'undo-test', dict });
    const s1 = dispatchAction(state, { type: 'SHIFT', op: { axis: 'col', index: 1, direction: 'down' } }, dict);
    const u1 = dispatchAction(s1.state, { type: 'UNDO_SHIFT' }, dict);
    expect(u1.state.board).toEqual(state.board);
    expect(u1.state.shiftsMade).toBe(0);
  });

  it('Daily mode stops further shifts at 25 but still allows claiming remaining board words', () => {
    let state = createNewGame({ seed: 'daily-2026-11-25', mode: 'daily', dict });
    for (let i = 0; i < DEFAULT_ECONOMY.dailyShiftLimit; i++) {
      state = dispatchAction(
        state,
        { type: 'SHIFT', op: { axis: 'row', index: i % 5, direction: 'right' } },
        dict,
      ).state;
    }
    expect(state.dailyComplete).toBe(true);
    const blockedShift = dispatchAction(
      state,
      { type: 'SHIFT', op: { axis: 'row', index: 0, direction: 'left' } },
      dict,
    );
    expect(blockedShift.error).toMatch(/25-shift limit/i);
  });
});
