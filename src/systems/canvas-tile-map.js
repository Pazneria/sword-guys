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
  constructor(canvas, {
    layout,
    tileSize,
    viewport = { columns: 20, rows: 12 },
    drawTile,
    backgroundColor = '#0f061b',
  }) {
    this.canvas = canvas;
    this.context = canvas.getContext('2d');
    this.layout = layout;
    this.tileSize = tileSize;
    this.viewportTiles = viewport;
    this.drawTile = typeof drawTile === 'function' ? drawTile : null;
    this.backgroundColor = backgroundColor;

    this.mapHeight = this.layout.length;
    this.mapWidth = this.layout[0]?.length ?? 0;

    this.viewportWidth = this.viewportTiles.columns * this.tileSize;
    this.viewportHeight = this.viewportTiles.rows * this.tileSize;

    this.camera = { x: this.viewportTiles.columns / 2, y: this.viewportTiles.rows / 2 };
    this.cameraTarget = null;
    this.playerPosition = null;

    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;

    this.#handleResize = this.#handleResize.bind(this);
  }

  start() {
    this.#handleResize();
    window.addEventListener('resize', this.#handleResize);
  }

  destroy() {
    window.removeEventListener('resize', this.#handleResize);
  }

  setCameraTarget(tilePosition) {
    if (!tilePosition) {
      return;
    }

    this.cameraTarget = {
      x: tilePosition.x,
      y: tilePosition.y,
    };

    this.#updateCamera();
    this.draw();
  }

  setPlayerPosition(tilePosition) {
    if (!tilePosition) {
      this.playerPosition = null;
      this.draw();
      return;
    }

    this.playerPosition = {
      x: tilePosition.x + 0.5,
      y: tilePosition.y + 0.5,
    };

    this.draw();
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

    const startX = Math.floor(left);
    const startY = Math.floor(top);
    const endX = Math.ceil(right);
    const endY = Math.ceil(bottom);

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

  #handleResize() {
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
  }

  #updateCamera() {
    const { columns, rows } = this.viewportTiles;
    const halfWidth = columns / 2;
    const halfHeight = rows / 2;

    if (!this.cameraTarget) {
      this.camera.x = halfWidth;
      this.camera.y = halfHeight;
      return;
    }

    const centerX = this.cameraTarget.x + 0.5;
    const centerY = this.cameraTarget.y + 0.5;

    const minX = halfWidth;
    const minY = halfHeight;
    const maxX = Math.max(halfWidth, this.mapWidth - halfWidth);
    const maxY = Math.max(halfHeight, this.mapHeight - halfHeight);

    this.camera.x = clamp(centerX, minX, maxX);
    this.camera.y = clamp(centerY, minY, maxY);
  }
}
