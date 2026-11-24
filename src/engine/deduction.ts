import { getBoardLetterCounts } from './board';
import type { Prng } from './prng';
import type { Clue, LetterFeedback, TargetState } from './types';

/**
 * Standard two-pass duplicate-letter Wordle evaluation:
 * 1. Mark exact positional matches and decrement available answer counts.
 * 2. Mark misplaced letters only up to remaining available counts; otherwise absent.
 */
export function evaluateGuess(guessRaw: string, answerRaw: string): LetterFeedback[] {
  const guess = guessRaw.toUpperCase();
  const answer = answerRaw.toUpperCase();

  if (guess.length !== answer.length) {
    throw new Error(`Guess length (${guess.length}) must match answer length (${answer.length})`);
  }

  const len = answer.length;
  const feedback: LetterFeedback[] = new Array(len).fill('absent');
  const remaining: Record<string, number> = {};

  // Pass 1: exact matches
  for (let i = 0; i < len; i++) {
    if (guess[i] === answer[i]) {
      feedback[i] = 'exact';
    } else {
      remaining[answer[i]] = (remaining[answer[i]] ?? 0) + 1;
    }
  }

  // Pass 2: misplaced matches
  for (let i = 0; i < len; i++) {
    if (feedback[i] === 'exact') continue;
    const ch = guess[i];
    if ((remaining[ch] ?? 0) > 0) {
      feedback[i] = 'present';
      remaining[ch] -= 1;
    }
  }

  return feedback;
}

/**
 * Verifies that a clue is strictly consistent with the target's actual answer.
 * Used as a safety invariant before displaying any clue (acceptance criterion #11).
 */
export function verifyClueMatchesAnswer(clue: Clue, target: TargetState, allTargets: readonly TargetState[]): boolean {
  const answer = target.answer.toUpperCase();
  switch (clue.type) {
    case 'position': {
      const idx = Number(clue.data.index);
      const letter = String(clue.data.letter);
      return idx >= 0 && idx < answer.length && answer[idx] === letter;
    }
    case 'excluded_letter': {
      const letter = String(clue.data.letter);
      return !answer.includes(letter);
    }
    case 'shift_par': {
      const maxShifts = Number(clue.data.parShifts);
      return maxShifts === target.parShifts && maxShifts >= 0;
    }
    case 'relationship': {
      const other = allTargets.find((t) => t.id === String(clue.data.otherTargetId));
      if (!other) return false;
      const relation = String(clue.data.relation);
      if (relation === 'shared_first') return answer[0] === other.answer[0];
      if (relation === 'shared_last') return answer[answer.length - 1] === other.answer[other.answer.length - 1];
      if (relation === 'shared_letter') {
        const ch = String(clue.data.letter);
        return answer.includes(ch) && other.answer.includes(ch);
      }
      return false;
    }
  }
}

function getKnownExactPositions(target: TargetState): Set<number> {
  const known = new Set<number>();
  for (const clue of target.clues) {
    if (clue.type === 'position') {
      known.add(Number(clue.data.index));
    }
  }
  for (const guess of target.guesses) {
    for (let i = 0; i < guess.feedback.length; i++) {
      if (guess.feedback[i] === 'exact') {
        known.add(i);
      }
    }
  }
  return known;
}

function getKnownExcludedLetters(target: TargetState): Set<string> {
  const excluded = new Set<string>();
  for (const clue of target.clues) {
    if (clue.type === 'excluded_letter') {
      excluded.add(String(clue.data.letter));
    }
  }
  for (const guess of target.guesses) {
    for (let i = 0; i < guess.feedback.length; i++) {
      if (guess.feedback[i] === 'absent' && !target.answer.includes(guess.word[i])) {
        excluded.add(guess.word[i]);
      }
    }
  }
  return excluded;
}

/**
 * Generates a fresh, non-redundant, verified clue for a target.
 * Returns null only if every single position and useful clue is already revealed.
 */
export function generateNextClue(
  target: TargetState,
  allTargets: readonly TargetState[],
  board: readonly (readonly string[])[],
  prng: Prng,
  preferType?: Clue['type'],
): Clue | null {
  const answer = target.answer.toUpperCase();
  const nextIndex = target.clues.length + 1;
  const knownPositions = getKnownExactPositions(target);
  const knownExcluded = getKnownExcludedLetters(target);
  const hasShiftPar = target.clues.some((c) => c.type === 'shift_par');
  const existingRelKeys = new Set(
    target.clues
      .filter((c) => c.type === 'relationship')
      .map((c) => `${c.data.otherTargetId}:${c.data.relation}:${c.data.letter ?? ''}`),
  );

  const candidates: Clue[] = [];

  // 1. Confirmed letter position
  const unrevealedPositions: number[] = [];
  for (let i = 0; i < answer.length; i++) {
    if (!knownPositions.has(i)) unrevealedPositions.push(i);
  }
  if (unrevealedPositions.length > 0) {
    const pos = prng.pick(unrevealedPositions);
    const letter = answer[pos];
    candidates.push({
      id: `${target.id}-c${nextIndex}`,
      type: 'position',
      text: `Position ${pos + 1} is "${letter}"`,
      data: { index: pos, letter },
    });
  }

  // 2. Excluded letter that actually exists on the board (high deductive value!)
  const boardLetters = Object.keys(getBoardLetterCounts(board)).sort();
  const excludable = boardLetters.filter((ch) => !answer.includes(ch) && !knownExcluded.has(ch));
  if (excludable.length > 0) {
    const letter = prng.pick(excludable);
    candidates.push({
      id: `${target.id}-c${nextIndex}`,
      type: 'excluded_letter',
      text: `Does not contain "${letter}" (even though it is on the board)`,
      data: { letter },
    });
  }

  // 3. Shift-par hint (tells player how many shifts can assemble this target on the board)
  if (!hasShiftPar) {
    const text =
      target.parShifts === 0
        ? 'Already constructible on the starting board (0 shifts needed)'
        : `Constructible on the starting board within ${target.parShifts} ${target.parShifts === 1 ? 'shift' : 'shifts'}`;
    candidates.push({
      id: `${target.id}-c${nextIndex}`,
      type: 'shift_par',
      text,
      data: { parShifts: target.parShifts },
    });
  }

  // 4. Verified relationship with another target
  for (let i = 0; i < allTargets.length; i++) {
    const other = allTargets[i];
    if (other.id === target.id) continue;
    const otherLabel = `Target ${i + 1}`;
    if (answer[0] === other.answer[0] && !existingRelKeys.has(`${other.id}:shared_first:`)) {
      candidates.push({
        id: `${target.id}-c${nextIndex}`,
        type: 'relationship',
        text: `Shares its first letter with ${otherLabel}`,
        data: { otherTargetId: other.id, relation: 'shared_first' },
      });
    } else if (
      answer[answer.length - 1] === other.answer[other.answer.length - 1] &&
      !existingRelKeys.has(`${other.id}:shared_last:`)
    ) {
      candidates.push({
        id: `${target.id}-c${nextIndex}`,
        type: 'relationship',
        text: `Shares its last letter with ${otherLabel}`,
        data: { otherTargetId: other.id, relation: 'shared_last' },
      });
    }
  }

  const verified = candidates.filter((c) => verifyClueMatchesAnswer(c, target, allTargets));
  if (verified.length === 0) return null;

  if (preferType) {
    const preferred = verified.find((c) => c.type === preferType);
    if (preferred) return preferred;
  }

  // Prioritise position clues when buying clues, or pick deterministically
  const positionClue = verified.find((c) => c.type === 'position');
  if (positionClue && prng.next() < 0.65) {
    return positionClue;
  }
  return prng.pick(verified);
}
