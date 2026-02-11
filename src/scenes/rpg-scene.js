/**
 * RPGScene - Main gameplay scene with tile-based movement, NPCs, combat, etc.
 */

import { TileMapRenderer } from '../systems/tile-map-renderer.js';
import { Player, NPC } from '../entities/entity.js';
import { getMap } from '../data/maps.js';
import { DialogueSystem } from '../systems/dialogue-system.js';
import { DialogueScene } from './dialogue-scene.js';
import { BattleSystem, BATTLE_STATES } from '../systems/battle-system.js';
import { BattleScene } from './battle-scene.js';
import { ShopSystem } from '../systems/shop-system.js';
import { MenuScene } from './menu-scene.js';
import { GameHUD } from '../ui/components/game-hud.js';
import { getRandomEnemy } from '../data/enemies.js';

export class RPGScene {
  #root;
  #container;
  #canvas;
  #renderer;
  #gameState;
  #saveManager;
  #player;
  #npcs;
  #currentMap;
  #dialogueSystem;
  #shopSystem;
  #keyState;
  #moveTimer;
  #lastUpdateTime;
  #animationFrame;
  #hud;
  #activeOverlay;
  #stepCount;
  #keydownHandler;
  #keyupHandler;

  constructor(root, options = {}) {
    this.#root = root;
    this.#gameState = options.gameState;
    this.#saveManager = options.saveManager;
    this.#container = null;
    this.#canvas = null;
    this.#renderer = null;
    this.#player = null;
    this.#npcs = [];
    this.#currentMap = null;
    this.#dialogueSystem = new DialogueSystem();
    this.#shopSystem = new ShopSystem(this.#gameState);
    this.#keyState = {};
    this.#moveTimer = 0;
    this.#lastUpdateTime = 0;
    this.#animationFrame = null;
    this.#hud = null;
    this.#activeOverlay = null;
    this.#stepCount = 0;

    this.startMapId = options.startMapId || 'overworld';
  }

  mount() {
    // Create container
    this.#container = document.createElement('div');
    this.#container.className = 'rpg-scene';
    this.#container.innerHTML = `
      <div class="rpg-game-area">
        <canvas id="rpg-canvas"></canvas>
      </div>
    `;
    this.#root.replaceChildren(this.#container);

    // Get canvas
    this.#canvas = this.#container.querySelector('#rpg-canvas');

    // Create renderer
    this.#renderer = new TileMapRenderer(this.#canvas, {
      scale: 2,
      viewportWidth: 32,
      viewportHeight: 18,
      cameraSmoothing: 0.15
    });

    // Create HUD
    this.#hud = new GameHUD(this.#gameState);
    this.#hud.mount(this.#container);

    // Load initial map
    this.loadMap(this.startMapId);

    // Setup keyboard controls
    this.#setupControls();

    // Start game loop
    this.#lastUpdateTime = performance.now();
    this.#gameLoop();
  }

  loadMap(mapId, spawnPoint = null) {
    const mapData = getMap(mapId);
    if (!mapData) {
      console.error(`Map not found: ${mapId}`);
      return;
    }

    this.#currentMap = mapData;
    this.#renderer.setMap(mapData);

    // Create player if not exists
    if (!this.#player) {
      const spawn = spawnPoint || mapData.spawns.default;
      this.#player = new Player(spawn.x, spawn.y, this.#gameState);
    } else if (spawnPoint) {
      this.#player.moveTo(spawnPoint.x, spawnPoint.y);
    }

    // Center camera on player
    this.#renderer.centerCameraOn(this.#player.x, this.#player.y, true);

    // Load NPCs
    this.#npcs = [];
    if (mapData.npcs) {
      mapData.npcs.forEach(npcData => {
        const npc = new NPC(npcData.x, npcData.y, npcData);
        this.#npcs.push(npc);
      });
    }

    // Reset step counter for random encounters
    this.#stepCount = 0;
  }

  #setupControls() {
    this.#keydownHandler = (e) => {
      this.#keyState[e.key] = true;

      // Menu toggle
      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        this.#openMenu();
      }

      // Interaction
      if (e.key === ' ' || e.key === 'z' || e.key === 'Enter') {
        e.preventDefault();
        this.#interact();
      }
    };

    this.#keyupHandler = (e) => {
      this.#keyState[e.key] = false;
    };

    document.addEventListener('keydown', this.#keydownHandler);
    document.addEventListener('keyup', this.#keyupHandler);
  }

  #gameLoop() {
    const currentTime = performance.now();
    const deltaTime = (currentTime - this.#lastUpdateTime) / 1000;
    this.#lastUpdateTime = currentTime;

    this.#update(deltaTime);
    this.#render();

    this.#animationFrame = requestAnimationFrame(() => this.#gameLoop());
  }

  #update(deltaTime) {
    // Don't update if overlay is active
    if (this.#activeOverlay) return;

    // Update player
    this.#player.update(deltaTime);

    // Handle movement input
    if (!this.#player.isMoving() && !this.#dialogueSystem.isActive()) {
      this.#moveTimer -= deltaTime;

      if (this.#moveTimer <= 0) {
        const moved = this.#handleMovementInput();
        if (moved) {
          this.#moveTimer = 0.15; // Delay between moves
          this.#onPlayerMoved();
        }
      }
    }

    // Update camera to follow player
    const displayPos = this.#player.getDisplayPosition();
    this.#renderer.centerCameraOn(displayPos.x, displayPos.y);
  }

  #handleMovementInput() {
    let dx = 0;
    let dy = 0;

    if (this.#keyState['ArrowUp'] || this.#keyState['w'] || this.#keyState['W']) dy = -1;
    if (this.#keyState['ArrowDown'] || this.#keyState['s'] || this.#keyState['S']) dy = 1;
    if (this.#keyState['ArrowLeft'] || this.#keyState['a'] || this.#keyState['A']) dx = -1;
    if (this.#keyState['ArrowRight'] || this.#keyState['d'] || this.#keyState['D']) dx = 1;

    if (dx === 0 && dy === 0) return false;

    const targetX = this.#player.x + dx;
    const targetY = this.#player.y + dy;

    // Set player direction
    if (dy < 0) this.#player.setDirection('up');
    else if (dy > 0) this.#player.setDirection('down');
    else if (dx < 0) this.#player.setDirection('left');
    else if (dx > 0) this.#player.setDirection('right');

    // Check if tile is passable
    if (!this.#renderer.isPassable(targetX, targetY)) {
      return false;
    }

    // Check for NPC collision
    const npcAtTarget = this.#npcs.find(npc => npc.x === targetX && npc.y === targetY);
    if (npcAtTarget) {
      return false;
    }

    // Move player
    this.#player.startMove(targetX, targetY);

    return true;
  }

  #onPlayerMoved() {
    this.#stepCount++;

    // Check for map transitions
    this.#checkTransitions();

    // Check for random encounters
    this.#checkRandomEncounter();
  }

  #checkTransitions() {
    if (!this.#currentMap.transitions) return;

    const transition = this.#currentMap.transitions.find(
      t => t.x === this.#player.x && t.y === this.#player.y
    );

    if (transition) {
      // Load new map
      this.loadMap(transition.targetMap, {
        x: transition.targetX,
        y: transition.targetY
      });
    }
  }

  #checkRandomEncounter() {
    if (!this.#currentMap.encounters || this.#currentMap.encounters.length === 0) {
      return;
    }

    const encounterRate = this.#currentMap.encounterRate || 0;
    if (Math.random() < encounterRate) {
      this.#startBattle();
    }
  }

  #interact() {
    // Don't interact if already in dialogue or overlay is active
    if (this.#dialogueSystem.isActive() || this.#activeOverlay) return;

    // Check for NPC in front of player
    const dx = this.#player.direction === 'left' ? -1 : this.#player.direction === 'right' ? 1 : 0;
    const dy = this.#player.direction === 'up' ? -1 : this.#player.direction === 'down' ? 1 : 0;

    const targetX = this.#player.x + dx;
    const targetY = this.#player.y + dy;

    const npc = this.#npcs.find(n => n.x === targetX && n.y === targetY);

    if (npc) {
      // Check if NPC has a shop
      if (npc.hasShop()) {
        this.#openShop(npc);
      } else {
        // Start dialogue
        this.#startDialogue(npc);
      }
    }
  }

  #startDialogue(npc) {
    this.#dialogueSystem.startDialogue(npc);

    const dialogueScene = new DialogueScene(this.#dialogueSystem, () => {
      this.#activeOverlay = null;
      this.#dialogueSystem.end();
    });

    this.#activeOverlay = dialogueScene;
    dialogueScene.mount(this.#container);
  }

  #openShop(npc) {
    // TODO: Implement shop UI
    console.log('Shop opened!', npc.name);
  }

  #startBattle() {
    const enemy = getRandomEnemy(this.#currentMap.encounters);
    if (!enemy) return;

    const battleSystem = new BattleSystem(this.#gameState, enemy);

    const battleScene = new BattleScene(battleSystem, this.#gameState, (result) => {
      this.#activeOverlay = null;

      // Handle battle result
      if (result === BATTLE_STATES.DEFEAT) {
        // Game over - respawn at starting area
        this.loadMap('overworld');
        // Restore some health
        const stats = this.#gameState.getPlayerStats();
        this.#gameState.updatePlayerStats({
          health: Math.floor(stats.maxHealth * 0.5)
        });
      }
    });

    this.#activeOverlay = battleScene;
    battleScene.mount(this.#container);
  }

  #openMenu() {
    if (this.#activeOverlay) return;

    const menuScene = new MenuScene(this.#gameState, () => {
      this.#activeOverlay = null;
    });

    this.#activeOverlay = menuScene;
    menuScene.mount(this.#container);
  }

  #render() {
    if (!this.#renderer) return;

    // Render map and entities
    const entities = [this.#player, ...this.#npcs];
    this.#renderer.render(entities);
  }

  unmount() {
    // Stop game loop
    if (this.#animationFrame) {
      cancelAnimationFrame(this.#animationFrame);
      this.#animationFrame = null;
    }

    // Remove event listeners
    if (this.#keydownHandler) {
      document.removeEventListener('keydown', this.#keydownHandler);
      this.#keydownHandler = null;
    }

    if (this.#keyupHandler) {
      document.removeEventListener('keyup', this.#keyupHandler);
      this.#keyupHandler = null;
    }

    // Clean up overlay
    if (this.#activeOverlay) {
      this.#activeOverlay.unmount();
      this.#activeOverlay = null;
    }

    // Clean up HUD
    if (this.#hud) {
      this.#hud.unmount();
      this.#hud = null;
    }

    // Clean up renderer
    if (this.#renderer) {
      this.#renderer.destroy();
      this.#renderer = null;
    }

    // Remove container
    if (this.#container && this.#container.parentElement) {
      this.#container.parentElement.removeChild(this.#container);
    }
    this.#container = null;
  }
}
