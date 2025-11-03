import test from 'node:test';
import assert from 'node:assert/strict';

import { GameState } from '../src/core/game-state.js';
import { createStorageStub } from './helpers/storage-stub.js';

test('game state persists settings to storage', async () => {
  const storage = createStorageStub();
  const gameState = new GameState({ storageKey: 'unit-test-settings', storage });
  await gameState.initialize();

  await gameState.updateSettings({
    audio: {
      masterVolume: 0.35,
    },
  });

  const raw = storage.getItem('unit-test-settings');
  assert.ok(raw, 'expected settings to be stored in the provided storage stub');

  const parsed = JSON.parse(raw);
  assert.equal(parsed.settings.audio.masterVolume, 0.35);

  const restored = new GameState({ storageKey: 'unit-test-settings', storage });
  await restored.initialize();

  const restoredSettings = restored.getSettings();
  assert.equal(restoredSettings.audio.masterVolume, 0.35);
});

test('game state notifies subscribers when settings change', async () => {
  const storage = createStorageStub();
  const gameState = new GameState({ storage });
  await gameState.initialize();

  const notifications = [];
  const unsubscribe = gameState.subscribe((state, detail) => {
    notifications.push({ state, detail });
  });

  await gameState.updateSettings({
    keybindings: {
      movement: {
        up: ['i'],
      },
    },
  });

  assert.ok(notifications.length >= 1, 'expected subscriber to receive at least one notification');

  const last = notifications[notifications.length - 1];
  assert.ok(last, 'expected a notification payload to exist');
  assert.equal(last.detail.section, 'settings');
  assert.deepEqual(last.state.settings.keybindings.movement.up.includes('i'), true);

  unsubscribe();
});

test('previewSettings normalizes values without mutating the live state', async () => {
  const storage = createStorageStub();
  const gameState = new GameState({ storage });
  await gameState.initialize();

  const original = gameState.getSettings();
  assert.deepEqual(original.keybindings.movement.up.includes('w'), true);

  const preview = gameState.previewSettings({
    keybindings: {
      movement: {
        up: ['i'],
      },
    },
  });

  assert.deepEqual(preview.keybindings.movement.up.includes('i'), true);
  assert.deepEqual(preview.keybindings.movement.up.includes('I'), true);

  const current = gameState.getSettings();
  assert.deepEqual(current.keybindings.movement.up.includes('i'), false);
  assert.deepEqual(current.keybindings.movement.up.includes('w'), true);
});
