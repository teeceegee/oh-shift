import { useState } from 'react';
import { DEFAULT_ECONOMY } from '../../engine';
import type { GameMode, GameState, MinMatchLength } from '../../engine';
import { decodeSaveCode, encodeSaveCode } from '../../storage/db';
import { BottomSheet } from './BottomSheet';

interface MenuSheetProps {
  state: GameState;
  todayKey: string;
  onSwitchMode: (mode: 'solo' | 'daily') => void;
  onStartNewEndless: (minMatchLength: MinMatchLength, customSeed?: string) => void;
  onImportState: (imported: GameState) => void;
  onClose: () => void;
}

export function MenuSheet({
  state,
  todayKey,
  onSwitchMode,
  onStartNewEndless,
  onImportState,
  onClose,
}: MenuSheetProps) {
  const [minLen, setMinLen] = useState<MinMatchLength>(state.minMatchLength);
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
      setCopyStatus('Copy failed — try again.');
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

  const modeLabel = (m: GameMode) =>
    m === 'daily' ? `Daily (${DEFAULT_ECONOMY.dailyShiftLimit} Shifts)` : 'Endless';

  return (
    <BottomSheet title="Game Menu & Backup" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.9rem' }}>
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
              Endless (Unlimited)
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
            <span>Start New Endless Board</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            <button
              type="button"
              className={minLen === 4 ? 'btn-primary' : 'btn-secondary'}
              onClick={() => setMinLen(4)}
            >
              4 &amp; 5 Letters (Pacy)
            </button>
            <button
              type="button"
              className={minLen === 5 ? 'btn-primary' : 'btn-secondary'}
              onClick={() => setMinLen(5)}
            >
              5 Letters Only (Hard)
            </button>
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
              onStartNewEndless(minLen, customSeed.trim() || undefined);
              onClose();
            }}
          >
            Start New Board
          </button>
        </section>

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
            <span>Travel Save Backup</span>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            Auto-saves to IndexedDB after every shift. Export an <code>OS3:</code> Save Code to
            transfer between iPhone and iPad.
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
              placeholder="Paste OS3:... Save Code"
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
