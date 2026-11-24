import { applyShift, invertShift, validatePath } from './board';
import { DEFAULT_ECONOMY, DIFFICULTY_SETTINGS, SCHEMA_VERSION } from './config';
import { buildRescueBoard } from './deadlock';
import { evaluateWordAgainstTarget } from './deduction';
import type { CompactDictionary } from './dictionary';
import { evolveBoardForNextPhase, generateInitialBoard, generatePhaseTarget } from './generator';
import type {
  DifficultyPreset,
  DispatchResult,
  EconomyConfig,
  EngineEvent,
  GameAction,
  GameMode,
  GameState,
  RunStats,
  WordProbeRecord,
} from './types';

export interface CreateGameOptions {
  seed: string;
  mode?: GameMode;
  difficulty?: DifficultyPreset;
  dict: CompactDictionary;
  config?: EconomyConfig;
  gameId?: string;
  nowIso?: string;
}

function createInitialStats(): RunStats {
  return {
    totalWordsFound: 0,
    longestWord: '',
    targetsSolved: 0,
    directSolves: 0,
    shiftsSpent: 0,
    rescuesUsed: 0,
    phasesCleared: 0,
  };
}

export function createNewGame(options: CreateGameOptions): GameState {
  const config = options.config ?? DEFAULT_ECONOMY;
  const mode = options.mode ?? 'solo';
  const difficulty = options.difficulty ?? 'standard';
  const diffSettings = DIFFICULTY_SETTINGS[difficulty];

  const board = generateInitialBoard(options.seed, options.dict, config);
  const target = generatePhaseTarget(board, options.seed, 1, options.dict, difficulty);

  return {
    schemaVersion: SCHEMA_VERSION,
    gameId: options.gameId ?? `ohshift-${options.seed}`,
    seed: options.seed,
    dictionaryVersion: options.dict.version,
    mode,
    difficulty,
    phase: 1,
    board,
    score: 0,
    shiftTokens: Math.min(
      config.maxShiftTokens,
      config.startingShiftTokens + diffSettings.startingShiftBonus,
    ),
    wordsTowardsNextShift: 0,
    foundWords: [],
    probeHistory: [],
    target,
    uncommittedShifts: [],
    rescueCount: 0,
    dailyComplete: false,
    stats: createInitialStats(),
    actionLog: [],
    updatedAt: options.nowIso ?? new Date().toISOString(),
  };
}

export function isPhaseReadyToAdvance(state: GameState): boolean {
  return state.target.solved;
}

export function dispatchAction(
  state: GameState,
  action: GameAction,
  dict: CompactDictionary,
  config: EconomyConfig = DEFAULT_ECONOMY,
  nowIso?: string,
): DispatchResult {
  const timestamp = nowIso ?? new Date().toISOString();
  const events: EngineEvent[] = [];

  if (state.dailyComplete) {
    return { state, events, error: 'Daily challenge is already complete' };
  }

  switch (action.type) {
    case 'SUBMIT_WORD': {
      const pathCheck = validatePath(state.board, action.path);
      if (!pathCheck.valid) {
        return { state, events, error: pathCheck.reason };
      }
      const word = pathCheck.word;
      if (word.length < config.minWordLength) {
        return {
          state,
          events,
          error: `Words must be at least ${config.minWordLength} letters long`,
        };
      }
      if (!dict.hasWord(word)) {
        return { state, events, error: `"${word}" is not in the UK English dictionary` };
      }
      if (state.foundWords.includes(word)) {
        return { state, events, error: `"${word}" has already been found in this phase` };
      }

      const wordScore = word.length * word.length;
      const isLong = word.length >= config.longWordBonusLength;

      let wordsTowards = state.wordsTowardsNextShift + 1;
      let shiftsEarned = 0;
      if (wordsTowards >= config.wordsPerShiftToken) {
        wordsTowards -= config.wordsPerShiftToken;
        shiftsEarned += 1;
      }
      if (isLong) {
        shiftsEarned += 1;
      }

      // Evaluate this board word position-by-position against the hidden target word
      const feedback = evaluateWordAgainstTarget(word, state.target.answer);
      const nextRevealed = state.target.revealedPositions.slice();
      const newlyPopulatedIndices: number[] = [];

      if (!state.target.solved) {
        const overlap = Math.min(word.length, state.target.length);
        for (let i = 0; i < overlap; i++) {
          if (word[i] === state.target.answer[i] && !nextRevealed[i]) {
            nextRevealed[i] = true;
            newlyPopulatedIndices.push(i);
          }
        }
      }

      const probeRecord: WordProbeRecord = {
        word,
        score: wordScore,
        feedback,
        newlyPopulatedIndices,
      };

      let nextScore = state.score + wordScore;
      let nextShifts = Math.min(config.maxShiftTokens, state.shiftTokens + shiftsEarned);
      const nextStats: RunStats = {
        ...state.stats,
        totalWordsFound: state.stats.totalWordsFound + 1,
        longestWord: word.length > state.stats.longestWord.length ? word : state.stats.longestWord,
      };

      events.push({
        type: 'WORD_ACCEPTED',
        word,
        scoreDelta: wordScore,
        shiftsEarned,
        newlyPopulatedIndices,
      });

      const wasSolved = state.target.solved;
      const nowAllPopulated = nextRevealed.every(Boolean);
      const isDirectExactMatch = !wasSolved && word === state.target.answer;

      let nextTarget = {
        ...state.target,
        revealedPositions: nextRevealed,
      };

      if (!wasSolved && (nowAllPopulated || isDirectExactMatch)) {
        const targetBase =
          config.targetBaseScore + config.targetLengthStepScore * (state.target.length - 3);
        const wordsUsedThisPhase = state.foundWords.length + 1;
        const efficiencyBonus =
          Math.max(0, config.efficiencyWordPar - wordsUsedThisPhase) *
          config.efficiencyBonusPerWord;
        const directScore = isDirectExactMatch ? config.directSolveBonusScore : 0;
        const bonusShifts = isDirectExactMatch ? config.directSolveBonusShifts : 0;
        const totalBonus = targetBase + efficiencyBonus + directScore;

        nextScore += totalBonus;
        nextShifts = Math.min(config.maxShiftTokens, nextShifts + bonusShifts);
        nextStats.targetsSolved += 1;
        if (isDirectExactMatch) nextStats.directSolves += 1;

        nextTarget = {
          ...nextTarget,
          revealedPositions: new Array(state.target.length).fill(true),
          solved: true,
          solvedDirectly: isDirectExactMatch,
        };

        events.push({
          type: 'TARGET_SOLVED',
          word: state.target.answer,
          direct: isDirectExactMatch,
          bonusScore: totalBonus,
          bonusShifts,
        });
      }

      return {
        state: {
          ...state,
          score: nextScore,
          shiftTokens: nextShifts,
          wordsTowardsNextShift: wordsTowards,
          foundWords: [...state.foundWords, word],
          probeHistory: [probeRecord, ...state.probeHistory],
          target: nextTarget,
          uncommittedShifts: [], // Commit boundary: word submission locks prior shifts
          stats: nextStats,
          actionLog: [...state.actionLog, action],
          updatedAt: timestamp,
        },
        events,
      };
    }

    case 'SHIFT': {
      if (state.shiftTokens < 1) {
        return { state, events, error: 'Not enough shift tokens' };
      }
      const nextBoard = applyShift(state.board, action.op);
      events.push({ type: 'SHIFT_APPLIED', op: action.op });

      return {
        state: {
          ...state,
          board: nextBoard,
          shiftTokens: state.shiftTokens - 1,
          uncommittedShifts: [...state.uncommittedShifts, action.op],
          stats: { ...state.stats, shiftsSpent: state.stats.shiftsSpent + 1 },
          actionLog: [...state.actionLog, action],
          updatedAt: timestamp,
        },
        events,
      };
    }

    case 'UNDO_SHIFT': {
      if (state.uncommittedShifts.length === 0) {
        return { state, events, error: 'No uncommitted shift to undo' };
      }
      const lastOp = state.uncommittedShifts[state.uncommittedShifts.length - 1];
      const nextBoard = applyShift(state.board, invertShift(lastOp));
      events.push({ type: 'SHIFT_UNDONE', op: lastOp });

      return {
        state: {
          ...state,
          board: nextBoard,
          shiftTokens: Math.min(config.maxShiftTokens, state.shiftTokens + 1),
          uncommittedShifts: state.uncommittedShifts.slice(0, -1),
          stats: {
            ...state.stats,
            shiftsSpent: Math.max(0, state.stats.shiftsSpent - 1),
          },
          actionLog: [...state.actionLog, action],
          updatedAt: timestamp,
        },
        events,
      };
    }

    case 'RESCUE_REFRESH': {
      const { board: rescuedBoard, replacedCount } = buildRescueBoard(state, dict, config);
      const nextScore = Math.max(0, state.score - config.rescuePenalty);
      const nextShifts = Math.min(config.maxShiftTokens, Math.max(1, state.shiftTokens + 1));

      events.push({
        type: 'RESCUE_APPLIED',
        penalty: config.rescuePenalty,
        replacedCount,
      });

      return {
        state: {
          ...state,
          board: rescuedBoard,
          score: nextScore,
          shiftTokens: nextShifts,
          uncommittedShifts: [],
          rescueCount: state.rescueCount + 1,
          stats: { ...state.stats, rescuesUsed: state.stats.rescuesUsed + 1 },
          actionLog: [...state.actionLog, action],
          updatedAt: timestamp,
        },
        events,
      };
    }

    case 'ADVANCE_PHASE': {
      if (!isPhaseReadyToAdvance(state)) {
        return { state, events, error: 'Populate all target letters before advancing the phase' };
      }

      const phaseBonus = config.phaseCompletionBonus;
      const nextScore = state.score + phaseBonus;
      const phasesCleared = state.stats.phasesCleared + 1;

      if (state.mode === 'daily' && state.phase >= config.dailyPhaseCount) {
        events.push({
          type: 'PHASE_ADVANCED',
          newPhase: state.phase,
          phaseBonus,
          dailyComplete: true,
        });

        return {
          state: {
            ...state,
            score: nextScore,
            dailyComplete: true,
            uncommittedShifts: [],
            stats: { ...state.stats, phasesCleared },
            actionLog: [...state.actionLog, action],
            updatedAt: timestamp,
          },
          events,
        };
      }

      const nextPhase = state.phase + 1;
      const { board: nextBoard } = evolveBoardForNextPhase(
        state.board,
        state.seed,
        nextPhase,
        dict,
        config,
      );
      const nextTarget = generatePhaseTarget(
        nextBoard,
        state.seed,
        nextPhase,
        dict,
        state.difficulty,
      );

      events.push({
        type: 'PHASE_ADVANCED',
        newPhase: nextPhase,
        phaseBonus,
        dailyComplete: false,
      });

      return {
        state: {
          ...state,
          phase: nextPhase,
          board: nextBoard,
          score: nextScore,
          foundWords: [],
          probeHistory: [],
          target: nextTarget,
          uncommittedShifts: [],
          stats: { ...state.stats, phasesCleared },
          actionLog: [...state.actionLog, action],
          updatedAt: timestamp,
        },
        events,
      };
    }
  }
}

export function replayGame(
  options: CreateGameOptions,
  actions: readonly GameAction[],
): GameState {
  let state = createNewGame(options);
  for (const action of actions) {
    const res = dispatchAction(state, action, options.dict, options.config, options.nowIso);
    if (!res.error) {
      state = res.state;
    }
  }
  return state;
}
