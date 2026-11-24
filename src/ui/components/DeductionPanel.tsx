import { useEffect, useMemo, useState } from 'react';
import { DEFAULT_ECONOMY } from '../../engine';
import type { LetterFeedback, TargetState } from '../../engine';
import { Keyboard } from './Keyboard';

interface DeductionPanelProps {
  target: TargetState;
  targetNumber: number;
  boardLetters: Readonly<Record<string, number>>;
  insightPoints: number;
  onSubmitGuess: (targetId: string, word: string) => boolean;
  onBuyClue: (targetId: string) => void;
  onBuyExtraGuesses: (targetId: string) => void;
  onRevealTarget: (targetId: string) => void;
}

const FEEDBACK_SYMBOL: Record<LetterFeedback, string> = {
  exact: '✓',
  present: '↔',
  absent: '×',
};

const STATE_PRIORITY: Record<LetterFeedback, number> = {
  absent: 1,
  present: 2,
  exact: 3,
};

export function DeductionPanel({
  target,
  targetNumber,
  boardLetters,
  insightPoints,
  onSubmitGuess,
  onBuyClue,
  onBuyExtraGuesses,
  onRevealTarget,
}: DeductionPanelProps) {
  const [draft, setDraft] = useState('');

  // Reset draft when switching targets
  useEffect(() => {
    setDraft('');
  }, [target.id]);

  const isActive = target.status === 'active';
  const outOfGuesses = isActive && target.guesses.length >= target.maxGuesses;

  const letterStates = useMemo(() => {
    const map: Record<string, LetterFeedback> = {};
    for (const g of target.guesses) {
      for (let i = 0; i < g.word.length; i++) {
        const ch = g.word[i];
        const fb = g.feedback[i];
        const prev = map[ch];
        if (!prev || STATE_PRIORITY[fb] > STATE_PRIORITY[prev]) {
          map[ch] = fb;
        }
      }
    }
    return map;
  }, [target.guesses]);

  const handleKey = (letter: string) => {
    if (!isActive || outOfGuesses) return;
    setDraft((prev) => (prev.length < target.length ? prev + letter : prev));
  };

  const handleBackspace = () => {
    setDraft((prev) => prev.slice(0, -1));
  };

  const handleEnter = () => {
    if (!isActive || outOfGuesses) return;
    if (draft.length !== target.length) return;
    const accepted = onSubmitGuess(target.id, draft);
    if (accepted) setDraft('');
  };

  // Support physical keyboards on iPad / desktop
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!isActive || outOfGuesses) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Enter') {
        handleEnter();
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        handleKey(e.key.toUpperCase());
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const totalRows = Math.max(target.maxGuesses, target.guesses.length);

  return (
    <div className="deduction-panel">
      <div className="section-heading">
        <span>
          Target {targetNumber} · {target.length} Letters
        </span>
        <span>
          {target.status === 'solved_board' && '★ Solved on Board!'}
          {target.status === 'solved_guess' && '✓ Solved'}
          {target.status === 'revealed' && `Revealed: ${target.answer}`}
          {target.status === 'active' &&
            `${target.guesses.length}/${target.maxGuesses} Guesses`}
        </span>
      </div>

      {/* Verified Clues */}
      <div className="clues-box">
        {target.clues.map((clue) => (
          <div key={clue.id} className="clue-item">
            <span aria-hidden="true">◆</span>
            <span>{clue.text}</span>
          </div>
        ))}
        {isActive && (
          <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn-secondary"
              disabled={insightPoints < DEFAULT_ECONOMY.clueCost}
              onClick={() => onBuyClue(target.id)}
            >
              Buy Clue ({DEFAULT_ECONOMY.clueCost} Insight)
            </button>
          </div>
        )}
      </div>

      {isActive && (
        <div className="bonus-tip">
          <strong>Board Bonus:</strong> Deduce this word and physically shift &amp; spell it on the
          5×5 board instead of typing the final guess for{' '}
          <strong>
            +{DEFAULT_ECONOMY.boardConstructionBonusScore} pts &amp; +
            {DEFAULT_ECONOMY.boardConstructionBonusShifts} Shift
          </strong>
          .
        </div>
      )}

      {/* Wordle-Style Guess Grid with Colour-Independent Symbols */}
      <div className="guess-rows" role="list" aria-label="Target guesses">
        {Array.from({ length: totalRows }, (_, rowIdx) => {
          const guess = target.guesses[rowIdx];
          const isCurrentDraftRow = isActive && !outOfGuesses && rowIdx === target.guesses.length;

          return (
            <div key={rowIdx} className="guess-row" role="listitem">
              {Array.from({ length: target.length }, (_, colIdx) => {
                if (guess) {
                  const ch = guess.word[colIdx];
                  const fb = guess.feedback[colIdx];
                  return (
                    <div
                      key={colIdx}
                      className={`guess-cell guess-cell--${fb}`}
                      aria-label={`${ch}, ${fb}`}
                    >
                      <span>{ch}</span>
                      <span className="feedback-symbol" aria-hidden="true">
                        {FEEDBACK_SYMBOL[fb]}
                      </span>
                    </div>
                  );
                }

                const draftChar = isCurrentDraftRow ? draft[colIdx] ?? '' : '';
                return (
                  <div key={colIdx} className="guess-cell">
                    {draftChar}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Recovery Controls when 6 guesses are exhausted */}
      {outOfGuesses && (
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-primary"
            disabled={insightPoints < DEFAULT_ECONOMY.extraGuessesCost}
            onClick={() => onBuyExtraGuesses(target.id)}
          >
            +{DEFAULT_ECONOMY.extraGuessesGrant} Guesses ({DEFAULT_ECONOMY.extraGuessesCost}{' '}
            Insight)
          </button>
          <button
            type="button"
            className="btn-warm"
            onClick={() => onRevealTarget(target.id)}
          >
            Reveal &amp; Skip (−{DEFAULT_ECONOMY.revealPenalty} pts)
          </button>
        </div>
      )}

      {/* Board-Aware On-Screen Keyboard */}
      {isActive && !outOfGuesses && (
        <Keyboard
          boardLetters={boardLetters}
          letterStates={letterStates}
          onKey={handleKey}
          onBackspace={handleBackspace}
          onEnter={handleEnter}
        />
      )}
    </div>
  );
}
