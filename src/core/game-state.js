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
    const saveMetadata = state.saveMetadata ?? {};
    const settings = state.settings ?? {};

    this.inventory = inventory.map((item) => cloneValue(item));
    this.stats = { ...createDefaultStats(), ...stats };
    this.equipment = { ...createDefaultEquipment(), ...equipment };
    this.skills = new Set(Array.isArray(skills) ? skills : []);
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

  getSnapshot() {
    return {
      player: this.playerState.getSnapshot(),
    };
  }

  reset(options = {}) {
    this.playerState.reset(options);

    if (options.emit !== false) {
      this._emit('reset', this.getSnapshot());
    }
  }
}

export const gameState = GameState.getInstance();
