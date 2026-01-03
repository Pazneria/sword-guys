/**
 * Enemy Database
 */

export const ENEMIES = {
  slime: {
    id: 'slime',
    name: 'Slime',
    description: 'A gelatinous blob',
    level: 1,
    stats: {
      hp: 20,
      maxHp: 20,
      mp: 0,
      maxMp: 0,
      attack: 3,
      defense: 1,
      agility: 2,
      intelligence: 1
    },
    exp: 5,
    gold: 3,
    drops: [
      { itemId: 'potion', chance: 0.1 }
    ],
    skills: ['tackle'],
    aiPattern: 'basic' // Just attacks
  },

  goblin: {
    id: 'goblin',
    name: 'Goblin',
    description: 'A mischievous green creature',
    level: 2,
    stats: {
      hp: 35,
      maxHp: 35,
      mp: 5,
      maxMp: 5,
      attack: 6,
      defense: 3,
      agility: 5,
      intelligence: 2
    },
    exp: 12,
    gold: 8,
    drops: [
      { itemId: 'potion', chance: 0.15 },
      { itemId: 'antidote', chance: 0.1 }
    ],
    skills: ['tackle', 'slash'],
    aiPattern: 'basic'
  },

  wolf: {
    id: 'wolf',
    name: 'Wolf',
    description: 'A fierce wild wolf',
    level: 3,
    stats: {
      hp: 45,
      maxHp: 45,
      mp: 0,
      maxMp: 0,
      attack: 8,
      defense: 4,
      agility: 10,
      intelligence: 2
    },
    exp: 18,
    gold: 10,
    drops: [
      { itemId: 'potion', chance: 0.2 }
    ],
    skills: ['tackle', 'bite'],
    aiPattern: 'aggressive' // Prefers attacking
  },

  bat: {
    id: 'bat',
    name: 'Cave Bat',
    description: 'A large vampire bat',
    level: 2,
    stats: {
      hp: 25,
      maxHp: 25,
      mp: 10,
      maxMp: 10,
      attack: 5,
      defense: 2,
      agility: 12,
      intelligence: 3
    },
    exp: 10,
    gold: 6,
    drops: [
      { itemId: 'ether', chance: 0.15 }
    ],
    skills: ['tackle', 'lifeDrain'],
    aiPattern: 'balanced'
  },

  skeleton: {
    id: 'skeleton',
    name: 'Skeleton',
    description: 'Animated bones of the fallen',
    level: 4,
    stats: {
      hp: 50,
      maxHp: 50,
      mp: 15,
      maxMp: 15,
      attack: 10,
      defense: 6,
      agility: 4,
      intelligence: 5
    },
    exp: 25,
    gold: 15,
    drops: [
      { itemId: 'potion', chance: 0.2 },
      { itemId: 'ether', chance: 0.1 },
      { itemId: 'sword', chance: 0.05 }
    ],
    skills: ['tackle', 'slash', 'boneCrush'],
    aiPattern: 'balanced'
  },

  dragon: {
    id: 'dragon',
    name: 'Dragon',
    description: 'A mighty fire-breathing dragon',
    level: 10,
    stats: {
      hp: 200,
      maxHp: 200,
      mp: 50,
      maxMp: 50,
      attack: 25,
      defense: 15,
      agility: 8,
      intelligence: 12
    },
    exp: 500,
    gold: 1000,
    drops: [
      { itemId: 'hiPotion', chance: 0.5 },
      { itemId: 'ether', chance: 0.3 },
      { itemId: 'excalibur', chance: 0.1 }
    ],
    skills: ['tackle', 'slash', 'fireBreath', 'tailWhip'],
    aiPattern: 'boss' // More complex behavior
  }
};

// Enemy skills database
export const ENEMY_SKILLS = {
  tackle: {
    id: 'tackle',
    name: 'Tackle',
    mpCost: 0,
    power: 1.0, // Multiplier to attack stat
    accuracy: 0.95,
    target: 'single',
    element: 'physical'
  },

  slash: {
    id: 'slash',
    name: 'Slash',
    mpCost: 3,
    power: 1.3,
    accuracy: 0.9,
    target: 'single',
    element: 'physical'
  },

  bite: {
    id: 'bite',
    name: 'Bite',
    mpCost: 0,
    power: 1.2,
    accuracy: 0.85,
    target: 'single',
    element: 'physical',
    statusEffect: { type: 'poison', chance: 0.2 }
  },

  lifeDrain: {
    id: 'lifeDrain',
    name: 'Life Drain',
    mpCost: 5,
    power: 0.8,
    accuracy: 0.9,
    target: 'single',
    element: 'dark',
    drain: 0.5 // Heals caster for 50% of damage
  },

  boneCrush: {
    id: 'boneCrush',
    name: 'Bone Crush',
    mpCost: 8,
    power: 1.5,
    accuracy: 0.85,
    target: 'single',
    element: 'physical',
    statusEffect: { type: 'stun', chance: 0.15 }
  },

  fireBreath: {
    id: 'fireBreath',
    name: 'Fire Breath',
    mpCost: 20,
    power: 2.0,
    accuracy: 0.9,
    target: 'all',
    element: 'fire'
  },

  tailWhip: {
    id: 'tailWhip',
    name: 'Tail Whip',
    mpCost: 10,
    power: 1.2,
    accuracy: 0.95,
    target: 'all',
    element: 'physical'
  }
};

// Get enemy by id
export function getEnemy(enemyId) {
  const template = ENEMIES[enemyId];
  if (!template) return null;

  // Return a copy so we don't modify the template
  return JSON.parse(JSON.stringify(template));
}

// Get a random enemy from an encounter list
export function getRandomEnemy(encounters) {
  if (!encounters || encounters.length === 0) return null;

  const totalWeight = encounters.reduce((sum, enc) => sum + enc.weight, 0);
  let random = Math.random() * totalWeight;

  for (const encounter of encounters) {
    random -= encounter.weight;
    if (random <= 0) {
      return getEnemy(encounter.id);
    }
  }

  return getEnemy(encounters[0].id);
}

// Process item drops after battle
export function processDrops(enemy) {
  const drops = [];

  if (enemy.drops) {
    for (const drop of enemy.drops) {
      if (Math.random() < drop.chance) {
        drops.push(drop.itemId);
      }
    }
  }

  return drops;
}

// Get skill data
export function getEnemySkill(skillId) {
  return ENEMY_SKILLS[skillId];
}

// AI decision making
export function chooseEnemyAction(enemy) {
  const availableSkills = enemy.skills
    .map(skillId => getEnemySkill(skillId))
    .filter(skill => skill && enemy.stats.mp >= skill.mpCost);

  if (availableSkills.length === 0) {
    return { type: 'attack', skillId: 'tackle' };
  }

  // Simple AI patterns
  switch (enemy.aiPattern) {
    case 'basic':
      // Just use basic attack most of the time
      if (Math.random() < 0.8) {
        return { type: 'attack', skillId: 'tackle' };
      }
      break;

    case 'aggressive':
      // Prefer stronger attacks
      const strongSkills = availableSkills.filter(s => s.power >= 1.2);
      if (strongSkills.length > 0 && Math.random() < 0.6) {
        const skill = strongSkills[Math.floor(Math.random() * strongSkills.length)];
        return { type: 'attack', skillId: skill.id };
      }
      break;

    case 'balanced':
      // Use a mix of skills
      if (Math.random() < 0.5) {
        const skill = availableSkills[Math.floor(Math.random() * availableSkills.length)];
        return { type: 'attack', skillId: skill.id };
      }
      break;

    case 'boss':
      // More complex - use powerful skills when HP is low
      const hpPercent = enemy.stats.hp / enemy.stats.maxHp;
      if (hpPercent < 0.3) {
        // Low HP - use strongest skills
        const sorted = availableSkills.sort((a, b) => b.power - a.power);
        if (sorted[0]) {
          return { type: 'attack', skillId: sorted[0].id };
        }
      }
      // Otherwise random skill
      const skill = availableSkills[Math.floor(Math.random() * availableSkills.length)];
      return { type: 'attack', skillId: skill.id };
  }

  // Default: random available skill
  const skill = availableSkills[Math.floor(Math.random() * availableSkills.length)];
  return { type: 'attack', skillId: skill.id };
}
