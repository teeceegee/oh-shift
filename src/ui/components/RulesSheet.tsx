import { DEFAULT_ECONOMY } from '../../engine';
import { BottomSheet } from './BottomSheet';

interface RulesSheetProps {
  onClose: () => void;
}

export function RulesSheet({ onClose }: RulesSheetProps) {
  return (
    <BottomSheet title="How to Play Oh! Shift" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.9rem', lineHeight: 1.5 }}>
        <p style={{ margin: 0 }}>
          <strong>Goal:</strong> Populate every letter of the hidden <strong>Target Word</strong>{' '}
          by spelling valid words on the 5×5 board.
        </p>

        <div>
          <strong>1. Positional Auto-Population</strong>
          <ul style={{ margin: '4px 0 0', paddingLeft: '18px' }}>
            <li>Tap or drag 3+ adjacent tiles (including diagonals) to submit a board word.</li>
            <li>
              Every letter in your word that matches the <strong>same position</strong> in the
              target word automatically locks into the target slots above the board (<strong>✓ Green</strong>).
            </li>
            <li>
              <strong>↔ Amber</strong> means that letter appears elsewhere in the target word;{' '}
              <strong>× Grey</strong> means it is not in the target word.
            </li>
            <li>
              To fill later slots (like position 5 or 6), spell words of that length whose 5th or
              6th letter matches — or deduce the target and spell it directly for a{' '}
              <strong>+{DEFAULT_ECONOMY.directSolveBonusScore} pt Direct Solve Bonus &amp; +1 Shift</strong>!
            </li>
          </ul>
        </div>

        <div>
          <strong>2. Earning &amp; Using Shifts</strong>
          <ul style={{ margin: '4px 0 0', paddingLeft: '18px' }}>
            <li>Every 2 distinct valid words earn <strong>+1 Shift Token</strong> (cap {DEFAULT_ECONOMY.maxShiftTokens}); words of 6+ letters earn an extra <strong>+1 Shift</strong>.</li>
            <li>Tap any red edge arrow (<strong>◀ ▶ ▲ ▼</strong>) around the board to slide that row or column with wraparound.</li>
            <li>Tap <strong>↶ Undo</strong> before submitting a word to reverse uncommitted shifts and refund tokens.</li>
          </ul>
        </div>

        <div>
          <strong>3. Advancing Phases</strong>
          <ul style={{ margin: '4px 0 0', paddingLeft: '18px' }}>
            <li>Once all slots of the target word are populated, earn a <strong>+{DEFAULT_ECONOMY.phaseCompletionBonus} Phase Bonus</strong>.</li>
            <li>3–5 tiles refresh on the 5×5 board and a new hidden target begins!</li>
          </ul>
        </div>
      </div>
    </BottomSheet>
  );
}
