const clamp = (value, min, max) => {
  if (Number.isNaN(value)) {
    return min;
  }

  if (min > max) {
    return min;
  }

  return Math.min(Math.max(value, min), max);
};

export class CanvasTileMap {
  #handleResize = () => {
    const dpr = window.devicePixelRatio ?? 1;
    const displayWidth = Math.max(1, Math.floor(this.canvas.clientWidth * dpr));
    const displayHeight = Math.max(1, Math.floor(this.canvas.clientHeight * dpr));

    if (this.canvas.width !== displayWidth || this.canvas.height !== displayHeight) {
      this.canvas.width = displayWidth;
      this.canvas.height = displayHeight;
    }

    const scaleX = displayWidth / this.viewportWidth;
    const scaleY = displayHeight / this.viewportHeight;
    this.scale = Math.min(scaleX, scaleY);

    this.offsetX = (displayWidth - this.viewportWidth * this.scale) / 2;
    this.offsetY = (displayHeight - this.viewportHeight * this.scale) / 2;

    this.draw();
  };

  constructor(canvas, {
    layout,
    tileSize,
    viewport = { columns: 20, rows: 12 },
    drawTile,
    backgroundColor = '#0f061b',
    followSmoothing = 0,
    preloadTiles = 0,
  }) {
    this.canvas = canvas;
    this.context = canvas.getContext('2d');
    this.layout = layout;
    this.tileSize = tileSize;
    this.viewportTiles = viewport;
    this.drawTile = typeof drawTile === 'function' ? drawTile : null;
    this.backgroundColor = backgroundColor;
    this.followSmoothing = Math.min(Math.max(followSmoothing, 0), 1);

    const resolvePreloadValue = (value) => {
      const numericValue = Number(value);
      if (!Number.isFinite(numericValue)) {
        return 0;
      }

      return Math.max(0, Math.floor(numericValue));
    };

    this.preloadTiles = {
      columns: resolvePreloadValue(
        typeof preloadTiles === 'object' && preloadTiles !== null
          ? preloadTiles.columns
          : preloadTiles,
      ),
      rows: resolvePreloadValue(
        typeof preloadTiles === 'object' && preloadTiles !== null
          ? preloadTiles.rows
          : preloadTiles,
      ),
    };

    this.mapHeight = this.layout.length;
    this.mapWidth = this.layout[0]?.length ?? 0;

    this.viewportWidth = this.viewportTiles.columns * this.tileSize;
    this.viewportHeight = this.viewportTiles.rows * this.tileSize;

    this.camera = { x: this.viewportTiles.columns / 2, y: this.viewportTiles.rows / 2 };
    this.cameraTarget = null;
    this.playerPosition = null;
    this.hasCameraPosition = false;

    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;
  }

  start() {
    this.#handleResize();
    window.addEventListener('resize', this.#handleResize);
  }

  destroy() {
    window.removeEventListener('resize', this.#handleResize);
  }

  setCameraTarget(tilePosition, { redraw = true } = {}) {
    if (!tilePosition) {
      return;
    }

    this.cameraTarget = {
      x: tilePosition.x,
      y: tilePosition.y,
    };

    this.#updateCamera();
    if (redraw) {
      this.draw();
    }
  }

  setPlayerPosition(tilePosition, { redraw = true } = {}) {
    if (!tilePosition) {
      this.playerPosition = null;
      if (redraw) {
        this.draw();
      }
      return;
    }

    const offsetCoordinate = (value) =>
      typeof value === 'number' && Number.isFinite(value) ? value + 0.5 : value;

    this.playerPosition = {
      x: offsetCoordinate(tilePosition.x),
      y: offsetCoordinate(tilePosition.y),
    };

    if (redraw) {
      this.draw();
    }
  }

  draw() {
    const ctx = this.context;
    if (!ctx) {
      return;
    }

    this.#updateCamera();

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.fillStyle = this.backgroundColor;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.translate(this.offsetX, this.offsetY);
    ctx.scale(this.scale, this.scale);

    ctx.imageSmoothingEnabled = false;

    const halfWidth = this.viewportTiles.columns / 2;
    const halfHeight = this.viewportTiles.rows / 2;
    const left = this.camera.x - halfWidth;
    const top = this.camera.y - halfHeight;
    const right = left + this.viewportTiles.columns;
    const bottom = top + this.viewportTiles.rows;

    const startX = Math.max(0, Math.floor(left) - this.preloadTiles.columns);
    const startY = Math.max(0, Math.floor(top) - this.preloadTiles.rows);
    const endX = Math.min(this.mapWidth, Math.ceil(right) + this.preloadTiles.columns);
    const endY = Math.min(this.mapHeight, Math.ceil(bottom) + this.preloadTiles.rows);

    for (let y = startY; y < endY; y += 1) {
      for (let x = startX; x < endX; x += 1) {
        const tile = this.#getTile(x, y);
        const screenX = (x - left) * this.tileSize;
        const screenY = (y - top) * this.tileSize;

        if (this.drawTile) {
          this.drawTile(ctx, tile, screenX, screenY, this.tileSize, x, y);
        }
      }
    }

    this.#drawPlayer(ctx, left, top);

    ctx.restore();
  }

  #drawPlayer(ctx, left, top) {
    if (!this.playerPosition) {
      return;
    }

    const radius = this.tileSize * 0.3;
    const x = (this.playerPosition.x - left) * this.tileSize;
    const y = (this.playerPosition.y - top) * this.tileSize;

    ctx.save();
    ctx.fillStyle = '#fbd27b';
    ctx.strokeStyle = '#2a0a57';
    ctx.lineWidth = Math.max(2, this.tileSize * 0.08);
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 210, 123, 0.3)';
    ctx.beginPath();
    ctx.arc(x, y, radius * 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  #getTile(x, y) {
    if (y < 0 || y >= this.mapHeight || x < 0 || x >= this.mapWidth) {
      return null;
    }

    return this.layout[y][x];
  }

  #updateCamera() {
    const { columns, rows } = this.viewportTiles;
    const halfWidth = columns / 2;
    const halfHeight = rows / 2;

    if (!this.cameraTarget) {
      this.camera.x = halfWidth;
      this.camera.y = halfHeight;
      this.hasCameraPosition = true;
      return;
    }

    const centerX = this.cameraTarget.x + 0.5;
    const centerY = this.cameraTarget.y + 0.5;

    const minX = halfWidth;
    const minY = halfHeight;
    const maxX = Math.max(halfWidth, this.mapWidth - halfWidth);
    const maxY = Math.max(halfHeight, this.mapHeight - halfHeight);

    const clampedTargetX = clamp(centerX, minX, maxX);
    const clampedTargetY = clamp(centerY, minY, maxY);

    if (!this.hasCameraPosition) {
      this.camera.x = clampedTargetX;
      this.camera.y = clampedTargetY;
      this.hasCameraPosition = true;
      return;
    }

    if (this.followSmoothing > 0) {
      const smoothing = this.followSmoothing;
      const easedX = this.camera.x + (clampedTargetX - this.camera.x) * smoothing;
      const easedY = this.camera.y + (clampedTargetY - this.camera.y) * smoothing;

      this.camera.x = clamp(easedX, minX, maxX);
      this.camera.y = clamp(easedY, minY, maxY);
      return;
    }

    this.camera.x = clampedTargetX;
    this.camera.y = clampedTargetY;
  }
}
