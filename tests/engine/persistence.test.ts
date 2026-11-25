import { describe, expect, it } from 'vitest';
import { getBundledDictionary } from '../../src/data/loadDictionary';
import {
  createDailyGame,
  createNewGame,
  DEFAULT_ECONOMY,
  dispatchAction,
  formatDailyShareSummary,
  getLocalDateKey,
} from '../../src/engine';
import { decodeSaveCode, encodeSaveCode, getSaveSlotKey } from '../../src/storage/db';

const dict = getBundledDictionary();

describe('Oh! Shift v3 — Persistence, Save Codes & Daily Challenge', () => {
  it('Encodes and decodes portable OS3 Save Codes losslessly', () => {
    let state = createNewGame({ seed: 'travel-v3', dict, minMatchLength: 4 });
    state = dispatchAction(
      state,
      { type: 'SHIFT', op: { axis: 'row', index: 0, direction: 'right' } },
      dict,
    ).state;

    const code = encodeSaveCode(state);
    expect(code.startsWith('OS3:')).toBe(true);

    const decoded = decodeSaveCode(code);
    expect(decoded.error).toBeUndefined();
    expect(decoded.state).toEqual(state);
  });

  it('Rejects invalid or corrupted Save Codes safely', () => {
    expect(decodeSaveCode('OS2:abc').error).toMatch(/prefix/i);
    expect(decodeSaveCode('OS3:!!!bad!!!').error).toBeDefined();
    expect(decodeSaveCode('OS3:e30').error).toMatch(/corrupted|incompatible/i);
  });

  it('Computes local YYYY-MM-DD date keys and formats Daily share summary', () => {
    expect(getLocalDateKey(new Date(2026, 10, 25, 22, 15, 0))).toBe('2026-11-25');
    expect(getSaveSlotKey('solo', 'run-1')).toBe('solo');
    expect(getSaveSlotKey('daily', 'daily-2026-11-25')).toBe('daily:2026-11-25');

    let state = createDailyGame('2026-11-25', dict, 4);
    for (let i = 0; i < DEFAULT_ECONOMY.dailyShiftLimit; i++) {
      state = dispatchAction(
        state,
        { type: 'SHIFT', op: { axis: 'row', index: i % 5, direction: 'right' } },
        dict,
      ).state;
    }

    const summary = formatDailyShareSummary(state);
    expect(summary).toContain('Oh! Shift Daily · 2026-11-25');
    expect(summary).toContain('25/25 shifts');
  });
});
