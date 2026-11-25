import { SCHEMA_VERSION } from '../engine/config';
import type { GameMode, GameState, MinMatchLength } from '../engine/types';

const DB_NAME = 'oh-shift-db';
const DB_VERSION = 1;
const STORE_SAVES = 'saves';
const STORE_META = 'meta';
const META_KEY_RECORDS = 'lifetime_records_v4';

export interface RunSummary {
  gameId: string;
  mode: GameMode;
  minMatchLength: MinMatchLength;
  seed: string;
  score: number;
  shiftsMade: number;
  wordsFound: number;
  fiveLetterWords: number;
  crossWordsFound: number;
  savedAt: string;
}

export interface LifetimeRecords {
  bestEndlessScore: number;
  bestDailyScore: number;
  totalCrossWordsEver: number;
  dailiesCompleted: string[];
  recentRuns: RunSummary[];
}

export function createEmptyRecords(): LifetimeRecords {
  return {
    bestEndlessScore: 0,
    bestDailyScore: 0,
    totalCrossWordsEver: 0,
    dailiesCompleted: [],
    recentRuns: [],
  };
}

function openDatabase(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_SAVES)) {
          db.createObjectStore(STORE_SAVES);
        }
        if (!db.objectStoreNames.contains(STORE_META)) {
          db.createObjectStore(STORE_META);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function idbGet<T>(storeName: string, key: string): Promise<T | null> {
  const db = await openDatabase();
  if (!db) {
    try {
      const raw = localStorage.getItem(`${DB_NAME}:${storeName}:${key}`);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.get(key);
      req.onsuccess = () => resolve((req.result as T | undefined) ?? null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function idbPut<T>(storeName: string, key: string, value: T): Promise<void> {
  const db = await openDatabase();
  if (!db) {
    try {
      localStorage.setItem(`${DB_NAME}:${storeName}:${key}`, JSON.stringify(value));
    } catch {
      // Ignore quota errors
    }
    return;
  }

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      store.put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export function getSaveSlotKey(mode: GameMode, seed: string): string {
  if (mode === 'daily') {
    const dateKey = seed.replace(/^daily-/, '');
    return `daily:${dateKey}`;
  }
  return 'solo';
}

export async function saveGameState(state: GameState): Promise<void> {
  const slot = getSaveSlotKey(state.mode, state.seed);
  await idbPut(STORE_SAVES, slot, state);
}

export async function loadGameState(slot: string): Promise<GameState | null> {
  const loaded = await idbGet<GameState>(STORE_SAVES, slot);
  if (!loaded || typeof loaded !== 'object') return null;
  if (loaded.schemaVersion !== SCHEMA_VERSION || !Array.isArray(loaded.board)) {
    return null;
  }
  return loaded;
}

export async function loadLifetimeRecords(): Promise<LifetimeRecords> {
  const loaded = await idbGet<LifetimeRecords>(STORE_META, META_KEY_RECORDS);
  return loaded ? { ...createEmptyRecords(), ...loaded } : createEmptyRecords();
}

export async function recordGameSnapshot(state: GameState): Promise<LifetimeRecords> {
  const current = await loadLifetimeRecords();

  const next: LifetimeRecords = {
    ...current,
    bestEndlessScore:
      state.mode === 'solo'
        ? Math.max(current.bestEndlessScore, state.score)
        : current.bestEndlessScore,
    bestDailyScore:
      state.mode === 'daily'
        ? Math.max(current.bestDailyScore, state.score)
        : current.bestDailyScore,
    totalCrossWordsEver: Math.max(current.totalCrossWordsEver, state.stats.crossWordsFound),
    dailiesCompleted:
      state.mode === 'daily' && state.dailyComplete
        ? Array.from(new Set([...current.dailiesCompleted, state.seed.replace(/^daily-/, '')])).sort()
        : current.dailiesCompleted,
    recentRuns: upsertRunSummary(current.recentRuns, state),
  };

  await idbPut(STORE_META, META_KEY_RECORDS, next);
  return next;
}

function upsertRunSummary(runs: readonly RunSummary[], state: GameState): RunSummary[] {
  const summary: RunSummary = {
    gameId: state.gameId,
    mode: state.mode,
    minMatchLength: state.minMatchLength,
    seed: state.seed,
    score: state.score,
    shiftsMade: state.shiftsMade,
    wordsFound: state.stats.totalWordsFound,
    fiveLetterWords: state.stats.fiveLetterWords,
    crossWordsFound: state.stats.crossWordsFound,
    savedAt: state.updatedAt,
  };

  const filtered = runs.filter((r) => r.gameId !== state.gameId);
  return [summary, ...filtered].slice(0, 20);
}

const SAVE_CODE_PREFIX = 'OS4:';

export function encodeSaveCode(state: GameState): string {
  const json = JSON.stringify(state);
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const b64 = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${SAVE_CODE_PREFIX}${b64}`;
}

export function decodeSaveCode(code: string): { state?: GameState; error?: string } {
  const trimmed = code.trim();
  if (!trimmed.startsWith(SAVE_CODE_PREFIX)) {
    return { error: 'Invalid Save Code prefix (expected OS4:...)' };
  }

  try {
    const b64 = trimmed.slice(SAVE_CODE_PREFIX.length).replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const json = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(json) as Partial<GameState>;

    if (
      parsed.schemaVersion !== SCHEMA_VERSION ||
      typeof parsed.seed !== 'string' ||
      !Array.isArray(parsed.board) ||
      parsed.board.length !== 5 ||
      !Array.isArray(parsed.savedWords)
    ) {
      return { error: 'Save Code is corrupted or from an incompatible version' };
    }

    return { state: parsed as GameState };
  } catch {
    return { error: 'Could not decode Save Code — check that the entire code was copied' };
  }
}
