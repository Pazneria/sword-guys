import { ENEMIES, ITEMS, SHOPS, SPELLS } from '../content';
import type { CombatStats, EquipmentSlot, ItemDefinition } from '../types';
import { buildItemIconCoverageReport } from './icons';

export interface EquipmentProgressionRow {
  slot: EquipmentSlot | 'accessory';
  path: string[];
  prices: number[];
  scores: number[];
  monotonicPrice: boolean;
  monotonicPower: boolean;
}

export interface ItemEconomyIssue {
  id: string;
  message: string;
}

export interface ItemEconomyReport {
  itemCount: number;
  sellableItemCount: number;
  shopCount: number;
  shopEntryCount: number;
  dropEnemyCount: number;
  distinctDropItemIds: string[];
  equipmentProgression: EquipmentProgressionRow[];
  iconCoverageComplete: boolean;
  issues: ItemEconomyIssue[];
  complete: boolean;
}

const combatStatWeights: Record<keyof CombatStats, number> = {
  hp: 0,
  maxHp: 0.25,
  mp: 0,
  maxMp: 0.25,
  attack: 1.45,
  defense: 1.25,
  speed: 0.65,
  magic: 1.15
};

export const catalogPriceForId = (id: string) => ITEMS[id]?.price ?? (SPELLS[id] ? SPELLS[id].mpCost * 18 : 0);
export const catalogSellValueForItem = (item: ItemDefinition) => item.sellPrice ?? Math.floor(item.price * 0.45);

const equipmentPowerScore = (item: ItemDefinition) =>
  Object.entries(item.stats ?? {}).reduce((score, [key, value]) => score + Number(value) * combatStatWeights[key as keyof CombatStats], 0);

const monotonic = (values: number[]) => values.every((value, index) => index === 0 || value > values[index - 1]);

const EQUIPMENT_PROGRESSIONS: Array<{ slot: EquipmentProgressionRow['slot']; path: string[] }> = [
  { slot: 'weapon', path: ['wooden_sword', 'rusty_sword', 'iron_sword', 'steel_sword', 'silver_sword', 'enchanted_blade'] },
  { slot: 'weapon', path: ['apprentice_staff', 'master_staff'] },
  { slot: 'helmet', path: ['cloth_cap', 'leather_cap', 'steel_helmet', 'plate_helm'] },
  { slot: 'bodyArmor', path: ['cloth_tunic', 'leather_armor', 'chainmail', 'plate_armor'] },
  { slot: 'bodyArmor', path: ['mage_robe', 'plate_armor'] },
  { slot: 'legArmor', path: ['cloth_leggings', 'leather_leggings', 'steel_greaves', 'plate_greaves'] },
  { slot: 'shield', path: ['small_shield', 'iron_shield', 'tower_shield', 'sunward_aegis'] },
  { slot: 'accessory', path: ['copper_ring', 'river_charm', 'ember_amulet'] }
];

export const buildEquipmentProgressionRows = (): EquipmentProgressionRow[] =>
  EQUIPMENT_PROGRESSIONS.map(({ slot, path }) => {
    const items = path.map((id) => ITEMS[id]).filter(Boolean);
    const prices = items.map((item) => item.price);
    const scores = items.map(equipmentPowerScore);
    return {
      slot,
      path,
      prices,
      scores,
      monotonicPrice: monotonic(prices),
      monotonicPower: monotonic(scores)
    };
  });

export const buildItemEconomyReport = (): ItemEconomyReport => {
  const issues: ItemEconomyIssue[] = [];
  const itemEntries = Object.values(ITEMS);
  const sellableItems = itemEntries.filter((item) => !item.keyItem && item.category !== 'keyItem');
  const knownCatalogIds = new Set([...Object.keys(ITEMS), ...Object.keys(SPELLS)]);

  for (const item of sellableItems) {
    if (item.sellPrice === undefined) issues.push({ id: item.id, message: 'Sellable item is missing an explicit sellPrice.' });
    const sellValue = catalogSellValueForItem(item);
    if (sellValue <= 0) issues.push({ id: item.id, message: 'Sellable item must sell for at least 1g.' });
    if (sellValue >= item.price) issues.push({ id: item.id, message: 'Sell value must stay below buy value.' });
    const ratio = sellValue / Math.max(1, item.price);
    if (ratio < 0.35 || ratio > 0.55) issues.push({ id: item.id, message: `Sell value ratio ${ratio.toFixed(2)} is outside the 35-55% target band.` });
  }

  for (const item of itemEntries.filter((candidate) => candidate.keyItem || candidate.category === 'keyItem')) {
    if (item.price !== 0) issues.push({ id: item.id, message: 'Key items must have a 0g buy value.' });
    if (item.sellPrice && item.sellPrice > 0) issues.push({ id: item.id, message: 'Key items must not have a positive sell value.' });
  }

  for (const shop of Object.values(SHOPS)) {
    const seen = new Set<string>();
    for (const id of shop.inventory) {
      if (!knownCatalogIds.has(id)) issues.push({ id: `${shop.id}:${id}`, message: 'Shop entry is not a known item or spell.' });
      if (seen.has(id)) issues.push({ id: `${shop.id}:${id}`, message: 'Shop inventory has a duplicate entry.' });
      seen.add(id);
      if (ITEMS[id]?.category === 'keyItem') issues.push({ id: `${shop.id}:${id}`, message: 'Key items must not be sold in shops.' });
      if (catalogPriceForId(id) <= 0) issues.push({ id: `${shop.id}:${id}`, message: 'Shop entry must have a positive buy price.' });
    }
  }

  const distinctDropItemIds = new Set<string>();
  for (const enemy of Object.values(ENEMIES)) {
    if (!enemy.drops?.length) issues.push({ id: enemy.id, message: 'Enemy is missing a drop table.' });
    for (const drop of enemy.drops ?? []) {
      distinctDropItemIds.add(drop.itemId);
      const item = ITEMS[drop.itemId];
      if (!item) issues.push({ id: `${enemy.id}:${drop.itemId}`, message: 'Drop table references an unknown item.' });
      if (item?.category === 'keyItem' || item?.keyItem) issues.push({ id: `${enemy.id}:${drop.itemId}`, message: 'Random drop tables must not award key items.' });
      if (drop.chance <= 0 || drop.chance > 0.5) issues.push({ id: `${enemy.id}:${drop.itemId}`, message: 'Drop chance must be greater than 0 and at most 50%.' });
      if ((drop.quantity ?? 1) <= 0) issues.push({ id: `${enemy.id}:${drop.itemId}`, message: 'Drop quantity must be positive.' });
    }
  }
  if (distinctDropItemIds.size < 5) issues.push({ id: 'drop-variety', message: 'Drop tables need at least five distinct item rewards.' });

  const equipmentProgression = buildEquipmentProgressionRows();
  for (const row of equipmentProgression) {
    for (const id of row.path) {
      const item = ITEMS[id];
      if (!item?.equipmentSlot) issues.push({ id, message: 'Equipment progression path references a non-equipment item.' });
    }
    if (!row.monotonicPrice) issues.push({ id: row.path.join('>'), message: 'Equipment progression prices must increase tier over tier.' });
    if (!row.monotonicPower) issues.push({ id: row.path.join('>'), message: 'Equipment progression stat scores must increase tier over tier.' });
  }

  const iconCoverage = buildItemIconCoverageReport();
  if (!iconCoverage.complete) issues.push({ id: 'item-icons', message: 'Item icon manifest is missing required item, spell, or shop-entry icons.' });

  return {
    itemCount: itemEntries.length,
    sellableItemCount: sellableItems.length,
    shopCount: Object.keys(SHOPS).length,
    shopEntryCount: Object.values(SHOPS).reduce((total, shop) => total + shop.inventory.length, 0),
    dropEnemyCount: Object.values(ENEMIES).length,
    distinctDropItemIds: [...distinctDropItemIds].sort(),
    equipmentProgression,
    iconCoverageComplete: iconCoverage.complete,
    issues,
    complete: issues.length === 0
  };
};

export const formatItemEconomyReport = (report: ItemEconomyReport = buildItemEconomyReport()) => {
  const lines = [
    '# Sword Guys Item Economy Report',
    '',
    `Complete: ${report.complete ? 'yes' : 'no'}`,
    `Items: ${report.itemCount} (${report.sellableItemCount} sellable)`,
    `Shops: ${report.shopCount} shops, ${report.shopEntryCount} buy entries`,
    `Enemies with drop tables: ${report.dropEnemyCount}`,
    `Distinct drop rewards: ${report.distinctDropItemIds.join(', ')}`,
    `Icon coverage complete: ${report.iconCoverageComplete ? 'yes' : 'no'}`,
    '',
    '## Equipment Progression'
  ];

  for (const row of report.equipmentProgression) {
    lines.push(
      `- ${row.slot}: ${row.path.join(' -> ')} | prices ${row.prices.join(' -> ')} | scores ${row.scores
        .map((score) => score.toFixed(1))
        .join(' -> ')}`
    );
  }

  lines.push('', '## Issues');
  if (report.issues.length) {
    for (const issue of report.issues) lines.push(`- ${issue.id}: ${issue.message}`);
  } else {
    lines.push('- none');
  }

  return lines.join('\n');
};
