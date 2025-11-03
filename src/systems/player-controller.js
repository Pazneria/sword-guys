const KEY_TO_DIRECTION = Object.freeze({
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
});

const DIRECTION_VECTORS = Object.freeze({
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
});

const DEFAULT_PASSABLE_TILES = new Set(['grass', 'path', 'spawn']);

const clamp01 = (value) => {
  if (Number.isNaN(value) || !Number.isFinite(value)) {
    return 0;
  }

  if (value <= 0) {
    return 0;
  }

  if (value >= 1) {
    return 1;
  }

  return value;
};

export class PlayerController extends EventTarget {
  #animationFrame = null;

  #handleKeyDown = (event) => {
    const direction = KEY_TO_DIRECTION[event.code];
    if (!direction) {
      return;
    }

    event.preventDefault();

    if (!this.heldDirections.includes(direction)) {
      this.heldDirections.push(direction);
    }

    if (this.state === 'idle') {
      this.#attemptMove();
    }
  };

  #handleKeyUp = (event) => {
    const direction = KEY_TO_DIRECTION[event.code];
    if (!direction) {
      return;
    }

    const index = this.heldDirections.indexOf(direction);
    if (index !== -1) {
      this.heldDirections.splice(index, 1);
    }
  };

  constructor({
    layout,
    start,
    moveSpeed = 6,
    passableTiles = DEFAULT_PASSABLE_TILES,
  } = {}) {
    super();

    this.layout = layout ?? [];
    this.moveSpeed = moveSpeed;
    this.passableTiles = new Set(passableTiles);

    const { x = 0, y = 0 } = start ?? {};
    this.currentTile = { x, y };
    this.fromTile = { x, y };
    this.toTile = { x, y };
    this.progress = 0;
    this.state = 'idle';
    this.heldDirections = [];
    this.lastTimestamp = 0;
    this.started = false;
  }

  start() {
    if (this.started) {
      return;
    }

    this.started = true;
    this.lastTimestamp = performance.now();
    this.#emitInterpolation(this.currentTile, 0);
    this.#emitTileEnter(this.currentTile);

    window.addEventListener('keydown', this.#handleKeyDown);
    window.addEventListener('keyup', this.#handleKeyUp);

    this.#animationFrame = window.requestAnimationFrame(this.#tick);
  }

  destroy() {
    if (!this.started) {
      return;
    }

    this.started = false;
    window.removeEventListener('keydown', this.#handleKeyDown);
    window.removeEventListener('keyup', this.#handleKeyUp);

    if (this.#animationFrame !== null) {
      window.cancelAnimationFrame(this.#animationFrame);
      this.#animationFrame = null;
    }
  }

  setPosition(tile) {
    if (!tile) {
      return;
    }

    this.currentTile = { x: tile.x, y: tile.y };
    this.fromTile = { ...this.currentTile };
    this.toTile = { ...this.currentTile };
    this.progress = 0;
    this.state = 'idle';
    this.#emitInterpolation(this.currentTile, 0);
    this.#emitTileEnter(this.currentTile);
  }

  #tick = (timestamp) => {
    if (!this.started) {
      return;
    }

    const deltaMs = Math.max(0, timestamp - this.lastTimestamp);
    this.lastTimestamp = timestamp;

    if (this.state === 'moving') {
      const durationMs = 1000 / Math.max(0.0001, this.moveSpeed);
      this.progress += deltaMs / durationMs;

      const clampedProgress = clamp01(this.progress);
      const position = {
        x: this.fromTile.x + (this.toTile.x - this.fromTile.x) * clampedProgress,
        y: this.fromTile.y + (this.toTile.y - this.fromTile.y) * clampedProgress,
      };

      this.#emitInterpolation(position, clampedProgress);

      if (this.progress >= 1) {
        this.currentTile = { ...this.toTile };
        this.fromTile = { ...this.currentTile };
        this.progress = 0;
        this.state = 'idle';
        this.#emitTileEnter(this.currentTile);
        this.#attemptMove();
      }
    } else {
      this.#attemptMove();
    }

    this.#animationFrame = window.requestAnimationFrame(this.#tick);
  };

  #attemptMove() {
    if (this.state !== 'idle') {
      return false;
    }

    const direction = this.#getCurrentDirection();
    if (!direction) {
      return false;
    }

    const delta = DIRECTION_VECTORS[direction];
    if (!delta) {
      return false;
    }

    const nextTile = {
      x: this.currentTile.x + delta.x,
      y: this.currentTile.y + delta.y,
    };

    if (!this.#isTilePassable(nextTile.x, nextTile.y)) {
      return false;
    }

    this.fromTile = { ...this.currentTile };
    this.toTile = nextTile;
    this.progress = 0;
    this.state = 'moving';
    this.#emitTilePreview(nextTile);
    return true;
  }

  #getCurrentDirection() {
    if (this.heldDirections.length === 0) {
      return null;
    }

    return this.heldDirections[this.heldDirections.length - 1];
  }

  #isTilePassable(x, y) {
    const row = this.layout?.[y];
    if (!row) {
      return false;
    }

    const tile = row[x];
    if (!tile) {
      return false;
    }

    if (this.passableTiles.size === 0) {
      return true;
    }

    return this.passableTiles.has(tile);
  }

  #emitInterpolation(position, progress) {
    const detail = {
      position: { x: position.x, y: position.y },
      from: { ...this.fromTile },
      to: { ...this.toTile },
      progress: clamp01(progress),
      tile: {
        x: Math.round(position.x),
        y: Math.round(position.y),
      },
    };

    this.dispatchEvent(new CustomEvent('interpolate', { detail }));
  }

  #emitTileEnter(tile) {
    this.dispatchEvent(
      new CustomEvent('tileenter', {
        detail: {
          tile: { x: tile.x, y: tile.y },
        },
      }),
    );
  }

  #emitTilePreview(tile) {
    this.dispatchEvent(
      new CustomEvent('tilepreview', {
        detail: {
          tile: { x: tile.x, y: tile.y },
        },
      }),
    );
  }
}
