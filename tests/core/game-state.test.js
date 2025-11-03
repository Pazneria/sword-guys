import test from 'node:test';
import assert from 'node:assert/strict';

import { GameState } from '../../src/core/game-state.js';

const findItem = (snapshot, itemId) => {
  for (const category of snapshot.categories) {
    for (const item of category.items) {
      if (item.id === itemId) {
        return item;
      }
    }
  }
  return null;
};

test('initial inventory is seeded from starter data', () => {
  const state = new GameState();
  const snapshot = state.getInventorySnapshot();

  const potion = findItem(snapshot, 'minor-healing-potion');
  assert.ok(potion, 'healing potion should exist in starter inventory');
  assert.equal(potion.quantity, 3);
  assert.deepEqual(potion.stacks, [3]);

  const sword = findItem(snapshot, 'wooden-sword');
  assert.ok(sword, 'wooden sword should exist in starter inventory');
  assert.equal(sword.quantity, 1);
  assert.deepEqual(sword.stacks, [1]);
});

test('addItem updates quantities and notifies listeners', () => {
  const state = new GameState({ starterInventory: [] });
  let notifications = 0;
  let latestSnapshot = null;

  const unsubscribe = state.addInventoryListener((snapshot) => {
    notifications += 1;
    latestSnapshot = snapshot;
  });

  const quantity = state.addItem('minor-healing-potion', 2);

  assert.equal(quantity, 2);
  assert.equal(state.getItemQuantity('minor-healing-potion'), 2);
  assert.equal(notifications, 2, 'listener should fire immediately and after add');
  assert.ok(latestSnapshot, 'listener should receive snapshot data');

  const entry = findItem(latestSnapshot, 'minor-healing-potion');
  assert.ok(entry);
  assert.equal(entry.quantity, 2);
  assert.deepEqual(entry.stacks, [2]);

  unsubscribe();
});

test('useItem consumes items without going negative', () => {
  const state = new GameState({
    starterInventory: [
      { id: 'minor-healing-potion', quantity: 2 },
    ],
  });

  const consumed = state.useItem('minor-healing-potion');
  assert.equal(consumed, true);
  assert.equal(state.getItemQuantity('minor-healing-potion'), 1);

  state.useItem('minor-healing-potion');
  assert.equal(state.getItemQuantity('minor-healing-potion'), 0);

  const failed = state.useItem('minor-healing-potion');
  assert.equal(failed, false, 'using without stock should fail');
  assert.equal(state.getItemQuantity('minor-healing-potion'), 0);
});
