import { applyShift, invertShift, validatePath } from './board';
import { DEFAULT_ECONOMY, DIFFICULTY_SETTINGS, SCHEMA_VERSION } from './config';
import { buildRescueBoard } from './deadlock';
import { evaluateGuess, generateNextClue } from './deduction';
import type { CompactDictionary } from './dictionary';
import { evolveBoardForNextPhase, generateInitialBoard, generatePhaseTargets } from './generator';
import { createPrng } from './prng';
import type {
  DifficultyPreset,
  DispatchResult,
  EconomyConfig,
  EngineEvent,
  GameAction,
  GameMode,
  GameState,
  RunStats,
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
    targetsSolvedByGuess: 0,
    targetsSolvedOnBoard: 0,
    targetsRevealed: 0,
    shiftsSpent: 0,
    cluesPurchased: 0,
    rescuesUsed: 0,
    phasesCleared: 0,
    totalGuessesUsed: 0,
  };
}

export function createNewGame(options: CreateGameOptions): GameState {
  const config = options.config ?? DEFAULT_ECONOMY;
  const mode = options.mode ?? 'solo';
  const difficulty = options.difficulty ?? 'standard';
  const diffSettings = DIFFICULTY_SETTINGS[difficulty];

  const board = generateInitialBoard(options.seed, options.dict, config);
  const targets = generatePhaseTargets(board, options.seed, 1, options.dict, difficulty, config);

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
    insightPoints: diffSettings.startingInsight,
    wordsTowardsNextShift: 0,
    foundWords: [],
    targets,
    uncommittedShifts: [],
    rescueCount: 0,
    dailyComplete: false,
    stats: createInitialStats(),
    actionLog: [],
    updatedAt: options.nowIso ?? new Date().toISOString(),
  };
}

export function isPhaseReadyToAdvance(state: GameState): boolean {
  return state.targets.length > 0 && state.targets.every((t) => t.status !== 'active');
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
      const insightEarned = isLong ? config.insightPerLongWord : config.insightPerWord;

      let wordsTowards = state.wordsTowardsNextShift + 1;
      let shiftsEarned = 0;
      if (wordsTowards >= config.wordsPerShiftToken) {
        wordsTowards -= config.wordsPerShiftToken;
        shiftsEarned += 1;
      }
      if (isLong) {
        shiftsEarned += 1;
      }

      let nextScore = state.score + wordScore;
      let nextShifts = Math.min(config.maxShiftTokens, state.shiftTokens + shiftsEarned);
      const nextInsight = state.insightPoints + insightEarned;
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
        insightEarned,
      });

      // Board-grounded hybrid check: did the player physically construct an active hidden target?
      const nextTargets = state.targets.map((target) => {
        if (target.status === 'active' && target.answer === word) {
          const targetBase =
            config.targetBaseScore + config.targetLengthStepScore * (target.length - 3);
          const unused = Math.max(0, target.maxGuesses - target.guesses.length);
          const efficiencyBonus = unused * config.unusedGuessBonus;
          const totalBonus = targetBase + efficiencyBonus + config.boardConstructionBonusScore;

          nextScore += totalBonus;
          nextShifts = Math.min(
            config.maxShiftTokens,
            nextShifts + config.boardConstructionBonusShifts,
          );
          nextStats.targetsSolvedOnBoard += 1;

          events.push({
            type: 'TARGET_SOLVED_ON_BOARD',
            targetId: target.id,
            word,
            bonusScore: totalBonus,
            bonusShifts: config.boardConstructionBonusShifts,
          });

          return { ...target, status: 'solved_board' as const };
        }
        return target;
      });

      const nextState: GameState = {
        ...state,
        score: nextScore,
        shiftTokens: nextShifts,
        insightPoints: nextInsight,
        wordsTowardsNextShift: wordsTowards,
        foundWords: [...state.foundWords, word],
        targets: nextTargets,
        uncommittedShifts: [], // Commit boundary: word submission locks prior shifts
        stats: nextStats,
        actionLog: [...state.actionLog, action],
        updatedAt: timestamp,
      };

      return { state: nextState, events };
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

    case 'SUBMIT_GUESS': {
      const target = state.targets.find((t) => t.id === action.targetId);
      if (!target) {
        return { state, events, error: 'Target not found' };
      }
      if (target.status !== 'active') {
        return { state, events, error: 'Target is already resolved' };
      }
      if (target.guesses.length >= target.maxGuesses) {
        return { state, events, error: 'No guesses remaining — buy extra guesses or reveal target' };
      }

      const guess = action.word.trim().toUpperCase();
      if (guess.length !== target.length) {
        return { state, events, error: `Guess must be ${target.length} letters long` };
      }
      if (!dict.hasWord(guess)) {
        return { state, events, error: `"${guess}" is not in the UK English dictionary` };
      }

      const feedback = evaluateGuess(guess, target.answer);
      const solved = feedback.every((f) => f === 'exact');
      const updatedGuesses = [...target.guesses, { word: guess, feedback }];

      let scoreDelta = 0;
      if (solved) {
        const base = config.targetBaseScore + config.targetLengthStepScore * (target.length - 3);
        const unused = Math.max(0, target.maxGuesses - updatedGuesses.length);
        scoreDelta = base + unused * config.unusedGuessBonus;
      }

      const nextTargets = state.targets.map((t) =>
        t.id === target.id
          ? {
              ...t,
              guesses: updatedGuesses,
              status: solved ? ('solved_guess' as const) : t.status,
            }
          : t,
      );

      events.push({
        type: 'GUESS_EVALUATED',
        targetId: target.id,
        word: guess,
        solved,
        scoreDelta,
      });

      return {
        state: {
          ...state,
          score: state.score + scoreDelta,
          targets: nextTargets,
          uncommittedShifts: [], // Commit boundary
          stats: {
            ...state.stats,
            totalGuessesUsed: state.stats.totalGuessesUsed + 1,
            targetsSolvedByGuess: state.stats.targetsSolvedByGuess + (solved ? 1 : 0),
          },
          actionLog: [...state.actionLog, action],
          updatedAt: timestamp,
        },
        events,
      };
    }

    case 'BUY_CLUE': {
      const target = state.targets.find((t) => t.id === action.targetId);
      if (!target || target.status !== 'active') {
        return { state, events, error: 'Active target not found' };
      }
      if (state.insightPoints < config.clueCost) {
        return { state, events, error: `Need ${config.clueCost} Insight Points to buy a clue` };
      }

      const prng = createPrng(`${state.seed}:clue:${state.phase}:${target.id}:${target.clues.length}`);
      const clue = generateNextClue(target, state.targets, state.board, prng);
      if (!clue) {
        return { state, events, error: 'No additional clues available for this target' };
      }

      const nextTargets = state.targets.map((t) =>
        t.id === target.id ? { ...t, clues: [...t.clues, clue] } : t,
      );

      events.push({ type: 'CLUE_UNLOCKED', targetId: target.id, clue });

      return {
        state: {
          ...state,
          insightPoints: state.insightPoints - config.clueCost,
          targets: nextTargets,
          uncommittedShifts: [], // Commit boundary
          stats: { ...state.stats, cluesPurchased: state.stats.cluesPurchased + 1 },
          actionLog: [...state.actionLog, action],
          updatedAt: timestamp,
        },
        events,
      };
    }

    case 'BUY_EXTRA_GUESSES': {
      const target = state.targets.find((t) => t.id === action.targetId);
      if (!target || target.status !== 'active') {
        return { state, events, error: 'Active target not found' };
      }
      if (state.insightPoints < config.extraGuessesCost) {
        return {
          state,
          events,
          error: `Need ${config.extraGuessesCost} Insight Points for extra guesses`,
        };
      }

      const newMax = target.maxGuesses + config.extraGuessesGrant;
      const nextTargets = state.targets.map((t) =>
        t.id === target.id ? { ...t, maxGuesses: newMax } : t,
      );

      events.push({ type: 'EXTRA_GUESSES_ADDED', targetId: target.id, newMax });

      return {
        state: {
          ...state,
          insightPoints: state.insightPoints - config.extraGuessesCost,
          targets: nextTargets,
          actionLog: [...state.actionLog, action],
          updatedAt: timestamp,
        },
        events,
      };
    }

    case 'REVEAL_TARGET': {
      const target = state.targets.find((t) => t.id === action.targetId);
      if (!target || target.status !== 'active') {
        return { state, events, error: 'Active target not found' };
      }

      const nextScore = Math.max(0, state.score - config.revealPenalty);
      const nextTargets = state.targets.map((t) =>
        t.id === target.id ? { ...t, status: 'revealed' as const } : t,
      );

      events.push({
        type: 'TARGET_REVEALED',
        targetId: target.id,
        answer: target.answer,
        penalty: config.revealPenalty,
      });

      return {
        state: {
          ...state,
          score: nextScore,
          targets: nextTargets,
          uncommittedShifts: [],
          stats: { ...state.stats, targetsRevealed: state.stats.targetsRevealed + 1 },
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
        return { state, events, error: 'Resolve all targets before advancing the phase' };
      }

      const allSolved = state.targets.every(
        (t) => t.status === 'solved_guess' || t.status === 'solved_board',
      );
      const phaseBonus = allSolved ? config.phaseCompletionBonus : 0;
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
      const nextTargets = generatePhaseTargets(
        nextBoard,
        state.seed,
        nextPhase,
        dict,
        state.difficulty,
        config,
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
          foundWords: [], // Phase reset prevents permanent dictionary exhaustion
          targets: nextTargets,
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

/**
 * Replays a recorded action log from a seed to verify determinism.
 */
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
