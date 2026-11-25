import {
  applyShift,
  cloneBoard,
  collectUniqueCoords,
  findMatchesStartingAt,
  invertShift,
} from './board';
import { DEFAULT_ECONOMY, SCHEMA_VERSION } from './config';
import type { CompactDictionary } from './dictionary';
import { drawReplacementLetter, generateStartingBoard } from './generator';
import type {
  DispatchResult,
  EconomyConfig,
  FlashStep,
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
    crossWordsFound: 0,
    longestWord: '',
  };
}

export function createNewGame(options: CreateGameOptions): GameState {
  const mode = options.mode ?? 'solo';
  const minMatchLength = options.minMatchLength ?? 3;
  const board = generateStartingBoard(options.seed);

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

  switch (action.type) {
    case 'SHIFT': {
      if (state.dailyComplete) {
        return { state, flash: null, error: 'Daily 25-shift limit reached — claim any words left on the board!' };
      }
      const nextBoard = applyShift(state.board, action.op);
      const nextShiftNumber = state.shiftsMade + 1;
      const dailyComplete =
        state.mode === 'daily' && nextShiftNumber >= config.dailyShiftLimit;

      return {
        state: {
          ...state,
          board: nextBoard,
          score: state.score - config.shiftCost,
          shiftsMade: nextShiftNumber,
          lastShiftUndoable: action.op,
          dailyComplete,
          stats: {
            ...state.stats,
            shiftsMade: nextShiftNumber,
          },
          updatedAt: timestamp,
        },
        flash: null,
      };
    }

    case 'CLAIM_AT': {
      const matches = findMatchesStartingAt(
        state.board,
        action.coord,
        dict,
        state.minMatchLength,
        config,
      );

      if (matches.length === 0) {
        const ch = state.board[action.coord.row]?.[action.coord.col] ?? '?';
        return {
          state,
          flash: null,
          error: `No ${state.minMatchLength}+ letter horizontal or vertical word starts at "${ch}"`,
        };
      }

      const matchedCoords = collectUniqueCoords(matches);
      const boardBeforeReplace = cloneBoard(state.board);
      const boardAfterReplace = cloneBoard(state.board);
      let cursor = state.tileDrawCursor;

      for (const coord of matchedCoords) {
        cursor += 1;
        const prev = boardBeforeReplace[coord.row][coord.col];
        boardAfterReplace[coord.row][coord.col] = drawReplacementLetter(state.seed, cursor, prev);
      }

      const crossBonus = matches.length >= 2;
      let stepScore = crossBonus ? config.crossWordBonus : 0;
      const newRecords: SavedWordRecord[] = [];

      for (let i = 0; i < matches.length; i++) {
        const m = matches[i];
        stepScore += m.score;
        newRecords.push({
          id: `c${cursor}-${i}-${m.word}`,
          word: m.word,
          axis: m.axis,
          score: m.score,
          crossBonus,
          shiftNumber: state.shiftsMade,
        });
      }

      const allSaved = [...newRecords.reverse(), ...state.savedWords];
      const uniqueSet = new Set(allSaved.map((w) => w.word));
      let longest = state.stats.longestWord;
      let fiveCount = state.stats.fiveLetterWords;
      for (const w of newRecords) {
        if (w.word.length > longest.length) longest = w.word;
        if (w.word.length === 5) fiveCount += 1;
      }

      const flash: FlashStep = {
        matches,
        matchedCoords,
        boardBeforeReplace,
        boardAfterReplace,
        stepScore,
        crossBonus,
      };

      return {
        state: {
          ...state,
          board: boardAfterReplace,
          score: state.score + stepScore,
          tileDrawCursor: cursor,
          savedWords: allSaved,
          lastShiftUndoable: null,
          stats: {
            shiftsMade: state.shiftsMade,
            totalWordsFound: allSaved.length,
            uniqueWordsCount: uniqueSet.size,
            fiveLetterWords: fiveCount,
            crossWordsFound: state.stats.crossWordsFound + (crossBonus ? 1 : 0),
            longestWord: longest,
          },
          updatedAt: timestamp,
        },
        flash,
      };
    }

    case 'UNDO_SHIFT': {
      if (!state.lastShiftUndoable) {
        return { state, flash: null, error: 'Nothing to undo' };
      }
      const revertedBoard = applyShift(state.board, invertShift(state.lastShiftUndoable));
      const nextShifts = Math.max(0, state.shiftsMade - 1);

      return {
        state: {
          ...state,
          board: revertedBoard,
          score: state.score + config.shiftCost,
          shiftsMade: nextShifts,
          lastShiftUndoable: null,
          dailyComplete: false,
          stats: { ...state.stats, shiftsMade: nextShifts },
          updatedAt: timestamp,
        },
        flash: null,
      };
    }
  }
}
