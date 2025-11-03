import { SKILLS, SKILLS_BY_ID } from '../data/skills.js';

class EventEmitter {
  constructor() {
    this.listeners = new Map();
  }

  on(type, listener) {
    if (typeof listener !== 'function') {
      return;
    }

    const handlers = this.listeners.get(type);
    if (handlers) {
      handlers.add(listener);
    } else {
      this.listeners.set(type, new Set([listener]));
    }
  }

  off(type, listener) {
    if (!listener) {
      this.listeners.delete(type);
      return;
    }

    const handlers = this.listeners.get(type);
    if (!handlers) {
      return;
    }

    handlers.delete(listener);

    if (handlers.size === 0) {
      this.listeners.delete(type);
    }
  }

  emit(type, detail) {
    const handlers = this.listeners.get(type);
    if (!handlers || handlers.size === 0) {
      return;
    }

    const event = { type, detail };
    [...handlers].forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        // Listeners should not break the emitter chain.
        setTimeout(() => {
          throw error;
        }, 0);
      }
    });
  }
}

const cloneSkill = (skill) => ({
  ...skill,
  prerequisites: Array.isArray(skill?.prerequisites) ? [...skill.prerequisites] : [],
});

export class GameState {
  constructor({ skillPoints = 0, skills = SKILLS } = {}) {
    this.skillPoints = Number.isFinite(skillPoints) ? Math.max(0, skillPoints) : 0;

    const definitions = Array.isArray(skills) && skills.length > 0 ? skills : SKILLS;
    const merged = new Map(SKILLS_BY_ID);

    definitions.forEach((skill) => {
      if (skill?.id) {
        merged.set(skill.id, cloneSkill(skill));
      }
    });

    this.skillDefinitions = merged;
    this.skillOrder = [...merged.keys()];

    this.learnedSkills = new Set();
    this.availableSkills = new Set();

    this.events = new EventEmitter();

    this.#recomputeAvailability();
  }

  addEventListener(type, listener) {
    this.events.on(type, listener);
  }

  removeEventListener(type, listener) {
    this.events.off(type, listener);
  }

  getSkill(skillId) {
    if (!skillId) {
      return null;
    }

    const definition = this.skillDefinitions.get(skillId);
    return definition ? cloneSkill(definition) : null;
  }

  getSkills() {
    return this.skillOrder.map((id) => this.getSkill(id)).filter(Boolean);
  }

  getLearnedSkills() {
    return this.skillOrder.filter((id) => this.learnedSkills.has(id));
  }

  getAvailableSkills() {
    return this.skillOrder.filter((id) => this.availableSkills.has(id));
  }

  hasLearnedSkill(skillId) {
    return this.learnedSkills.has(skillId);
  }

  canLearnSkill(skillId) {
    const skill = this.skillDefinitions.get(skillId);
    if (!skill) {
      return false;
    }

    if (this.learnedSkills.has(skillId)) {
      return false;
    }

    if ((skill.prerequisites ?? []).some((id) => !this.learnedSkills.has(id))) {
      return false;
    }

    const cost = Number.isFinite(skill.cost) ? skill.cost : 0;
    return this.skillPoints >= cost;
  }

  learnSkill(skillId) {
    if (!this.canLearnSkill(skillId)) {
      return false;
    }

    const skill = this.skillDefinitions.get(skillId);
    const cost = Number.isFinite(skill.cost) ? skill.cost : 0;

    this.learnedSkills.add(skillId);
    this.skillPoints = Math.max(0, this.skillPoints - cost);

    this.#recomputeAvailability();
    this.#emitSkillsChange('learned', skillId);
    return true;
  }

  setSkillPoints(value) {
    const next = Number.isFinite(value) ? Math.max(0, value) : 0;
    if (next === this.skillPoints) {
      return;
    }

    this.skillPoints = next;
    this.#emitSkillsChange('points');
  }

  grantSkillPoints(amount) {
    const delta = Number.isFinite(amount) ? amount : 0;
    if (delta === 0) {
      return;
    }

    this.setSkillPoints(this.skillPoints + delta);
  }

  #recomputeAvailability() {
    this.availableSkills.clear();

    this.skillOrder.forEach((id) => {
      const skill = this.skillDefinitions.get(id);
      if (!skill || this.learnedSkills.has(id)) {
        return;
      }

      const prerequisites = skill.prerequisites ?? [];
      const prerequisitesMet = prerequisites.every((req) => this.learnedSkills.has(req));
      if (prerequisitesMet) {
        this.availableSkills.add(id);
      }
    });
  }

  #emitSkillsChange(action, skillId = null) {
    this.events.emit('skillschange', {
      action,
      skillId,
      learned: this.getLearnedSkills(),
      available: this.getAvailableSkills(),
      skillPoints: this.skillPoints,
    });
  }
}

