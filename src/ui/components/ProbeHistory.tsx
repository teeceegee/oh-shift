import type { LetterFeedback, WordProbeRecord } from '../../engine';

interface ProbeHistoryProps {
  probes: readonly WordProbeRecord[];
  maxVisible?: number;
}

const FEEDBACK_SYMBOL: Record<LetterFeedback, string> = {
  exact: '✓',
  present: '↔',
  absent: '×',
};

export function ProbeHistory({ probes, maxVisible = 6 }: ProbeHistoryProps) {
  const visible = probes.slice(0, maxVisible);

  return (
    <section className="probe-history" aria-label="Word probes and feedback">
      <div className="section-heading">
        <span>Board Words ({probes.length})</span>
        <span>✓ Right spot · ↔ In word · × Absent</span>
      </div>

      {visible.length === 0 ? (
        <p className="probe-empty">
          Spell words on the 5×5 board. Any letter matching the same position in the target word
          locks in automatically!
        </p>
      ) : (
        <div className="probe-list">
          {visible.map((probe) => (
            <div key={probe.word} className="probe-row">
              <div className="probe-tiles">
                {probe.word.split('').map((ch, idx) => {
                  const fb = probe.feedback[idx] ?? 'absent';
                  return (
                    <span
                      key={idx}
                      className={`probe-tile probe-tile--${fb}`}
                      aria-label={`${ch}, position ${idx + 1}, ${fb}`}
                    >
                      <span>{ch}</span>
                      <span className="probe-symbol" aria-hidden="true">
                        {FEEDBACK_SYMBOL[fb]}
                      </span>
                    </span>
                  );
                })}
              </div>
              <span className="probe-score">+{probe.score}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
