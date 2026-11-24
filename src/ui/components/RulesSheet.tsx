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
          <strong>Core Loop:</strong> Find words on the 5×5 board to earn{' '}
          <strong>Shift Tokens</strong> and <strong>Insight Points</strong>, shift rows or columns
          with wraparound, and deduce the <strong>3 hidden target words</strong> to advance each
          phase.
        </p>

        <div>
          <strong>1. Finding Board Words</strong>
          <ul style={{ margin: '4px 0 0', paddingLeft: '18px' }}>
            <li>Tap or drag across 3+ adjacent tiles (including diagonals). Tiles cannot be reused in one word.</li>
            <li>Every 2 distinct valid words earn <strong>+1 Shift Token</strong> (cap {DEFAULT_ECONOMY.maxShiftTokens}).</li>
            <li>Words of 6+ letters earn an extra <strong>+1 Shift Token</strong> and <strong>+2 Insight</strong>.</li>
            <li>Letters stay on the board; each word scores <code>length²</code> points once per phase.</li>
          </ul>
        </div>

        <div>
          <strong>2. Shifting Rows &amp; Columns</strong>
          <ul style={{ margin: '4px 0 0', paddingLeft: '18px' }}>
            <li>Switch to <strong>Shift</strong> mode to slide any row left/right or column up/down with wraparound.</li>
            <li>Uncommitted shifts can be undone step-by-step for a full token refund before submitting a word or guess.</li>
          </ul>
        </div>

        <div>
          <strong>3. Board-Grounded Hybrid Deduction</strong>
          <ul style={{ margin: '4px 0 0', paddingLeft: '18px' }}>
            <li>Every hidden target uses letters currently on the 5×5 board (dimmed keys are not on the board).</li>
            <li>Each target has <strong>{DEFAULT_ECONOMY.baseMaxGuesses} free guesses</strong> with colour-independent feedback: <strong>✓</strong> Exact, <strong>↔</strong> Misplaced, <strong>×</strong> Absent.</li>
            <li>Spend <strong>{DEFAULT_ECONOMY.clueCost} Insight</strong> to unlock verified clues.</li>
            <li><strong>Board Construction Bonus:</strong> Shift and physically spell a hidden target on the board to solve it instantly for <strong>+{DEFAULT_ECONOMY.boardConstructionBonusScore} pts &amp; +{DEFAULT_ECONOMY.boardConstructionBonusShifts} Shift</strong>!</li>
          </ul>
        </div>
      </div>
    </BottomSheet>
  );
}
