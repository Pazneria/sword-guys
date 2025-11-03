const DIRECTIONS = Object.freeze({
  up: { x: 0, y: -1, keys: ['ArrowUp', 'w', 'W'] },
  down: { x: 0, y: 1, keys: ['ArrowDown', 's', 'S'] },
  left: { x: -1, y: 0, keys: ['ArrowLeft', 'a', 'A'] },
  right: { x: 1, y: 0, keys: ['ArrowRight', 'd', 'D'] },
  upRight: { x: 1, y: -1, keys: [] },
  upLeft: { x: -1, y: -1, keys: [] },
  downRight: { x: 1, y: 1, keys: [] },
  downLeft: { x: -1, y: 1, keys: [] },
});

const DIAGONAL_COMPONENTS = Object.freeze({
  upRight: ['up', 'right'],
  upLeft: ['up', 'left'],
  downRight: ['down', 'right'],
  downLeft: ['down', 'left'],
});

const COMBO_SEPARATOR = '+';

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

  Object.entries(DIAGONAL_COMPONENTS).forEach(([name, [first, second]]) => {
    const firstKeys = DIRECTIONS[first]?.keys ?? [];
    const secondKeys = DIRECTIONS[second]?.keys ?? [];

    firstKeys.forEach((primary) => {
      secondKeys.forEach((secondary) => {
        entries.push([`${primary}${COMBO_SEPARATOR}${secondary}`, name]);
        if (primary !== secondary) {
          entries.push([`${secondary}${COMBO_SEPARATOR}${primary}`, name]);
        }
      });
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

      const activeDirection = this.#resolveActiveDirection();
      if (activeDirection) {
        this.#enqueueDirection(activeDirection);
      }

      this.#processQueue();
    }
  }

  #tick = (time) => {
    if (this.#rafHandle === null) {
      return;
    }

    const delta = time - (this.#lastTickTime ?? time);
    this.#lastTickTime = time;
    this.update(delta);
    this.#rafHandle = this.#ticker.request(this.#tick);
  };

  #handleKeyDown = (event) => {
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
    this.#queueDirectionFromPressed();
    this.#processQueue();
  };

  #handleKeyUp = (event) => {
    const direction = this.#keyDirectionMap.get(event.key);
    if (!direction) {
      return;
    }

    event.preventDefault();
    this.#pressedDirections.delete(direction);
    this.#queueDirectionFromPressed();
    this.#processQueue();
  };

  #processQueue() {
    while (!this.#currentMove && this.#directionQueue.length > 0) {
      const nextDirection = this.#directionQueue.shift();
      if (!this.#isDirectionPressed(nextDirection)) {
        continue;
      }

      if (this.#startMove(nextDirection)) {
        return;
      }
    }
  }

  #queueDirectionFromPressed() {
    const nextDirection = this.#resolveActiveDirection();
    if (!nextDirection) {
      return false;
    }

    return this.#enqueueDirection(nextDirection);
  }

  #enqueueDirection(directionName) {
    if (!directionName) {
      return false;
    }

    if (
      this.#currentMove?.direction === directionName &&
      this.#directionQueue.length === 0
    ) {
      return false;
    }

    const lastQueued = this.#directionQueue[this.#directionQueue.length - 1];
    if (lastQueued === directionName) {
      return false;
    }

    this.#directionQueue.push(directionName);
    return true;
  }

  #resolveActiveDirection() {
    for (const [diagonal] of Object.entries(DIAGONAL_COMPONENTS)) {
      if (this.#isDirectionPressed(diagonal)) {
        return diagonal;
      }
    }

    for (const direction of this.#pressedDirections) {
      if (DIRECTIONS[direction]) {
        return direction;
      }
    }

    return null;
  }

  #isDirectionPressed(directionName) {
    if (!directionName) {
      return false;
    }

    if (this.#pressedDirections.has(directionName)) {
      return true;
    }

    const components = DIAGONAL_COMPONENTS[directionName];
    if (!components) {
      return false;
    }

    return components.every((component) => this.#pressedDirections.has(component));
  }

  #startMove(directionName) {
    const direction = DIRECTIONS[directionName];
    if (!direction) {
      return false;
    }

    const from = { ...this.tilePosition };
    const targetTile = {
      x: from.x + direction.x,
      y: from.y + direction.y,
    };

    if (this.canMoveTo && !this.canMoveTo(targetTile, directionName, from)) {
      return false;
    }

    const distance = Math.hypot(direction.x, direction.y) || 1;

    this.#currentMove = {
      direction: directionName,
      from,
      to: targetTile,
      elapsed: 0,
      duration: this.moveDuration * distance,
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

