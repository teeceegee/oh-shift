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
        <span>H / V auto-spotted</span>
      </div>

      {visible.length === 0 ? (
        <p className="probe-empty">
          Tap any red arrow to slide a row or column. Line up a horizontal or vertical word and it
          will flash, save here, and replace with fresh letters!
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
                {item.combo > 1 ? ` · ${item.combo}×` : ''}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
