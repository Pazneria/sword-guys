const DEFAULT_DELTAS = Object.freeze({
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  upRight: { x: 1, y: -1 },
  upLeft: { x: -1, y: -1 },
  downRight: { x: 1, y: 1 },
  downLeft: { x: -1, y: 1 },
});

const clonePosition = (position) => {
  if (!position) {
    return null;
  }

  return { x: position.x, y: position.y };
};

export class MovementController {
  constructor({
    layout = [],
    passableTiles = {},
    position = null,
    onStep,
    onBlocked,
  } = {}) {
    this.layout = layout;
    this.passableTiles = passableTiles;
    this.position = clonePosition(position);
    this.onStep = typeof onStep === 'function' ? onStep : null;
    this.onBlocked = typeof onBlocked === 'function' ? onBlocked : null;

    this.queue = [];
  }

  setPosition(position) {
    this.position = clonePosition(position);
  }

  getPosition() {
    return clonePosition(this.position);
  }

  queueMove(direction) {
    if (!direction) {
      return;
    }

    this.queue.push(direction);
  }

  step() {
    if (!this.position) {
      this.queue.length = 0;
      return false;
    }

    while (this.queue.length > 0) {
      const direction = this.queue.shift();
      const delta = this.#resolveDelta(direction);

      if (!delta) {
        continue;
      }

      const target = {
        x: this.position.x + delta.x,
        y: this.position.y + delta.y,
      };

      const { blocked, tile } = this.#checkCollision(target);

      if (blocked) {
        if (this.onBlocked) {
          this.onBlocked({
            direction,
            from: clonePosition(this.position),
            to: target,
            tile,
          });
        }

        return false;
      }

      const previous = clonePosition(this.position);
      this.position = target;

      if (this.onStep) {
        this.onStep({
          direction,
          from: previous,
          to: clonePosition(this.position),
          tile,
        });
      }

      return true;
    }

    return false;
  }

  #resolveDelta(direction) {
    if (typeof direction === 'string') {
      return DEFAULT_DELTAS[direction] ?? null;
    }

    if (direction && typeof direction === 'object') {
      const { x, y } = direction;

      if (Number.isFinite(x) && Number.isFinite(y)) {
        return { x, y };
      }
    }

    return null;
  }

  #checkCollision(position) {
    const tile = this.#getTile(position.x, position.y);

    if (tile == null) {
      return { blocked: true, tile: null };
    }

    const passable = Boolean(this.passableTiles?.[tile]);

    return { blocked: !passable, tile };
  }

  #getTile(x, y) {
    if (y < 0 || y >= this.layout.length) {
      return null;
    }

    if (x < 0 || x >= this.layout[y].length) {
      return null;
    }

    return this.layout[y][x];
  }
}
