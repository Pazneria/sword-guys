import {
  ENCOUNTERS,
  ENEMIES,
  ITEMS,
  MAPS,
  QUESTS,
  SHOPS,
  SPELLS,
  START_MAP_ID,
  START_SPAWN_ID,
  TILE_DEFINITIONS,
  getTileDefinition
} from '../content';
import {
  BattleActor,
  BattleCommandResult,
  BattleRewards,
  BattleState,
  BattleVisualEvent,
  CombatStats,
  Direction,
  EncounterDefinition,
  EnemyEntity,
  EquipmentSlot,
  GameState,
  InputActionState,
  InteractionResult,
  ItemDefinition,
  MapDefinition,
  MapObject,
  MapRuntimeState,
  NPCDefinition,
  PlacedTile,
  Rect,
  SaveSnapshot,
  ShopDefinition,
  SleepVisualEffect,
  TILE_SIZE,
  Transition,
  TransitionTarget
} from '../types';

const SAVE_KEY = 'sword-guys-save-v1';
const CHECKPOINT_VERSION = 1;
const PLAYER_SPEED = 132;
const TURN_PAUSE_MS = 100;

const slots: EquipmentSlot[] = ['weapon', 'helmet', 'bodyArmor', 'legArmor', 'shield', 'accessory1', 'accessory2'];

export interface RuntimeEnemy extends EnemyEntity {
  worldX: number;
  worldY: number;
  state: 'wandering' | 'chasing' | 'returning' | 'cooldown';
  wanderTimerMs: number;
  targetX: number;
  targetY: number;
  cooldownMs: number;
}

export interface PendingBattle {
  mapId: string;
  enemyEntityId: string;
  encounterId: string;
  backdrop?: string;
}

export const cloneData = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export const normalizeMovement = (x: number, y: number) => {
  const length = Math.hypot(x, y);
  if (length === 0) return { x: 0, y: 0 };
  return { x: x / length, y: y / length };
};

export const directionFromVector = (x: number, y: number, fallback: Direction = 'south'): Direction => {
  if (Math.abs(x) < 0.01 && Math.abs(y) < 0.01) return fallback;
  const horizontal = x > 0.35 ? 'east' : x < -0.35 ? 'west' : '';
  const vertical = y > 0.35 ? 'south' : y < -0.35 ? 'north' : '';
  return `${vertical}${horizontal}` as Direction;
};

export const directionVector = (direction: Direction) => {
  const x = direction.includes('east') ? 1 : direction.includes('west') ? -1 : 0;
  const y = direction.includes('south') ? 1 : direction.includes('north') ? -1 : 0;
  return normalizeMovement(x, y);
};

export const xpForLevel = (level: number) => (level <= 5 ? 36 + level * level * 18 : 28 + level * level * 7);

export const createInitialState = (): GameState => {
  const start = MAPS[START_MAP_ID].spawnPoints.find((spawn) => spawn.id === START_SPAWN_ID) ?? MAPS[START_MAP_ID].spawnPoints[0];
  const baseStats: CombatStats = {
    hp: 64,
    maxHp: 64,
    mp: 18,
    maxMp: 18,
    attack: 7,
    defense: 4,
    speed: 7,
    magic: 5
  };
  return {
    currentMapId: START_MAP_ID,
    currentSpawnId: START_SPAWN_ID,
    player: {
      name: 'Ari',
      level: 1,
      xp: 0,
      xpToNext: xpForLevel(1),
      gold: 55,
      stats: cloneData(baseStats),
      baseStats: cloneData(baseStats),
      equipment: {
        weapon: 'wooden_sword',
        helmet: 'cloth_cap',
        bodyArmor: 'cloth_tunic',
        legArmor: 'cloth_leggings',
        shield: 'small_shield',
        accessory1: null,
        accessory2: null
      },
      spells: ['spark', 'mend'],
      worldX: start.x * TILE_SIZE + TILE_SIZE / 2,
      worldY: start.y * TILE_SIZE + TILE_SIZE / 2,
      facing: start.facing ?? 'south',
      movementHoldMs: 0,
      moving: false
    },
    questFlags: {},
    activeQuestIds: [],
    completedQuestIds: [],
    inventory: {
      small_potion: 3,
      antidote: 1,
      wooden_sword: 1,
      cloth_cap: 1,
      cloth_tunic: 1,
      cloth_leggings: 1,
      small_shield: 1
    },
    keyItems: {},
    gameLog: ['Wake up in Greenhollow. Elder Rowan is waiting near the north path.'],
    mapState: {},
    checkpoint: null,
    endingReached: false
  };
};

export const computeEffectiveStats = (state: GameState): CombatStats => {
  const stats = cloneData(state.player.baseStats);
  for (const slot of slots) {
    const itemId = state.player.equipment[slot];
    if (!itemId) continue;
    const item = ITEMS[itemId];
    if (!item?.stats) continue;
    for (const [key, value] of Object.entries(item.stats)) {
      stats[key as keyof CombatStats] += Number(value);
    }
  }
  stats.maxHp = Math.max(1, stats.maxHp);
  stats.maxMp = Math.max(0, stats.maxMp);
  stats.hp = Math.min(state.player.stats.hp, stats.maxHp);
  stats.mp = Math.min(state.player.stats.mp, stats.maxMp);
  return stats;
};

export const calculatePhysicalDamage = (attacker: CombatStats, defender: CombatStats, defending = false, power = 0) => {
  const raw = attacker.attack + power - defender.defense;
  return Math.max(1, Math.floor((defending ? raw * 0.5 : raw) + Math.random() * 3));
};

export const calculateMagicDamage = (attacker: CombatStats, defender: CombatStats, defending = false, power = 0) => {
  const raw = attacker.magic + power - Math.floor(defender.defense * 0.45);
  return Math.max(1, Math.floor((defending ? raw * 0.65 : raw) + Math.random() * 3));
};

const rectsOverlap = (a: Rect, b: Rect) =>
  a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;

const tileRect = (x: number, y: number): Rect => ({ x: x * TILE_SIZE, y: y * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE });

const pointTile = (worldX: number, worldY: number) => ({
  x: Math.floor(worldX / TILE_SIZE),
  y: Math.floor(worldY / TILE_SIZE)
});

const boundsContainsTile = (bounds: Rect, x: number, y: number) =>
  x >= bounds.x && y >= bounds.y && x < bounds.x + bounds.width && y < bounds.y + bounds.height;

export class GameEngine {
  state: GameState;
  debug = false;
  message = '';
  messageTimerMs = 0;
  pendingBattle: PendingBattle | null = null;
  currentBattle: BattleState | null = null;
  private runtimeEnemiesByMap = new Map<string, RuntimeEnemy[]>();
  private transitionCooldownMs = 0;
  private randomEncounterMeter = 0;
  private randomEncounterCooldownMs = 0;
  private pendingSleepVisual: SleepVisualEffect | null = null;
  private battleVisualEvents: BattleVisualEvent[] = [];

  constructor(state = createInitialState()) {
    this.state = state;
    this.loadRuntimeEnemies(state.currentMapId);
    if (!this.state.checkpoint) this.createCheckpoint('Starting checkpoint saved.');
    this.refreshPlayerStats();
  }

  get map(): MapDefinition {
    return MAPS[this.state.currentMapId];
  }

  get runtimeEnemies(): RuntimeEnemy[] {
    if (!this.runtimeEnemiesByMap.has(this.state.currentMapId)) this.loadRuntimeEnemies(this.state.currentMapId);
    return this.runtimeEnemiesByMap.get(this.state.currentMapId) ?? [];
  }

  mapState(mapId = this.state.currentMapId): MapRuntimeState {
    this.state.mapState[mapId] ??= { openedObjects: {}, defeatedEnemies: {}, unlockedObjects: {} };
    return this.state.mapState[mapId];
  }

  setMessage(text: string, ms = 2600) {
    this.message = text;
    this.messageTimerMs = ms;
  }

  stepExploration(deltaMs: number, input: InputActionState, uiBlocking: boolean) {
    this.syncProgressionRoutes();
    if (input.debugPressed) this.debug = !this.debug;
    this.messageTimerMs = Math.max(0, this.messageTimerMs - deltaMs);
    if (this.messageTimerMs === 0) this.message = '';
    if (this.transitionCooldownMs > 0) this.transitionCooldownMs -= deltaMs;
    if (this.randomEncounterCooldownMs > 0) this.randomEncounterCooldownMs -= deltaMs;
    if (uiBlocking || this.pendingBattle || this.currentBattle || this.state.endingReached) {
      this.state.player.moving = false;
      return;
    }

    this.movePlayer(deltaMs, input.moveX, input.moveY);
    this.checkTransitions();
    if (this.pendingBattle || this.currentBattle) return;
    this.checkRandomEncounter(deltaMs);
    if (this.pendingBattle) return;
    this.updateEnemies(deltaMs);
    this.checkEnemyContact();
  }

  interact(): InteractionResult {
    const npc = this.findNearbyNpc();
    if (npc) return this.handleNpc(npc);
    const object = this.findNearbyObject();
    if (object) return this.handleObject(object);
    return { type: 'none' };
  }

  prompt(): string {
    const npc = this.findNearbyNpc();
    if (npc) return `Talk: ${npc.name}`;
    const object = this.findNearbyObject();
    if (!object) return '';
    if (object.type === 'chest') return 'Open chest';
    if (object.type === 'savePoint') return 'Save';
    if (object.type === 'shopCounter') return 'Shop';
    if (object.type === 'innBed') return 'Sleep';
    if (object.type === 'sign') return 'Read sign';
    return 'Interact';
  }

  buyItem(shopId: string, itemId: string): string {
    const shop = SHOPS[shopId];
    if (!shop?.inventory.includes(itemId)) return 'That is not sold here.';
    const item = ITEMS[itemId];
    const spell = SPELLS[itemId];
    const price = item?.price ?? (spell ? spell.mpCost * 18 : 9999);
    if (this.state.player.gold < price) return 'Not enough gold.';
    this.state.player.gold -= price;
    if (spell) {
      if (!this.state.player.spells.includes(spell.id)) this.state.player.spells.push(spell.id);
      this.addLog(`Learned ${spell.name}.`);
      return `Learned ${spell.name}.`;
    }
    this.addInventory(itemId, 1);
    if (item?.equipmentSlot && !this.state.player.equipment[item.equipmentSlot]) this.equip(itemId);
    this.addLog(`Bought ${item?.name ?? itemId}.`);
    return `Bought ${item?.name ?? itemId}.`;
  }

  sellItem(itemId: string): string {
    const item = ITEMS[itemId];
    if (!item || item.keyItem || item.category === 'keyItem') return 'That cannot be sold.';
    if ((this.state.inventory[itemId] ?? 0) <= 0) return 'You do not have that.';
    if (Object.values(this.state.player.equipment).includes(itemId)) return 'Unequip it before selling.';
    this.state.inventory[itemId] -= 1;
    if (this.state.inventory[itemId] <= 0) delete this.state.inventory[itemId];
    const value = item.sellPrice ?? Math.floor(item.price * 0.45);
    this.state.player.gold += value;
    return `Sold ${item.name} for ${value}g.`;
  }

  useItem(itemId: string): string {
    const item = ITEMS[itemId];
    if (!item || (this.state.inventory[itemId] ?? 0) <= 0) return 'You do not have that item.';
    if (!item.effect) return 'That cannot be used right now.';
    const stats = computeEffectiveStats(this.state);
    if (item.effect.type === 'healHp') this.state.player.stats.hp = Math.min(stats.maxHp, this.state.player.stats.hp + item.effect.amount);
    if (item.effect.type === 'healMp') this.state.player.stats.mp = Math.min(stats.maxMp, this.state.player.stats.mp + item.effect.amount);
    this.state.inventory[itemId] -= 1;
    if (this.state.inventory[itemId] <= 0) delete this.state.inventory[itemId];
    this.refreshPlayerStats();
    return `Used ${item.name}.`;
  }

  equip(itemId: string): string {
    const item = ITEMS[itemId];
    if (!item?.equipmentSlot || (this.state.inventory[itemId] ?? 0) <= 0) return 'That cannot be equipped.';
    const slot = item.equipmentSlot === 'accessory1' && this.state.player.equipment.accessory1 ? 'accessory2' : item.equipmentSlot;
    this.state.player.equipment[slot] = itemId;
    this.refreshPlayerStats();
    return `Equipped ${item.name}.`;
  }

  restAtInn(cost: number): string {
    if (this.state.player.gold < cost) return `The room costs ${cost}g.`;
    const innMapId = this.state.currentMapId;
    this.state.player.gold -= cost;
    this.state.questFlags[`${innMapId}RoomPaid`] = true;
    this.state.questFlags[`${innMapId}RoomNight`] = true;
    this.fullHeal();
    this.loadRuntimeEnemies(this.state.currentMapId);
    const roomMapId = `${innMapId}_room`;
    if (MAPS[roomMapId]) this.changeMap(roomMapId, 'wake');
    this.createCheckpoint('Rested and saved.');
    return 'Rested, healed, and saved.';
  }

  sleepInInnBed(): string {
    const bed = this.findNearbyObject();
    const player = this.state.player;
    const innMapId = this.state.currentMapId.endsWith('_room') ? this.state.currentMapId.slice(0, -'_room'.length) : this.state.currentMapId;
    this.pendingSleepVisual = {
      mapId: this.state.currentMapId,
      bedX: bed?.type === 'innBed' ? bed.x : Math.floor(player.worldX / TILE_SIZE),
      bedY: bed?.type === 'innBed' ? bed.y : Math.floor(player.worldY / TILE_SIZE),
      wakeX: player.worldX,
      wakeY: player.worldY,
      wakeFacing: player.facing
    };
    delete this.state.questFlags[`${innMapId}RoomNight`];
    this.state.questFlags[`${innMapId}RoomMorning`] = true;
    this.fullHeal();
    this.loadRuntimeEnemies(this.state.currentMapId);
    this.createCheckpoint('Slept, healed, and saved.');
    return 'Slept, healed, and saved.';
  }

  consumePendingSleepVisual() {
    const visual = this.pendingSleepVisual;
    this.pendingSleepVisual = null;
    return visual;
  }

  createCheckpoint(message = 'Game saved.') {
    const state = cloneData(this.state);
    state.checkpoint = null;
    const snapshot: SaveSnapshot = { version: CHECKPOINT_VERSION, savedAt: new Date().toISOString(), state };
    this.state.checkpoint = snapshot;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(snapshot));
    } catch {
      // Local storage can be blocked in private contexts; the in-memory checkpoint still works.
    }
    this.addLog(message);
    return message;
  }

  loadSavedGame(): string {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return 'No saved game found.';
      const snapshot = JSON.parse(raw) as SaveSnapshot;
      this.state = cloneData(snapshot.state);
      this.state.checkpoint = snapshot;
      this.loadRuntimeEnemies(this.state.currentMapId);
      this.refreshPlayerStats();
      return 'Loaded saved game.';
    } catch {
      return 'Save data could not be loaded.';
    }
  }

  restoreCheckpoint(): string {
    if (!this.state.checkpoint) {
      this.state = createInitialState();
      this.createCheckpoint('Returned to the beginning.');
    } else {
      const snapshot = cloneData(this.state.checkpoint);
      this.state = cloneData(snapshot.state);
      this.state.checkpoint = snapshot;
    }
    this.loadRuntimeEnemies(this.state.currentMapId);
    this.refreshPlayerStats();
    this.pendingBattle = null;
    this.currentBattle = null;
    this.battleVisualEvents = [];
    return 'Defeat. Restored the last checkpoint.';
  }

  continueAfterEnding(): string {
    this.state.endingReached = false;
    this.pendingBattle = null;
    this.currentBattle = null;
    this.battleVisualEvents = [];
    this.randomEncounterCooldownMs = 1800;
    this.setMessage('Postgame: continue exploring the Five Roads.', 3600);
    this.addLog('Continued after the ending.');
    return 'Continued after the ending.';
  }

  restartGame(): string {
    this.state = createInitialState();
    this.runtimeEnemiesByMap.clear();
    this.pendingBattle = null;
    this.currentBattle = null;
    this.battleVisualEvents = [];
    this.debug = false;
    this.message = '';
    this.messageTimerMs = 0;
    this.transitionCooldownMs = 0;
    this.randomEncounterMeter = 0;
    this.randomEncounterCooldownMs = 0;
    this.loadRuntimeEnemies(this.state.currentMapId);
    this.createCheckpoint('New journey started.');
    this.refreshPlayerStats();
    this.setMessage('New journey started.', 3200);
    return 'New journey started.';
  }

  startPendingBattle(): BattleState | null {
    if (!this.pendingBattle) return null;
    const encounter = ENCOUNTERS[this.pendingBattle.encounterId];
    if (!encounter) return null;
    const playerStats = computeEffectiveStats(this.state);
    const battle: BattleState = {
      id: `${encounter.id}_${Date.now()}`,
      sourceMapId: this.pendingBattle.mapId,
      sourceEnemyEntityId: this.pendingBattle.enemyEntityId,
      encounterId: encounter.id,
      enemies: encounter.enemyIds.map((enemyId) => {
        const definition = ENEMIES[enemyId];
        return {
          id: enemyId,
          name: definition.name,
          stats: cloneData(definition.stats),
          statuses: [],
          color: definition.color
        };
      }),
      player: {
        id: 'player',
        name: this.state.player.name,
        stats: cloneData(playerStats),
        statuses: []
      },
      phase: 'playerTurn',
      commandLog: [`${encounter.name} begins!`],
      rewards: null,
      escapeAllowed: encounter.escapeAllowed,
      backdrop: this.pendingBattle.backdrop ?? encounter.backdrop
    };
    this.currentBattle = battle;
    this.battleVisualEvents = [];
    return battle;
  }

  consumeBattleVisualEvents() {
    const events = this.battleVisualEvents;
    this.battleVisualEvents = [];
    return events;
  }

  submitBattleCommand(command: 'attack' | 'magic' | 'item' | 'defend' | 'run', optionId?: string, targetId?: string): BattleCommandResult {
    if (!this.currentBattle) throw new Error('No active battle.');
    const battle = this.currentBattle;
    const result = (consumedTurn: boolean): BattleCommandResult => ({
      battle,
      consumedTurn,
      message: battle.commandLog.at(-1) ?? ''
    });
    if (battle.phase !== 'playerTurn') return result(false);
    battle.player.defending = false;

    if (command === 'run') {
      if (!battle.escapeAllowed) {
        battle.commandLog.push('There is no escape from this fight.');
        return result(false);
      } else if (Math.random() < 0.72) {
        battle.phase = 'escaped';
        battle.commandLog.push('Escaped!');
        this.battleVisualEvents.push({ type: 'playerRun', success: true });
        this.cooldownSourceEnemy(1200);
        return result(true);
      } else {
        battle.commandLog.push('Could not escape!');
        this.battleVisualEvents.push({ type: 'playerRun', success: false });
      }
    }

    if (command === 'defend') {
      battle.player.defending = true;
      battle.commandLog.push('Ari defends.');
      this.battleVisualEvents.push({ type: 'playerDefend' });
    }

    if (command === 'attack') {
      const target = this.battleTarget(targetId);
      if (target) {
        const damage = calculatePhysicalDamage(battle.player.stats, target.stats);
        target.stats.hp = Math.max(0, target.stats.hp - damage);
        battle.commandLog.push(`Ari attacks ${target.name} for ${damage}.`);
        this.battleVisualEvents.push({ type: 'playerAttack', targetId: target.id });
      }
    }

    if (command === 'magic') {
      const spell = SPELLS[optionId ?? ''];
      if (!spell || !this.state.player.spells.includes(spell.id)) {
        battle.commandLog.push('No usable spell selected.');
        return result(false);
      } else if (battle.player.stats.mp < spell.mpCost) {
        battle.commandLog.push('Not enough MP.');
        return result(false);
      } else {
        battle.player.stats.mp -= spell.mpCost;
        if (spell.kind === 'healing') {
          battle.player.stats.hp = Math.min(battle.player.stats.maxHp, battle.player.stats.hp + spell.power + battle.player.stats.magic);
          battle.commandLog.push(`Ari casts ${spell.name} and recovers HP.`);
          this.battleVisualEvents.push({ type: 'playerHeal', spellId: spell.id });
        } else {
          const target = this.battleTarget(targetId);
          if (target) {
            const damage = calculateMagicDamage(battle.player.stats, target.stats, false, spell.power);
            target.stats.hp = Math.max(0, target.stats.hp - damage);
            battle.commandLog.push(`Ari casts ${spell.name} at ${target.name} for ${damage}.`);
            this.battleVisualEvents.push({ type: 'playerMagic', targetId: target.id, spellId: spell.id, element: spell.element });
          }
        }
      }
    }

    if (command === 'item') {
      const item = ITEMS[optionId ?? ''];
      if (!item || (this.state.inventory[item.id] ?? 0) <= 0 || !item.effect) {
        battle.commandLog.push('No usable item selected.');
        return result(false);
      } else {
        if (item.effect.type === 'healHp') battle.player.stats.hp = Math.min(battle.player.stats.maxHp, battle.player.stats.hp + item.effect.amount);
        if (item.effect.type === 'healMp') battle.player.stats.mp = Math.min(battle.player.stats.maxMp, battle.player.stats.mp + item.effect.amount);
        this.state.inventory[item.id] -= 1;
        if (this.state.inventory[item.id] <= 0) delete this.state.inventory[item.id];
        battle.commandLog.push(`Used ${item.name}.`);
        this.battleVisualEvents.push(item.effect.type === 'healHp' || item.effect.type === 'healMp' ? { type: 'playerHeal', itemId: item.id } : { type: 'playerItem', itemId: item.id });
      }
    }

    if (battle.enemies.every((enemy) => enemy.stats.hp <= 0)) {
      this.resolveVictory(battle);
      return result(true);
    }

    battle.phase = 'enemyTurn';
    this.enemyRound(battle);
    if (battle.player.stats.hp <= 0) {
      battle.phase = 'defeat';
      battle.commandLog.push('Ari falls.');
      return result(true);
    }
    battle.phase = 'playerTurn';
    battle.player.defending = false;
    return result(true);
  }

  finishBattle() {
    if (!this.currentBattle) return;
    if (this.currentBattle.phase === 'victory' || this.currentBattle.phase === 'escaped') {
      this.state.player.stats.hp = Math.max(1, this.currentBattle.player.stats.hp);
      this.state.player.stats.mp = Math.max(0, this.currentBattle.player.stats.mp);
      this.removeSourceEnemy();
      this.pendingBattle = null;
      this.currentBattle = null;
      this.battleVisualEvents = [];
      this.refreshPlayerStats();
    }
    if (this.state.endingReached) this.setMessage('The Hollow Regent is defeated. The road is yours again.', 5000);
  }

  getShop(shopId: string): ShopDefinition | undefined {
    return SHOPS[shopId];
  }

  renderObjects() {
    return this.visibleObjects();
  }

  displayPlayerStats(): CombatStats {
    return this.currentBattle?.player.stats ?? this.state.player.stats;
  }

  qaWarpToTile(mapId: string, x: number, y: number, facing: Direction = 'south') {
    const map = MAPS[mapId];
    if (!map) return `Unknown QA map: ${mapId}`;
    this.state.currentMapId = mapId;
    this.state.currentSpawnId = `qa_${x}_${y}`;
    this.state.player.worldX = x * TILE_SIZE + TILE_SIZE / 2;
    this.state.player.worldY = y * TILE_SIZE + TILE_SIZE / 2;
    this.state.player.facing = facing;
    this.state.player.moving = false;
    this.state.player.movementHoldMs = 0;
    this.pendingBattle = null;
    this.currentBattle = null;
    this.battleVisualEvents = [];
    this.transitionCooldownMs = 500;
    this.randomEncounterCooldownMs = 2500;
    this.randomEncounterMeter = 0;
    this.state.questFlags.introCutsceneSeen = true;
    this.debug = false;
    this.loadRuntimeEnemies(mapId);
    this.message = '';
    this.messageTimerMs = 0;
    return `QA warp: ${map.name} (${x}, ${y})`;
  }

  qaForceBattle(encounterId: string, backdrop?: string, enemyEntityId?: string) {
    const encounter = ENCOUNTERS[encounterId];
    if (!encounter) return `Unknown QA encounter: ${encounterId}`;
    this.currentBattle = null;
    this.battleVisualEvents = [];
    this.randomEncounterCooldownMs = 0;
    this.randomEncounterMeter = 0;
    this.pendingBattle = {
      mapId: this.state.currentMapId,
      enemyEntityId: enemyEntityId ?? `qa_${encounterId}`,
      encounterId,
      backdrop: backdrop ?? this.map.battleBackdrop
    };
    this.state.questFlags.introCutsceneSeen = true;
    this.setMessage(`QA battle: ${encounter.name}`, 1400);
    return `QA battle: ${encounter.name} on ${this.pendingBattle.backdrop}`;
  }

  grantPlaytestPower(options: { unlockRoutes?: boolean } = {}) {
    this.state.player.level = 50;
    this.state.player.xp = 0;
    this.state.player.xpToNext = xpForLevel(50);
    this.state.player.gold = 99999;
    this.state.player.baseStats = {
      hp: 999,
      maxHp: 999,
      mp: 999,
      maxMp: 999,
      attack: 999,
      defense: 999,
      speed: 999,
      magic: 999
    };
    this.state.player.equipment = {
      weapon: 'enchanted_blade',
      helmet: 'plate_helm',
      bodyArmor: 'plate_armor',
      legArmor: 'plate_greaves',
      shield: 'sunward_aegis',
      accessory1: 'ember_amulet',
      accessory2: 'river_charm'
    };
    for (const item of Object.values(ITEMS)) {
      if (item.keyItem || item.category === 'keyItem') continue;
      this.state.inventory[item.id] = Math.max(this.state.inventory[item.id] ?? 0, item.category === 'consumable' ? 99 : 1);
    }
    this.state.player.spells = Object.keys(SPELLS);
    if (options.unlockRoutes) {
      Object.assign(this.state.questFlags, {
        spokeToElder: true,
        townGateOpened: true,
        routeToWaymeetUnlocked: true,
        routeToLumaireUnlocked: true,
        routeToIronmarchUnlocked: true,
        routeToSunspireUnlocked: true,
        routeToFinalUnlocked: true,
        finalQuestStarted: true
      });
      ['cave_relic', 'road_seal', 'shrine_lumen', 'iron_writ', 'eclipse_key'].forEach((itemId) => {
        this.state.keyItems[itemId] = true;
      });
      this.startQuest('eclipse_key');
    }
    this.fullHeal();
    if (this.currentBattle) {
      this.currentBattle.player.stats = cloneData(this.state.player.stats);
      this.currentBattle.commandLog.push(options.unlockRoutes ? 'Playtest routes unlocked.' : 'Playtest max stats enabled.');
    }
    const message = options.unlockRoutes ? 'Playtest routes unlocked.' : 'Playtest max stats enabled.';
    this.addLog(message);
    this.setMessage(message, 2800);
    return message;
  }

  getItemOrSpellName(id: string) {
    return ITEMS[id]?.name ?? SPELLS[id]?.name ?? id;
  }

  currentObjective(): string {
    this.syncProgressionRoutes();
    if (!this.state.questFlags.spokeToElder) return 'Talk to Elder Rowan in Greenhollow.';
    if (!this.state.questFlags.caveRelicFound) return 'Recover the Cave Relic from Mossvale Cave.';
    if (!this.state.questFlags.relicReturned) return 'Return the Cave Relic to Elder Rowan.';
    if (!this.state.questFlags.waymeetRoadEventSeen) return 'Check on the wounded courier along the Waymeet road.';
    if (!this.state.questFlags.roadQuestStarted) return 'Speak with Broker Sel in Waymeet.';
    if (!this.state.questFlags.banditCaptainDefeated) return 'Defeat Rusk in Dustbridge Ruins.';
    if (!this.state.questFlags.lumaireRiverEventSeen) return 'Meet the stranded ferryman at the restored river crossing.';
    if (!this.state.questFlags.shrineQuestStarted) return 'Speak with Oracle Niva in Lumaire.';
    if (!this.state.questFlags.mireWardenDefeated) return 'Clear the Flooded Shrine.';
    if (!this.state.questFlags.ironmarchPassEventSeen) return 'Inspect the ash-covered miner on the Ironmarch pass.';
    if (!this.state.questFlags.fortressQuestStarted) return 'Speak with Marshal Brinn in Ironmarch.';
    if (!this.state.questFlags.ironCastellanDefeated) return 'Break the Iron Castellan in Ironvein Fortress.';
    if (!this.state.questFlags.sunspireBellEventSeen) return 'Follow the bell runner on the Sunspire road.';
    if (!this.state.questFlags.routeToFinalUnlocked) return 'Report to Keeper Aster in Sunspire.';
    if (!this.state.questFlags.eclipseRoadEventSeen) return "Meet Aster's page on the Eclipse Tower road.";
    if (!this.state.questFlags.hollowRegentDefeated) return 'Enter Eclipse Tower and defeat the Hollow Regent.';
    return 'Main story complete.';
  }

  private movePlayer(deltaMs: number, moveX: number, moveY: number) {
    const player = this.state.player;
    const hasInput = Math.abs(moveX) > 0.01 || Math.abs(moveY) > 0.01;
    if (!hasInput) {
      player.moving = false;
      player.movementHoldMs = 0;
      return;
    }
    const direction = directionFromVector(moveX, moveY, player.facing);
    player.facing = direction;
    if (!player.moving && player.movementHoldMs < TURN_PAUSE_MS) {
      player.movementHoldMs += deltaMs;
      if (player.movementHoldMs < TURN_PAUSE_MS) return;
    }
    const vector = normalizeMovement(moveX, moveY);
    const speed = PLAYER_SPEED * this.movementCostAt(player.worldX, player.worldY);
    const dx = vector.x * speed * (deltaMs / 1000);
    const dy = vector.y * speed * (deltaMs / 1000);
    const movedX = Math.abs(dx) > 0.001 && this.tryMove(dx, 0);
    const movedY = Math.abs(dy) > 0.001 && this.tryMove(0, dy);
    player.moving = movedX || movedY;
  }

  private tryMove(dx: number, dy: number) {
    const player = this.state.player;
    const nextX = player.worldX + dx;
    const nextY = player.worldY + dy;
    const lockedTransition = this.lockedCollisionTransitionAt(nextX, nextY);
    if (lockedTransition) {
      this.setMessage(lockedTransition.blockedMessage || 'It is locked.');
      return false;
    }
    if (!this.isBlockedAt(nextX, nextY)) {
      player.worldX = nextX;
      player.worldY = nextY;
      return true;
    }
    return false;
  }

  private movementCostAt(worldX: number, worldY: number) {
    const { x, y } = pointTile(worldX, worldY + 10);
    const placed = this.map.layers.ground[y]?.[x];
    const def = placed ? getTileDefinition(placed.id) : TILE_DEFINITIONS.grass_plain;
    return 1 / (def.defaultProperties.movementCost ?? 1);
  }

  private isBlockedAt(worldX: number, worldY: number) {
    const map = this.map;
    const foot: Rect = { x: worldX - 7, y: worldY + 4, width: 14, height: 10 };
    if (foot.x < 0 || foot.y < 0 || foot.x + foot.width > map.width * TILE_SIZE || foot.y + foot.height > map.height * TILE_SIZE) return true;
    if (this.findLockedCollisionTransition(foot)) return true;
    const minX = Math.floor(foot.x / TILE_SIZE);
    const maxX = Math.floor((foot.x + foot.width - 1) / TILE_SIZE);
    const minY = Math.floor(foot.y / TILE_SIZE);
    const maxY = Math.floor((foot.y + foot.height - 1) / TILE_SIZE);
    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        for (const layerName of ['ground', 'lowerObject', 'upperObject'] as const) {
          const placed = map.layers[layerName][y]?.[x];
          if (placed && this.tileBlocks(placed, tileRect(x, y), foot)) return true;
        }
      }
    }
    for (const object of this.visibleObjects()) {
      if (!object.collision) continue;
      const objectRect: Rect = { x: object.x * TILE_SIZE, y: object.y * TILE_SIZE, width: object.width * TILE_SIZE, height: object.height * TILE_SIZE };
      if (rectsOverlap(foot, objectRect)) return true;
    }
    for (const npc of this.visibleNpcs()) {
      if (rectsOverlap(foot, this.npcHitbox(npc))) return true;
    }
    return false;
  }

  private tileBlocks(placed: PlacedTile, area: Rect, foot: Rect) {
    const def = getTileDefinition(placed.id);
    const props = { ...def.defaultProperties, ...(placed.overrides ?? {}) };
    if (props.walkable && !props.collision) return false;
    if (!rectsOverlap(area, foot)) return false;
    return !props.walkable || Boolean(props.collision);
  }

  private visibleObjects() {
    const flags = this.state.questFlags;
    const opened = this.mapState().openedObjects;
    return this.map.objects.filter((object) => {
      if (object.hiddenUntilFlag && !flags[object.hiddenUntilFlag]) return false;
      if (object.removeWhenFlag && flags[object.removeWhenFlag]) return false;
      if (object.type === 'chest' && opened[object.id]) return false;
      return true;
    });
  }

  private visibleNpcs() {
    const flags = this.state.questFlags;
    return this.map.npcs.filter((npc) => !npc.hiddenUntilFlag || flags[npc.hiddenUntilFlag]);
  }

  private npcHitbox(npc: NPCDefinition): Rect {
    return { x: npc.x * TILE_SIZE, y: npc.y * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE };
  }

  private checkTransitions() {
    if (this.transitionCooldownMs > 0) return;
    const { x, y } = pointTile(this.state.player.worldX, this.state.player.worldY + 8);
    for (const transition of this.map.transitions) {
      if (transition.trigger.type !== 'bounds') continue;
      if (!boundsContainsTile(transition.trigger.bounds, x, y)) continue;
      this.applyTransition(transition);
      return;
    }
  }

  private applyTransition(transition: Transition | TransitionTarget) {
    const requiresFlag = 'requiresFlag' in transition ? transition.requiresFlag : undefined;
    if (requiresFlag && !this.state.questFlags[requiresFlag]) {
      this.setMessage(('blockedMessage' in transition && transition.blockedMessage) || 'That route is not open yet.');
      if ('lockedCollision' in transition && transition.lockedCollision) {
        this.state.player.moving = false;
        this.state.player.movementHoldMs = 0;
        this.transitionCooldownMs = 250;
        return;
      }
      this.rejectBlockedTransition(transition);
      return;
    }
    const toMap = 'toMap' in transition ? transition.toMap : this.state.currentMapId;
    const toSpawn = 'toSpawn' in transition ? transition.toSpawn : 'entry';
    this.changeMap(toMap, toSpawn);
    const clearFlag = 'clearFlag' in transition ? transition.clearFlag : undefined;
    if (clearFlag) delete this.state.questFlags[clearFlag];
    const clearFlags = 'clearFlags' in transition ? transition.clearFlags : undefined;
    clearFlags?.forEach((flag) => delete this.state.questFlags[flag]);
  }

  private lockedCollisionTransitionAt(worldX: number, worldY: number) {
    const foot: Rect = { x: worldX - 7, y: worldY + 4, width: 14, height: 10 };
    return this.findLockedCollisionTransition(foot);
  }

  private findLockedCollisionTransition(foot: Rect) {
    return (
      this.map.transitions.find((transition) => {
        if (!transition.lockedCollision || !transition.requiresFlag || this.state.questFlags[transition.requiresFlag]) return false;
        if (transition.trigger.type !== 'bounds') return false;
        const bounds = transition.trigger.bounds;
        const transitionRect: Rect = { x: bounds.x * TILE_SIZE, y: bounds.y * TILE_SIZE, width: bounds.width * TILE_SIZE, height: bounds.height * TILE_SIZE };
        return rectsOverlap(foot, transitionRect);
      }) ?? null
    );
  }

  private rejectBlockedTransition(transition: Transition | TransitionTarget) {
    if ('trigger' in transition && transition.trigger.type === 'bounds') {
      const snapped = this.snapOutsideTransitionBounds(transition.trigger.bounds);
      if (!snapped) this.nudgeFromTransition();
    } else {
      this.nudgeFromTransition();
    }
    this.state.player.moving = false;
    this.state.player.movementHoldMs = 0;
    this.transitionCooldownMs = 600;
  }

  private snapOutsideTransitionBounds(bounds: Rect) {
    const player = this.state.player;
    const facing = directionVector(player.facing);
    const currentTile = pointTile(player.worldX, player.worldY + 8);
    let targetX = currentTile.x;
    let targetY = currentTile.y;
    if (Math.abs(facing.y) >= Math.abs(facing.x)) {
      if (facing.y < 0) targetY = bounds.y + bounds.height;
      else if (facing.y > 0) targetY = bounds.y - 1;
    } else if (facing.x < 0) {
      targetX = bounds.x + bounds.width;
    } else if (facing.x > 0) {
      targetX = bounds.x - 1;
    }
    targetX = Math.max(0, Math.min(this.map.width - 1, targetX));
    targetY = Math.max(0, Math.min(this.map.height - 1, targetY));
    const worldX = targetX * TILE_SIZE + TILE_SIZE / 2;
    const worldY = targetY * TILE_SIZE + TILE_SIZE / 2;
    if (this.isBlockedAt(worldX, worldY)) return false;
    player.worldX = worldX;
    player.worldY = worldY;
    return true;
  }

  private nudgeFromTransition() {
    const vector = directionVector(this.state.player.facing);
    this.state.player.worldX -= vector.x * 18;
    this.state.player.worldY -= vector.y * 18;
    this.transitionCooldownMs = 600;
  }

  private changeMap(mapId: string, spawnId: string) {
    const map = MAPS[mapId];
    const spawnPoint = map.spawnPoints.find((spawn) => spawn.id === spawnId) ?? map.spawnPoints[0];
    this.state.currentMapId = mapId;
    this.state.currentSpawnId = spawnPoint.id;
    this.state.player.worldX = spawnPoint.x * TILE_SIZE + TILE_SIZE / 2;
    this.state.player.worldY = spawnPoint.y * TILE_SIZE + TILE_SIZE / 2;
    this.state.player.facing = spawnPoint.facing ?? 'south';
    this.state.player.moving = false;
    this.state.player.movementHoldMs = 0;
    this.transitionCooldownMs = 500;
    this.loadRuntimeEnemies(mapId);
    this.setMessage(map.name, 1600);
  }

  private findNearbyNpc(): NPCDefinition | null {
    const playerTile = pointTile(this.state.player.worldX, this.state.player.worldY + 8);
    const facing = directionVector(this.state.player.facing);
    const target = { x: playerTile.x + Math.round(facing.x), y: playerTile.y + Math.round(facing.y) };
    const targets = [target];
    if (this.isServiceCounterTile(target.x, target.y)) {
      targets.push({ x: target.x + Math.round(facing.x), y: target.y + Math.round(facing.y) });
    }
    return (
      this.visibleNpcs().find((npc) =>
        targets.some((searchTarget) => boundsContainsTile({ x: npc.x, y: npc.y, width: 1, height: 1 }, searchTarget.x, searchTarget.y))
      ) ?? null
    );
  }

  private isServiceCounterTile(x: number, y: number) {
    const counterTiles = new Set(['inn_counter', 'inn_counter_corner', 'armory_counter', 'armory_counter_corner']);
    for (const layerName of ['lowerObject', 'upperObject'] as const) {
      const placed = this.map.layers[layerName][y]?.[x];
      if (placed && counterTiles.has(placed.id)) return true;
    }
    return this.visibleObjects().some((object) => {
      if (object.type !== 'shopCounter') return false;
      return boundsContainsTile({ x: object.x, y: object.y, width: object.width, height: object.height }, x, y);
    });
  }

  private findNearbyObject(): MapObject | null {
    const playerTile = pointTile(this.state.player.worldX, this.state.player.worldY + 8);
    const facing = directionVector(this.state.player.facing);
    const targets = [
      { x: playerTile.x, y: playerTile.y },
      { x: playerTile.x + Math.round(facing.x), y: playerTile.y + Math.round(facing.y) }
    ];
    return (
      this.visibleObjects().find((object) => {
        if (!object.interactable) return false;
        return targets.some((target) => boundsContainsTile({ x: object.x, y: object.y, width: object.width, height: object.height }, target.x, target.y));
      }) ?? null
    );
  }

  private handleNpc(npc: NPCDefinition): InteractionResult {
    if (npc.shopId) return { type: 'shop', shopId: npc.shopId };
    const flags = this.state.questFlags;
    let lines: string[] = [];

    switch (npc.dialogueId) {
      case 'greenhollow_elder':
        if (!flags.spokeToElder) {
          flags.spokeToElder = true;
          flags.townGateOpened = true;
          this.startQuest('cave_relic');
          lines = ['The west cave is glowing again.', 'Bring back the relic in Mossvale Cave and I will open the trade road.'];
        } else if (flags.caveRelicFound && !flags.relicReturned) {
          flags.relicReturned = true;
          flags.routeToWaymeetUnlocked = true;
          this.completeQuest('cave_relic');
          this.state.player.gold += 70;
          this.addInventory('iron_sword', 1);
          lines = ['That is the relic. Good work.', 'Take this iron sword and go to Waymeet. Their roads are in trouble.'];
        } else {
          lines = ['The world is larger than our fence.', this.currentObjective()];
        }
        break;
      case 'waymeet_broker':
        if (!flags.roadQuestStarted) {
          flags.roadQuestStarted = true;
          this.startQuest('road_seal');
          lines = ['Rusk has Dustbridge locked down.', 'Clear the ruins and Waymeet will mark your road seal.'];
        } else if (flags.banditCaptainDefeated && !flags.routeToLumaireUnlocked) {
          flags.routeToLumaireUnlocked = true;
          this.completeQuest('road_seal');
          this.state.player.gold += 120;
          lines = ['Rusk is done? Then Lumaire can trust the road again.', 'Go east. Ask the river mages about the shrine lights.'];
        } else lines = ['Dustbridge Ruins sit southeast of here.', this.currentObjective()];
        break;
      case 'lumaire_oracle':
        if (!flags.shrineQuestStarted) {
          flags.shrineQuestStarted = true;
          this.startQuest('shrine_lumen');
          if (!this.state.player.spells.includes('ember')) this.state.player.spells.push('ember');
          lines = ['The Flooded Shrine is reflecting something that is not the sky.', 'Take Ember. The river things hate heat.'];
        } else if (flags.mireWardenDefeated && !flags.routeToIronmarchUnlocked) {
          flags.routeToIronmarchUnlocked = true;
          this.completeQuest('shrine_lumen');
          if (!this.state.player.spells.includes('river_mend')) this.state.player.spells.push('river_mend');
          this.state.player.gold += 180;
          lines = ['The shrine breathes again.', 'Ironmarch is your next road. They have been hearing metal sing at night.'];
        } else lines = ['Magic is a road too. Walk it carefully.', this.currentObjective()];
        break;
      case 'ironmarch_marshal':
        if (!flags.fortressQuestStarted) {
          flags.fortressQuestStarted = true;
          this.startQuest('iron_writ');
          lines = ['Ironvein Fortress stopped answering flags.', 'Break the Castellan before the capital road closes for good.'];
        } else if (flags.ironCastellanDefeated && !flags.routeToSunspireUnlocked) {
          flags.routeToSunspireUnlocked = true;
          this.completeQuest('iron_writ');
          this.state.player.gold += 240;
          lines = ['The old machine is quiet.', 'Sunspire is open. Go before the eclipse reaches the tower.'];
        } else lines = ['Steel is only useful when someone still has a hand on the hilt.', this.currentObjective()];
        break;
      case 'sunspire_keeper':
        if (!flags.finalQuestStarted) {
          flags.finalQuestStarted = true;
          flags.routeToFinalUnlocked = true;
          this.startQuest('eclipse_key');
          this.state.keyItems.eclipse_key = true;
          this.addLog('The Eclipse Key opens the final tower.');
          lines = ['The Hollow Regent waits in Eclipse Tower.', 'Take the Eclipse Key. The last road is open.'];
        } else lines = ['The city bells are holding their breath.', this.currentObjective()];
        break;
      case 'innkeeper':
        return { type: 'inn', innCost: npc.innCost ?? 20, name: npc.name };
      case 'shopkeeper':
        if (npc.shopId) return { type: 'shop', shopId: npc.shopId };
        lines = ['Welcome. The counter has the goods.'];
        break;
      case 'route_waymeet_courier':
        flags.waymeetRoadEventSeen = true;
        this.addLog('A wounded courier warned you about Rusk and the Dustbridge tolls.');
        lines = [
          'Rusk took Dustbridge and stamped false seals on every wagon he robbed.',
          'Waymeet will listen if you bring them this broken courier tag. Broker Sel knows the mark.'
        ];
        break;
      case 'route_lumaire_ferryman':
        flags.lumaireRiverEventSeen = true;
        this.addLog('The ferryman pointed you toward Lumaire and the wrong-sky river.');
        lines = [
          'The road is open, but the river is not right.',
          'It showed me midnight at noon. Find Oracle Niva before you trust any reflection.'
        ];
        break;
      case 'route_ironmarch_miner':
        flags.ironmarchPassEventSeen = true;
        this.addLog('An Ironmarch miner warned you about the silent fortress.');
        lines = [
          'The pass opened, and then the mountain coughed ash.',
          'Ironvein Fortress has not rung its signal hammer in three nights. Marshal Brinn needs to hear that from someone still standing.'
        ];
        break;
      case 'route_sunspire_bellrunner':
        flags.sunspireBellEventSeen = true;
        this.addLog('The Sunspire bell runner carried news of the capital road.');
        lines = [
          'The forge bell answered Sunspire, but the tower answered back.',
          'Keeper Aster is gathering the old keys. If the bells stop, run toward the city, not away from it.'
        ];
        break;
      case 'route_eclipse_page':
        flags.eclipseRoadEventSeen = true;
        this.addLog('Aster\'s page marked the last road to Eclipse Tower.');
        lines = [
          'Keeper Aster said the key will feel heavier when the tower is close.',
          'That is not poetry. The road ahead is pulling light out of the grass.'
        ];
        break;
      default:
        lines = [this.flavorLine(npc.dialogueId)];
    }

    this.refreshPlayerStats();
    return { type: 'dialogue', speaker: npc.name, lines };
  }

  private handleObject(object: MapObject): InteractionResult {
    if (object.type === 'sign') return { type: 'dialogue', speaker: 'Sign', lines: [object.text ?? 'The letters are too weathered to read.'] };
    if (object.type === 'savePoint') return { type: 'savePoint', name: 'Save Crystal' };
    if (object.type === 'shopCounter' && object.shopId) return { type: 'shop', shopId: object.shopId };
    if (object.type === 'innBed') return { type: 'bedRest', name: object.text ?? 'Bed' };
    if (object.transition) {
      this.applyTransition(object.transition);
      return { type: 'none' };
    }
    if (object.type === 'chest') {
      const mapState = this.mapState();
      if (mapState.openedObjects[object.id]) return { type: 'dialogue', speaker: 'Chest', lines: ['It is empty.'] };
      mapState.openedObjects[object.id] = true;
      if (object.givesItemId) {
        this.addInventory(object.givesItemId, 1);
        if (object.givesItemId === 'cave_relic') this.state.questFlags.caveRelicFound = true;
        this.addLog(`Found ${this.getItemOrSpellName(object.givesItemId)}.`);
      }
      return { type: 'dialogue', speaker: 'Chest', lines: [object.text ?? `Found ${object.givesItemId ? this.getItemOrSpellName(object.givesItemId) : 'treasure'}.`] };
    }
    return { type: 'none' };
  }

  private flavorLine(dialogueId: string) {
    const lines: Record<string, string> = {
      greenhollow_guard: 'Road opens when Rowan says it opens. That is village science.',
      greenhollow_rumor: 'The cave slimes got weird after the rain.',
      waymeet_scout: 'Rusk follows footprints. Stay off the dust road if you need a breather.',
      lumaire_student: 'I bought Ember, cast it once, and set my sleeve on fire. Worth it.',
      ironmarch_miner: 'The fortress hammer has not rung in three nights. That is worse than noise.',
      sunspire_captain: 'The tower shadow points the wrong way at noon.',
      route_waymeet_courier: 'Rusk took Dustbridge. Broker Sel needs the courier tag.',
      route_lumaire_ferryman: 'Do not trust the river until Oracle Niva says the sky is back.',
      route_ironmarch_miner: 'The fortress is quiet. That is not peace.',
      route_sunspire_bellrunner: 'Sunspire heard the forge, and Eclipse Tower heard Sunspire.',
      route_eclipse_page: 'The last road is awake.'
    };
    return lines[dialogueId] ?? 'Safe roads, traveler.';
  }

  private startQuest(questId: string) {
    if (!this.state.activeQuestIds.includes(questId) && !this.state.completedQuestIds.includes(questId)) {
      this.state.activeQuestIds.push(questId);
      this.addLog(`Quest started: ${QUESTS[questId]?.title ?? questId}.`);
    }
  }

  private completeQuest(questId: string) {
    this.state.activeQuestIds = this.state.activeQuestIds.filter((id) => id !== questId);
    if (this.state.completedQuestIds.includes(questId)) return;
    this.state.completedQuestIds.push(questId);
    this.addLog(`Quest complete: ${QUESTS[questId]?.title ?? questId}.`);
  }

  private completeQuestWithRewards(questId: string, battleRewards?: BattleRewards) {
    const quest = QUESTS[questId];
    if (!quest || this.state.completedQuestIds.includes(questId)) return;
    const rewards = quest.rewards;
    if (rewards.gold) {
      if (battleRewards) battleRewards.gold += rewards.gold;
      else this.state.player.gold += rewards.gold;
    }
    for (const flag of rewards.flags ?? []) {
      this.state.questFlags[flag] = true;
      if (battleRewards && !battleRewards.flags.includes(flag)) battleRewards.flags.push(flag);
    }
    for (const itemId of rewards.items ?? []) {
      if (battleRewards) battleRewards.items.push({ itemId, quantity: 1 });
      else this.addInventory(itemId, 1);
    }
    for (const spellId of rewards.spells ?? []) {
      if (!this.state.player.spells.includes(spellId)) this.state.player.spells.push(spellId);
    }
    this.completeQuest(questId);
  }

  private syncProgressionRoutes() {
    const flags = this.state.questFlags;
    if (flags.banditCaptainDefeated) flags.routeToLumaireUnlocked = true;
    if (flags.mireWardenDefeated) flags.routeToIronmarchUnlocked = true;
    if (flags.ironCastellanDefeated) flags.routeToSunspireUnlocked = true;
  }

  private questIdForVictoryFlag(flag: string) {
    const quests: Record<string, string> = {
      banditCaptainDefeated: 'road_seal',
      mireWardenDefeated: 'shrine_lumen',
      ironCastellanDefeated: 'iron_writ',
      hollowRegentDefeated: 'eclipse_key'
    };
    return quests[flag] ?? null;
  }

  private addInventory(itemId: string, quantity: number) {
    const item = ITEMS[itemId];
    if (item?.keyItem || item?.category === 'keyItem') {
      this.state.keyItems[itemId] = true;
      return;
    }
    this.state.inventory[itemId] = (this.state.inventory[itemId] ?? 0) + quantity;
  }

  private addLog(text: string) {
    this.state.gameLog.unshift(text);
    this.state.gameLog = this.state.gameLog.slice(0, 18);
  }

  private refreshPlayerStats() {
    const stats = computeEffectiveStats(this.state);
    this.state.player.stats.maxHp = stats.maxHp;
    this.state.player.stats.maxMp = stats.maxMp;
    this.state.player.stats.attack = stats.attack;
    this.state.player.stats.defense = stats.defense;
    this.state.player.stats.speed = stats.speed;
    this.state.player.stats.magic = stats.magic;
    this.state.player.stats.hp = Math.min(this.state.player.stats.hp, stats.maxHp);
    this.state.player.stats.mp = Math.min(this.state.player.stats.mp, stats.maxMp);
  }

  private fullHeal() {
    const stats = computeEffectiveStats(this.state);
    this.state.player.stats.hp = stats.maxHp;
    this.state.player.stats.mp = stats.maxMp;
    this.refreshPlayerStats();
  }

  private loadRuntimeEnemies(mapId: string) {
    const map = MAPS[mapId];
    const mapState = this.mapState(mapId);
    const enemies = map.enemies
      .filter((enemy) => {
        if (enemy.hiddenUntilFlag && !this.state.questFlags[enemy.hiddenUntilFlag]) return false;
        if (enemy.requiresFlag && !this.state.questFlags[enemy.requiresFlag]) return false;
        if (enemy.respawn === 'never' && mapState.defeatedEnemies[enemy.id]) return false;
        return true;
      })
      .map((enemy) => ({
        ...cloneData(enemy),
        worldX: enemy.x * TILE_SIZE + TILE_SIZE / 2,
        worldY: enemy.y * TILE_SIZE + TILE_SIZE / 2,
        state: 'wandering' as const,
        wanderTimerMs: 0,
        targetX: enemy.x * TILE_SIZE + TILE_SIZE / 2,
        targetY: enemy.y * TILE_SIZE + TILE_SIZE / 2,
        cooldownMs: 0
      }));
    this.runtimeEnemiesByMap.set(mapId, enemies);
  }

  private updateEnemies(deltaMs: number) {
    for (const enemy of this.runtimeEnemies) {
      if (enemy.cooldownMs > 0) {
        enemy.cooldownMs -= deltaMs;
        continue;
      }
      if (enemy.behavior === 'bossEntity' || enemy.boss) {
        enemy.worldX = enemy.home.x * TILE_SIZE + TILE_SIZE / 2;
        enemy.worldY = enemy.home.y * TILE_SIZE + TILE_SIZE / 2;
        enemy.state = 'wandering';
        continue;
      }
      const dxToPlayer = this.state.player.worldX - enemy.worldX;
      const dyToPlayer = this.state.player.worldY - enemy.worldY;
      const distanceToPlayer = Math.hypot(dxToPlayer, dyToPlayer) / TILE_SIZE;
      if (enemy.behavior !== 'passiveWanderer' && distanceToPlayer <= enemy.aggroRadius) {
        enemy.state = 'chasing';
        this.moveEnemyToward(enemy, this.state.player.worldX, this.state.player.worldY, deltaMs);
        continue;
      }
      const homeX = enemy.home.x * TILE_SIZE + TILE_SIZE / 2;
      const homeY = enemy.home.y * TILE_SIZE + TILE_SIZE / 2;
      const distanceFromHome = Math.hypot(enemy.worldX - homeX, enemy.worldY - homeY) / TILE_SIZE;
      if (distanceFromHome > enemy.roamingRadius) {
        enemy.state = 'returning';
        this.moveEnemyToward(enemy, homeX, homeY, deltaMs);
        continue;
      }
      enemy.state = 'wandering';
      enemy.wanderTimerMs -= deltaMs;
      if (enemy.wanderTimerMs <= 0) {
        enemy.wanderTimerMs = 900 + Math.random() * 1300;
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * enemy.roamingRadius * TILE_SIZE;
        enemy.targetX = homeX + Math.cos(angle) * radius;
        enemy.targetY = homeY + Math.sin(angle) * radius;
      }
      this.moveEnemyToward(enemy, enemy.targetX, enemy.targetY, deltaMs);
    }
  }

  private moveEnemyToward(enemy: RuntimeEnemy, targetX: number, targetY: number, deltaMs: number) {
    const vector = normalizeMovement(targetX - enemy.worldX, targetY - enemy.worldY);
    if (!vector.x && !vector.y) return;
    const speed = PLAYER_SPEED * enemy.moveSpeed;
    const nextX = enemy.worldX + vector.x * speed * (deltaMs / 1000);
    const nextY = enemy.worldY + vector.y * speed * (deltaMs / 1000);
    if (!this.isEnemyBlockedAt(nextX, enemy.worldY)) enemy.worldX = nextX;
    if (!this.isEnemyBlockedAt(enemy.worldX, nextY)) enemy.worldY = nextY;
  }

  private isEnemyBlockedAt(worldX: number, worldY: number) {
    const foot: Rect = { x: worldX - 7, y: worldY + 4, width: 14, height: 10 };
    if (foot.x < 0 || foot.y < 0 || foot.x + foot.width > this.map.width * TILE_SIZE || foot.y + foot.height > this.map.height * TILE_SIZE) return true;
    const { x, y } = pointTile(worldX, worldY + 8);
    for (const layerName of ['ground', 'lowerObject', 'upperObject'] as const) {
      const placed = this.map.layers[layerName][y]?.[x];
      if (placed && this.tileBlocks(placed, tileRect(x, y), foot)) return true;
    }
    return false;
  }

  private checkEnemyContact() {
    if (this.pendingBattle) return;
    const playerFoot: Rect = { x: this.state.player.worldX - 8, y: this.state.player.worldY + 2, width: 16, height: 14 };
    const enemy = this.runtimeEnemies.find((candidate) => {
      if (candidate.cooldownMs > 0) return false;
      const enemyFoot: Rect = { x: candidate.worldX - 10, y: candidate.worldY - 10, width: 20, height: 22 };
      return rectsOverlap(playerFoot, enemyFoot);
    });
    if (!enemy) return;
    this.pendingBattle = {
      mapId: this.state.currentMapId,
      enemyEntityId: enemy.id,
      encounterId: enemy.encounterId,
      backdrop: this.map.battleBackdrop
    };
  }

  private currentEncounterRegion() {
    const map = this.map;
    const { x, y } = pointTile(this.state.player.worldX, this.state.player.worldY + 8);
    return (
      map.regions.find(
        (region) => region.type === 'encounterZone' && region.encounterTable && boundsContainsTile(region.bounds, x, y)
      ) ?? null
    );
  }

  private checkRandomEncounter(deltaMs: number) {
    if (this.pendingBattle || this.randomEncounterCooldownMs > 0 || !this.state.player.moving) {
      this.randomEncounterMeter = Math.max(0, this.randomEncounterMeter - deltaMs * 0.12);
      return;
    }
    const region = this.currentEncounterRegion();
    if (!region?.encounterTable) {
      this.randomEncounterMeter = Math.max(0, this.randomEncounterMeter - deltaMs * 0.2);
      return;
    }
    const danger = Math.max(1, region.dangerLevel ?? 1);
    this.randomEncounterMeter += deltaMs * danger;
    const threshold = Math.max(6500, 14000 - danger * 1200);
    if (this.randomEncounterMeter < threshold || Math.random() > 0.36) return;
    this.randomEncounterMeter = 0;
    this.randomEncounterCooldownMs = 5000;
    this.pendingBattle = {
      mapId: this.state.currentMapId,
      enemyEntityId: `random_${region.id}`,
      encounterId: region.encounterTable,
      backdrop: region.battleBackdrop ?? this.map.battleBackdrop
    };
    this.setMessage(this.map.type === 'overworld' ? 'An enemy jumps from the wilds!' : 'An enemy attacks!', 1400);
  }

  private battleTarget(targetId?: string) {
    const battle = this.currentBattle;
    if (!battle) return null;
    return battle.enemies.find((enemy) => enemy.id === targetId && enemy.stats.hp > 0) ?? battle.enemies.find((enemy) => enemy.stats.hp > 0) ?? null;
  }

  private enemyRound(battle: BattleState) {
    const living = battle.enemies.filter((enemy) => enemy.stats.hp > 0).sort((a, b) => b.stats.speed - a.stats.speed);
    for (const actor of living) {
      const definition = ENEMIES[actor.id];
      const action = definition.actions[0];
      const damage =
        action.kind === 'magic'
          ? calculateMagicDamage(actor.stats, battle.player.stats, battle.player.defending, action.power)
          : calculatePhysicalDamage(actor.stats, battle.player.stats, battle.player.defending, action.power);
      battle.player.stats.hp = Math.max(0, battle.player.stats.hp - damage);
      battle.commandLog.push(`${actor.name} uses ${action.label} for ${damage}.`);
      this.battleVisualEvents.push({ type: 'enemyAttack', sourceId: actor.id, actionId: action.id, kind: action.kind });
      if (battle.player.stats.hp <= 0) break;
    }
  }

  private resolveVictory(battle: BattleState) {
    const encounter = ENCOUNTERS[battle.encounterId] as EncounterDefinition;
    const rewards: BattleRewards = { xp: 0, gold: 0, items: [], flags: [], };
    for (const actor of battle.enemies) {
      const definition = ENEMIES[actor.id];
      rewards.xp += definition.xp;
      rewards.gold += definition.gold;
      for (const drop of definition.drops ?? []) {
        if (Math.random() <= drop.chance) rewards.items.push({ itemId: drop.itemId, quantity: drop.quantity ?? 1 });
      }
    }
    if (encounter.questFlagOnVictory) {
      this.state.questFlags[encounter.questFlagOnVictory] = true;
      rewards.flags.push(encounter.questFlagOnVictory);
      const questId = this.questIdForVictoryFlag(encounter.questFlagOnVictory);
      if (questId) this.completeQuestWithRewards(questId, rewards);
    }
    if (encounter.keyItemOnVictory) {
      this.addInventory(encounter.keyItemOnVictory, 1);
      rewards.items.push({ itemId: encounter.keyItemOnVictory, quantity: 1 });
    }
    this.state.player.gold += rewards.gold;
    this.gainXp(rewards.xp);
    for (const item of rewards.items) this.addInventory(item.itemId, item.quantity);
    if (encounter.endingOnVictory) {
      this.state.endingReached = true;
      this.state.questFlags.mainGameComplete = true;
      this.completeQuest('eclipse_key');
    }
    battle.rewards = rewards;
    battle.phase = 'victory';
    battle.commandLog.push(`Victory! Gained ${rewards.xp} XP and ${rewards.gold}g.`);
    this.addLog(`Won ${encounter.name}.`);
    const source = this.pendingBattle;
    if (source) this.mapState(source.mapId).defeatedEnemies[source.enemyEntityId] = true;
  }

  private gainXp(amount: number) {
    this.state.player.xp += amount;
    while (this.state.player.xp >= this.state.player.xpToNext) {
      this.state.player.xp -= this.state.player.xpToNext;
      this.state.player.level += 1;
      this.state.player.baseStats.maxHp += 9;
      this.state.player.baseStats.maxMp += 4;
      this.state.player.baseStats.attack += 2;
      this.state.player.baseStats.defense += 2;
      this.state.player.baseStats.speed += this.state.player.level % 2 === 0 ? 1 : 0;
      this.state.player.baseStats.magic += 2;
      this.state.player.xpToNext = xpForLevel(this.state.player.level);
      this.fullHeal();
      this.addLog(`Level ${this.state.player.level}! Stats increased.`);
    }
    this.refreshPlayerStats();
  }

  private cooldownSourceEnemy(ms: number) {
    if (!this.pendingBattle) return;
    this.randomEncounterCooldownMs = Math.max(this.randomEncounterCooldownMs, ms);
    const enemy = this.runtimeEnemies.find((candidate) => candidate.id === this.pendingBattle?.enemyEntityId);
    if (enemy) enemy.cooldownMs = ms;
  }

  private removeSourceEnemy() {
    if (!this.pendingBattle) return;
    const source = this.pendingBattle;
    if (source.enemyEntityId.startsWith('random_')) {
      this.randomEncounterCooldownMs = Math.max(this.randomEncounterCooldownMs, 4500);
      return;
    }
    const enemies = this.runtimeEnemiesByMap.get(source.mapId) ?? [];
    this.runtimeEnemiesByMap.set(
      source.mapId,
      enemies.filter((enemy) => enemy.id !== source.enemyEntityId)
    );
  }
}

let singleton: GameEngine | null = null;

export const getGameEngine = () => {
  singleton ??= new GameEngine();
  return singleton;
};

export const resetGameEngineForTests = () => {
  singleton = new GameEngine(createInitialState());
  return singleton;
};
