import { useEffect, useMemo, useRef, useState } from 'react';
import { getBundledDictionary } from './data/loadDictionary';
import {
  createDailyGame,
  createNewGame,
  DEFAULT_ECONOMY,
  dispatchAction,
  formatDailyShareSummary,
  getLocalDateKey,
} from './engine';
import type { Coord, GameState, MinMatchLength, ShiftOp } from './engine';
import {
  createEmptyRecords,
  loadGameState,
  loadLifetimeRecords,
  recordGameSnapshot,
  saveGameState,
  type LifetimeRecords,
} from './storage/db';
import { BoardGrid } from './ui/components/BoardGrid';
import { HistorySheet } from './ui/components/HistorySheet';
import { MenuSheet } from './ui/components/MenuSheet';
import { PwaUpdateBanner } from './ui/components/PwaUpdateBanner';
import { RulesSheet } from './ui/components/RulesSheet';
import { SavedWordsList } from './ui/components/SavedWordsList';
import { StatsSheet } from './ui/components/StatsSheet';

interface ToastState {
  text: string;
  tone: 'info' | 'error' | 'bonus';
}

function getInitialTheme(): 'light' | 'dark' {
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

function makeRandomSeed(): string {
  return `run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function App() {
  const dict = useMemo(() => getBundledDictionary(), []);
  const todayKey = useMemo(() => getLocalDateKey(), []);

  const [theme, setTheme] = useState<'light' | 'dark'>(getInitialTheme);
  const [state, setState] = useState<GameState>(() =>
    createNewGame({ seed: 'oh-shift-v3', mode: 'solo', minMatchLength: 4, dict }),
  );
  const [records, setRecords] = useState<LifetimeRecords>(createEmptyRecords);
  const [hydrated, setHydrated] = useState(false);

  // Animation display state for the Flash -> Replace -> Cascade beat
  const [displayBoard, setDisplayBoard] = useState<string[][] | null>(null);
  const [flashingCoords, setFlashingCoords] = useState<Coord[]>([]);
  const [freshCoords, setFreshCoords] = useState<Coord[]>([]);
  const [animating, setAnimating] = useState(false);
  const animTokenRef = useRef(0);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [savedSolo, savedRecords] = await Promise.all([
        loadGameState('solo'),
        loadLifetimeRecords(),
      ]);
      if (cancelled) return;
      if (savedSolo) {
        setState(savedSolo);
      }
      setRecords(savedRecords);
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persistState = (next: GameState) => {
    if (!hydrated) return;
    void saveGameState(next);
    void recordGameSnapshot(next).then(setRecords);
  };

  const resetAnimation = () => {
    animTokenRef.current += 1;
    setDisplayBoard(null);
    setFlashingCoords([]);
    setFreshCoords([]);
    setAnimating(false);
  };

  const handleShift = async (op: ShiftOp) => {
    if (animating || state.dailyComplete) return;

    const res = dispatchAction(state, { type: 'SHIFT', op }, dict);
    if (res.error) {
      setToast({ text: res.error, tone: 'error' });
      return;
    }

    // Fast path: no words matched — instant shift!
    if (res.cascades.length === 0) {
      setState(res.state);
      persistState(res.state);
      return;
    }

    // Play the Flash -> Replace -> Cascade sequence
    const myToken = ++animTokenRef.current;
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const flashMs = reducedMotion ? 160 : 520;
    const popMs = reducedMotion ? 80 : 220;

    setAnimating(true);

    for (const step of res.cascades) {
      if (animTokenRef.current !== myToken) return;

      const wordsLabel = step.matches.map((m) => m.word).join(' + ');
      const comboText = step.stepNumber > 1 ? ` · ${step.stepNumber}× Combo!` : '';
      setToast({
        text: `${wordsLabel} (+${step.stepScore} pts${comboText})`,
        tone: 'bonus',
      });

      // 1. Flash the matched horizontal/vertical tiles
      setFreshCoords([]);
      setDisplayBoard(step.boardBeforeReplace);
      setFlashingCoords(step.matchedCoords);
      await sleep(flashMs);
      if (animTokenRef.current !== myToken) return;

      // 2. Replace matched tiles with fresh letters
      setFlashingCoords([]);
      setDisplayBoard(step.boardAfterReplace);
      setFreshCoords(step.matchedCoords);
      await sleep(popMs);
      if (animTokenRef.current !== myToken) return;
    }

    setDisplayBoard(null);
    setFlashingCoords([]);
    setFreshCoords([]);
    setAnimating(false);
    setState(res.state);
    persistState(res.state);
  };

  const handleUndo = () => {
    if (animating) return;
    const res = dispatchAction(state, { type: 'UNDO_SHIFT' }, dict);
    if (res.error) return;
    setState(res.state);
    persistState(res.state);
  };

  const handleSwitchMode = async (mode: 'solo' | 'daily') => {
    resetAnimation();
    if (mode === 'daily') {
      const savedDaily = await loadGameState(`daily:${todayKey}`);
      const next = savedDaily ?? createDailyGame(todayKey, dict, 4);
      setState(next);
      void saveGameState(next);
      setToast({ text: `Daily ${DEFAULT_ECONOMY.dailyShiftLimit}-Shift Challenge (${todayKey})`, tone: 'info' });
    } else {
      const savedSolo = await loadGameState('solo');
      const next =
        savedSolo ?? createNewGame({ seed: makeRandomSeed(), mode: 'solo', minMatchLength: 4, dict });
      setState(next);
      void saveGameState(next);
      setToast({ text: 'Resumed Endless Board', tone: 'info' });
    }
  };

  const handleStartNewEndless = (minMatchLength: MinMatchLength, customSeed?: string) => {
    resetAnimation();
    const seed = customSeed || makeRandomSeed();
    const fresh = createNewGame({ seed, mode: 'solo', minMatchLength, dict });
    setState(fresh);
    persistState(fresh);
    setToast({
      text: `New ${minMatchLength === 5 ? '5-Letter' : '4 & 5-Letter'} Endless Board`,
      tone: 'info',
    });
  };

  const handleImportState = (imported: GameState) => {
    resetAnimation();
    setState(imported);
    persistState(imported);
    setToast({ text: `Restored saved board (${imported.score} pts)`, tone: 'bonus' });
  };

  const handleShareDaily = async () => {
    const summary = formatDailyShareSummary(state);
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Oh! Shift Daily', text: summary });
      } else {
        await navigator.clipboard.writeText(summary);
        setToast({ text: 'Daily result copied to clipboard!', tone: 'bonus' });
      }
    } catch {
      setToast({ text: 'Could not share result.', tone: 'error' });
    }
  };

  const activeBoard = displayBoard ?? state.board;
  const shiftsRemaining =
    state.mode === 'daily'
      ? Math.max(0, DEFAULT_ECONOMY.dailyShiftLimit - state.shiftsMade)
      : null;

  return (
    <div className="app-shell">
      {/* Top Masthead */}
      <header className="top-header">
        <div className="brand-group">
          <h1 className="brand-title">Oh! Shift</h1>
          <span className="mode-badge">
            {state.mode === 'daily'
              ? `Daily · ${shiftsRemaining} left`
              : state.minMatchLength === 5
                ? '5-Letter'
                : 'Endless'}
          </span>
        </div>

        <div className="header-actions">
          <button
            type="button"
            className="icon-btn"
            onClick={() => setMenuOpen(true)}
            aria-label="Game menu and mode switcher"
          >
            Menu
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={() => setStatsOpen(true)}
            aria-label="Statistics and records"
          >
            Stats
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={() => setHistoryOpen(true)}
            aria-label={`Saved words (${state.savedWords.length})`}
          >
            Words ({state.savedWords.length})
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={() => setRulesOpen(true)}
            aria-label="How to play"
          >
            ?
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
          >
            {theme === 'light' ? '☾' : '☀'}
          </button>
        </div>
      </header>

      <PwaUpdateBanner />

      {/* Clean 3-Card HUD */}
      <section className="hud-strip" aria-label="Game status">
        <div className="hud-card">
          <span className="hud-label">Score</span>
          <span className="hud-value">{state.score}</span>
        </div>
        <div className="hud-card">
          <span className="hud-label">Words</span>
          <span className="hud-value hud-value--insight">{state.stats.totalWordsFound}</span>
        </div>
        <div className="hud-card">
          <span className="hud-label">{state.mode === 'daily' ? 'Shifts Left' : 'Shifts'}</span>
          <span className="hud-value hud-value--shifts">
            {state.mode === 'daily' ? shiftsRemaining : state.shiftsMade}
          </span>
        </div>
      </section>

      {/* Daily Challenge Complete Banner */}
      {state.dailyComplete && (
        <section className="phase-complete-card" aria-label="Daily challenge summary">
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.96rem' }}>
              Daily Complete! — {state.score} pts
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {state.stats.totalWordsFound} words · {state.stats.fiveLetterWords} five-letter · Best
              Combo {state.stats.bestCombo}×
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button type="button" className="btn-primary" onClick={handleShareDaily}>
              Share Result
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => void handleSwitchMode('solo')}
            >
              Play Endless
            </button>
          </div>
        </section>
      )}

      {/* Main Responsive Play Area */}
      <main className="play-layout">
        <div className="board-column">
          {/* 5x5 Tactile Grid with Unlimited Direct Edge Shift Arrows */}
          <BoardGrid
            board={activeBoard}
            flashingCoords={flashingCoords}
            freshCoords={freshCoords}
            disabled={animating || state.dailyComplete}
            onShift={(op) => void handleShift(op)}
          />

          {/* Compact Status & Undo Strip */}
          <div className="action-strip">
            <div style={{ flex: 1 }}>
              {toast ? (
                <div
                  className={`toast-banner ${
                    toast.tone === 'error'
                      ? 'toast-banner--error'
                      : toast.tone === 'bonus'
                        ? 'toast-banner--bonus'
                        : ''
                  }`}
                  role="status"
                  aria-live="polite"
                >
                  {toast.text}
                </div>
              ) : (
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Slide rows or columns to form {state.minMatchLength === 5 ? '5-letter' : '4 or 5-letter'} words (→ or ↓)
                </span>
              )}
            </div>

            {state.lastShiftUndoable && !animating && (
              <button type="button" className="undo-btn" onClick={handleUndo}>
                ↶ Undo
              </button>
            )}
          </div>

          {/* Saved Words (Portrait Mobile) */}
          <div className="mobile-probes-wrap">
            <SavedWordsList words={state.savedWords} maxVisible={18} />
          </div>
        </div>

        {/* Right Column (iPad Landscape & Desktop): Saved Words Collection */}
        <aside className="side-column" aria-label="Saved words collection">
          <SavedWordsList words={state.savedWords} maxVisible={40} />
        </aside>
      </main>

      {menuOpen && (
        <MenuSheet
          state={state}
          todayKey={todayKey}
          onSwitchMode={(m) => void handleSwitchMode(m)}
          onStartNewEndless={handleStartNewEndless}
          onImportState={handleImportState}
          onClose={() => setMenuOpen(false)}
        />
      )}

      {statsOpen && (
        <StatsSheet state={state} records={records} onClose={() => setStatsOpen(false)} />
      )}

      {historyOpen && (
        <HistorySheet words={state.savedWords} onClose={() => setHistoryOpen(false)} />
      )}

      {rulesOpen && <RulesSheet onClose={() => setRulesOpen(false)} />}
    </div>
  );
}
