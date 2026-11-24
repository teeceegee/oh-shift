import type { GameState } from '../../engine';
import type { LifetimeRecords } from '../../storage/db';
import { BottomSheet } from './BottomSheet';

interface StatsSheetProps {
  state: GameState;
  records: LifetimeRecords;
  onClose: () => void;
}

export function StatsSheet({ state, records, onClose }: StatsSheetProps) {
  return (
    <BottomSheet title="Statistics & Records" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <section style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div className="section-heading">
            <span>Current Run ({state.mode === 'daily' ? 'Daily' : state.difficulty})</span>
            <span>Seed: {state.seed}</span>
          </div>
          <div className="hud-strip">
            <div className="hud-card">
              <span className="hud-label">Score</span>
              <span className="hud-value">{state.score}</span>
            </div>
            <div className="hud-card">
              <span className="hud-label">Words</span>
              <span className="hud-value">{state.stats.totalWordsFound}</span>
            </div>
            <div className="hud-card">
              <span className="hud-label">Solved</span>
              <span className="hud-value">{state.stats.targetsSolved}</span>
            </div>
            <div className="hud-card">
              <span className="hud-label">Direct ★</span>
              <span className="hud-value hud-value--shifts">
                {state.stats.directSolves}
              </span>
            </div>
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
            <span>Longest word: <strong>{state.stats.longestWord || '—'}</strong></span>
            <span>Shifts spent: <strong>{state.stats.shiftsSpent}</strong></span>
            <span>Phases: <strong>{state.stats.phasesCleared}</strong></span>
          </div>
        </section>

        <section
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            borderTop: '1px solid var(--border-subtle)',
            paddingTop: '12px',
          }}
        >
          <div className="section-heading">
            <span>Lifetime Records</span>
          </div>
          <div className="hud-strip">
            <div className="hud-card">
              <span className="hud-label">Best Endless</span>
              <span className="hud-value">{records.bestEndlessScore}</span>
            </div>
            <div className="hud-card">
              <span className="hud-label">Max Phase</span>
              <span className="hud-value">{records.highestPhaseReached}</span>
            </div>
            <div className="hud-card">
              <span className="hud-label">Dailies</span>
              <span className="hud-value">{records.dailiesCompleted.length}</span>
            </div>
            <div className="hud-card">
              <span className="hud-label">Longest</span>
              <span className="hud-value" style={{ fontSize: '0.82rem' }}>
                {records.longestWordEver || '—'}
              </span>
            </div>
          </div>
        </section>

        {records.recentRuns.length > 0 && (
          <section
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '12px',
            }}
          >
            <div className="section-heading">
              <span>Recent Runs</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {records.recentRuns.slice(0, 6).map((run) => (
                <div
                  key={run.gameId}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '6px 10px',
                    borderRadius: '8px',
                    background: 'var(--bg-page)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '0.8rem',
                  }}
                >
                  <span>
                    <strong>{run.mode === 'daily' ? 'Daily' : `Endless (${run.difficulty})`}</strong>{' '}
                    · {run.phasesCleared}p
                  </span>
                  <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
                    {run.score} pts · {run.wordsFound}w
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </BottomSheet>
  );
}
