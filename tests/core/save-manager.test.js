import test from 'node:test';
import assert from 'node:assert/strict';

import { SaveManager, SaveManagerError } from '../../src/core/save-manager.js';

const createMockStorage = () => {
  const store = new Map();

  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
    key(index) {
      return Array.from(store.keys())[index] ?? null;
    },
    get length() {
      return store.size;
    },
  };
};

const withFixedClock = (isoTimestamp, callback) => {
  const OriginalDate = globalThis.Date;
  const fixedDate = new OriginalDate(isoTimestamp);

  class MockDate extends OriginalDate {
    constructor(...args) {
      if (args.length === 0) {
        super(fixedDate.getTime());
        return;
      }

      super(...args);
    }

    static now() {
      return fixedDate.getTime();
    }

    static parse(value) {
      return OriginalDate.parse(value);
    }

    static UTC(...args) {
      return OriginalDate.UTC(...args);
    }
  }

  globalThis.Date = MockDate;

  try {
    return callback();
  } finally {
    globalThis.Date = OriginalDate;
  }
};

test('save manager serializes and restores game state snapshots', () => {
  const storage = createMockStorage();
  const manager = new SaveManager({ storage });
  const snapshot = { level: 'starting-area', player: { position: { x: 3, y: 4 } } };

  withFixedClock('2024-05-10T15:30:00.000Z', () => {
    const result = manager.save('slot-1', snapshot);
    assert.equal(result.slotId, 'slot-1');
    assert.equal(result.metadata.updatedAt, '2024-05-10T15:30:00.000Z');
  });

  snapshot.player.position.x = 99;

  const loaded = manager.load('slot-1');
  assert.deepEqual(loaded, { level: 'starting-area', player: { position: { x: 3, y: 4 } } });

  const slot = manager.getSlot('slot-1');
  assert.deepEqual(slot.data, { level: 'starting-area', player: { position: { x: 3, y: 4 } } });
  assert.equal(slot.slotId, 'slot-1');
});

test('listSlots returns metadata sorted by recency for slot selection', () => {
  const storage = createMockStorage();
  const manager = new SaveManager({ storage });

  manager.save('slot-2', { player: { level: 12 } }, { updatedAt: '2024-05-09T08:15:00.000Z' });
  manager.save('slot-1', { player: { level: 14 } }, { updatedAt: '2024-05-11T04:45:00.000Z' });

  const slots = manager.listSlots();
  assert.equal(slots.length, 2);
  assert.deepEqual(
    slots.map((slot) => slot.slotId),
    ['slot-1', 'slot-2'],
  );

  const [latest] = slots;
  latest.metadata.updatedAt = '1999-01-01T00:00:00.000Z';
  const refreshed = manager.listSlots();
  assert.notEqual(refreshed[0].metadata.updatedAt, latest.metadata.updatedAt);
});

test('save surfaces storage errors as SaveManagerError instances', () => {
  const quotaError = new Error('Quota exceeded');
  quotaError.name = 'QuotaExceededError';

  const storage = {
    getItem() {
      return null;
    },
    setItem() {
      throw quotaError;
    },
    removeItem() {},
  };

  const manager = new SaveManager({ storage });

  assert.throws(
    () => manager.save('slot-1', { foo: 'bar' }),
    (error) => error instanceof SaveManagerError && error.cause === quotaError,
  );
});
