import { getGameEngine } from '../simulation/engine';
import { Direction } from '../types';

export interface QaBattleScene {
  label: string;
  mapId: string;
  x: number;
  y: number;
  facing: Direction;
  encounterId: string;
  expectedBackdrop: string;
  flags?: string[];
}

const ROAD_UNLOCK_FLAGS = ['spokeToElder', 'caveRelicFound', 'relicReturned', 'routeToWaymeetUnlocked'];
const RIVER_UNLOCK_FLAGS = [...ROAD_UNLOCK_FLAGS, 'waymeetRoadEventSeen', 'roadQuestStarted', 'banditCaptainDefeated', 'routeToLumaireUnlocked'];
const IRONMARCH_UNLOCK_FLAGS = [...RIVER_UNLOCK_FLAGS, 'lumaireRiverEventSeen', 'shrineQuestStarted', 'mireWardenDefeated', 'routeToIronmarchUnlocked'];
const SUNSPIRE_UNLOCK_FLAGS = [...IRONMARCH_UNLOCK_FLAGS, 'ironmarchPassEventSeen', 'fortressQuestStarted', 'ironCastellanDefeated', 'routeToSunspireUnlocked'];
const FINAL_UNLOCK_FLAGS = [...SUNSPIRE_UNLOCK_FLAGS, 'sunspireBellEventSeen', 'finalQuestStarted', 'routeToFinalUnlocked'];

export const QA_BATTLE_SCENES = {
  'greenhollow-fields': {
    label: 'Greenhollow Fields',
    mapId: 'overworld_main',
    x: 12,
    y: 12,
    facing: 'east',
    encounterId: 'slime_pair',
    expectedBackdrop: 'grassland'
  },
  'greenhollow-town': {
    label: 'Greenhollow Town Edge',
    mapId: 'greenhollow',
    x: 10,
    y: 7,
    facing: 'south',
    encounterId: 'greenhollow_roamers',
    expectedBackdrop: 'town'
  },
  'mossvale-cave': {
    label: 'Mossvale Cave',
    mapId: 'mossvale_cave',
    x: 10,
    y: 6,
    facing: 'north',
    encounterId: 'slime_pair',
    expectedBackdrop: 'cave'
  },
  'waymeet-road': {
    label: 'Waymeet Road',
    mapId: 'overworld_main',
    x: 42,
    y: 20,
    facing: 'east',
    encounterId: 'bandit_scouts',
    expectedBackdrop: 'road',
    flags: ROAD_UNLOCK_FLAGS
  },
  'dustbridge-ruins': {
    label: 'Dustbridge Ruins',
    mapId: 'dustbridge_ruins',
    x: 10,
    y: 6,
    facing: 'north',
    encounterId: 'bandit_scouts',
    expectedBackdrop: 'ruin',
    flags: ROAD_UNLOCK_FLAGS
  },
  'lumaire-riverbank': {
    label: 'Lumaire Riverbank',
    mapId: 'overworld_main',
    x: 72,
    y: 16,
    facing: 'south',
    encounterId: 'river_menace',
    expectedBackdrop: 'river',
    flags: RIVER_UNLOCK_FLAGS
  },
  'flooded-shrine': {
    label: 'Flooded Shrine',
    mapId: 'flooded_shrine',
    x: 10,
    y: 6,
    facing: 'north',
    encounterId: 'shrine_mirrors',
    expectedBackdrop: 'shrine',
    flags: RIVER_UNLOCK_FLAGS
  },
  'ironmarch-pass': {
    label: 'Ironmarch Mountain Pass',
    mapId: 'overworld_main',
    x: 90,
    y: 40,
    facing: 'east',
    encounterId: 'fort_patrol',
    expectedBackdrop: 'mine',
    flags: IRONMARCH_UNLOCK_FLAGS
  },
  'ironvein-fortress': {
    label: 'Ironvein Fortress',
    mapId: 'ironvein_fortress_barracks',
    x: 12,
    y: 8,
    facing: 'north',
    encounterId: 'fort_patrol',
    expectedBackdrop: 'fortress',
    flags: IRONMARCH_UNLOCK_FLAGS
  },
  'ironvein-keep': {
    label: 'Ironvein Keep',
    mapId: 'ironvein_fortress_castellan_chamber',
    x: 12,
    y: 5,
    facing: 'north',
    encounterId: 'boss_iron_castellan',
    expectedBackdrop: 'castle',
    flags: IRONMARCH_UNLOCK_FLAGS
  },
  'sunspire-capital': {
    label: 'Sunspire Capital Road',
    mapId: 'sunspire',
    x: 10,
    y: 7,
    facing: 'south',
    encounterId: 'capital_duel',
    expectedBackdrop: 'capital',
    flags: SUNSPIRE_UNLOCK_FLAGS
  },
  'old-dungeon': {
    label: 'Old Dungeon Fallback',
    mapId: 'eclipse_tower_library',
    x: 12,
    y: 8,
    facing: 'north',
    encounterId: 'eclipse_elite',
    expectedBackdrop: 'dungeon',
    flags: FINAL_UNLOCK_FLAGS
  },
  'eclipse-tower': {
    label: 'Eclipse Tower',
    mapId: 'eclipse_tower_observatory',
    x: 12,
    y: 5,
    facing: 'north',
    encounterId: 'boss_hollow_regent',
    expectedBackdrop: 'eclipse',
    flags: FINAL_UNLOCK_FLAGS
  }
} as const satisfies Record<string, QaBattleScene>;

export type QaBattleSceneId = keyof typeof QA_BATTLE_SCENES;

export const QA_BATTLE_SCENE_IDS = Object.keys(QA_BATTLE_SCENES) as QaBattleSceneId[];

export const applyQaBattleScene = (id: string) => {
  const scene = QA_BATTLE_SCENES[id as QaBattleSceneId];
  if (!scene) return `Unknown QA battle scene: ${id}`;
  const engine = getGameEngine();
  const warpMessage = engine.qaWarpToTile(scene.mapId, scene.x, scene.y, scene.facing);
  const flags = 'flags' in scene ? scene.flags : undefined;
  flags?.forEach((flag: string) => {
    engine.state.questFlags[flag] = true;
  });
  const battleMessage = engine.qaForceBattle(scene.encounterId, scene.expectedBackdrop, `qa_${id}`);
  return `${warpMessage}; ${battleMessage}`;
};
