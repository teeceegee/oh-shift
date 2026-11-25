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
          <strong>Deliberate, pacy 5×5 word-shifting:</strong> slide rows and columns to line up
          UK English words horizontally (left → right) or vertically (top → bottom), then{' '}
          <strong>tap the first letter</strong> to claim the word.
        </p>

        <div>
          <strong>1. Unlimited Shifts</strong>
          <ul style={{ margin: '4px 0 0', paddingLeft: '18px' }}>
            <li>Tap any red edge arrow (<strong>◀ ▶ ▲ ▼</strong>) to slide that row or column with wraparound.</li>
            <li>Nothing fires accidentally while you shift — take as many shifts as you need to line up the exact word you want!</li>
            <li>Tap <strong>↶ Undo</strong> to step back your last shift.</li>
          </ul>
        </div>

        <div>
          <strong>2. One-Tap Word Claiming</strong>
          <ul style={{ margin: '4px 0 0', paddingLeft: '18px' }}>
            <li>
              Tap the <strong>first letter</strong> of any horizontal (→) or vertical (↓) word. The
              longest valid word starting on that tile flashes green, saves to your collection, and
              is replaced by fresh letters.
            </li>
            <li>
              <strong>Scoring:</strong> 3-letter (+{DEFAULT_ECONOMY.scoreThreeLetter}), 4-letter (+
              {DEFAULT_ECONOMY.scoreFourLetter}), 5-letter (+{DEFAULT_ECONOMY.scoreFiveLetter}).
            </li>
            <li>
              <strong>Cross-Word Bonus (+{DEFAULT_ECONOMY.crossWordBonus} pts):</strong> If a single
              starting letter begins <em>both</em> a horizontal and a vertical word, tapping it
              claims both at once!
            </li>
          </ul>
        </div>

        <div>
          <strong>3. Daily 25-Shift Challenge</strong>
          <ul style={{ margin: '4px 0 0', paddingLeft: '18px' }}>
            <li>Everyone starts with the same daily board — see how high you can score in {DEFAULT_ECONOMY.dailyShiftLimit} shifts!</li>
          </ul>
        </div>
      </div>
    </BottomSheet>
  );
}
