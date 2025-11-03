import test from 'node:test';
import assert from 'node:assert/strict';

import { GameState } from '../src/entities/game-state.js';

test('skills respect prerequisites and skill point costs', () => {
  const state = new GameState({ skillPoints: 5 });

  assert.deepEqual(state.getLearnedSkills(), [], 'no skills should be learned initially');
  assert.ok(state.canLearnSkill('quick-strike'), 'root offensive skill should be learnable');

  const quickLearned = state.learnSkill('quick-strike');
  assert.equal(quickLearned, true);
  assert.ok(state.hasLearnedSkill('quick-strike'), 'skill should be marked as learned');
  assert.equal(state.skillPoints, 4, 'skill points should be reduced by the cost of quick-strike');

  assert.equal(state.canLearnSkill('quick-strike'), false, 'learned skills cannot be relearned');
  assert.equal(state.canLearnSkill('whirlwind'), false, 'deep skills require their entire chain');

  assert.ok(state.canLearnSkill('power-slash'), 'power-slash requires quick-strike and enough points');
  state.learnSkill('power-slash');
  assert.ok(state.hasLearnedSkill('power-slash'));

  assert.ok(state.getAvailableSkills().includes('whirlwind'), 'whirlwind becomes available once prerequisites are met');
  assert.equal(state.canLearnSkill('whirlwind'), false, 'insufficient points prevent learning whirlwind');

  state.setSkillPoints(5);
  assert.ok(state.canLearnSkill('whirlwind'), 'adding points allows learning the final skill');
});

test('skill learning emits change events with updated collections', () => {
  const state = new GameState({ skillPoints: 3 });
  const events = [];

  state.addEventListener('skillschange', (event) => {
    events.push(event.detail);
  });

  state.learnSkill('quick-strike');

  assert.equal(events.length, 1);
  const [detail] = events;
  assert.equal(detail.action, 'learned');
  assert.deepEqual(detail.learned, ['quick-strike']);
  assert.ok(detail.available.includes('power-slash'));
  assert.equal(detail.skillPoints, 2);

  state.setSkillPoints(5);
  assert.equal(events.length, 2, 'changing points should emit an event');
  const [, pointsDetail] = events;
  assert.equal(pointsDetail.action, 'points');
  assert.equal(pointsDetail.skillPoints, 5);
});

