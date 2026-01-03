/**
 * TileMapRenderer - Renders tile-based maps with multiple layers
 */

import { TILE_SIZE, drawTile } from '../data/tilesets.js';
import { isPassable } from '../data/maps.js';

export class TileMapRenderer {
  #canvas;
  #ctx;
  #currentMap;
  #camera;
  #tileCache;
  #viewportTiles;
  #scale;

  constructor(canvas, options = {}) {
    this.#canvas = canvas;
    this.#ctx = canvas.getContext('2d');
    this.#camera = { x: 0, y: 0 };
    this.#tileCache = new Map();

    this.#scale = options.scale || 2; // Default 2x scale for 16px tiles
    this.#viewportTiles = {
      width: options.viewportWidth || 20,
      height: options.viewportHeight || 15
    };

    this.cameraSmoothing = options.cameraSmoothing || 0.1;

    this.#setupCanvas();
  }

  #setupCanvas() {
    const width = this.#viewportTiles.width * TILE_SIZE * this.#scale;
    const height = this.#viewportTiles.height * TILE_SIZE * this.#scale;

    this.#canvas.width = width;
    this.#canvas.height = height;
    this.#canvas.style.width = `${width}px`;
    this.#canvas.style.height = `${height}px`;

    // Disable image smoothing for crisp pixels
    this.#ctx.imageSmoothingEnabled = false;
  }

  setMap(map) {
    this.#currentMap = map;
    this.#tileCache.clear();
  }

  getMap() {
    return this.#currentMap;
  }

  // Center camera on a position
  centerCameraOn(x, y, immediate = false) {
    if (!this.#currentMap) return;

    const targetX = x - this.#viewportTiles.width / 2;
    const targetY = y - this.#viewportTiles.height / 2;

    if (immediate) {
      this.#camera.x = targetX;
      this.#camera.y = targetY;
    } else {
      // Smooth camera movement
      this.#camera.x += (targetX - this.#camera.x) * this.cameraSmoothing;
      this.#camera.y += (targetY - this.#camera.y) * this.cameraSmoothing;
    }

    // Clamp camera to map bounds
    const maxX = this.#currentMap.width - this.#viewportTiles.width;
    const maxY = this.#currentMap.height - this.#viewportTiles.height;

    this.#camera.x = Math.max(0, Math.min(this.#camera.x, maxX));
    this.#camera.y = Math.max(0, Math.min(this.#camera.y, maxY));
  }

  // Convert screen coordinates to tile coordinates
  screenToTile(screenX, screenY) {
    const tileX = Math.floor(screenX / (TILE_SIZE * this.#scale) + this.#camera.x);
    const tileY = Math.floor(screenY / (TILE_SIZE * this.#scale) + this.#camera.y);
    return { x: tileX, y: tileY };
  }

  // Convert tile coordinates to screen coordinates
  tileToScreen(tileX, tileY) {
    const screenX = (tileX - this.#camera.x) * TILE_SIZE * this.#scale;
    const screenY = (tileY - this.#camera.y) * TILE_SIZE * this.#scale;
    return { x: screenX, y: screenY };
  }

  // Check if a tile is passable
  isPassable(x, y) {
    return isPassable(this.#currentMap, x, y);
  }

  // Render the current map
  render(entities = []) {
    if (!this.#currentMap) return;

    this.#ctx.clearRect(0, 0, this.#canvas.width, this.#canvas.height);

    const startX = Math.floor(this.#camera.x);
    const startY = Math.floor(this.#camera.y);
    const endX = Math.min(startX + this.#viewportTiles.width + 1, this.#currentMap.width);
    const endY = Math.min(startY + this.#viewportTiles.height + 1, this.#currentMap.height);

    // Render ground layer
    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const tileType = this.#currentMap.ground[y][x];
        this.#renderTile(tileType, x, y);
      }
    }

    // Render object layer
    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const tileType = this.#currentMap.objects[y]?.[x];
        if (tileType !== null && tileType !== undefined) {
          this.#renderTile(tileType, x, y);
        }
      }
    }

    // Render entities (player, NPCs, etc.)
    entities.forEach(entity => {
      if (entity.render) {
        const screenPos = this.tileToScreen(entity.x, entity.y);
        entity.render(this.#ctx, screenPos.x, screenPos.y, TILE_SIZE * this.#scale);
      }
    });
  }

  #renderTile(tileType, tileX, tileY) {
    const screenPos = this.tileToScreen(tileX, tileY);
    const size = TILE_SIZE * this.#scale;

    // Use cached tile if available
    const cacheKey = `${tileType}_${this.#scale}`;

    if (!this.#tileCache.has(cacheKey)) {
      // Create cached tile
      const tileCanvas = document.createElement('canvas');
      tileCanvas.width = size;
      tileCanvas.height = size;
      const tileCtx = tileCanvas.getContext('2d');

      // Draw tile at scale 1, then scale the canvas
      tileCtx.imageSmoothingEnabled = false;
      tileCtx.save();
      tileCtx.scale(this.#scale, this.#scale);
      drawTile(tileCtx, tileType, 0, 0, TILE_SIZE);
      tileCtx.restore();

      this.#tileCache.set(cacheKey, tileCanvas);
    }

    const cachedTile = this.#tileCache.get(cacheKey);
    this.#ctx.drawImage(cachedTile, screenPos.x, screenPos.y);
  }

  // Get the canvas element
  getCanvas() {
    return this.#canvas;
  }

  // Cleanup
  destroy() {
    this.#tileCache.clear();
  }
}
