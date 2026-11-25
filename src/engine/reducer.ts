import { applyShift, cloneBoard, collectUniqueCoords, findLineMatches, invertShift } from './board';
import { DEFAULT_ECONOMY, SCHEMA_VERSION } from './config';
import type { CompactDictionary } from './dictionary';
import { drawReplacementLetter, generateCalmStartingBoard } from './generator';
import type {
  CascadeStep,
  DispatchResult,
  EconomyConfig,
  GameAction,
  GameMode,
  GameState,
  MinMatchLength,
  RunStats,
  SavedWordRecord,
} from './types';

export interface CreateGameOptions {
  seed: string;
  mode?: GameMode;
  minMatchLength?: MinMatchLength;
  dict: CompactDictionary;
  gameId?: string;
  nowIso?: string;
}

function createInitialStats(): RunStats {
  return {
    shiftsMade: 0,
    totalWordsFound: 0,
    uniqueWordsCount: 0,
    fiveLetterWords: 0,
    bestCombo: 0,
    longestWord: '',
  };
}

export function createNewGame(options: CreateGameOptions): GameState {
  const mode = options.mode ?? 'solo';
  const minMatchLength = options.minMatchLength ?? 4;
  const board = generateCalmStartingBoard(options.seed, options.dict, minMatchLength);

  return {
    schemaVersion: SCHEMA_VERSION,
    gameId: options.gameId ?? `ohshift-${options.seed}`,
    seed: options.seed,
    dictionaryVersion: options.dict.version,
    mode,
    minMatchLength,
    board,
    score: 0,
    shiftsMade: 0,
    tileDrawCursor: 0,
    savedWords: [],
    lastShiftUndoable: null,
    dailyComplete: false,
    stats: createInitialStats(),
    updatedAt: options.nowIso ?? new Date().toISOString(),
  };
}

export function dispatchAction(
  state: GameState,
  action: GameAction,
  dict: CompactDictionary,
  config: EconomyConfig = DEFAULT_ECONOMY,
  nowIso?: string,
): DispatchResult {
  const timestamp = nowIso ?? new Date().toISOString();

  if (state.dailyComplete) {
    return { state, cascades: [], error: 'Daily 25-shift challenge is already complete' };
  }

  switch (action.type) {
    case 'SHIFT': {
      let currentBoard = applyShift(state.board, action.op);
      const nextShiftNumber = state.shiftsMade + 1;
      let cursor = state.tileDrawCursor;
      let scoreGain = 0;
      const newSavedWords: SavedWordRecord[] = [];
      const cascades: CascadeStep[] = [];

      // Automatically spot horizontal & vertical words, flash, save, and replace (with cascades!)
      for (let step = 1; step <= config.maxCascadesPerShift; step++) {
        const matches = findLineMatches(currentBoard, dict, state.minMatchLength, config);
        if (matches.length === 0) break;

        const matchedCoords = collectUniqueCoords(matches);
        const boardBeforeReplace = cloneBoard(currentBoard);
        const boardAfterReplace = cloneBoard(currentBoard);

        // Replace every matched tile with a fresh seeded letter
        for (const coord of matchedCoords) {
          cursor += 1;
          const prev = boardBeforeReplace[coord.row][coord.col];
          boardAfterReplace[coord.row][coord.col] = drawReplacementLetter(state.seed, cursor, prev);
        }

        // Score with cascade combo multiplier (1x, 2x, 3x...)
        let stepScore = 0;
        for (let i = 0; i < matches.length; i++) {
          const m = matches[i];
          const wordScore = m.score * step;
          stepScore += wordScore;
          newSavedWords.push({
            id: `s${nextShiftNumber}-c${step}-${i}-${m.word}`,
            word: m.word,
            axis: m.axis,
            score: wordScore,
            combo: step,
            shiftNumber: nextShiftNumber,
          });
        }

        scoreGain += stepScore;
        cascades.push({
          stepNumber: step,
          matches,
          matchedCoords,
          boardBeforeReplace,
          boardAfterReplace,
          stepScore,
        });

        currentBoard = boardAfterReplace;
      }

      const allSaved = [...newSavedWords.reverse(), ...state.savedWords];
      const uniqueSet = new Set(allSaved.map((w) => w.word));
      let longest = state.stats.longestWord;
      let fiveCount = state.stats.fiveLetterWords;
      for (const w of newSavedWords) {
        if (w.word.length > longest.length) longest = w.word;
        if (w.word.length === 5) fiveCount += 1;
      }

      const maxComboThisShift = cascades.length;
      const dailyComplete =
        state.mode === 'daily' && nextShiftNumber >= config.dailyShiftLimit;

      const nextState: GameState = {
        ...state,
        board: currentBoard,
        score: state.score + scoreGain,
        shiftsMade: nextShiftNumber,
        tileDrawCursor: cursor,
        savedWords: allSaved,
        // Allow 1-tap Undo if this shift did not trigger any word replacement
        lastShiftUndoable: cascades.length === 0 ? action.op : null,
        dailyComplete,
        stats: {
          shiftsMade: nextShiftNumber,
          totalWordsFound: allSaved.length,
          uniqueWordsCount: uniqueSet.size,
          fiveLetterWords: fiveCount,
          bestCombo: Math.max(state.stats.bestCombo, maxComboThisShift),
          longestWord: longest,
        },
        updatedAt: timestamp,
      };

      return { state: nextState, cascades };
    }

    case 'UNDO_SHIFT': {
      if (!state.lastShiftUndoable) {
        return { state, cascades: [], error: 'Nothing to undo' };
      }
      const revertedBoard = applyShift(state.board, invertShift(state.lastShiftUndoable));
      const nextShifts = Math.max(0, state.shiftsMade - 1);

      return {
        state: {
          ...state,
          board: revertedBoard,
          shiftsMade: nextShifts,
          lastShiftUndoable: null,
          stats: { ...state.stats, shiftsMade: nextShifts },
          updatedAt: timestamp,
        },
        cascades: [],
      };
    }
  }
}
