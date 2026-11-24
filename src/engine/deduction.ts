import type { LetterFeedback } from './types';

/**
 * Two-pass duplicate-letter evaluation of any board word (length >= 3)
 * against the hidden target word (length 4..7).
 *
 * Pass 1: mark exact positional matches for indices 0..min(word, answer)-1
 *         and count all remaining unmatched letters of the answer.
 * Pass 2: for every non-exact index in word, mark 'present' if that letter
 *         still has remaining unmatched occurrences in answer; else 'absent'.
 */
export function evaluateWordAgainstTarget(wordRaw: string, answerRaw: string): LetterFeedback[] {
  const word = wordRaw.toUpperCase();
  const answer = answerRaw.toUpperCase();

  const feedback: LetterFeedback[] = new Array(word.length).fill('absent');
  const remaining: Record<string, number> = {};
  const overlap = Math.min(word.length, answer.length);

  // Pass 1: exact positional matches in overlapping prefix
  for (let i = 0; i < overlap; i++) {
    if (word[i] === answer[i]) {
      feedback[i] = 'exact';
    } else {
      remaining[answer[i]] = (remaining[answer[i]] ?? 0) + 1;
    }
  }
  // Include any remaining tail letters of answer beyond word.length
  for (let i = overlap; i < answer.length; i++) {
    remaining[answer[i]] = (remaining[answer[i]] ?? 0) + 1;
  }

  // Pass 2: misplaced letters anywhere in word
  for (let i = 0; i < word.length; i++) {
    if (feedback[i] === 'exact') continue;
    const ch = word[i];
    if ((remaining[ch] ?? 0) > 0) {
      feedback[i] = 'present';
      remaining[ch] -= 1;
    }
  }

  return feedback;
}
