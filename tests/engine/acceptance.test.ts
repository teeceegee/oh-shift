import { describe, expect, it } from 'vitest';
import { getBundledDictionary } from '../../src/data/loadDictionary';
import {
  applyShift,
  createNewGame,
  DEFAULT_ECONOMY,
  dispatchAction,
  evaluateGuess,
  findBoardWords,
  getBoardLetterCounts,
  isBoardDeadlocked,
  replayGame,
  validatePath,
  verifyClueMatchesAnswer,
} from '../../src/engine';
import type { Coord, GameAction } from '../../src/engine';

const dict = getBundledDictionary();

/** Helper: finds a valid adjacent path on the board for a given word (if present). */
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

describe('Oh! Shift — Core Engine & Acceptance Criteria', () => {
  const sampleBoard = [
    ['S', 'T', 'A', 'R', 'E'],
    ['P', 'L', 'O', 'N', 'D'],
    ['C', 'A', 'T', 'I', 'M'],
    ['B', 'R', 'E', 'A', 'K'],
    ['G', 'H', 'O', 'U', 'L'],
  ];

  it('AC-1: Rejects non-adjacent tile paths', () => {
    const res = validatePath(sampleBoard, [
      { row: 0, col: 0 },
      { row: 0, col: 2 },
    ]);
    expect(res.valid).toBe(false);
    expect(res.reason).toMatch(/adjacent/i);
  });

  it('AC-2: Rejects reusing the same tile within one word', () => {
    const res = validatePath(sampleBoard, [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 0 },
    ]);
    expect(res.valid).toBe(false);
    expect(res.reason).toMatch(/reuse/i);
  });

  it('AC-3: Enforces minimum word length and curated UK English dictionary membership', () => {
    expect(dict.hasWord('COLOUR')).toBe(true);
    expect(dict.hasWord('FLAVOUR')).toBe(true);
    expect(dict.hasWord('CENTRE')).toBe(true);
    expect(dict.hasWord('XQZJP')).toBe(false);

    const state = createNewGame({ seed: 'ac3-test', dict });
    // Too short (2 letters)
    const tooShort = dispatchAction(
      state,
      { type: 'SUBMIT_WORD', path: [{ row: 0, col: 0 }, { row: 0, col: 1 }] },
      dict,
    );
    expect(tooShort.error).toMatch(/at least 3/i);
  });

  it('AC-4: Repeating a word in the same phase yields no additional score or resources', () => {
    const state = createNewGame({ seed: 'ac4-test', dict });
    const playable = Array.from(findBoardWords(state.board, dict, { minLength: 3 }));
    expect(playable.length).toBeGreaterThan(0);

    const word = playable[0];
    const path = findPathForWord(state.board, word)!;
    const first = dispatchAction(state, { type: 'SUBMIT_WORD', path }, dict);
    expect(first.error).toBeUndefined();
    expect(first.state.score).toBeGreaterThan(0);

    const second = dispatchAction(first.state, { type: 'SUBMIT_WORD', path }, dict);
    expect(second.error).toMatch(/already been found/i);
    expect(second.state.score).toBe(first.state.score);
    expect(second.state.insightPoints).toBe(first.state.insightPoints);
    expect(second.state.shiftTokens).toBe(first.state.shiftTokens);
  });

  it('AC-5: Row right shift of [S,T,A,R,E] yields [E,S,T,A,R] and left shift restores it', () => {
    const shiftedRight = applyShift(sampleBoard, { axis: 'row', index: 0, direction: 'right' });
    expect(shiftedRight[0]).toEqual(['E', 'S', 'T', 'A', 'R']);

    const restored = applyShift(shiftedRight, { axis: 'row', index: 0, direction: 'left' });
    expect(restored[0]).toEqual(['S', 'T', 'A', 'R', 'E']);
  });

  it('AC-6: Column shifts wrap vertically and reverse cleanly', () => {
    const col0Before = sampleBoard.map((r) => r[0]); // [S, P, C, B, G]
    const shiftedDown = applyShift(sampleBoard, { axis: 'col', index: 0, direction: 'down' });
    expect(shiftedDown.map((r) => r[0])).toEqual(['G', 'S', 'P', 'C', 'B']);

    const restored = applyShift(shiftedDown, { axis: 'col', index: 0, direction: 'up' });
    expect(restored.map((r) => r[0])).toEqual(col0Before);
  });

  it('AC-7: Shifts cannot reduce token balance below zero, and uncommitted shift undo stack refunds tokens', () => {
    let state = createNewGame({ seed: 'ac7-test', dict });
    expect(state.shiftTokens).toBe(DEFAULT_ECONOMY.startingShiftTokens);

    // Spend both starting tokens
    const s1 = dispatchAction(state, { type: 'SHIFT', op: { axis: 'row', index: 0, direction: 'right' } }, dict);
    const s2 = dispatchAction(s1.state, { type: 'SHIFT', op: { axis: 'col', index: 2, direction: 'up' } }, dict);
    expect(s2.state.shiftTokens).toBe(0);
    expect(s2.state.uncommittedShifts).toHaveLength(2);

    // Third shift must fail without dropping below 0
    const s3 = dispatchAction(s2.state, { type: 'SHIFT', op: { axis: 'row', index: 1, direction: 'left' } }, dict);
    expect(s3.error).toMatch(/not enough shift tokens/i);
    expect(s3.state.shiftTokens).toBe(0);

    // Undo stack reverses both shifts and restores exact board + tokens
    const u1 = dispatchAction(s2.state, { type: 'UNDO_SHIFT' }, dict);
    const u2 = dispatchAction(u1.state, { type: 'UNDO_SHIFT' }, dict);
    expect(u2.state.shiftTokens).toBe(DEFAULT_ECONOMY.startingShiftTokens);
    expect(u2.state.board).toEqual(state.board);
    expect(u2.state.uncommittedShifts).toHaveLength(0);
  });

  it('AC-10: Two-pass guess evaluation handles duplicate letters accurately', () => {
    // Answer: SHEEP (two Es at 2,3). Guess: EERIE (Es at 0,1,4)
    // Pass 1: no exacts. Pass 2: E@0 present, E@1 present, E@4 absent!
    expect(evaluateGuess('EERIE', 'SHEEP')).toEqual([
      'present',
      'present',
      'absent',
      'absent',
      'absent',
    ]);

    // Answer: APPLE (two Ps at 1,2). Guess: PUPPY (Ps at 0,2,3)
    // Pass 1: P@2 exact (1 P left). Pass 2: P@0 present (0 Ps left), P@3 absent.
    expect(evaluateGuess('PUPPY', 'APPLE')).toEqual([
      'present',
      'absent',
      'exact',
      'absent',
      'absent',
    ]);

    // Exact match
    expect(evaluateGuess('SHIFT', 'SHIFT')).toEqual([
      'exact',
      'exact',
      'exact',
      'exact',
      'exact',
    ]);
  });

  it('AC-11: Initial and purchased clues never contradict the underlying answer', () => {
    let state = createNewGame({ seed: 'ac11-clues', dict, difficulty: 'relaxed' });
    // Grant plenty of insight to buy multiple clues
    state = { ...state, insightPoints: 20 };

    for (const target of state.targets) {
      expect(target.clues.length).toBeGreaterThanOrEqual(1);
      for (const clue of target.clues) {
        expect(verifyClueMatchesAnswer(clue, target, state.targets)).toBe(true);
      }

      // Buy 3 additional clues and verify each
      for (let i = 0; i < 3; i++) {
        const res = dispatchAction(state, { type: 'BUY_CLUE', targetId: target.id }, dict);
        if (!res.error) {
          state = res.state;
          const updatedTarget = state.targets.find((t) => t.id === target.id)!;
          const latest = updatedTarget.clues[updatedTarget.clues.length - 1];
          expect(verifyClueMatchesAnswer(latest, updatedTarget, state.targets)).toBe(true);
        }
      }
    }
  });

  it('Board-grounded hybrid: all generated targets respect board letter multiplicity & can be solved on-board for bonus', () => {
    const state = createNewGame({ seed: 'hybrid-bonus-seed', dict });
    const boardCounts = getBoardLetterCounts(state.board);

    for (const target of state.targets) {
      const needed: Record<string, number> = {};
      for (const ch of target.answer) {
        needed[ch] = (needed[ch] ?? 0) + 1;
        expect(needed[ch]).toBeLessThanOrEqual(boardCounts[ch] ?? 0);
      }
    }

    // Place target 0 directly on row 0 to test Board Construction Bonus
    const target0 = state.targets[0];
    const patchedBoard = state.board.map((r) => r.slice());
    const path: Coord[] = [];
    for (let i = 0; i < target0.answer.length; i++) {
      const r = Math.floor(i / 5);
      const c = i % 5;
      patchedBoard[r][c] = target0.answer[i];
      path.push({ row: r, col: c });
    }
    const patchedState = { ...state, board: patchedBoard, shiftTokens: 2 };
    const res = dispatchAction(patchedState, { type: 'SUBMIT_WORD', path }, dict);

    expect(res.error).toBeUndefined();
    const solvedEvent = res.events.find((e) => e.type === 'TARGET_SOLVED_ON_BOARD');
    expect(solvedEvent).toBeDefined();
    expect(res.state.targets[0].status).toBe('solved_board');
    expect(res.state.shiftTokens).toBeGreaterThanOrEqual(3);
  });

  it('AC-12: Deadlock detection and deterministic rescue refresh restore playability with score floor 0', () => {
    const state = createNewGame({ seed: 'ac12-deadlock', dict });
    const allWords = Array.from(findBoardWords(state.board, dict, { minLength: 3 }));
    const deadlockedState = {
      ...state,
      shiftTokens: 0,
      score: 20,
      foundWords: allWords,
    };

    expect(isBoardDeadlocked(deadlockedState, dict)).toBe(true);

    const rescued = dispatchAction(deadlockedState, { type: 'RESCUE_REFRESH' }, dict);
    expect(rescued.error).toBeUndefined();
    expect(rescued.state.score).toBe(0); // Clamped to floor 0
    expect(rescued.state.shiftTokens).toBeGreaterThanOrEqual(1);
    expect(isBoardDeadlocked(rescued.state, dict)).toBe(false);
  });

  it('AC-14: Seeded games and action replays are 100% deterministic', () => {
    const fixedTime = '2026-11-24T12:00:00.000Z';
    const g1 = createNewGame({ seed: 'travel-2026', dict, nowIso: fixedTime });
    const g2 = createNewGame({ seed: 'travel-2026', dict, nowIso: fixedTime });
    expect(g1).toEqual(g2);

    const actions: GameAction[] = [
      { type: 'SHIFT', op: { axis: 'row', index: 1, direction: 'right' } },
      { type: 'UNDO_SHIFT' },
      { type: 'SUBMIT_GUESS', targetId: g1.targets[0].id, word: g1.targets[0].answer },
    ];

    const r1 = replayGame({ seed: 'travel-2026', dict, nowIso: fixedTime }, actions);
    const r2 = replayGame({ seed: 'travel-2026', dict, nowIso: fixedTime }, actions);
    expect(r1).toEqual(r2);
    expect(r1.targets[0].status).toBe('solved_guess');
  });

  it('Daily 5-Phase Challenge completes cleanly after Phase 5', () => {
    let state = createNewGame({ seed: '2026-11-24', mode: 'daily', dict });

    for (let phase = 1; phase <= DEFAULT_ECONOMY.dailyPhaseCount; phase++) {
      expect(state.phase).toBe(phase);
      for (const target of state.targets) {
        const guessRes = dispatchAction(
          state,
          { type: 'SUBMIT_GUESS', targetId: target.id, word: target.answer },
          dict,
        );
        expect(guessRes.error).toBeUndefined();
        state = guessRes.state;
      }
      const adv = dispatchAction(state, { type: 'ADVANCE_PHASE' }, dict);
      expect(adv.error).toBeUndefined();
      state = adv.state;
    }

    expect(state.dailyComplete).toBe(true);
    expect(state.stats.phasesCleared).toBe(5);
  });
});
