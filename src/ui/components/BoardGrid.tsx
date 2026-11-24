import { useRef } from 'react';
import { areAdjacent, BOARD_SIZE } from '../../engine';
import type { Coord, ShiftAxis, ShiftOp } from '../../engine';

interface BoardGridProps {
  board: readonly (readonly string[])[];
  interactionMode: 'spell' | 'shift';
  selectedPath: readonly Coord[];
  activeShiftAxis: ShiftAxis;
  activeShiftIndex: number;
  shiftTokens: number;
  onPathChange: (nextPath: Coord[]) => void;
  onSelectShiftTarget: (row: number, col: number) => void;
  onSwipeShift: (op: ShiftOp) => void;
}

const COL_LABELS = ['A', 'B', 'C', 'D', 'E'];

export function BoardGrid({
  board,
  interactionMode,
  selectedPath,
  activeShiftAxis,
  activeShiftIndex,
  shiftTokens,
  onPathChange,
  onSelectShiftTarget,
  onSwipeShift,
}: BoardGridProps) {
  const isDraggingRef = useRef(false);
  const dragMovedRef = useRef(false);
  const swipeStartRef = useRef<{ x: number; y: number; row: number; col: number } | null>(null);

  const getSelectedIndex = (row: number, col: number): number =>
    selectedPath.findIndex((c) => c.row === row && c.col === col);

  const handleTileTapSpell = (row: number, col: number) => {
    const existingIdx = getSelectedIndex(row, col);
    if (existingIdx !== -1) {
      // Tap last tile to undo it; tap earlier tile to trim back to it
      if (existingIdx === selectedPath.length - 1) {
        onPathChange(selectedPath.slice(0, -1));
      } else {
        onPathChange(selectedPath.slice(0, existingIdx + 1));
      }
      return;
    }

    if (selectedPath.length === 0) {
      onPathChange([{ row, col }]);
      return;
    }

    const last = selectedPath[selectedPath.length - 1];
    if (areAdjacent(last, { row, col })) {
      onPathChange([...selectedPath, { row, col }]);
    } else {
      // Non-adjacent tap starts a fresh selection at this tile
      onPathChange([{ row, col }]);
    }
  };

  const handlePointerDown = (row: number, col: number, e: React.PointerEvent) => {
    if (interactionMode === 'shift') {
      swipeStartRef.current = { x: e.clientX, y: e.clientY, row, col };
      return;
    }

    isDraggingRef.current = true;
    dragMovedRef.current = false;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (interactionMode === 'shift') return;
    if (!isDraggingRef.current) return;

    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    const tile = el?.closest('[data-row][data-col]') as HTMLElement | null;
    if (!tile) return;

    const row = Number(tile.dataset.row);
    const col = Number(tile.dataset.col);
    if (Number.isNaN(row) || Number.isNaN(col)) return;

    if (selectedPath.length === 0) {
      dragMovedRef.current = true;
      onPathChange([{ row, col }]);
      return;
    }

    const last = selectedPath[selectedPath.length - 1];
    if (last.row === row && last.col === col) return;

    // Backtrack if dragging onto the second-to-last tile
    if (selectedPath.length >= 2) {
      const prev = selectedPath[selectedPath.length - 2];
      if (prev.row === row && prev.col === col) {
        dragMovedRef.current = true;
        onPathChange(selectedPath.slice(0, -1));
        return;
      }
    }

    const alreadySelected = getSelectedIndex(row, col) !== -1;
    if (!alreadySelected && areAdjacent(last, { row, col })) {
      dragMovedRef.current = true;
      onPathChange([...selectedPath, { row, col }]);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (interactionMode === 'shift' && swipeStartRef.current) {
      const start = swipeStartRef.current;
      swipeStartRef.current = null;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      const threshold = 28;

      if (Math.abs(dx) >= threshold || Math.abs(dy) >= threshold) {
        if (shiftTokens > 0) {
          if (Math.abs(dx) > Math.abs(dy)) {
            onSwipeShift({
              axis: 'row',
              index: start.row,
              direction: dx > 0 ? 'right' : 'left',
            });
          } else {
            onSwipeShift({
              axis: 'col',
              index: start.col,
              direction: dy > 0 ? 'down' : 'up',
            });
          }
        }
      } else {
        onSelectShiftTarget(start.row, start.col);
      }
      return;
    }

    isDraggingRef.current = false;
  };

  // Compute SVG polyline points in 0..100 coordinate space
  const polylinePoints = selectedPath
    .map(({ row, col }) => {
      const x = ((col + 0.5) / BOARD_SIZE) * 100;
      const y = ((row + 0.5) / BOARD_SIZE) * 100;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div
      className="board-well"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => {
        isDraggingRef.current = false;
        swipeStartRef.current = null;
      }}
    >
      <div
        className="board-grid"
        role="grid"
        aria-label="Oh! Shift 5 by 5 letter board"
      >
        {selectedPath.length >= 2 && (
          <svg
            className="board-svg-overlay"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <polyline
              points={polylinePoints}
              fill="none"
              stroke="var(--accent-primary)"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.45"
            />
          </svg>
        )}

        {board.map((rowArr, r) =>
          rowArr.map((letter, c) => {
            const selIdx = getSelectedIndex(r, c);
            const isSelected = selIdx !== -1;
            const isShiftHighlight =
              interactionMode === 'shift' &&
              ((activeShiftAxis === 'row' && activeShiftIndex === r) ||
                (activeShiftAxis === 'col' && activeShiftIndex === c));

            const classes = [
              'tile-btn',
              isSelected ? 'tile-btn--selected' : '',
              isShiftHighlight ? 'tile-btn--shift-axis' : '',
            ]
              .filter(Boolean)
              .join(' ');

            return (
              <button
                key={`${r}-${c}`}
                type="button"
                className={classes}
                data-row={r}
                data-col={c}
                aria-label={`Letter ${letter}, Row ${r + 1}, Column ${COL_LABELS[c]}${
                  isSelected ? `, selected position ${selIdx + 1}` : ''
                }`}
                aria-pressed={isSelected}
                onPointerDown={(e) => handlePointerDown(r, c, e)}
                onClick={() => {
                  if (interactionMode === 'spell') {
                    if (dragMovedRef.current) {
                      dragMovedRef.current = false;
                      return;
                    }
                    handleTileTapSpell(r, c);
                  }
                }}
              >
                <span>{letter}</span>
                {isSelected && <span className="tile-order-badge">{selIdx + 1}</span>}
              </button>
            );
          }),
        )}
      </div>
    </div>
  );
}
