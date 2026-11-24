import { useEffect, useMemo, useState } from 'react';
import { getBundledDictionary } from './data/loadDictionary';
import {
  createNewGame,
  DEFAULT_ECONOMY,
  dispatchAction,
  getBoardLetterCounts,
  isBoardDeadlocked,
  isPhaseReadyToAdvance,
} from './engine';
import type { Coord, GameAction, GameState, ShiftAxis, ShiftOp } from './engine';
import { BoardGrid } from './ui/components/BoardGrid';
import { BottomSheet } from './ui/components/BottomSheet';
import { DeductionPanel } from './ui/components/DeductionPanel';
import { HistorySheet } from './ui/components/HistorySheet';
import { RulesSheet } from './ui/components/RulesSheet';
import { ShiftTray } from './ui/components/ShiftTray';

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

export function App() {
  const dict = useMemo(() => getBundledDictionary(), []);

  const [theme, setTheme] = useState<'light' | 'dark'>(getInitialTheme);
  const [state, setState] = useState<GameState>(() =>
    createNewGame({ seed: 'oh-shift-solo-1', mode: 'solo', difficulty: 'standard', dict }),
  );

  const [interactionMode, setInteractionMode] = useState<'spell' | 'shift'>('spell');
  const [selectedPath, setSelectedPath] = useState<Coord[]>([]);
  const [activeShiftAxis, setActiveShiftAxis] = useState<ShiftAxis>('row');
  const [activeShiftIndex, setActiveShiftIndex] = useState<number>(0);

  const [activeTargetId, setActiveTargetId] = useState<string>(state.targets[0]?.id ?? '');
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  // Sync theme attribute on document root
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // Ensure activeTargetId stays valid after phase transitions
  useEffect(() => {
    if (!state.targets.some((t) => t.id === activeTargetId) && state.targets.length > 0) {
      setActiveTargetId(state.targets[0].id);
    }
  }, [state.targets, activeTargetId]);

  const boardLetters = useMemo(() => getBoardLetterCounts(state.board), [state.board]);
  const deadlocked = useMemo(() => isBoardDeadlocked(state, dict), [state, dict]);
  const phaseReady = useMemo(() => isPhaseReadyToAdvance(state), [state]);

  const previewWord = selectedPath.map(({ row, col }) => state.board[row][col]).join('');
  const activeTargetIndex = Math.max(
    0,
    state.targets.findIndex((t) => t.id === activeTargetId),
  );
  const activeTarget = state.targets[activeTargetIndex] ?? state.targets[0];

  const runAction = (action: GameAction): boolean => {
    const res = dispatchAction(state, action, dict);
    if (res.error) {
      setToast({ text: res.error, tone: 'error' });
      return false;
    }

    setState(res.state);

    for (const ev of res.events) {
      if (ev.type === 'TARGET_SOLVED_ON_BOARD') {
        setToast({
          text: `Board Construction Bonus! "${ev.word}" solved (+${ev.bonusScore} pts, +${ev.bonusShifts} Shift)`,
          tone: 'bonus',
        });
      } else if (ev.type === 'WORD_ACCEPTED') {
        const extras = [
          `+${ev.scoreDelta} pts`,
          `+${ev.insightEarned} Insight`,
          ev.shiftsEarned > 0 ? `+${ev.shiftsEarned} Shift` : '',
        ]
          .filter(Boolean)
          .join(' · ');
        setToast({ text: `"${ev.word}" — ${extras}`, tone: 'info' });
      } else if (ev.type === 'GUESS_EVALUATED' && ev.solved) {
        setToast({ text: `Target solved! "${ev.word}" (+${ev.scoreDelta} pts)`, tone: 'bonus' });
      } else if (ev.type === 'CLUE_UNLOCKED') {
        setToast({ text: `Clue unlocked: ${ev.clue.text}`, tone: 'info' });
      } else if (ev.type === 'RESCUE_APPLIED') {
        setToast({
          text: `Board refreshed (${ev.replacedCount} tiles, +1 Shift, −${ev.penalty} pts)`,
          tone: 'info',
        });
      } else if (ev.type === 'PHASE_ADVANCED') {
        setToast({
          text: ev.dailyComplete
            ? `Daily Challenge Complete! (+${ev.phaseBonus} pts)`
            : `Welcome to Phase ${ev.newPhase}! (+${ev.phaseBonus} phase bonus)`,
          tone: 'bonus',
        });
      }
    }
    return true;
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
    setActiveShiftAxis(op.axis);
    setActiveShiftIndex(op.index);
    runAction({ type: 'SHIFT', op });
  };

  const handleSelectTargetChip = (targetId: string) => {
    setActiveTargetId(targetId);
    if (window.innerWidth < 900) {
      setMobileDrawerOpen(true);
    }
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
            Rules
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

      {/* HUD Strip */}
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
          <span className="hud-label">Insight</span>
          <span className="hud-value hud-value--insight">{state.insightPoints}</span>
        </div>
        <div className="hud-card">
          <span className="hud-label">Targets</span>
          <span className="hud-value">
            {state.targets.filter((t) => t.status !== 'active').length}/{state.targets.length}
          </span>
        </div>
      </section>

      {/* Main Responsive Play Area */}
      <main className="play-layout">
        {/* Left / Primary Column: Board, Controls & Target Chips */}
        <div className="board-column">
          {/* Mode Toggle + Undo Shift */}
          <div className="mode-bar">
            <div className="segmented" role="group" aria-label="Board interaction mode">
              <button
                type="button"
                className="segmented-btn"
                aria-pressed={interactionMode === 'spell'}
                onClick={() => setInteractionMode('spell')}
              >
                Spell Words
              </button>
              <button
                type="button"
                className="segmented-btn"
                aria-pressed={interactionMode === 'shift'}
                onClick={() => {
                  setSelectedPath([]);
                  setInteractionMode('shift');
                }}
              >
                Shift Board ({state.shiftTokens})
              </button>
            </div>

            {state.uncommittedShifts.length > 0 && (
              <button
                type="button"
                className="undo-btn"
                onClick={() => runAction({ type: 'UNDO_SHIFT' })}
              >
                ↶ Undo ({state.uncommittedShifts.length})
              </button>
            )}
          </div>

          {/* 5x5 Tactile Grid */}
          <BoardGrid
            board={state.board}
            interactionMode={interactionMode}
            selectedPath={selectedPath}
            activeShiftAxis={activeShiftAxis}
            activeShiftIndex={activeShiftIndex}
            shiftTokens={state.shiftTokens}
            onPathChange={setSelectedPath}
            onSelectShiftTarget={(row, col) => {
              setActiveShiftIndex(activeShiftAxis === 'row' ? row : col);
            }}
            onSwipeShift={handleShift}
          />

          {/* Contextual Controls: Word Bar in Spell Mode, Shift Tray in Shift Mode */}
          {interactionMode === 'spell' ? (
            <div className="word-bar">
              <div
                className={`word-preview ${previewWord ? '' : 'word-preview--empty'}`}
                aria-live="polite"
              >
                {previewWord || 'Tap or drag adjacent letters…'}
              </div>
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
                disabled={previewWord.length < DEFAULT_ECONOMY.minWordLength}
                onClick={handleSubmitWord}
              >
                Submit
              </button>
            </div>
          ) : (
            <ShiftTray
              axis={activeShiftAxis}
              index={activeShiftIndex}
              shiftTokens={state.shiftTokens}
              onChangeAxis={setActiveShiftAxis}
              onChangeIndex={setActiveShiftIndex}
              onShift={handleShift}
            />
          )}

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
          {deadlocked && (
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

          {/* Phase Complete Advance Banner */}
          {phaseReady && !state.dailyComplete && (
            <div className="phase-complete-card">
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>
                  Phase {state.phase} Complete!
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  3–5 tiles will refresh for Phase {state.phase + 1}.
                </div>
              </div>
              <button
                type="button"
                className="btn-primary"
                onClick={() => runAction({ type: 'ADVANCE_PHASE' })}
              >
                Next Phase →
              </button>
            </div>
          )}

          {/* 3 Compact Target Chips */}
          <section className="targets-section" aria-label="Hidden target words">
            <div className="section-heading">
              <span>Hidden Targets</span>
              <span>Tap a target to deduce</span>
            </div>
            <div className="target-chips-grid">
              {state.targets.map((target, idx) => {
                const isSolved =
                  target.status === 'solved_guess' || target.status === 'solved_board';
                const classes = [
                  'target-chip',
                  target.id === activeTarget?.id ? 'target-chip--active' : '',
                  isSolved ? 'target-chip--solved' : '',
                  target.status === 'revealed' ? 'target-chip--revealed' : '',
                ]
                  .filter(Boolean)
                  .join(' ');

                return (
                  <button
                    key={target.id}
                    type="button"
                    className={classes}
                    onClick={() => handleSelectTargetChip(target.id)}
                  >
                    <span className="target-chip-title">
                      {isSolved
                        ? target.answer
                        : target.status === 'revealed'
                          ? target.answer
                          : `Target ${idx + 1}`}
                    </span>
                    <span className="target-chip-meta">
                      {target.status === 'solved_board'
                        ? '★ Board Bonus'
                        : target.status === 'solved_guess'
                          ? '✓ Solved'
                          : target.status === 'revealed'
                            ? 'Revealed'
                            : `${target.length} letters · ${target.guesses.length}/${target.maxGuesses}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        {/* Right Column (iPad Landscape & Desktop): Always-Visible Deduction Panel */}
        <aside className="side-column" aria-label="Target deduction workspace">
          {activeTarget && (
            <DeductionPanel
              target={activeTarget}
              targetNumber={activeTargetIndex + 1}
              boardLetters={boardLetters}
              insightPoints={state.insightPoints}
              onSubmitGuess={(targetId, word) =>
                runAction({ type: 'SUBMIT_GUESS', targetId, word })
              }
              onBuyClue={(targetId) => runAction({ type: 'BUY_CLUE', targetId })}
              onBuyExtraGuesses={(targetId) =>
                runAction({ type: 'BUY_EXTRA_GUESSES', targetId })
              }
              onRevealTarget={(targetId) => runAction({ type: 'REVEAL_TARGET', targetId })}
            />
          )}
        </aside>
      </main>

      {/* Mobile Portrait Bottom-Sheet Deduction Drawer */}
      {mobileDrawerOpen && activeTarget && (
        <BottomSheet
          title={`Deduce Target ${activeTargetIndex + 1}`}
          onClose={() => setMobileDrawerOpen(false)}
        >
          <DeductionPanel
            target={activeTarget}
            targetNumber={activeTargetIndex + 1}
            boardLetters={boardLetters}
            insightPoints={state.insightPoints}
            onSubmitGuess={(targetId, word) =>
              runAction({ type: 'SUBMIT_GUESS', targetId, word })
            }
            onBuyClue={(targetId) => runAction({ type: 'BUY_CLUE', targetId })}
            onBuyExtraGuesses={(targetId) =>
              runAction({ type: 'BUY_EXTRA_GUESSES', targetId })
            }
            onRevealTarget={(targetId) => runAction({ type: 'REVEAL_TARGET', targetId })}
          />
        </BottomSheet>
      )}

      {historyOpen && (
        <HistorySheet
          phase={state.phase}
          foundWords={state.foundWords}
          onClose={() => setHistoryOpen(false)}
        />
      )}

      {rulesOpen && <RulesSheet onClose={() => setRulesOpen(false)} />}
    </div>
  );
}
