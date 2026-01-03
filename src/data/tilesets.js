/**
 * Tileset definitions for the game
 * For now, these are procedurally drawn, but can be replaced with sprite sheets
 */

export const TILE_SIZE = 16; // Classic 16x16 tiles

export const TILE_TYPES = {
  // Overworld tiles
  GRASS: 0,
  DIRT: 1,
  WATER: 2,
  TREE: 3,
  MOUNTAIN: 4,
  SAND: 5,

  // Town tiles
  STONE_FLOOR: 10,
  WOOD_FLOOR: 11,
  WALL_STONE: 12,
  WALL_WOOD: 13,
  ROOF: 14,
  DOOR: 15,

  // Cave tiles
  CAVE_FLOOR: 20,
  CAVE_WALL: 21,
  CAVE_WATER: 22,
  STAIRS_DOWN: 23,
  STAIRS_UP: 24,

  // Special
  CHEST: 30,
  SIGN: 31,
};

// Tile properties
export const TILE_PROPS = {
  [TILE_TYPES.GRASS]: { passable: true, name: 'Grass' },
  [TILE_TYPES.DIRT]: { passable: true, name: 'Dirt' },
  [TILE_TYPES.WATER]: { passable: false, name: 'Water' },
  [TILE_TYPES.TREE]: { passable: false, name: 'Tree' },
  [TILE_TYPES.MOUNTAIN]: { passable: false, name: 'Mountain' },
  [TILE_TYPES.SAND]: { passable: true, name: 'Sand' },

  [TILE_TYPES.STONE_FLOOR]: { passable: true, name: 'Stone Floor' },
  [TILE_TYPES.WOOD_FLOOR]: { passable: true, name: 'Wood Floor' },
  [TILE_TYPES.WALL_STONE]: { passable: false, name: 'Stone Wall' },
  [TILE_TYPES.WALL_WOOD]: { passable: false, name: 'Wood Wall' },
  [TILE_TYPES.ROOF]: { passable: false, name: 'Roof' },
  [TILE_TYPES.DOOR]: { passable: true, name: 'Door', interactive: true },

  [TILE_TYPES.CAVE_FLOOR]: { passable: true, name: 'Cave Floor' },
  [TILE_TYPES.CAVE_WALL]: { passable: false, name: 'Cave Wall' },
  [TILE_TYPES.CAVE_WATER]: { passable: false, name: 'Underground Water' },
  [TILE_TYPES.STAIRS_DOWN]: { passable: true, name: 'Stairs Down', interactive: true },
  [TILE_TYPES.STAIRS_UP]: { passable: true, name: 'Stairs Up', interactive: true },

  [TILE_TYPES.CHEST]: { passable: false, name: 'Chest', interactive: true },
  [TILE_TYPES.SIGN]: { passable: false, name: 'Sign', interactive: true },
};

/**
 * Draws a tile on a canvas context
 */
export function drawTile(ctx, tileType, x, y, size = TILE_SIZE) {
  ctx.save();

  switch(tileType) {
    case TILE_TYPES.GRASS:
      ctx.fillStyle = '#4a9d4a';
      ctx.fillRect(x, y, size, size);
      // Add some texture
      ctx.fillStyle = '#3d8a3d';
      ctx.fillRect(x, y + size - 2, size, 2);
      break;

    case TILE_TYPES.DIRT:
      ctx.fillStyle = '#8b6f47';
      ctx.fillRect(x, y, size, size);
      ctx.fillStyle = '#7a5f3a';
      ctx.fillRect(x + 2, y + 2, 3, 3);
      ctx.fillRect(x + size - 5, y + size - 5, 3, 3);
      break;

    case TILE_TYPES.WATER:
      ctx.fillStyle = '#3498db';
      ctx.fillRect(x, y, size, size);
      ctx.fillStyle = '#2980b9';
      ctx.fillRect(x, y + size/2, size, 2);
      break;

    case TILE_TYPES.TREE:
      // Trunk
      ctx.fillStyle = '#654321';
      ctx.fillRect(x + size/3, y + size/2, size/3, size/2);
      // Leaves
      ctx.fillStyle = '#228b22';
      ctx.beginPath();
      ctx.arc(x + size/2, y + size/3, size/3, 0, Math.PI * 2);
      ctx.fill();
      break;

    case TILE_TYPES.MOUNTAIN:
      ctx.fillStyle = '#808080';
      ctx.beginPath();
      ctx.moveTo(x + size/2, y);
      ctx.lineTo(x + size, y + size);
      ctx.lineTo(x, y + size);
      ctx.closePath();
      ctx.fill();
      // Snow cap
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(x + size/2, y);
      ctx.lineTo(x + size/2 + 4, y + 6);
      ctx.lineTo(x + size/2 - 4, y + 6);
      ctx.closePath();
      ctx.fill();
      break;

    case TILE_TYPES.SAND:
      ctx.fillStyle = '#f4d03f';
      ctx.fillRect(x, y, size, size);
      ctx.fillStyle = '#e6c233';
      ctx.fillRect(x + 1, y + 1, 2, 2);
      ctx.fillRect(x + size - 3, y + size - 3, 2, 2);
      break;

    case TILE_TYPES.STONE_FLOOR:
      ctx.fillStyle = '#95a5a6';
      ctx.fillRect(x, y, size, size);
      ctx.strokeStyle = '#7f8c8d';
      ctx.strokeRect(x, y, size, size);
      break;

    case TILE_TYPES.WOOD_FLOOR:
      ctx.fillStyle = '#a0826d';
      ctx.fillRect(x, y, size, size);
      ctx.strokeStyle = '#8b6f47';
      for(let i = 0; i < size; i += 4) {
        ctx.beginPath();
        ctx.moveTo(x, y + i);
        ctx.lineTo(x + size, y + i);
        ctx.stroke();
      }
      break;

    case TILE_TYPES.WALL_STONE:
      ctx.fillStyle = '#5d6d7e';
      ctx.fillRect(x, y, size, size);
      ctx.fillStyle = '#4a5a6a';
      ctx.fillRect(x + 2, y + 2, size - 4, size - 4);
      break;

    case TILE_TYPES.WALL_WOOD:
      ctx.fillStyle = '#8b6f47';
      ctx.fillRect(x, y, size, size);
      ctx.fillStyle = '#654321';
      ctx.fillRect(x + 4, y, 2, size);
      break;

    case TILE_TYPES.ROOF:
      ctx.fillStyle = '#c0392b';
      ctx.fillRect(x, y, size, size);
      break;

    case TILE_TYPES.DOOR:
      ctx.fillStyle = '#8b6f47';
      ctx.fillRect(x, y, size, size);
      ctx.fillStyle = '#654321';
      ctx.fillRect(x + 3, y + 3, size - 6, size - 6);
      // Door handle
      ctx.fillStyle = '#f39c12';
      ctx.fillRect(x + size - 5, y + size/2, 2, 2);
      break;

    case TILE_TYPES.CAVE_FLOOR:
      ctx.fillStyle = '#34495e';
      ctx.fillRect(x, y, size, size);
      break;

    case TILE_TYPES.CAVE_WALL:
      ctx.fillStyle = '#2c3e50';
      ctx.fillRect(x, y, size, size);
      ctx.fillStyle = '#1a252f';
      ctx.fillRect(x + 1, y + 1, size - 2, size - 2);
      break;

    case TILE_TYPES.CAVE_WATER:
      ctx.fillStyle = '#1a5490';
      ctx.fillRect(x, y, size, size);
      break;

    case TILE_TYPES.STAIRS_DOWN:
      ctx.fillStyle = '#34495e';
      ctx.fillRect(x, y, size, size);
      ctx.fillStyle = '#000000';
      for(let i = 0; i < 4; i++) {
        ctx.fillRect(x + 2, y + 2 + i * 3, size - 4, 2);
      }
      break;

    case TILE_TYPES.STAIRS_UP:
      ctx.fillStyle = '#34495e';
      ctx.fillRect(x, y, size, size);
      ctx.fillStyle = '#ecf0f1';
      for(let i = 0; i < 4; i++) {
        ctx.fillRect(x + 2, y + 2 + i * 3, size - 4, 2);
      }
      break;

    case TILE_TYPES.CHEST:
      ctx.fillStyle = '#a0826d';
      ctx.fillRect(x + 2, y + 6, size - 4, size - 6);
      ctx.fillStyle = '#f39c12';
      ctx.fillRect(x + size/2 - 2, y + size/2, 4, 3);
      break;

    case TILE_TYPES.SIGN:
      // Post
      ctx.fillStyle = '#654321';
      ctx.fillRect(x + size/2 - 1, y + size/2, 2, size/2);
      // Sign board
      ctx.fillStyle = '#8b6f47';
      ctx.fillRect(x + 2, y + 4, size - 4, size/3);
      break;

    default:
      // Unknown tile - magenta for debugging
      ctx.fillStyle = '#ff00ff';
      ctx.fillRect(x, y, size, size);
  }

  ctx.restore();
}
