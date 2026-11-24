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
let shiftRequiringTargets = 0;
let parShiftSum = 0;
let deadlocks = 0;
let multiplicityViolations = 0;

const simStart = performance.now();

for (let r = 0; r < RUNS; r++) {
  let state = createNewGame({ seed: `sim-v2-${r}`, mode: 'solo', difficulty: 'standard', dict });

  for (let p = 1; p <= PHASES_PER_RUN; p++) {
    const words = findBoardWords(state.board, dict, { minLength: 3, maxLength: 8 });
    totalPlayableWords += words.size;
    if (words.size < minPlayableWords) minPlayableWords = words.size;
    if (isBoardDeadlocked(state, dict)) deadlocks++;

    const boardCounts = getBoardLetterCounts(state.board);
    const target = state.target;
    parShiftSum += target.parShifts;
    if (target.parShifts >= 1) shiftRequiringTargets++;

    const needed: Record<string, number> = {};
    for (const ch of target.answer) {
      needed[ch] = (needed[ch] ?? 0) + 1;
      if (needed[ch] > (boardCounts[ch] ?? 0)) multiplicityViolations++;
    }

    if (p < PHASES_PER_RUN) {
      state = {
        ...state,
        target: {
          ...state.target,
          revealedPositions: new Array(state.target.length).fill(true),
          solved: true,
        },
      };
      const adv = dispatchAction(state, { type: 'ADVANCE_PHASE' }, dict);
      if (adv.error) throw new Error(`Sim advance failed: ${adv.error}`);
      state = adv.state;
    }
  }
}

const simMs = performance.now() - simStart;

console.log(`=== Oh! Shift v2 Headless Simulation (${TOTAL_PHASES} phases across ${RUNS} seeds) ===`);
console.log(`Dictionary decode time:    ${loadMs.toFixed(1)} ms (${dict.boardWords.length.toLocaleString()} words)`);
console.log(`Total simulation time:     ${simMs.toFixed(1)} ms (${(simMs / TOTAL_PHASES).toFixed(2)} ms/phase)`);
console.log(`Avg playable words/board:  ${(totalPlayableWords / TOTAL_PHASES).toFixed(1)} (min: ${minPlayableWords})`);
console.log(`Targets requiring >=1 shift: ${((shiftRequiringTargets / TOTAL_PHASES) * 100).toFixed(1)}% (avg par: ${(parShiftSum / TOTAL_PHASES).toFixed(2)})`);
console.log(`Deadlocks:                 ${deadlocks}`);
console.log(`Multiplicity violations:   ${multiplicityViolations}`);

if (deadlocks > 0 || multiplicityViolations > 0) {
  process.exit(1);
}
