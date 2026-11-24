import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CompactDictionary,
  createNewGame,
  DICTIONARY_VERSION,
  dispatchAction,
  findBoardWords,
  getBoardLetterCounts,
  isBoardDeadlocked,
  verifyClueMatchesAnswer,
} from '../src/engine';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = resolve(__dirname, '../src/data');

const boardEncoded = readFileSync(resolve(dataDir, `board-${DICTIONARY_VERSION}.fc.txt`), 'utf8');
const targetEncoded = readFileSync(resolve(dataDir, `targets-${DICTIONARY_VERSION}.fc.txt`), 'utf8');

const t0 = performance.now();
const dict = CompactDictionary.fromFrontCoded(boardEncoded, targetEncoded, DICTIONARY_VERSION);
const loadMs = performance.now() - t0;

const RUNS = 50;
const PHASES_PER_RUN = 5;
const TOTAL_PHASES = RUNS * PHASES_PER_RUN;

let totalPlayableWords = 0;
let minPlayableWords = Infinity;
let totalTargets = 0;
let shiftRequiringTargets = 0;
let parShiftSum = 0;
let deadlocks = 0;
let clueViolations = 0;
let multiplicityViolations = 0;

const simStart = performance.now();

for (let r = 0; r < RUNS; r++) {
  let state = createNewGame({ seed: `sim-seed-${r}`, mode: 'solo', difficulty: 'standard', dict });

  for (let p = 1; p <= PHASES_PER_RUN; p++) {
    const words = findBoardWords(state.board, dict, { minLength: 3, maxLength: 8 });
    totalPlayableWords += words.size;
    if (words.size < minPlayableWords) minPlayableWords = words.size;
    if (isBoardDeadlocked(state, dict)) deadlocks++;

    const boardCounts = getBoardLetterCounts(state.board);
    for (const target of state.targets) {
      totalTargets++;
      parShiftSum += target.parShifts;
      if (target.parShifts >= 1) shiftRequiringTargets++;

      const needed: Record<string, number> = {};
      for (const ch of target.answer) {
        needed[ch] = (needed[ch] ?? 0) + 1;
        if (needed[ch] > (boardCounts[ch] ?? 0)) multiplicityViolations++;
      }

      for (const clue of target.clues) {
        if (!verifyClueMatchesAnswer(clue, target, state.targets)) clueViolations++;
      }

      // Solve target via guess to advance phase
      const res = dispatchAction(
        state,
        { type: 'SUBMIT_GUESS', targetId: target.id, word: target.answer },
        dict,
      );
      if (res.error) throw new Error(`Sim guess failed: ${res.error}`);
      state = res.state;
    }

    if (p < PHASES_PER_RUN) {
      const adv = dispatchAction(state, { type: 'ADVANCE_PHASE' }, dict);
      if (adv.error) throw new Error(`Sim advance failed: ${adv.error}`);
      state = adv.state;
    }
  }
}

const simMs = performance.now() - simStart;

console.log(`=== Oh! Shift Headless Simulation (${TOTAL_PHASES} phases across ${RUNS} seeds) ===`);
console.log(`Dictionary decode time:    ${loadMs.toFixed(1)} ms (${dict.boardWords.length.toLocaleString()} words)`);
console.log(`Total simulation time:     ${simMs.toFixed(1)} ms (${(simMs / TOTAL_PHASES).toFixed(2)} ms/phase)`);
console.log(`Avg playable words/board:  ${(totalPlayableWords / TOTAL_PHASES).toFixed(1)} (min: ${minPlayableWords})`);
console.log(`Targets generated:         ${totalTargets} (${((shiftRequiringTargets / totalTargets) * 100).toFixed(1)}% require >=1 shift)`);
console.log(`Avg par shifts per target: ${(parShiftSum / totalTargets).toFixed(2)}`);
console.log(`Deadlocks:                 ${deadlocks}`);
console.log(`Multiplicity violations:   ${multiplicityViolations}`);
console.log(`Clue violations:           ${clueViolations}`);

if (deadlocks > 0 || multiplicityViolations > 0 || clueViolations > 0) {
  process.exit(1);
}
