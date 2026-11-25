import type { Coord, ShiftOp } from '../../engine';

interface BoardGridProps {
  board: readonly (readonly string[])[];
  flashingCoords: readonly Coord[];
  freshCoords: readonly Coord[];
  disabled?: boolean;
  onShift: (op: ShiftOp) => void;
}

const COL_LABELS = ['A', 'B', 'C', 'D', 'E'];
const INDICES = [0, 1, 2, 3, 4];

export function BoardGrid({
  board,
  flashingCoords,
  freshCoords,
  disabled = false,
  onShift,
}: BoardGridProps) {
  const flashSet = new Set(flashingCoords.map((c) => `${c.row}:${c.col}`));
  const freshSet = new Set(freshCoords.map((c) => `${c.row}:${c.col}`));

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
            disabled={disabled}
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
            disabled={disabled}
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
        >
          {board.map((rowArr, r) =>
            rowArr.map((letter, c) => {
              const key = `${r}:${c}`;
              const isFlashing = flashSet.has(key);
              const isFresh = freshSet.has(key);

              const classes = [
                'tile-btn',
                'tile-btn--static',
                isFlashing ? 'tile-btn--flash' : '',
                isFresh ? 'tile-btn--fresh' : '',
              ]
                .filter(Boolean)
                .join(' ');

              return (
                <div
                  key={`${r}-${c}`}
                  role="gridcell"
                  className={classes}
                  aria-label={`Letter ${letter}, Row ${r + 1}, Column ${COL_LABELS[c]}${
                    isFlashing ? ', matched word!' : ''
                  }`}
                >
                  <span>{letter}</span>
                </div>
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
            disabled={disabled}
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
            disabled={disabled}
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
