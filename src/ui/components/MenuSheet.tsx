import { useState } from 'react';
import { DEFAULT_ECONOMY } from '../../engine';
import type { DifficultyPreset, GameMode, GameState } from '../../engine';
import { decodeSaveCode, encodeSaveCode } from '../../storage/db';
import { BottomSheet } from './BottomSheet';

interface MenuSheetProps {
  state: GameState;
  todayKey: string;
  onSwitchMode: (mode: 'solo' | 'daily') => void;
  onStartNewEndless: (difficulty: DifficultyPreset, customSeed?: string) => void;
  onImportState: (imported: GameState) => void;
  onRescueRefresh: () => void;
  onClose: () => void;
}

export function MenuSheet({
  state,
  todayKey,
  onSwitchMode,
  onStartNewEndless,
  onImportState,
  onRescueRefresh,
  onClose,
}: MenuSheetProps) {
  const [difficulty, setDifficulty] = useState<DifficultyPreset>(state.difficulty);
  const [customSeed, setCustomSeed] = useState('');
  const [importText, setImportText] = useState('');
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const handleCopySaveCode = async () => {
    const code = encodeSaveCode(state);
    try {
      await navigator.clipboard.writeText(code);
      setCopyStatus('Save Code copied to clipboard!');
    } catch {
      setCopyStatus('Copy failed — select from the box below.');
    }
  };

  const handleImport = () => {
    const res = decodeSaveCode(importText);
    if (res.error || !res.state) {
      setImportError(res.error ?? 'Invalid Save Code');
      return;
    }
    setImportError(null);
    onImportState(res.state);
    onClose();
  };

  const modeLabel = (m: GameMode) => (m === 'daily' ? 'Daily 5-Phase' : 'Endless Run');

  return (
    <BottomSheet title="Game Menu & Backup" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.9rem' }}>
        {/* Mode Switcher */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div className="section-heading">
            <span>Switch Mode</span>
            <span>Active: {modeLabel(state.mode)}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button
              type="button"
              className={state.mode === 'solo' ? 'btn-primary' : 'btn-secondary'}
              onClick={() => {
                onSwitchMode('solo');
                onClose();
              }}
            >
              Endless Run
            </button>
            <button
              type="button"
              className={state.mode === 'daily' ? 'btn-primary' : 'btn-secondary'}
              onClick={() => {
                onSwitchMode('daily');
                onClose();
              }}
            >
              Daily ({todayKey})
            </button>
          </div>
        </section>

        {/* New Endless Run */}
        <section
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            borderTop: '1px solid var(--border-subtle)',
            paddingTop: '12px',
          }}
        >
          <div className="section-heading">
            <span>Start New Endless Run</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
            {(['relaxed', 'standard', 'expert'] as const).map((preset) => (
              <button
                key={preset}
                type="button"
                className={difficulty === preset ? 'btn-primary' : 'btn-secondary'}
                onClick={() => setDifficulty(preset)}
                style={{ textTransform: 'capitalize' }}
              >
                {preset}
              </button>
            ))}
          </div>

          <input
            type="text"
            value={customSeed}
            onChange={(e) => setCustomSeed(e.target.value)}
            placeholder="Optional seed (leave blank for random)"
            aria-label="Optional custom seed"
            style={{
              minHeight: '44px',
              padding: '0 10px',
              borderRadius: '8px',
              border: '1px solid var(--border-strong)',
              background: 'var(--bg-page)',
              color: 'var(--text-primary)',
              fontSize: '0.88rem',
            }}
          />

          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              onStartNewEndless(difficulty, customSeed.trim() || undefined);
              onClose();
            }}
          >
            Start New Endless Run
          </button>
        </section>

        {/* Manual Rescue Refresh */}
        <section
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            borderTop: '1px solid var(--border-subtle)',
            paddingTop: '12px',
          }}
        >
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            Stuck on a tough board? Refresh 3–5 tiles &amp; gain +1 Shift.
          </div>
          <button
            type="button"
            className="btn-warm"
            onClick={() => {
              onRescueRefresh();
              onClose();
            }}
          >
            Rescue (−{DEFAULT_ECONOMY.rescuePenalty})
          </button>
        </section>

        {/* Portable Save Code Backup (iOS ITP safety / cross-device) */}
        <section
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            borderTop: '1px solid var(--border-subtle)',
            paddingTop: '12px',
          }}
        >
          <div className="section-heading">
            <span>Travel Save Backup (Export / Import)</span>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            Auto-saves to IndexedDB after every move. Copy a Save Code to transfer a run between
            iPhone and iPad or back up before long trips.
          </div>

          <button type="button" className="btn-secondary" onClick={handleCopySaveCode}>
            Copy Save Code
          </button>
          {copyStatus && (
            <div style={{ fontSize: '0.78rem', color: 'var(--accent-primary)', fontWeight: 600 }}>
              {copyStatus}
            </div>
          )}

          <div style={{ display: 'flex', gap: '6px' }}>
            <input
              type="text"
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="Paste OS1:... Save Code"
              aria-label="Paste Save Code to import"
              style={{
                flex: 1,
                minHeight: '44px',
                padding: '0 10px',
                borderRadius: '8px',
                border: '1px solid var(--border-strong)',
                background: 'var(--bg-page)',
                color: 'var(--text-primary)',
                fontSize: '0.82rem',
              }}
            />
            <button
              type="button"
              className="btn-primary"
              disabled={!importText.trim()}
              onClick={handleImport}
            >
              Restore
            </button>
          </div>
          {importError && (
            <div style={{ fontSize: '0.78rem', color: 'var(--accent-warm)', fontWeight: 600 }}>
              {importError}
            </div>
          )}
        </section>
      </div>
    </BottomSheet>
  );
}
