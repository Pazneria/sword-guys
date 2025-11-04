import test from 'node:test';
import assert from 'node:assert/strict';

import { GameState } from '../../src/core/game-state.js';

test('GameState initializes with sensible defaults', () => {
  const state = GameState.getInstance();
  state.reset({ emit: false });

  const snapshot = state.getSnapshot();
  const player = snapshot.player;

  assert.deepEqual(player.inventory, [], 'inventory should start empty');
  assert.deepEqual(
    player.stats,
    {
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
    },
    'player stats should use default values',
  );
  assert.deepEqual(
    player.equipment,
    { weapon: null, armor: null, accessory: null },
    'equipment slots should start unequipped',
  );
  assert.deepEqual(player.skills, [], 'no skills should be learned by default');
  assert.deepEqual(
    player.saveMetadata,
    { slot: 1, lastSavedAt: null, lastLocation: null, playTime: 0 },
    'save metadata should be initialized',
  );
  assert.deepEqual(
    player.settings,
    { volume: 0.7, difficulty: 'normal', showSubtitles: true, language: 'en' },
    'settings should have defaults',
  );
});

test('PlayerState mutations update state and emit events', () => {
  const state = GameState.getInstance();
  state.reset({ emit: false });
  const player = state.getPlayerState();

  const changeEvents = [];
  const statsEvents = [];
  const inventoryEvents = [];
  const equipmentEvents = [];
  const settingsEvents = [];
  const skillsEvents = [];
  const conditionsEvents = [];

  const unsubscribeChange = player.subscribe('change', (payload) => {
    changeEvents.push(payload);
  });
  const unsubscribeStats = player.subscribe('stats', (payload) => {
    statsEvents.push(payload);
  });
  const unsubscribeInventory = player.subscribe('inventory', (payload) => {
    inventoryEvents.push(payload);
  });
  const unsubscribeEquipment = player.subscribe('equipment', (payload) => {
    equipmentEvents.push(payload);
  });
  const unsubscribeSettings = player.subscribe('settings', (payload) => {
    settingsEvents.push(payload);
  });
  const unsubscribeSkills = player.subscribe('skills', (payload) => {
    skillsEvents.push(payload);
  });
  const unsubscribeConditions = player.subscribe('conditions', (payload) => {
    conditionsEvents.push(payload);
  });

  player.updateStats({ health: 80, agility: 14 });
  player.addItem({ id: 'potion-small', name: 'Small Potion' });
  player.equipItem('weapon', { id: 'rusty-sword', name: 'Rusty Sword' });
  player.setOption('volume', 0.25);
  player.learnSkill('dash');
  player.addCondition('Poisoned');
  player.removeCondition('Poisoned');

  assert.equal(statsEvents.length, 1);
  assert.equal(statsEvents[0].stats.health, 80);
  assert.equal(statsEvents[0].stats.agility, 14);

  assert.equal(inventoryEvents.length, 1);
  assert.deepEqual(inventoryEvents[0].inventory, [
    { id: 'potion-small', name: 'Small Potion' },
  ]);

  assert.equal(equipmentEvents.length, 1);
  assert.equal(equipmentEvents[0].slot, 'weapon');
  assert.deepEqual(equipmentEvents[0].item, { id: 'rusty-sword', name: 'Rusty Sword' });

  assert.equal(settingsEvents.length, 1);
  assert.equal(settingsEvents[0].settings.volume, 0.25);

  assert.equal(skillsEvents.length, 1);
  assert.deepEqual(skillsEvents[0].skills, ['dash']);

  assert.ok(conditionsEvents.length >= 1, 'conditions subscribers should be notified');
  assert.deepEqual(conditionsEvents[conditionsEvents.length - 1].conditions, []);

  assert.deepEqual(
    changeEvents.map((event) => event.type),
    ['stats', 'inventory', 'equipment', 'settings', 'skills', 'conditions', 'conditions'],
  );

  unsubscribeChange();
  unsubscribeStats();
  unsubscribeInventory();
  unsubscribeEquipment();
  unsubscribeSettings();
  unsubscribeSkills();
  unsubscribeConditions();
});

test('GameState re-emits player changes and tracks save metadata', () => {
  const state = GameState.getInstance();
  state.reset({ emit: false });
  const player = state.getPlayerState();

  const playerEvents = [];
  const gameChangeEvents = [];

  const unsubscribePlayerChange = state.subscribe('playerChange', (payload) => {
    playerEvents.push(payload);
  });
  const unsubscribeGameChange = state.subscribe('change', (payload) => {
    gameChangeEvents.push(payload);
  });

  player.updateSaveMetadata({ slot: 2, lastLocation: { x: 3, y: 4 } });
  player.setLastKnownLocation({ x: 7, y: 9 });

  assert.ok(playerEvents.length >= 2, 'playerChange subscribers should be notified');
  assert.equal(playerEvents[0].type, 'saveMetadata');
  const lastPlayerEvent = playerEvents[playerEvents.length - 1];
  assert.equal(lastPlayerEvent.type, 'saveMetadata');

  const snapshot = state.getSnapshot();
  assert.deepEqual(snapshot.player.saveMetadata, {
    slot: 2,
    lastSavedAt: null,
    lastLocation: { x: 7, y: 9 },
    playTime: 0,
  });

  assert.ok(gameChangeEvents.some((event) => event.type === 'player'));

  unsubscribePlayerChange();
  unsubscribeGameChange();
});
