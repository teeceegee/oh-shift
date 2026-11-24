import { BottomSheet } from './BottomSheet';

interface HistorySheetProps {
  phase: number;
  foundWords: readonly string[];
  onClose: () => void;
}

export function HistorySheet({ phase, foundWords, onClose }: HistorySheetProps) {
  return (
    <BottomSheet title={`Phase ${phase} Words (${foundWords.length})`} onClose={onClose}>
      {foundWords.length === 0 ? (
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          No board words found yet in Phase {phase}. Tap or drag adjacent letters on the 5×5 board
          to start earning Shifts and Insight.
        </p>
      ) : (
        <div className="word-history-list">
          {foundWords.map((word) => (
            <span key={word} className="word-pill">
              {word} <small style={{ color: 'var(--text-muted)' }}>+{word.length * word.length}</small>
            </span>
          ))}
        </div>
      )}
    </BottomSheet>
  );
}
