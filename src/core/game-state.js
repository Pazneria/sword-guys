const DEFAULT_MOVEMENT_BINDINGS = Object.freeze({
  up: ['ArrowUp', 'w', 'W'],
  down: ['ArrowDown', 's', 'S'],
  left: ['ArrowLeft', 'a', 'A'],
  right: ['ArrowRight', 'd', 'D'],
  upRight: [],
  upLeft: [],
  downRight: [],
  downLeft: [],
});

const DEFAULT_ACTION_BINDINGS = Object.freeze({
  interact: ['Enter', ' '],
  menu: ['Escape'],
});

const DEFAULT_SETTINGS = Object.freeze({
  audio: {
    masterVolume: 1,
    musicVolume: 0.8,
    sfxVolume: 0.9,
    muteAll: false,
  },
  keybindings: {
    movement: DEFAULT_MOVEMENT_BINDINGS,
    actions: DEFAULT_ACTION_BINDINGS,
  },
  accessibility: {
    subtitles: true,
    highContrast: false,
    reduceMotion: false,
    screenShake: true,
  },
});

const DEFAULT_STORAGE_KEY = 'sword-guys.settings';

const LETTER_PATTERN = /^[a-z]$/i;

const clone = (value) => {
  if (typeof globalThis.structuredClone === 'function') {
    return globalThis.structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value));
};

const isPlainObject = (value) =>
  value != null && typeof value === 'object' && !Array.isArray(value);

const clamp = (value, min, max) => {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    return min;
  }

  return Math.min(max, Math.max(min, numeric));
};

const mergeWithTemplate = (template, base = {}, patch = {}) => {
  const result = {};
  const baseSource = isPlainObject(base) ? base : {};
  const patchSource = isPlainObject(patch) ? patch : {};

  Object.keys(template).forEach((key) => {
    const templateValue = template[key];
    const baseValue = baseSource[key];
    const patchHasKey = Object.prototype.hasOwnProperty.call(patchSource, key);
    const patchValue = patchSource[key];

    if (Array.isArray(templateValue)) {
      if (patchHasKey && Array.isArray(patchValue)) {
        result[key] = patchValue.slice();
      } else if (Array.isArray(baseValue)) {
        result[key] = baseValue.slice();
      } else {
        result[key] = templateValue.slice();
      }
      return;
    }

    if (isPlainObject(templateValue)) {
      const nextBase = isPlainObject(baseValue) ? baseValue : templateValue;
      const nextPatch = isPlainObject(patchValue) ? patchValue : {};
      result[key] = mergeWithTemplate(templateValue, nextBase, nextPatch);
      return;
    }

    if (patchHasKey && patchValue !== undefined) {
      result[key] = patchValue;
    } else if (baseValue !== undefined) {
      result[key] = baseValue;
    } else {
      result[key] = templateValue;
    }
  });

  return result;
};

const normalizeKeyList = (input, fallback = []) => {
  const normalized = [];
  const seen = new Set();

  const addKey = (key) => {
    if (!key || seen.has(key)) {
      return;
    }

    seen.add(key);
    normalized.push(key);
  };

  const source = Array.isArray(input)
    ? input
    : typeof input === 'string'
    ? input.split(',')
    : [];

  source
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter((entry) => entry.length > 0)
    .forEach((entry) => {
      addKey(entry);
      if (LETTER_PATTERN.test(entry)) {
        const alternate = entry === entry.toLowerCase() ? entry.toUpperCase() : entry.toLowerCase();
        addKey(alternate);
      }
    });

  if (!normalized.length) {
    fallback.forEach((entry) => addKey(entry));
  }

  return normalized;
};

const normalizeMovementBindings = (bindings) => {
  const defaults = DEFAULT_SETTINGS.keybindings.movement;
  const source = isPlainObject(bindings) ? bindings : {};
  const normalized = {};

  Object.keys(defaults).forEach((direction) => {
    normalized[direction] = normalizeKeyList(source[direction], defaults[direction]);
  });

  return normalized;
};

const normalizeActionBindings = (bindings) => {
  const defaults = DEFAULT_SETTINGS.keybindings.actions;
  const source = isPlainObject(bindings) ? bindings : {};
  const normalized = {};

  Object.keys(defaults).forEach((action) => {
    normalized[action] = normalizeKeyList(source[action], defaults[action]);
  });

  return normalized;
};

const normalizeAccessibility = (accessibility) => {
  const defaults = DEFAULT_SETTINGS.accessibility;
  const source = isPlainObject(accessibility) ? accessibility : {};
  const normalized = {};

  Object.keys(defaults).forEach((key) => {
    const value = source[key];
    normalized[key] = typeof value === 'boolean' ? value : defaults[key];
  });

  return normalized;
};

const normalizeAudio = (audio) => {
  const defaults = DEFAULT_SETTINGS.audio;
  const source = isPlainObject(audio) ? audio : {};
  const normalized = {};

  Object.keys(defaults).forEach((key) => {
    const defaultValue = defaults[key];
    const provided = source[key];

    if (typeof defaultValue === 'number') {
      let numeric = null;
      if (typeof provided === 'number' && Number.isFinite(provided)) {
        numeric = provided;
      } else if (typeof provided === 'string' && provided.trim().length > 0) {
        const parsed = Number(provided);
        if (!Number.isNaN(parsed)) {
          numeric = parsed;
        }
      }

      normalized[key] = numeric == null ? defaultValue : clamp(numeric, 0, 1);
      return;
    }

    if (typeof defaultValue === 'boolean') {
      normalized[key] = typeof provided === 'boolean' ? provided : defaultValue;
      return;
    }

    normalized[key] = provided ?? defaultValue;
  });

  return normalized;
};

const extractSettings = (candidate) => {
  if (!isPlainObject(candidate)) {
    return null;
  }

  if (isPlainObject(candidate.settings)) {
    return candidate.settings;
  }

  return candidate;
};

export class GameState {
  constructor({ storageKey = DEFAULT_STORAGE_KEY, storage, saveManager } = {}) {
    this.storageKey = storageKey;
    this.storage = storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
    this.saveManager = saveManager ?? null;

    this.state = {
      settings: this.#normalizeSettings({}, DEFAULT_SETTINGS),
    };

    this.subscribers = new Set();
    this.initialized = false;
  }

  static get DEFAULT_SETTINGS() {
    return clone(DEFAULT_SETTINGS);
  }

  static get DEFAULT_STORAGE_KEY() {
    return DEFAULT_STORAGE_KEY;
  }

  async initialize() {
    await this.loadSettings();
    this.initialized = true;
    return this.getSettings();
  }

  getState() {
    return {
      settings: clone(this.state.settings),
    };
  }

  getSettings() {
    return clone(this.state.settings);
  }

  async loadSettings() {
    const persisted = await this.#loadPersistedSettings();
    if (persisted) {
      this.state.settings = this.#normalizeSettings(persisted, this.state.settings);
    } else {
      this.state.settings = this.#normalizeSettings({}, this.state.settings);
    }

    this.#notifySubscribers('settings', this.state.settings);
    return this.getSettings();
  }

  previewSettings(update = {}) {
    return this.#normalizeSettings(update, this.state.settings);
  }

  async updateSettings(update = {}, { persist = true } = {}) {
    this.state.settings = this.#normalizeSettings(update, this.state.settings);
    this.#notifySubscribers('settings', this.state.settings);

    if (persist) {
      await this.persistSettings();
    }

    return this.getSettings();
  }

  async resetSettings({ persist = true } = {}) {
    this.state.settings = this.#normalizeSettings({}, DEFAULT_SETTINGS);
    this.#notifySubscribers('settings', this.state.settings);

    if (persist) {
      await this.persistSettings();
    }

    return this.getSettings();
  }

  async persistSettings() {
    const payload = { settings: this.state.settings };

    if (this.saveManager?.save) {
      try {
        await this.saveManager.save(this.storageKey, clone(payload));
        return this.getSettings();
      } catch (error) {
        // Swallow persistence errors to avoid crashing the game loop.
      }
    }

    if (this.storage?.setItem) {
      try {
        this.storage.setItem(this.storageKey, JSON.stringify(payload));
      } catch (error) {
        // Ignore storage errors (e.g., quota exceeded or unavailable).
      }
    }

    return this.getSettings();
  }

  subscribe(callback) {
    if (typeof callback !== 'function') {
      return () => {};
    }

    this.subscribers.add(callback);

    return () => {
      this.subscribers.delete(callback);
    };
  }

  async #loadPersistedSettings() {
    if (this.saveManager?.load) {
      try {
        const loaded = await this.saveManager.load(this.storageKey);
        const extracted = extractSettings(loaded);
        if (extracted) {
          return extracted;
        }
      } catch (error) {
        // Ignore persistence load failures and fallback to defaults.
      }
    }

    if (this.storage?.getItem) {
      try {
        const raw = this.storage.getItem(this.storageKey);
        if (!raw) {
          return null;
        }

        const parsed = JSON.parse(raw);
        return extractSettings(parsed);
      } catch (error) {
        return null;
      }
    }

    return null;
  }

  #notifySubscribers(section, value) {
    if (!this.subscribers.size) {
      return;
    }

    const snapshot = this.getState();
    const detail = {
      section,
      value: clone(value),
    };

    this.subscribers.forEach((callback) => {
      try {
        callback(snapshot, detail);
      } catch (error) {
        // Prevent subscriber failures from bubbling up.
        console.error('GameState subscriber error', error);
      }
    });
  }

  #normalizeSettings(update = {}, base = this.state.settings) {
    const baseSettings = isPlainObject(base) ? base : DEFAULT_SETTINGS;
    const merged = mergeWithTemplate(DEFAULT_SETTINGS, baseSettings, update);

    return {
      audio: normalizeAudio(merged.audio),
      keybindings: {
        movement: normalizeMovementBindings(merged.keybindings?.movement),
        actions: normalizeActionBindings(merged.keybindings?.actions),
      },
      accessibility: normalizeAccessibility(merged.accessibility),
    };
  }
}
