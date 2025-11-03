const DEFAULT_ATTRIBUTES = Object.freeze({
  strength: 10,
  agility: 10,
  vitality: 10,
  spirit: 10,
  luck: 10,
});

const toFiniteNumber = (value, fallback = 0) => {
  if (value === null || value === undefined) {
    return fallback;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const cloneAttributes = (attributes) => {
  if (!attributes || typeof attributes !== 'object') {
    return { ...DEFAULT_ATTRIBUTES };
  }

  return {
    ...DEFAULT_ATTRIBUTES,
    ...Object.entries(attributes).reduce((acc, [key, value]) => {
      const fallback = DEFAULT_ATTRIBUTES[key] ?? 0;
      acc[key] = toFiniteNumber(value, fallback);
      return acc;
    }, {}),
  };
};

const clamp = (value, min, max) => {
  if (!Number.isFinite(value)) {
    return min;
  }

  if (Number.isFinite(min) && value < min) {
    return min;
  }

  if (Number.isFinite(max) && value > max) {
    return max;
  }

  return value;
};

const createCustomEvent = (type, detail) => {
  if (typeof CustomEvent === 'function') {
    return new CustomEvent(type, { detail });
  }

  if (typeof Event === 'function') {
    const event = new Event(type);
    event.detail = detail;
    return event;
  }

  return { type, detail };
};

export class GameState extends EventTarget {
  #state;

  constructor(initialState = {}) {
    super();

    const {
      level = 1,
      experience = {},
      hp = {},
      mp = {},
      attributes = {},
      conditions = [],
    } = initialState ?? {};

    this.#state = {
      level: Math.max(1, toFiniteNumber(level, 1)),
      experience: {
        current: Math.max(0, toFiniteNumber(experience?.current, 0)),
        nextLevel: Math.max(1, toFiniteNumber(experience?.nextLevel, 100)),
      },
      hp: {
        current: Math.max(0, toFiniteNumber(hp?.current, 0)),
        max: Math.max(1, toFiniteNumber(hp?.max, 1)),
      },
      mp: {
        current: Math.max(0, toFiniteNumber(mp?.current, 0)),
        max: Math.max(0, toFiniteNumber(mp?.max, 0)),
      },
      attributes: cloneAttributes(attributes),
      conditions: Array.isArray(conditions) ? [...new Set(conditions)] : [],
    };

    this.#state.hp.current = clamp(this.#state.hp.current, 0, this.#state.hp.max);
    this.#state.mp.current = clamp(this.#state.mp.current, 0, this.#state.mp.max);
  }

  getSnapshot() {
    return {
      level: this.#state.level,
      experience: { ...this.#state.experience },
      hp: { ...this.#state.hp },
      mp: { ...this.#state.mp },
      attributes: { ...this.#state.attributes },
      conditions: [...this.#state.conditions],
    };
  }

  onChange(listener) {
    if (typeof listener !== 'function') {
      return () => {};
    }

    const handler = (event) => {
      listener(event?.detail ?? this.getSnapshot());
    };

    this.addEventListener('change', handler);

    return () => {
      this.removeEventListener('change', handler);
    };
  }

  setLevel(level) {
    const next = Math.max(1, toFiniteNumber(level, this.#state.level));
    if (next === this.#state.level) {
      return this.getSnapshot();
    }

    this.#state.level = next;
    return this.#emitChange();
  }

  gainExperience(amount) {
    const delta = toFiniteNumber(amount, 0);
    if (delta === 0) {
      return this.getSnapshot();
    }

    this.#state.experience.current = Math.max(0, this.#state.experience.current + delta);
    return this.#emitChange();
  }

  setExperience({ current, nextLevel }) {
    const next = {
      current: Math.max(0, toFiniteNumber(current, this.#state.experience.current)),
      nextLevel: Math.max(1, toFiniteNumber(nextLevel, this.#state.experience.nextLevel)),
    };

    const prev = this.#state.experience;
    if (prev.current === next.current && prev.nextLevel === next.nextLevel) {
      return this.getSnapshot();
    }

    this.#state.experience = next;
    return this.#emitChange();
  }

  setHP({ current, max } = {}) {
    const nextMax = Math.max(1, toFiniteNumber(max, this.#state.hp.max));
    const nextCurrent = clamp(
      toFiniteNumber(current, this.#state.hp.current),
      0,
      nextMax,
    );

    const prev = this.#state.hp;
    if (prev.current === nextCurrent && prev.max === nextMax) {
      return this.getSnapshot();
    }

    this.#state.hp = { current: nextCurrent, max: nextMax };
    return this.#emitChange();
  }

  modifyHP(delta) {
    const change = toFiniteNumber(delta, 0);
    if (change === 0) {
      return this.getSnapshot();
    }

    const nextCurrent = clamp(this.#state.hp.current + change, 0, this.#state.hp.max);
    if (nextCurrent === this.#state.hp.current) {
      return this.getSnapshot();
    }

    this.#state.hp = { ...this.#state.hp, current: nextCurrent };
    return this.#emitChange();
  }

  setMP({ current, max } = {}) {
    const nextMax = Math.max(0, toFiniteNumber(max, this.#state.mp.max));
    const nextCurrent = clamp(
      toFiniteNumber(current, this.#state.mp.current),
      0,
      nextMax,
    );

    const prev = this.#state.mp;
    if (prev.current === nextCurrent && prev.max === nextMax) {
      return this.getSnapshot();
    }

    this.#state.mp = { current: nextCurrent, max: nextMax };
    return this.#emitChange();
  }

  modifyMP(delta) {
    const change = toFiniteNumber(delta, 0);
    if (change === 0) {
      return this.getSnapshot();
    }

    const nextCurrent = clamp(this.#state.mp.current + change, 0, this.#state.mp.max);
    if (nextCurrent === this.#state.mp.current) {
      return this.getSnapshot();
    }

    this.#state.mp = { ...this.#state.mp, current: nextCurrent };
    return this.#emitChange();
  }

  setAttributes(nextAttributes = {}) {
    const merged = cloneAttributes(nextAttributes);
    const prev = this.#state.attributes;

    const changed = Object.keys({ ...prev, ...merged }).some(
      (key) => prev[key] !== merged[key],
    );

    if (!changed) {
      return this.getSnapshot();
    }

    this.#state.attributes = merged;
    return this.#emitChange();
  }

  updateAttributes(partial = {}) {
    if (!partial || typeof partial !== 'object') {
      return this.getSnapshot();
    }

    const next = { ...this.#state.attributes };
    let changed = false;

    Object.entries(partial).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') {
        return;
      }

      const numeric = Number(value);
      if (!Number.isFinite(numeric)) {
        return;
      }

      if (next[key] !== numeric) {
        next[key] = numeric;
        changed = true;
      }
    });

    if (!changed) {
      return this.getSnapshot();
    }

    this.#state.attributes = next;
    return this.#emitChange();
  }

  addCondition(condition) {
    if (!condition) {
      return this.getSnapshot();
    }

    const exists = this.#state.conditions.includes(condition);
    if (exists) {
      return this.getSnapshot();
    }

    this.#state.conditions = [...this.#state.conditions, condition];
    return this.#emitChange();
  }

  removeCondition(condition) {
    if (!condition) {
      return this.getSnapshot();
    }

    const next = this.#state.conditions.filter((entry) => entry !== condition);
    if (next.length === this.#state.conditions.length) {
      return this.getSnapshot();
    }

    this.#state.conditions = next;
    return this.#emitChange();
  }

  clearConditions() {
    if (this.#state.conditions.length === 0) {
      return this.getSnapshot();
    }

    this.#state.conditions = [];
    return this.#emitChange();
  }

  #emitChange() {
    const snapshot = this.getSnapshot();
    this.dispatchEvent(createCustomEvent('change', snapshot));
    return snapshot;
  }
}
