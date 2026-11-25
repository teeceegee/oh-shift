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
            <span>Current Run ({state.mode === 'daily' ? 'Daily' : `${state.minMatchLength}+ letters`})</span>
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
              <span className="hud-label">5-Letter ★</span>
              <span className="hud-value hud-value--shifts">{state.stats.fiveLetterWords}</span>
            </div>
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
            <span>Shifts: <strong>{state.shiftsMade}</strong></span>
            <span>Unique: <strong>{state.stats.uniqueWordsCount}</strong></span>
            <span>Crosses: <strong>{state.stats.crossWordsFound}</strong></span>
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
              <span className="hud-label">Best Daily</span>
              <span className="hud-value">{records.bestDailyScore}</span>
            </div>
            <div className="hud-card">
              <span className="hud-label">Crosses ★</span>
              <span className="hud-value">{records.totalCrossWordsEver}</span>
            </div>
          </div>
        </section>
      </div>
    </BottomSheet>
  );
}
