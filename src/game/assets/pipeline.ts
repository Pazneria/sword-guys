import { AssetKind, AssetStatus, IMAGE_GEN_ASSETS, ImageGenAssetEntry } from './manifest';
import { formatAssetOutputContract } from './contracts';

export type AssetGenerationBatchId =
  | 'foundation-greenhollow-mossvale'
  | 'waymeet-dustbridge'
  | 'lumaire-flooded-shrine'
  | 'ironmarch-ironvein'
  | 'sunspire-eclipse'
  | 'spell-effects';

export interface AssetGenerationBatch {
  id: AssetGenerationBatchId;
  title: string;
  scope: string;
  assetIds: string[];
  qaRoutes: string[];
  acceptance: string[];
}

export interface AssetBatchSummary {
  id: AssetGenerationBatchId;
  title: string;
  total: number;
  approved: number;
  remaining: number;
  nextAssetIds: string[];
  qaRoutes: string[];
}

export interface AssetPipelineReport {
  total: number;
  byKind: Record<AssetKind, number>;
  byStatus: Record<AssetStatus, number>;
  readyForGeneration: number;
  unassignedAssetIds: string[];
  duplicateAssetIds: string[];
  unknownBatchAssetIds: string[];
  batches: AssetBatchSummary[];
}

const ASSET_KINDS: AssetKind[] = ['npcSprite', 'enemySprite', 'battleBackdrop', 'tileset', 'spellEffect'];
const ASSET_STATUSES: AssetStatus[] = ['approved', 'integrated-placeholder', 'planned', 'needs-generation'];
const GENERATION_STATUSES = new Set<AssetStatus>(['integrated-placeholder', 'planned', 'needs-generation']);

export const ASSET_GENERATION_BATCHES: AssetGenerationBatch[] = [
  {
    id: 'foundation-greenhollow-mossvale',
    title: 'Foundation: Greenhollow + Mossvale',
    scope: 'Existing Greenhollow art, first-region placeholder upgrades, Mossvale Cave art, shared town/interior sheets, and common town battle art.',
    assetIds: [
      'greenhollow_elder',
      'greenhollow_guard',
      'greenhollow_rumor',
      'greenhollow_shop_keeper',
      'greenhollow_inn_keeper',
      'field_slime',
      'mire_slug',
      'pebble_imp',
      'grass_wolf',
      'road_rat',
      'thistle_bat',
      'cave_tick',
      'moss_goblin',
      'drip_wisp',
      'grassland',
      'town',
      'cave',
      'greenhollow',
      'overworld_main',
      'overworld_details',
      'weapon_shop',
      'inn',
      'inn_lobby',
      'inn_bedroom',
      'mossvale_cave'
    ],
    qaRoutes: ['route-start', 'cave-mouth', 'mossvale-mouth', 'mossvale-split', 'mossvale-grotto'],
    acceptance: [
      'Greenhollow NPCs read clearly at overworld scale.',
      'First-region enemies have distinct silhouettes in battle.',
      'Mossvale cave rooms preserve step-on transition readability.',
      'Battle backdrops leave quiet space for the lower battle UI.'
    ]
  },
  {
    id: 'waymeet-dustbridge',
    title: 'Waymeet + Dustbridge',
    scope: 'Waymeet village NPCs, the Waymeet road event, Dustbridge enemy set, Dustbridge boss, road/ruin battle art, and Waymeet/Dustbridge tiles.',
    assetIds: [
      'waymeet_broker',
      'waymeet_scout',
      'waymeet_shop_keeper',
      'waymeet_inn_keeper',
      'route_waymeet_courier',
      'bandit_cutpurse',
      'bandit_archer',
      'dust_sprite',
      'ruin_sentinel',
      'bandit_captain_rusk',
      'road',
      'ruin',
      'waymeet',
      'dustbridge_ruins'
    ],
    qaRoutes: ['event-waymeet-courier', 'dustbridge-branch', 'dustbridge-boss'],
    acceptance: [
      'Waymeet NPC sprites feel like road-market people, not Greenhollow recolors.',
      'Bandits and ruin enemies are visually different at battle scale.',
      'Rusk is boss-sized and readable without moving on the map.',
      'Dustbridge tiles support broken-route and treasure-branch rooms.'
    ]
  },
  {
    id: 'lumaire-flooded-shrine',
    title: 'Lumaire + Flooded Shrine',
    scope: 'Lumaire village NPCs, ferryman road event, river and shrine enemies, Mire Warden, river/shrine battle art, and water/shrine tiles.',
    assetIds: [
      'lumaire_oracle',
      'lumaire_student',
      'lumaire_shop_keeper',
      'lumaire_inn_keeper',
      'route_lumaire_ferryman',
      'river_eel',
      'reed_stalker',
      'hex_frog',
      'mirror_wisp',
      'shrine_adept',
      'mire_warden',
      'river',
      'shrine',
      'lumaire',
      'flooded_shrine'
    ],
    qaRoutes: ['event-lumaire-ferryman', 'flooded-shrine-branch', 'flooded-shrine-boss'],
    acceptance: [
      'Lumaire reads as blue-green river magic without becoming low-contrast.',
      'River and shrine enemies stay distinct from watery backdrops.',
      'Mire Warden has a strong boss silhouette.',
      'Flooded Shrine tiles keep walkable shallows and blocking props legible.'
    ]
  },
  {
    id: 'ironmarch-ironvein',
    title: 'Ironmarch + Ironvein',
    scope: 'Ironmarch NPCs, miner road event, mine and fortress enemies, Iron Castellan, mine/fortress/keep battle art, and forge/fortress tiles.',
    assetIds: [
      'ironmarch_marshal',
      'ironmarch_miner',
      'ironmarch_shop_keeper',
      'ironmarch_inn_keeper',
      'route_ironmarch_miner',
      'mine_mole',
      'iron_beetle',
      'ember_bat',
      'fort_guard',
      'fort_lancer',
      'smoke_alchemist',
      'iron_castellan',
      'mine',
      'fortress',
      'castle',
      'ironmarch',
      'ironvein_fortress'
    ],
    qaRoutes: ['event-ironmarch-miner', 'ironvein-branch', 'ironvein-boss'],
    acceptance: [
      'Ironmarch NPCs feel forge-worn and grounded.',
      'Fortress enemies separate human soldiers from machine/insect threats.',
      'Iron Castellan is visually heavier than normal fortress enemies.',
      'Forge and fortress tiles make lava/hazards and branch paths obvious.'
    ]
  },
  {
    id: 'sunspire-eclipse',
    title: 'Sunspire + Eclipse Tower',
    scope: 'Sunspire NPCs, late-route events, capital and eclipse enemies, Hollow Regent, capital/eclipsed tower battle art, and final-region tiles.',
    assetIds: [
      'sunspire_keeper',
      'sunspire_captain',
      'sunspire_shop_keeper',
      'sunspire_inn_keeper',
      'route_sunspire_bellrunner',
      'route_eclipse_page',
      'capital_duelist',
      'sunspire_magus',
      'eclipse_hound',
      'void_moth',
      'hollow_knight',
      'starved_gargoyle',
      'obsidian_acolyte',
      'eclipse_seraph',
      'hollow_regent',
      'capital',
      'dungeon',
      'eclipse',
      'sunspire',
      'eclipse_tower'
    ],
    qaRoutes: ['event-sunspire-bellrunner', 'event-eclipse-page', 'eclipse-branch', 'eclipse-boss'],
    acceptance: [
      'Sunspire art reads as late-game capital polish.',
      'Eclipse enemies stay readable against dark violet tower backdrops.',
      'The Hollow Regent has final-boss presence without obscuring UI.',
      'Final-region tiles preserve pathing through dark rooms.'
    ]
  },
  {
    id: 'spell-effects',
    title: 'Spell Effects',
    scope: 'All player spell strips, normalized for battle playback and readable timing.',
    assetIds: ['spark', 'mend', 'ember', 'river_mend', 'frost_rune', 'sunflare'],
    qaRoutes: ['route-start', 'event-lumaire-ferryman', 'eclipse-boss'],
    acceptance: [
      'Every strip has evenly spaced frames.',
      'Healing, fire, ice, lightning, river, and sun effects are visually distinct.',
      'Effects do not hide enemy HP bars or battle command feedback.',
      'Frame timing feels snappy in battle and does not stall turns.'
    ]
  }
];

const assetById = Object.fromEntries(IMAGE_GEN_ASSETS.map((asset) => [asset.id, asset]));

const countBy = <T extends string>(values: T[], keys: T[]): Record<T, number> =>
  Object.fromEntries(keys.map((key) => [key, values.filter((value) => value === key).length])) as Record<T, number>;

export const getAssetGenerationBatch = (batchId: AssetGenerationBatchId): AssetGenerationBatch => {
  const batch = ASSET_GENERATION_BATCHES.find((candidate) => candidate.id === batchId);
  if (!batch) throw new Error(`Unknown asset generation batch: ${batchId}`);
  return batch;
};

export const getAssetBatchEntries = (batchId: AssetGenerationBatchId): ImageGenAssetEntry[] =>
  getAssetGenerationBatch(batchId).assetIds.map((id) => assetById[id]).filter(Boolean);

export const generationQueueForBatch = (
  batchId: AssetGenerationBatchId,
  options: { includeApproved?: boolean } = {}
): ImageGenAssetEntry[] =>
  getAssetBatchEntries(batchId).filter((entry) => options.includeApproved || GENERATION_STATUSES.has(entry.status));

export const summarizeAssetPipeline = (): AssetPipelineReport => {
  const assignedIds = ASSET_GENERATION_BATCHES.flatMap((batch) => batch.assetIds);
  const duplicateAssetIds = [...new Set(assignedIds.filter((id, index) => assignedIds.indexOf(id) !== index))];
  const manifestIds = new Set(IMAGE_GEN_ASSETS.map((asset) => asset.id));
  const assignedIdSet = new Set(assignedIds);
  const unknownBatchAssetIds = [...new Set(assignedIds.filter((id) => !manifestIds.has(id)))];
  const unassignedAssetIds = IMAGE_GEN_ASSETS.map((asset) => asset.id).filter((id) => !assignedIdSet.has(id));

  return {
    total: IMAGE_GEN_ASSETS.length,
    byKind: countBy(
      IMAGE_GEN_ASSETS.map((asset) => asset.kind),
      ASSET_KINDS
    ),
    byStatus: countBy(
      IMAGE_GEN_ASSETS.map((asset) => asset.status),
      ASSET_STATUSES
    ),
    readyForGeneration: IMAGE_GEN_ASSETS.filter((asset) => GENERATION_STATUSES.has(asset.status)).length,
    unassignedAssetIds,
    duplicateAssetIds,
    unknownBatchAssetIds,
    batches: ASSET_GENERATION_BATCHES.map((batch) => {
      const entries = getAssetBatchEntries(batch.id);
      const queue = generationQueueForBatch(batch.id);
      return {
        id: batch.id,
        title: batch.title,
        total: entries.length,
        approved: entries.filter((entry) => entry.status === 'approved').length,
        remaining: queue.length,
        nextAssetIds: queue.slice(0, 8).map((entry) => entry.id),
        qaRoutes: batch.qaRoutes
      };
    })
  };
};

const formatAssetPrompt = (entry: ImageGenAssetEntry, index: number) => {
  const lines = [
    `### ${index + 1}. ${entry.id}`,
    `Kind: ${entry.kind}`,
    `Status: ${entry.status}`,
    `Target: ${entry.targetPath}`,
    `Prompt: ${entry.prompt}`,
    formatAssetOutputContract(entry)
  ];
  if (entry.references?.length) lines.push(`References: ${entry.references.join(', ')}`);
  if (entry.notes) lines.push(`Notes: ${entry.notes}`);
  return lines.join('\n');
};

export const buildImageGenerationPromptBundle = (
  batchId: AssetGenerationBatchId,
  options: { includeApproved?: boolean } = {}
) => {
  const batch = getAssetGenerationBatch(batchId);
  const entries = generationQueueForBatch(batch.id, options);
  return [
    `# ${batch.title}`,
    `Batch ID: ${batch.id}`,
    `Scope: ${batch.scope}`,
    `QA Routes: ${batch.qaRoutes.join(', ')}`,
    `Acceptance: ${batch.acceptance.join(' | ')}`,
    `Assets in this bundle: ${entries.length}`,
    ...entries.map(formatAssetPrompt)
  ].join('\n\n');
};

export const buildImageGenerationBatchPacket = (
  batchId: AssetGenerationBatchId,
  options: { includeApproved?: boolean } = {}
) => {
  const batch = getAssetGenerationBatch(batchId);
  const entries = generationQueueForBatch(batch.id, options);
  const kindCounts = countBy(
    entries.map((entry) => entry.kind),
    ASSET_KINDS
  );

  return [
    buildImageGenerationPromptBundle(batch.id, options),
    '## Batch Review Checklist',
    `Asset count: ${entries.length}`,
    `By kind: ${ASSET_KINDS.map((kind) => `${kind}=${kindCounts[kind]}`).join(', ')}`,
    '',
    '### Acceptance',
    ...batch.acceptance.map((item) => `- [ ] ${item}`),
    '',
    '### Save Targets',
    ...entries.map((entry) => `- [ ] ${entry.id}: ${entry.targetPath}`),
    '',
    '### QA Routes',
    ...batch.qaRoutes.map((route) => `- [ ] ${route}`),
    '',
    '### Verification Commands',
    `- [ ] npm run assets:stage -- ${batch.id} --write`,
    '- [ ] npm run assets:receipt -- --asset <asset-id> --review-note "Purpose-built Sword Guys art reviewed in QA." --write',
    `- [ ] npm run assets:promote -- --batch ${batch.id}`,
    `- [ ] npm run assets:promote -- --batch ${batch.id} --purpose-built --write`,
    '- [ ] npm run assets:check -- --strict',
    '- [ ] npm run assets:verify',
    '- [ ] npm run content:matrix -- --strict',
    '',
    '### Approval Notes',
    '- Keep manifest status unchanged until the PNG exists at its target path and passes the output contract.',
    '- Do not promote prototype, recycled, cache-sourced, or other-project-looking art as production.',
    '- Write a production receipt for each approved PNG; the receipt must preserve the manifest prompt and visual review note.',
    '- Use --purpose-built only after every promotion candidate has a valid receipt beside its PNG.',
    '- After approving an asset, capture the relevant QA route and add any visual notes back to the manifest entry.'
  ].join('\n');
};
