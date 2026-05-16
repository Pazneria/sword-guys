import Phaser from 'phaser';
import { readActions, createActionKeys, ActionKeys } from '../../game/input/actions';
import { getGameEngine, RuntimeEnemy } from '../../game/simulation/engine';
import { MapObject, NPCDefinition, SleepVisualEffect, TILE_SIZE, TileLayerName } from '../../game/types';
import { getUIManager, UIManager } from '../../ui/dom';
import { runtimeAssetKeyForId } from '../../game/assets/runtime';
import { loadApprovedImageGenAssets } from '../assetLoader';
import { ACTOR_DEPTH, PLAYER_OVERWORLD_SCALE, npcOverworldRenderSpec } from '../actors';
import { ensureGameTextures } from '../textures';
import { resolveTileVisual } from '../tileVisuals';

const renderLayers: TileLayerName[] = ['ground', 'lowerObject', 'upperObject', 'effects'];
const layerDepth: Record<TileLayerName, number> = {
  ground: 0,
  lowerObject: 1000,
  upperObject: 8000,
  effects: 9000
};
const TILE_EDGE_CROP_INSET = 4;
const TILE_DEFAULT_GROUND_CROP_INSET = 2;
const TILE_GROUND_CROP_INSETS: Record<string, number> = {
  'tiles:dustbridge_ruins': 7,
  'tiles:ironvein_fortress': 5,
  'tiles:eclipse_tower': 5,
  'tiles:mossvale_cave': 2,
  'tiles:flooded_shrine': 2
};
const TILE_POOL_BUFFER = 6;
const FIXED_SCREEN_TILES = { width: 20, height: 12 };
const playerDirectionRows = ['south', 'southwest', 'west', 'northwest', 'north', 'northeast', 'east', 'southeast'] as const;
const PLAYER_IDLE_ASSET_VERSION = 'idle-facing-20260508-2';
const OVERWORLD_TREE_IMAGEGEN_ASSET_VERSION = 'overworld-tree-imagegen-20260509-2';
const OVERWORLD_BUSH_IMAGEGEN_ASSET_VERSION = 'overworld-bush-imagegen-20260509-1';

export class WorldScene extends Phaser.Scene {
  private keys!: ActionKeys;
  private engine = getGameEngine();
  private ui!: UIManager;
  private backdrop!: Phaser.GameObjects.Rectangle;
  private player!: Phaser.GameObjects.Sprite;
  private tilePool = new Map<TileLayerName, Phaser.GameObjects.Image[]>();
  private poolCols = 0;
  private poolRows = 0;
  private lastPoolMapId = '';
  private objectSprites: Phaser.GameObjects.Image[] = [];
  private npcSprites: Phaser.GameObjects.GameObject[] = [];
  private enemySprites = new Map<string, Phaser.GameObjects.Image>();
  private debugGraphics!: Phaser.GameObjects.Graphics;
  private sleepBlanket?: Phaser.GameObjects.Graphics;
  private sleepVisual?: SleepVisualEffect;
  private sleepSequenceActive = false;
  private lastMapId = '';
  private transitioningToBattle = false;
  private readonly handleResize = () => {
    this.resizeCameraViewport();
    this.updateCamera(true);
    this.rebuildTilePool();
  };
  private playerVisualState = { facing: '', moving: false, animationKey: '' };

  constructor() {
    super('WorldScene');
  }

  preload() {
    loadApprovedImageGenAssets(this, ['npcSprite', 'enemySprite', 'battleBackdrop', 'tileset', 'spellEffect']);
    this.load.spritesheet('player:overworld:idle', `/assets/characters/player/player-overworld-idle.png?v=${PLAYER_IDLE_ASSET_VERSION}`, {
      frameWidth: 64,
      frameHeight: 64
    });
    this.load.spritesheet('player:overworld:walk', '/assets/characters/player/player-overworld-walk.png', {
      frameWidth: 64,
      frameHeight: 64
    });
    this.load.spritesheet('player:overworld:walk:south', '/assets/characters/player/player-overworld-walk-south.png', {
      frameWidth: 64,
      frameHeight: 64
    });
    this.load.image('environment:overworld-tree-imagegen', `/assets/environment/overworld-tree-imagegen.png?v=${OVERWORLD_TREE_IMAGEGEN_ASSET_VERSION}`);
    this.load.image('environment:overworld-bush-imagegen', `/assets/environment/overworld-bush-imagegen.png?v=${OVERWORLD_BUSH_IMAGEGEN_ASSET_VERSION}`);
  }

  create() {
    this.transitioningToBattle = false;
    ensureGameTextures(this);
    this.ensurePlayerAnimations();
    this.keys = createActionKeys(this);
    this.ui = getUIManager();
    this.backdrop = this.add.rectangle(0, 0, 6000, 4000, 0x31543a).setOrigin(0).setDepth(-1000);
    this.resizeCameraViewport();
    this.player = this.add
      .sprite(this.engine.state.player.worldX, this.engine.state.player.worldY + 16, 'player:overworld:idle', this.playerIdleFrame(this.engine.state.player.facing))
      .setOrigin(0.5, 1)
      .setScale(PLAYER_OVERWORLD_SCALE)
      .setDepth(5000);
    this.debugGraphics = this.add.graphics().setDepth(10000);
    this.scale.on('resize', this.handleResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', this.handleResize));
    this.rebuildTilePool();
    this.rebuildMapSprites();
    this.cameras.main.fadeIn(180, 0, 0, 0);
  }

  private ensurePlayerAnimations() {
    for (const direction of playerDirectionRows) {
      const key = `player:overworld:walk:${direction}`;
      if (this.anims.exists(key)) continue;
      const row = playerDirectionRows.indexOf(direction);
      this.anims.create({
        key,
        frames: this.anims.generateFrameNumbers('player:overworld:walk', { start: row * 4, end: row * 4 + 3 }),
        frameRate: 7,
        repeat: -1
      });
    }
    if (!this.anims.exists('player:overworld:walk:south:smooth')) {
      this.anims.create({
        key: 'player:overworld:walk:south:smooth',
        frames: this.anims.generateFrameNumbers('player:overworld:walk:south', { start: 0, end: 7 }),
        frameRate: 12,
        repeat: -1
      });
    }
  }

  private playerIdleFrame(facing: string) {
    return this.playerDirectionIndex(facing);
  }

  private playerDirectionIndex(facing: string) {
    return Math.max(0, playerDirectionRows.indexOf(facing as (typeof playerDirectionRows)[number]));
  }

  private playerWalkAnimationKey(facing: string) {
    return facing === 'south' ? 'player:overworld:walk:south:smooth' : `player:overworld:walk:${facing}`;
  }

  private setPlayerIdleFrame(facing: string) {
    this.player.setTexture('player:overworld:idle', this.playerIdleFrame(facing));
  }

  update(_time: number, delta: number) {
    const actions = readActions(this.keys);
    if (import.meta.env.DEV && actions.playtestPowerPressed) this.engine.grantPlaytestPower();
    if (import.meta.env.DEV && actions.playtestRoutesPressed) this.engine.grantPlaytestPower({ unlockRoutes: true });
    const uiConsumed = this.ui.handleExplorationActions(actions, this.engine);
    if (!uiConsumed && actions.confirmPressed) this.ui.openInteraction(this.engine.interact(), this.engine);
    const sleepVisual = this.engine.consumePendingSleepVisual();
    if (sleepVisual && sleepVisual.mapId === this.engine.state.currentMapId) this.startSleepSequence(sleepVisual);
    this.engine.stepExploration(delta, actions, this.ui.blockingExploration || this.sleepSequenceActive);
    if (this.lastMapId !== this.engine.state.currentMapId) this.rebuildMapSprites();
    this.updateCamera();
    this.updateTiles();
    if (this.sleepSequenceActive) this.updateSleepPose();
    else this.updateSprites();
    this.drawDebug();
    if (this.engine.pendingBattle && !this.transitioningToBattle) this.startBattleTransition();
    this.ui.sync(this.engine);
  }

  private rebuildTilePool() {
    for (const sprites of this.tilePool.values()) sprites.forEach((sprite) => sprite.destroy());
    this.tilePool.clear();
    const { cols, rows } = this.tilePoolDimensions();
    this.poolCols = cols;
    this.poolRows = rows;
    this.lastPoolMapId = this.engine.state.currentMapId;
    renderLayers.forEach((layer, layerIndex) => {
      const sprites: Phaser.GameObjects.Image[] = [];
      for (let i = 0; i < this.poolCols * this.poolRows; i += 1) {
        sprites.push(this.add.image(0, 0, 'tile:grass_plain').setOrigin(0).setDepth(layerDepth[layer] + layerIndex));
      }
      this.tilePool.set(layer, sprites);
    });
  }

  private rebuildMapSprites() {
    this.lastMapId = this.engine.state.currentMapId;
    this.objectSprites.forEach((sprite) => sprite.destroy());
    this.npcSprites.forEach((sprite) => sprite.destroy());
    this.enemySprites.forEach((sprite) => sprite.destroy());
    this.sleepBlanket?.destroy();
    this.objectSprites = [];
    this.npcSprites = [];
    this.enemySprites.clear();
    this.sleepBlanket = undefined;
    this.sleepSequenceActive = false;
    this.sleepVisual = undefined;
    this.backdrop.setFillStyle(this.backdropColor());
    this.updateCamera(true);
    this.rebuildTilePool();

    for (const object of this.engine.renderObjects()) {
      const sprite = this.createObjectSprite(object);
      if (sprite) this.objectSprites.push(sprite);
    }
    for (const npc of this.engine.map.npcs) {
      const manifestKey = runtimeAssetKeyForId(npc.id);
      const generatedFrame = this.generatedNpcFrame(npc);
      const spec = npcOverworldRenderSpec(npc);
      const sprite: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite =
        manifestKey && this.textures.exists(manifestKey) && manifestKey !== 'npc:greenhollow:npcs'
          ? this.add.image(spec.x, spec.y, manifestKey)
          : generatedFrame === null
          ? this.add.image(spec.x, spec.y, this.npcTextureKey(npc))
          : this.add.sprite(spec.x, spec.y, 'npc:greenhollow:npcs', generatedFrame);
      sprite.setOrigin(spec.originX, spec.originY).setDisplaySize(spec.displayWidth, spec.displayHeight).setDepth(spec.depth);
      this.npcSprites.push(sprite);
    }
    for (const enemy of this.engine.runtimeEnemies) {
      const sprite = this.add.image(enemy.worldX, enemy.worldY - 8, `enemy:${this.encounterLead(enemy)}`).setDepth(enemy.worldY);
      this.enemySprites.set(enemy.id, sprite);
    }
    this.updateCamera(true);
  }

  private encounterLead(enemy: RuntimeEnemy) {
    const encounter = this.engine.currentBattle?.encounterId;
    void encounter;
    const mapEncounter = enemy.encounterId;
    const lead = {
      slime_pair: 'field_slime',
      grass_wolf_pack: 'grass_wolf',
      moss_cave_pack: 'moss_goblin',
      bandit_scouts: 'bandit_cutpurse',
      dust_ruin_pack: 'dust_sprite',
      river_menace: 'river_eel',
      shrine_mirrors: 'mirror_wisp',
      iron_mine_pack: 'iron_beetle',
      fort_patrol: 'fort_guard',
      capital_duel: 'capital_duelist',
      eclipse_pack: 'eclipse_hound',
      eclipse_elite: 'hollow_knight',
      boss_rusk: 'bandit_captain_rusk',
      boss_mire_warden: 'mire_warden',
      boss_iron_castellan: 'iron_castellan',
      boss_hollow_regent: 'hollow_regent'
    } as Record<string, string>;
    return lead[mapEncounter] ?? 'default';
  }

  private createObjectSprite(object: MapObject) {
    const key = object.type === 'chest' ? 'object:chest' : object.type === 'savePoint' ? 'object:save' : object.type === 'sign' ? 'object:sign' : null;
    if (!key) return null;
    return this.add.image(object.x * TILE_SIZE + object.width * 16, object.y * TILE_SIZE + object.height * 16, key).setDepth(object.y * TILE_SIZE + 20);
  }

  private startSleepSequence(visual: SleepVisualEffect) {
    if (this.sleepSequenceActive) return;
    this.sleepSequenceActive = true;
    this.sleepVisual = visual;
    this.engine.state.player.moving = false;
    this.player.stop();
    this.setPlayerIdleFrame('south');
    this.playerVisualState = { facing: 'south', moving: false, animationKey: '' };
    this.drawSleepBlanket(visual);
    this.updateSleepPose();
    this.time.delayedCall(320, () => {
      if (!this.sleepSequenceActive) return;
      this.cameras.main.fadeOut(420, 0, 0, 0);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        this.time.delayedCall(180, () => {
          this.cameras.main.fadeIn(420, 0, 0, 0);
          this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_IN_COMPLETE, () => this.finishSleepSequence());
        });
      });
    });
  }

  private updateSleepPose() {
    const visual = this.sleepVisual;
    if (!visual) return;
    this.player.setPosition(visual.bedX * TILE_SIZE + TILE_SIZE / 2, visual.bedY * TILE_SIZE + TILE_SIZE - 1);
    this.player.setDepth(ACTOR_DEPTH + visual.bedY + 0.1);
  }

  private drawSleepBlanket(visual: SleepVisualEffect) {
    this.sleepBlanket?.destroy();
    const x = visual.bedX * TILE_SIZE;
    const y = visual.bedY * TILE_SIZE;
    const blanket = this.add.graphics().setDepth(ACTOR_DEPTH + visual.bedY + 0.2);
    blanket.fillStyle(0x356f42, 1);
    blanket.fillRoundedRect(x + 5, y + 13, 22, 17, 3);
    blanket.lineStyle(1, 0x244b2c, 1);
    blanket.strokeRoundedRect(x + 5, y + 13, 22, 17, 3);
    blanket.lineStyle(1, 0x78a565, 0.75);
    blanket.lineBetween(x + 7, y + 16, x + 25, y + 16);
    this.sleepBlanket = blanket;
  }

  private finishSleepSequence() {
    const visual = this.sleepVisual;
    this.sleepBlanket?.destroy();
    this.sleepBlanket = undefined;
    this.sleepSequenceActive = false;
    this.sleepVisual = undefined;
    if (visual) {
      this.engine.state.player.worldX = visual.wakeX;
      this.engine.state.player.worldY = visual.wakeY;
      this.engine.state.player.facing = visual.wakeFacing;
    }
    this.updateSprites();
  }

  private npcTextureKey(npc: NPCDefinition) {
    const direct: Record<string, string> = {
      greenhollow_elder: 'npc:elder-rowan',
      greenhollow_guard: 'npc:greenhollow-guard',
      greenhollow_rumor: 'npc:mara',
      waymeet_scout: 'npc:scout',
      lumaire_oracle: 'npc:trainer',
      lumaire_student: 'npc:trainer',
      ironmarch_marshal: 'npc:greenhollow-guard',
      ironmarch_miner: 'npc:worker',
      sunspire_keeper: 'npc:town-keeper',
      sunspire_captain: 'npc:greenhollow-guard'
    };
    if (direct[npc.id]) return direct[npc.id];
    if (npc.role === 'shopkeeper') return 'npc:shopkeeper';
    if (npc.role === 'innkeeper') return 'npc:innkeeper';
    if (npc.role === 'guard') return 'npc:greenhollow-guard';
    if (npc.role === 'trainer') return 'npc:trainer';
    if (npc.role === 'rumor') return 'npc:scout';
    if (npc.role === 'objectiveGiver') return 'npc:town-keeper';
    return 'npc:base';
  }

  private generatedNpcFrame(npc: NPCDefinition) {
    const direct: Record<string, number> = {
      greenhollow_elder: 0,
      greenhollow_guard: 1,
      greenhollow_rumor: 2,
      ironmarch_miner: 5
    };
    if (direct[npc.id] !== undefined) return direct[npc.id];
    if (npc.role === 'shopkeeper') return 3;
    if (npc.role === 'innkeeper') return 4;
    if (npc.role === 'flavor' || npc.role === 'rumor') return 5;
    return null;
  }

  private updateCamera(force = false) {
    const camera = this.cameras.main;
    const map = this.engine.map;
    this.resizeCameraViewport();
    const zoom = this.cameraZoom();
    camera.setZoom(zoom);
    camera.setBounds(0, 0, map.width * TILE_SIZE, map.height * TILE_SIZE);
    if (map.cameraMode === 'smoothFollow') {
      if (force) camera.startFollow(this.player, true, 0.14, 0.14);
    } else {
      camera.stopFollow();
      const worldWidth = map.width * TILE_SIZE;
      const worldHeight = map.height * TILE_SIZE;
      const viewWidth = this.scale.width / zoom;
      const viewHeight = this.scale.height / zoom;
      camera.setScroll((worldWidth - viewWidth) / 2, (worldHeight - viewHeight) / 2);
    }
  }

  private cameraZoom() {
    const map = this.engine.map;
    const width = Math.max(1, this.scale.width);
    const height = Math.max(1, this.scale.height);
    if (map.cameraMode === 'smoothFollow') return Math.min(2, Math.max(0.75, Math.min(width / 900, height / 620) + 0.45));
    const fit = Math.min(width / (FIXED_SCREEN_TILES.width * TILE_SIZE), height / (FIXED_SCREEN_TILES.height * TILE_SIZE));
    return Math.max(0.45, Math.min(5, fit));
  }

  private resizeCameraViewport() {
    this.cameras.main.setViewport(0, 0, Math.max(1, this.scale.width), Math.max(1, this.scale.height));
  }

  private cameraWorldView() {
    const camera = this.cameras.main;
    const zoom = camera.zoom || this.cameraZoom();
    const fallbackWidth = Math.max(1, this.scale.width / zoom);
    const fallbackHeight = Math.max(1, this.scale.height / zoom);
    return {
      x: Number.isFinite(camera.worldView.x) ? camera.worldView.x : camera.scrollX,
      y: Number.isFinite(camera.worldView.y) ? camera.worldView.y : camera.scrollY,
      width: Math.max(fallbackWidth, camera.worldView.width || 0),
      height: Math.max(fallbackHeight, camera.worldView.height || 0)
    };
  }

  private tilePoolDimensions() {
    const view = this.cameraWorldView();
    const cols = Math.ceil(view.width / TILE_SIZE) + TILE_POOL_BUFFER * 2 + 4;
    const rows = Math.ceil(view.height / TILE_SIZE) + TILE_POOL_BUFFER * 2 + 4;
    return {
      cols: Math.min(this.engine.map.width + TILE_POOL_BUFFER * 2, Math.max(1, cols)),
      rows: Math.min(this.engine.map.height + TILE_POOL_BUFFER * 2, Math.max(1, rows))
    };
  }

  private ensureTilePoolCoverage() {
    const { cols, rows } = this.tilePoolDimensions();
    if (this.lastPoolMapId !== this.engine.state.currentMapId || cols !== this.poolCols || rows !== this.poolRows) {
      this.rebuildTilePool();
    }
  }

  private backdropColor() {
    const colors: Record<string, number> = {
      overworld: 0x31543a,
      town: 0x31543a,
      interior: 0x4b3828,
      cave: 0x2f2927,
      dungeon: 0x26283a,
      castle: 0x363945,
      shrine: 0x303b5d,
      special: 0x222437
    };
    return colors[this.engine.map.type] ?? 0x31543a;
  }

  private updateTiles() {
    this.ensureTilePoolCoverage();
    const view = this.cameraWorldView();
    const startX = Math.floor(view.x / TILE_SIZE) - TILE_POOL_BUFFER;
    const startY = Math.floor(view.y / TILE_SIZE) - TILE_POOL_BUFFER;
    for (const layer of renderLayers) {
      const sprites = this.tilePool.get(layer) ?? [];
      for (let row = 0; row < this.poolRows; row += 1) {
        for (let col = 0; col < this.poolCols; col += 1) {
          const sprite = sprites[row * this.poolCols + col];
          const x = startX + col;
          const y = startY + row;
          const placed = this.engine.map.layers[layer][y]?.[x];
          if (!placed) {
            sprite.setVisible(false);
            continue;
          }
          const visual = resolveTileVisual({
            map: this.engine.map,
            tileId: placed.id,
            x,
            y,
            layer,
            lockedTransition: this.isLockedTransitionTile(x, y)
          });
          if (visual.hidden) {
            sprite.setVisible(false);
            continue;
          }
          sprite.setVisible(true);
          if (visual.frame !== undefined) sprite.setTexture(visual.textureKey, visual.frame);
          else sprite.setTexture(visual.textureKey);
          if (this.isNightBedroomWindow(placed.id)) {
            sprite.setTint(0x5c6fa8);
            sprite.setAlpha(0.82);
          } else {
            sprite.clearTint();
            sprite.setAlpha(1);
          }
          const cropInset =
            visual.textureKey.startsWith('tiles:') && layer !== 'effects'
              ? layer === 'ground'
                ? TILE_GROUND_CROP_INSETS[visual.textureKey] ?? TILE_DEFAULT_GROUND_CROP_INSET
                : TILE_EDGE_CROP_INSET
              : 0;
          if (cropInset > 0) sprite.setCrop(cropInset, cropInset, TILE_SIZE - cropInset * 2, TILE_SIZE - cropInset * 2);
          else sprite.setCrop();
          const croppedSize = TILE_SIZE - cropInset * 2;
          const visibleSize = TILE_SIZE + cropInset * 2;
          const displaySize = cropInset > 0 ? (TILE_SIZE * visibleSize) / croppedSize : TILE_SIZE;
          const cropOffset = cropInset > 0 ? (cropInset * displaySize) / TILE_SIZE : 0;
          sprite.setPosition(x * TILE_SIZE - cropInset - cropOffset, y * TILE_SIZE - cropInset - cropOffset);
          sprite.setDisplaySize(displaySize, displaySize);
          sprite.setDepth(layerDepth[layer] + y);
        }
      }
    }
  }

  private innTileFrame(tileId: string, x: number, y: number) {
    if (this.engine.map.defaultBiome !== 'inn') return null;
    if (tileId === 'inn_floor') return 0;
    if (tileId === 'inn_floor_parquet') return 1;
    if (tileId === 'inn_door_inside' && this.isLockedTransitionTile(x, y)) return 6;
    const frames: Record<string, number> = {
      inn_floor_dark: 2,
      inn_stone_floor: 42,
      inn_wall_upper: 3,
      inn_wall_base: 10,
      inn_wall_side_left: 8,
      inn_wall_side_right: 9,
      inn_wall_south: 10,
      inn_window_wall: 5,
      inn_lamp_wall: 4,
      inn_fireplace_wall: 7,
      inn_door_inside: 11,
      inn_exit_mat: 47,
      inn_counter: 12,
      inn_counter_corner: 13,
      inn_plaque: 14,
      inn_rug_green: 15,
      inn_rug_red: 16,
      inn_rug_blue: 17,
      inn_bed_green: 18,
      inn_bed_green_foot: 21,
      inn_bed_blue: 19,
      inn_bed_red: 20,
      inn_bed_side: 21,
      inn_pillow_stack: 22,
      inn_blanket_folded: 23,
      inn_nightstand_candle: 24,
      inn_lamp_table: 25,
      inn_dresser: 26,
      inn_wardrobe: 27,
      inn_chest: 28,
      inn_table: 29,
      inn_chair: 30,
      inn_round_table: 31,
      inn_bookshelf: 32,
      inn_barrel: 33,
      inn_crate: 34,
      inn_plant: 35,
      inn_curtain_window: 36,
      inn_linen_shelf: 37,
      inn_folded_linen_shelf: 38,
      inn_privacy_screen: 39,
      inn_rug_runner_red: 44,
      inn_rug_runner_blue: 45,
      inn_rug_runner_green: 46,
      inn_mat: 47
    };
    return frames[tileId] ?? null;
  }

  private lobbyInnTileFrame(tileId: string) {
    const frames: Record<string, number> = {
      inn_lobby_couch_left: 0,
      inn_lobby_couch_right: 1,
      inn_lobby_armchair: 2,
      inn_lobby_fireplace: 3,
      inn_lobby_wall_lamp: 4,
      inn_lobby_large_plant: 5,
      inn_lobby_bookshelf: 6,
      inn_lobby_coat_hooks: 7,
      inn_lobby_rug_tl: 8,
      inn_lobby_rug_t1: 9,
      inn_lobby_rug_t2: 10,
      inn_lobby_rug_tr: 11,
      inn_lobby_round_table: 12,
      inn_lobby_supply_crate: 13,
      inn_lobby_barrel: 14,
      inn_lobby_candle_table: 15,
      inn_lobby_rug_ml: 16,
      inn_lobby_rug_m1: 17,
      inn_lobby_rug_m2: 18,
      inn_lobby_rug_mr: 19,
      inn_lobby_coffee_table: 20,
      inn_lobby_pillows: 21,
      inn_lobby_flower_box: 22,
      inn_lobby_painting: 23,
      inn_lobby_rug_bl: 24,
      inn_lobby_rug_b1: 25,
      inn_lobby_rug_b2: 26,
      inn_lobby_rug_br: 27,
      inn_lobby_vase_table: 28,
      inn_lobby_banner: 29,
      inn_lobby_sideboard: 30,
      inn_lobby_potted_plant: 31,
      inn_lobby_flower_counter: 34,
      inn_lobby_flowering_plant: 35,
      inn_lobby_stool: 36,
      inn_lobby_chest: 37,
      inn_lobby_lantern: 38,
      inn_lobby_curtain_window: 39
    };
    return frames[tileId] ?? null;
  }

  private bedroomInnTileFrame(tileId: string) {
    const frames: Record<string, number> = {
      inn_bedroom_wall: 0,
      inn_bedroom_window_left: 3,
      inn_bedroom_window_right: 4,
      inn_bedroom_floor_a: 8,
      inn_bedroom_floor_b: 9,
      inn_bedroom_floor_c: 10,
      inn_bedroom_floor_d: 11,
      inn_bedroom_floor_e: 12,
      inn_bedroom_floor_f: 13,
      inn_bedroom_floor_g: 14,
      inn_bedroom_floor_h: 15,
      inn_bedroom_bed: 16,
      inn_bedroom_nightstand_candle: 17,
      inn_bedroom_wardrobe: 18,
      inn_bedroom_dresser: 19,
      inn_bedroom_linen_shelf: 20,
      inn_bedroom_plant: 21,
      inn_bedroom_round_rug: 22,
      inn_bedroom_vine_plant: 23,
      inn_bedroom_runner_rug: 24,
      inn_bedroom_small_rug: 25,
      inn_bedroom_chest: 26,
      inn_bedroom_books: 27,
      inn_bedroom_wall_art: 28,
      inn_bedroom_blankets: 29,
      inn_bedroom_privacy_screen: 30,
      inn_bedroom_round_table: 31,
      inn_bedroom_exit_mat: 35,
      inn_bedroom_wall_south: 37,
      inn_bedroom_wall_side: 40,
      inn_bedroom_wall_side_left: 40,
      inn_bedroom_wall_side_right: 41
    };
    return frames[tileId] ?? null;
  }

  private isNightBedroomWindow(tileId: string) {
    if (tileId !== 'inn_bedroom_window_left' && tileId !== 'inn_bedroom_window_right') return false;
    if (!this.engine.map.id.endsWith('_room')) return false;
    const innMapId = this.engine.map.id.slice(0, -'_room'.length);
    return Boolean(this.engine.state.questFlags[`${innMapId}RoomNight`]);
  }

  private isLockedTransitionTile(x: number, y: number) {
    return this.engine.map.transitions.some((transition) => {
      if (!transition.lockedCollision || !transition.requiresFlag || this.engine.state.questFlags[transition.requiresFlag]) return false;
      if (transition.trigger.type !== 'bounds') return false;
      const bounds = transition.trigger.bounds;
      return x >= bounds.x && y >= bounds.y && x < bounds.x + bounds.width && y < bounds.y + bounds.height;
    });
  }

  private weaponShopTileFrame(tileId: string, x: number, y: number) {
    if (this.engine.map.defaultBiome !== 'armoryShop') return null;
    if (tileId === 'armory_floor') {
      const roll = Math.abs((x * 17 + y * 11 + x * y * 5) % 11);
      if (roll === 0) return 2;
      if (roll < 3) return 1;
      return 0;
    }
    const frames: Record<string, number> = {
      armory_floor_dark: 3,
      armory_stone_floor: 4,
      armory_wall_base: 5,
      armory_wall_upper: 8,
      armory_wall_shadow: 10,
      armory_wall_side_left: 34,
      armory_wall_side_right: 36,
      armory_wall_south: 47,
      armory_exit: 11,
      armory_counter: 12,
      armory_counter_corner: 14,
      armory_sword_rack: 16,
      armory_spear_rack: 17,
      armory_shield_display: 18,
      armory_armor_stand: 19,
      armory_helmet_stand: 20,
      armory_sword_table: 21,
      armory_shield_crate: 22,
      armory_anvil: 23,
      armory_forge: 24,
      armory_brazier: 25,
      armory_barrel: 26,
      armory_crate: 27,
      armory_supply_shelf: 28,
      armory_rug_runner: 29,
      armory_rug_square: 30,
      armory_banner: 31,
      armory_lantern: 32,
      armory_display_case: 33,
      armory_corner_wall: 34,
      armory_wall_window: 35,
      armory_weapon_sign: 38,
      armory_armor_sign: 39,
      armory_weapon_crate: 42,
      armory_plant: 44,
      armory_stool: 45,
      armory_threshold: 46
    };
    return frames[tileId] ?? null;
  }

  private greenhollowTileFrame(tileId: string, x: number, y: number, layer: TileLayerName) {
    if (this.engine.map.id !== 'greenhollow') return null;
    if (tileId === 'grass_plain') {
      const roll = Math.abs((x * 37 + y * 19 + x * y * 7) % 13);
      if (roll === 0) return 2;
      if (roll < 4) return 1;
      return 0;
    }
    if (tileId === 'grass_variant') return 1;
    if (tileId === 'flower_grass') return 2;
    if (tileId === 'tall_grass') return 3;
    if (tileId === 'dirt_path') return this.greenhollowPathFrame(x, y, layer);
    if (tileId === 'wood_fence') return this.greenhollowFenceFrame(x, y, layer);
    const frames: Record<string, number> = {
      building_wall: 20,
      building_wall_upper: 21,
      building_wall_upper_shadow: 47,
      building_roof: this.greenhollowRoofFrame(x, y, layer),
      door_house: 26,
      water_shallow: 36,
      stone_floor: 40,
      wood_floor: 39,
      shop_sign: 28,
      save_crystal: 46
    };
    return frames[tileId] ?? null;
  }

  private greenhollowPathFrame(x: number, y: number, layer: TileLayerName) {
    const north = this.tileAt(layer, x, y - 1) === 'dirt_path';
    const south = this.tileAt(layer, x, y + 1) === 'dirt_path';
    const west = this.tileAt(layer, x - 1, y) === 'dirt_path';
    const east = this.tileAt(layer, x + 1, y) === 'dirt_path';
    const connections = [north, south, west, east].filter(Boolean).length;
    if (connections >= 3) return 6;
    if (north && south && !west && !east) return 5;
    if (west && east && !north && !south) return 4;
    if (north && !south && !west && !east) return 8;
    if (!north && south && !west && !east) return 9;
    if (!north && !south && west && !east) return 10;
    if (!north && !south && !west && east) return 11;
    if (!north && !west && south && east) return 12;
    if (!north && !east && south && west) return 13;
    if (!south && !west && north && east) return 14;
    if (!south && !east && north && west) return 15;
    return 7;
  }

  private greenhollowFenceFrame(x: number, y: number, layer: TileLayerName) {
    const north = this.tileAt(layer, x, y - 1) === 'wood_fence';
    const south = this.tileAt(layer, x, y + 1) === 'wood_fence';
    const west = this.tileAt(layer, x - 1, y) === 'wood_fence';
    const east = this.tileAt(layer, x + 1, y) === 'wood_fence';
    if ((north || south) && !(west || east)) return 17;
    if ((north || south) && (west || east)) return 18;
    return 16;
  }

  private greenhollowRoofFrame(x: number, y: number, layer: TileLayerName) {
    const west = this.tileAt(layer, x - 1, y) === 'building_roof';
    const east = this.tileAt(layer, x + 1, y) === 'building_roof';
    if (!west && east) return 24;
    if (west && !east) return 22;
    return 23;
  }

  private overworldTileFrame(tileId: string, x: number, y: number, layer: TileLayerName) {
    if (this.engine.map.id !== 'overworld_main') return null;
    if (tileId === 'grass_plain') return 0;
    if (tileId === 'grass_variant') return 4;
    if (tileId === 'flower_grass') return 2;
    if (tileId === 'tall_grass') return 3;
    if (tileId === 'dirt_path') return this.overworldPathFrame(x, y, layer);
    if (tileId === 'water_deep') return this.overworldWaterFrame(x, y, layer);
    const frames: Record<string, number> = {
      water_shallow: 24,
      wood_bridge_horizontal: 31,
      mountain_wall: 40,
      cliff_face: 39,
      tree_canopy: 32,
      tree_trunk: 42,
      bush: 33,
      wood_fence: 44,
      town_marker: 37,
      cave_mouth: 38,
      save_crystal: 45,
      shop_sign: 36
    };
    return frames[tileId] ?? null;
  }

  private overworldTreeTexture(tileId: string) {
    if (this.engine.map.id !== 'overworld_main') return null;
    if (tileId === 'tree_trunk') return 'environment:overworld-tree-imagegen';
    return null;
  }

  private overworldBushTexture(tileId: string) {
    if (this.engine.map.id !== 'overworld_main') return null;
    if (tileId === 'bush') return 'environment:overworld-bush-imagegen';
    return null;
  }

  private isHiddenOverworldTreeTile(tileId: string) {
    return this.engine.map.id === 'overworld_main' && tileId === 'tree_canopy';
  }

  private overworldDetailFrame(tileId: string) {
    if (this.engine.map.id !== 'overworld_main') return null;
    const frames: Record<string, number> = {
      field_grass_detail: 0,
      field_flower_detail: 1,
      field_tall_grass_detail: 2,
      field_clover_detail: 3,
      field_dirt_scuff_detail: 4
    };
    return frames[tileId] ?? null;
  }

  private overworldPathFrame(x: number, y: number, layer: TileLayerName) {
    const north = this.tileAt(layer, x, y - 1) === 'dirt_path';
    const south = this.tileAt(layer, x, y + 1) === 'dirt_path';
    const west = this.tileAt(layer, x - 1, y) === 'dirt_path';
    const east = this.tileAt(layer, x + 1, y) === 'dirt_path';
    const mask = (north ? 1 : 0) | (east ? 2 : 0) | (south ? 4 : 0) | (west ? 8 : 0);
    const frames: Record<number, number> = {
      0: 8,
      1: 23,
      2: 21,
      3: 18,
      4: 15,
      5: 9,
      6: 16,
      7: 10,
      8: 20,
      9: 19,
      10: 8,
      11: 10,
      12: 17,
      13: 10,
      14: 10,
      15: 10
    };
    return frames[mask] ?? 8;
  }

  private overworldWaterFrame(x: number, y: number, layer: TileLayerName) {
    const water = (tile?: string) => tile === 'water_deep' || tile === 'water_shallow';
    const north = water(this.tileAt(layer, x, y - 1));
    const south = water(this.tileAt(layer, x, y + 1));
    const west = water(this.tileAt(layer, x - 1, y));
    const east = water(this.tileAt(layer, x + 1, y));
    const landNorth = !north;
    const landSouth = !south;
    const landWest = !west;
    const landEast = !east;
    if (landNorth && landWest) return 27;
    if (landNorth && landEast) return 29;
    if (landSouth && landWest) return 28;
    if (landSouth && landEast) return 30;
    if (landNorth) return 26;
    if (landSouth) return 26;
    if (landWest) return 30;
    if (landEast) return 29;
    return Math.abs((x * 13 + y * 7) % 5) === 0 ? 25 : 24;
  }

  private tileAt(layer: TileLayerName, x: number, y: number) {
    return this.engine.map.layers[layer][y]?.[x]?.id;
  }

  private updateSprites() {
    const p = this.engine.state.player;
    if (p.moving) {
      const animationKey = this.playerWalkAnimationKey(p.facing);
      const needsWalkAnimation =
        !this.playerVisualState.moving ||
        this.playerVisualState.facing !== p.facing ||
        this.playerVisualState.animationKey !== animationKey ||
        this.player.anims.currentAnim?.key !== animationKey ||
        !this.player.anims.isPlaying;
      if (needsWalkAnimation) this.player.play(animationKey, true);
      this.playerVisualState = { facing: p.facing, moving: true, animationKey };
    } else {
      const needsIdleFrame = this.playerVisualState.moving || this.playerVisualState.facing !== p.facing || this.player.texture.key !== 'player:overworld:idle';
      if (needsIdleFrame) {
        this.player.stop();
        this.setPlayerIdleFrame(p.facing);
        this.playerVisualState = { facing: p.facing, moving: false, animationKey: '' };
      }
    }
    this.player.setPosition(p.worldX, p.worldY + 16);
    this.player.setDepth(ACTOR_DEPTH + p.worldY / 1000);
    const liveEnemyIds = new Set(this.engine.runtimeEnemies.map((enemy) => enemy.id));
    for (const [id, sprite] of this.enemySprites) {
      if (!liveEnemyIds.has(id)) {
        sprite.destroy();
        this.enemySprites.delete(id);
      }
    }
    for (const enemy of this.engine.runtimeEnemies) {
      let sprite = this.enemySprites.get(enemy.id);
      if (!sprite) {
        sprite = this.add.image(enemy.worldX, enemy.worldY - 8, `enemy:${this.encounterLead(enemy)}`);
        this.enemySprites.set(enemy.id, sprite);
      }
      sprite.setPosition(enemy.worldX, enemy.worldY - 8);
      sprite.setDepth(enemy.worldY + 200);
      sprite.setAlpha(enemy.state === 'chasing' ? 1 : 0.88);
    }
  }

  private drawDebug() {
    this.debugGraphics.clear();
    if (!this.engine.debug) return;
    const map = this.engine.map;
    this.debugGraphics.lineStyle(1, 0xff5555, 0.4);
    for (let y = 0; y < map.height; y += 1) {
      for (let x = 0; x < map.width; x += 1) {
        const blocked = ['ground', 'lowerObject', 'upperObject'].some((layer) => {
          const placed = map.layers[layer as TileLayerName][y]?.[x];
          if (!placed) return false;
          const def = this.engine.map.layers[layer as TileLayerName][y]?.[x];
          return def && !this.textureWalkable(def.id);
        });
        if (blocked) this.debugGraphics.strokeRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }
    }
    this.debugGraphics.lineStyle(2, 0x55ccff, 0.7);
    for (const transition of map.transitions) {
      if (transition.trigger.type === 'bounds') {
        const b = transition.trigger.bounds;
        this.debugGraphics.strokeRect(b.x * TILE_SIZE, b.y * TILE_SIZE, b.width * TILE_SIZE, b.height * TILE_SIZE);
      }
    }
    this.debugGraphics.lineStyle(2, 0xffd05a, 0.45);
    for (const region of map.regions) {
      const b = region.bounds;
      this.debugGraphics.strokeRect(b.x * TILE_SIZE, b.y * TILE_SIZE, b.width * TILE_SIZE, b.height * TILE_SIZE);
    }
    this.debugGraphics.lineStyle(1, 0xff77ee, 0.55);
    for (const enemy of this.engine.runtimeEnemies) {
      this.debugGraphics.strokeCircle(enemy.home.x * TILE_SIZE + 16, enemy.home.y * TILE_SIZE + 16, enemy.roamingRadius * TILE_SIZE);
    }
  }

  private textureWalkable(tileId: string) {
    const definition = this.textures.exists(`tile:${tileId}`) ? this.engine.map : null;
    void definition;
    return ![
      'water_deep',
      'mountain_wall',
      'cliff_face',
      'tree_trunk',
      'bush',
      'building_wall',
      'building_wall_upper',
      'building_wall_upper_shadow',
      'building_roof',
      'wood_fence'
    ].includes(tileId);
  }

  private startBattleTransition() {
    this.transitioningToBattle = true;
    this.cameras.main.fadeOut(180, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.transitioningToBattle = false;
      this.scene.start('BattleScene');
    });
  }
}
