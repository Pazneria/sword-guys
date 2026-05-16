import { ENCOUNTERS, ENEMIES, ITEMS, QUESTS, SPELLS } from '../content';
import { computeEffectiveStats, createInitialState, xpForLevel } from '../simulation/engine';
import { CombatStats, EquipmentSlot, GameState } from '../types';

const equipmentSlots: EquipmentSlot[] = ['weapon', 'helmet', 'bodyArmor', 'legArmor', 'shield', 'accessory1', 'accessory2'];

export interface ExpectedEncounterCount {
  encounterId: string;
  count: number;
}

export interface BalanceRouteStep {
  id: string;
  label: string;
  village: string;
  expectedEncounters: ExpectedEncounterCount[];
  bossEncounterId?: string;
  questRewardId?: string;
  expectedPurchases?: string[];
  expectedTreasure?: string[];
  expectedSpellUnlocks?: string[];
  targetLevelRange: [number, number];
}

export interface EncounterProjection {
  encounterId: string;
  label: string;
  expectedTurns: number;
  expectedIncomingDamage: number;
  physicalDamage: number;
  primarySpellId?: string;
  spellDamage?: number;
  spellCasts?: number;
  mpSpent?: number;
}

export interface BalanceStepProjection {
  stepId: string;
  label: string;
  village: string;
  levelStart: number;
  levelEnd: number;
  xpGained: number;
  goldStart: number;
  goldEnd: number;
  goldGained: number;
  purchases: string[];
  unaffordablePurchases: string[];
  treasure: string[];
  questRewards: {
    questId: string | null;
    gold: number;
    items: string[];
    spells: string[];
  };
  spells: string[];
  equipment: Record<EquipmentSlot, string | null>;
  statsBeforeBoss: CombatStats;
  recoveryBeforeBoss: RecoveryProjection;
  normalEncounters: EncounterProjection[];
  boss?: EncounterProjection;
  targetLevelRange: [number, number];
  warnings: string[];
  advisories: string[];
}

export interface RecoveryProjection {
  consumableHealing: number;
  spellHealing: number;
  totalHealing: number;
  effectiveHp: number;
  bestHealingSpellId?: string;
  healingSpellCasts?: number;
  consumables: Array<{ itemId: string; count: number; healing: number }>;
}

export interface BalanceProjection {
  steps: BalanceStepProjection[];
  totals: {
    xp: number;
    gold: number;
    expectedNormalEncounters: number;
    bosses: number;
  };
}

export const BALANCE_ROUTE_STEPS: BalanceRouteStep[] = [
  {
    id: 'greenhollow_mossvale',
    label: 'Greenhollow to the Cave Relic',
    village: 'Greenhollow',
    expectedEncounters: [
      { encounterId: 'slime_pair', count: 2 },
      { encounterId: 'greenhollow_roamers', count: 2 },
      { encounterId: 'moss_cave_pack', count: 2 }
    ],
    expectedPurchases: ['rusty_sword', 'small_potion'],
    expectedTreasure: ['leather_cap', 'cave_relic'],
    questRewardId: 'cave_relic',
    targetLevelRange: [2, 3]
  },
  {
    id: 'waymeet_dustbridge',
    label: 'Waymeet and Dustbridge Ruins',
    village: 'Waymeet',
    expectedEncounters: [
      { encounterId: 'bandit_scouts', count: 4 },
      { encounterId: 'dust_ruin_pack', count: 4 },
      { encounterId: 'greenhollow_roamers', count: 1 }
    ],
    bossEncounterId: 'boss_rusk',
    questRewardId: 'road_seal',
    expectedPurchases: ['leather_armor', 'iron_shield', 'potion'],
    expectedTreasure: ['copper_ring'],
    targetLevelRange: [4, 5]
  },
  {
    id: 'lumaire_shrine',
    label: 'Lumaire and the Flooded Shrine',
    village: 'Lumaire',
    expectedEncounters: [
      { encounterId: 'river_menace', count: 5 },
      { encounterId: 'shrine_mirrors', count: 4 },
      { encounterId: 'bandit_scouts', count: 1 }
    ],
    bossEncounterId: 'boss_mire_warden',
    questRewardId: 'shrine_lumen',
    expectedPurchases: ['ember', 'apprentice_staff', 'ether'],
    expectedTreasure: ['river_charm'],
    targetLevelRange: [6, 8]
  },
  {
    id: 'ironmarch_fortress',
    label: 'Ironmarch and Ironvein Fortress',
    village: 'Ironmarch',
    expectedEncounters: [
      { encounterId: 'iron_mine_pack', count: 5 },
      { encounterId: 'fort_patrol', count: 5 },
      { encounterId: 'shrine_mirrors', count: 1 }
    ],
    bossEncounterId: 'boss_iron_castellan',
    questRewardId: 'iron_writ',
    expectedPurchases: ['steel_sword', 'steel_helmet', 'potion'],
    expectedTreasure: ['ember_amulet'],
    targetLevelRange: [9, 11]
  },
  {
    id: 'sunspire_eclipse',
    label: 'Sunspire and Eclipse Tower',
    village: 'Sunspire',
    expectedEncounters: [
      { encounterId: 'eclipse_pack', count: 6 },
      { encounterId: 'eclipse_elite', count: 5 },
      { encounterId: 'capital_duel', count: 2 }
    ],
    bossEncounterId: 'boss_hollow_regent',
    questRewardId: 'eclipse_key',
    expectedPurchases: ['sunflare', 'enchanted_blade', 'plate_armor', 'revive_charm'],
    expectedTreasure: ['sunward_aegis'],
    targetLevelRange: [13, 15]
  }
];

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const combatStatKeys: Array<keyof CombatStats> = ['maxHp', 'maxMp', 'attack', 'defense', 'speed', 'magic'];

const equipmentScore = (itemId: string) => {
  const item = ITEMS[itemId];
  if (!item?.stats) return -Infinity;
  return Object.entries(item.stats).reduce((score, [key, value]) => {
    const stat = key as keyof CombatStats;
    const weight =
      stat === 'attack' ? 1.45 : stat === 'defense' ? 1.25 : stat === 'magic' ? 1.15 : stat === 'speed' ? 0.65 : 0.25;
    return score + Number(value) * weight;
  }, item.price / 200);
};

const itemPrice = (id: string) => ITEMS[id]?.price ?? (SPELLS[id] ? SPELLS[id].mpCost * 18 : 0);

const addItem = (state: GameState, itemId: string, quantity = 1) => {
  const item = ITEMS[itemId];
  if (item?.keyItem || item?.category === 'keyItem') {
    state.keyItems[itemId] = true;
    return;
  }
  state.inventory[itemId] = (state.inventory[itemId] ?? 0) + quantity;
};

const equipBestAvailable = (state: GameState) => {
  for (const slot of equipmentSlots) {
    const candidates = Object.keys(state.inventory).filter((itemId) => {
      const item = ITEMS[itemId];
      if (!item?.equipmentSlot) return false;
      if (slot === 'accessory2') return item.equipmentSlot === 'accessory1';
      return item.equipmentSlot === slot;
    });
    const best = candidates.sort((a, b) => equipmentScore(b) - equipmentScore(a))[0];
    if (!best) continue;
    if (slot === 'accessory2' && state.player.equipment.accessory1 === best) continue;
    state.player.equipment[slot] = best;
  }
};

const applyXp = (state: GameState, xp: number) => {
  state.player.xp += xp;
  while (state.player.xp >= state.player.xpToNext) {
    state.player.xp -= state.player.xpToNext;
    state.player.level += 1;
    state.player.baseStats.maxHp += 9;
    state.player.baseStats.maxMp += 4;
    state.player.baseStats.attack += 2;
    state.player.baseStats.defense += 2;
    state.player.baseStats.speed += state.player.level % 2 === 0 ? 1 : 0;
    state.player.baseStats.magic += 2;
    state.player.xpToNext = xpForLevel(state.player.level);
    state.player.stats.hp = state.player.baseStats.maxHp;
    state.player.stats.mp = state.player.baseStats.maxMp;
  }
};

const encounterRewards = (encounterId: string) => {
  const encounter = ENCOUNTERS[encounterId];
  return encounter.enemyIds.reduce(
    (totals, enemyId) => {
      const enemy = ENEMIES[enemyId];
      return { xp: totals.xp + enemy.xp, gold: totals.gold + enemy.gold };
    },
    { xp: 0, gold: 0 }
  );
};

const averagePhysicalDamage = (attacker: CombatStats, defender: CombatStats, power = 0) =>
  Math.max(1, Math.floor(attacker.attack + power - defender.defense + 1));

const averageMagicDamage = (attacker: CombatStats, defender: CombatStats, power = 0) =>
  Math.max(1, Math.floor(attacker.magic + power - Math.floor(defender.defense * 0.45) + 1));

const chooseDamageSpell = (state: GameState, defender: CombatStats) =>
  state.player.spells
    .map((spellId) => SPELLS[spellId])
    .filter((spell) => spell?.kind === 'damage' && spell.mpCost > 0)
    .map((spell) => ({
      spell,
      damage: averageMagicDamage(state.player.stats, defender, spell.power),
      casts: Math.floor(state.player.stats.maxMp / spell.mpCost)
    }))
    .filter((candidate) => candidate.casts > 0)
    .sort((a, b) => b.damage - a.damage || b.casts - a.casts)[0];

const estimateRecovery = (state: GameState, stats: CombatStats): RecoveryProjection => {
  const consumables = Object.entries(state.inventory)
    .map(([itemId, count]) => {
      const item = ITEMS[itemId];
      return item?.effect?.type === 'healHp'
        ? { itemId, count, healing: item.effect.amount * count }
        : null;
    })
    .filter((entry): entry is { itemId: string; count: number; healing: number } => Boolean(entry));
  const consumableHealing = consumables.reduce((total, item) => total + item.healing, 0);
  const healingSpell = state.player.spells
    .map((spellId) => SPELLS[spellId])
    .filter((spell) => spell?.kind === 'healing' && spell.mpCost > 0)
    .map((spell) => ({
      spell,
      casts: Math.floor(stats.maxMp / spell.mpCost),
      healingPerCast: spell.power + stats.magic
    }))
    .filter((candidate) => candidate.casts > 0)
    .sort((a, b) => b.healingPerCast - a.healingPerCast || b.casts - a.casts)[0];
  const spellHealing = healingSpell ? healingSpell.casts * healingSpell.healingPerCast : 0;
  const totalHealing = consumableHealing + spellHealing;
  return {
    consumableHealing,
    spellHealing,
    totalHealing,
    effectiveHp: stats.maxHp + totalHealing,
    bestHealingSpellId: healingSpell?.spell.id,
    healingSpellCasts: healingSpell?.casts,
    consumables
  };
};

const estimateEncounter = (encounterId: string, state: GameState): EncounterProjection => {
  const playerStats = state.player.stats;
  const encounter = ENCOUNTERS[encounterId];
  const enemies = encounter.enemyIds.map((enemyId) => ENEMIES[enemyId]);
  const totalEnemyHp = enemies.reduce((total, enemy) => total + enemy.stats.hp, 0);
  const averageDefense = enemies.reduce((total, enemy) => total + enemy.stats.defense, 0) / Math.max(1, enemies.length);
  const averageEnemyStats: CombatStats = {
    hp: 1,
    maxHp: 1,
    mp: 0,
    maxMp: 0,
    attack: 0,
    defense: Math.round(averageDefense),
    speed: 0,
    magic: 0
  };
  const physicalDamage = averagePhysicalDamage(playerStats, averageEnemyStats);
  const primarySpell = chooseDamageSpell(state, averageEnemyStats);
  const spellCasts =
    primarySpell && primarySpell.damage > physicalDamage
      ? Math.min(primarySpell.casts, Math.ceil(totalEnemyHp / primarySpell.damage))
      : 0;
  const spellDamageTotal = (primarySpell?.damage ?? 0) * spellCasts;
  const physicalTurns = Math.ceil(Math.max(0, totalEnemyHp - spellDamageTotal) / physicalDamage);
  const expectedTurns = Math.max(1, spellCasts + physicalTurns);
  const enemyDamagePerRound = enemies.reduce((total, enemy) => {
    const action = enemy.actions[0];
    return total + averagePhysicalDamage(enemy.stats, playerStats, action.power);
  }, 0);
  const expectedIncomingDamage = Math.max(0, expectedTurns - 1) * enemyDamagePerRound;
  return {
    encounterId,
    label: encounter.name,
    expectedTurns,
    expectedIncomingDamage,
    physicalDamage,
    primarySpellId: spellCasts > 0 ? primarySpell?.spell.id : undefined,
    spellDamage: spellCasts > 0 ? primarySpell?.damage : undefined,
    spellCasts: spellCasts || undefined,
    mpSpent: spellCasts > 0 && primarySpell ? spellCasts * primarySpell.spell.mpCost : undefined
  };
};

const applyPurchase = (state: GameState, id: string) => {
  const price = itemPrice(id);
  if (state.player.gold < price) return false;
  state.player.gold -= price;
  if (SPELLS[id]) {
    if (!state.player.spells.includes(id)) state.player.spells.push(id);
    return true;
  }
  addItem(state, id);
  equipBestAvailable(state);
  return true;
};

const applyQuestReward = (state: GameState, questId?: string) => {
  const rewards = questId ? QUESTS[questId]?.rewards : undefined;
  const applied = {
    questId: rewards ? questId ?? null : null,
    gold: rewards?.gold ?? 0,
    items: [...(rewards?.items ?? [])],
    spells: [...(rewards?.spells ?? [])]
  };
  if (!rewards) return applied;
  state.player.gold += applied.gold;
  for (const itemId of applied.items) addItem(state, itemId);
  for (const spellId of applied.spells) {
    if (!state.player.spells.includes(spellId)) state.player.spells.push(spellId);
  }
  equipBestAvailable(state);
  return applied;
};

const refreshProjectedStats = (state: GameState) => {
  const effective = computeEffectiveStats(state);
  for (const key of combatStatKeys) state.player.stats[key] = effective[key];
  state.player.stats.hp = effective.maxHp;
  state.player.stats.mp = effective.maxMp;
  return effective;
};

export const projectBalanceRoute = (route: BalanceRouteStep[] = BALANCE_ROUTE_STEPS): BalanceProjection => {
  const state = clone(createInitialState());
  let totalXp = 0;
  let totalGold = 0;
  let totalExpectedNormalEncounters = 0;
  let totalBosses = 0;

  const steps = route.map((step) => {
    const levelStart = state.player.level;
    const goldStart = state.player.gold;
    const purchases: string[] = [];
    const unaffordablePurchases: string[] = [];
    for (const purchase of step.expectedPurchases ?? []) {
      if (applyPurchase(state, purchase)) purchases.push(purchase);
      else unaffordablePurchases.push(purchase);
    }

    let xpGained = 0;
    let goldGained = 0;
    for (const expected of step.expectedEncounters) {
      const rewards = encounterRewards(expected.encounterId);
      xpGained += rewards.xp * expected.count;
      goldGained += rewards.gold * expected.count;
      totalExpectedNormalEncounters += expected.count;
    }
    applyXp(state, xpGained);
    state.player.gold += goldGained;

    for (const treasure of step.expectedTreasure ?? []) addItem(state, treasure);
    for (const spell of step.expectedSpellUnlocks ?? []) {
      if (!state.player.spells.includes(spell)) state.player.spells.push(spell);
    }
    equipBestAvailable(state);
    const statsBeforeBoss = clone(refreshProjectedStats(state));
    const recoveryBeforeBoss = estimateRecovery(state, statsBeforeBoss);

    const normalEncounters = step.expectedEncounters.map((expected) => estimateEncounter(expected.encounterId, state));
    let boss: EncounterProjection | undefined;
    if (step.bossEncounterId) {
      const encounter = ENCOUNTERS[step.bossEncounterId];
      boss = estimateEncounter(step.bossEncounterId, state);
      const rewards = encounterRewards(step.bossEncounterId);
      xpGained += rewards.xp;
      goldGained += rewards.gold;
      applyXp(state, rewards.xp);
      state.player.gold += rewards.gold;
      if (encounter.keyItemOnVictory) addItem(state, encounter.keyItemOnVictory);
      totalBosses += 1;
    }

    const questRewards = applyQuestReward(state, step.questRewardId);
    goldGained += questRewards.gold;

    refreshProjectedStats(state);
    totalXp += xpGained;
    totalGold += goldGained;
    const [minLevel, maxLevel] = step.targetLevelRange;
    const warnings = [
      state.player.level < minLevel ? `Expected level ${state.player.level} is below target ${minLevel}.` : '',
      state.player.level > maxLevel ? `Expected level ${state.player.level} is above target ${maxLevel}.` : '',
      boss && boss.expectedTurns < 6 ? `${boss.label} may be too short at ${boss.expectedTurns} turns.` : '',
      boss && boss.expectedTurns > 10 ? `${boss.label} may be too long at ${boss.expectedTurns} turns.` : '',
      boss && boss.expectedIncomingDamage >= recoveryBeforeBoss.effectiveHp
        ? `${boss.label} can overwhelm projected HP and recovery.`
        : ''
    ].filter(Boolean);
    const advisories = [
      boss && boss.expectedIncomingDamage >= statsBeforeBoss.maxHp && boss.expectedIncomingDamage < recoveryBeforeBoss.effectiveHp
        ? `${boss.label} requires recovery planning.`
        : ''
    ].filter(Boolean);

    return {
      stepId: step.id,
      label: step.label,
      village: step.village,
      levelStart,
      levelEnd: state.player.level,
      xpGained,
      goldStart,
      goldEnd: state.player.gold,
      goldGained,
      purchases,
      unaffordablePurchases,
      treasure: step.expectedTreasure ?? [],
      questRewards,
      spells: [...state.player.spells],
      equipment: clone(state.player.equipment),
      statsBeforeBoss,
      recoveryBeforeBoss,
      normalEncounters,
      boss,
      targetLevelRange: step.targetLevelRange,
      warnings,
      advisories
    } satisfies BalanceStepProjection;
  });

  return {
    steps,
    totals: {
      xp: totalXp,
      gold: totalGold,
      expectedNormalEncounters: totalExpectedNormalEncounters,
      bosses: totalBosses
    }
  };
};

export const formatBalanceProjection = (projection: BalanceProjection = projectBalanceRoute()) => {
  const lines = [
    '# Sword Guys Balance Projection',
    '',
    `Expected normal encounters: ${projection.totals.expectedNormalEncounters}`,
    `Mandatory bosses: ${projection.totals.bosses}`,
    `Projected XP: ${projection.totals.xp}`,
    `Projected gold income: ${projection.totals.gold}`,
    ''
  ];

  for (const step of projection.steps) {
    lines.push(`## ${step.label}`);
    lines.push(`Village: ${step.village}`);
    lines.push(`Level: ${step.levelStart} -> ${step.levelEnd} (target ${step.targetLevelRange[0]}-${step.targetLevelRange[1]})`);
    lines.push(`Gold: ${step.goldStart} -> ${step.goldEnd} (+${step.goldGained})`);
    lines.push(`Purchases: ${step.purchases.length ? step.purchases.join(', ') : 'none'}`);
    if (step.unaffordablePurchases.length) lines.push(`Unaffordable: ${step.unaffordablePurchases.join(', ')}`);
    lines.push(`Treasure: ${step.treasure.length ? step.treasure.join(', ') : 'none'}`);
    if (step.questRewards.questId) {
      const rewardBits = [
        step.questRewards.gold ? `${step.questRewards.gold}g` : '',
        ...step.questRewards.items,
        ...step.questRewards.spells
      ].filter(Boolean);
      lines.push(`Quest reward (${step.questRewards.questId}): ${rewardBits.length ? rewardBits.join(', ') : 'flags only'}`);
    }
    lines.push(`Equipment: ${equipmentSlots.map((slot) => `${slot}=${step.equipment[slot] ?? '-'}`).join(', ')}`);
    lines.push(
      `Stats before boss: HP ${step.statsBeforeBoss.maxHp}, MP ${step.statsBeforeBoss.maxMp}, ATK ${step.statsBeforeBoss.attack}, DEF ${step.statsBeforeBoss.defense}, MAG ${step.statsBeforeBoss.magic}`
    );
    const recoveryBits = [
      `effective HP ${step.recoveryBeforeBoss.effectiveHp}`,
      `consumables ${step.recoveryBeforeBoss.consumableHealing}`,
      step.recoveryBeforeBoss.bestHealingSpellId
        ? `${step.recoveryBeforeBoss.bestHealingSpellId} x${step.recoveryBeforeBoss.healingSpellCasts} for ${step.recoveryBeforeBoss.spellHealing}`
        : 'no healing spell'
    ];
    lines.push(`Recovery before boss: ${recoveryBits.join(', ')}`);
    lines.push(
      `Normal fights: ${step.normalEncounters
        .map((encounter) => {
          const spell = encounter.primarySpellId ? ` via ${encounter.primarySpellId} x${encounter.spellCasts}` : '';
          return `${encounter.label} ${encounter.expectedTurns}t/${encounter.expectedIncomingDamage}dmg${spell}`;
        })
        .join('; ')}`
    );
    if (step.boss) {
      const spell = step.boss.primarySpellId ? ` via ${step.boss.primarySpellId} x${step.boss.spellCasts}` : '';
      lines.push(`Boss: ${step.boss.label} ${step.boss.expectedTurns}t/${step.boss.expectedIncomingDamage}dmg${spell}`);
    }
    lines.push(`Warnings: ${step.warnings.length ? step.warnings.join(' | ') : 'none'}`);
    if (step.advisories.length) lines.push(`Advisories: ${step.advisories.join(' | ')}`);
    lines.push('');
  }

  return lines.join('\n');
};
