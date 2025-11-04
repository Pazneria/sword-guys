const cloneValue = (value) => {
  if (Array.isArray(value)) {
    return value.map((entry) => cloneValue(entry));
  }

  if (value && typeof value === 'object') {
    return { ...value };
  }

  return value;
};

const createDefaultStats = () => ({
  health: 100,
  maxHealth: 100,
  mana: 50,
  maxMana: 50,
  strength: 10,
  agility: 10,
  intelligence: 10,
  defense: 5,
  level: 1,
  experience: 0,
});

const createDefaultEquipment = () => ({
  weapon: null,
  armor: null,
  accessory: null,
});

const createDefaultSettings = () => ({
  volume: 0.7,
  difficulty: 'normal',
  showSubtitles: true,
  language: 'en',
});

const createDefaultSaveMetadata = () => ({
  slot: 1,
  lastSavedAt: null,
  lastLocation: null,
  playTime: 0,
});

const normalizeSceneId = (sceneId) => {
  if (typeof sceneId !== 'string') {
    return null;
  }

  const trimmed = sceneId.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const clonePosition = (position) => {
  if (
    !position ||
    typeof position !== 'object' ||
    !Number.isFinite(position.x) ||
    !Number.isFinite(position.y)
  ) {
    return null;
  }

  return { x: position.x, y: position.y };
};

class ObservableState {
  constructor() {
    this._listeners = new Map();
  }

  subscribe(event, listener) {
    if (typeof listener !== 'function') {
      throw new TypeError('listener must be a function');
    }

    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }

    const listeners = this._listeners.get(event);
    listeners.add(listener);

    return () => this.unsubscribe(event, listener);
  }

  unsubscribe(event, listener) {
    const listeners = this._listeners.get(event);
    if (!listeners) {
      return;
    }

    listeners.delete(listener);

    if (listeners.size === 0) {
      this._listeners.delete(event);
    }
  }

  _emit(event, payload) {
    const listeners = this._listeners.get(event);
    if (!listeners || listeners.size === 0) {
      return;
    }

    [...listeners].forEach((listener) => {
      listener(payload);
    });
  }
}

export class PlayerState extends ObservableState {
  constructor(initialState = {}) {
    super();

    this.inventory = [];
    this.stats = createDefaultStats();
    this.equipment = createDefaultEquipment();
    this.skills = new Set();
    this.conditions = [];
    this.saveMetadata = createDefaultSaveMetadata();
    this.settings = createDefaultSettings();

    if (initialState) {
      this.reset({ initialState, emit: false });
    }
  }

  #emitChange(type, detail) {
    const payload = {
      type,
      detail,
      snapshot: this.getSnapshot(),
    };

    this._emit(type, detail);
    this._emit('change', payload);
  }

  reset({ emit = true, initialState = null } = {}) {
    const state = initialState ?? {};

    const stats = state.stats ?? {};
    const inventory = state.inventory ?? [];
    const equipment = state.equipment ?? {};
    const skills = state.skills ?? [];
    const conditions = state.conditions ?? [];
    const saveMetadata = state.saveMetadata ?? {};
    const settings = state.settings ?? {};

    this.inventory = inventory.map((item) => cloneValue(item));
    this.stats = { ...createDefaultStats(), ...stats };
    this.equipment = { ...createDefaultEquipment(), ...equipment };
    this.skills = new Set(Array.isArray(skills) ? skills : []);
    this.conditions = Array.isArray(conditions)
      ? conditions
          .map((condition) => (condition == null ? null : `${condition}`.trim()))
          .filter((condition) => condition && condition.length > 0)
      : [];
    this.saveMetadata = {
      ...createDefaultSaveMetadata(),
      ...saveMetadata,
      lastLocation: saveMetadata.lastLocation ? { ...saveMetadata.lastLocation } : null,
    };
    this.settings = { ...createDefaultSettings(), ...settings };

    if (emit) {
      this.#emitChange('reset', { snapshot: this.getSnapshot() });
    }
  }

  getSnapshot() {
    return {
      inventory: this.inventory.map((item) => cloneValue(item)),
      stats: { ...this.stats },
      equipment: { ...this.equipment },
      skills: [...this.skills],
      conditions: [...this.conditions],
      saveMetadata: {
        ...this.saveMetadata,
        lastLocation: this.saveMetadata.lastLocation
          ? { ...this.saveMetadata.lastLocation }
          : null,
      },
      settings: { ...this.settings },
    };
  }

  getStats() {
    return { ...this.stats };
  }

  getInventory() {
    return this.inventory.map((item) => cloneValue(item));
  }

  getEquipment() {
    return { ...this.equipment };
  }

  getSkills() {
    return [...this.skills];
  }

  getConditions() {
    return [...this.conditions];
  }

  getSettings() {
    return { ...this.settings };
  }

  getSaveMetadata() {
    return {
      ...this.saveMetadata,
      lastLocation: this.saveMetadata.lastLocation
        ? { ...this.saveMetadata.lastLocation }
        : null,
    };
  }

  getLastKnownLocation() {
    const location = this.saveMetadata.lastLocation;
    return location ? { ...location } : null;
  }

  updateStats(partialStats = {}) {
    if (!partialStats || typeof partialStats !== 'object') {
      return this.getStats();
    }

    this.stats = { ...this.stats, ...partialStats };
    const detail = {
      stats: this.getStats(),
      partial: { ...partialStats },
    };

    this.#emitChange('stats', detail);
    return detail.stats;
  }

  addItem(item) {
    const entry = cloneValue(item);
    this.inventory.push(entry);

    const detail = {
      added: cloneValue(entry),
      inventory: this.getInventory(),
    };

    this.#emitChange('inventory', detail);
    return detail.inventory;
  }

  removeItem(predicateOrItem) {
    if (predicateOrItem == null) {
      return null;
    }

    const predicate =
      typeof predicateOrItem === 'function'
        ? predicateOrItem
        : (entry) => entry === predicateOrItem;

    const index = this.inventory.findIndex(predicate);
    if (index === -1) {
      return null;
    }

    const [removed] = this.inventory.splice(index, 1);
    const detail = {
      removed: cloneValue(removed),
      inventory: this.getInventory(),
    };

    this.#emitChange('inventory', detail);
    return removed;
  }

  equipItem(slot, item) {
    if (typeof slot !== 'string' || slot.length === 0) {
      throw new TypeError('slot must be a non-empty string');
    }

    const value = item == null ? null : cloneValue(item);
    this.equipment[slot] = value;

    const detail = {
      slot,
      item: value == null ? null : cloneValue(value),
      equipment: this.getEquipment(),
    };

    this.#emitChange('equipment', detail);
    return detail.equipment;
  }

  unequipItem(slot) {
    if (typeof slot !== 'string' || slot.length === 0) {
      throw new TypeError('slot must be a non-empty string');
    }

    if (!(slot in this.equipment)) {
      return null;
    }

    const removed = this.equipment[slot];
    this.equipment[slot] = null;

    const detail = {
      slot,
      item: null,
      removed: removed == null ? null : cloneValue(removed),
      equipment: this.getEquipment(),
    };

    this.#emitChange('equipment', detail);
    return removed;
  }

  learnSkill(skill) {
    if (!skill) {
      return false;
    }

    if (this.skills.has(skill)) {
      return false;
    }

    this.skills.add(skill);

    const detail = {
      skill,
      skills: this.getSkills(),
    };

    this.#emitChange('skills', detail);
    return true;
  }

  forgetSkill(skill) {
    if (!skill || !this.skills.has(skill)) {
      return false;
    }

    this.skills.delete(skill);

    const detail = {
      skill,
      skills: this.getSkills(),
    };

    this.#emitChange('skills', detail);
    return true;
  }

  addCondition(condition) {
    if (condition == null) {
      return false;
    }

    const normalized = `${condition}`.trim();
    if (normalized.length === 0 || this.conditions.includes(normalized)) {
      return false;
    }

    this.conditions = [...this.conditions, normalized];

    const detail = {
      condition: normalized,
      conditions: this.getConditions(),
    };

    this.#emitChange('conditions', detail);
    return true;
  }

  removeCondition(condition) {
    if (condition == null) {
      return false;
    }

    const normalized = `${condition}`.trim();
    const index = this.conditions.findIndex((entry) => entry === normalized);
    if (index === -1) {
      return false;
    }

    const removed = this.conditions[index];
    this.conditions = [
      ...this.conditions.slice(0, index),
      ...this.conditions.slice(index + 1),
    ];

    const detail = {
      condition: removed,
      conditions: this.getConditions(),
    };

    this.#emitChange('conditions', detail);
    return true;
  }

  clearConditions() {
    if (this.conditions.length === 0) {
      return false;
    }

    this.conditions = [];

    const detail = {
      conditions: this.getConditions(),
    };

    this.#emitChange('conditions', detail);
    return true;
  }

  updateSaveMetadata(partialMetadata = {}) {
    if (!partialMetadata || typeof partialMetadata !== 'object') {
      return this.getSaveMetadata();
    }

    const updates = { ...partialMetadata };

    if ('lastLocation' in updates) {
      updates.lastLocation =
        updates.lastLocation && typeof updates.lastLocation === 'object'
          ? { ...updates.lastLocation }
          : null;
    }

    this.saveMetadata = { ...this.saveMetadata, ...updates };

    const detail = {
      metadata: this.getSaveMetadata(),
      partial: updates,
    };

    this.#emitChange('saveMetadata', detail);
    return detail.metadata;
  }

  setLastKnownLocation(location) {
    return this.updateSaveMetadata({
      lastLocation:
        location && typeof location === 'object'
          ? { x: location.x ?? 0, y: location.y ?? 0 }
          : null,
    });
  }

  setOption(key, value) {
    if (typeof key !== 'string' || key.length === 0) {
      throw new TypeError('option key must be a non-empty string');
    }

    this.settings = { ...this.settings, [key]: value };

    const detail = {
      key,
      value,
      settings: this.getSettings(),
    };

    this.#emitChange('settings', detail);
    return detail.settings;
  }

  setOptions(options = {}) {
    if (!options || typeof options !== 'object') {
      return this.getSettings();
    }

    this.settings = { ...this.settings, ...options };

    const detail = {
      options: { ...options },
      settings: this.getSettings(),
    };

    this.#emitChange('settings', detail);
    return detail.settings;
  }
}

let instance = null;

export class GameState extends ObservableState {
  constructor() {
    super();

    if (instance) {
      return instance;
    }

    this.playerState = new PlayerState();
    this.playerState.subscribe('change', (change) => {
      this._emit('playerChange', change);
      this._emit('change', {
        type: 'player',
        detail: change,
        snapshot: this.getSnapshot(),
      });
    });

    this.scene = null;
    this.playerPosition = null;

    instance = this;
  }

  static getInstance() {
    if (!instance) {
      instance = new GameState();
    }

    return instance;
  }

  getPlayerState() {
    return this.playerState;
  }

  onChange(listener) {
    if (typeof listener !== 'function') {
      throw new TypeError('listener must be a function');
    }

    return this.subscribe('change', (event) => {
      const snapshot = event?.snapshot ?? this.getSnapshot();
      listener(snapshot);
    });
  }

  getSnapshot() {
    return {
      scene: this.scene,
      playerPosition: this.playerPosition ? { ...this.playerPosition } : null,
      player: this.playerState.getSnapshot(),
    };
  }

  setScene(sceneId, { emit = true } = {}) {
    const next = normalizeSceneId(sceneId);
    const previous = this.scene;
    this.scene = next;

    if (emit && previous !== next) {
      this.#emitSceneChange();
    }

    return this.scene;
  }

  getScene() {
    return this.scene;
  }

  updatePlayerPosition(position, { emit = true } = {}) {
    const next = clonePosition(position);
    const previous = this.playerPosition ? { ...this.playerPosition } : null;

    this.playerPosition = next;

    const changed =
      (previous && (!next || previous.x !== next.x || previous.y !== next.y)) ||
      (!previous && next);

    if (emit && changed) {
      this.#emitPlayerPositionChange();
    }

    return this.playerPosition ? { ...this.playerPosition } : null;
  }

  getPlayerPosition() {
    return this.playerPosition ? { ...this.playerPosition } : null;
  }

  hydrate(snapshot = {}) {
    const state = snapshot && typeof snapshot === 'object' ? snapshot : {};

    const scene = 'scene' in state ? state.scene : null;
    const position = 'playerPosition' in state ? state.playerPosition : null;
    this.setScene(scene, { emit: false });
    this.updatePlayerPosition(position, { emit: false });

    if (state.player) {
      this.playerState.reset({ initialState: state.player });
    } else {
      this.playerState.reset();
    }

    const hydrated = this.getSnapshot();
    this._emit('hydrate', hydrated);
    this._emit('change', { type: 'hydrate', detail: hydrated, snapshot: hydrated });

    return hydrated;
  }

  reset(options = {}) {
    this.playerState.reset(options);

    this.scene = null;
    this.playerPosition = null;

    if (options.emit !== false) {
      this.#emitSceneChange();
      this.#emitPlayerPositionChange();
      this._emit('reset', this.getSnapshot());
    }
  }

  snapshot() {
    return this.getSnapshot();
  }

  #emitSceneChange() {
    const detail = { scene: this.scene };
    this._emit('scene', detail);
    this._emit('change', { type: 'scene', detail, snapshot: this.getSnapshot() });
  }

  #emitPlayerPositionChange() {
    const detail = { position: this.getPlayerPosition() };
    this._emit('playerPosition', detail);
    this._emit('change', {
      type: 'playerPosition',
      detail,
      snapshot: this.getSnapshot(),
    });
  }

  static setScene(sceneId, options) {
    return GameState.getInstance().setScene(sceneId, options);
  }

  static getScene() {
    return GameState.getInstance().getScene();
  }

  static updatePlayerPosition(position, options) {
    return GameState.getInstance().updatePlayerPosition(position, options);
  }

  static getPlayerPosition() {
    return GameState.getInstance().getPlayerPosition();
  }

  static hydrate(snapshot) {
    return GameState.getInstance().hydrate(snapshot);
  }

  static reset(options) {
    return GameState.getInstance().reset(options);
  }

  static snapshot() {
    return GameState.getInstance().snapshot();
  }
}

export const gameState = GameState.getInstance();
GameState.DEFAULT_SETTINGS = Object.freeze(createDefaultSettings());
