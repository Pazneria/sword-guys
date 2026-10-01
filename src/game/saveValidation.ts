import { ITEMS, MAPS, SPELLS } from './content';
import type { GameEngine } from './simulation/engine';
import type { SaveSnapshot } from './types';

export const SAVE_SLOT_KEY = 'sword-guys-save-v1';
const object = (value: unknown): value is Record<string, any> => typeof value === 'object' && value !== null && !Array.isArray(value);
const number = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= Number.MAX_SAFE_INTEGER;
const text = (value: unknown) => typeof value === 'string' && value.length <= 4096;
const own = (catalog: object, key: unknown) => typeof key === 'string' && Object.hasOwn(catalog, key);
const list = (value: unknown, valid: (entry: unknown) => boolean) => Array.isArray(value) && value.length <= 10000 && value.every(valid);
const record = (value: unknown, valid: (entry: unknown) => boolean) => object(value) && Object.keys(value).length <= 10000 && Object.entries(value).every(([key, entry]) => !['__proto__', 'constructor', 'prototype'].includes(key) && valid(entry));
const flags = (value: unknown) => record(value, (entry) => typeof entry === 'boolean');
const stats = (value: unknown) => object(value) && ['hp', 'maxHp', 'mp', 'maxMp', 'attack', 'defense', 'speed', 'magic'].every((key) => number(value[key]));

export const parseSavedGame = (raw: string): SaveSnapshot | null => {
  if (raw.length > 1024 * 1024) return null;
  try {
    const snapshot: unknown = JSON.parse(raw);
    if (!object(snapshot) || snapshot.version !== 1 || !text(snapshot.savedAt) || !object(snapshot.state)) return null;
    const state = snapshot.state;
    const player = state.player;
    if (!own(MAPS, state.currentMapId) || !text(state.currentSpawnId) || !object(player)) return null;
    if (!text(player.name) || !['level', 'xp', 'xpToNext', 'gold', 'worldX', 'worldY', 'movementHoldMs'].every((key) => number(player[key]))) return null;
    if (!stats(player.stats) || !stats(player.baseStats) || typeof player.moving !== 'boolean') return null;
    if (!['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'].includes(player.facing)) return null;
    if (!object(player.equipment) || !['weapon', 'helmet', 'bodyArmor', 'legArmor', 'shield', 'accessory1', 'accessory2'].every((key) => player.equipment[key] === null || own(ITEMS, player.equipment[key]))) return null;
    if (!list(player.spells, (id) => own(SPELLS, id)) || !record(state.inventory, number) || !Object.keys(state.inventory).every((id) => own(ITEMS, id))) return null;
    if (!flags(state.questFlags) || !flags(state.keyItems) || !list(state.gameLog, text) || !list(state.activeQuestIds, text) || !list(state.completedQuestIds, text)) return null;
    if (!record(state.mapState, (entry) => object(entry) && flags(entry.openedObjects) && flags(entry.defeatedEnemies) && flags(entry.unlockedObjects)) || !Object.keys(state.mapState).every((id) => own(MAPS, id))) return null;
    if (state.checkpoint !== null || typeof state.endingReached !== 'boolean') return null;
    return snapshot as unknown as SaveSnapshot;
  } catch {
    return null;
  }
};

export const loadSavedGameSafely = (engine: GameEngine) => {
  try {
    const saved = localStorage.getItem(SAVE_SLOT_KEY);
    if (saved === null) return 'No saved game found.';
    if (!parseSavedGame(saved)) return 'Save data could not be loaded. The stored slot has been kept.';
    return engine.loadSavedGame();
  } catch {
    return 'Save data could not be loaded.';
  }
};
