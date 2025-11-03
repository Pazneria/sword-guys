import test from 'node:test';
import assert from 'node:assert/strict';

import { GameState } from '../src/entities/game-state.js';
import { SkillsPanel } from '../src/ui/components/skills-panel.js';
import { createMockDocument, MockEvent } from './helpers/mock-dom.js';

const collectIds = (listElement) =>
  (listElement?.children ?? [])
    .map((child) => child?.dataset?.skillId)
    .filter((id) => typeof id === 'string');

test('skills panel renders available and learned skills as the game state changes', () => {
  const { document, root } = createMockDocument();
  const state = new GameState({ skillPoints: 4 });
  const selections = [];
  const panel = new SkillsPanel(state, {
    document,
    onSelect: (skill, { selectedSkillId }) => {
      selections.push({ skill: skill?.id ?? null, selectedSkillId });
    },
  });

  panel.mount(root);

  assert.deepEqual(collectIds(panel.availableList), ['quick-strike', 'parry']);
  assert.deepEqual(collectIds(panel.learnedList), []);

  const quickItem = panel.getSkillElements('quick-strike');
  assert.ok(quickItem, 'panel should expose rendered elements for quick-strike');
  assert.equal(quickItem.learnButton.disabled, false, 'quick-strike should be learnable');

  quickItem.element.dispatchEvent(new MockEvent('click'));
  assert.equal(panel.getSelectedSkillId(), 'quick-strike');
  const lastSelection = selections[selections.length - 1];
  assert.deepEqual(lastSelection, { skill: 'quick-strike', selectedSkillId: 'quick-strike' });

  quickItem.learnButton.dispatchEvent(new MockEvent('click'));
  assert.ok(state.hasLearnedSkill('quick-strike'), 'learning the skill should update the game state');

  assert.deepEqual(collectIds(panel.learnedList), ['quick-strike']);
  assert.ok(
    collectIds(panel.availableList).includes('power-slash'),
    'power-slash becomes available once quick-strike is learned',
  );

  const power = panel.getSkillElements('power-slash');
  assert.ok(power);
  assert.equal(power.learnButton.disabled, false, 'power-slash is learnable with sufficient points');

  state.setSkillPoints(0);

  assert.equal(
    panel.getSkillElements('power-slash').learnButton.disabled,
    true,
    'button should disable when insufficient skill points remain',
  );
});

