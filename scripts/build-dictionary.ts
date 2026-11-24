import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const wordlist: Record<string, string[]> = require('wordlist-english');

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '../src/data');

export const DICTIONARY_VERSION = 'uk-en-v1';

const BOARD_TIERS = [
  'english/10',
  'english/20',
  'english/35',
  'english/40',
  'english/50',
  'english/55',
  'english/60',
  'english/british/10',
  'english/british/20',
  'english/british/35',
  'english/british/40',
  'english/british/50',
  'english/british/55',
  'english/british/60',
];

// Tiers 10 + 20 are high-frequency everyday UK English words — fair and recognisable as hidden targets
const TARGET_TIERS = [
  'english/10',
  'english/20',
  'english/british/10',
  'english/british/20',
];

function collectWords(tiers: string[], minLen: number, maxLen: number): string[] {
  const seen = new Set<string>();
  const pattern = /^[a-z]+$/;

  for (const tier of tiers) {
    const words = wordlist[tier] ?? [];
    for (const raw of words) {
      // Strictly lowercase in SCOWL excludes proper nouns, acronyms, and contractions
      if (raw.length < minLen || raw.length > maxLen) continue;
      if (!pattern.test(raw)) continue;
      seen.add(raw.toUpperCase());
    }
  }

  return Array.from(seen).sort();
}

/**
 * Front-codes a sorted uppercase word list.
 * Each line is `<base36_prefix_len><suffix>` relative to the previous word.
 */
function encodeFrontCoded(sortedWords: string[]): string {
  const lines: string[] = [];
  let prev = '';

  for (const word of sortedWords) {
    let prefixLen = 0;
    const maxPrefix = Math.min(prev.length, word.length, 35);
    while (prefixLen < maxPrefix && prev.charCodeAt(prefixLen) === word.charCodeAt(prefixLen)) {
      prefixLen++;
    }
    lines.push(prefixLen.toString(36) + word.slice(prefixLen));
    prev = word;
  }

  return lines.join('\n');
}

function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  const boardWords = collectWords(BOARD_TIERS, 3, 16);
  const targetWords = collectWords(TARGET_TIERS, 4, 7);

  // Guarantee every target word is also present in the board dictionary
  const boardSet = new Set(boardWords);
  for (const t of targetWords) {
    boardSet.add(t);
  }
  const finalBoardWords = Array.from(boardSet).sort();

  const boardEncoded = encodeFrontCoded(finalBoardWords);
  const targetEncoded = encodeFrontCoded(targetWords);

  const boardPath = resolve(OUT_DIR, `board-${DICTIONARY_VERSION}.fc.txt`);
  const targetPath = resolve(OUT_DIR, `targets-${DICTIONARY_VERSION}.fc.txt`);

  writeFileSync(boardPath, boardEncoded, 'utf8');
  writeFileSync(targetPath, targetEncoded, 'utf8');

  // Length distribution summary for targets
  const dist: Record<number, number> = {};
  for (const w of targetWords) {
    dist[w.length] = (dist[w.length] ?? 0) + 1;
  }

  console.log(`Built Oh! Shift UK English dictionary (${DICTIONARY_VERSION})`);
  console.log(`  Board words:  ${finalBoardWords.length.toLocaleString()} (${(boardEncoded.length / 1024).toFixed(1)} KB front-coded)`);
  console.log(`  Target words: ${targetWords.length.toLocaleString()} (${(targetEncoded.length / 1024).toFixed(1)} KB front-coded)`);
  console.log(`  Target length breakdown:`, dist);
  console.log(`  UK check: COLOUR=${boardSet.has('COLOUR')}, FLAVOUR=${boardSet.has('FLAVOUR')}, CENTRE=${boardSet.has('CENTRE')}`);
}

main();
