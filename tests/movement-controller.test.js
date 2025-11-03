import test from 'node:test';
import assert from 'node:assert/strict';

import { STARTING_AREA_CONFIG } from '../src/config/starting-area.js';
import { MovementController } from '../src/systems/movement-controller.js';

const { layout, passableTiles, tiles } = STARTING_AREA_CONFIG;

const createController = (position, overrides = {}) =>
  new MovementController({
    layout,
    passableTiles,
    position,
    ...overrides,
  });

test('queued moves into tree tiles are rejected', () => {
  let blockedEvent = null;
  const controller = createController({ x: 1, y: 1 }, {
    onBlocked: (payload) => {
      blockedEvent = payload;
    },
  });

  controller.queueMove('up');
  const moved = controller.step();

  assert.equal(moved, false, 'movement should be rejected');
  assert.deepEqual(controller.getPosition(), { x: 1, y: 1 }, 'position should remain unchanged');
  assert.ok(blockedEvent, 'onBlocked event should be emitted');
  assert.deepEqual(blockedEvent.to, { x: 1, y: 0 });
  assert.equal(blockedEvent.tile, tiles.TREE);
});

test('queued moves into water tiles are rejected', () => {
  let blockedEvent = null;
  const start = { x: 14, y: 14 };
  const controller = createController(start, {
    onBlocked: (payload) => {
      blockedEvent = payload;
    },
  });

  controller.queueMove('up');
  const moved = controller.step();

  assert.equal(moved, false, 'movement should be rejected');
  assert.deepEqual(controller.getPosition(), start, 'position should remain unchanged');
  assert.ok(blockedEvent, 'onBlocked event should be emitted');
  assert.equal(blockedEvent.tile, tiles.WATER);
});

test('queued moves into rock tiles are rejected', () => {
  let blockedEvent = null;
  const start = { x: 20, y: 5 };
  const controller = createController(start, {
    onBlocked: (payload) => {
      blockedEvent = payload;
    },
  });

  controller.queueMove('down');
  const moved = controller.step();

  assert.equal(moved, false, 'movement should be rejected');
  assert.deepEqual(controller.getPosition(), start, 'position should remain unchanged');
  assert.ok(blockedEvent, 'onBlocked event should be emitted');
  assert.equal(blockedEvent.tile, tiles.ROCK);
});
