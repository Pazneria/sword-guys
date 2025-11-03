import { STARTING_AREA_CONFIG } from '../config/starting-area.js';
import { CanvasTileMap } from '../systems/canvas-tile-map.js';
import { PlayerController } from '../systems/player-controller.js';

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

  constructor(root, { config = STARTING_AREA_CONFIG, onExit } = {}) {
    this.root = root;
    this.config = config;
    this.onExit = onExit;
    this.container = null;
    this.map = null;
    this.playerController = null;
  }

  mount() {
    this.container = this.#createView();
    this.root.replaceChildren(this.container);

    const canvas = this.container.querySelector('.starting-area__canvas');
    this.map = this.#createMap(canvas);
    this.followDuringInterpolation = this.map.followSmoothing > 0;
    this.map.setCameraTarget(this.config.spawn);
    this.map.setPlayerPosition(this.config.spawn);
    this.map.start();

    this.playerController = this.#createPlayerController();
    this.playerController.start();
  }

  unmount() {
    if (this.playerController) {
      this.playerController.stop();
      this.playerController = null;
    }

    if (this.map) {
      this.map.destroy();
      this.map = null;
    }

    if (this.container?.isConnected) {
      this.container.remove();
    }

    this.container = null;
    this.followDuringInterpolation = false;
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

  #createPlayerController() {
    const movementSpeed = 6; // tiles per second
    const blockedTiles = new Set([
      this.config.tiles.TREE,
      this.config.tiles.WATER,
      this.config.tiles.ROCK,
    ]);

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

    return new PlayerController({
      position: this.config.spawn,
      speed: movementSpeed,
      canMoveTo,
      onPositionChange: (position) => {
        this.map?.setPlayerPosition({ ...position });
      },
      onStep: (tilePosition) => {
        this.map?.setPlayerPosition({ ...tilePosition });
        this.map?.setCameraTarget({ ...tilePosition });
      },
    });
  }

  #createView() {
    const container = document.createElement('div');
    container.className = 'starting-area scene';

    const canvas = document.createElement('canvas');
    canvas.className = 'starting-area__canvas';
    container.append(canvas);

    const overlay = document.createElement('div');
    overlay.className = 'starting-area__overlay';

    const heading = document.createElement('h2');
    heading.className = 'starting-area__title';
    heading.textContent = 'Starting Area';

    overlay.append(heading);

    if (typeof this.onExit === 'function') {
      const controls = document.createElement('div');
      controls.className = 'starting-area__controls';

      const exitButton = document.createElement('button');
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
}
