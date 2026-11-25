import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CompactDictionary,
  createNewGame,
  DICTIONARY_VERSION,
  findMatchesStartingAt,
} from '../src/engine';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = resolve(__dirname, '../src/data');

const boardEncoded = readFileSync(resolve(dataDir, `board-${DICTIONARY_VERSION}.fc.txt`), 'utf8');
const targetEncoded = readFileSync(resolve(dataDir, `targets-${DICTIONARY_VERSION}.fc.txt`), 'utf8');
const dict = CompactDictionary.fromFrontCoded(boardEncoded, targetEncoded, DICTIONARY_VERSION);

const BOARDS = 100;
let totalClaimable3 = 0;
let totalClaimable4 = 0;

for (let i = 0; i < BOARDS; i++) {
  const state = createNewGame({ seed: `sim-v4-${i}`, dict, minMatchLength: 3 });
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      totalClaimable3 += findMatchesStartingAt(state.board, { row: r, col: c }, dict, 3).length;
      totalClaimable4 += findMatchesStartingAt(state.board, { row: r, col: c }, dict, 4).length;
    }
  }
}

console.log(`=== Oh! Shift v4 Board Density (${BOARDS} starting boards) ===`);
console.log(`  Avg claimable 3+ H/V words at start: ${(totalClaimable3 / BOARDS).toFixed(1)}`);
console.log(`  Avg claimable 4+ H/V words at start: ${(totalClaimable4 / BOARDS).toFixed(1)}`);
