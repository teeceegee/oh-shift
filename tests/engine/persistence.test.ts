import { describe, expect, it } from 'vitest';
import { getBundledDictionary } from '../../src/data/loadDictionary';
import {
  createDailyGame,
  createNewGame,
  DEFAULT_ECONOMY,
  dispatchAction,
  formatDailyShareSummary,
  getLocalDateKey,
  getMilestoneLabel,
} from '../../src/engine';
import { decodeSaveCode, encodeSaveCode, getSaveSlotKey } from '../../src/storage/db';

const dict = getBundledDictionary();

describe('Oh! Shift — Persistence, Save Codes & Daily Challenge', () => {
  it('Encodes and decodes portable OS1 Save Codes losslessly', () => {
    let state = createNewGame({ seed: 'travel-save-test', dict, difficulty: 'expert' });
    state = dispatchAction(
      state,
      { type: 'SHIFT', op: { axis: 'row', index: 0, direction: 'right' } },
      dict,
    ).state;

    const code = encodeSaveCode(state);
    expect(code.startsWith('OS1:')).toBe(true);

    const decoded = decodeSaveCode(code);
    expect(decoded.error).toBeUndefined();
    expect(decoded.state).toEqual(state);
  });

  it('Rejects invalid or corrupted Save Codes safely', () => {
    expect(decodeSaveCode('INVALID').error).toMatch(/prefix/i);
    expect(decodeSaveCode('OS1:!!!not-base64!!!').error).toBeDefined();
    expect(decodeSaveCode('OS1:e30').error).toMatch(/corrupted|incompatible/i);
  });

  it('Computes local YYYY-MM-DD date keys and independent save slot keys', () => {
    const sampleDate = new Date(2026, 10, 24, 23, 30, 0); // Local Nov 24, 2026
    expect(getLocalDateKey(sampleDate)).toBe('2026-11-24');

    expect(getSaveSlotKey('solo', 'run-123')).toBe('solo');
    expect(getSaveSlotKey('daily', 'daily-2026-11-24')).toBe('daily:2026-11-24');
  });

  it('Formats spoiler-free Daily 5-Phase Challenge share summary without leaking answers', () => {
    let state = createDailyGame('2026-11-24', dict);
    const allAnswers: string[] = [];

    for (let phase = 1; phase <= DEFAULT_ECONOMY.dailyPhaseCount; phase++) {
      for (const target of state.targets) {
        allAnswers.push(target.answer);
        state = dispatchAction(
          state,
          { type: 'SUBMIT_GUESS', targetId: target.id, word: target.answer },
          dict,
        ).state;
      }
      state = dispatchAction(state, { type: 'ADVANCE_PHASE' }, dict).state;
    }

    expect(state.dailyComplete).toBe(true);
    const summary = formatDailyShareSummary(state);
    expect(summary).toContain('Oh! Shift Daily · 2026-11-24');
    expect(summary).toContain('Phases: 5/5');

    for (const answer of allAnswers) {
      expect(summary).not.toContain(answer);
    }
  });

  it('Reports milestone banners at phases 5, 10, 20, and 40', () => {
    expect(getMilestoneLabel(3)).toBeNull();
    expect(getMilestoneLabel(5)).toMatch(/5 Phases/i);
    expect(getMilestoneLabel(10)).toMatch(/10 Phases/i);
    expect(getMilestoneLabel(20)).toMatch(/20 Phases/i);
    expect(getMilestoneLabel(40)).toMatch(/40 Phases/i);
  });
});
