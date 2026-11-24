import { useRef } from 'react';
import { areAdjacent, BOARD_SIZE } from '../../engine';
import type { Coord, ShiftOp } from '../../engine';

interface BoardGridProps {
  board: readonly (readonly string[])[];
  selectedPath: readonly Coord[];
  shiftTokens: number;
  disabled?: boolean;
  onPathChange: (nextPath: Coord[]) => void;
  onShift: (op: ShiftOp) => void;
}

const COL_LABELS = ['A', 'B', 'C', 'D', 'E'];
const INDICES = [0, 1, 2, 3, 4];

export function BoardGrid({
  board,
  selectedPath,
  shiftTokens,
  disabled = false,
  onPathChange,
  onShift,
}: BoardGridProps) {
  const isDraggingRef = useRef(false);
  const dragMovedRef = useRef(false);

  const shiftsDisabled = disabled || shiftTokens < 1;

  const getSelectedIndex = (row: number, col: number): number =>
    selectedPath.findIndex((c) => c.row === row && c.col === col);

  const handleTileTap = (row: number, col: number) => {
    const existingIdx = getSelectedIndex(row, col);
    if (existingIdx !== -1) {
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
      onPathChange([{ row, col }]);
    }
  };

  const handlePointerDown = () => {
    isDraggingRef.current = true;
    dragMovedRef.current = false;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
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

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  const polylinePoints = selectedPath
    .map(({ row, col }) => {
      const x = ((col + 0.5) / BOARD_SIZE) * 100;
      const y = ((row + 0.5) / BOARD_SIZE) * 100;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="board-well">
      <div className="board-frame">
        {/* Top Row: Shift Columns Up */}
        {INDICES.map((col) => (
          <button
            key={`up-${col}`}
            type="button"
            className="shift-arrow-btn shift-arrow-btn--top"
            style={{ gridColumn: col + 2, gridRow: 1 }}
            disabled={shiftsDisabled}
            aria-label={`Shift Column ${COL_LABELS[col]} Up`}
            title={`Shift Column ${COL_LABELS[col]} Up`}
            onClick={() => onShift({ axis: 'col', index: col, direction: 'up' })}
          >
            ▲
          </button>
        ))}

        {/* Left Column: Shift Rows Left */}
        {INDICES.map((row) => (
          <button
            key={`left-${row}`}
            type="button"
            className="shift-arrow-btn shift-arrow-btn--side"
            style={{ gridColumn: 1, gridRow: row + 2 }}
            disabled={shiftsDisabled}
            aria-label={`Shift Row ${row + 1} Left`}
            title={`Shift Row ${row + 1} Left`}
            onClick={() => onShift({ axis: 'row', index: row, direction: 'left' })}
          >
            ◀
          </button>
        ))}

        {/* Inner 5x5 Letter Tile Grid */}
        <div
          className="board-grid"
          role="grid"
          aria-label="Oh! Shift 5 by 5 letter board"
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={() => {
            isDraggingRef.current = false;
          }}
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

              return (
                <button
                  key={`${r}-${c}`}
                  type="button"
                  className={`tile-btn ${isSelected ? 'tile-btn--selected' : ''}`}
                  data-row={r}
                  data-col={c}
                  aria-label={`Letter ${letter}, Row ${r + 1}, Column ${COL_LABELS[c]}${
                    isSelected ? `, selected position ${selIdx + 1}` : ''
                  }`}
                  aria-pressed={isSelected}
                  onPointerDown={handlePointerDown}
                  onClick={() => {
                    if (dragMovedRef.current) {
                      dragMovedRef.current = false;
                      return;
                    }
                    handleTileTap(r, c);
                  }}
                >
                  <span>{letter}</span>
                  {isSelected && <span className="tile-order-badge">{selIdx + 1}</span>}
                </button>
              );
            }),
          )}
        </div>

        {/* Right Column: Shift Rows Right */}
        {INDICES.map((row) => (
          <button
            key={`right-${row}`}
            type="button"
            className="shift-arrow-btn shift-arrow-btn--side"
            style={{ gridColumn: 7, gridRow: row + 2 }}
            disabled={shiftsDisabled}
            aria-label={`Shift Row ${row + 1} Right`}
            title={`Shift Row ${row + 1} Right`}
            onClick={() => onShift({ axis: 'row', index: row, direction: 'right' })}
          >
            ▶
          </button>
        ))}

        {/* Bottom Row: Shift Columns Down */}
        {INDICES.map((col) => (
          <button
            key={`down-${col}`}
            type="button"
            className="shift-arrow-btn shift-arrow-btn--bottom"
            style={{ gridColumn: col + 2, gridRow: 7 }}
            disabled={shiftsDisabled}
            aria-label={`Shift Column ${COL_LABELS[col]} Down`}
            title={`Shift Column ${COL_LABELS[col]} Down`}
            onClick={() => onShift({ axis: 'col', index: col, direction: 'down' })}
          >
            ▼
          </button>
        ))}
      </div>
    </div>
  );
}
