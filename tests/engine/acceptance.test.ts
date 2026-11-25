import { describe, expect, it } from 'vitest';
import { getBundledDictionary } from '../../src/data/loadDictionary';
import {
  applyShift,
  createNewGame,
  DEFAULT_ECONOMY,
  dispatchAction,
  findLineMatches,
} from '../../src/engine';

const dict = getBundledDictionary();

describe('Oh! Shift v3 — Unlimited Shifts & Auto-Spot H/V Matching', () => {
  const sampleBoard = [
    ['S', 'T', 'A', 'R', 'E'],
    ['P', 'L', 'O', 'N', 'D'],
    ['C', 'A', 'T', 'I', 'M'],
    ['B', 'R', 'E', 'A', 'K'],
    ['G', 'H', 'O', 'U', 'L'],
  ];

  it('Starting board is calm (0 pre-existing H/V matches)', () => {
    for (let i = 0; i < 15; i++) {
      const state = createNewGame({ seed: `calm-${i}`, dict, minMatchLength: 4 });
      expect(findLineMatches(state.board, dict, 4)).toHaveLength(0);
    }
  });

  it('Row right shift of [S,T,A,R,E] yields [E,S,T,A,R] and left shift restores it', () => {
    const right = applyShift(sampleBoard, { axis: 'row', index: 0, direction: 'right' });
    expect(right[0]).toEqual(['E', 'S', 'T', 'A', 'R']);
    expect(applyShift(right, { axis: 'row', index: 0, direction: 'left' })[0]).toEqual([
      'S', 'T', 'A', 'R', 'E',
    ]);
  });

  it('Column shifts wrap vertically and reverse cleanly', () => {
    const down = applyShift(sampleBoard, { axis: 'col', index: 0, direction: 'down' });
    expect(down.map((r) => r[0])).toEqual(['G', 'S', 'P', 'C', 'B']);
    expect(applyShift(down, { axis: 'col', index: 0, direction: 'up' }).map((r) => r[0])).toEqual([
      'S', 'P', 'C', 'B', 'G',
    ]);
  });

  it('Automatically spots a horizontal 5-letter word after a shift, saves it, and replaces its tiles', () => {
    const base = createNewGame({ seed: 'horiz-match', dict, minMatchLength: 4 });
    // Row 0 is ['T', 'P', 'L', 'A', 'N'] -> shifting row 0 LEFT yields ['P', 'L', 'A', 'N', 'T']!
    const board = [
      ['T', 'P', 'L', 'A', 'N'],
      ['X', 'Q', 'Z', 'J', 'K'],
      ['V', 'W', 'X', 'Z', 'Q'],
      ['J', 'K', 'X', 'V', 'Z'],
      ['Q', 'Z', 'J', 'X', 'W'],
    ];
    const state = { ...base, board };

    const res = dispatchAction(
      state,
      { type: 'SHIFT', op: { axis: 'row', index: 0, direction: 'left' } },
      dict,
    );

    expect(res.error).toBeUndefined();
    expect(res.cascades.length).toBeGreaterThanOrEqual(1);
    expect(res.cascades[0].matches.some((m) => m.word === 'PLANT' && m.axis === 'horizontal')).toBe(
      true,
    );
    expect(res.state.savedWords.some((w) => w.word === 'PLANT')).toBe(true);
    expect(res.state.score).toBeGreaterThanOrEqual(DEFAULT_ECONOMY.scoreFiveLetter);
    // Row 0 tiles must have been replaced
    expect(res.state.board[0].join('')).not.toBe('PLANT');
  });

  it('Automatically spots a vertical 4-letter word (top -> bottom) and respects 5-letter-only mode', () => {
    const board = [
      ['X', 'Q', 'Z', 'J', 'K'],
      ['S', 'W', 'X', 'Z', 'Q'],
      ['T', 'K', 'X', 'V', 'Z'],
      ['A', 'Z', 'J', 'X', 'W'],
      ['R', 'Q', 'V', 'K', 'Z'],
    ];
    // Column 0 has X, S, T, A, R -> 4-letter 'STAR' at rows 1..4
    const matches4 = findLineMatches(board, dict, 4);
    expect(matches4.some((m) => m.word === 'STAR' && m.axis === 'vertical')).toBe(true);

    const matches5 = findLineMatches(board, dict, 5);
    expect(matches5).toHaveLength(0);

    // Regression: common everyday words from SCOWL tier 35/40 like RIPE must be spotted
    const ripeBoard = [
      ['C', 'K', 'P', 'L', 'I'],
      ['R', 'I', 'P', 'E', 'Y'],
      ['U', 'D', 'T', 'G', 'P'],
      ['I', 'M', 'B', 'O', 'B'],
      ['A', 'A', 'M', 'M', 'P'],
    ];
    expect(
      findLineMatches(ripeBoard, dict, 4).some((m) => m.word === 'RIPE' && m.axis === 'horizontal'),
    ).toBe(true);
  });

  it('Allows unlimited shifts in Endless mode and 1-tap Undo on non-matching shifts', () => {
    let state = createNewGame({ seed: 'unlimited-test', dict, minMatchLength: 5 });
    const startBoard = state.board.map((r) => r.slice());

    const r1 = dispatchAction(
      state,
      { type: 'SHIFT', op: { axis: 'row', index: 0, direction: 'right' } },
      dict,
    );
    expect(r1.state.shiftsMade).toBe(1);

    if (r1.cascades.length === 0) {
      const undo = dispatchAction(r1.state, { type: 'UNDO_SHIFT' }, dict);
      expect(undo.error).toBeUndefined();
      expect(undo.state.shiftsMade).toBe(0);
      expect(undo.state.board).toEqual(startBoard);
    }

    // Make 40 shifts in Endless mode with zero shift-token restrictions
    for (let i = 0; i < 40; i++) {
      state = dispatchAction(
        state,
        { type: 'SHIFT', op: { axis: i % 2 === 0 ? 'row' : 'col', index: i % 5, direction: i % 2 === 0 ? 'right' : 'down' } },
        dict,
      ).state;
    }
    expect(state.shiftsMade).toBe(40);
    expect(state.dailyComplete).toBe(false);
  });

  it('Daily mode completes cleanly after 25 shifts', () => {
    let state = createNewGame({ seed: 'daily-2026-11-25', mode: 'daily', dict });
    for (let i = 0; i < DEFAULT_ECONOMY.dailyShiftLimit; i++) {
      state = dispatchAction(
        state,
        { type: 'SHIFT', op: { axis: 'row', index: i % 5, direction: 'right' } },
        dict,
      ).state;
    }
    expect(state.dailyComplete).toBe(true);
    expect(state.shiftsMade).toBe(DEFAULT_ECONOMY.dailyShiftLimit);

    const extra = dispatchAction(
      state,
      { type: 'SHIFT', op: { axis: 'row', index: 0, direction: 'left' } },
      dict,
    );
    expect(extra.error).toMatch(/already complete/i);
  });

  it('Deterministic seeding produces identical boards and replacement tiles', () => {
    const t = '2026-11-25T12:00:00.000Z';
    const a = createNewGame({ seed: 'same-seed', dict, nowIso: t });
    const b = createNewGame({ seed: 'same-seed', dict, nowIso: t });
    expect(a).toEqual(b);

    const a2 = dispatchAction(a, { type: 'SHIFT', op: { axis: 'col', index: 2, direction: 'up' } }, dict, DEFAULT_ECONOMY, t);
    const b2 = dispatchAction(b, { type: 'SHIFT', op: { axis: 'col', index: 2, direction: 'up' } }, dict, DEFAULT_ECONOMY, t);
    expect(a2).toEqual(b2);
  });
});
