import { ASSET_GENERATION_BATCHES, AssetGenerationBatchId } from '../assets/pipeline';
import { BALANCE_ROUTE_STEPS } from '../balance/model';
import { ENCOUNTERS, MAPS } from '../content';
import { QA_ROUTES, QaRouteId } from '../qa/routes';
import { MapType } from '../types';

export type ContentObjectiveKind = 'relic' | 'boss';

export interface FiveRoadsSliceSpec {
  id: string;
  village: string;
  villageMapId: string;
  balanceStepId: string;
  assetBatchId: AssetGenerationBatchId;
  routeEventNpcIds: string[];
  routeEventQaRouteIds: QaRouteId[];
  dungeonMapIds: string[];
  branchQaRouteIds: QaRouteId[];
  objectiveQaRouteIds: QaRouteId[];
  objectiveKind: ContentObjectiveKind;
  objectiveItemIds: string[];
  bossEncounterId?: string;
  bossEntityId?: string;
}

export interface FiveRoadsSliceAudit {
  id: string;
  village: string;
  villageExists: boolean;
  routeEventsFound: string[];
  routeEventQaRoutes: string[];
  dungeonRoomCount: number;
  dungeonRoomsFound: string[];
  normalEnemyEntityCount: number;
  encounterZoneCount: number;
  treasureItemIds: string[];
  bossEntityStationary: boolean | null;
  objectiveKind: ContentObjectiveKind;
  objectiveComplete: boolean;
  balanceStepFound: boolean;
  assetBatchFound: boolean;
  qaRoutesFound: string[];
  warnings: string[];
}

export interface FiveRoadsContentMatrix {
  slices: FiveRoadsSliceAudit[];
  totals: {
    villages: number;
    routeEvents: number;
    dungeonRooms: number;
    threeRoomDungeons: number;
    objectiveComplete: number;
    warnings: number;
  };
  warnings: string[];
}

export const FIVE_ROADS_SLICE_SPECS: FiveRoadsSliceSpec[] = [
  {
    id: 'greenhollow_mossvale',
    village: 'Greenhollow',
    villageMapId: 'greenhollow',
    balanceStepId: 'greenhollow_mossvale',
    assetBatchId: 'foundation-greenhollow-mossvale',
    routeEventNpcIds: [],
    routeEventQaRouteIds: [],
    dungeonMapIds: ['mossvale_cave', 'mossvale_cave_split', 'mossvale_relic_grotto'],
    branchQaRouteIds: ['mossvale-split'],
    objectiveQaRouteIds: ['mossvale-grotto'],
    objectiveKind: 'relic',
    objectiveItemIds: ['cave_relic']
  },
  {
    id: 'waymeet_dustbridge',
    village: 'Waymeet',
    villageMapId: 'waymeet',
    balanceStepId: 'waymeet_dustbridge',
    assetBatchId: 'waymeet-dustbridge',
    routeEventNpcIds: ['route_waymeet_courier'],
    routeEventQaRouteIds: ['event-waymeet-courier'],
    dungeonMapIds: ['dustbridge_ruins', 'dustbridge_ruins_ledger_hall', 'dustbridge_ruins_bridge_loop', 'dustbridge_ruins_map_room'],
    branchQaRouteIds: ['dustbridge-branch'],
    objectiveQaRouteIds: ['dustbridge-boss'],
    objectiveKind: 'boss',
    objectiveItemIds: ['copper_ring', 'road_seal'],
    bossEncounterId: 'boss_rusk',
    bossEntityId: 'dustbridge_ruins_boss'
  },
  {
    id: 'lumaire_shrine',
    village: 'Lumaire',
    villageMapId: 'lumaire',
    balanceStepId: 'lumaire_shrine',
    assetBatchId: 'lumaire-flooded-shrine',
    routeEventNpcIds: ['route_lumaire_ferryman'],
    routeEventQaRouteIds: ['event-lumaire-ferryman'],
    dungeonMapIds: ['flooded_shrine', 'flooded_shrine_reed_maze', 'flooded_shrine_sluice_chapel', 'flooded_shrine_lumen_sanctum'],
    branchQaRouteIds: ['flooded-shrine-branch'],
    objectiveQaRouteIds: ['flooded-shrine-boss'],
    objectiveKind: 'boss',
    objectiveItemIds: ['river_charm', 'shrine_lumen'],
    bossEncounterId: 'boss_mire_warden',
    bossEntityId: 'flooded_shrine_boss'
  },
  {
    id: 'ironmarch_fortress',
    village: 'Ironmarch',
    villageMapId: 'ironmarch',
    balanceStepId: 'ironmarch_fortress',
    assetBatchId: 'ironmarch-ironvein',
    routeEventNpcIds: ['route_ironmarch_miner'],
    routeEventQaRouteIds: ['event-ironmarch-miner'],
    dungeonMapIds: ['ironvein_fortress', 'ironvein_fortress_barracks', 'ironvein_fortress_forge_core', 'ironvein_fortress_castellan_chamber'],
    branchQaRouteIds: ['ironvein-branch'],
    objectiveQaRouteIds: ['ironvein-boss'],
    objectiveKind: 'boss',
    objectiveItemIds: ['ember_amulet', 'iron_writ'],
    bossEncounterId: 'boss_iron_castellan',
    bossEntityId: 'ironvein_fortress_boss'
  },
  {
    id: 'sunspire_eclipse',
    village: 'Sunspire',
    villageMapId: 'sunspire',
    balanceStepId: 'sunspire_eclipse',
    assetBatchId: 'sunspire-eclipse',
    routeEventNpcIds: ['route_sunspire_bellrunner', 'route_eclipse_page'],
    routeEventQaRouteIds: ['event-sunspire-bellrunner', 'event-eclipse-page'],
    dungeonMapIds: ['eclipse_tower', 'eclipse_tower_library', 'eclipse_tower_shadow_stair', 'eclipse_tower_observatory'],
    branchQaRouteIds: ['eclipse-branch'],
    objectiveQaRouteIds: ['eclipse-boss'],
    objectiveKind: 'boss',
    objectiveItemIds: ['sunward_aegis'],
    bossEncounterId: 'boss_hollow_regent',
    bossEntityId: 'eclipse_tower_boss'
  }
];

const dungeonLikeTypes = new Set<MapType>(['cave', 'dungeon', 'shrine', 'castle']);

const routeExists = (id: string) => Boolean(QA_ROUTES[id as QaRouteId]);

const mapHasChestItem = (mapId: string, itemId: string) =>
  MAPS[mapId]?.objects.some((object) => object.type === 'chest' && object.givesItemId === itemId) ?? false;

const mapHasBossKeyItem = (mapId: string, itemId: string) =>
  MAPS[mapId]?.enemies.some((enemy) => {
    if (!enemy.boss) return false;
    return ENCOUNTERS[enemy.encounterId]?.keyItemOnVictory === itemId;
  }) ?? false;

const buildSliceAudit = (spec: FiveRoadsSliceSpec): FiveRoadsSliceAudit => {
  const dungeonRoomsFound = spec.dungeonMapIds.filter((mapId) => dungeonLikeTypes.has(MAPS[mapId]?.type));
  const dungeonMaps = dungeonRoomsFound.map((mapId) => MAPS[mapId]);
  const routeEventsFound = spec.routeEventNpcIds.filter((npcId) =>
    Object.values(MAPS).some((map) => map.npcs.some((npc) => npc.id === npcId))
  );
  const routeEventQaRoutes = spec.routeEventQaRouteIds.filter(routeExists);
  const qaRouteIds = [...spec.routeEventQaRouteIds, ...spec.branchQaRouteIds, ...spec.objectiveQaRouteIds];
  const qaRoutesFound = qaRouteIds.filter(routeExists);
  const normalEnemyEntityCount = dungeonMaps.reduce(
    (total, map) => total + map.enemies.filter((enemy) => !enemy.boss && enemy.behavior !== 'bossEntity').length,
    0
  );
  const encounterZoneCount = dungeonMaps.reduce(
    (total, map) => total + map.regions.filter((region) => region.type === 'encounterZone' && region.encounterTable).length,
    0
  );
  const treasureItemIds = spec.objectiveItemIds.filter((itemId) =>
    spec.dungeonMapIds.some((mapId) => mapHasChestItem(mapId, itemId) || mapHasBossKeyItem(mapId, itemId))
  );
  const bossEntity = spec.bossEntityId
    ? dungeonMaps.flatMap((map) => map.enemies).find((enemy) => enemy.id === spec.bossEntityId)
    : undefined;
  const bossEntityStationary = spec.objectiveKind === 'boss' ? Boolean(bossEntity?.boss && bossEntity.moveSpeed === 0) : null;
  const balanceStepFound = BALANCE_ROUTE_STEPS.some((step) => step.id === spec.balanceStepId);
  const assetBatchFound = ASSET_GENERATION_BATCHES.some((batch) => batch.id === spec.assetBatchId);
  const objectiveComplete =
    spec.objectiveKind === 'relic'
      ? spec.objectiveItemIds.every((itemId) => treasureItemIds.includes(itemId))
      : Boolean(spec.bossEncounterId && bossEntityStationary && spec.objectiveItemIds.some((itemId) => treasureItemIds.includes(itemId)));

  const warnings = [
    MAPS[spec.villageMapId] ? '' : `${spec.village} map is missing.`,
    routeEventsFound.length === spec.routeEventNpcIds.length ? '' : `${spec.village} route event NPC coverage is incomplete.`,
    routeEventQaRoutes.length === spec.routeEventQaRouteIds.length ? '' : `${spec.village} route event QA route coverage is incomplete.`,
    dungeonRoomsFound.length >= 3 ? '' : `${spec.village} dungeon has fewer than three rooms.`,
    normalEnemyEntityCount === 0 ? '' : `${spec.village} dungeon still has visible normal enemy entities.`,
    encounterZoneCount > 0 ? '' : `${spec.village} dungeon has no random encounter zones.`,
    objectiveComplete ? '' : `${spec.village} ${spec.objectiveKind} objective coverage is incomplete.`,
    qaRoutesFound.length === qaRouteIds.length ? '' : `${spec.village} QA route coverage is incomplete.`,
    balanceStepFound ? '' : `${spec.village} balance step is missing.`,
    assetBatchFound ? '' : `${spec.village} asset batch is missing.`
  ].filter(Boolean);

  return {
    id: spec.id,
    village: spec.village,
    villageExists: Boolean(MAPS[spec.villageMapId]),
    routeEventsFound,
    routeEventQaRoutes,
    dungeonRoomCount: dungeonRoomsFound.length,
    dungeonRoomsFound,
    normalEnemyEntityCount,
    encounterZoneCount,
    treasureItemIds,
    bossEntityStationary,
    objectiveKind: spec.objectiveKind,
    objectiveComplete,
    balanceStepFound,
    assetBatchFound,
    qaRoutesFound,
    warnings
  };
};

export const buildFiveRoadsContentMatrix = (): FiveRoadsContentMatrix => {
  const slices = FIVE_ROADS_SLICE_SPECS.map(buildSliceAudit);
  const warnings = slices.flatMap((slice) => slice.warnings);
  return {
    slices,
    totals: {
      villages: slices.filter((slice) => slice.villageExists).length,
      routeEvents: slices.reduce((total, slice) => total + slice.routeEventsFound.length, 0),
      dungeonRooms: slices.reduce((total, slice) => total + slice.dungeonRoomCount, 0),
      threeRoomDungeons: slices.filter((slice) => slice.dungeonRoomCount >= 3).length,
      objectiveComplete: slices.filter((slice) => slice.objectiveComplete).length,
      warnings: warnings.length
    },
    warnings
  };
};

export const formatFiveRoadsContentMatrix = (matrix: FiveRoadsContentMatrix = buildFiveRoadsContentMatrix()) => {
  const lines = [
    '# Five Roads Content Matrix',
    '',
    `Villages: ${matrix.totals.villages}/5`,
    `Route events: ${matrix.totals.routeEvents}/5`,
    `Dungeon rooms: ${matrix.totals.dungeonRooms}`,
    `Three-room dungeons: ${matrix.totals.threeRoomDungeons}/5`,
    `Objectives covered: ${matrix.totals.objectiveComplete}/5`,
    `Warnings: ${matrix.totals.warnings}`,
    ''
  ];

  for (const slice of matrix.slices) {
    lines.push(`## ${slice.village}`);
    lines.push(`Dungeon rooms: ${slice.dungeonRoomCount} (${slice.dungeonRoomsFound.join(', ')})`);
    lines.push(`Route events: ${slice.routeEventsFound.length ? slice.routeEventsFound.join(', ') : 'start slice'}`);
    lines.push(`QA routes: ${slice.qaRoutesFound.join(', ')}`);
    lines.push(`Treasure/objective items: ${slice.treasureItemIds.join(', ') || 'none'}`);
    lines.push(`Boss stationary: ${slice.bossEntityStationary === null ? 'n/a' : String(slice.bossEntityStationary)}`);
    lines.push(`Warnings: ${slice.warnings.length ? slice.warnings.join(' | ') : 'none'}`);
    lines.push('');
  }

  return lines.join('\n');
};
