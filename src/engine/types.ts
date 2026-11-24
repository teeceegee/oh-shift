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

export interface GuessRecord {
  word: string;
  feedback: LetterFeedback[];
}

export type ClueType = 'position' | 'excluded_letter' | 'shift_par' | 'relationship';

export interface Clue {
  id: string;
  type: ClueType;
  text: string;
  data: Record<string, string | number>;
}

export type TargetStatus = 'active' | 'solved_guess' | 'solved_board' | 'revealed';

export interface TargetState {
  id: string;
  answer: string;
  length: number;
  parShifts: number;
  maxGuesses: number;
  clues: Clue[];
  guesses: GuessRecord[];
  status: TargetStatus;
}

export interface EconomyConfig {
  minWordLength: number;
  startingShiftTokens: number;
  maxShiftTokens: number;
  wordsPerShiftToken: number;
  longWordBonusLength: number;
  insightPerWord: number;
  insightPerLongWord: number;
  baseMaxGuesses: number;
  clueCost: number;
  extraGuessesCost: number;
  extraGuessesGrant: number;
  revealPenalty: number;
  rescuePenalty: number;
  boardConstructionBonusScore: number;
  boardConstructionBonusShifts: number;
  targetBaseScore: number;
  targetLengthStepScore: number;
  unusedGuessBonus: number;
  phaseCompletionBonus: number;
  phaseTileReplacementsMin: number;
  phaseTileReplacementsMax: number;
  minPlayableWordsPerBoard: number;
  dailyPhaseCount: number;
}

export interface RunStats {
  totalWordsFound: number;
  longestWord: string;
  targetsSolvedByGuess: number;
  targetsSolvedOnBoard: number;
  targetsRevealed: number;
  shiftsSpent: number;
  cluesPurchased: number;
  rescuesUsed: number;
  phasesCleared: number;
  totalGuessesUsed: number;
}

export type GameAction =
  | { type: 'SUBMIT_WORD'; path: Coord[] }
  | { type: 'SHIFT'; op: ShiftOp }
  | { type: 'UNDO_SHIFT' }
  | { type: 'SUBMIT_GUESS'; targetId: string; word: string }
  | { type: 'BUY_CLUE'; targetId: string }
  | { type: 'BUY_EXTRA_GUESSES'; targetId: string }
  | { type: 'REVEAL_TARGET'; targetId: string }
  | { type: 'RESCUE_REFRESH' }
  | { type: 'ADVANCE_PHASE' };

export type EngineEvent =
  | { type: 'WORD_ACCEPTED'; word: string; scoreDelta: number; shiftsEarned: number; insightEarned: number }
  | { type: 'TARGET_SOLVED_ON_BOARD'; targetId: string; word: string; bonusScore: number; bonusShifts: number }
  | { type: 'SHIFT_APPLIED'; op: ShiftOp }
  | { type: 'SHIFT_UNDONE'; op: ShiftOp }
  | { type: 'GUESS_EVALUATED'; targetId: string; word: string; solved: boolean; scoreDelta: number }
  | { type: 'CLUE_UNLOCKED'; targetId: string; clue: Clue }
  | { type: 'EXTRA_GUESSES_ADDED'; targetId: string; newMax: number }
  | { type: 'TARGET_REVEALED'; targetId: string; answer: string; penalty: number }
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
  insightPoints: number;
  wordsTowardsNextShift: number;
  foundWords: string[];
  targets: TargetState[];
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
