import { ENCOUNTERS, ENEMIES, MAPS, SPELLS } from '../content';
import { ITEM_ICON_ASSETS, buildItemIconCoverageReport } from '../items/icons';
import {
  BATTLE_BACKDROP_ASSETS,
  ENEMY_ASSETS,
  NPC_ASSETS,
  SPELL_EFFECT_ASSETS,
  TILESET_ASSETS
} from './manifest';

const REQUIRED_TILESET_IDS = [
  'greenhollow',
  'waymeet',
  'lumaire',
  'ironmarch',
  'sunspire',
  'overworld_main',
  'overworld_details',
  'weapon_shop',
  'inn',
  'inn_lobby',
  'inn_bedroom',
  'mossvale_cave',
  'dustbridge_ruins',
  'flooded_shrine',
  'ironvein_fortress',
  'eclipse_tower'
];

export interface AssetCoverageReport {
  required: {
    npcIds: string[];
    enemyIds: string[];
    backdropIds: string[];
    spellEffectIds: string[];
    itemIconIds: string[];
    tilesetIds: string[];
  };
  missing: {
    npcIds: string[];
    enemyIds: string[];
    backdropIds: string[];
    spellEffectIds: string[];
    itemIconIds: string[];
    tilesetIds: string[];
  };
  totalMissing: number;
  complete: boolean;
}

const uniqueSorted = (values: string[]) => [...new Set(values)].sort();

const missingFrom = (required: string[], available: string[]) => {
  const availableSet = new Set(available);
  return required.filter((id) => !availableSet.has(id));
};

export const buildAssetCoverageReport = (): AssetCoverageReport => {
  const iconCoverage = buildItemIconCoverageReport();
  const required = {
    npcIds: uniqueSorted(Object.values(MAPS).flatMap((map) => map.npcs.map((npc) => npc.id))),
    enemyIds: uniqueSorted(Object.keys(ENEMIES)),
    backdropIds: uniqueSorted([
      ...Object.values(MAPS).map((map) => map.battleBackdrop),
      ...Object.values(MAPS).flatMap((map) => map.regions.flatMap((region) => (region.battleBackdrop ? [region.battleBackdrop] : []))),
      ...Object.values(ENCOUNTERS).map((encounter) => encounter.backdrop)
    ]),
    spellEffectIds: uniqueSorted(Object.keys(SPELLS)),
    itemIconIds: uniqueSorted([
      ...iconCoverage.requiredItemIds,
      ...iconCoverage.requiredSpellIds,
      ...iconCoverage.requiredShopEntryIds
    ]),
    tilesetIds: uniqueSorted(REQUIRED_TILESET_IDS)
  };
  const missing = {
    npcIds: missingFrom(required.npcIds, NPC_ASSETS.map((entry) => entry.id)),
    enemyIds: missingFrom(required.enemyIds, ENEMY_ASSETS.map((entry) => entry.id)),
    backdropIds: missingFrom(required.backdropIds, BATTLE_BACKDROP_ASSETS.map((entry) => entry.id)),
    spellEffectIds: missingFrom(required.spellEffectIds, SPELL_EFFECT_ASSETS.map((entry) => entry.id)),
    itemIconIds: missingFrom(required.itemIconIds, ITEM_ICON_ASSETS.map((entry) => entry.id)),
    tilesetIds: missingFrom(required.tilesetIds, TILESET_ASSETS.map((entry) => entry.id))
  };
  const totalMissing = Object.values(missing).reduce((total, ids) => total + ids.length, 0);

  return {
    required,
    missing,
    totalMissing,
    complete: totalMissing === 0
  };
};

export const formatAssetCoverageReport = (report: AssetCoverageReport = buildAssetCoverageReport()) => {
  const lines = [
    '# Sword Guys Asset Coverage',
    '',
    `Coverage complete: ${report.complete ? 'yes' : 'no'}`,
    `Missing manifest entries: ${report.totalMissing}`,
    '',
    '| Surface | Required | Missing |',
    '| --- | ---: | --- |'
  ];
  const rows = [
    ['NPC sprites', report.required.npcIds, report.missing.npcIds],
    ['Enemy sprites', report.required.enemyIds, report.missing.enemyIds],
    ['Battle backdrops', report.required.backdropIds, report.missing.backdropIds],
    ['Spell animations', report.required.spellEffectIds, report.missing.spellEffectIds],
    ['Item icons', report.required.itemIconIds, report.missing.itemIconIds],
    ['Tilesets', report.required.tilesetIds, report.missing.tilesetIds]
  ] as const;

  for (const [label, required, missing] of rows) {
    lines.push(`| ${label} | ${required.length} | ${missing.length ? missing.join(', ') : 'none'} |`);
  }

  return lines.join('\n');
};
