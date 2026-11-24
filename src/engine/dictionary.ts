export const DICTIONARY_VERSION = 'uk-en-v1';

/**
 * Decodes a front-coded word list (`<base36_prefix_len><suffix>` per line)
 * into a sorted uppercase string array.
 */
export function decodeFrontCoded(encoded: string): string[] {
  const lines = encoded.trim().split('\n');
  const words: string[] = new Array(lines.length);
  let prev = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const prefixLen = parseInt(line[0], 36);
    const word = prev.slice(0, prefixLen) + line.slice(1);
    words[i] = word;
    prev = word;
  }

  return words;
}

/**
 * Lower-bound binary search on a sorted uppercase string array.
 */
function lowerBound(sorted: readonly string[], key: string): number {
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (sorted[mid] < key) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  return lo;
}

/**
 * Memory-compact UK English dictionary (< 2 MB RAM on iOS Safari)
 * backed by sorted arrays and O(log N) binary search for both exact
 * membership and prefix pruning during 5x5 board DFS.
 */
export class CompactDictionary {
  readonly version: string;
  readonly boardWords: readonly string[];
  readonly targetWords: readonly string[];

  constructor(boardWords: readonly string[], targetWords: readonly string[], version = DICTIONARY_VERSION) {
    this.version = version;
    this.boardWords = boardWords;
    this.targetWords = targetWords;
  }

  static fromFrontCoded(
    boardEncoded: string,
    targetEncoded: string,
    version = DICTIONARY_VERSION,
  ): CompactDictionary {
    return new CompactDictionary(
      decodeFrontCoded(boardEncoded),
      decodeFrontCoded(targetEncoded),
      version,
    );
  }

  hasWord(word: string): boolean {
    const upper = word.toUpperCase();
    const idx = lowerBound(this.boardWords, upper);
    return idx < this.boardWords.length && this.boardWords[idx] === upper;
  }

  hasPrefix(prefix: string): boolean {
    const upper = prefix.toUpperCase();
    const idx = lowerBound(this.boardWords, upper);
    return idx < this.boardWords.length && this.boardWords[idx].startsWith(upper);
  }

  isTargetWord(word: string): boolean {
    const upper = word.toUpperCase();
    const idx = lowerBound(this.targetWords, upper);
    return idx < this.targetWords.length && this.targetWords[idx] === upper;
  }

  hasTargetPrefix(prefix: string): boolean {
    const upper = prefix.toUpperCase();
    const idx = lowerBound(this.targetWords, upper);
    return idx < this.targetWords.length && this.targetWords[idx].startsWith(upper);
  }
}
