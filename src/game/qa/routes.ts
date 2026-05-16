import { getGameEngine } from '../simulation/engine';
import { Direction } from '../types';

export interface QaRoute {
  mapId: string;
  x: number;
  y: number;
  facing: Direction;
  flags?: string[];
}

export const QA_ROUTES = {
  'route-start': { mapId: 'overworld_main', x: 12, y: 13, facing: 'north' },
  'route-west-bend': { mapId: 'overworld_main', x: 16, y: 12, facing: 'east' },
  'route-mid': { mapId: 'overworld_main', x: 20, y: 11, facing: 'east' },
  'cave-approach': { mapId: 'overworld_main', x: 22, y: 11, facing: 'east' },
  'cave-mouth': { mapId: 'overworld_main', x: 23, y: 11, facing: 'north' },
  'mossvale-mouth': { mapId: 'mossvale_cave', x: 10, y: 10, facing: 'north' },
  'mossvale-split': { mapId: 'mossvale_cave_split', x: 4, y: 12, facing: 'north' },
  'mossvale-grotto': { mapId: 'mossvale_relic_grotto', x: 3, y: 9, facing: 'east' },
  'greenhollow-shop': { mapId: 'greenhollow_shop', x: 9, y: 5, facing: 'north' },
  'waymeet-shop': { mapId: 'waymeet_shop', x: 9, y: 5, facing: 'north' },
  'lumaire-shop': { mapId: 'lumaire_shop', x: 9, y: 5, facing: 'north' },
  'ironmarch-shop': { mapId: 'ironmarch_shop', x: 9, y: 5, facing: 'north' },
  'sunspire-shop': { mapId: 'sunspire_shop', x: 9, y: 5, facing: 'north' },
  'dustbridge-branch': { mapId: 'dustbridge_ruins_bridge_loop', x: 15, y: 4, facing: 'north' },
  'dustbridge-boss': { mapId: 'dustbridge_ruins_map_room', x: 12, y: 4, facing: 'east' },
  'flooded-shrine-branch': { mapId: 'flooded_shrine_sluice_chapel', x: 15, y: 4, facing: 'north' },
  'flooded-shrine-boss': { mapId: 'flooded_shrine_lumen_sanctum', x: 12, y: 4, facing: 'east' },
  'ironvein-branch': { mapId: 'ironvein_fortress_forge_core', x: 15, y: 4, facing: 'north' },
  'ironvein-boss': { mapId: 'ironvein_fortress_castellan_chamber', x: 12, y: 4, facing: 'east' },
  'eclipse-branch': { mapId: 'eclipse_tower_shadow_stair', x: 15, y: 4, facing: 'north' },
  'eclipse-boss': { mapId: 'eclipse_tower_observatory', x: 12, y: 4, facing: 'east' },
  'event-waymeet-courier': {
    mapId: 'overworld_main',
    x: 35,
    y: 16,
    facing: 'north',
    flags: ['spokeToElder', 'caveRelicFound', 'relicReturned', 'routeToWaymeetUnlocked']
  },
  'event-lumaire-ferryman': {
    mapId: 'overworld_main',
    x: 68,
    y: 32,
    facing: 'north',
    flags: ['spokeToElder', 'caveRelicFound', 'relicReturned', 'waymeetRoadEventSeen', 'roadQuestStarted', 'banditCaptainDefeated', 'routeToLumaireUnlocked']
  },
  'event-ironmarch-miner': {
    mapId: 'overworld_main',
    x: 91,
    y: 42,
    facing: 'north',
    flags: ['spokeToElder', 'caveRelicFound', 'relicReturned', 'waymeetRoadEventSeen', 'roadQuestStarted', 'banditCaptainDefeated', 'lumaireRiverEventSeen', 'shrineQuestStarted', 'mireWardenDefeated', 'routeToIronmarchUnlocked']
  },
  'event-sunspire-bellrunner': {
    mapId: 'overworld_main',
    x: 102,
    y: 67,
    facing: 'north',
    flags: ['spokeToElder', 'caveRelicFound', 'relicReturned', 'waymeetRoadEventSeen', 'roadQuestStarted', 'banditCaptainDefeated', 'lumaireRiverEventSeen', 'shrineQuestStarted', 'mireWardenDefeated', 'ironmarchPassEventSeen', 'fortressQuestStarted', 'ironCastellanDefeated', 'routeToSunspireUnlocked']
  },
  'event-eclipse-page': {
    mapId: 'overworld_main',
    x: 108,
    y: 72,
    facing: 'north',
    flags: ['spokeToElder', 'caveRelicFound', 'relicReturned', 'waymeetRoadEventSeen', 'roadQuestStarted', 'banditCaptainDefeated', 'lumaireRiverEventSeen', 'shrineQuestStarted', 'mireWardenDefeated', 'ironmarchPassEventSeen', 'fortressQuestStarted', 'ironCastellanDefeated', 'sunspireBellEventSeen', 'routeToSunspireUnlocked', 'finalQuestStarted', 'routeToFinalUnlocked']
  }
} as const satisfies Record<string, QaRoute>;

export type QaRouteId = keyof typeof QA_ROUTES;

export const QA_ROUTE_IDS = Object.keys(QA_ROUTES) as QaRouteId[];

export const applyQaRoute = (id: string) => {
  const route = QA_ROUTES[id as QaRouteId];
  if (!route) return `Unknown QA route: ${id}`;
  const engine = getGameEngine();
  const message = engine.qaWarpToTile(route.mapId, route.x, route.y, route.facing);
  ((route as QaRoute).flags ?? []).forEach((flag) => {
    engine.state.questFlags[flag] = true;
  });
  return message;
};
