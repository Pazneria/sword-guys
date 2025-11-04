import { STARTING_AREA_CONFIG } from '../config/starting-area.js';
import { GameState } from '../core/game-state.js';
import { CanvasTileMap } from '../systems/canvas-tile-map.js';
import { PlayerController } from '../systems/player-controller.js';
import { GameMenu } from '../ui/components/game-menu.js';

export class StartingAreaScene {
  #handleControllerInterpolate = (event) => {
    const position = event?.detail?.position;
    if (!position || !this.map) {
      return;
    }

    if (this.followDuringInterpolation) {
      this.map.setCameraTarget(position, { redraw: false });
    }

    this.map.setPlayerPosition(position);
  };

  #handleControllerTileEnter = (event) => {
    const tile = event?.detail?.tile;
    if (!tile || !this.map) {
      return;
    }

    const redraw = !this.followDuringInterpolation;
    this.map.setCameraTarget(tile, { redraw });
  };

  #handleGlobalKeyDown = (event) => {
    if (!event || typeof event.key !== 'string' || !this.gameMenu) {
      return;
    }

    const key = event.key.toLowerCase();

    if (key === 'e') {
      if (typeof event.preventDefault === 'function') {
        event.preventDefault();
      }
      this.#toggleMenuVisibility();
    } else if (key === 'escape' || key === 'esc') {
      if (this.gameMenu.isVisible()) {
        if (typeof event.preventDefault === 'function') {
          event.preventDefault();
        }
        this.#toggleMenuVisibility(false);
      }
    }
  };

  constructor(
    root,
    {
      config = STARTING_AREA_CONFIG,
      onExit,
      gameState = GameState.getInstance(),
      document: providedDocument,
      window: providedWindow,
      saveManager,
      factories = {},
    } = {},
  ) {
    this.root = root;
    this.config = config;
    this.onExit = onExit;
    this.document =
      providedDocument ??
      (typeof globalThis.document !== 'undefined' ? globalThis.document : null);
    this.window =
      providedWindow ??
      (typeof globalThis.window !== 'undefined' ? globalThis.window : null);
    this.container = null;
    this.map = null;
    this.playerController = null;
    this.gameState = gameState;
    this.playerState = this.gameState.getPlayerState();
    this.playerControllerActive = false;
    this.playerPausedForMenu = false;
    this.playerStartPosition = null;
    this.followDuringInterpolation = false;
    this.unsubscribeFromGameState = null;
    this.gameMenu = null;
    this.saveManager = saveManager ?? null;
    this.saveElements = { slotSelect: null, message: null, button: null };
    this.saveMessageTimer = null;
    this.lastSelectedSlot = null;

    const defaultFactories = {
      createMap: (canvas) => this.#createMap(canvas),
      createPlayerController: (spawnPosition) =>
        this.#createPlayerController(spawnPosition),
    };

    const providedFactories = typeof factories === 'object' && factories !== null ? factories : {};

    this.factories = {
      createMap:
        typeof providedFactories.createMap === 'function'
          ? providedFactories.createMap
          : defaultFactories.createMap,
      createPlayerController:
        typeof providedFactories.createPlayerController === 'function'
          ? providedFactories.createPlayerController
          : defaultFactories.createPlayerController,
    };
  }

  mount() {
    this.container = this.#createView();
    this.root.replaceChildren(this.container);

    GameState.setScene('starting-area');
    const storedPosition = GameState.getPlayerPosition();
    if (storedPosition) {
      this.playerStartPosition = { ...storedPosition };
    } else {
      this.playerStartPosition = { ...this.config.spawn };
      GameState.updatePlayerPosition(this.playerStartPosition);
    }

    const canvas = this.container.querySelector('.starting-area__canvas');
    this.map = this.factories.createMap(canvas, {
      scene: this,
      config: this.config,
    });
    const followSmoothing = Number(this.map?.followSmoothing ?? 0);
    this.followDuringInterpolation = Number.isFinite(followSmoothing) && followSmoothing > 0;
    const spawn = this.#resolveSpawnPoint();
    this.map?.setCameraTarget?.(spawn);
    this.map?.setPlayerPosition?.(spawn);
    this.map?.start?.();

    this.playerState.setLastKnownLocation(spawn);

    this.playerController = this.factories.createPlayerController(spawn, {
      scene: this,
      config: this.config,
      map: this.map,
    });
    this.#startPlayerController();

    this.#applyInitialSettings();
    this.#subscribeToGameState();

    if (this.window && typeof this.window.addEventListener === 'function') {
      this.window.addEventListener('keydown', this.#handleGlobalKeyDown);
    }

    if (this.gameState) {
      this.gameMenu = new GameMenu(this.container, {
        gameState: this.gameState,
        document: this.document,
        onClose: () => this.#toggleMenuVisibility(false),
        onExit: this.onExit,
      });
      this.gameMenu.mount();
    }
  }

  unmount() {
    if (typeof this.unsubscribeFromGameState === 'function') {
      this.unsubscribeFromGameState();
    }
    this.unsubscribeFromGameState = null;

    if (this.window && typeof this.window.removeEventListener === 'function') {
      this.window.removeEventListener('keydown', this.#handleGlobalKeyDown);
    }

    if (this.gameMenu) {
      this.gameMenu.destroy();
      this.gameMenu = null;
    }

    this.#stopPlayerController();
    this.playerController = null;
    this.playerControllerActive = false;
    this.playerPausedForMenu = false;

    if (this.map && typeof this.map.destroy === 'function') {
      this.map.destroy();
    }
    this.map = null;

    if (this.container?.isConnected) {
      this.container.remove();
    }

    this.container = null;
    this.followDuringInterpolation = false;
  }

  #startPlayerController() {
    if (
      this.playerController &&
      typeof this.playerController.start === 'function' &&
      !this.playerControllerActive
    ) {
      this.playerController.start();
      this.playerControllerActive = true;
    }
  }

  #stopPlayerController() {
    if (
      this.playerController &&
      typeof this.playerController.stop === 'function' &&
      this.playerControllerActive
    ) {
      this.playerController.stop();
      this.playerControllerActive = false;
    }
  }

  #pausePlayerForMenu() {
    if (!this.playerPausedForMenu) {
      this.#stopPlayerController();
      this.playerPausedForMenu = true;
    }
  }

  #resumePlayerAfterMenu() {
    if (this.playerPausedForMenu) {
      this.#startPlayerController();
      this.playerPausedForMenu = false;
    }
  }

  #toggleMenuVisibility(force) {
    if (!this.gameMenu) {
      return false;
    }

    const shouldShow =
      typeof force === 'boolean' ? force : this.gameMenu.isVisible() ? false : true;

    if (shouldShow) {
      this.gameMenu.show();
      this.#pausePlayerForMenu();
    } else {
      this.gameMenu.hide();
      this.#resumePlayerAfterMenu();
    }

    return shouldShow;
  }

  #applyInitialSettings() {
    if (!this.playerController) {
      return;
    }

    const settings = this.playerState?.getSettings?.()
      ?? this.gameState?.getSettings?.();
    const movementBindings = settings?.keybindings?.movement;
    if (movementBindings) {
      this.playerController.setKeyBindings(movementBindings);
    }
  }

  #subscribeToGameState() {
    if (!this.playerController) {
      return;
    }

    if (this.playerState && typeof this.playerState.subscribe === 'function') {
      this.unsubscribeFromGameState = this.playerState.subscribe(
        'settings',
        (detail) => {
          const movementBindings = detail?.settings?.keybindings?.movement;
          if (movementBindings) {
            this.playerController.setKeyBindings(movementBindings);
          }
        },
      );
    }
  }

  getSpawnPoint() {
    return this.config.spawn;
  }

  #createMap(canvas) {
    const { layout, tileSize, tiles } = this.config;

    const drawTile = (ctx, tile, x, y, size) => {
      const drawGrassBase = () => {
        ctx.fillStyle = '#2f6d3c';
        ctx.fillRect(x, y, size, size);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.fillRect(x, y, size, size * 0.35);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.fillRect(x, y + size * 0.65, size, size * 0.35);
      };

      switch (tile) {
        case tiles.GRASS:
          drawGrassBase();
          break;
        case tiles.TREE:
          drawGrassBase();
          ctx.fillStyle = '#1a5d33';
          ctx.beginPath();
          ctx.ellipse(x + size * 0.5, y + size * 0.42, size * 0.32, size * 0.28, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#0f3d20';
          ctx.beginPath();
          ctx.ellipse(x + size * 0.5, y + size * 0.35, size * 0.22, size * 0.2, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#5b3b1a';
          ctx.fillRect(x + size * 0.46, y + size * 0.55, size * 0.08, size * 0.35);
          break;
        case tiles.WATER:
          ctx.fillStyle = '#1e3f8f';
          ctx.fillRect(x, y, size, size);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
          ctx.beginPath();
          ctx.ellipse(x + size * 0.5, y + size * 0.42, size * 0.35, size * 0.18, 0, 0, Math.PI * 2);
          ctx.fill();
          break;
        case tiles.ROCK:
          drawGrassBase();
          ctx.fillStyle = '#7a7f8c';
          ctx.beginPath();
          ctx.moveTo(x + size * 0.2, y + size * 0.65);
          ctx.lineTo(x + size * 0.35, y + size * 0.35);
          ctx.lineTo(x + size * 0.65, y + size * 0.28);
          ctx.lineTo(x + size * 0.78, y + size * 0.55);
          ctx.lineTo(x + size * 0.62, y + size * 0.7);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
          ctx.beginPath();
          ctx.arc(x + size * 0.52, y + size * 0.45, size * 0.12, 0, Math.PI * 2);
          ctx.fill();
          break;
        case tiles.PATH:
          ctx.fillStyle = '#c4a262';
          ctx.fillRect(x, y, size, size);
          ctx.fillStyle = '#a5854c';
          ctx.fillRect(x, y + size * 0.6, size, size * 0.4);
          break;
        case tiles.SPAWN:
          drawGrassBase();
          ctx.strokeStyle = '#fbd27b';
          ctx.lineWidth = Math.max(2, size * 0.12);
          ctx.setLineDash([size * 0.25, size * 0.15]);
          ctx.strokeRect(x + size * 0.1, y + size * 0.1, size * 0.8, size * 0.8);
          ctx.setLineDash([]);
          break;
        default:
          ctx.fillStyle = '#1b102d';
          ctx.fillRect(x, y, size, size);
          break;
      }
    };

    return new CanvasTileMap(canvas, {
      layout,
      tileSize,
      drawTile,
      backgroundColor: '#120721',
      followSmoothing: 0.2,
      preloadTiles: { columns: 2, rows: 2 },
    });
  }

  #createPlayerController(spawnPosition) {
    const movementSpeed = 6; // tiles per second
    const blockedTiles = new Set([
      this.config.tiles.TREE,
      this.config.tiles.WATER,
      this.config.tiles.ROCK,
    ]);

    const settings = this.gameState?.getSettings?.();
    const initialMovementBindings = settings?.keybindings?.movement;

    const isTilePassable = ({ x, y }) => {
      const row = this.config.layout[y];
      if (!row) {
        return false;
      }

      const tile = row[x];
      if (tile == null) {
        return false;
      }

      return !blockedTiles.has(tile);
    };

    const canMoveTo = (target, _directionName, from) => {
      if (!target || !isTilePassable(target)) {
        return false;
      }

      const origin = from ?? this.playerController?.tilePosition ?? null;

      if (origin) {
        const deltaX = target.x - origin.x;
        const deltaY = target.y - origin.y;

        if (Math.abs(deltaX) === 1 && Math.abs(deltaY) === 1) {
          const horizontal = { x: origin.x + deltaX, y: origin.y };
          const vertical = { x: origin.x, y: origin.y + deltaY };

          if (!isTilePassable(horizontal) || !isTilePassable(vertical)) {
            return false;
          }
        }
      }

      return true;
    };

    const initialPosition = spawnPosition ?? this.config.spawn;

    return new PlayerController({
      position: initialPosition,
      speed: movementSpeed,
      canMoveTo,
      keyBindings: initialMovementBindings,
      onPositionChange: (position) => {
        if (!this.map) {
          return;
        }

        const nextPosition = { ...position };
        this.map.setPlayerPosition(nextPosition);

        if (this.followDuringInterpolation) {
          this.map.setCameraTarget({ ...position }, { redraw: false });
        }
      },
      onStep: (tilePosition) => {
        if (!this.map) {
          return;
        }

        const nextPosition = { ...tilePosition };
        this.map.setPlayerPosition(nextPosition);
        GameState.updatePlayerPosition(nextPosition);

        const redraw = !this.followDuringInterpolation;
        this.map.setCameraTarget({ ...tilePosition }, { redraw });

        this.playerState.setLastKnownLocation(nextPosition);
      },
    });
  }

  #resolveSpawnPoint() {
    const lastKnown = this.playerState?.getLastKnownLocation?.();

    if (
      lastKnown &&
      Number.isFinite(lastKnown.x) &&
      Number.isFinite(lastKnown.y)
    ) {
      return { x: lastKnown.x, y: lastKnown.y };
    }

    return { ...this.config.spawn };
  }

  #createView() {
    const doc =
      this.document ?? (typeof document !== 'undefined' ? document : null);

    if (!doc) {
      throw new Error('StartingAreaScene requires a document to render.');
    }

    const container = doc.createElement('div');
    container.className = 'starting-area scene';

    const canvas = doc.createElement('canvas');
    canvas.className = 'starting-area__canvas';
    container.append(canvas);

    const overlay = doc.createElement('div');
    overlay.className = 'starting-area__overlay';

    const heading = doc.createElement('h2');
    heading.className = 'starting-area__title';
    heading.textContent = 'Starting Area';

    overlay.append(heading);

    if (this.saveManager) {
      overlay.append(this.#createSaveMenu());
    }

    if (typeof this.onExit === 'function') {
      const controls = doc.createElement('div');
      controls.className = 'starting-area__controls';

      const exitButton = doc.createElement('button');
      exitButton.type = 'button';
      exitButton.className = 'starting-area__button';
      exitButton.textContent = 'Return to Title';
      exitButton.addEventListener('click', () => {
        this.onExit();
      });

      controls.append(exitButton);
      overlay.append(controls);
    }

    container.append(overlay);
    return container;
  }

  #createSaveMenu() {
    const menu = document.createElement('div');
    menu.className = 'starting-area__menu';

    const slotField = document.createElement('div');
    slotField.className = 'starting-area__menu-field';

    const slotLabel = document.createElement('label');
    slotLabel.className = 'starting-area__label';
    slotLabel.textContent = 'Save Slot';
    slotLabel.htmlFor = 'starting-area-save-slot';

    const slotSelect = document.createElement('select');
    slotSelect.className = 'starting-area__select';
    slotSelect.id = 'starting-area-save-slot';

    const slots = this.#buildSlotList();
    slots.forEach((slotId) => {
      const option = document.createElement('option');
      option.value = slotId;
      option.textContent = this.#formatSlotLabel(slotId);
      slotSelect.append(option);
    });

    const defaultSlot = slots.includes(this.lastSelectedSlot) ? this.lastSelectedSlot : slots[0];
    slotSelect.value = defaultSlot;
    this.lastSelectedSlot = defaultSlot;

    slotField.append(slotLabel, slotSelect);

    const saveButton = document.createElement('button');
    saveButton.type = 'button';
    saveButton.className = 'starting-area__button starting-area__button--save';
    saveButton.textContent = 'Save Game';
    saveButton.addEventListener('click', () => {
      this.#handleSaveCommand();
    });

    const message = document.createElement('p');
    message.className = 'starting-area__message';

    menu.append(slotField, saveButton, message);

    this.saveElements = {
      slotSelect,
      message,
      button: saveButton,
    };

    return menu;
  }

  #buildSlotList() {
    const defaultSlots = ['slot-1', 'slot-2', 'slot-3'];
    const slotSet = new Set(defaultSlots);

    if (this.saveManager) {
      try {
        this.saveManager.listSlots().forEach((slot) => {
          if (slot?.slotId) {
            slotSet.add(slot.slotId);
          }
        });
      } catch (error) {
        console.error('Failed to populate save slot list', error);
      }
    }

    return Array.from(slotSet).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }

  #handleSaveCommand() {
    if (!this.saveManager || !this.saveElements.slotSelect) {
      return;
    }

    const slotId = this.saveElements.slotSelect.value;
    this.lastSelectedSlot = slotId;

    try {
      const result = this.saveManager.save(slotId, GameState.snapshot());
      const updatedAt = result?.metadata?.updatedAt ? new Date(result.metadata.updatedAt) : null;
      const formattedTime = updatedAt ? updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
      const message = formattedTime
        ? `Saved to ${this.#formatSlotLabel(slotId)} at ${formattedTime}.`
        : `Saved to ${this.#formatSlotLabel(slotId)}.`;
      this.#showSaveMessage(message, 'success');
    } catch (error) {
      console.error('Failed to save game', error);
      const message = error instanceof Error ? error.message : 'Unknown error occurred while saving.';
      this.#showSaveMessage(`Save failed: ${message}`, 'error');
    }
  }

  #showSaveMessage(text, state) {
    if (!this.saveElements.message) {
      return;
    }

    this.saveElements.message.textContent = text;
    this.saveElements.message.classList.remove(
      'starting-area__message--success',
      'starting-area__message--error',
    );

    if (state === 'success') {
      this.saveElements.message.classList.add('starting-area__message--success');
    } else if (state === 'error') {
      this.saveElements.message.classList.add('starting-area__message--error');
    }

    if (this.saveMessageTimer) {
      clearTimeout(this.saveMessageTimer);
    }

    this.saveMessageTimer = setTimeout(() => {
      if (this.saveElements.message) {
        this.saveElements.message.textContent = '';
        this.saveElements.message.classList.remove(
          'starting-area__message--success',
          'starting-area__message--error',
        );
      }
      this.saveMessageTimer = null;
    }, 4000);
  }

  #formatSlotLabel(slotId) {
    if (typeof slotId !== 'string') {
      return 'Slot';
    }

    const match = /slot-(\d+)/i.exec(slotId);
    if (match) {
      return `Slot ${match[1]}`;
    }

    return slotId;
  }
}
