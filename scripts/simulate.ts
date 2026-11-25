import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CompactDictionary,
  createNewGame,
  createPrng,
  DICTIONARY_VERSION,
  dispatchAction,
} from '../src/engine';
import type { ShiftOp } from '../src/engine';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = resolve(__dirname, '../src/data');

const boardEncoded = readFileSync(resolve(dataDir, `board-${DICTIONARY_VERSION}.fc.txt`), 'utf8');
const targetEncoded = readFileSync(resolve(dataDir, `targets-${DICTIONARY_VERSION}.fc.txt`), 'utf8');
const dict = CompactDictionary.fromFrontCoded(boardEncoded, targetEncoded, DICTIONARY_VERSION);

const SHIFTS = 500;
const prng = createPrng('sim-v3-random-shifts');

function randomOp(): ShiftOp {
  const axis = prng.next() < 0.5 ? 'row' : 'col';
  const index = prng.nextInt(5);
  const direction =
    axis === 'row'
      ? prng.next() < 0.5
        ? 'left'
        : 'right'
      : prng.next() < 0.5
        ? 'up'
        : 'down';
  return { axis, index, direction };
}

for (const minLen of [4, 5] as const) {
  let state = createNewGame({ seed: `sim-v3-${minLen}`, dict, minMatchLength: minLen });
  let matchingShifts = 0;
  let cascadeShifts = 0;

  const t0 = performance.now();
  for (let i = 0; i < SHIFTS; i++) {
    const res = dispatchAction(state, { type: 'SHIFT', op: randomOp() }, dict);
    state = res.state;
    if (res.cascades.length > 0) matchingShifts++;
    if (res.cascades.length > 1) cascadeShifts++;
  }
  const elapsed = performance.now() - t0;

  console.log(`=== Oh! Shift v3 Simulation (${minLen}+ letters, ${SHIFTS} random shifts) ===`);
  console.log(`  Runtime:              ${elapsed.toFixed(1)} ms (${(elapsed / SHIFTS).toFixed(3)} ms/shift)`);
  console.log(`  Accidental hit rate:  ${((matchingShifts / SHIFTS) * 100).toFixed(1)}% (${matchingShifts}/${SHIFTS} shifts)`);
  console.log(`  Cascade combo rate:   ${((cascadeShifts / SHIFTS) * 100).toFixed(1)}% (max combo: ${state.stats.bestCombo}x)`);
  console.log(`  Words found:          ${state.stats.totalWordsFound} (${state.stats.fiveLetterWords} five-letter)`);
}
