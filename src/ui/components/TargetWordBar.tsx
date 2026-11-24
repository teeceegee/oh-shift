import type { TargetState } from '../../engine';

interface TargetWordBarProps {
  target: TargetState;
  lastPopulatedIndices: readonly number[];
}

export function TargetWordBar({ target, lastPopulatedIndices }: TargetWordBarProps) {
  const populatedCount = target.revealedPositions.filter(Boolean).length;

  return (
    <section className="target-bar" aria-label="Hidden target word progress">
      <div className="section-heading">
        <span>
          Target Word · {target.length} Letters
        </span>
        <span>
          {target.solved
            ? target.solvedDirectly
              ? '★ Spelled Directly!'
              : '✓ Populated!'
            : `${populatedCount}/${target.length} Filled`}
        </span>
      </div>

      <div className="target-slots" role="list" aria-label="Target letter slots">
        {target.revealedPositions.map((isRevealed, idx) => {
          const isNew = lastPopulatedIndices.includes(idx);
          const classes = [
            'target-slot',
            isRevealed ? 'target-slot--filled' : '',
            isNew ? 'target-slot--just-filled' : '',
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <div
              key={idx}
              className={classes}
              role="listitem"
              aria-label={
                isRevealed
                  ? `Position ${idx + 1}: ${target.answer[idx]}`
                  : `Position ${idx + 1}: blank`
              }
            >
              <span className="target-slot-pos" aria-hidden="true">
                {idx + 1}
              </span>
              <span className="target-slot-char">
                {isRevealed ? target.answer[idx] : ''}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
