import type { SavedWordRecord } from '../../engine';

interface SavedWordsListProps {
  words: readonly SavedWordRecord[];
  maxVisible?: number;
}

export function SavedWordsList({ words, maxVisible = 16 }: SavedWordsListProps) {
  const visible = words.slice(0, maxVisible);

  return (
    <section className="saved-words-section" aria-label="Saved words">
      <div className="section-heading">
        <span>Saved Words ({words.length})</span>
        <span>Tap first letter to claim</span>
      </div>

      {visible.length === 0 ? (
        <p className="probe-empty">
          Slide rows or columns with the edge arrows, then tap the <strong>first letter</strong> of
          any horizontal (→) or vertical (↓) word to claim it!
        </p>
      ) : (
        <div className="saved-words-grid">
          {visible.map((item) => (
            <div
              key={item.id}
              className={`saved-word-chip ${
                item.word.length === 5 ? 'saved-word-chip--five' : ''
              }`}
            >
              <span className="saved-word-text">{item.word}</span>
              <span className="saved-word-meta">
                +{item.score}
                {item.crossBonus ? ' ★' : ''}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
