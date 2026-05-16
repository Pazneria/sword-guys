import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
  GameEngine,
  computeEffectiveStats,
  createInitialState,
  directionFromVector,
  normalizeMovement,
  resetGameEngineForTests
} from '../src/game/simulation/engine';
import { UIManager } from '../src/ui/dom';
import { TILE_SIZE } from '../src/game/types';
import { ENCOUNTERS, ENEMIES, getTileDefinition, ITEMS, MAPS, QUESTS, SHOPS, SPELLS } from '../src/game/content';
import { BALANCE_ROUTE_STEPS, formatBalanceProjection, projectBalanceRoute } from '../src/game/balance/model';
import { buildFiveRoadsContentMatrix, formatFiveRoadsContentMatrix } from '../src/game/progression/contentMatrix';
import { buildGoalAuditReport, formatGoalAuditReport } from '../src/game/progression/goalAudit';
import { buildItemEconomyReport } from '../src/game/items/economy';
import {
  ITEM_ICON_ASSETS,
  buildItemIconCoverageReport,
  itemIconRuntimeKeyForId,
  itemIconUrlForId,
  verifyItemIconPngBytes
} from '../src/game/items/icons';
import { applyQaRoute, QA_ROUTES } from '../src/game/qa/routes';
import {
  BATTLE_BACKDROP_ASSETS,
  ENEMY_ASSETS,
  IMAGE_GEN_ASSETS,
  ImageGenAssetEntry,
  NPC_ASSETS,
  SPELL_EFFECT_ASSETS,
  TILESET_ASSETS
} from '../src/game/assets/manifest';
import {
  ASSET_GENERATION_BATCHES,
  buildImageGenerationBatchPacket,
  buildImageGenerationPromptBundle,
  summarizeAssetPipeline
} from '../src/game/assets/pipeline';
import { buildAssetReadinessReport, formatAssetReadinessReport } from '../src/game/assets/readiness';
import { buildAssetCoverageReport, formatAssetCoverageReport } from '../src/game/assets/coverage';
import { getApprovedRuntimeAssetLoads, runtimeAssetKeyForId, spellEffectRuntimeSpecForId } from '../src/game/assets/runtime';
import { buildAssetOutputContract, formatAssetOutputContract } from '../src/game/assets/contracts';
import { parsePngInfo } from '../src/game/assets/png';
import { productionEvidenceErrorsForAsset, verifyApprovedAssetFiles, verifyAssetPngBytes } from '../src/game/assets/verification';
import { buildAssetTargetCheckReport, formatAssetTargetCheckReport } from '../src/game/assets/targetCheck';
import { applyAssetPromotionStatuses, buildAssetPromotionPlan, formatAssetPromotionPlan } from '../src/game/assets/promotion';
import {
  buildAssetProductionReceipt,
  parseAssetProductionReceipt,
  productionEvidenceFromReceipt,
  receiptPathForAsset,
  validateAssetProductionReceipt
} from '../src/game/assets/receipts';
import { buildAssetPromptStageText, buildAssetReceiptTemplateText, buildAssetStagePlan } from '../src/game/assets/staging';
import { applyQaBattleScene, QA_BATTLE_SCENE_IDS, QA_BATTLE_SCENES } from '../src/game/qa/battles';
import { planApprovedImageGenTextureLoads } from '../src/phaser/assetLoader';
import { NPC_OVERWORLD_DISPLAY_SIZE, PLAYER_OVERWORLD_DISPLAY_SIZE, npcOverworldRenderSpec } from '../src/phaser/actors';
import { buildTilesetUsageReport, resolveTileVisual, tilesetKeyForMap } from '../src/phaser/tileVisuals';
import { renderAssetQaPanel } from '../src/ui/assetQa';

const blankInput = {
  moveX: 0,
  moveY: 0,
  confirmPressed: false,
  cancelPressed: false,
  menuPressed: false,
  mapPressed: false,
  debugPressed: false,
  playtestPowerPressed: false,
  playtestRoutesPressed: false,
  upPressed: false,
  downPressed: false,
  leftPressed: false,
  rightPressed: false
};

const pngBytes = (width: number, height: number, colorType = 6) => {
  const bytes = new Uint8Array(33);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10], 0);
  bytes.set([0, 0, 0, 13], 8);
  bytes.set([73, 72, 68, 82], 12);
  bytes[16] = (width >>> 24) & 255;
  bytes[17] = (width >>> 16) & 255;
  bytes[18] = (width >>> 8) & 255;
  bytes[19] = width & 255;
  bytes[20] = (height >>> 24) & 255;
  bytes[21] = (height >>> 16) & 255;
  bytes[22] = (height >>> 8) & 255;
  bytes[23] = height & 255;
  bytes[24] = 8;
  bytes[25] = colorType;
  return bytes;
};

beforeEach(() => {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
    removeItem(key: string) {
      store.delete(key);
    }
  });
});

describe('movement foundation', () => {
  it('normalizes diagonal movement', () => {
    const vector = normalizeMovement(1, 1);
    expect(Math.hypot(vector.x, vector.y)).toBeCloseTo(1);
    expect(directionFromVector(1, -1)).toBe('northeast');
  });

  it('turns in place before moving from idle', () => {
    const engine = new GameEngine(createInitialState());
    const x = engine.state.player.worldX;
    const y = engine.state.player.worldY;
    engine.stepExploration(50, { ...blankInput, moveX: 1 }, false);
    expect(engine.state.player.facing).toBe('east');
    expect(engine.state.player.moving).toBe(false);
    expect(engine.state.player.worldX).toBe(x);
    expect(engine.state.player.worldY).toBe(y);
    engine.stepExploration(70, { ...blankInput, moveX: 1 }, false);
    expect(engine.state.player.worldX).toBeGreaterThan(x);
    expect(engine.state.player.moving).toBe(true);
  });

  it('clears moving state when input stops', () => {
    const engine = new GameEngine(createInitialState());
    engine.state.player.moving = true;
    engine.state.player.movementHoldMs = 100;
    engine.stepExploration(16, blankInput, false);
    expect(engine.state.player.moving).toBe(false);
    expect(engine.state.player.movementHoldMs).toBe(0);
  });

  it('only marks the player moving when position changes', () => {
    const engine = new GameEngine(createInitialState());
    engine.state.player.worldX = 10 * TILE_SIZE + 16;
    engine.state.player.worldY = 7 * TILE_SIZE + 16;
    engine.state.player.movementHoldMs = 100;
    const openX = engine.state.player.worldX;
    engine.stepExploration(100, { ...blankInput, moveX: 1 }, false);
    expect(engine.state.player.worldX).toBeGreaterThan(openX);
    expect(engine.state.player.moving).toBe(true);

    engine.state.player.worldX = 1 * TILE_SIZE + 16;
    engine.state.player.worldY = 5 * TILE_SIZE + 16;
    engine.state.player.movementHoldMs = 100;
    const blockedX = engine.state.player.worldX;
    engine.stepExploration(100, { ...blankInput, moveX: -1 }, false);
    expect(engine.state.player.facing).toBe('west');
    expect(engine.state.player.worldX).toBe(blockedX);
    expect(engine.state.player.moving).toBe(false);
  });
});

describe('progression and inventory', () => {
  it('applies equipment stats by slot', () => {
    const state = createInitialState();
    const before = computeEffectiveStats(state);
    state.inventory.iron_sword = 1;
    state.player.equipment.weapon = 'iron_sword';
    const after = computeEffectiveStats(state);
    expect(after.attack).toBeGreaterThan(before.attack);
  });

  it('starts the first quest through NPC dialogue', () => {
    const engine = new GameEngine(createInitialState());
    engine.state.player.worldX = 10 * TILE_SIZE + 16;
    engine.state.player.worldY = 5 * TILE_SIZE + 16;
    engine.state.player.facing = 'north';
    const result = engine.interact();
    expect(result.type).toBe('dialogue');
    expect(engine.state.questFlags.spokeToElder).toBe(true);
    expect(engine.state.activeQuestIds).toContain('cave_relic');
  });

  it('only interacts with an NPC on the tile directly in front of the player', () => {
    const engine = new GameEngine(createInitialState());
    engine.state.player.worldX = 10 * TILE_SIZE + 16;
    engine.state.player.worldY = 6 * TILE_SIZE + 16;
    engine.state.player.facing = 'north';
    expect(engine.prompt()).toBe('');
    expect(engine.interact()).toEqual({ type: 'none' });
    expect(engine.message).toBe('');

    engine.state.player.worldX = 9 * TILE_SIZE + 16;
    engine.state.player.worldY = 5 * TILE_SIZE + 16;
    engine.state.player.facing = 'north';
    expect(engine.prompt()).toBe('');
    expect(engine.interact()).toEqual({ type: 'none' });
    expect(engine.message).toBe('');

    engine.state.player.worldX = 10 * TILE_SIZE + 16;
    engine.state.player.worldY = 5 * TILE_SIZE + 16;
    engine.state.player.facing = 'north';
    expect(engine.prompt()).toBe('Talk: Elder Rowan');
  });

  it('treats NPCs as single-tile collision hitboxes', () => {
    const engine = new GameEngine(createInitialState());
    engine.state.player.worldX = 10 * TILE_SIZE + 16;
    engine.state.player.worldY = 5 * TILE_SIZE + 16;
    engine.state.player.facing = 'north';
    engine.state.player.movementHoldMs = 100;

    for (let i = 0; i < 12; i += 1) {
      engine.stepExploration(100, { ...blankInput, moveY: -1 }, false);
    }

    expect(engine.state.player.worldY).toBeGreaterThanOrEqual(5 * TILE_SIZE - 4);
    expect(engine.state.player.facing).toBe('north');
    expect(engine.prompt()).toBe('Talk: Elder Rowan');
  });

  it('restores the last checkpoint on defeat', () => {
    const engine = new GameEngine(createInitialState());
    engine.state.player.gold = 7;
    engine.createCheckpoint('test');
    engine.state.player.gold = 999;
    engine.restoreCheckpoint();
    expect(engine.state.player.gold).toBe(7);
  });

  it('can continue after the ending without resetting progress', () => {
    const engine = new GameEngine(createInitialState());
    engine.state.endingReached = true;
    engine.state.questFlags.hollowRegentDefeated = true;
    engine.continueAfterEnding();
    expect(engine.state.endingReached).toBe(false);
    expect(engine.state.questFlags.hollowRegentDefeated).toBe(true);
    expect(engine.message).toContain('Postgame');
  });

  it('can start a fresh journey from the ending', () => {
    const engine = new GameEngine(createInitialState());
    engine.state.endingReached = true;
    engine.state.player.level = 50;
    engine.state.player.gold = 99999;
    engine.restartGame();
    expect(engine.state.endingReached).toBe(false);
    expect(engine.state.currentMapId).toBe('greenhollow');
    expect(engine.state.player.level).toBe(1);
    expect(engine.state.player.gold).toBe(55);
    expect(engine.currentBattle).toBeNull();
    expect(engine.pendingBattle).toBeNull();
  });

  it('grants playtest max stats, spells, gear, gold, and supplies', () => {
    const engine = new GameEngine(createInitialState());
    engine.grantPlaytestPower();
    expect(engine.state.player.level).toBe(50);
    expect(engine.state.player.gold).toBe(99999);
    expect(engine.state.player.stats.hp).toBeGreaterThanOrEqual(999);
    expect(engine.state.player.stats.attack).toBeGreaterThanOrEqual(999);
    expect(engine.state.player.spells).toContain('sunflare');
    expect(engine.state.inventory.potion).toBe(99);
    expect(engine.state.player.equipment.weapon).toBe('enchanted_blade');
  });

  it('can unlock playtest routes without marking bosses defeated', () => {
    const engine = new GameEngine(createInitialState());
    engine.grantPlaytestPower({ unlockRoutes: true });
    expect(engine.state.questFlags.routeToFinalUnlocked).toBe(true);
    expect(engine.state.questFlags.banditCaptainDefeated).not.toBe(true);
    expect(engine.state.keyItems.eclipse_key).toBe(true);
  });

  it('repairs route flags for old saves after bosses are defeated', () => {
    const engine = new GameEngine(createInitialState());
    engine.state.questFlags.banditCaptainDefeated = true;
    engine.state.questFlags.routeToLumaireUnlocked = false;
    engine.stepExploration(16, blankInput, false);
    expect(engine.state.questFlags.routeToLumaireUnlocked).toBe(true);
  });

  it('supports deterministic QA warps without triggering the intro or random battles', () => {
    const engine = new GameEngine(createInitialState());
    expect(engine.qaWarpToTile('overworld_main', 22, 11, 'north')).toContain('QA warp');
    expect(engine.state.currentMapId).toBe('overworld_main');
    expect(engine.state.currentSpawnId).toBe('qa_22_11');
    expect(engine.state.player.facing).toBe('north');
    expect(engine.state.questFlags.introCutsceneSeen).toBe(true);
    expect(engine.pendingBattle).toBeNull();
    expect(engine.debug).toBe(false);
  });

  it('can force a QA battle with an explicit local backdrop', () => {
    const engine = new GameEngine(createInitialState());
    engine.qaWarpToTile('dustbridge_ruins', 10, 6, 'north');
    expect(engine.qaForceBattle('bandit_scouts', 'ruin', 'qa_dustbridge')).toContain('QA battle');
    const battle = engine.startPendingBattle();
    expect(battle?.sourceMapId).toBe('dustbridge_ruins');
    expect(battle?.sourceEnemyEntityId).toBe('qa_dustbridge');
    expect(battle?.encounterId).toBe('bandit_scouts');
    expect(battle?.backdrop).toBe('ruin');
  });

  it('exposes forced battle QA scenes for every approved battle backdrop', () => {
    const covered: Set<string> = new Set(Object.values(QA_BATTLE_SCENES).map((scene) => scene.expectedBackdrop));
    expect(QA_BATTLE_SCENE_IDS.length).toBe(Object.keys(QA_BATTLE_SCENES).length);
    expect(BATTLE_BACKDROP_ASSETS.map((asset) => asset.id).filter((id) => !covered.has(id))).toEqual([]);

    for (const scene of Object.values(QA_BATTLE_SCENES)) {
      expect(MAPS[scene.mapId]).toBeTruthy();
      expect(ENCOUNTERS[scene.encounterId]).toBeTruthy();
      expect(BATTLE_BACKDROP_ASSETS.some((asset) => asset.id === scene.expectedBackdrop)).toBe(true);
    }
  });

  it('applies a forced battle QA scene as a warp plus pending battle', () => {
    const engine = resetGameEngineForTests();
    const message = applyQaBattleScene('mossvale-cave');
    expect(message).toContain('QA warp: Mossvale Cave Mouth');
    expect(engine.state.currentMapId).toBe('mossvale_cave');
    expect(engine.pendingBattle).toMatchObject({
      enemyEntityId: 'qa_mossvale-cave',
      encounterId: 'slime_pair',
      backdrop: 'cave'
    });
  });

  it('exposes direct shop QA routes for item economy visual checks', () => {
    const engine = resetGameEngineForTests();
    const routeIds = new Set(Object.keys(QA_ROUTES));
    expect(['greenhollow-shop', 'waymeet-shop', 'lumaire-shop', 'ironmarch-shop', 'sunspire-shop'].filter((id) => !routeIds.has(id))).toEqual([]);
    expect(applyQaRoute('lumaire-shop')).toContain('QA warp');
    expect(engine.state.currentMapId).toBe('lumaire_shop');
    expect(engine.prompt()).toBe('Talk: Lumaire Arcana');
    expect(engine.interact()).toEqual({ type: 'shop', shopId: 'lumaire_arcana' });
  });

  it('keeps every overworld NPC inside the same one-tile footprint as the player', () => {
    expect(NPC_OVERWORLD_DISPLAY_SIZE).toEqual(PLAYER_OVERWORLD_DISPLAY_SIZE);
    for (const map of Object.values(MAPS)) {
      for (const npc of map.npcs) {
        const spec = npcOverworldRenderSpec(npc);
        expect(spec.displayWidth).toBeLessThanOrEqual(TILE_SIZE);
        expect(spec.displayHeight).toBeLessThanOrEqual(TILE_SIZE);
        expect(spec.originY).toBe(1);
        expect(spec.y).toBe(npc.y * TILE_SIZE + TILE_SIZE);
      }
    }
  });
});

describe('tileset visual routing', () => {
  it('routes every placed map tile through approved tilesets instead of procedural fallbacks', () => {
    const report = buildTilesetUsageReport(MAPS);
    const unresolved = report.unresolved.map((issue) => `${issue.mapId}:${issue.layer}:${issue.x},${issue.y}:${issue.tileId}`);
    expect(unresolved).toEqual([]);

    const usedTextureKeys = new Set(report.maps.flatMap((map) => map.textureKeys));
    const missingApprovedTilesets = TILESET_ASSETS.map((asset) => runtimeAssetKeyForId(asset.id))
      .filter((key): key is string => key !== null)
      .filter((key) => !usedTextureKeys.has(key));
    expect(missingApprovedTilesets).toEqual([]);
  });

  it('assigns village, shop, inn, and dungeon maps to their proper area tilesets', () => {
    const expected: Record<string, string> = {
      greenhollow: 'tiles:greenhollow',
      overworld_main: 'tiles:overworld-greenhollow',
      waymeet: 'tiles:waymeet',
      waymeet_shop: 'tiles:weapon-shop',
      waymeet_inn: 'tiles:inn',
      lumaire: 'tiles:lumaire',
      lumaire_shop: 'tiles:lumaire',
      lumaire_inn: 'tiles:inn',
      ironmarch: 'tiles:ironmarch',
      ironmarch_shop: 'tiles:weapon-shop',
      sunspire: 'tiles:sunspire',
      sunspire_shop: 'tiles:weapon-shop',
      mossvale_cave: 'tiles:mossvale_cave',
      mossvale_cave_split: 'tiles:mossvale_cave',
      mossvale_relic_grotto: 'tiles:mossvale_cave',
      dustbridge_ruins: 'tiles:dustbridge_ruins',
      dustbridge_ruins_ledger_hall: 'tiles:dustbridge_ruins',
      dustbridge_ruins_bridge_loop: 'tiles:dustbridge_ruins',
      dustbridge_ruins_map_room: 'tiles:dustbridge_ruins',
      flooded_shrine: 'tiles:flooded_shrine',
      flooded_shrine_reed_maze: 'tiles:flooded_shrine',
      flooded_shrine_sluice_chapel: 'tiles:flooded_shrine',
      flooded_shrine_lumen_sanctum: 'tiles:flooded_shrine',
      ironvein_fortress: 'tiles:ironvein_fortress',
      ironvein_fortress_barracks: 'tiles:ironvein_fortress',
      ironvein_fortress_forge_core: 'tiles:ironvein_fortress',
      ironvein_fortress_castellan_chamber: 'tiles:ironvein_fortress',
      eclipse_tower: 'tiles:eclipse_tower',
      eclipse_tower_library: 'tiles:eclipse_tower',
      eclipse_tower_shadow_stair: 'tiles:eclipse_tower',
      eclipse_tower_observatory: 'tiles:eclipse_tower'
    };

    for (const [mapId, expectedTileset] of Object.entries(expected)) {
      expect(tilesetKeyForMap(MAPS[mapId]), mapId).toBe(expectedTileset);
    }
  });

  it('uses area tiles for landmark gameplay objects in each applicable region', () => {
    const checks = [
      { mapId: 'overworld_main', tileId: 'cave_mouth', expected: 'tiles:overworld-greenhollow' },
      { mapId: 'greenhollow', tileId: 'save_crystal', expected: 'tiles:greenhollow' },
      { mapId: 'lumaire_shop', tileId: 'wood_floor', expected: 'tiles:lumaire' },
      { mapId: 'mossvale_relic_grotto', tileId: 'chest_closed', expected: 'tiles:mossvale_cave' },
      { mapId: 'dustbridge_ruins_bridge_loop', tileId: 'chest_closed', expected: 'tiles:dustbridge_ruins' },
      { mapId: 'flooded_shrine', tileId: 'water_shallow', expected: 'tiles:flooded_shrine' },
      { mapId: 'ironvein_fortress_barracks', tileId: 'lava', expected: 'tiles:ironvein_fortress' },
      { mapId: 'eclipse_tower_library', tileId: 'dungeon_floor', expected: 'tiles:eclipse_tower' }
    ];

    for (const check of checks) {
      const map = MAPS[check.mapId];
      expect(map, check.mapId).toBeTruthy();
      if (!map) throw new Error(`Missing map ${check.mapId}`);
      const visual = resolveTileVisual({ map, tileId: check.tileId, x: 10, y: 6, layer: 'ground' });
      expect(visual.textureKey, `${check.mapId}:${check.tileId}`).toBe(check.expected);
      expect(visual.frame).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('map UI', () => {
  it('keeps exploration HUD panels off the playfield while preserving the map overlay', () => {
    const engine = new GameEngine(createInitialState());
    engine.state.questFlags.introCutsceneSeen = true;
    const root = { innerHTML: '', addEventListener: vi.fn() } as unknown as HTMLElement;
    const ui = new UIManager(root);

    ui.sync(engine);
    expect(root.innerHTML).not.toContain('hud-card');
    expect(root.innerHTML).not.toContain('minimap-card');
    expect(root.innerHTML).not.toContain('objective');

    expect(ui.handleExplorationActions({ ...blankInput, mapPressed: true }, engine)).toBe(true);
    ui.sync(engine);
    expect(root.innerHTML).toContain('map-overlay');
  });

  it('opens a readable map overlay with the current position', () => {
    const engine = new GameEngine(createInitialState());
    const root = { innerHTML: '' } as HTMLElement;
    const ui = new UIManager(root);

    expect(ui.handleExplorationActions({ ...blankInput, mapPressed: true }, engine)).toBe(true);
    ui.sync(engine);
    expect(root.innerHTML).toContain('map-overlay');
    expect(root.innerHTML).toContain('You are at');
    expect(root.innerHTML).toContain('You are here');

    ui.handleExplorationActions({ ...blankInput, cancelPressed: true }, engine);
    expect(ui.overlay).toBe('none');
  });

  it('renders item icons in inventory, shop, and battle item menus', () => {
    const engine = new GameEngine(createInitialState());
    engine.state.questFlags.introCutsceneSeen = true;
    const root = { innerHTML: '' } as HTMLElement;
    const ui = new UIManager(root);

    ui.handleExplorationActions({ ...blankInput, menuPressed: true }, engine);
    ui.sync(engine);
    expect(root.innerHTML).toContain('class="item-icon"');
    expect(root.innerHTML).toContain('/assets/items/small-potion.png');

    ui.openShop('lumaire_arcana');
    ui.sync(engine);
    expect(root.innerHTML).toContain('/assets/items/ember.png');
    expect(root.innerHTML).toContain('/assets/items/apprentice-staff.png');

    engine.pendingBattle = { mapId: 'overworld_main', enemyEntityId: 'ow_slime_1', encounterId: 'slime_pair' };
    engine.startPendingBattle();
    ui.handleBattleActions({ ...blankInput }, engine);
    ui.handleBattleActions({ ...blankInput, downPressed: true }, engine);
    ui.handleBattleActions({ ...blankInput, confirmPressed: true }, engine);
    ui.sync(engine);
    expect(root.innerHTML).toContain('/assets/items/small-potion.png');
  });
});

describe('greenhollow town layout', () => {
  it('uses separate upper and base building wall tiles', () => {
    const map = MAPS.greenhollow;
    expect(map.layers.lowerObject[3][3]?.id).toBe('building_wall_upper');
    expect(map.layers.lowerObject[4][3]?.id).toBe('building_wall');
    expect(map.layers.lowerObject[4][4]?.id).toBe('door_house');
    expect(getTileDefinition('building_wall_upper').defaultProperties.collision).toBe('full');
    expect(getTileDefinition('building_wall_upper_shadow').defaultProperties.collision).toBe('full');
  });

  it('uses the southern path as the town exit instead of a door tile', () => {
    const map = MAPS.greenhollow;
    expect(map.layers.lowerObject[10][9]?.id).not.toBe('door_house');
    expect(map.layers.ground[11][10]?.id).toBe('dirt_path');
    expect(map.layers.ground[11][9]?.id).toBe('grass_plain');
    expect(map.layers.ground[11][11]?.id).toBe('grass_plain');

    const exit = map.transitions.find((transition) => transition.id === 'greenhollow_to_overworld');
    expect(exit?.trigger.type).toBe('bounds');
    if (exit?.trigger.type !== 'bounds') return;
    expect(exit.trigger.bounds).toEqual({ x: 10, y: 11, width: 1, height: 1 });
    expect(map.objects.some((object) => object.type === 'door' || object.type === 'gate')).toBe(false);
  });

  it('uses step-on transition tiles instead of door interactables', () => {
    const engine = new GameEngine(createInitialState());
    engine.state.player.worldX = 4 * TILE_SIZE + TILE_SIZE / 2;
    engine.state.player.worldY = 5 * TILE_SIZE + TILE_SIZE / 2;
    engine.state.player.facing = 'north';

    expect(engine.prompt()).toBe('');
    expect(engine.interact()).toMatchObject({ type: 'none' });

    engine.state.player.worldY = 4 * TILE_SIZE + TILE_SIZE / 2;
    engine.stepExploration(16, blankInput, false);
    expect(engine.state.currentMapId).toBe('greenhollow_shop');
  });

  it('uses mostly grass with one-tile connected paths', () => {
    const map = MAPS.greenhollow;
    const pathCells = map.layers.ground.flatMap((row, y) =>
      row.map((placed, x) => (placed?.id === 'dirt_path' ? `${x},${y}` : null)).filter(Boolean)
    );
    expect(pathCells).toHaveLength(23);
    for (const key of ['4,5', '10,5', '14,5', '10,11', '16,9']) expect(pathCells).toContain(key);
    expect(pathCells).not.toContain('0,6');
    expect(pathCells).not.toContain('9,0');
    expect(map.layers.ground[6][0]?.id).toBe('grass_plain');
  });

  it('gives the save crystal collision', () => {
    const map = MAPS.greenhollow;
    expect(map.objects.find((object) => object.id === 'greenhollow_save')).toMatchObject({ collision: 'full' });
  });

  it('removes the Greenhollow overworld sign', () => {
    expect(MAPS.overworld_main.objects.some((object) => object.id === 'sign_greenhollow')).toBe(false);
  });
});

describe('weapon and armor shop tiles', () => {
  it('uses the generated armory tileset and scenery for outfitter-style shops', () => {
    const waymeetShop = MAPS.waymeet_shop;
    const ironmarchShop = MAPS.ironmarch_shop;
    const greenhollowShop = MAPS.greenhollow_shop;
    const lumaireShop = MAPS.lumaire_shop;

    expect(greenhollowShop.defaultBiome).toBe('armoryShop');
    expect(waymeetShop.defaultBiome).toBe('armoryShop');
    expect(ironmarchShop.defaultBiome).toBe('armoryShop');
    expect(lumaireShop.defaultBiome).toBe('town');
    expect(greenhollowShop.layers.lowerObject[0][0]?.id).toBe('armory_wall_side_left');
    expect(greenhollowShop.layers.lowerObject[0][1]?.id).toBe('armory_wall_upper');
    expect(greenhollowShop.layers.lowerObject[0][18]?.id).toBe('armory_wall_upper');
    expect(greenhollowShop.layers.lowerObject[0][19]?.id).toBe('armory_wall_side_right');
    expect(greenhollowShop.layers.lowerObject[6][0]?.id).toBe('armory_wall_side_left');
    expect(greenhollowShop.layers.lowerObject[6][19]?.id).toBe('armory_wall_side_right');
    expect(greenhollowShop.layers.lowerObject[11][8]?.id).toBe('armory_wall_south');
    expect(greenhollowShop.layers.lowerObject[11][9]?.id).toBe('armory_threshold');
    expect(greenhollowShop.layers.lowerObject[11][10]?.id).toBe('armory_wall_south');
    expect(greenhollowShop.layers.lowerObject[2][2]?.id).toBe('armory_sword_rack');
    expect(waymeetShop.layers.ground[0][0]?.id).toBe('armory_floor');
    expect(waymeetShop.layers.lowerObject[2][2]?.id).toBe('armory_sword_rack');
    expect(waymeetShop.layers.lowerObject[2][15]?.id).toBe('armory_armor_stand');
    expect(waymeetShop.layers.lowerObject[7][15]?.id).toBe('armory_anvil');
    expect(waymeetShop.layers.lowerObject[11][9]?.id).toBe('armory_threshold');
    expect(getTileDefinition('armory_wall_south').defaultProperties.collision).toBe('full');
    expect(getTileDefinition('armory_threshold').defaultProperties.collision).toBeNull();
  });

  it('exits weapon and armor shops by stepping on the threshold', () => {
    const engine = new GameEngine(createInitialState());
    engine.state.currentMapId = 'waymeet_shop';
    engine.state.currentSpawnId = 'entry';
    engine.state.player.worldX = 9 * TILE_SIZE + TILE_SIZE / 2;
    engine.state.player.worldY = 11 * TILE_SIZE + TILE_SIZE / 2;

    expect(MAPS.waymeet_shop.objects.some((object) => object.type === 'door' || object.type === 'gate')).toBe(false);
    engine.stepExploration(16, blankInput, false);
    expect(engine.state.currentMapId).toBe('waymeet');
    expect(engine.state.currentSpawnId).toBe('shop_return');
  });
});

describe('inn interiors', () => {
  it('uses generated inn tiles and creates a separate paid sleeping room', () => {
    const lobby = MAPS.greenhollow_inn;
    const room = MAPS.greenhollow_inn_room;

    expect(lobby.defaultBiome).toBe('inn');
    expect(room.defaultBiome).toBe('inn');
    expect(lobby.layers.lowerObject[11][9]?.id).toBe('inn_exit_mat');
    expect(lobby.layers.lowerObject[1][16]?.id).toBe('inn_door_inside');
    expect(lobby.layers.lowerObject[11][8]?.id).toBe('inn_wall_south');
    expect(lobby.layers.lowerObject[4][6]?.id).toBe('inn_counter');
    expect(lobby.layers.ground[6].slice(3, 7).map((placed) => placed?.id)).toEqual([
      'inn_lobby_rug_tl',
      'inn_lobby_rug_t1',
      'inn_lobby_rug_t2',
      'inn_lobby_rug_tr'
    ]);
    expect(lobby.layers.lowerObject[6][2]?.id).toBe('inn_lobby_couch_left');
    expect(lobby.layers.lowerObject[6][3]?.id).toBe('inn_lobby_couch_right');
    expect(lobby.layers.lowerObject[6][6]?.id).toBe('inn_lobby_armchair');
    expect(lobby.layers.lowerObject[7][4]?.id).toBe('inn_lobby_coffee_table');
    expect(lobby.layers.lowerObject[8][17]?.id).toBe('inn_lobby_large_plant');
    expect(room.layers.lowerObject[1][9]?.id).not.toBe('inn_door_inside');
    expect(room.layers.lowerObject[0][8]?.id).toBe('inn_bedroom_window_left');
    expect(room.layers.lowerObject[0][9]?.id).toBe('inn_bedroom_window_right');
    expect(room.layers.lowerObject[1][0]?.id).toBe('inn_bedroom_wall_side_left');
    expect(room.layers.lowerObject[1][19]?.id).toBe('inn_bedroom_wall_side_right');
    expect(room.layers.ground[6].every((placed) => placed?.id === 'inn_bedroom_floor_a')).toBe(true);
    expect(room.layers.lowerObject[11][9]?.id).toBe('inn_bedroom_exit_mat');
    expect(room.layers.lowerObject[4][5]?.id).toBe('inn_bedroom_bed');
    expect(room.layers.lowerObject[5][5]?.id).toBeUndefined();
    expect(room.layers.lowerObject[6][17]?.id).toBe('inn_bedroom_privacy_screen');
    expect(room.layers.lowerObject[8][12]?.id).toBe('inn_bedroom_round_table');
    expect(room.objects.find((object) => object.id === 'greenhollow_inn_room_bed')).toMatchObject({
      type: 'innBed',
      x: 5,
      y: 4,
      width: 1,
      height: 1,
      interactable: true,
      collision: 'full'
    });
    expect(room.transitions).toHaveLength(1);
    expect(lobby.transitions.find((transition) => transition.id === 'greenhollow_inn_to_room')).toMatchObject({
      toMap: 'greenhollow_inn_room',
      requiresFlag: 'greenhollow_innRoomPaid',
      lockedCollision: true
    });
  });

  it('lets the player talk to an innkeeper across the counter only from the adjacent counter tile', () => {
    const engine = new GameEngine(createInitialState());
    engine.state.currentMapId = 'greenhollow_inn';
    engine.state.player.worldX = 9 * TILE_SIZE + TILE_SIZE / 2;
    engine.state.player.worldY = 5 * TILE_SIZE + TILE_SIZE / 2;
    engine.state.player.facing = 'north';

    expect(engine.prompt()).toBe('Talk: Greenhollow Inn Keeper');
    expect(engine.interact()).toEqual({ type: 'inn', innCost: 8, name: 'Greenhollow Inn Keeper' });

    engine.state.player.worldY = 6 * TILE_SIZE + TILE_SIZE / 2;
    expect(engine.prompt()).toBe('');
  });

  it('blocks the rear bedroom door before paying the innkeeper', () => {
    const transition = MAPS.greenhollow_inn.transitions.find(
      (candidate) => candidate.id === 'greenhollow_inn_to_room'
    );

    expect(transition).toMatchObject({
      requiresFlag: 'greenhollow_innRoomPaid',
      lockedCollision: true,
      blockedMessage: 'Pay the innkeeper before entering the room.'
    });
    expect(MAPS.greenhollow_inn.layers.lowerObject[1][16]?.id).toBe('inn_door_inside');
  });

  it('collides with the locked rear door instead of entering the transition tile', () => {
    const engine = new GameEngine(createInitialState());
    engine.state.currentMapId = 'greenhollow_inn';
    engine.state.currentSpawnId = 'entry';
    engine.state.player.worldX = 16 * TILE_SIZE + TILE_SIZE / 2;
    engine.state.player.worldY = 2 * TILE_SIZE + TILE_SIZE / 2;
    engine.state.player.facing = 'north';

    for (let i = 0; i < 24; i += 1) {
      engine.stepExploration(16, { ...blankInput, moveY: -1 }, false);
    }

    expect(engine.state.currentMapId).toBe('greenhollow_inn');
    expect(engine.message).toBe('Pay the innkeeper before entering the room.');
    expect(engine.state.player.worldX).toBe(16 * TILE_SIZE + TILE_SIZE / 2);
    expect(Math.floor((engine.state.player.worldY + 8) / TILE_SIZE)).toBe(2);
    expect(engine.state.player.moving).toBe(false);
  });

  it('lets the player sleep by interacting with the bedroom bed', () => {
    const engine = new GameEngine(createInitialState());
    engine.state.currentMapId = 'greenhollow_inn_room';
    engine.state.player.worldX = 5 * TILE_SIZE + TILE_SIZE / 2;
    engine.state.player.worldY = 5 * TILE_SIZE + TILE_SIZE / 2;
    engine.state.player.facing = 'north';
    engine.state.player.stats.hp = 1;
    engine.state.player.stats.mp = 0;
    engine.state.questFlags.greenhollow_innRoomNight = true;

    expect(engine.prompt()).toBe('Sleep');
    expect(engine.interact()).toEqual({ type: 'bedRest', name: 'Sleep' });
    expect(engine.sleepInInnBed()).toBe('Slept, healed, and saved.');
    expect(engine.consumePendingSleepVisual()).toMatchObject({
      mapId: 'greenhollow_inn_room',
      bedX: 5,
      bedY: 4,
      wakeX: 5 * TILE_SIZE + TILE_SIZE / 2,
      wakeY: 5 * TILE_SIZE + TILE_SIZE / 2,
      wakeFacing: 'north'
    });
    expect(engine.consumePendingSleepVisual()).toBeNull();
    expect(engine.state.player.stats.hp).toBe(engine.state.player.stats.maxHp);
    expect(engine.state.player.stats.mp).toBe(engine.state.player.stats.maxMp);
    expect(engine.state.questFlags.greenhollow_innRoomNight).toBeUndefined();
    expect(engine.state.questFlags.greenhollow_innRoomMorning).toBe(true);
    expect(engine.state.checkpoint?.state.currentMapId).toBe('greenhollow_inn_room');
  });

  it('moves the player into the inn room after paying, then exits by walking out', () => {
    const engine = new GameEngine(createInitialState());
    engine.state.currentMapId = 'greenhollow_inn';
    engine.state.currentSpawnId = 'entry';
    engine.state.player.gold = 55;
    engine.state.player.stats.hp = 1;
    engine.state.player.stats.mp = 0;

    expect(engine.restAtInn(8)).toBe('Rested, healed, and saved.');
    expect(engine.state.player.gold).toBe(47);
    expect(engine.state.currentMapId).toBe('greenhollow_inn_room');
    expect(engine.state.currentSpawnId).toBe('wake');
    expect(engine.state.questFlags.greenhollow_innRoomPaid).toBe(true);
    expect(engine.state.questFlags.greenhollow_innRoomNight).toBe(true);
    expect(engine.state.player.stats.hp).toBe(engine.state.player.stats.maxHp);
    expect(engine.state.player.stats.mp).toBe(engine.state.player.stats.maxMp);
    expect(engine.state.checkpoint?.state.currentMapId).toBe('greenhollow_inn_room');

    engine.state.player.worldX = 9 * TILE_SIZE + TILE_SIZE / 2;
    engine.state.player.worldY = 11 * TILE_SIZE + TILE_SIZE / 2;
    engine.stepExploration(650, blankInput, false);
    expect(engine.state.currentMapId).toBe('greenhollow_inn');
    expect(engine.state.currentSpawnId).toBe('room_return');
    expect(engine.state.player.worldX).toBe(16 * TILE_SIZE + TILE_SIZE / 2);
    expect(engine.state.player.worldY).toBe(2 * TILE_SIZE + TILE_SIZE / 2);
    expect(engine.state.questFlags.greenhollow_innRoomPaid).toBeUndefined();
    expect(engine.state.questFlags.greenhollow_innRoomNight).toBeUndefined();
  });

  it('does not enter the sleeping room when the player cannot pay', () => {
    const engine = new GameEngine(createInitialState());
    engine.state.currentMapId = 'greenhollow_inn';
    engine.state.player.gold = 3;

    expect(engine.restAtInn(8)).toBe('The room costs 8g.');
    expect(engine.state.currentMapId).toBe('greenhollow_inn');
    expect(engine.state.player.gold).toBe(3);
  });
});

describe('initial launch', () => {
  it('starts directly in playable exploration with no title or intro gate', () => {
    const engine = new GameEngine(createInitialState());
    const root = { innerHTML: '', addEventListener: vi.fn() } as unknown as HTMLElement;
    const ui = new UIManager(root);

    ui.sync(engine);
    expect(ui.overlay).toBe('none');
    expect(engine.state.currentMapId).toBe('greenhollow');
    expect(engine.state.questFlags.introCutsceneSeen).toBeUndefined();
    expect(root.innerHTML).not.toContain('dialogue-text');
    expect(root.innerHTML).not.toContain('Sword Guys');
  });
});

describe('overworld random encounters', () => {
  it('puts Mossvale Cave on the upper Greenhollow road with colliding foliage nearby', () => {
    const overworld = MAPS.overworld_main;
    const cave = overworld.transitions.find((transition) => transition.id === 'to_mossvale_cave');
    expect(cave?.trigger.type).toBe('bounds');
    if (cave?.trigger.type !== 'bounds') return;
    expect(cave.trigger.bounds).toEqual({ x: 23, y: 10, width: 1, height: 1 });
    expect(overworld.layers.ground[10][23]?.id).toBe('dirt_path');
    expect(overworld.layers.lowerObject[10][23]?.id).toBe('cave_mouth');
    expect(overworld.spawnPoints.find((spawn) => spawn.id === 'mossvale_cave_exit')).toMatchObject({ x: 23, y: 11 });

    const foliage = overworld.layers.lowerObject.flatMap((row, y) =>
      row.map((placed, x) => (x >= 4 && x < 36 && y >= 6 && y < 31 && (placed?.id === 'tree_trunk' || placed?.id === 'bush') ? placed.id : null)).filter(Boolean)
    );
    expect(foliage.length).toBeGreaterThan(8);
    expect(getTileDefinition('tree_trunk').defaultProperties.collision).toBe('full');
    expect(getTileDefinition('bush').defaultProperties.collision).toBe('full');

    for (let y = 6; y < 31; y += 1) {
      for (let x = 4; x < 36; x += 1) {
        if (overworld.layers.lowerObject[y][x]?.id !== 'tree_trunk') continue;
        for (let yy = y - 1; yy <= y + 1; yy += 1) {
          for (let xx = x - 1; xx <= x + 1; xx += 1) {
            expect(overworld.layers.ground[yy][xx]?.id).not.toBe('dirt_path');
          }
        }
      }
    }
  });

  it('defines Greenhollow Fields as the first grassland encounter area', () => {
    const overworld = MAPS.overworld_main;
    const region = overworld.regions.find((candidate) => candidate.id === 'greenhollow_fields');
    expect(overworld.battleBackdrop).toBe('grassland');
    expect(region?.encounterTable).toBe('slime_pair');
    expect(region?.battleBackdrop).toBe('grassland');
    expect(region?.dangerLevel).toBe(1);
    expect(ENCOUNTERS.slime_pair.backdrop).toBe('grassland');
    expect(ENCOUNTERS.greenhollow_roamers.enemyIds).toEqual(['field_slime', 'pebble_imp', 'thistle_bat']);
  });

  it('keeps Greenhollow Fields varied without burying the meadow in detail noise', () => {
    const overworld = MAPS.overworld_main;
    const region = overworld.regions.find((candidate) => candidate.id === 'greenhollow_fields')!;
    const decorativeGround: string[] = [];
    let detailTiles = 0;

    for (let y = region.bounds.y; y < region.bounds.y + region.bounds.height; y += 1) {
      for (let x = region.bounds.x; x < region.bounds.x + region.bounds.width; x += 1) {
        const groundId = overworld.layers.ground[y][x]?.id;
        if (groundId === 'grass_variant' || groundId === 'flower_grass' || groundId === 'tall_grass') decorativeGround.push(groundId);
        if (overworld.layers.effects[y][x]?.id?.startsWith('field_')) detailTiles += 1;
      }
    }

    expect(decorativeGround.length).toBeGreaterThan(2);
    expect(decorativeGround.length).toBeLessThan(25);
    expect(detailTiles).toBeGreaterThan(8);
    expect(getTileDefinition('field_flower_detail').defaultProperties.layer).toBe('effects');
  });

  it('does not place visible enemies on the overworld', () => {
    const engine = new GameEngine(createInitialState());
    engine.state.currentMapId = 'overworld_main';
    expect(engine.runtimeEnemies).toHaveLength(0);
  });

  it('starts random battles while moving through dangerous overworld regions', () => {
    const engine = new GameEngine(createInitialState());
    vi.spyOn(Math, 'random').mockReturnValue(0);
    engine.state.currentMapId = 'overworld_main';
    engine.state.currentSpawnId = 'sunspire_gate';
    engine.state.player.worldX = 100 * TILE_SIZE + 16;
    engine.state.player.worldY = 65 * TILE_SIZE + 16;
    engine.state.player.movementHoldMs = 100;

    for (let i = 0; i < 10 && !engine.pendingBattle; i += 1) {
      engine.stepExploration(200, { ...blankInput, moveX: 1 }, false);
    }

    expect(engine.pendingBattle?.enemyEntityId).toBe('random_sunspire_eclipse');
    expect(engine.pendingBattle?.encounterId).toBe('eclipse_pack');
    expect(engine.pendingBattle?.backdrop).toBe('eclipse');
  });

  it('uses the local overworld region backdrop when an encounter default differs', () => {
    const engine = new GameEngine(createInitialState());
    vi.spyOn(Math, 'random').mockReturnValue(0);
    engine.state.currentMapId = 'overworld_main';
    engine.state.player.worldX = 90 * TILE_SIZE + TILE_SIZE / 2;
    engine.state.player.worldY = 40 * TILE_SIZE + TILE_SIZE / 2;
    engine.state.player.movementHoldMs = 100;
    (engine as unknown as { randomEncounterMeter: number }).randomEncounterMeter = 999999;

    engine.stepExploration(16, { ...blankInput, moveX: 1 }, false);
    const battle = engine.startPendingBattle();

    expect(engine.pendingBattle?.encounterId).toBe('fort_patrol');
    expect(ENCOUNTERS.fort_patrol.backdrop).toBe('fortress');
    expect(MAPS.overworld_main.regions.find((region) => region.id === 'ironmarch_frontier')?.battleBackdrop).toBe('mine');
    expect(battle?.backdrop).toBe('mine');
  });
});

describe('mossvale cave template dungeon', () => {
  it('expands Mossvale Cave into connected mouth, split, and relic rooms', () => {
    expect(MAPS.mossvale_cave.name).toBe('Mossvale Cave Mouth');
    expect(MAPS.mossvale_cave_split.name).toBe('Mossvale Glowcap Split');
    expect(MAPS.mossvale_relic_grotto.name).toBe('Mossvale Relic Grotto');

    expect(MAPS.mossvale_cave.transitions.find((transition) => transition.id === 'mossvale_cave_to_split')).toMatchObject({
      toMap: 'mossvale_cave_split',
      toSpawn: 'entry'
    });
    expect(MAPS.mossvale_cave_split.transitions.find((transition) => transition.id === 'mossvale_split_to_grotto')).toMatchObject({
      toMap: 'mossvale_relic_grotto',
      toSpawn: 'entry'
    });
    expect(MAPS.mossvale_relic_grotto.transitions.find((transition) => transition.id === 'mossvale_grotto_to_split')).toMatchObject({
      toMap: 'mossvale_cave_split',
      toSpawn: 'grotto_return'
    });
  });

  it('places an optional treasure branch before the relic objective', () => {
    expect(MAPS.mossvale_cave_split.width).toBeGreaterThan(MAPS.mossvale_cave.width);
    expect(MAPS.mossvale_cave_split.objects.find((object) => object.id === 'mossvale_split_cache')).toMatchObject({
      type: 'chest',
      givesItemId: 'leather_cap'
    });
    expect(MAPS.mossvale_relic_grotto.objects.find((object) => object.id === 'mossvale_relic_chest')).toMatchObject({
      type: 'chest',
      givesItemId: 'cave_relic'
    });
  });

  it('can transition from cave mouth to split to grotto through step-on stairs', () => {
    const engine = new GameEngine(createInitialState());
    engine.state.currentMapId = 'mossvale_cave';
    engine.state.player.worldX = 10 * TILE_SIZE + TILE_SIZE / 2;
    engine.state.player.worldY = 2 * TILE_SIZE + TILE_SIZE / 2;
    engine.stepExploration(16, blankInput, false);
    expect(engine.state.currentMapId).toBe('mossvale_cave_split');
    expect(engine.state.currentSpawnId).toBe('entry');

    engine.state.player.worldX = 20 * TILE_SIZE + TILE_SIZE / 2;
    engine.state.player.worldY = 2 * TILE_SIZE + TILE_SIZE / 2;
    engine.stepExploration(650, blankInput, false);
    expect(engine.state.currentMapId).toBe('mossvale_relic_grotto');
    expect(engine.state.currentSpawnId).toBe('entry');
  });

  it('sets cave relic progress from the grotto chest', () => {
    const engine = new GameEngine(createInitialState());
    engine.state.currentMapId = 'mossvale_relic_grotto';
    engine.state.player.worldX = 14 * TILE_SIZE + TILE_SIZE / 2;
    engine.state.player.worldY = 4 * TILE_SIZE + TILE_SIZE / 2;
    engine.state.player.facing = 'north';

    expect(engine.prompt()).toBe('Open chest');
    const result = engine.interact();
    expect(result.type).toBe('dialogue');
    expect(engine.state.questFlags.caveRelicFound).toBe(true);
    expect(engine.state.keyItems.cave_relic).toBe(true);
  });

  it('uses random encounter tables instead of visible trash enemies', () => {
    expect(MAPS.mossvale_cave.enemies).toHaveLength(0);
    expect(MAPS.mossvale_cave_split.enemies).toHaveLength(0);
    expect(MAPS.mossvale_relic_grotto.enemies).toHaveLength(0);
    expect(MAPS.mossvale_cave.regions.find((region) => region.type === 'encounterZone')?.encounterTable).toBe('slime_pair');
    expect(MAPS.mossvale_cave_split.regions.find((region) => region.type === 'encounterZone')?.encounterTable).toBe('moss_cave_pack');
    expect(MAPS.mossvale_relic_grotto.regions.find((region) => region.type === 'encounterZone')?.encounterTable).toBe('moss_cave_pack');
  });

  it('uses the cave battle backdrop even when the cave mouth reuses field slimes', () => {
    const engine = new GameEngine(createInitialState());
    vi.spyOn(Math, 'random').mockReturnValue(0);
    engine.state.currentMapId = 'mossvale_cave';
    engine.state.player.worldX = 10 * TILE_SIZE + TILE_SIZE / 2;
    engine.state.player.worldY = 6 * TILE_SIZE + TILE_SIZE / 2;
    engine.state.player.movementHoldMs = 100;
    (engine as unknown as { randomEncounterMeter: number }).randomEncounterMeter = 999999;

    engine.stepExploration(16, { ...blankInput, moveX: 1 }, false);
    const battle = engine.startPendingBattle();

    expect(engine.pendingBattle?.encounterId).toBe('slime_pair');
    expect(ENCOUNTERS.slime_pair.backdrop).toBe('grassland');
    expect(battle?.backdrop).toBe('cave');
  });
});

describe('story dungeon expansions', () => {
  const storyDungeons = [
    {
      entrance: 'dustbridge_ruins',
      route: 'dustbridge_ruins_ledger_hall',
      branch: 'dustbridge_ruins_bridge_loop',
      boss: 'dustbridge_ruins_map_room',
      treasureId: 'dustbridge_ledger_cache',
      treasureItem: 'copper_ring',
      bossEntityId: 'dustbridge_ruins_boss',
      bossEncounterId: 'boss_rusk'
    },
    {
      entrance: 'flooded_shrine',
      route: 'flooded_shrine_reed_maze',
      branch: 'flooded_shrine_sluice_chapel',
      boss: 'flooded_shrine_lumen_sanctum',
      treasureId: 'flooded_shrine_sluice_cache',
      treasureItem: 'river_charm',
      bossEntityId: 'flooded_shrine_boss',
      bossEncounterId: 'boss_mire_warden'
    },
    {
      entrance: 'ironvein_fortress',
      route: 'ironvein_fortress_barracks',
      branch: 'ironvein_fortress_forge_core',
      boss: 'ironvein_fortress_castellan_chamber',
      treasureId: 'ironvein_forge_cache',
      treasureItem: 'ember_amulet',
      bossEntityId: 'ironvein_fortress_boss',
      bossEncounterId: 'boss_iron_castellan'
    },
    {
      entrance: 'eclipse_tower',
      route: 'eclipse_tower_library',
      branch: 'eclipse_tower_shadow_stair',
      boss: 'eclipse_tower_observatory',
      treasureId: 'eclipse_shadow_cache',
      treasureItem: 'sunward_aegis',
      bossEntityId: 'eclipse_tower_boss',
      bossEncounterId: 'boss_hollow_regent'
    }
  ];

  const canReach = (from: string, to: string) => {
    const seen = new Set([from]);
    const queue = [from];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === to) return true;
      for (const transition of MAPS[current].transitions) {
        if (seen.has(transition.toMap)) continue;
        seen.add(transition.toMap);
        queue.push(transition.toMap);
      }
    }
    return false;
  };

  it('gives every story dungeon a connected entrance, route, treasure branch, and boss room', () => {
    for (const dungeon of storyDungeons) {
      const rooms = [dungeon.entrance, dungeon.route, dungeon.branch, dungeon.boss].map((id) => MAPS[id]);

      expect(rooms.every(Boolean)).toBe(true);
      expect(rooms).toHaveLength(4);
      expect(rooms[1].width).toBeGreaterThan(rooms[0].width);
      expect(MAPS[dungeon.entrance].transitions.map((transition) => transition.toMap)).toContain(dungeon.route);
      expect(MAPS[dungeon.route].transitions.map((transition) => transition.toMap)).toEqual(
        expect.arrayContaining([dungeon.entrance, dungeon.branch, dungeon.boss])
      );
      expect(canReach(dungeon.entrance, dungeon.branch)).toBe(true);
      expect(canReach(dungeon.entrance, dungeon.boss)).toBe(true);
    }
  });

  it('places projected balance treasure on optional branches before each boss', () => {
    for (const dungeon of storyDungeons) {
      expect(MAPS[dungeon.branch].objects.find((object) => object.id === dungeon.treasureId)).toMatchObject({
        type: 'chest',
        givesItemId: dungeon.treasureItem
      });
      expect(BALANCE_ROUTE_STEPS.some((step) => step.expectedTreasure?.includes(dungeon.treasureItem))).toBe(true);
    }
  });

  it('moves each progression boss into the final room of that dungeon', () => {
    for (const dungeon of storyDungeons) {
      expect(MAPS[dungeon.entrance].enemies.some((enemy) => enemy.id === dungeon.bossEntityId)).toBe(false);
      expect(MAPS[dungeon.boss].enemies.find((enemy) => enemy.id === dungeon.bossEntityId)).toMatchObject({
        encounterId: dungeon.bossEncounterId,
        boss: true
      });
    }
  });

  it('keeps normal dungeon encounters random while leaving only bosses visible', () => {
    const hostileMaps = Object.values(MAPS).filter((map) => ['cave', 'dungeon', 'shrine', 'castle'].includes(map.type));
    const normalVisibleEnemies = hostileMaps.flatMap((map) =>
      map.enemies.filter((enemy) => !enemy.boss).map((enemy) => `${map.id}:${enemy.id}`)
    );
    const missingEncounterTables = hostileMaps
      .filter((map) => !map.enemies.some((enemy) => enemy.boss))
      .filter((map) => !map.regions.some((region) => region.type === 'encounterZone' && region.encounterTable))
      .map((map) => map.id);

    expect(normalVisibleEnemies).toEqual([]);
    expect(missingEncounterTables).toEqual([]);
  });

  it('assigns local battle backdrops to every story dungeon danger region', () => {
    for (const dungeon of storyDungeons) {
      for (const mapId of [dungeon.entrance, dungeon.route, dungeon.branch]) {
        const map = MAPS[mapId];
        for (const region of map.regions.filter((candidate) => candidate.type === 'encounterZone' && candidate.encounterTable)) {
          expect(region.battleBackdrop).toBe(map.battleBackdrop);
        }
      }
    }
    expect(MAPS.ironvein_fortress_castellan_chamber.battleBackdrop).toBe('castle');
    expect(ENCOUNTERS.boss_iron_castellan.backdrop).toBe('castle');
  });

  it('starts random battles while walking through dungeon encounter zones', () => {
    const engine = new GameEngine(createInitialState());
    vi.spyOn(Math, 'random').mockReturnValue(0);
    engine.state.currentMapId = 'dustbridge_ruins_ledger_hall';
    engine.state.player.worldX = 5 * TILE_SIZE + TILE_SIZE / 2;
    engine.state.player.worldY = 8 * TILE_SIZE + TILE_SIZE / 2;
    engine.state.player.movementHoldMs = 100;

    for (let i = 0; i < 14 && !engine.pendingBattle; i += 1) {
      engine.stepExploration(200, { ...blankInput, moveX: 1 }, false);
    }

    expect(engine.pendingBattle?.enemyEntityId).toBe('random_dustbridge_ruins_route_danger');
    expect(engine.pendingBattle?.encounterId).toBe('dust_ruin_pack');
    expect(engine.pendingBattle?.backdrop).toBe('ruin');
    expect(engine.message).toBe('An enemy attacks!');
  });

  it('uses the local dungeon backdrop when an entrance reuses a road encounter', () => {
    const engine = new GameEngine(createInitialState());
    vi.spyOn(Math, 'random').mockReturnValue(0);
    engine.state.currentMapId = 'dustbridge_ruins';
    engine.state.player.worldX = 5 * TILE_SIZE + TILE_SIZE / 2;
    engine.state.player.worldY = 6 * TILE_SIZE + TILE_SIZE / 2;
    engine.state.player.movementHoldMs = 100;
    (engine as unknown as { randomEncounterMeter: number }).randomEncounterMeter = 999999;

    engine.stepExploration(16, { ...blankInput, moveX: 1 }, false);
    const battle = engine.startPendingBattle();

    expect(engine.pendingBattle?.encounterId).toBe('bandit_scouts');
    expect(ENCOUNTERS.bandit_scouts.backdrop).toBe('road');
    expect(battle?.backdrop).toBe('ruin');
  });

  it('keeps visible bosses stationary until the player walks into them', () => {
    const engine = new GameEngine(createInitialState());
    engine.state.currentMapId = 'dustbridge_ruins_map_room';
    const boss = engine.runtimeEnemies.find((enemy) => enemy.id === 'dustbridge_ruins_boss');
    expect(boss).toBeTruthy();
    if (!boss) return;
    const start = { x: boss.worldX, y: boss.worldY };
    expect(boss.moveSpeed).toBe(0);
    for (const dungeon of storyDungeons) {
      expect(MAPS[dungeon.boss].enemies.find((enemy) => enemy.id === dungeon.bossEntityId)).toMatchObject({
        boss: true,
        moveSpeed: 0,
        behavior: 'bossEntity'
      });
    }

    engine.state.player.worldX = 12 * TILE_SIZE + TILE_SIZE / 2;
    engine.state.player.worldY = 4 * TILE_SIZE + TILE_SIZE / 2;
    engine.stepExploration(1000, blankInput, false);

    const after = engine.runtimeEnemies.find((enemy) => enemy.id === 'dustbridge_ruins_boss');
    expect(after?.worldX).toBe(start.x);
    expect(after?.worldY).toBe(start.y);
    expect(engine.pendingBattle).toBeNull();
  });

  it('can step through Dustbridge entrance, route, branch, and boss transitions', () => {
    const engine = new GameEngine(createInitialState());
    engine.state.currentMapId = 'dustbridge_ruins';
    engine.state.player.worldX = 10 * TILE_SIZE + TILE_SIZE / 2;
    engine.state.player.worldY = 2 * TILE_SIZE + TILE_SIZE / 2;
    engine.stepExploration(16, blankInput, false);
    expect(engine.state.currentMapId).toBe('dustbridge_ruins_ledger_hall');
    expect(engine.state.currentSpawnId).toBe('entry');

    engine.state.player.worldX = 5 * TILE_SIZE + TILE_SIZE / 2;
    engine.state.player.worldY = 3 * TILE_SIZE + TILE_SIZE / 2;
    engine.stepExploration(650, blankInput, false);
    expect(engine.state.currentMapId).toBe('dustbridge_ruins_bridge_loop');

    engine.state.player.worldX = 3 * TILE_SIZE + TILE_SIZE / 2;
    engine.state.player.worldY = 10 * TILE_SIZE + TILE_SIZE / 2;
    engine.stepExploration(650, blankInput, false);
    expect(engine.state.currentMapId).toBe('dustbridge_ruins_ledger_hall');
    expect(engine.state.currentSpawnId).toBe('branch_return');

    engine.state.player.worldX = 20 * TILE_SIZE + TILE_SIZE / 2;
    engine.state.player.worldY = 2 * TILE_SIZE + TILE_SIZE / 2;
    engine.stepExploration(650, blankInput, false);
    expect(engine.state.currentMapId).toBe('dustbridge_ruins_map_room');
    expect(engine.state.currentSpawnId).toBe('entry');
  });
});

describe('five roads route events', () => {
  it('places hidden overworld event NPCs for every road handoff', () => {
    const events = Object.fromEntries(
      MAPS.overworld_main.npcs.filter((npc) => npc.id.startsWith('route_')).map((npc) => [npc.id, npc])
    );

    expect(events.route_waymeet_courier).toMatchObject({ hiddenUntilFlag: 'routeToWaymeetUnlocked', dialogueId: 'route_waymeet_courier' });
    expect(events.route_lumaire_ferryman).toMatchObject({ hiddenUntilFlag: 'routeToLumaireUnlocked', dialogueId: 'route_lumaire_ferryman' });
    expect(events.route_ironmarch_miner).toMatchObject({ hiddenUntilFlag: 'routeToIronmarchUnlocked', dialogueId: 'route_ironmarch_miner' });
    expect(events.route_sunspire_bellrunner).toMatchObject({ hiddenUntilFlag: 'routeToSunspireUnlocked', dialogueId: 'route_sunspire_bellrunner' });
    expect(events.route_eclipse_page).toMatchObject({ hiddenUntilFlag: 'routeToFinalUnlocked', dialogueId: 'route_eclipse_page' });
  });

  it('routes the post-relic objective through the wounded courier before Waymeet', () => {
    const engine = new GameEngine(createInitialState());
    Object.assign(engine.state.questFlags, {
      spokeToElder: true,
      caveRelicFound: true,
      relicReturned: true,
      routeToWaymeetUnlocked: true
    });
    engine.state.currentMapId = 'overworld_main';
    engine.state.player.worldX = 35 * TILE_SIZE + TILE_SIZE / 2;
    engine.state.player.worldY = 16 * TILE_SIZE + TILE_SIZE / 2;
    engine.state.player.facing = 'north';

    expect(engine.currentObjective()).toBe('Check on the wounded courier along the Waymeet road.');
    expect(engine.prompt()).toBe('Talk: Wounded Courier');
    const result = engine.interact();
    expect(result.type).toBe('dialogue');
    expect(engine.state.questFlags.waymeetRoadEventSeen).toBe(true);
    expect(engine.currentObjective()).toBe('Speak with Broker Sel in Waymeet.');
  });

  it('threads later objectives through route events before the next village leader', () => {
    const engine = new GameEngine(createInitialState());
    const flags = engine.state.questFlags;
    Object.assign(flags, {
      spokeToElder: true,
      caveRelicFound: true,
      relicReturned: true,
      waymeetRoadEventSeen: true,
      roadQuestStarted: true,
      banditCaptainDefeated: true
    });

    expect(engine.currentObjective()).toBe('Meet the stranded ferryman at the restored river crossing.');
    flags.lumaireRiverEventSeen = true;
    expect(engine.currentObjective()).toBe('Speak with Oracle Niva in Lumaire.');
    flags.shrineQuestStarted = true;
    flags.mireWardenDefeated = true;
    expect(engine.currentObjective()).toBe('Inspect the ash-covered miner on the Ironmarch pass.');
    flags.ironmarchPassEventSeen = true;
    expect(engine.currentObjective()).toBe('Speak with Marshal Brinn in Ironmarch.');
    flags.fortressQuestStarted = true;
    flags.ironCastellanDefeated = true;
    expect(engine.currentObjective()).toBe('Follow the bell runner on the Sunspire road.');
    flags.sunspireBellEventSeen = true;
    expect(engine.currentObjective()).toBe('Report to Keeper Aster in Sunspire.');
    flags.routeToFinalUnlocked = true;
    expect(engine.currentObjective()).toBe("Meet Aster's page on the Eclipse Tower road.");
    flags.eclipseRoadEventSeen = true;
    expect(engine.currentObjective()).toBe('Enter Eclipse Tower and defeat the Hollow Regent.');
  });
});

describe('Five Roads content matrix', () => {
  it('audits every village slice against story, dungeon, QA, balance, and asset coverage', () => {
    const matrix = buildFiveRoadsContentMatrix();

    expect(matrix.totals).toMatchObject({
      villages: 5,
      routeEvents: 5,
      threeRoomDungeons: 5,
      objectiveComplete: 5,
      warnings: 0
    });
    expect(matrix.totals.dungeonRooms).toBeGreaterThanOrEqual(15);
    expect(matrix.warnings).toEqual([]);
    expect(matrix.slices.map((slice) => slice.village)).toEqual(['Greenhollow', 'Waymeet', 'Lumaire', 'Ironmarch', 'Sunspire']);
    for (const slice of matrix.slices) {
      expect(slice.dungeonRoomCount).toBeGreaterThanOrEqual(3);
      expect(slice.normalEnemyEntityCount).toBe(0);
      expect(slice.encounterZoneCount).toBeGreaterThan(0);
      expect(slice.balanceStepFound).toBe(true);
      expect(slice.assetBatchFound).toBe(true);
      expect(slice.qaRoutesFound.length).toBeGreaterThan(0);
    }
  });

  it('keeps QA route ids grounded in existing maps and matrix formatting', () => {
    for (const route of Object.values(QA_ROUTES)) expect(MAPS[route.mapId]).toBeTruthy();
    const report = formatFiveRoadsContentMatrix();
    expect(report).toContain('# Five Roads Content Matrix');
    expect(report).toContain('Villages: 5/5');
    expect(report).toContain('Three-room dungeons: 5/5');
    expect(report).toContain('Warnings: 0');
  });
});

describe('active goal audit', () => {
  it('maps the big goal to concrete evidence and confirms production art is complete', () => {
    const audit = buildGoalAuditReport();
    const report = formatGoalAuditReport(audit);

    expect(audit.complete).toBe(true);
    expect(audit.criteria.map((item) => item.id)).toEqual([
      'five-villages',
      'route-events',
      'expanded-dungeons',
      'balance-route',
      'economy-equipment',
      'items-drops-icons',
      'asset-pipeline',
      'production-art'
    ]);
    expect(audit.criteria.filter((item) => !item.ok).map((item) => item.id)).toEqual([]);
    expect(report).toContain('# Sword Guys Goal Audit');
    expect(report).toContain('Goal complete: yes');
    expect(report).toContain('pending production 0');
    expect(report).toContain('Blockers');
    expect(report).toContain('- none');
    expect(report).toContain('missing coverage 0');
    expect(report).toContain('npm run items:economy -- --strict');
    expect(report).toContain('npm run assets:coverage -- --strict');
    expect(report).toContain('npm run assets:check -- --strict');
    expect(report).toContain('npm run assets:promote -- --strict');
    expect(report).toContain('npm run assets:staging-check');
    expect(report).toContain('npm run assets:packets-check');
  });
});

describe('balance model', () => {
  it('projects the full Five Roads route from content-backed encounters and rewards', () => {
    const projection = projectBalanceRoute();
    expect(projection.steps.map((step) => step.village)).toEqual(['Greenhollow', 'Waymeet', 'Lumaire', 'Ironmarch', 'Sunspire']);
    expect(projection.totals.bosses).toBe(4);
    expect(projection.totals.expectedNormalEncounters).toBeGreaterThanOrEqual(45);
    expect(projection.steps[0].equipment.weapon).toBe('iron_sword');
    expect(projection.steps[0].equipment.helmet).toBe('leather_cap');
    expect(projection.steps[0].levelEnd).toBeGreaterThanOrEqual(projection.steps[0].targetLevelRange[0]);
    expect(projection.steps[0].levelEnd).toBeLessThanOrEqual(projection.steps[0].targetLevelRange[1]);
  });

  it('keeps every route segment inside its target band without balance warnings', () => {
    const projection = projectBalanceRoute();
    for (const step of projection.steps) {
      expect(step.levelEnd).toBeGreaterThanOrEqual(step.targetLevelRange[0]);
      expect(step.levelEnd).toBeLessThanOrEqual(step.targetLevelRange[1]);
      expect(step.warnings).toEqual([]);
    }
  });

  it('applies actual quest rewards to the route economy and gear projection', () => {
    const projection = projectBalanceRoute();
    const greenhollow = projection.steps.find((step) => step.stepId === 'greenhollow_mossvale')!;
    const waymeet = projection.steps.find((step) => step.stepId === 'waymeet_dustbridge')!;
    const lumaire = projection.steps.find((step) => step.stepId === 'lumaire_shrine')!;

    expect(greenhollow.questRewards).toMatchObject({ questId: 'cave_relic', gold: 70, items: ['iron_sword'] });
    expect(greenhollow.equipment.weapon).toBe('iron_sword');
    expect(waymeet.purchases).not.toContain('iron_sword');
    expect(waymeet.questRewards).toMatchObject({ questId: 'road_seal', gold: 120 });
    expect(lumaire.questRewards.spells).toContain('river_mend');
    expect(lumaire.spells).toContain('river_mend');
  });

  it('uses available damage spells and MP budget in combat projections', () => {
    const projection = projectBalanceRoute();
    const lumaire = projection.steps.find((step) => step.stepId === 'lumaire_shrine')!;
    const sunspire = projection.steps.find((step) => step.stepId === 'sunspire_eclipse')!;

    expect(lumaire.boss).toMatchObject({
      primarySpellId: 'ember',
      spellCasts: 6
    });
    expect(lumaire.boss?.expectedTurns).toBeLessThan(10);
    expect(lumaire.boss?.spellDamage).toBeGreaterThan(lumaire.boss?.physicalDamage ?? 0);

    expect(sunspire.boss).toMatchObject({
      primarySpellId: 'sunflare',
      spellCasts: 3
    });
    expect(sunspire.boss?.mpSpent).toBe(48);
  });

  it('projects boss recovery from consumables and healing spells', () => {
    const projection = projectBalanceRoute();
    const waymeet = projection.steps.find((step) => step.stepId === 'waymeet_dustbridge')!;
    const ironmarch = projection.steps.find((step) => step.stepId === 'ironmarch_fortress')!;

    expect(waymeet.recoveryBeforeBoss.bestHealingSpellId).toBe('mend');
    expect(waymeet.recoveryBeforeBoss.consumableHealing).toBeGreaterThan(0);
    expect(waymeet.recoveryBeforeBoss.effectiveHp).toBeGreaterThan(waymeet.statsBeforeBoss.maxHp);
    expect(waymeet.advisories).toContain('Bandit Captain Rusk requires recovery planning.');
    expect(waymeet.warnings).not.toContain('Bandit Captain Rusk requires recovery planning.');

    expect(ironmarch.recoveryBeforeBoss.bestHealingSpellId).toBe('river_mend');
    expect(ironmarch.recoveryBeforeBoss.effectiveHp).toBeGreaterThan(ironmarch.boss?.expectedIncomingDamage ?? 0);
  });

  it('keeps the route budget tied to existing content ids', () => {
    for (const step of BALANCE_ROUTE_STEPS) {
      for (const expected of step.expectedEncounters) expect(ENCOUNTERS[expected.encounterId]).toBeTruthy();
      if (step.bossEncounterId) expect(ENCOUNTERS[step.bossEncounterId]).toBeTruthy();
      if (step.questRewardId) expect(QUESTS[step.questRewardId]).toBeTruthy();
      for (const id of step.expectedPurchases ?? []) expect(Boolean(ITEMS[id]) || Boolean(SPELLS[id])).toBe(true);
      for (const id of step.expectedTreasure ?? []) expect(Boolean(ITEMS[id]) || Boolean(SPELLS[id])).toBe(true);
      for (const id of step.expectedSpellUnlocks ?? []) expect(SPELLS[id]).toBeTruthy();
    }
  });

  it('only projects treasure that is actually found in map chests', () => {
    const chestRewards = new Set(
      Object.values(MAPS).flatMap((map) =>
        map.objects.filter((object) => object.type === 'chest' && object.givesItemId).map((object) => object.givesItemId)
      )
    );
    const missingTreasure = BALANCE_ROUTE_STEPS.flatMap((step) => step.expectedTreasure ?? []).filter(
      (itemId) => !chestRewards.has(itemId)
    );

    expect(missingTreasure).toEqual([]);
  });

  it('audits item values, shop entries, drops, equipment progression, and icon coverage', () => {
    const report = buildItemEconomyReport();

    expect(report.complete).toBe(true);
    expect(report.issues).toEqual([]);
    expect(report.sellableItemCount).toBeGreaterThan(30);
    expect(report.distinctDropItemIds).toEqual(['antidote', 'ether', 'potion', 'revive_charm', 'small_potion']);
    expect(report.equipmentProgression.every((row) => row.monotonicPrice && row.monotonicPower)).toBe(true);
    expect(report.iconCoverageComplete).toBe(true);
  });

  it('gives every sellable item an explicit sane sell value', () => {
    for (const item of Object.values(ITEMS).filter((candidate) => !candidate.keyItem && candidate.category !== 'keyItem')) {
      expect(item.sellPrice).toBeTypeOf('number');
      expect(item.sellPrice ?? 0).toBeGreaterThan(0);
      expect(item.sellPrice ?? 0).toBeLessThan(item.price);
      expect((item.sellPrice ?? 0) / item.price).toBeGreaterThanOrEqual(0.35);
      expect((item.sellPrice ?? 0) / item.price).toBeLessThanOrEqual(0.55);
    }
  });

  it('keeps enemy drop tables varied, valid, and out of key-item progression', () => {
    const dropIds = new Set<string>();
    for (const enemy of Object.values(ENEMIES)) {
      expect(enemy.drops?.length).toBeGreaterThan(0);
      for (const drop of enemy.drops ?? []) {
        dropIds.add(drop.itemId);
        expect(ITEMS[drop.itemId]).toBeTruthy();
        expect(ITEMS[drop.itemId].category).not.toBe('keyItem');
        expect(drop.chance).toBeGreaterThan(0);
        expect(drop.chance).toBeLessThanOrEqual(0.5);
      }
    }
    expect(dropIds.size).toBeGreaterThanOrEqual(5);
  });

  it('formats a readable report for balance reviews', () => {
    const report = formatBalanceProjection();
    expect(report).toContain('# Sword Guys Balance Projection');
    expect(report).toContain('Expected normal encounters:');
    expect(report).toContain('Quest reward (cave_relic): 70g, iron_sword');
    expect(report).toContain('Boss: Bandit Captain Rusk');
    expect(report).toContain('Boss: Mire Warden 6t/90dmg via ember x6');
    expect(report).toContain('Recovery before boss: effective HP');
    expect(report).toContain('Warnings: none');
    expect(report).toContain('Advisories: Bandit Captain Rusk requires recovery planning.');
    expect(report).toContain('Equipment: weapon=');
  });
});

describe('image-generation asset manifest', () => {
  const idsFor = <T extends { id: string }>(entries: T[]) => new Set(entries.map((entry) => entry.id));
  const testProductionEvidence = {
    source: 'purpose-built-imagegen',
    generatedFor: 'sword-guys',
    reviewNote: 'Purpose-built Sword Guys test asset reviewed in context.'
  } as const;

  it('keeps every current map NPC in the manifest', () => {
    const manifestIds = idsFor(NPC_ASSETS);
    const npcIds = Object.values(MAPS).flatMap((map) => map.npcs.map((npc) => npc.id));
    expect(npcIds.length).toBeGreaterThan(0);
    expect(npcIds.filter((id) => !manifestIds.has(id))).toEqual([]);
  });

  it('reports complete manifest coverage for current content surfaces', () => {
    const report = buildAssetCoverageReport();
    const formatted = formatAssetCoverageReport(report);

    expect(report.complete).toBe(true);
    expect(report.totalMissing).toBe(0);
    expect(report.required.backdropIds.length).toBeGreaterThan(0);
    expect(report.required.spellEffectIds).toEqual(Object.keys(SPELLS).sort());
    expect(report.required.itemIconIds).toEqual([...new Set([...Object.keys(ITEMS), ...Object.keys(SPELLS)])].sort());
    expect(formatted).toContain('# Sword Guys Asset Coverage');
    expect(formatted).toContain('Battle backdrops');
    expect(formatted).toContain('Spell animations');
    expect(formatted).toContain('Item icons');
  });

  it('keeps non-Greenhollow NPCs out of the shared Greenhollow sprite sheet', () => {
    const sharedSheetNpcIds = NPC_ASSETS.filter((entry) => entry.targetPath.endsWith('/greenhollow-npcs.png')).map(
      (entry) => entry.id
    );

    expect(sharedSheetNpcIds.every((id) => id.startsWith('greenhollow_'))).toBe(true);
  });

  it('keeps every enemy definition in the manifest', () => {
    const manifestIds = idsFor(ENEMY_ASSETS);
    const missing = Object.keys(ENEMIES).filter((id) => !manifestIds.has(id));
    expect(missing).toEqual([]);
  });

  it('keeps every used battle backdrop in the manifest', () => {
    const manifestIds = idsFor(BATTLE_BACKDROP_ASSETS);
    const usedBackdrops = new Set([
      ...Object.values(MAPS).map((map) => map.battleBackdrop),
      ...Object.values(MAPS).flatMap((map) => map.regions.flatMap((region) => (region.battleBackdrop ? [region.battleBackdrop] : []))),
      ...Object.values(ENCOUNTERS).map((encounter) => encounter.backdrop)
    ]);
    expect([...usedBackdrops].filter((id) => !manifestIds.has(id))).toEqual([]);
  });

  it('keeps every spell effect in the manifest', () => {
    const manifestIds = idsFor(SPELL_EFFECT_ASSETS);
    expect(Object.keys(SPELLS).filter((id) => !manifestIds.has(id))).toEqual([]);
  });

  it('keeps every item, spell, and shop entry covered by a 48px icon contract', () => {
    const coverage = buildItemIconCoverageReport();
    const iconIds = idsFor(ITEM_ICON_ASSETS);
    const shopIds = Object.values(SHOPS).flatMap((shop) => shop.inventory);

    expect(coverage.complete).toBe(true);
    expect(coverage.totalMissing).toBe(0);
    expect(Object.keys(ITEMS).filter((id) => !iconIds.has(id))).toEqual([]);
    expect(Object.keys(SPELLS).filter((id) => !iconIds.has(id))).toEqual([]);
    expect(shopIds.filter((id) => !iconIds.has(id))).toEqual([]);
    expect(itemIconUrlForId('small_potion')).toBe('/assets/items/small-potion.png');
    expect(itemIconRuntimeKeyForId('sunflare')).toBe('item:sunflare');
  });

  it('tracks every spell effect as approved production animation strips', () => {
    expect(SPELL_EFFECT_ASSETS.map((entry) => entry.id).sort()).toEqual(Object.keys(SPELLS).sort());
    for (const entry of SPELL_EFFECT_ASSETS) {
      expect(entry.status).toBe('approved');
      expect(entry.notes).toContain(`spell:${entry.id}`);
      expect(entry.production?.source).toBe('purpose-built-imagegen');
      expect(entry.frameWidth).toBe(64);
      expect(entry.frameHeight).toBe(64);
      expect(entry.frameCount).toBeGreaterThan(1);
      expect(entry.frameDurationMs).toBeGreaterThan(0);
      expect(spellEffectRuntimeSpecForId(entry.id)).toMatchObject({
        key: `spell:${entry.id}`,
        frameCount: entry.frameCount,
        frameDurationMs: entry.frameDurationMs
      });
    }
  });

  it('tracks village, overworld, interior, and dungeon tileset batches', () => {
    const manifestIds = idsFor(TILESET_ASSETS);
    expect(['greenhollow', 'waymeet', 'lumaire', 'ironmarch', 'sunspire'].filter((id) => !manifestIds.has(id))).toEqual([]);
    expect(['overworld_main', 'weapon_shop', 'inn', 'inn_lobby', 'inn_bedroom'].filter((id) => !manifestIds.has(id))).toEqual([]);
    expect(['mossvale_cave', 'dustbridge_ruins', 'flooded_shrine', 'ironvein_fortress', 'eclipse_tower'].filter((id) => !manifestIds.has(id))).toEqual([]);
  });

  it('has unique ids per asset kind and usable prompt/path metadata', () => {
    for (const kind of ['npcSprite', 'enemySprite', 'battleBackdrop', 'tileset', 'spellEffect'] as const) {
      const entries = IMAGE_GEN_ASSETS.filter((entry) => entry.kind === kind);
      const ids = entries.map((entry) => entry.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
    for (const entry of IMAGE_GEN_ASSETS) {
      expect(entry.prompt.length).toBeGreaterThan(80);
      expect(entry.targetPath.length).toBeGreaterThan(10);
      expect(entry.targetPath).toMatch(/^public\/assets\//);
      expect(['approved', 'integrated-placeholder', 'planned', 'needs-generation']).toContain(entry.status);
    }
  });

  it('requires approved production assets to document Sword Guys-specific provenance', () => {
    const invalidApproved = IMAGE_GEN_ASSETS.filter(
      (entry) =>
        entry.status === 'approved' &&
        (!entry.production ||
          entry.production.source !== 'purpose-built-imagegen' ||
          entry.production.generatedFor !== 'sword-guys' ||
          entry.production.reviewNote.length < 20)
    ).map((entry) => entry.id);

    expect(invalidApproved).toEqual([]);
  });

  it('builds output contracts for every image-generation asset kind', () => {
    const byKind = Object.fromEntries(IMAGE_GEN_ASSETS.map((entry) => [entry.kind, entry])) as Record<string, (typeof IMAGE_GEN_ASSETS)[number]>;
    const npc = buildAssetOutputContract(byKind.npcSprite);
    const enemy = buildAssetOutputContract(byKind.enemySprite);
    const backdrop = buildAssetOutputContract(byKind.battleBackdrop);
    const tileset = buildAssetOutputContract(byKind.tileset);
    const spell = buildAssetOutputContract(SPELL_EFFECT_ASSETS.find((entry) => entry.id === 'sunflare')!);

    expect(npc.outputShape).toContain('64x64');
    expect(npc.transparent).toBe(true);
    expect(enemy.runtimeUse).toContain('enemy:');
    expect(backdrop.outputShape).toContain('16:9');
    expect(backdrop.transparent).toBe(false);
    expect(tileset.outputShape).toContain('32x32');
    expect(spell.outputShape).toContain('12 frames');
    expect(spell.outputShape).toContain('768x64');
    for (const entry of IMAGE_GEN_ASSETS) {
      const contract = formatAssetOutputContract(entry);
      expect(contract).toContain('Output Contract:');
      expect(contract).toContain('Runtime Use:');
      expect(contract).toContain('Verification:');
    }
  });

  it('parses PNG headers and verifies generated asset output expectations', () => {
    const sunflare = SPELL_EFFECT_ASSETS.find((entry) => entry.id === 'sunflare')!;
    const grassland = BATTLE_BACKDROP_ASSETS.find((entry) => entry.id === 'grassland')!;
    const greenhollowTiles = TILESET_ASSETS.find((entry) => entry.id === 'greenhollow')!;
    const npc = NPC_ASSETS.find((entry) => entry.id === 'waymeet_broker')!;

    expect(parsePngInfo(pngBytes(768, 64))).toMatchObject({ width: 768, height: 64, hasAlpha: true });
    expect(verifyAssetPngBytes(sunflare, pngBytes(768, 64)).ok).toBe(true);
    expect(verifyAssetPngBytes(sunflare, pngBytes(704, 64)).errors).toContain('Expected width 768, got 704.');
    expect(verifyAssetPngBytes(grassland, pngBytes(1600, 900, 2)).ok).toBe(true);
    expect(verifyAssetPngBytes(greenhollowTiles, pngBytes(320, 192)).ok).toBe(true);
    expect(verifyAssetPngBytes(npc, pngBytes(64, 64, 2)).errors).toContain('Expected PNG alpha channel.');
    expect(verifyItemIconPngBytes(ITEM_ICON_ASSETS.find((entry) => entry.id === 'small_potion')!, pngBytes(48, 48)).ok).toBe(true);
    expect(verifyItemIconPngBytes(ITEM_ICON_ASSETS.find((entry) => entry.id === 'small_potion')!, pngBytes(64, 48)).errors).toContain('Expected width 48, got 64.');
  });

  it('verifies approved public asset files through a loader contract', async () => {
    const approvedEntries = IMAGE_GEN_ASSETS.filter((entry) => entry.status === 'approved' && entry.targetPath.startsWith('public/'));
    const report = await verifyApprovedAssetFiles(async (targetPath) => {
      const entry = approvedEntries.find((candidate) => candidate.targetPath === targetPath);
      if (!entry) return null;
      if (entry.kind === 'npcSprite') return pngBytes(64 * NPC_ASSETS.filter((candidate) => candidate.targetPath === entry.targetPath).length, 64);
      if (entry.kind === 'battleBackdrop') return pngBytes(1600, 900, 2);
      if (entry.kind === 'tileset') return pngBytes(320, 192);
      if (entry.kind === 'spellEffect') return pngBytes((entry.frameCount ?? 1) * (entry.frameWidth ?? 64), entry.frameHeight ?? 64);
      return pngBytes(64, 64);
    });

    expect(report.total).toBe(approvedEntries.length);
    expect(report.failed).toBe(0);
    expect(report.passed).toBe(approvedEntries.length);
  });

  it('fails approved asset verification when production evidence is missing', async () => {
    const grassland = BATTLE_BACKDROP_ASSETS.find((entry) => entry.id === 'grassland')!;
    const withoutEvidence = { ...grassland, production: undefined };
    const report = await verifyApprovedAssetFiles(async () => pngBytes(1600, 900, 2), [withoutEvidence]);

    expect(productionEvidenceErrorsForAsset(withoutEvidence)).toContain(
      'Approved production asset is missing Sword Guys production evidence.'
    );
    expect(report.failed).toBe(1);
    expect(report.failures[0].errors).toContain('Approved production asset is missing Sword Guys production evidence.');
  });

  it('reports valid pending files as shape-valid promotion candidates', async () => {
    const spark = SPELL_EFFECT_ASSETS.find((entry) => entry.id === 'spark')!;
    const pendingEntry: ImageGenAssetEntry = { ...spark, status: 'integrated-placeholder', production: undefined };
    const report = await buildAssetTargetCheckReport(async (targetPath) => {
      if (targetPath === pendingEntry.targetPath) return pngBytes(384, 64);
      return null;
    }, [pendingEntry]);
    const formatted = formatAssetTargetCheckReport(report);

    expect(report.readyToReview.map((row) => row.entry.id)).toEqual(['spark']);
    expect(report.malformed).toEqual([]);
    expect(formatted).toContain('Shape-valid pending files: 1');
    expect(formatted).toContain('PNG shape alone is not approval.');
    expect(formatted).toContain('spark: integrated-placeholder -> approved');
  });

  it('builds a manifest promotion plan for validated generated files', async () => {
    const spark = SPELL_EFFECT_ASSETS.find((entry) => entry.id === 'spark')!;
    const pendingEntry: ImageGenAssetEntry = { ...spark, status: 'integrated-placeholder', production: undefined };
    const plan = await buildAssetPromotionPlan(async (targetPath) => {
      if (targetPath === pendingEntry.targetPath) return pngBytes(384, 64);
      return null;
    }, [pendingEntry]);
    const formatted = formatAssetPromotionPlan(plan);

    expect(plan.candidates).toHaveLength(1);
    expect(plan.candidates[0]).toMatchObject({
      batchId: 'spell-effects',
      fromStatus: 'integrated-placeholder',
      toStatus: 'approved',
      pngSummary: '384x64 alpha'
    });
    expect(formatted).toContain('Shape-valid candidates: 1');
    expect(formatted).toContain('Writing promotion requires --purpose-built plus a valid .receipt.json');
    expect(formatted).toContain("Set spark status from 'integrated-placeholder' to 'approved'");
    expect(formatted).toContain('npm run assets:verify');
  });

  it('builds and validates purpose-built production receipts before promotion', () => {
    const pendingEntry = SPELL_EFFECT_ASSETS.find((entry) => entry.id === 'spark')!;
    const receiptText = buildAssetProductionReceipt(pendingEntry, {
      createdWith: 'built-in-image-gen',
      finalPrompt: `${pendingEntry.prompt} Use the Sword Guys foundation sprite scale and no recycled source art.`,
      reviewNote: 'Purpose-built Spark spell effect strip reviewed on the battle QA route.'
    });
    const receipt = parseAssetProductionReceipt(receiptText);

    expect(receiptPathForAsset(pendingEntry)).toBe('public/assets/effects/spells/spark-strip.png.receipt.json');
    expect(validateAssetProductionReceipt(pendingEntry, receipt)).toEqual([]);
    expect(receipt && productionEvidenceFromReceipt(receipt)).toMatchObject({
      source: 'purpose-built-imagegen',
      generatedFor: 'sword-guys',
      reviewNote: 'Purpose-built Spark spell effect strip reviewed on the battle QA route.'
    });

    const mismatchedReceipt = receipt ? { ...receipt, manifestPrompt: 'reused prompt from elsewhere' } : null;
    expect(validateAssetProductionReceipt(pendingEntry, mismatchedReceipt)).toContain(
      'Receipt manifestPrompt must exactly match the manifest prompt.'
    );
  });

  it('stages per-asset prompt files and receipt templates for generation passes', () => {
    const spark = SPELL_EFFECT_ASSETS.find((entry) => entry.id === 'spark')!;
    const plan = buildAssetStagePlan('spell-effects');
    const prompt = buildAssetPromptStageText(spark);
    const receiptTemplate = buildAssetReceiptTemplateText(spark);

    expect(plan.files).toEqual([]);
    expect(prompt).toContain('Prompt:');
    expect(prompt).toContain('Output Contract: Horizontal transparent spell strip, 6 frames');
    expect(prompt).toContain('npm run assets:receipt -- --asset spark');
    expect(receiptTemplate).toContain('"assetId": "spark"');
    expect(receiptTemplate).toContain('"reviewNote": "TODO: replace after in-game Sword Guys visual review"');
  });

  it('applies manifest status edits for approved promotion candidates', async () => {
    const spark = SPELL_EFFECT_ASSETS.find((entry) => entry.id === 'spark')!;
    const pendingEntry: ImageGenAssetEntry = { ...spark, status: 'integrated-placeholder', production: undefined };
    const plan = await buildAssetPromotionPlan(async (targetPath) => {
      if (targetPath === pendingEntry.targetPath) return pngBytes(384, 64);
      return null;
    }, [pendingEntry]);
    const manifestSource = `export const SPELL_EFFECT_ASSETS = [{ id: 'spark', kind: 'spellEffect', status: 'integrated-placeholder', targetPath: 'public/assets/effects/spells/spark-strip.png', prompt: spellPrompt('Spark', 'Fast yellow lightning bolt, 6-frame projectile and hit flash') }];`;
    const result = applyAssetPromotionStatuses(manifestSource, plan.candidates, testProductionEvidence);

    expect(result.errors).toEqual([]);
    expect(result.edits).toEqual([
      {
        assetId: 'spark',
        fromStatus: 'integrated-placeholder',
        toStatus: 'approved',
        targetPath: 'public/assets/effects/spells/spark-strip.png'
      }
    ]);
    expect(result.source).toContain("status: 'approved'");
    expect(result.source).toContain("production: { source: 'purpose-built-imagegen', generatedFor: 'sword-guys'");
    expect(result.source).toContain('Purpose-built Sword Guys test asset reviewed in context.');
    expect(result.source).not.toContain("status: 'integrated-placeholder'");
  });

  it('only marks existing project files as approved when they are not generated placeholders', () => {
    const projectAssets = new Set(
      Object.keys(import.meta.glob('../public/assets/**/*', { eager: true, query: '?url', import: 'default' })).map((path) =>
        path.replace('../', '')
      )
    );
    const missingApproved = IMAGE_GEN_ASSETS
      .filter((entry) => entry.status === 'approved')
      .filter((entry) => !projectAssets.has(entry.targetPath))
      .map((entry) => entry.id);

    expect(missingApproved).toEqual([]);
  });

  it('assigns every manifest entry to exactly one image-generation batch', () => {
    const report = summarizeAssetPipeline();
    expect(report.total).toBe(IMAGE_GEN_ASSETS.length);
    expect(report.unassignedAssetIds).toEqual([]);
    expect(report.duplicateAssetIds).toEqual([]);
    expect(report.unknownBatchAssetIds).toEqual([]);
    expect(report.readyForGeneration).toBe(0);
    expect(report.byKind.npcSprite).toBe(NPC_ASSETS.length);
    expect(report.byKind.enemySprite).toBe(ENEMY_ASSETS.length);
    expect(report.byStatus.approved).toBe(IMAGE_GEN_ASSETS.length);
    expect(report.byStatus['integrated-placeholder']).toBe(0);
  });

  it('reports complete production art readiness after final spell strips land', () => {
    const report = buildAssetReadinessReport();
    const approved = IMAGE_GEN_ASSETS.filter((entry) => entry.status === 'approved').length;
    const playable = IMAGE_GEN_ASSETS.filter((entry) => entry.status === 'approved' || entry.status === 'integrated-placeholder').length;
    const foundationBatch = report.batches.find((batch) => batch.id === 'foundation-greenhollow-mossvale')!;
    const ironmarchBatch = report.batches.find((batch) => batch.id === 'ironmarch-ironvein')!;
    const spellBatch = report.batches.find((batch) => batch.id === 'spell-effects')!;

    expect(report.total).toBe(IMAGE_GEN_ASSETS.length);
    expect(report.approved).toBe(approved);
    expect(report.playable).toBe(playable);
    expect(report.pendingProduction).toBe(report.total - approved);
    expect(report.productionComplete).toBe(true);
    expect(report.nextBatchId).toBeNull();
    expect(report.nextAssetIds).toEqual([]);
    expect(foundationBatch.productionComplete).toBe(true);
    expect(foundationBatch.pendingProduction).toBe(0);
    expect(ironmarchBatch.productionComplete).toBe(true);
    expect(ironmarchBatch.pendingProduction).toBe(0);
    expect(spellBatch.productionComplete).toBe(true);
    expect(spellBatch.approved).toBe(SPELL_EFFECT_ASSETS.length);
    expect(spellBatch.playable).toBe(SPELL_EFFECT_ASSETS.length);
    expect(spellBatch.pendingProduction).toBe(0);
  });

  it('formats a readable production art readiness report', () => {
    const report = formatAssetReadinessReport();
    expect(report).toContain('# Sword Guys Asset Readiness');
    expect(report).toContain('Production complete: yes');
    expect(report).toContain('Approved production assets:');
    expect(report).toContain('Next batch: none');
    expect(report).toContain('Approved: 25/25');
    expect(report).toContain('Approved: 17/17');
    expect(report).toContain('Approved: 20/20');
    expect(report).toContain('Approved: 6/6');
    expect(report).toContain('## Spell Effects');
  });

  it('renders a dev asset QA panel for the next production batch', () => {
    const panel = renderAssetQaPanel('spell-effects');

    expect(panel).toContain('Image Production QA');
    expect(panel).toContain('Spell Effects');
    expect(panel).toContain('97/97');
    expect(panel).toContain('Next assets');
    expect(panel).toContain('none');
    expect(panel).toContain('spark');
    expect(panel).toContain('mend');
    expect(panel).toContain('ember');
    expect(panel).toContain('river_mend');
    expect(panel).toContain('frost_rune');
    expect(panel).toContain('sunflare');
    expect(panel).toContain('approved');
    expect(panel).toContain('public/assets/effects/spells/spark-strip.png');
    expect(panel).toContain('Purpose-built Spark spell effect strip generated from the staged manifest prompt');
    expect(panel).toContain('Purpose-built Sunflare spell effect strip generated from the revised dramatic staged prompt');
    expect(panel).not.toContain('field_slime');
  });

  it('creates usable region prompt bundles without already-approved assets by default', () => {
    const batchIds = ASSET_GENERATION_BATCHES.map((batch) => batch.id);
    expect(new Set(batchIds).size).toBe(batchIds.length);

    const foundationBundle = buildImageGenerationPromptBundle('foundation-greenhollow-mossvale');
    expect(foundationBundle).toContain('Assets in this bundle: 0');
    expect(foundationBundle).not.toContain('Target: public/assets/characters/enemies/field-slime.png');
    expect(foundationBundle).not.toContain('Target: public/assets/characters/enemies/mire-slug.png');
    expect(foundationBundle).not.toContain('Target: public/assets/characters/enemies/pebble-imp.png');
    expect(foundationBundle).not.toContain('Target: public/assets/characters/enemies/grass-wolf.png');
    expect(foundationBundle).not.toContain('Target: public/assets/characters/enemies/road-rat.png');
    expect(foundationBundle).not.toContain('Target: public/assets/characters/enemies/thistle-bat.png');
    expect(foundationBundle).not.toContain('Target: public/assets/characters/enemies/cave-tick.png');
    expect(foundationBundle).not.toContain('Target: public/assets/characters/enemies/moss-goblin.png');
    expect(foundationBundle).not.toContain('Target: public/assets/characters/enemies/drip-wisp.png');
    expect(foundationBundle).not.toContain('Target: public/assets/battle/town-battle.png');
    expect(foundationBundle).not.toContain('Target: public/assets/battle/mossvale-cave-battle.png');
    expect(foundationBundle).not.toContain('Target: public/assets/environment/mossvale-cave-tiles.png');
    expect(foundationBundle).not.toContain('generated:phaser-texture');

    const lumaireBundle = buildImageGenerationPromptBundle('lumaire-flooded-shrine');
    expect(lumaireBundle).toContain('Assets in this bundle: 0');
    expect(lumaireBundle).not.toContain('Target: public/assets/environment/flooded-shrine-tiles.png');

    const ironmarchBundle = buildImageGenerationPromptBundle('ironmarch-ironvein');
    expect(ironmarchBundle).toContain('Assets in this bundle: 0');
    expect(ironmarchBundle).not.toContain('Target: public/assets/environment/ironvein-fortress-tiles.png');

    const sunspireBundle = buildImageGenerationPromptBundle('sunspire-eclipse');
    expect(sunspireBundle).toContain('Assets in this bundle: 0');
    expect(sunspireBundle).not.toContain('Target: public/assets/environment/eclipse-tower-tiles.png');

    const bundle = buildImageGenerationPromptBundle('spell-effects');
    expect(bundle).toContain('# Spell Effects');
    expect(bundle).toContain('QA Routes: route-start, event-lumaire-ferryman, eclipse-boss');
    expect(bundle).toContain('Assets in this bundle: 0');
    expect(bundle).not.toContain('Target: public/assets/effects/spells/spark-strip.png');
    expect(bundle).not.toContain('Target: public/assets/effects/spells/sunflare-strip.png');
    expect(bundle).not.toContain('Target: public/assets/environment/eclipse-tower-tiles.png');
    expect(bundle).not.toContain('Target: public/assets/characters/npcs/sunspire-keeper.png');
    expect(bundle).not.toContain('greenhollow_elder');
  });

  it('builds exportable batch packets with review gates', () => {
    const packet = buildImageGenerationBatchPacket('spell-effects');
    expect(packet).toContain('# Spell Effects');
    expect(packet).toContain('## Batch Review Checklist');
    expect(packet).toContain('Asset count: 0');
    expect(packet).toContain('By kind: npcSprite=0, enemySprite=0, battleBackdrop=0, tileset=0, spellEffect=0');
    expect(packet).not.toContain('- [ ] spark: public/assets/effects/spells/spark-strip.png');
    expect(packet).not.toContain('- [ ] mend: public/assets/effects/spells/mend-strip.png');
    expect(packet).not.toContain('- [ ] ember: public/assets/effects/spells/ember-strip.png');
    expect(packet).not.toContain('- [ ] river_mend: public/assets/effects/spells/river-mend-strip.png');
    expect(packet).not.toContain('- [ ] frost_rune: public/assets/effects/spells/frost-rune-strip.png');
    expect(packet).not.toContain('- [ ] sunflare: public/assets/effects/spells/sunflare-strip.png');
    expect(packet).not.toContain('- [ ] eclipse_tower: public/assets/environment/eclipse-tower-tiles.png');
    expect(packet).not.toContain('- [ ] sunspire_keeper: public/assets/characters/npcs/sunspire-keeper.png');
    expect(packet).not.toContain('- [ ] sunspire_captain: public/assets/characters/npcs/sunspire-captain.png');
    expect(packet).not.toContain('- [ ] sunspire_shop_keeper: public/assets/characters/npcs/sunspire-shop-keeper.png');
    expect(packet).not.toContain('- [ ] sunspire_inn_keeper: public/assets/characters/npcs/sunspire-inn-keeper.png');
    expect(packet).not.toContain('- [ ] route_sunspire_bellrunner: public/assets/characters/npcs/route-sunspire-bellrunner.png');
    expect(packet).not.toContain('- [ ] route_eclipse_page: public/assets/characters/npcs/route-eclipse-page.png');
    expect(packet).not.toContain('- [ ] capital_duelist: public/assets/characters/enemies/capital-duelist.png');
    expect(packet).not.toContain('- [ ] sunspire_magus: public/assets/characters/enemies/sunspire-magus.png');
    expect(packet).not.toContain('- [ ] eclipse_hound: public/assets/characters/enemies/eclipse-hound.png');
    expect(packet).not.toContain('- [ ] void_moth: public/assets/characters/enemies/void-moth.png');
    expect(packet).not.toContain('- [ ] hollow_knight: public/assets/characters/enemies/hollow-knight.png');
    expect(packet).not.toContain('- [ ] starved_gargoyle: public/assets/characters/enemies/starved-gargoyle.png');
    expect(packet).not.toContain('- [ ] obsidian_acolyte: public/assets/characters/enemies/obsidian-acolyte.png');
    expect(packet).not.toContain('- [ ] eclipse_seraph: public/assets/characters/enemies/eclipse-seraph.png');
    expect(packet).not.toContain('- [ ] hollow_regent: public/assets/characters/enemies/hollow-regent.png');
    expect(packet).not.toContain('- [ ] capital: public/assets/battle/sunspire-capital-battle.png');
    expect(packet).not.toContain('- [ ] dungeon: public/assets/battle/generic-dungeon-battle.png');
    expect(packet).not.toContain('- [ ] eclipse: public/assets/battle/eclipse-tower-battle.png');
    expect(packet).not.toContain('- [ ] sunspire: public/assets/environment/sunspire-tiles.png');
    expect(packet).not.toContain('- [ ] eclipse_tower: public/assets/environment/eclipse-tower-tiles.png');
    expect(packet).not.toContain('- [ ] ironvein_fortress: public/assets/environment/ironvein-fortress-tiles.png');
    expect(packet).not.toContain('- [ ] ironmarch: public/assets/environment/ironmarch-tiles.png');
    expect(packet).not.toContain('- [ ] mine: public/assets/battle/ironmarch-mine-battle.png');
    expect(packet).not.toContain('- [ ] fortress: public/assets/battle/ironvein-fortress-battle.png');
    expect(packet).not.toContain('- [ ] castle: public/assets/battle/ironvein-castle-battle.png');
    expect(packet).not.toContain('- [ ] ironmarch_marshal: public/assets/characters/npcs/ironmarch-marshal.png');
    expect(packet).not.toContain('- [ ] ironmarch_miner: public/assets/characters/npcs/ironmarch-miner.png');
    expect(packet).not.toContain('- [ ] ironmarch_shop_keeper: public/assets/characters/npcs/ironmarch-shop-keeper.png');
    expect(packet).not.toContain('- [ ] ironmarch_inn_keeper: public/assets/characters/npcs/ironmarch-inn-keeper.png');
    expect(packet).not.toContain('- [ ] route_ironmarch_miner: public/assets/characters/npcs/route-ironmarch-miner.png');
    expect(packet).not.toContain('- [ ] mine_mole: public/assets/characters/enemies/mine-mole.png');
    expect(packet).not.toContain('- [ ] iron_beetle: public/assets/characters/enemies/iron-beetle.png');
    expect(packet).not.toContain('- [ ] ember_bat: public/assets/characters/enemies/ember-bat.png');
    expect(packet).not.toContain('- [ ] fort_guard: public/assets/characters/enemies/fort-guard.png');
    expect(packet).not.toContain('- [ ] fort_lancer: public/assets/characters/enemies/fort-lancer.png');
    expect(packet).not.toContain('- [ ] smoke_alchemist: public/assets/characters/enemies/smoke-alchemist.png');
    expect(packet).not.toContain('- [ ] iron_castellan: public/assets/characters/enemies/iron-castellan.png');
    expect(packet).not.toContain('- [ ] lumaire_oracle: public/assets/characters/npcs/lumaire-oracle.png');
    expect(packet).not.toContain('- [ ] flooded_shrine: public/assets/environment/flooded-shrine-tiles.png');
    expect(packet).not.toContain('- [ ] waymeet_broker: public/assets/characters/npcs/waymeet-broker.png');
    expect(packet).not.toContain('- [ ] waymeet_scout: public/assets/characters/npcs/waymeet-scout.png');
    expect(packet).not.toContain('- [ ] waymeet_shop_keeper: public/assets/characters/npcs/waymeet-shop-keeper.png');
    expect(packet).not.toContain('- [ ] waymeet_inn_keeper: public/assets/characters/npcs/waymeet-inn-keeper.png');
    expect(packet).not.toContain('- [ ] route_waymeet_courier: public/assets/characters/npcs/route-waymeet-courier.png');
    expect(packet).not.toContain('- [ ] bandit_cutpurse: public/assets/characters/enemies/bandit-cutpurse.png');
    expect(packet).not.toContain('- [ ] bandit_archer: public/assets/characters/enemies/bandit-archer.png');
    expect(packet).not.toContain('- [ ] dust_sprite: public/assets/characters/enemies/dust-sprite.png');
    expect(packet).not.toContain('- [ ] ruin_sentinel: public/assets/characters/enemies/ruin-sentinel.png');
    expect(packet).not.toContain('- [ ] bandit_captain_rusk: public/assets/characters/enemies/bandit-captain-rusk.png');
    expect(packet).not.toContain('- [ ] road: public/assets/battle/waymeet-road-battle.png');
    expect(packet).not.toContain('- [ ] ruin: public/assets/battle/dustbridge-ruins-battle.png');
    expect(packet).not.toContain('- [ ] waymeet: public/assets/environment/waymeet-tiles.png');
    expect(packet).not.toContain('- [ ] dustbridge_ruins: public/assets/environment/dustbridge-ruins-tiles.png');
    expect(packet).not.toContain('- [ ] field_slime: public/assets/characters/enemies/field-slime.png');
    expect(packet).not.toContain('- [ ] mossvale_cave: public/assets/environment/mossvale-cave-tiles.png');
    expect(packet).toContain('- [ ] route-start');
    expect(packet).toContain('- [ ] event-lumaire-ferryman');
    expect(packet).toContain('- [ ] eclipse-boss');
    expect(packet).toContain('- [ ] npm run assets:stage -- spell-effects --write');
    expect(packet).toContain('- [ ] npm run assets:receipt -- --asset <asset-id>');
    expect(packet).toContain('- [ ] npm run assets:promote -- --batch spell-effects');
    expect(packet).toContain('--purpose-built --write');
    expect(packet).toContain('- [ ] npm run assets:check -- --strict');
    expect(packet).toContain('Do not promote prototype, recycled, cache-sourced, or other-project-looking art as production.');
    expect(packet).toContain('Write a production receipt for each approved PNG');
  });

  it('builds review packets for every image-generation batch', () => {
    for (const batch of ASSET_GENERATION_BATCHES) {
      const packet = buildImageGenerationBatchPacket(batch.id);
      expect(packet).toContain(`Batch ID: ${batch.id}`);
      expect(packet).toContain('### Acceptance');
      expect(packet).toContain('### Save Targets');
      expect(packet).toContain('### QA Routes');
      expect(packet).toContain('### Verification Commands');
    }
  });

  it('builds a deduped runtime load plan for approved project assets', () => {
    const loads = getApprovedRuntimeAssetLoads();
    expect(new Set(loads.map((asset) => asset.key)).size).toBe(loads.length);
    expect(loads.find((asset) => asset.key === 'backdrop:grassland')).toMatchObject({
      loader: 'image',
      url: '/assets/battle/greenhollow-fields-battle.png'
    });
    expect(loads.find((asset) => asset.key === 'enemy:field_slime')).toMatchObject({
      loader: 'image',
      url: '/assets/characters/enemies/field-slime.png'
    });
    expect(loads.find((asset) => asset.key === 'item:small_potion')).toMatchObject({
      kind: 'itemIcon',
      loader: 'image',
      url: '/assets/items/small-potion.png'
    });
    expect(loads.find((asset) => asset.key === 'enemy:mire_slug')).toMatchObject({
      loader: 'image',
      url: '/assets/characters/enemies/mire-slug.png'
    });
    expect(loads.find((asset) => asset.key === 'enemy:pebble_imp')).toMatchObject({
      loader: 'image',
      url: '/assets/characters/enemies/pebble-imp.png'
    });
    expect(loads.find((asset) => asset.key === 'enemy:grass_wolf')).toMatchObject({
      loader: 'image',
      url: '/assets/characters/enemies/grass-wolf.png'
    });
    expect(loads.find((asset) => asset.key === 'enemy:road_rat')).toMatchObject({
      loader: 'image',
      url: '/assets/characters/enemies/road-rat.png'
    });
    expect(loads.find((asset) => asset.key === 'enemy:thistle_bat')).toMatchObject({
      loader: 'image',
      url: '/assets/characters/enemies/thistle-bat.png'
    });
    expect(loads.find((asset) => asset.key === 'enemy:cave_tick')).toMatchObject({
      loader: 'image',
      url: '/assets/characters/enemies/cave-tick.png'
    });
    expect(loads.find((asset) => asset.key === 'enemy:moss_goblin')).toMatchObject({
      loader: 'image',
      url: '/assets/characters/enemies/moss-goblin.png'
    });
    expect(loads.find((asset) => asset.key === 'enemy:drip_wisp')).toMatchObject({
      loader: 'image',
      url: '/assets/characters/enemies/drip-wisp.png'
    });
    expect(loads.find((asset) => asset.key === 'backdrop:town')).toMatchObject({
      loader: 'image',
      url: '/assets/battle/town-battle.png'
    });
    expect(loads.find((asset) => asset.key === 'backdrop:cave')).toMatchObject({
      loader: 'image',
      url: '/assets/battle/mossvale-cave-battle.png'
    });
    expect(loads.find((asset) => asset.key === 'tiles:mossvale_cave')).toMatchObject({
      loader: 'spritesheet',
      url: '/assets/environment/mossvale-cave-tiles.png',
      frameWidth: TILE_SIZE,
      frameHeight: TILE_SIZE
    });
    expect(loads.find((asset) => asset.key === 'npc:waymeet_broker')).toMatchObject({
      loader: 'image',
      url: '/assets/characters/npcs/waymeet-broker.png'
    });
    expect(loads.find((asset) => asset.key === 'npc:waymeet_scout')).toMatchObject({
      loader: 'image',
      url: '/assets/characters/npcs/waymeet-scout.png'
    });
    expect(loads.find((asset) => asset.key === 'npc:waymeet_shop_keeper')).toMatchObject({
      loader: 'image',
      url: '/assets/characters/npcs/waymeet-shop-keeper.png'
    });
    expect(loads.find((asset) => asset.key === 'npc:waymeet_inn_keeper')).toMatchObject({
      loader: 'image',
      url: '/assets/characters/npcs/waymeet-inn-keeper.png'
    });
    expect(loads.find((asset) => asset.key === 'npc:route_waymeet_courier')).toMatchObject({
      loader: 'image',
      url: '/assets/characters/npcs/route-waymeet-courier.png'
    });
    expect(loads.find((asset) => asset.key === 'npc:lumaire_oracle')).toMatchObject({
      loader: 'image',
      url: '/assets/characters/npcs/lumaire-oracle.png'
    });
    expect(loads.find((asset) => asset.key === 'npc:lumaire_student')).toMatchObject({
      loader: 'image',
      url: '/assets/characters/npcs/lumaire-student.png'
    });
    expect(loads.find((asset) => asset.key === 'npc:lumaire_shop_keeper')).toMatchObject({
      loader: 'image',
      url: '/assets/characters/npcs/lumaire-shop-keeper.png'
    });
    expect(loads.find((asset) => asset.key === 'npc:lumaire_inn_keeper')).toMatchObject({
      loader: 'image',
      url: '/assets/characters/npcs/lumaire-inn-keeper.png'
    });
    expect(loads.find((asset) => asset.key === 'npc:route_lumaire_ferryman')).toMatchObject({
      loader: 'image',
      url: '/assets/characters/npcs/route-lumaire-ferryman.png'
    });
    expect(loads.find((asset) => asset.key === 'enemy:river_eel')).toMatchObject({
      loader: 'image',
      url: '/assets/characters/enemies/river-eel.png'
    });
    expect(loads.find((asset) => asset.key === 'enemy:reed_stalker')).toMatchObject({
      loader: 'image',
      url: '/assets/characters/enemies/reed-stalker.png'
    });
    expect(loads.find((asset) => asset.key === 'enemy:hex_frog')).toMatchObject({
      loader: 'image',
      url: '/assets/characters/enemies/hex-frog.png'
    });
    expect(loads.find((asset) => asset.key === 'enemy:mirror_wisp')).toMatchObject({
      loader: 'image',
      url: '/assets/characters/enemies/mirror-wisp.png'
    });
    expect(loads.find((asset) => asset.key === 'enemy:shrine_adept')).toMatchObject({
      loader: 'image',
      url: '/assets/characters/enemies/shrine-adept.png'
    });
    expect(loads.find((asset) => asset.key === 'enemy:mire_warden')).toMatchObject({
      loader: 'image',
      url: '/assets/characters/enemies/mire-warden.png'
    });
    expect(loads.find((asset) => asset.key === 'enemy:bandit_cutpurse')).toMatchObject({
      loader: 'image',
      url: '/assets/characters/enemies/bandit-cutpurse.png'
    });
    expect(loads.find((asset) => asset.key === 'enemy:bandit_archer')).toMatchObject({
      loader: 'image',
      url: '/assets/characters/enemies/bandit-archer.png'
    });
    expect(loads.find((asset) => asset.key === 'enemy:dust_sprite')).toMatchObject({
      loader: 'image',
      url: '/assets/characters/enemies/dust-sprite.png'
    });
    expect(loads.find((asset) => asset.key === 'enemy:ruin_sentinel')).toMatchObject({
      loader: 'image',
      url: '/assets/characters/enemies/ruin-sentinel.png'
    });
    expect(loads.find((asset) => asset.key === 'enemy:bandit_captain_rusk')).toMatchObject({
      loader: 'image',
      url: '/assets/characters/enemies/bandit-captain-rusk.png'
    });
    expect(loads.find((asset) => asset.key === 'backdrop:road')).toMatchObject({
      loader: 'image',
      url: '/assets/battle/waymeet-road-battle.png'
    });
    expect(loads.find((asset) => asset.key === 'backdrop:ruin')).toMatchObject({
      loader: 'image',
      url: '/assets/battle/dustbridge-ruins-battle.png'
    });
    expect(loads.find((asset) => asset.key === 'backdrop:river')).toMatchObject({
      loader: 'image',
      url: '/assets/battle/lumaire-river-battle.png'
    });
    expect(loads.find((asset) => asset.key === 'backdrop:shrine')).toMatchObject({
      loader: 'image',
      url: '/assets/battle/flooded-shrine-battle.png'
    });
    expect(loads.find((asset) => asset.key === 'tiles:waymeet')).toMatchObject({
      loader: 'spritesheet',
      url: '/assets/environment/waymeet-tiles.png',
      frameWidth: TILE_SIZE,
      frameHeight: TILE_SIZE
    });
    expect(loads.find((asset) => asset.key === 'tiles:lumaire')).toMatchObject({
      loader: 'spritesheet',
      url: '/assets/environment/lumaire-tiles.png',
      frameWidth: TILE_SIZE,
      frameHeight: TILE_SIZE
    });
    expect(loads.find((asset) => asset.key === 'tiles:flooded_shrine')).toMatchObject({
      loader: 'spritesheet',
      url: '/assets/environment/flooded-shrine-tiles.png',
      frameWidth: TILE_SIZE,
      frameHeight: TILE_SIZE
    });
    expect(loads.find((asset) => asset.key === 'npc:ironmarch_marshal')).toMatchObject({
      loader: 'image',
      url: '/assets/characters/npcs/ironmarch-marshal.png'
    });
    expect(loads.find((asset) => asset.key === 'npc:ironmarch_miner')).toMatchObject({
      loader: 'image',
      url: '/assets/characters/npcs/ironmarch-miner.png'
    });
    expect(loads.find((asset) => asset.key === 'npc:ironmarch_shop_keeper')).toMatchObject({
      loader: 'image',
      url: '/assets/characters/npcs/ironmarch-shop-keeper.png'
    });
    expect(loads.find((asset) => asset.key === 'npc:ironmarch_inn_keeper')).toMatchObject({
      loader: 'image',
      url: '/assets/characters/npcs/ironmarch-inn-keeper.png'
    });
    expect(loads.find((asset) => asset.key === 'npc:route_ironmarch_miner')).toMatchObject({
      loader: 'image',
      url: '/assets/characters/npcs/route-ironmarch-miner.png'
    });
    expect(loads.find((asset) => asset.key === 'enemy:mine_mole')).toMatchObject({
      loader: 'image',
      url: '/assets/characters/enemies/mine-mole.png'
    });
    expect(loads.find((asset) => asset.key === 'enemy:iron_beetle')).toMatchObject({
      loader: 'image',
      url: '/assets/characters/enemies/iron-beetle.png'
    });
    expect(loads.find((asset) => asset.key === 'enemy:ember_bat')).toMatchObject({
      loader: 'image',
      url: '/assets/characters/enemies/ember-bat.png'
    });
    expect(loads.find((asset) => asset.key === 'enemy:fort_guard')).toMatchObject({
      loader: 'image',
      url: '/assets/characters/enemies/fort-guard.png'
    });
    expect(loads.find((asset) => asset.key === 'enemy:fort_lancer')).toMatchObject({
      loader: 'image',
      url: '/assets/characters/enemies/fort-lancer.png'
    });
    expect(loads.find((asset) => asset.key === 'enemy:smoke_alchemist')).toMatchObject({
      loader: 'image',
      url: '/assets/characters/enemies/smoke-alchemist.png'
    });
    expect(loads.find((asset) => asset.key === 'enemy:iron_castellan')).toMatchObject({
      loader: 'image',
      url: '/assets/characters/enemies/iron-castellan.png'
    });
    expect(loads.find((asset) => asset.key === 'backdrop:mine')).toMatchObject({
      loader: 'image',
      url: '/assets/battle/ironmarch-mine-battle.png'
    });
    expect(loads.find((asset) => asset.key === 'backdrop:fortress')).toMatchObject({
      loader: 'image',
      url: '/assets/battle/ironvein-fortress-battle.png'
    });
    expect(loads.find((asset) => asset.key === 'backdrop:castle')).toMatchObject({
      loader: 'image',
      url: '/assets/battle/ironvein-castle-battle.png'
    });
    expect(loads.find((asset) => asset.key === 'tiles:ironmarch')).toMatchObject({
      loader: 'spritesheet',
      url: '/assets/environment/ironmarch-tiles.png',
      frameWidth: TILE_SIZE,
      frameHeight: TILE_SIZE
    });
    expect(loads.find((asset) => asset.key === 'tiles:ironvein_fortress')).toMatchObject({
      loader: 'spritesheet',
      url: '/assets/environment/ironvein-fortress-tiles.png',
      frameWidth: TILE_SIZE,
      frameHeight: TILE_SIZE
    });
    expect(loads.find((asset) => asset.key === 'npc:sunspire_keeper')).toMatchObject({
      loader: 'image',
      url: '/assets/characters/npcs/sunspire-keeper.png'
    });
    expect(loads.find((asset) => asset.key === 'npc:sunspire_captain')).toMatchObject({
      loader: 'image',
      url: '/assets/characters/npcs/sunspire-captain.png'
    });
    expect(loads.find((asset) => asset.key === 'npc:sunspire_shop_keeper')).toMatchObject({
      loader: 'image',
      url: '/assets/characters/npcs/sunspire-shop-keeper.png'
    });
    expect(loads.find((asset) => asset.key === 'npc:sunspire_inn_keeper')).toMatchObject({
      loader: 'image',
      url: '/assets/characters/npcs/sunspire-inn-keeper.png'
    });
    expect(loads.find((asset) => asset.key === 'tiles:dustbridge_ruins')).toMatchObject({
      loader: 'spritesheet',
      url: '/assets/environment/dustbridge-ruins-tiles.png',
      frameWidth: TILE_SIZE,
      frameHeight: TILE_SIZE
    });
    expect(loads.find((asset) => asset.key === 'npc:greenhollow:npcs')).toMatchObject({
      loader: 'spritesheet',
      frameWidth: 64,
      frameHeight: 64
    });
    expect(loads.find((asset) => asset.key === 'tiles:greenhollow')).toMatchObject({
      loader: 'spritesheet',
      frameWidth: TILE_SIZE,
      frameHeight: TILE_SIZE
    });
    expect(loads.find((asset) => asset.key === 'tiles:eclipse_tower')).toMatchObject({
      loader: 'spritesheet',
      url: '/assets/environment/eclipse-tower-tiles.png',
      frameWidth: TILE_SIZE,
      frameHeight: TILE_SIZE
    });
    expect(loads.find((asset) => asset.key === 'spell:spark')).toMatchObject({
      loader: 'spritesheet',
      url: '/assets/effects/spells/spark-strip.png',
      frameWidth: 64,
      frameHeight: 64,
      frameCount: 6,
      frameDurationMs: 45
    });
    expect(loads.find((asset) => asset.key === 'spell:sunflare')).toMatchObject({
      loader: 'spritesheet',
      url: '/assets/effects/spells/sunflare-strip.png',
      frameWidth: 64,
      frameHeight: 64,
      frameCount: 12,
      frameDurationMs: 45
    });
    expect(runtimeAssetKeyForId('greenhollow_elder')).toBe('npc:greenhollow:npcs');
    expect(runtimeAssetKeyForId('town')).toBe('backdrop:town');
    expect(runtimeAssetKeyForId('cave')).toBe('backdrop:cave');
    expect(runtimeAssetKeyForId('mossvale_cave')).toBe('tiles:mossvale_cave');
    expect(runtimeAssetKeyForId('waymeet_broker')).toBe('npc:waymeet_broker');
    expect(runtimeAssetKeyForId('waymeet_scout')).toBe('npc:waymeet_scout');
    expect(runtimeAssetKeyForId('waymeet_shop_keeper')).toBe('npc:waymeet_shop_keeper');
    expect(runtimeAssetKeyForId('waymeet_inn_keeper')).toBe('npc:waymeet_inn_keeper');
    expect(runtimeAssetKeyForId('route_waymeet_courier')).toBe('npc:route_waymeet_courier');
    expect(runtimeAssetKeyForId('bandit_cutpurse')).toBe('enemy:bandit_cutpurse');
    expect(runtimeAssetKeyForId('bandit_archer')).toBe('enemy:bandit_archer');
    expect(runtimeAssetKeyForId('dust_sprite')).toBe('enemy:dust_sprite');
    expect(runtimeAssetKeyForId('ruin_sentinel')).toBe('enemy:ruin_sentinel');
    expect(runtimeAssetKeyForId('bandit_captain_rusk')).toBe('enemy:bandit_captain_rusk');
    expect(runtimeAssetKeyForId('road')).toBe('backdrop:road');
    expect(runtimeAssetKeyForId('ruin')).toBe('backdrop:ruin');
    expect(runtimeAssetKeyForId('waymeet')).toBe('tiles:waymeet');
    expect(runtimeAssetKeyForId('dustbridge_ruins')).toBe('tiles:dustbridge_ruins');
    expect(runtimeAssetKeyForId('lumaire_oracle')).toBe('npc:lumaire_oracle');
    expect(runtimeAssetKeyForId('lumaire_student')).toBe('npc:lumaire_student');
    expect(runtimeAssetKeyForId('lumaire_shop_keeper')).toBe('npc:lumaire_shop_keeper');
    expect(runtimeAssetKeyForId('lumaire_inn_keeper')).toBe('npc:lumaire_inn_keeper');
    expect(runtimeAssetKeyForId('route_lumaire_ferryman')).toBe('npc:route_lumaire_ferryman');
    expect(runtimeAssetKeyForId('river_eel')).toBe('enemy:river_eel');
    expect(runtimeAssetKeyForId('reed_stalker')).toBe('enemy:reed_stalker');
    expect(runtimeAssetKeyForId('hex_frog')).toBe('enemy:hex_frog');
    expect(runtimeAssetKeyForId('mirror_wisp')).toBe('enemy:mirror_wisp');
    expect(runtimeAssetKeyForId('shrine_adept')).toBe('enemy:shrine_adept');
    expect(runtimeAssetKeyForId('mire_warden')).toBe('enemy:mire_warden');
    expect(runtimeAssetKeyForId('river')).toBe('backdrop:river');
    expect(runtimeAssetKeyForId('shrine')).toBe('backdrop:shrine');
    expect(runtimeAssetKeyForId('lumaire')).toBe('tiles:lumaire');
    expect(runtimeAssetKeyForId('flooded_shrine')).toBe('tiles:flooded_shrine');
    expect(runtimeAssetKeyForId('ironmarch_marshal')).toBe('npc:ironmarch_marshal');
    expect(runtimeAssetKeyForId('ironmarch_miner')).toBe('npc:ironmarch_miner');
    expect(runtimeAssetKeyForId('ironmarch_shop_keeper')).toBe('npc:ironmarch_shop_keeper');
    expect(runtimeAssetKeyForId('ironmarch_inn_keeper')).toBe('npc:ironmarch_inn_keeper');
    expect(runtimeAssetKeyForId('route_ironmarch_miner')).toBe('npc:route_ironmarch_miner');
    expect(runtimeAssetKeyForId('mine_mole')).toBe('enemy:mine_mole');
    expect(runtimeAssetKeyForId('iron_beetle')).toBe('enemy:iron_beetle');
    expect(runtimeAssetKeyForId('ember_bat')).toBe('enemy:ember_bat');
    expect(runtimeAssetKeyForId('fort_guard')).toBe('enemy:fort_guard');
    expect(runtimeAssetKeyForId('fort_lancer')).toBe('enemy:fort_lancer');
    expect(runtimeAssetKeyForId('smoke_alchemist')).toBe('enemy:smoke_alchemist');
    expect(runtimeAssetKeyForId('iron_castellan')).toBe('enemy:iron_castellan');
    expect(runtimeAssetKeyForId('mine')).toBe('backdrop:mine');
    expect(runtimeAssetKeyForId('fortress')).toBe('backdrop:fortress');
    expect(runtimeAssetKeyForId('castle')).toBe('backdrop:castle');
    expect(runtimeAssetKeyForId('ironmarch')).toBe('tiles:ironmarch');
    expect(runtimeAssetKeyForId('ironvein_fortress')).toBe('tiles:ironvein_fortress');
    expect(runtimeAssetKeyForId('sunspire_keeper')).toBe('npc:sunspire_keeper');
    expect(runtimeAssetKeyForId('sunspire_captain')).toBe('npc:sunspire_captain');
    expect(runtimeAssetKeyForId('sunspire_shop_keeper')).toBe('npc:sunspire_shop_keeper');
    expect(runtimeAssetKeyForId('sunspire_inn_keeper')).toBe('npc:sunspire_inn_keeper');
    expect(runtimeAssetKeyForId('route_sunspire_bellrunner')).toBe('npc:route_sunspire_bellrunner');
    expect(runtimeAssetKeyForId('route_eclipse_page')).toBe('npc:route_eclipse_page');
    expect(runtimeAssetKeyForId('capital_duelist')).toBe('enemy:capital_duelist');
    expect(runtimeAssetKeyForId('sunspire_magus')).toBe('enemy:sunspire_magus');
    expect(runtimeAssetKeyForId('eclipse_hound')).toBe('enemy:eclipse_hound');
    expect(runtimeAssetKeyForId('void_moth')).toBe('enemy:void_moth');
    expect(runtimeAssetKeyForId('hollow_knight')).toBe('enemy:hollow_knight');
    expect(runtimeAssetKeyForId('starved_gargoyle')).toBe('enemy:starved_gargoyle');
    expect(runtimeAssetKeyForId('obsidian_acolyte')).toBe('enemy:obsidian_acolyte');
    expect(runtimeAssetKeyForId('eclipse_seraph')).toBe('enemy:eclipse_seraph');
    expect(runtimeAssetKeyForId('hollow_regent')).toBe('enemy:hollow_regent');
    expect(runtimeAssetKeyForId('capital')).toBe('backdrop:capital');
    expect(runtimeAssetKeyForId('dungeon')).toBe('backdrop:dungeon');
    expect(runtimeAssetKeyForId('eclipse')).toBe('backdrop:eclipse');
    expect(runtimeAssetKeyForId('sunspire')).toBe('tiles:sunspire');
    expect(runtimeAssetKeyForId('eclipse_tower')).toBe('tiles:eclipse_tower');
    expect(runtimeAssetKeyForId('spark')).toBe('spell:spark');
    expect(runtimeAssetKeyForId('sunflare')).toBe('spell:sunflare');
  });

  it('replaces procedural texture keys when approved image-gen assets land', () => {
    const syntheticLoads = [
      {
        id: 'field_slime',
        kind: 'enemySprite',
        key: 'enemy:field_slime',
        targetPath: 'public/assets/characters/enemies/field-slime.png',
        url: '/assets/characters/enemies/field-slime.png',
        loader: 'image'
      },
      {
        id: 'waymeet_broker',
        kind: 'npcSprite',
        key: 'npc:waymeet_broker',
        targetPath: 'public/assets/characters/npcs/waymeet-broker.png',
        url: '/assets/characters/npcs/waymeet-broker.png',
        loader: 'image'
      }
    ] as const;

    expect(
      planApprovedImageGenTextureLoads(syntheticLoads, new Set(['enemy:field_slime']), new Set()).map((action) => ({
        key: action.asset.key,
        replaceExistingTexture: action.replaceExistingTexture
      }))
    ).toEqual([
      { key: 'enemy:field_slime', replaceExistingTexture: true },
      { key: 'npc:waymeet_broker', replaceExistingTexture: false }
    ]);
    expect(planApprovedImageGenTextureLoads(syntheticLoads, new Set(['enemy:field_slime']), new Set(['enemy:field_slime']))).toEqual([
      {
        asset: syntheticLoads[1],
        replaceExistingTexture: false
      }
    ]);
  });
});

describe('ending UI', () => {
  it('shows ending choices and continues on confirm', () => {
    const engine = new GameEngine(createInitialState());
    const root = { innerHTML: '', addEventListener: vi.fn() } as unknown as HTMLElement;
    const ui = new UIManager(root);
    engine.state.endingReached = true;
    ui.sync(engine);
    expect(root.innerHTML).toContain('Continue Exploring');
    expect(root.innerHTML).toContain('Start Over');

    ui.handleExplorationActions({ ...blankInput, confirmPressed: true }, engine);
    expect(engine.state.endingReached).toBe(false);
    expect(ui.overlay).toBe('none');
  });

  it('can choose start over from the ending', () => {
    const engine = new GameEngine(createInitialState());
    const root = { innerHTML: '', addEventListener: vi.fn() } as unknown as HTMLElement;
    const ui = new UIManager(root);
    engine.state.endingReached = true;
    engine.state.player.level = 50;
    ui.sync(engine);

    ui.handleExplorationActions({ ...blankInput, rightPressed: true }, engine);
    ui.handleExplorationActions({ ...blankInput, confirmPressed: true }, engine);
    expect(engine.state.player.level).toBe(1);
    expect(engine.state.currentMapId).toBe('greenhollow');
    expect(ui.overlay).toBe('none');
  });
});

describe('combat', () => {
  it('does not consume the player turn when casting without enough MP', () => {
    const engine = new GameEngine(createInitialState());
    engine.pendingBattle = { mapId: 'overworld_main', enemyEntityId: 'ow_slime_1', encounterId: 'slime_pair' };
    const battle = engine.startPendingBattle();
    expect(battle).not.toBeNull();
    if (!battle) return;
    battle.player.stats.mp = 0;
    const hpBefore = battle.player.stats.hp;
    const result = engine.submitBattleCommand('magic', 'spark');
    expect(result.consumedTurn).toBe(false);
    expect(result.message).toBe('Not enough MP.');
    expect(engine.currentBattle?.phase).toBe('playerTurn');
    expect(engine.currentBattle?.player.stats.hp).toBe(hpBefore);
    expect(engine.currentBattle?.commandLog.at(-1)).toBe('Not enough MP.');
  });

  it('uses battle-local HP and MP for live display during combat', () => {
    const engine = new GameEngine(createInitialState());
    engine.pendingBattle = { mapId: 'overworld_main', enemyEntityId: 'ow_slime_1', encounterId: 'slime_pair' };
    const battle = engine.startPendingBattle();
    expect(battle).not.toBeNull();
    if (!battle) return;
    battle.player.stats.hp = 41;
    battle.player.stats.mp = 3;
    expect(engine.displayPlayerStats().hp).toBe(41);
    expect(engine.displayPlayerStats().mp).toBe(3);
  });

  it('updates battle-local stats when playtest power is granted during combat', () => {
    const engine = new GameEngine(createInitialState());
    engine.pendingBattle = { mapId: 'overworld_main', enemyEntityId: 'ow_slime_1', encounterId: 'slime_pair' };
    const battle = engine.startPendingBattle();
    expect(battle).not.toBeNull();
    if (!battle) return;
    battle.player.stats.hp = 1;
    battle.player.stats.mp = 0;
    engine.grantPlaytestPower();
    expect(engine.currentBattle?.player.stats.hp).toBeGreaterThanOrEqual(999);
    expect(engine.currentBattle?.player.stats.mp).toBeGreaterThanOrEqual(999);
    expect(engine.currentBattle?.commandLog.at(-1)).toBe('Playtest max stats enabled.');
  });

  it('does not consume the player turn when selecting an unusable item', () => {
    const engine = new GameEngine(createInitialState());
    engine.pendingBattle = { mapId: 'overworld_main', enemyEntityId: 'ow_slime_1', encounterId: 'slime_pair' };
    const battle = engine.startPendingBattle();
    expect(battle).not.toBeNull();
    if (!battle) return;
    const hpBefore = battle.player.stats.hp;
    const result = engine.submitBattleCommand('item', 'missing_item');
    expect(result.consumedTurn).toBe(false);
    expect(result.message).toBe('No usable item selected.');
    expect(engine.currentBattle?.phase).toBe('playerTurn');
    expect(engine.currentBattle?.player.stats.hp).toBe(hpBefore);
    expect(engine.currentBattle?.commandLog.at(-1)).toBe('No usable item selected.');
  });

  it('attacks the selected enemy and queues a matching battle visual', () => {
    const engine = new GameEngine(createInitialState());
    engine.pendingBattle = { mapId: 'overworld_main', enemyEntityId: 'ow_slime_1', encounterId: 'slime_pair' };
    const battle = engine.startPendingBattle();
    expect(battle).not.toBeNull();
    if (!battle) return;
    battle.enemies.forEach((enemy) => {
      enemy.stats.attack = 0;
    });
    const firstHp = battle.enemies[0].stats.hp;
    const secondHp = battle.enemies[1].stats.hp;

    const result = engine.submitBattleCommand('attack', undefined, battle.enemies[1].id);

    expect(result.consumedTurn).toBe(true);
    expect(battle.enemies[0].stats.hp).toBe(firstHp);
    expect(battle.enemies[1].stats.hp).toBeLessThan(secondHp);
    expect(engine.consumeBattleVisualEvents()[0]).toEqual({ type: 'playerAttack', targetId: battle.enemies[1].id });
  });

  it('queues the spell id and element for damaging spell visuals', () => {
    const engine = new GameEngine(createInitialState());
    engine.pendingBattle = { mapId: 'overworld_main', enemyEntityId: 'ow_slime_1', encounterId: 'slime_pair' };
    const battle = engine.startPendingBattle();
    expect(battle).not.toBeNull();
    if (!battle) return;
    battle.enemies.forEach((enemy) => {
      enemy.stats.attack = 0;
    });

    engine.submitBattleCommand('magic', 'spark', battle.enemies[1].id);

    expect(engine.consumeBattleVisualEvents()[0]).toEqual({
      type: 'playerMagic',
      targetId: battle.enemies[1].id,
      spellId: 'spark',
      element: 'lightning'
    });
  });

  it('queues the spell id for healing spell visuals', () => {
    const engine = new GameEngine(createInitialState());
    engine.pendingBattle = { mapId: 'overworld_main', enemyEntityId: 'ow_slime_1', encounterId: 'slime_pair' };
    const battle = engine.startPendingBattle();
    expect(battle).not.toBeNull();
    if (!battle) return;
    battle.player.stats.hp = 12;
    battle.enemies.forEach((enemy) => {
      enemy.stats.attack = 0;
    });

    engine.submitBattleCommand('magic', 'mend');

    expect(engine.consumeBattleVisualEvents()[0]).toEqual({ type: 'playerHeal', spellId: 'mend' });
  });

  it('awards victory rewards and clears source enemies', () => {
    const engine = new GameEngine(createInitialState());
    engine.pendingBattle = { mapId: 'overworld_main', enemyEntityId: 'ow_slime_1', encounterId: 'slime_pair' };
    const battle = engine.startPendingBattle();
    expect(battle).not.toBeNull();
    if (!battle) return;
    battle.enemies.forEach((enemy) => {
      enemy.stats.hp = 1;
      enemy.stats.attack = 0;
    });
    while (engine.currentBattle?.phase === 'playerTurn') engine.submitBattleCommand('attack');
    expect(engine.currentBattle?.phase).toBe('victory');
    expect(engine.currentBattle?.rewards?.xp).toBeGreaterThan(0);
    engine.finishBattle();
    expect(engine.pendingBattle).toBeNull();
  });

  it('unlocks the next region immediately after a progression boss dies', () => {
    const engine = new GameEngine(createInitialState());
    engine.state.activeQuestIds.push('road_seal');
    engine.pendingBattle = { mapId: 'dustbridge_ruins_map_room', enemyEntityId: 'dustbridge_ruins_boss', encounterId: 'boss_rusk' };
    const battle = engine.startPendingBattle();
    expect(battle).not.toBeNull();
    if (!battle) return;
    battle.enemies.forEach((enemy) => {
      enemy.stats.hp = 1;
      enemy.stats.attack = 0;
    });
    engine.submitBattleCommand('attack');
    expect(engine.currentBattle?.phase).toBe('victory');
    expect(engine.state.questFlags.banditCaptainDefeated).toBe(true);
    expect(engine.state.questFlags.routeToLumaireUnlocked).toBe(true);
    expect(engine.state.completedQuestIds).toContain('road_seal');
    expect(engine.state.keyItems.road_seal).toBe(true);
  });

  it('moves the visible battle command selection with up and down', () => {
    const engine = new GameEngine(createInitialState());
    engine.pendingBattle = { mapId: 'overworld_main', enemyEntityId: 'ow_slime_1', encounterId: 'slime_pair' };
    engine.startPendingBattle();
    const ui = new UIManager({ innerHTML: '' } as HTMLElement);

    ui.handleBattleActions({ ...blankInput }, engine);
    ui.handleBattleActions({ ...blankInput, downPressed: true }, engine);
    ui.sync(engine);
    expect((ui as unknown as { battleIndex: number }).battleIndex).toBe(2);

    ui.handleBattleActions({ ...blankInput, rightPressed: true }, engine);
    ui.sync(engine);
    expect((ui as unknown as { battleIndex: number }).battleIndex).toBe(3);

    ui.handleBattleActions({ ...blankInput, downPressed: true }, engine);
    ui.sync(engine);
    expect((ui as unknown as { battleIndex: number }).battleIndex).toBe(4);
  });

  it('opens target selection before a UI attack command resolves', () => {
    const engine = new GameEngine(createInitialState());
    engine.pendingBattle = { mapId: 'overworld_main', enemyEntityId: 'ow_slime_1', encounterId: 'slime_pair' };
    engine.startPendingBattle();
    const ui = new UIManager({ innerHTML: '' } as HTMLElement);

    ui.handleBattleActions({ ...blankInput, confirmPressed: true }, engine);
    expect((ui as unknown as { battleMode: string }).battleMode).toBe('targets');
    expect(engine.currentBattle?.commandLog.at(-1)).toBe('Slime Pair begins!');
  });

  it('keeps magic open after an invalid spell and closes it with cancel', () => {
    const engine = new GameEngine(createInitialState());
    engine.pendingBattle = { mapId: 'overworld_main', enemyEntityId: 'ow_slime_1', encounterId: 'slime_pair' };
    const battle = engine.startPendingBattle();
    expect(battle).not.toBeNull();
    if (!battle) return;
    battle.player.stats.mp = 0;
    const ui = new UIManager({ innerHTML: '' } as HTMLElement);

    ui.handleBattleActions({ ...blankInput, rightPressed: true }, engine);
    ui.handleBattleActions({ ...blankInput, confirmPressed: true }, engine);
    ui.handleBattleActions({ ...blankInput, confirmPressed: true }, engine);
    expect((ui as unknown as { battleMode: string }).battleMode).toBe('magic');
    expect(engine.currentBattle?.phase).toBe('playerTurn');

    ui.handleBattleActions({ ...blankInput, cancelPressed: true }, engine);
    expect((ui as unknown as { battleMode: string }).battleMode).toBe('commands');
  });
});
