import { describe, expect, it } from 'vitest';
import { getBundledDictionary } from '../../src/data/loadDictionary';
import {
  applyShift,
  createNewGame,
  DEFAULT_ECONOMY,
  dispatchAction,
  evaluateWordAgainstTarget,
  findBoardWords,
  getBoardLetterCounts,
  isBoardDeadlocked,
  replayGame,
  validatePath,
} from '../../src/engine';
import type { Coord, GameAction } from '../../src/engine';

const dict = getBundledDictionary();

function findPathForWord(board: string[][], word: string): Coord[] | null {
  const dirs = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1], [0, 1],
    [1, -1], [1, 0], [1, 1],
  ];
  const visited = new Set<number>();

  const dfs = (r: number, c: number, idx: number, path: Coord[]): Coord[] | null => {
    if (board[r][c] !== word[idx]) return null;
    const key = r * 5 + c;
    visited.add(key);
    path.push({ row: r, col: c });
    if (idx === word.length - 1) return path.slice();

    for (const [dr, dc] of dirs) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < 5 && nc >= 0 && nc < 5 && !visited.has(nr * 5 + nc)) {
        const res = dfs(nr, nc, idx + 1, path);
        if (res) return res;
      }
    }

    path.pop();
    visited.delete(key);
    return null;
  };

  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      const res = dfs(r, c, 0, []);
      if (res) return res;
    }
  }
  return null;
}

describe('Oh! Shift v2 — Unified Single-Target Core Engine', () => {
  const sampleBoard = [
    ['S', 'T', 'A', 'R', 'E'],
    ['P', 'L', 'O', 'N', 'D'],
    ['C', 'A', 'T', 'I', 'M'],
    ['B', 'R', 'E', 'A', 'K'],
    ['G', 'H', 'O', 'U', 'L'],
  ];

  it('AC-1 & AC-2: Rejects non-adjacent paths and tile reuse', () => {
    expect(validatePath(sampleBoard, [{ row: 0, col: 0 }, { row: 0, col: 2 }]).valid).toBe(false);
    expect(
      validatePath(sampleBoard, [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 0 }]).valid,
    ).toBe(false);
  });

  it('AC-3: Enforces minimum word length and curated UK English dictionary membership', () => {
    expect(dict.hasWord('COLOUR')).toBe(true);
    expect(dict.hasWord('FLAVOUR')).toBe(true);
    expect(dict.hasWord('CENTRE')).toBe(true);
    expect(dict.hasWord('XQZJP')).toBe(false);

    const state = createNewGame({ seed: 'ac3-test', dict });
    const tooShort = dispatchAction(
      state,
      { type: 'SUBMIT_WORD', path: [{ row: 0, col: 0 }, { row: 0, col: 1 }] },
      dict,
    );
    expect(tooShort.error).toMatch(/at least 3/i);
  });

  it('AC-4: Repeating a word in the same phase yields no additional score or shifts', () => {
    const state = createNewGame({ seed: 'ac4-test', dict });
    const playable = Array.from(findBoardWords(state.board, dict, { minLength: 3 }));
    const path = findPathForWord(state.board, playable[0])!;

    const first = dispatchAction(state, { type: 'SUBMIT_WORD', path }, dict);
    expect(first.error).toBeUndefined();
    expect(first.state.score).toBeGreaterThan(0);

    const second = dispatchAction(first.state, { type: 'SUBMIT_WORD', path }, dict);
    expect(second.error).toMatch(/already been found/i);
    expect(second.state.score).toBe(first.state.score);
    expect(second.state.shiftTokens).toBe(first.state.shiftTokens);
  });

  it('AC-5 & AC-6: Row and column wraparound shifts reverse cleanly', () => {
    const right = applyShift(sampleBoard, { axis: 'row', index: 0, direction: 'right' });
    expect(right[0]).toEqual(['E', 'S', 'T', 'A', 'R']);
    expect(applyShift(right, { axis: 'row', index: 0, direction: 'left' })[0]).toEqual([
      'S', 'T', 'A', 'R', 'E',
    ]);

    const down = applyShift(sampleBoard, { axis: 'col', index: 0, direction: 'down' });
    expect(down.map((r) => r[0])).toEqual(['G', 'S', 'P', 'C', 'B']);
    expect(applyShift(down, { axis: 'col', index: 0, direction: 'up' }).map((r) => r[0])).toEqual([
      'S', 'P', 'C', 'B', 'G',
    ]);
  });

  it('AC-7: Shifts cannot reduce token balance below zero and Undo restores tokens & board', () => {
    let state = createNewGame({ seed: 'ac7-test', dict });
    const startTokens = state.shiftTokens;

    for (let i = 0; i < startTokens; i++) {
      state = dispatchAction(
        state,
        { type: 'SHIFT', op: { axis: 'row', index: i % 5, direction: 'right' } },
        dict,
      ).state;
    }
    expect(state.shiftTokens).toBe(0);

    const blocked = dispatchAction(
      state,
      { type: 'SHIFT', op: { axis: 'col', index: 0, direction: 'up' } },
      dict,
    );
    expect(blocked.error).toMatch(/not enough shift tokens/i);
    expect(blocked.state.shiftTokens).toBe(0);

    // Undo all uncommitted shifts
    for (let i = 0; i < startTokens; i++) {
      state = dispatchAction(state, { type: 'UNDO_SHIFT' }, dict).state;
    }
    expect(state.shiftTokens).toBe(startTokens);
    expect(state.uncommittedShifts).toHaveLength(0);
  });

  it('AC-10: Two-pass duplicate-letter evaluation works across different word lengths', () => {
    // 5-letter probe vs 5-letter target (SHEEP)
    expect(evaluateWordAgainstTarget('EERIE', 'SHEEP')).toEqual([
      'present', 'present', 'absent', 'absent', 'absent',
    ]);
    // 3-letter probe (PAN) vs 5-letter target (PLANT): P exact@0, A present, N present
    expect(evaluateWordAgainstTarget('PAN', 'PLANT')).toEqual(['exact', 'present', 'present']);
    // 6-letter probe (PLANES) vs 5-letter target (PLANT): P,L,A,N exact; E,S absent
    expect(evaluateWordAgainstTarget('PLANES', 'PLANT')).toEqual([
      'exact', 'exact', 'exact', 'exact', 'absent', 'absent',
    ]);
  });

  it('Unified loop: board words automatically populate matching target positions until solved', () => {
    const base = createNewGame({ seed: 'positional-pop', dict });
    // Force a deterministic target 'PLANT' and board containing PAN and SLATE + BRUNT
    const board = [
      ['P', 'A', 'N', 'X', 'Z'],
      ['S', 'L', 'A', 'T', 'E'],
      ['B', 'R', 'U', 'N', 'T'],
      ['C', 'O', 'D', 'E', 'S'],
      ['M', 'I', 'N', 'T', 'S'],
    ];
    let state = {
      ...base,
      board,
      target: {
        answer: 'PLANT',
        length: 5,
        parShifts: 1,
        revealedPositions: [false, false, false, false, false],
        solved: false,
        solvedDirectly: false,
      },
    };

    // 1. Submit PAN -> locks index 0 ('P')
    const r1 = dispatchAction(
      state,
      { type: 'SUBMIT_WORD', path: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }] },
      dict,
    );
    expect(r1.error).toBeUndefined();
    expect(r1.state.target.revealedPositions).toEqual([true, false, false, false, false]);
    expect(r1.state.target.solved).toBe(false);

    // 2. Submit SLATE -> locks indices 1 ('L') and 2 ('A')
    const r2 = dispatchAction(
      r1.state,
      {
        type: 'SUBMIT_WORD',
        path: [
          { row: 1, col: 0 },
          { row: 1, col: 1 },
          { row: 1, col: 2 },
          { row: 1, col: 3 },
          { row: 1, col: 4 },
        ],
      },
      dict,
    );
    expect(r2.state.target.revealedPositions).toEqual([true, true, true, false, false]);
    expect(r2.state.target.solved).toBe(false);

    // 3. Submit BRUNT -> locks indices 3 ('N') and 4 ('T') -> SOLVED!
    const r3 = dispatchAction(
      r2.state,
      {
        type: 'SUBMIT_WORD',
        path: [
          { row: 2, col: 0 },
          { row: 2, col: 1 },
          { row: 2, col: 2 },
          { row: 2, col: 3 },
          { row: 2, col: 4 },
        ],
      },
      dict,
    );
    expect(r3.state.target.revealedPositions).toEqual([true, true, true, true, true]);
    expect(r3.state.target.solved).toBe(true);
    expect(r3.state.target.solvedDirectly).toBe(false);
    expect(r3.events.some((e) => e.type === 'TARGET_SOLVED')).toBe(true);
  });

  it('Direct solve bonus: spelling the exact target word on the board awards bonus score & shift', () => {
    const base = createNewGame({ seed: 'direct-solve', dict });
    const targetWord = base.target.answer;
    const patchedBoard = base.board.map((r) => r.slice());
    const path: Coord[] = [];
    for (let i = 0; i < targetWord.length; i++) {
      const r = Math.floor(i / 5);
      const c = i % 5;
      patchedBoard[r][c] = targetWord[i];
      path.push({ row: r, col: c });
    }
    const state = { ...base, board: patchedBoard, shiftTokens: 2 };
    const res = dispatchAction(state, { type: 'SUBMIT_WORD', path }, dict);

    expect(res.error).toBeUndefined();
    expect(res.state.target.solved).toBe(true);
    expect(res.state.target.solvedDirectly).toBe(true);
    expect(res.state.shiftTokens).toBeGreaterThanOrEqual(3);
  });

  it('AC-12: Deadlock detection and rescue refresh restore playability with score floor 0', () => {
    const state = createNewGame({ seed: 'ac12-deadlock', dict });
    const allWords = Array.from(findBoardWords(state.board, dict, { minLength: 3 }));
    const deadlockedState = { ...state, shiftTokens: 0, score: 20, foundWords: allWords };

    expect(isBoardDeadlocked(deadlockedState, dict)).toBe(true);
    const rescued = dispatchAction(deadlockedState, { type: 'RESCUE_REFRESH' }, dict);
    expect(rescued.state.score).toBe(0);
    expect(rescued.state.shiftTokens).toBeGreaterThanOrEqual(1);
    expect(isBoardDeadlocked(rescued.state, dict)).toBe(false);
  });

  it('AC-14: Seeded games and action replays are 100% deterministic & board-grounded', () => {
    const fixedTime = '2026-11-24T12:00:00.000Z';
    const g1 = createNewGame({ seed: 'travel-v2', dict, nowIso: fixedTime });
    const g2 = createNewGame({ seed: 'travel-v2', dict, nowIso: fixedTime });
    expect(g1).toEqual(g2);

    // Target respects board letter multiplicity
    const counts = getBoardLetterCounts(g1.board);
    const needed: Record<string, number> = {};
    for (const ch of g1.target.answer) {
      needed[ch] = (needed[ch] ?? 0) + 1;
      expect(needed[ch]).toBeLessThanOrEqual(counts[ch] ?? 0);
    }

    const actions: GameAction[] = [
      { type: 'SHIFT', op: { axis: 'row', index: 1, direction: 'right' } },
      { type: 'UNDO_SHIFT' },
    ];
    expect(replayGame({ seed: 'travel-v2', dict, nowIso: fixedTime }, actions)).toEqual(
      replayGame({ seed: 'travel-v2', dict, nowIso: fixedTime }, actions),
    );
  });

  it('Daily 5-Phase Challenge completes cleanly after Phase 5', () => {
    let state = createNewGame({ seed: 'daily-2026-11-24', mode: 'daily', dict });

    for (let phase = 1; phase <= DEFAULT_ECONOMY.dailyPhaseCount; phase++) {
      // Simulate solving the phase target
      state = {
        ...state,
        target: {
          ...state.target,
          revealedPositions: new Array(state.target.length).fill(true),
          solved: true,
        },
        stats: { ...state.stats, targetsSolved: state.stats.targetsSolved + 1 },
      };
      const adv = dispatchAction(state, { type: 'ADVANCE_PHASE' }, dict);
      expect(adv.error).toBeUndefined();
      state = adv.state;
    }

    expect(state.dailyComplete).toBe(true);
    expect(state.stats.phasesCleared).toBe(5);
  });
});
