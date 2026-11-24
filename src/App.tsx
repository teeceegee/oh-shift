import { useEffect, useMemo, useState } from 'react';
import { getBundledDictionary } from './data/loadDictionary';
import {
  createDailyGame,
  createNewGame,
  DEFAULT_ECONOMY,
  dispatchAction,
  formatDailyShareSummary,
  getLocalDateKey,
  getMilestoneLabel,
  isBoardDeadlocked,
  isPhaseReadyToAdvance,
} from './engine';
import type { Coord, DifficultyPreset, GameAction, GameState, ShiftOp } from './engine';
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
import { ProbeHistory } from './ui/components/ProbeHistory';
import { PwaUpdateBanner } from './ui/components/PwaUpdateBanner';
import { RulesSheet } from './ui/components/RulesSheet';
import { StatsSheet } from './ui/components/StatsSheet';
import { TargetWordBar } from './ui/components/TargetWordBar';

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

export function App() {
  const dict = useMemo(() => getBundledDictionary(), []);
  const todayKey = useMemo(() => getLocalDateKey(), []);

  const [theme, setTheme] = useState<'light' | 'dark'>(getInitialTheme);
  const [state, setState] = useState<GameState>(() =>
    createNewGame({ seed: 'oh-shift-solo-v2', mode: 'solo', difficulty: 'standard', dict }),
  );
  const [records, setRecords] = useState<LifetimeRecords>(createEmptyRecords);
  const [hydrated, setHydrated] = useState(false);

  const [selectedPath, setSelectedPath] = useState<Coord[]>([]);
  const [lastPopulatedIndices, setLastPopulatedIndices] = useState<number[]>([]);
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

  const deadlocked = useMemo(() => isBoardDeadlocked(state, dict), [state, dict]);
  const phaseReady = useMemo(() => isPhaseReadyToAdvance(state), [state]);
  const previewWord = selectedPath.map(({ row, col }) => state.board[row][col]).join('');
  const populatedCount = state.target.revealedPositions.filter(Boolean).length;

  const runAction = (action: GameAction): boolean => {
    const res = dispatchAction(state, action, dict);
    if (res.error) {
      setToast({ text: res.error, tone: 'error' });
      return false;
    }

    setState(res.state);
    persistState(res.state);

    for (const ev of res.events) {
      if (ev.type === 'TARGET_SOLVED') {
        setToast({
          text: ev.direct
            ? `Direct Solve! "${ev.word}" (+${ev.bonusScore} pts, +${ev.bonusShifts} Shift)`
            : `Target Populated! "${ev.word}" (+${ev.bonusScore} pts)`,
          tone: 'bonus',
        });
      } else if (ev.type === 'WORD_ACCEPTED') {
        setLastPopulatedIndices(ev.newlyPopulatedIndices);
        const parts = [`+${ev.scoreDelta} pts`];
        if (ev.newlyPopulatedIndices.length > 0) {
          parts.push(
            `locked ${ev.newlyPopulatedIndices.length} target ${
              ev.newlyPopulatedIndices.length === 1 ? 'letter' : 'letters'
            }!`,
          );
        }
        if (ev.shiftsEarned > 0) {
          parts.push(`+${ev.shiftsEarned} Shift`);
        }
        setToast({
          text: `"${ev.word}" — ${parts.join(' · ')}`,
          tone: ev.newlyPopulatedIndices.length > 0 ? 'bonus' : 'info',
        });
      } else if (ev.type === 'RESCUE_APPLIED') {
        setToast({
          text: `Board refreshed (${ev.replacedCount} tiles, +1 Shift, −${ev.penalty} pts)`,
          tone: 'info',
        });
      } else if (ev.type === 'PHASE_ADVANCED') {
        setLastPopulatedIndices([]);
        const milestone = getMilestoneLabel(res.state.stats.phasesCleared);
        setToast({
          text: ev.dailyComplete
            ? `Daily Challenge Complete! (+${ev.phaseBonus} pts)`
            : milestone
              ? `${milestone} Welcome to Phase ${ev.newPhase}!`
              : `Welcome to Phase ${ev.newPhase}! (+${ev.phaseBonus} phase bonus)`,
          tone: 'bonus',
        });
      }
    }
    return true;
  };

  const handleSwitchMode = async (mode: 'solo' | 'daily') => {
    setSelectedPath([]);
    setLastPopulatedIndices([]);
    if (mode === 'daily') {
      const savedDaily = await loadGameState(`daily:${todayKey}`);
      const next = savedDaily ?? createDailyGame(todayKey, dict);
      setState(next);
      void saveGameState(next);
      setToast({ text: `Daily 5-Phase Challenge (${todayKey})`, tone: 'info' });
    } else {
      const savedSolo = await loadGameState('solo');
      const next =
        savedSolo ?? createNewGame({ seed: makeRandomSeed(), mode: 'solo', difficulty: 'standard', dict });
      setState(next);
      void saveGameState(next);
      setToast({ text: `Resumed Endless Run (Phase ${next.phase})`, tone: 'info' });
    }
  };

  const handleStartNewEndless = (difficulty: DifficultyPreset, customSeed?: string) => {
    setSelectedPath([]);
    setLastPopulatedIndices([]);
    const seed = customSeed || makeRandomSeed();
    const fresh = createNewGame({ seed, mode: 'solo', difficulty, dict });
    setState(fresh);
    persistState(fresh);
    setToast({ text: `Started new ${difficulty} Endless Run`, tone: 'info' });
  };

  const handleImportState = (imported: GameState) => {
    setSelectedPath([]);
    setLastPopulatedIndices([]);
    setState(imported);
    persistState(imported);
    setToast({ text: `Restored saved run (Phase ${imported.phase}, ${imported.score} pts)`, tone: 'bonus' });
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
      setToast({ text: 'Could not share — try copying from Statistics.', tone: 'error' });
    }
  };

  const handleSubmitWord = () => {
    if (selectedPath.length === 0) return;
    const ok = runAction({ type: 'SUBMIT_WORD', path: selectedPath });
    if (ok) {
      setSelectedPath([]);
    }
  };

  const handleShift = (op: ShiftOp) => {
    setSelectedPath([]);
    runAction({ type: 'SHIFT', op });
  };

  return (
    <div className="app-shell">
      {/* Top Masthead */}
      <header className="top-header">
        <div className="brand-group">
          <h1 className="brand-title">Oh! Shift</h1>
          <span className="mode-badge">
            {state.mode === 'daily' ? `Daily · P${state.phase}/5` : `Phase ${state.phase}`}
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
            aria-label={`Word history (${state.foundWords.length} words)`}
          >
            Words ({state.foundWords.length})
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

      {/* Clean 3-Card HUD (Score, Shifts, Target Progress — no Insight) */}
      <section className="hud-strip" aria-label="Game status">
        <div className="hud-card">
          <span className="hud-label">Score</span>
          <span className="hud-value">{state.score}</span>
        </div>
        <div className="hud-card">
          <span className="hud-label">Shifts</span>
          <span className="hud-value hud-value--shifts">
            {state.shiftTokens}/{DEFAULT_ECONOMY.maxShiftTokens}
          </span>
        </div>
        <div className="hud-card">
          <span className="hud-label">Target</span>
          <span className="hud-value hud-value--insight">
            {populatedCount}/{state.target.length}
          </span>
        </div>
      </section>

      {/* Daily Challenge Complete Summary Banner */}
      {state.dailyComplete && (
        <section className="phase-complete-card" aria-label="Daily challenge summary">
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.96rem' }}>
              Daily Challenge Complete! — {state.score} pts
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {state.stats.targetsSolved} targets populated · {state.stats.directSolves} Direct
              Solves · {state.stats.totalWordsFound} words
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

      {/* Main Responsive Unified Play Area */}
      <main className="play-layout">
        <div className="board-column">
          {/* Single Prominent Target Word Slots */}
          <TargetWordBar target={state.target} lastPopulatedIndices={lastPopulatedIndices} />

          {/* Phase Complete Advance Banner */}
          {phaseReady && !state.dailyComplete && (
            <div className="phase-complete-card">
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>
                  "{state.target.answer}" Complete!
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  {state.mode === 'daily' && state.phase >= DEFAULT_ECONOMY.dailyPhaseCount
                    ? 'Finish today’s Daily Challenge and claim your summary!'
                    : `3–5 tiles will refresh for Phase ${state.phase + 1}.`}
                </div>
              </div>
              <button
                type="button"
                className="btn-primary"
                onClick={() => runAction({ type: 'ADVANCE_PHASE' })}
              >
                {state.mode === 'daily' && state.phase >= DEFAULT_ECONOMY.dailyPhaseCount
                  ? 'Finish Daily ★'
                  : 'Next Phase →'}
              </button>
            </div>
          )}

          {/* 5x5 Tactile Grid with Direct Edge Shift Arrows */}
          <BoardGrid
            board={state.board}
            selectedPath={selectedPath}
            shiftTokens={state.shiftTokens}
            disabled={state.dailyComplete}
            onPathChange={setSelectedPath}
            onShift={handleShift}
          />

          {/* Word Preview Bar + Inline Shift Undo */}
          <div className="word-bar">
            <div
              className={`word-preview ${previewWord ? '' : 'word-preview--empty'}`}
              aria-live="polite"
            >
              {previewWord || 'Tap or drag letters · arrows shift rows/cols'}
            </div>
            {state.uncommittedShifts.length > 0 && selectedPath.length === 0 && (
              <button
                type="button"
                className="undo-btn"
                onClick={() => runAction({ type: 'UNDO_SHIFT' })}
              >
                ↶ Undo ({state.uncommittedShifts.length})
              </button>
            )}
            {selectedPath.length > 0 && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setSelectedPath([])}
              >
                Clear
              </button>
            )}
            <button
              type="button"
              className="btn-primary"
              disabled={previewWord.length < DEFAULT_ECONOMY.minWordLength || state.dailyComplete}
              onClick={handleSubmitWord}
            >
              Submit
            </button>
          </div>

          {/* Live Feedback Toast */}
          {toast && (
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
          )}

          {/* Deadlock Rescue Prompt */}
          {deadlocked && !state.dailyComplete && (
            <div className="phase-complete-card" style={{ borderColor: 'var(--accent-warm)' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                No shifts or board words left. Refresh board?
              </span>
              <button
                type="button"
                className="btn-warm"
                onClick={() => runAction({ type: 'RESCUE_REFRESH' })}
              >
                Rescue (−{DEFAULT_ECONOMY.rescuePenalty} pts)
              </button>
            </div>
          )}

          {/* Recent Word Probes (Portrait Mobile) */}
          <div className="mobile-probes-wrap">
            <ProbeHistory probes={state.probeHistory} maxVisible={5} />
          </div>
        </div>

        {/* Right Column (iPad Landscape & Desktop): Live Board Word Probes */}
        <aside className="side-column" aria-label="Board word feedback log">
          <ProbeHistory probes={state.probeHistory} maxVisible={14} />
        </aside>
      </main>

      {menuOpen && (
        <MenuSheet
          state={state}
          todayKey={todayKey}
          onSwitchMode={(m) => void handleSwitchMode(m)}
          onStartNewEndless={handleStartNewEndless}
          onImportState={handleImportState}
          onRescueRefresh={() => runAction({ type: 'RESCUE_REFRESH' })}
          onClose={() => setMenuOpen(false)}
        />
      )}

      {statsOpen && (
        <StatsSheet state={state} records={records} onClose={() => setStatsOpen(false)} />
      )}

      {historyOpen && (
        <HistorySheet
          phase={state.phase}
          probes={state.probeHistory}
          onClose={() => setHistoryOpen(false)}
        />
      )}

      {rulesOpen && <RulesSheet onClose={() => setRulesOpen(false)} />}
    </div>
  );
}
