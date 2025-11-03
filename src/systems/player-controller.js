const DIRECTIONS = Object.freeze({
  up: { x: 0, y: -1, keys: ['ArrowUp', 'w', 'W'] },
  down: { x: 0, y: 1, keys: ['ArrowDown', 's', 'S'] },
  left: { x: -1, y: 0, keys: ['ArrowLeft', 'a', 'A'] },
  right: { x: 1, y: 0, keys: ['ArrowRight', 'd', 'D'] },
});

const DEFAULT_SPEED_TILES_PER_SECOND = 6;

const now = () =>
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();

const createTicker = (providedTicker) => {
  if (providedTicker) {
    return providedTicker;
  }

  if (typeof window !== 'undefined') {
    return {
      request: (callback) => window.requestAnimationFrame(callback),
      cancel: (handle) => window.cancelAnimationFrame(handle),
    };
  }

  return {
    request: (callback) => setTimeout(() => callback(now()), 16),
    cancel: (handle) => clearTimeout(handle),
  };
};

const buildKeyDirectionMap = () => {
  const entries = [];

  Object.entries(DIRECTIONS).forEach(([name, value]) => {
    value.keys.forEach((key) => {
      entries.push([key, name]);
    });
  });

  return new Map(entries);
};

export class PlayerController {
  #ticker;

  #pressedDirections;

  #directionQueue;

  #currentMove;

  #rafHandle;

  #lastTickTime;

  #keyDirectionMap;

  constructor({
    position = { x: 0, y: 0 },
    speed = DEFAULT_SPEED_TILES_PER_SECOND,
    ticker,
    onMoveStart,
    onPositionChange,
    onStep,
    onMoveComplete,
    canMoveTo,
  } = {}) {
    this.tilePosition = {
      x: position?.x ?? 0,
      y: position?.y ?? 0,
    };

    this.position = {
      x: position?.x ?? 0,
      y: position?.y ?? 0,
    };

    this.speed = Math.max(0.1, speed ?? DEFAULT_SPEED_TILES_PER_SECOND);
    this.moveDuration = 1000 / this.speed;

    this.callbacks = {
      onMoveStart: typeof onMoveStart === 'function' ? onMoveStart : null,
      onPositionChange: typeof onPositionChange === 'function' ? onPositionChange : null,
      onStep: typeof onStep === 'function' ? onStep : null,
      onMoveComplete: typeof onMoveComplete === 'function' ? onMoveComplete : null,
    };

    this.canMoveTo = typeof canMoveTo === 'function' ? canMoveTo : null;

    this.#ticker = createTicker(ticker);
    this.#pressedDirections = new Set();
    this.#directionQueue = [];
    this.#currentMove = null;
    this.#rafHandle = null;
    this.#lastTickTime = null;
    this.#keyDirectionMap = buildKeyDirectionMap();

    this.#handleKeyDown = this.#handleKeyDown.bind(this);
    this.#handleKeyUp = this.#handleKeyUp.bind(this);
    this.#tick = this.#tick.bind(this);
  }

  start() {
    if (this.#rafHandle !== null) {
      return;
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this.#handleKeyDown);
      window.addEventListener('keyup', this.#handleKeyUp);
    }

    this.#lastTickTime = now();
    this.callbacks.onPositionChange?.({ ...this.position }, 0);
    this.#rafHandle = this.#ticker.request(this.#tick);
  }

  stop() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.#handleKeyDown);
      window.removeEventListener('keyup', this.#handleKeyUp);
    }

    if (this.#rafHandle !== null) {
      this.#ticker.cancel(this.#rafHandle);
      this.#rafHandle = null;
    }

    this.#lastTickTime = null;
    this.#directionQueue.length = 0;
    this.#currentMove = null;
    this.#pressedDirections.clear();
  }

  update(delta) {
    if (delta <= 0) {
      return;
    }

    if (!this.#currentMove) {
      this.#processQueue();
    }

    if (!this.#currentMove) {
      return;
    }

    this.#currentMove.elapsed += delta;

    const progress = Math.min(1, this.#currentMove.elapsed / this.#currentMove.duration);
    const { from, to } = this.#currentMove;

    this.position.x = from.x + (to.x - from.x) * progress;
    this.position.y = from.y + (to.y - from.y) * progress;

    this.callbacks.onPositionChange?.({ ...this.position }, progress, {
      direction: this.#currentMove.direction,
      from,
      to,
    });

    if (progress >= 1) {
      this.tilePosition = { ...to };
      const completedMove = this.#currentMove;
      this.#currentMove = null;
      this.callbacks.onStep?.({ ...this.tilePosition }, completedMove.direction);
      this.callbacks.onMoveComplete?.({ ...this.tilePosition }, completedMove.direction);

      if (this.#pressedDirections.has(completedMove.direction)) {
        this.#directionQueue.push(completedMove.direction);
      }

      this.#processQueue();
    }
  }

  #tick(time) {
    if (this.#rafHandle === null) {
      return;
    }

    const delta = time - (this.#lastTickTime ?? time);
    this.#lastTickTime = time;
    this.update(delta);
    this.#rafHandle = this.#ticker.request(this.#tick);
  }

  #handleKeyDown(event) {
    const direction = this.#keyDirectionMap.get(event.key);
    if (!direction) {
      return;
    }

    if (event.repeat) {
      event.preventDefault();
      return;
    }

    event.preventDefault();
    this.#pressedDirections.add(direction);
    this.#directionQueue.push(direction);
    this.#processQueue();
  }

  #handleKeyUp(event) {
    const direction = this.#keyDirectionMap.get(event.key);
    if (!direction) {
      return;
    }

    event.preventDefault();
    this.#pressedDirections.delete(direction);
  }

  #processQueue() {
    while (!this.#currentMove && this.#directionQueue.length > 0) {
      const nextDirection = this.#directionQueue.shift();
      if (!this.#pressedDirections.has(nextDirection)) {
        continue;
      }

      if (this.#startMove(nextDirection)) {
        return;
      }
    }
  }

  #startMove(directionName) {
    const direction = DIRECTIONS[directionName];
    if (!direction) {
      return false;
    }

    const targetTile = {
      x: this.tilePosition.x + direction.x,
      y: this.tilePosition.y + direction.y,
    };

    if (this.canMoveTo && !this.canMoveTo(targetTile, directionName)) {
      return false;
    }

    this.#currentMove = {
      direction: directionName,
      from: { ...this.tilePosition },
      to: targetTile,
      elapsed: 0,
      duration: this.moveDuration,
    };

    const moveSnapshot = {
      direction: this.#currentMove.direction,
      from: { ...this.#currentMove.from },
      to: { ...this.#currentMove.to },
      elapsed: this.#currentMove.elapsed,
      duration: this.#currentMove.duration,
    };

    this.callbacks.onMoveStart?.(moveSnapshot);
    return true;
  }
}

