export const SKILL_CATEGORIES = Object.freeze({
  OFFENSE: 'offense',
  DEFENSE: 'defense',
  UTILITY: 'utility',
});

export const SKILLS = [
  {
    id: 'quick-strike',
    name: 'Quick Strike',
    description: 'A rapid sword strike that teaches the fundamentals of combat.',
    cost: 1,
    category: SKILL_CATEGORIES.OFFENSE,
    prerequisites: [],
  },
  {
    id: 'power-slash',
    name: 'Power Slash',
    description: 'Charge up a heavy attack that deals massive damage.',
    cost: 2,
    category: SKILL_CATEGORIES.OFFENSE,
    prerequisites: ['quick-strike'],
  },
  {
    id: 'whirlwind',
    name: 'Whirlwind',
    description: 'Spin with your blade extended to hit every adjacent foe.',
    cost: 3,
    category: SKILL_CATEGORIES.OFFENSE,
    prerequisites: ['power-slash'],
  },
  {
    id: 'parry',
    name: 'Parry',
    description: 'Deflect an incoming blow and stagger the attacker.',
    cost: 1,
    category: SKILL_CATEGORIES.DEFENSE,
    prerequisites: [],
  },
  {
    id: 'riposte',
    name: 'Riposte',
    description: 'Counter after a successful parry for bonus damage.',
    cost: 2,
    category: SKILL_CATEGORIES.DEFENSE,
    prerequisites: ['parry'],
  },
  {
    id: 'battle-instinct',
    name: 'Battle Instinct',
    description: 'Sense enemy intent, gaining a burst of focus to learn faster.',
    cost: 2,
    category: SKILL_CATEGORIES.UTILITY,
    prerequisites: ['quick-strike', 'parry'],
  },
];

export const SKILLS_BY_ID = new Map(SKILLS.map((skill) => [skill.id, skill]));

