export type GameMode = 'solo' | 'daily' | 'competitive' | 'cooperative';

export type DifficultyPreset = 'relaxed' | 'standard' | 'expert';

export type ShiftAxis = 'row' | 'col';
export type ShiftDirection = 'left' | 'right' | 'up' | 'down';

export interface Coord {
  row: number;
  col: number;
}

export interface ShiftOp {
  axis: ShiftAxis;
  index: number; // 0..4
  direction: ShiftDirection;
}

export type LetterFeedback = 'exact' | 'present' | 'absent';

export interface WordProbeRecord {
  word: string;
  score: number;
  feedback: LetterFeedback[];
  newlyPopulatedIndices: number[];
}

export interface TargetState {
  answer: string;
  length: number;
  parShifts: number;
  revealedPositions: boolean[];
  solved: boolean;
  solvedDirectly: boolean;
}

export interface EconomyConfig {
  minWordLength: number;
  startingShiftTokens: number;
  maxShiftTokens: number;
  wordsPerShiftToken: number;
  longWordBonusLength: number;
  rescuePenalty: number;
  targetBaseScore: number;
  targetLengthStepScore: number;
  directSolveBonusScore: number;
  directSolveBonusShifts: number;
  efficiencyWordPar: number;
  efficiencyBonusPerWord: number;
  phaseCompletionBonus: number;
  phaseTileReplacementsMin: number;
  phaseTileReplacementsMax: number;
  minPlayableWordsPerBoard: number;
  dailyPhaseCount: number;
}

export interface RunStats {
  totalWordsFound: number;
  longestWord: string;
  targetsSolved: number;
  directSolves: number;
  shiftsSpent: number;
  rescuesUsed: number;
  phasesCleared: number;
}

export type GameAction =
  | { type: 'SUBMIT_WORD'; path: Coord[] }
  | { type: 'SHIFT'; op: ShiftOp }
  | { type: 'UNDO_SHIFT' }
  | { type: 'RESCUE_REFRESH' }
  | { type: 'ADVANCE_PHASE' };

export type EngineEvent =
  | {
      type: 'WORD_ACCEPTED';
      word: string;
      scoreDelta: number;
      shiftsEarned: number;
      newlyPopulatedIndices: number[];
    }
  | {
      type: 'TARGET_SOLVED';
      word: string;
      direct: boolean;
      bonusScore: number;
      bonusShifts: number;
    }
  | { type: 'SHIFT_APPLIED'; op: ShiftOp }
  | { type: 'SHIFT_UNDONE'; op: ShiftOp }
  | { type: 'RESCUE_APPLIED'; penalty: number; replacedCount: number }
  | { type: 'PHASE_ADVANCED'; newPhase: number; phaseBonus: number; dailyComplete: boolean };

export interface GameState {
  schemaVersion: number;
  gameId: string;
  seed: string;
  dictionaryVersion: string;
  mode: GameMode;
  difficulty: DifficultyPreset;
  phase: number;
  board: string[][];
  score: number;
  shiftTokens: number;
  wordsTowardsNextShift: number;
  foundWords: string[];
  probeHistory: WordProbeRecord[];
  target: TargetState;
  uncommittedShifts: ShiftOp[];
  rescueCount: number;
  dailyComplete: boolean;
  stats: RunStats;
  actionLog: GameAction[];
  updatedAt: string;
}

export interface DispatchResult {
  state: GameState;
  events: EngineEvent[];
  error?: string;
}
