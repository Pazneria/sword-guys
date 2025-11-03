import test from 'node:test';
import assert from 'node:assert/strict';

import { GameState } from '../src/core/game-state.js';

const SLOT_IDS = {
  weapon: 'weapon',
  offhand: 'offhand',
  head: 'head',
  body: 'body',
  accessory: 'accessory',
};

const ITEM_IDS = {
  sword: 'rusty-sword',
  shield: 'oak-shield',
  cap: 'leather-cap',
  vest: 'leather-vest',
  charm: 'traveler-charm',
};

test('equipItem moves the item from inventory into the equipped slot', () => {
  const state = new GameState({
    inventory: [ITEM_IDS.sword],
  });

  const result = state.equipItem(SLOT_IDS.weapon, ITEM_IDS.sword);

  assert.deepEqual(result, { equipped: ITEM_IDS.sword, unequipped: null });
  assert.equal(state.getEquipped(SLOT_IDS.weapon), ITEM_IDS.sword);
  assert.deepEqual(state.getInventory(), []);
});

test('equipping an item replaces the existing item and returns it to inventory', () => {
  const state = new GameState({
    inventory: [ITEM_IDS.shield],
    equipment: { [SLOT_IDS.offhand]: ITEM_IDS.sword },
  });

  const result = state.equipItem(SLOT_IDS.offhand, ITEM_IDS.shield);

  assert.deepEqual(result, { equipped: ITEM_IDS.shield, unequipped: ITEM_IDS.sword });
  assert.equal(state.getEquipped(SLOT_IDS.offhand), ITEM_IDS.shield);
  assert.deepEqual(state.getInventory(), [ITEM_IDS.sword]);
});

test('unequipItem returns the item to inventory', () => {
  const state = new GameState({
    inventory: [],
    equipment: { [SLOT_IDS.head]: ITEM_IDS.cap },
  });

  const returned = state.unequipItem(SLOT_IDS.head);

  assert.equal(returned, ITEM_IDS.cap);
  assert.equal(state.getEquipped(SLOT_IDS.head), null);
  assert.deepEqual(state.getInventory(), [ITEM_IDS.cap]);
});

test('equipItem throws when the slot does not accept the item', () => {
  const state = new GameState({
    inventory: [ITEM_IDS.cap],
  });

  assert.throws(() => {
    state.equipItem(SLOT_IDS.weapon, ITEM_IDS.cap);
  }, /cannot be equipped/);
});

test('equipItem throws when the item is not in the inventory', () => {
  const state = new GameState();

  assert.throws(() => {
    state.equipItem(SLOT_IDS.weapon, ITEM_IDS.sword);
  }, /not available in the inventory/);
});
