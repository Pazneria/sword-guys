import test from 'node:test';
import assert from 'node:assert/strict';

import { PlayerController } from '../src/systems/player-controller.js';

const createWindowStub = () => {
  const listeners = new Map();

  return {
    addEventListener(type, handler) {
      const existing = listeners.get(type);
      if (existing) {
        existing.push(handler);
      } else {
        listeners.set(type, [handler]);
      }
    },
    removeEventListener(type, handler) {
      const existing = listeners.get(type);
      if (!existing) {
        return;
      }

      const index = existing.indexOf(handler);
      if (index >= 0) {
        existing.splice(index, 1);
      }
    },
    dispatchEvent(type, event) {
      const handlers = listeners.get(type);
      if (!handlers) {
        return;
      }

      handlers.slice().forEach((handler) => handler(event));
    },
  };
};

const createTickerStub = () => ({
  request: () => 1,
  cancel: () => {},
});

const createKeyboardEvent = (key) => ({
  key,
  repeat: false,
  preventDefault() {},
});

test('player controller supports diagonal moves with combined input', () => {
  const previousWindow = global.window;
  const windowStub = createWindowStub();
  global.window = windowStub;

  const canMoveToCalls = [];

  const controller = new PlayerController({
    position: { x: 5, y: 5 },
    speed: 1,
    ticker: createTickerStub(),
    canMoveTo: (target, direction, from) => {
      canMoveToCalls.push({
        target: { ...target },
        direction,
        from: from ? { ...from } : null,
      });
      return true;
    },
  });

  try {
    controller.start();

    windowStub.dispatchEvent('keydown', createKeyboardEvent('ArrowUp'));
    windowStub.dispatchEvent('keydown', createKeyboardEvent('ArrowRight'));

    controller.update(controller.moveDuration);
    assert.deepEqual(controller.tilePosition, { x: 5, y: 4 });

    controller.update(controller.moveDuration);
    assert.deepEqual(controller.tilePosition, { x: 5, y: 4 });

    controller.update(controller.moveDuration);
    assert.deepEqual(controller.tilePosition, { x: 6, y: 3 });

    assert.equal(canMoveToCalls.length >= 2, true);
    const diagonalCall = canMoveToCalls.find((call) => call.direction === 'upRight');
    assert.ok(diagonalCall, 'expected canMoveTo to receive a diagonal direction');
    assert.deepEqual(diagonalCall.from, { x: 5, y: 4 });
    assert.deepEqual(diagonalCall.target, { x: 6, y: 3 });
  } finally {
    windowStub.dispatchEvent('keyup', createKeyboardEvent('ArrowUp'));
    windowStub.dispatchEvent('keyup', createKeyboardEvent('ArrowRight'));
    controller.stop();
    global.window = previousWindow;
  }
});

test('diagonal moves are skipped when movement callback rejects due to corner blocking', () => {
  const previousWindow = global.window;
  const windowStub = createWindowStub();
  global.window = windowStub;

  const deniedCalls = [];

  const controller = new PlayerController({
    position: { x: 5, y: 5 },
    speed: 1,
    ticker: createTickerStub(),
    canMoveTo: (target, direction, from) => {
      if (direction === 'upRight') {
        deniedCalls.push({
          target: { ...target },
          direction,
          from: from ? { ...from } : null,
        });
        return false;
      }

      return true;
    },
  });

  try {
    controller.start();

    windowStub.dispatchEvent('keydown', createKeyboardEvent('ArrowUp'));
    windowStub.dispatchEvent('keydown', createKeyboardEvent('ArrowRight'));

    controller.update(controller.moveDuration);
    assert.deepEqual(controller.tilePosition, { x: 5, y: 4 });

    controller.update(controller.moveDuration);
    assert.deepEqual(controller.tilePosition, { x: 5, y: 4 });

    controller.update(controller.moveDuration);
    assert.deepEqual(controller.tilePosition, { x: 5, y: 4 });

    assert.equal(deniedCalls.length, 1);
    assert.deepEqual(deniedCalls[0].from, { x: 5, y: 4 });
    assert.deepEqual(deniedCalls[0].target, { x: 6, y: 3 });
  } finally {
    windowStub.dispatchEvent('keyup', createKeyboardEvent('ArrowUp'));
    windowStub.dispatchEvent('keyup', createKeyboardEvent('ArrowRight'));
    controller.stop();
    global.window = previousWindow;
  }
});
