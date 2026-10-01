import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadSavedGameSafely, parseSavedGame, SAVE_SLOT_KEY } from '../src/game/saveValidation';
import { createInitialState, GameEngine } from '../src/game/simulation/engine';

const snapshot = () => ({ version: 1, savedAt: '2026-09-30T00:00:00.000Z', state: createInitialState() });

describe('save loading boundary', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('never overwrites an existing slot during engine construction, and can resume it', () => {
    const saved = snapshot();
    saved.state.player.gold = 77;
    const original = JSON.stringify(saved);
    const setItem = vi.fn();
    vi.stubGlobal('localStorage', { getItem: () => original, setItem });
    const engine = new GameEngine();
    expect(setItem).not.toHaveBeenCalled();
    expect(loadSavedGameSafely(engine)).toBe('Loaded saved game.');
    expect(engine.state.player.gold).toBe(77);
    expect(setItem).not.toHaveBeenCalled();
    engine.createCheckpoint('Explicit save.');
    expect(setItem).toHaveBeenCalledWith(SAVE_SLOT_KEY, expect.any(String));
  });
  it('keeps malformed and unreadable slots intact while retaining an in-memory checkpoint', () => {
    const setItem = vi.fn();
    vi.stubGlobal('localStorage', { getItem: () => '{', setItem });
    const engine = new GameEngine();
    expect(engine.state.checkpoint).not.toBeNull();
    expect(loadSavedGameSafely(engine)).toContain('stored slot has been kept');
    expect(setItem).not.toHaveBeenCalled();
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('blocked'); }, setItem });
    expect(new GameEngine().state.checkpoint).not.toBeNull();
    expect(setItem).not.toHaveBeenCalled();
  });
  it('accepts the existing version-one checkpoint format without changing its contents', () => {
    const saved = snapshot();
    expect(parseSavedGame(JSON.stringify(saved))).toEqual(saved);
  });
  it('rejects malformed, oversized, unknown-map, and incomplete saves', () => {
    expect(parseSavedGame('{')).toBeNull();
    expect(parseSavedGame(' '.repeat(1024 * 1024 + 1))).toBeNull();
    const saved = snapshot();
    saved.state.currentMapId = '__proto__';
    expect(parseSavedGame(JSON.stringify(saved))).toBeNull();
    expect(parseSavedGame(JSON.stringify({ version: 1, savedAt: '', state: {} }))).toBeNull();
  });
  it('rejects markup in numeric fields and unexpected executable-content identifiers', () => {
    const saved = snapshot();
    (saved.state.player as unknown as Record<string, unknown>).gold = '<img src=x onerror=alert(1)>';
    expect(parseSavedGame(JSON.stringify(saved))).toBeNull();
    saved.state.player.gold = 55;
    saved.state.player.spells = ['<script>alert(1)</script>'];
    expect(parseSavedGame(JSON.stringify(saved))).toBeNull();
  });
});
