const DEFAULT_STORAGE_KEY = 'sword-guys:saves';

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const clone = (value) => {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value));
};

export class SaveManagerError extends Error {
  constructor(message, { cause } = {}) {
    super(message);
    this.name = 'SaveManagerError';

    if (cause) {
      this.cause = cause;
    }
  }
}

export class SaveManager {
  constructor({ storage = globalThis?.localStorage ?? null, storageKey = DEFAULT_STORAGE_KEY } = {}) {
    if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') {
      throw new TypeError('SaveManager requires a storage object that implements getItem and setItem.');
    }

    this.storage = storage;
    this.storageKey = storageKey;
  }

  save(slotId, snapshot, metadataOverrides = {}) {
    const normalizedSlotId = this.#normalizeSlotId(slotId);
    const safeSnapshot = clone(snapshot ?? {});

    const metadata = {
      updatedAt: new Date().toISOString(),
      ...metadataOverrides,
    };

    const state = this.#readState();
    state.slots[normalizedSlotId] = {
      metadata,
      data: safeSnapshot,
    };

    try {
      this.#writeState(state);
    } catch (error) {
      throw new SaveManagerError('Failed to save game data.', { cause: error });
    }

    return { slotId: normalizedSlotId, metadata: clone(metadata) };
  }

  load(slotId) {
    const normalizedSlotId = this.#normalizeSlotId(slotId);
    const state = this.#readState();
    const entry = state.slots[normalizedSlotId];

    if (!entry) {
      return null;
    }

    return clone(entry.data);
  }

  getSlot(slotId) {
    const normalizedSlotId = this.#normalizeSlotId(slotId);
    const state = this.#readState();
    const entry = state.slots[normalizedSlotId];

    if (!entry) {
      return null;
    }

    return {
      slotId: normalizedSlotId,
      metadata: clone(entry.metadata ?? {}),
      data: clone(entry.data),
    };
  }

  delete(slotId) {
    const normalizedSlotId = this.#normalizeSlotId(slotId);
    const state = this.#readState();

    if (!state.slots[normalizedSlotId]) {
      return false;
    }

    delete state.slots[normalizedSlotId];

    try {
      this.#writeState(state);
    } catch (error) {
      throw new SaveManagerError('Failed to delete save slot.', { cause: error });
    }

    return true;
  }

  listSlots() {
    const state = this.#readState();
    const entries = Object.entries(state.slots).map(([slotId, value]) => ({
      slotId,
      metadata: clone(value.metadata ?? {}),
    }));

    entries.sort((a, b) => {
      const timeA = Date.parse(a.metadata.updatedAt ?? 0) || 0;
      const timeB = Date.parse(b.metadata.updatedAt ?? 0) || 0;
      return timeB - timeA;
    });

    return entries;
  }

  clear() {
    try {
      this.storage.removeItem(this.storageKey);
    } catch (error) {
      throw new SaveManagerError('Failed to clear saved data.', { cause: error });
    }
  }

  #normalizeSlotId(slotId) {
    if (typeof slotId !== 'string' || !slotId.trim()) {
      throw new TypeError('slotId must be a non-empty string.');
    }

    return slotId.trim();
  }

  #readState() {
    let raw = null;

    try {
      raw = this.storage.getItem(this.storageKey);
    } catch (error) {
      throw new SaveManagerError('Failed to access saved data.', { cause: error });
    }

    if (!raw) {
      return { version: 1, slots: {} };
    }

    try {
      const parsed = JSON.parse(raw);
      if (!isPlainObject(parsed)) {
        return { version: 1, slots: {} };
      }

      const slots = isPlainObject(parsed.slots) ? parsed.slots : {};
      return { version: parsed.version ?? 1, slots };
    } catch (error) {
      console.warn('SaveManager encountered corrupted save data. Resetting storage.', error);
      return { version: 1, slots: {} };
    }
  }

  #writeState(state) {
    const payload = JSON.stringify({
      version: 1,
      slots: state.slots,
    });

    this.storage.setItem(this.storageKey, payload);
  }
}
