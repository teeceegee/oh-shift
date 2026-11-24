import type { LetterFeedback } from '../../engine';

interface KeyboardProps {
  boardLetters: Readonly<Record<string, number>>;
  letterStates: Readonly<Record<string, LetterFeedback>>;
  disabled?: boolean;
  onKey: (letter: string) => void;
  onBackspace: () => void;
  onEnter: () => void;
}

const ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACK'],
];

export function Keyboard({
  boardLetters,
  letterStates,
  disabled,
  onKey,
  onBackspace,
  onEnter,
}: KeyboardProps) {
  return (
    <div className="keyboard" role="group" aria-label="Deduction keyboard">
      {ROWS.map((row, rowIdx) => (
        <div key={rowIdx} className="keyboard-row">
          {row.map((key) => {
            if (key === 'ENTER') {
              return (
                <button
                  key={key}
                  type="button"
                  className="key-btn key-btn--wide"
                  disabled={disabled}
                  onClick={onEnter}
                >
                  Enter
                </button>
              );
            }
            if (key === 'BACK') {
              return (
                <button
                  key={key}
                  type="button"
                  className="key-btn key-btn--wide"
                  disabled={disabled}
                  onClick={onBackspace}
                  aria-label="Backspace"
                >
                  ⌫
                </button>
              );
            }

            const onBoard = (boardLetters[key] ?? 0) > 0;
            const state = letterStates[key];
            const classes = [
              'key-btn',
              !onBoard && !state ? 'key-btn--offboard' : '',
              state ? `key-btn--${state}` : '',
            ]
              .filter(Boolean)
              .join(' ');

            return (
              <button
                key={key}
                type="button"
                className={classes}
                disabled={disabled}
                onClick={() => onKey(key)}
                aria-label={`${key}${!onBoard ? ', not on board' : ''}${state ? `, ${state}` : ''}`}
              >
                {key}
              </button>
            );
          })}
        </div>
      ))}
      <div className="keyboard-legend">
        Dashed dimmed letters are not on the current 5×5 board
      </div>
    </div>
  );
}
