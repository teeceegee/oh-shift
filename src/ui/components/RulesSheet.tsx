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
          <strong>Simple, pacy slide-and-match wordplay:</strong> shift rows and columns to line up
          UK English words horizontally (left → right) or vertically (top → bottom).
        </p>

        <div>
          <strong>1. Unlimited Shifts</strong>
          <ul style={{ margin: '4px 0 0', paddingLeft: '18px' }}>
            <li>Tap any edge arrow (<strong>◀ ▶ ▲ ▼</strong>) to slide that row or column with wraparound.</li>
            <li>No shift limits in Endless mode — experiment freely!</li>
            <li>Tap <strong>↶ Undo</strong> if your last shift didn’t match a word and you want to step back.</li>
          </ul>
        </div>

        <div>
          <strong>2. Automatic Word Spotting &amp; Cascades</strong>
          <ul style={{ margin: '4px 0 0', paddingLeft: '18px' }}>
            <li>
              Whenever a <strong>4-letter (+{DEFAULT_ECONOMY.scoreFourLetter} pts)</strong> or{' '}
              <strong>5-letter (+{DEFAULT_ECONOMY.scoreFiveLetter} pts)</strong> common UK English
              word forms horizontally or vertically, the tiles automatically flash green, the word
              is saved, and fresh letters pop into their place.
            </li>
            <li>
              If the fresh letters immediately form another word, you score a{' '}
              <strong>Chain Combo (2×, 3×…)</strong>!
            </li>
            <li>
              Want a tougher puzzle? Switch to <strong>5 Letters Only</strong> in the Menu.
            </li>
          </ul>
        </div>

        <div>
          <strong>3. Daily 25-Shift Challenge</strong>
          <ul style={{ margin: '4px 0 0', paddingLeft: '18px' }}>
            <li>Everyone starts with the same daily board and letter stream — see how high you can score in {DEFAULT_ECONOMY.dailyShiftLimit} shifts!</li>
          </ul>
        </div>
      </div>
    </BottomSheet>
  );
}
