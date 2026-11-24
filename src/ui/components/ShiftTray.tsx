import type { ShiftAxis, ShiftOp } from '../../engine';

interface ShiftTrayProps {
  axis: ShiftAxis;
  index: number;
  shiftTokens: number;
  onChangeAxis: (axis: ShiftAxis) => void;
  onChangeIndex: (index: number) => void;
  onShift: (op: ShiftOp) => void;
}

const COL_LABELS = ['A', 'B', 'C', 'D', 'E'];

export function ShiftTray({
  axis,
  index,
  shiftTokens,
  onChangeAxis,
  onChangeIndex,
  onShift,
}: ShiftTrayProps) {
  const noTokens = shiftTokens < 1;

  return (
    <section className="shift-tray" aria-label="Row and column shift controls">
      <div className="shift-tray-row">
        <div className="shift-axis-pills" role="group" aria-label="Shift axis">
          <button
            type="button"
            className={`axis-pill ${axis === 'row' ? 'axis-pill--active' : ''}`}
            onClick={() => onChangeAxis('row')}
            aria-pressed={axis === 'row'}
          >
            Row
          </button>
          <button
            type="button"
            className={`axis-pill ${axis === 'col' ? 'axis-pill--active' : ''}`}
            onClick={() => onChangeAxis('col')}
            aria-pressed={axis === 'col'}
          >
            Col
          </button>
        </div>

        <div className="shift-axis-pills" role="group" aria-label="Select row or column index">
          {[0, 1, 2, 3, 4].map((i) => (
            <button
              key={i}
              type="button"
              className={`axis-pill ${index === i ? 'axis-pill--active' : ''}`}
              onClick={() => onChangeIndex(i)}
              aria-pressed={index === i}
              aria-label={axis === 'row' ? `Row ${i + 1}` : `Column ${COL_LABELS[i]}`}
            >
              {axis === 'row' ? i + 1 : COL_LABELS[i]}
            </button>
          ))}
        </div>
      </div>

      <div className="shift-dir-actions">
        {axis === 'row' ? (
          <>
            <button
              type="button"
              className="shift-action-btn"
              disabled={noTokens}
              onClick={() => onShift({ axis: 'row', index, direction: 'left' })}
            >
              ◀ Shift Row {index + 1} Left
            </button>
            <button
              type="button"
              className="shift-action-btn"
              disabled={noTokens}
              onClick={() => onShift({ axis: 'row', index, direction: 'right' })}
            >
              Shift Row {index + 1} Right ▶
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="shift-action-btn"
              disabled={noTokens}
              onClick={() => onShift({ axis: 'col', index, direction: 'up' })}
            >
              ▲ Shift Col {COL_LABELS[index]} Up
            </button>
            <button
              type="button"
              className="shift-action-btn"
              disabled={noTokens}
              onClick={() => onShift({ axis: 'col', index, direction: 'down' })}
            >
              Shift Col {COL_LABELS[index]} Down ▼
            </button>
          </>
        )}
      </div>
    </section>
  );
}
