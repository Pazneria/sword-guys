import { TILE_TYPES } from './tilesets.js';

/**
 * Map definitions
 * Each map has:
 * - id: unique identifier
 * - name: display name
 * - width, height: dimensions in tiles
 * - layers: array of tile data (ground, objects, etc.)
 * - spawns: player spawn points
 * - npcs: NPC definitions
 * - transitions: map transitions (doors, stairs, etc.)
 * - encounters: random encounter data for this map
 */

const G = TILE_TYPES.GRASS;
const D = TILE_TYPES.DIRT;
const W = TILE_TYPES.WATER;
const T = TILE_TYPES.TREE;
const M = TILE_TYPES.MOUNTAIN;
const S = TILE_TYPES.SAND;

export const MAPS = {
  overworld: {
    id: 'overworld',
    name: 'Overworld',
    width: 30,
    height: 30,
    music: 'overworld_theme',

    // Ground layer
    ground: [
      [G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G],
      [G,G,G,G,G,G,D,D,D,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G],
      [G,G,G,G,G,D,D,D,D,D,G,G,G,G,G,G,G,G,G,G,T,T,T,G,G,G,G,G,G,G],
      [G,G,G,G,D,D,D,D,D,D,D,G,G,G,G,G,G,G,G,T,T,T,T,T,G,G,G,G,G,G],
      [G,G,G,G,D,D,D,D,D,D,D,G,G,G,G,G,G,G,T,T,T,T,T,T,T,G,G,G,G,G],
      [G,G,G,G,G,D,D,D,D,D,G,G,G,G,G,G,G,G,T,T,T,T,T,T,G,G,G,G,G,G],
      [G,G,G,G,G,G,D,D,D,G,G,G,G,G,G,G,G,G,G,T,T,T,T,G,G,G,G,G,G,G],
      [G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G],
      [G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G],
      [G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G],
      [W,W,W,W,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,M,M,M],
      [W,W,W,W,W,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,M,M,M,M],
      [W,W,W,W,W,W,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,M,M,M,M,M],
      [W,W,W,W,W,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,M,M,M,M,M],
      [W,W,W,W,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,M,M,M,M],
      [G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,M,M,M],
      [G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G],
      [G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G],
      [G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G],
      [G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G],
      [G,G,S,S,S,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G],
      [G,S,S,S,S,S,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G],
      [G,S,S,S,S,S,S,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G],
      [G,S,S,S,S,S,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G],
      [G,G,S,S,S,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G],
      [G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G],
      [G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G],
      [G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G],
      [G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G],
      [G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G],
    ],

    // Objects layer (trees, buildings, etc. - null means empty)
    objects: Array(30).fill(null).map(() => Array(30).fill(null)),

    spawns: {
      default: { x: 15, y: 15 }
    },

    npcs: [],

    transitions: [
      {
        x: 8, y: 4,
        targetMap: 'town',
        targetX: 10,
        targetY: 15,
        direction: 'up' // Player must be facing this direction
      },
      {
        x: 26, y: 13,
        targetMap: 'cave',
        targetX: 5,
        targetY: 5
      }
    ],

    // Random encounters (enemies that can appear)
    encounters: [
      { id: 'slime', weight: 50 },
      { id: 'goblin', weight: 30 },
      { id: 'wolf', weight: 20 }
    ],
    encounterRate: 0.03 // 3% chance per step
  },

  town: {
    id: 'town',
    name: 'Hometown',
    width: 20,
    height: 20,
    music: 'town_theme',

    ground: Array(20).fill(null).map((_, y) =>
      Array(20).fill(null).map((_, x) => {
        // Create a simple town layout
        if (y < 2 || y > 17 || x < 2 || x > 17) return TILE_TYPES.GRASS;
        return TILE_TYPES.STONE_FLOOR;
      })
    ),

    objects: Array(20).fill(null).map(() => Array(20).fill(null)),

    spawns: {
      default: { x: 10, y: 15 },
      fromOverworld: { x: 10, y: 15 }
    },

    npcs: [
      {
        id: 'shopkeeper',
        name: 'Merchant',
        x: 8, y: 6,
        sprite: 'npc_merchant',
        dialogue: [
          'Welcome to my shop!',
          'I have the finest wares in town.',
        ],
        shop: true,
        shopInventory: ['potion', 'ether', 'antidote', 'sword', 'shield']
      },
      {
        id: 'guard',
        name: 'Town Guard',
        x: 10, y: 4,
        sprite: 'npc_guard',
        dialogue: [
          'Stay safe out there, adventurer!',
          'Monsters have been spotted to the east.'
        ]
      },
      {
        id: 'elder',
        name: 'Village Elder',
        x: 15, y: 8,
        sprite: 'npc_elder',
        dialogue: [
          'Welcome to our humble village.',
          'There\'s a cave in the mountains...',
          'They say treasure lies within, but beware of monsters!'
        ]
      }
    ],

    transitions: [
      {
        x: 10, y: 18,
        targetMap: 'overworld',
        targetX: 8,
        targetY: 5
      }
    ],

    encounters: [] // No random encounters in town
  },

  cave: {
    id: 'cave',
    name: 'Dark Cave',
    width: 15,
    height: 15,
    music: 'dungeon_theme',

    ground: Array(15).fill(null).map((_, y) =>
      Array(15).fill(null).map((_, x) => {
        // Create cave walls around edges
        if (y === 0 || y === 14 || x === 0 || x === 14) {
          return TILE_TYPES.CAVE_WALL;
        }
        return TILE_TYPES.CAVE_FLOOR;
      })
    ),

    objects: Array(15).fill(null).map(() => Array(15).fill(null)),

    spawns: {
      default: { x: 5, y: 5 }
    },

    npcs: [],

    transitions: [
      {
        x: 5, y: 5,
        targetMap: 'overworld',
        targetX: 26,
        targetY: 14,
        requireInteraction: true // Must press action button
      }
    ],

    encounters: [
      { id: 'bat', weight: 40 },
      { id: 'skeleton', weight: 35 },
      { id: 'goblin', weight: 25 }
    ],
    encounterRate: 0.08 // Higher encounter rate in dungeons
  }
};

// Helper to get a map
export function getMap(mapId) {
  return MAPS[mapId];
}

// Helper to check if tile is passable
export function isPassable(map, x, y) {
  if (!map || x < 0 || y < 0 || x >= map.width || y >= map.height) {
    return false;
  }

  const groundTile = map.ground[y][x];
  const objectTile = map.objects[y][x];

  // Check object layer first
  if (objectTile !== null) {
    const objProps = getTileProps(objectTile);
    if (!objProps.passable) return false;
  }

  // Check ground layer
  const groundProps = getTileProps(groundTile);
  return groundProps.passable;
}

// Import from tilesets
import { TILE_PROPS } from './tilesets.js';

function getTileProps(tileType) {
  return TILE_PROPS[tileType] || { passable: false, name: 'Unknown' };
}
