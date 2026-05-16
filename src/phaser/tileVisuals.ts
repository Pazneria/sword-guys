import type { MapDefinition, TileLayerName } from '../game/types';

export const TILE_VISUAL_LAYERS: TileLayerName[] = ['ground', 'lowerObject', 'upperObject', 'effects'];

export type TileVisual = {
  textureKey: string;
  frame?: number;
  hidden?: boolean;
};

export type TileVisualContext = {
  map: MapDefinition;
  tileId: string;
  x: number;
  y: number;
  layer: TileLayerName;
  lockedTransition?: boolean;
};

type FrameRef = number | readonly number[];
type AreaTilesetId =
  | 'greenhollow'
  | 'overworld_main'
  | 'waymeet'
  | 'lumaire'
  | 'ironmarch'
  | 'sunspire'
  | 'mossvale_cave'
  | 'dustbridge_ruins'
  | 'flooded_shrine'
  | 'ironvein_fortress'
  | 'eclipse_tower';

type VillageFrameSet = {
  grass: readonly number[];
  grassVariant: number;
  flower: number;
  tallGrass: number;
  path: ConnectedFrames;
  fence: ConnectedFrames;
  roof: RoofFrames;
  wall: number;
  wallUpper: number;
  wallShadow: number;
  door: number;
  shopSign: number;
  saveCrystal: number;
  woodFloor: FrameRef;
  stoneFloor: FrameRef;
  water: FrameRef;
  bridge: number;
  gate: number;
};

type ConnectedFrames = {
  isolated: number;
  vertical: number;
  horizontal: number;
  junction: number;
  northEnd?: number;
  southEnd?: number;
  westEnd?: number;
  eastEnd?: number;
  cornerNE?: number;
  cornerNW?: number;
  cornerSE?: number;
  cornerSW?: number;
};

type RoofFrames = {
  left: number;
  middle: number;
  right: number;
};

type DungeonFrameSet = {
  id: AreaTilesetId;
  floor: FrameRef;
  accent: FrameRef;
  wall: FrameRef;
  cliff: FrameRef;
  water: FrameRef;
  lava: FrameRef;
  stairsUp: number;
  stairsDown: number;
  chest: number;
  saveCrystal: number;
  gate: number;
  fence: number;
  props?: Partial<Record<string, FrameRef>>;
};

export type TileUsageIssue = {
  mapId: string;
  layer: TileLayerName;
  x: number;
  y: number;
  tileId: string;
  textureKey: string;
};

export type TileUsageMapSummary = {
  mapId: string;
  name: string;
  primaryTilesetKey: string | null;
  textureKeys: string[];
  tileCount: number;
  unresolvedCount: number;
};

export type TileUsageReport = {
  mapCount: number;
  tileCount: number;
  unresolved: TileUsageIssue[];
  maps: TileUsageMapSummary[];
};

const runtimeTilesetKeys: Partial<Record<AreaTilesetId | 'weapon_shop' | 'inn' | 'inn_lobby' | 'inn_bedroom', string>> = {
  greenhollow: 'tiles:greenhollow',
  overworld_main: 'tiles:overworld-greenhollow',
  weapon_shop: 'tiles:weapon-shop',
  inn: 'tiles:inn',
  inn_lobby: 'tiles:inn-lobby',
  inn_bedroom: 'tiles:inn-bedroom'
};

const frame = (x: number, y: number, cols = 10) => y * cols + x;

const textureKeyForTileset = (tilesetId: AreaTilesetId | 'weapon_shop' | 'inn' | 'inn_lobby' | 'inn_bedroom') =>
  runtimeTilesetKeys[tilesetId] ?? `tiles:${tilesetId}`;

const pickFrame = (ref: FrameRef, x: number, y: number) => {
  if (typeof ref === 'number') return ref;
  return ref[Math.abs((x * 17 + y * 11 + x * y * 5) % ref.length)];
};

const tileAt = (map: MapDefinition, layer: TileLayerName, x: number, y: number) => map.layers[layer][y]?.[x]?.id;

const connectedFrame = (map: MapDefinition, layer: TileLayerName, x: number, y: number, tileId: string, frames: ConnectedFrames) => {
  const north = tileAt(map, layer, x, y - 1) === tileId;
  const south = tileAt(map, layer, x, y + 1) === tileId;
  const west = tileAt(map, layer, x - 1, y) === tileId;
  const east = tileAt(map, layer, x + 1, y) === tileId;
  const connections = [north, south, west, east].filter(Boolean).length;
  if (connections >= 3) return frames.junction;
  if (north && south && !west && !east) return frames.vertical;
  if (west && east && !north && !south) return frames.horizontal;
  if (north && !south && !west && !east) return frames.northEnd ?? frames.vertical;
  if (!north && south && !west && !east) return frames.southEnd ?? frames.vertical;
  if (!north && !south && west && !east) return frames.westEnd ?? frames.horizontal;
  if (!north && !south && !west && east) return frames.eastEnd ?? frames.horizontal;
  if (!north && !west && south && east) return frames.cornerSE ?? frames.junction;
  if (!north && !east && south && west) return frames.cornerSW ?? frames.junction;
  if (!south && !west && north && east) return frames.cornerNE ?? frames.junction;
  if (!south && !east && north && west) return frames.cornerNW ?? frames.junction;
  return frames.isolated;
};

const roofFrame = (map: MapDefinition, layer: TileLayerName, x: number, y: number, frames: RoofFrames) => {
  const west = tileAt(map, layer, x - 1, y) === 'building_roof';
  const east = tileAt(map, layer, x + 1, y) === 'building_roof';
  if (!west && east) return frames.left;
  if (west && !east) return frames.right;
  return frames.middle;
};

const overworldWaterFrame = (map: MapDefinition, layer: TileLayerName, x: number, y: number) => {
  const water = (tile?: string) => tile === 'water_deep' || tile === 'water_shallow';
  const north = water(tileAt(map, layer, x, y - 1));
  const south = water(tileAt(map, layer, x, y + 1));
  const west = water(tileAt(map, layer, x - 1, y));
  const east = water(tileAt(map, layer, x + 1, y));
  if (!north && !west) return 27;
  if (!north && !east) return 29;
  if (!south && !west) return 28;
  if (!south && !east) return 30;
  if (!north || !south) return 26;
  if (!west) return 30;
  if (!east) return 29;
  return Math.abs((x * 13 + y * 7) % 5) === 0 ? 25 : 24;
};

const greenhollowTileFrame = (map: MapDefinition, tileId: string, x: number, y: number, layer: TileLayerName) => {
  if (tileId === 'grass_plain') {
    const roll = Math.abs((x * 37 + y * 19 + x * y * 7) % 13);
    if (roll === 0) return 2;
    if (roll < 4) return 1;
    return 0;
  }
  if (tileId === 'grass_variant') return 1;
  if (tileId === 'flower_grass') return 2;
  if (tileId === 'tall_grass') return 3;
  if (tileId === 'dirt_path') {
    return connectedFrame(map, layer, x, y, tileId, {
      isolated: 7,
      vertical: 5,
      horizontal: 4,
      junction: 6,
      northEnd: 8,
      southEnd: 9,
      westEnd: 10,
      eastEnd: 11,
      cornerSE: 12,
      cornerSW: 13,
      cornerNE: 14,
      cornerNW: 15
    });
  }
  if (tileId === 'wood_fence') {
    return connectedFrame(map, layer, x, y, tileId, {
      isolated: 16,
      vertical: 17,
      horizontal: 16,
      junction: 18
    });
  }
  if (tileId === 'building_roof') return roofFrame(map, layer, x, y, { left: 24, middle: 23, right: 22 });
  const frames: Record<string, number> = {
    building_wall: 20,
    building_wall_upper: 21,
    building_wall_upper_shadow: 47,
    door_house: 26,
    water_shallow: 36,
    stone_floor: 40,
    wood_floor: 39,
    shop_sign: 28,
    save_crystal: 46
  };
  return frames[tileId] ?? null;
};

const overworldDetailFrame = (tileId: string) => {
  const frames: Record<string, number> = {
    field_grass_detail: 0,
    field_flower_detail: 1,
    field_tall_grass_detail: 2,
    field_clover_detail: 3,
    field_dirt_scuff_detail: 4
  };
  return frames[tileId] ?? null;
};

const overworldTileFrame = (map: MapDefinition, tileId: string, x: number, y: number, layer: TileLayerName) => {
  if (tileId === 'grass_plain') return 0;
  if (tileId === 'grass_variant') return 4;
  if (tileId === 'flower_grass') return 2;
  if (tileId === 'tall_grass') return 3;
  if (tileId === 'dirt_path') {
    const mask =
      (tileAt(map, layer, x, y - 1) === 'dirt_path' ? 1 : 0) |
      (tileAt(map, layer, x + 1, y) === 'dirt_path' ? 2 : 0) |
      (tileAt(map, layer, x, y + 1) === 'dirt_path' ? 4 : 0) |
      (tileAt(map, layer, x - 1, y) === 'dirt_path' ? 8 : 0);
    const frames: Record<number, number> = {
      0: 8,
      1: 23,
      2: 21,
      3: 18,
      4: 15,
      5: 9,
      6: 16,
      7: 10,
      8: 20,
      9: 19,
      10: 8,
      11: 10,
      12: 17,
      13: 10,
      14: 10,
      15: 10
    };
    return frames[mask] ?? 8;
  }
  if (tileId === 'water_deep') return overworldWaterFrame(map, layer, x, y);
  const frames: Record<string, number> = {
    road_stone: 8,
    sand_plain: 1,
    stone_floor: 41,
    shrine_floor: 41,
    dungeon_floor: 41,
    water_shallow: 24,
    wood_bridge_horizontal: 31,
    mountain_wall: 40,
    cliff_face: 39,
    tree_canopy: 32,
    tree_trunk: 42,
    bush: 33,
    wood_fence: 44,
    town_marker: 37,
    cave_mouth: 38,
    castle_gate: 41,
    tower_gate: 41,
    save_crystal: 45,
    shop_sign: 36
  };
  return frames[tileId] ?? null;
};

const innTileFrame = (tileId: string, lockedTransition: boolean) => {
  if (tileId === 'inn_floor') return 0;
  if (tileId === 'inn_floor_parquet') return 1;
  if (tileId === 'inn_door_inside' && lockedTransition) return 6;
  const frames: Record<string, number> = {
    inn_floor_dark: 2,
    inn_stone_floor: 42,
    inn_wall_upper: 3,
    inn_wall_base: 10,
    inn_wall_side_left: 8,
    inn_wall_side_right: 9,
    inn_wall_south: 10,
    inn_window_wall: 5,
    inn_lamp_wall: 4,
    inn_fireplace_wall: 7,
    inn_door_inside: 11,
    inn_exit_mat: 47,
    inn_counter: 12,
    inn_counter_corner: 13,
    inn_plaque: 14,
    inn_rug_green: 15,
    inn_rug_red: 16,
    inn_rug_blue: 17,
    inn_bed_green: 18,
    inn_bed_green_foot: 21,
    inn_bed_blue: 19,
    inn_bed_red: 20,
    inn_bed_side: 21,
    inn_pillow_stack: 22,
    inn_blanket_folded: 23,
    inn_nightstand_candle: 24,
    inn_lamp_table: 25,
    inn_dresser: 26,
    inn_wardrobe: 27,
    inn_chest: 28,
    inn_table: 29,
    inn_chair: 30,
    inn_round_table: 31,
    inn_bookshelf: 32,
    inn_barrel: 33,
    inn_crate: 34,
    inn_plant: 35,
    inn_curtain_window: 36,
    inn_linen_shelf: 37,
    inn_folded_linen_shelf: 38,
    inn_privacy_screen: 39,
    inn_rug_runner_red: 44,
    inn_rug_runner_blue: 45,
    inn_rug_runner_green: 46,
    inn_mat: 47
  };
  return frames[tileId] ?? null;
};

const lobbyInnTileFrame = (tileId: string) => {
  const frames: Record<string, number> = {
    inn_lobby_couch_left: 0,
    inn_lobby_couch_right: 1,
    inn_lobby_armchair: 2,
    inn_lobby_fireplace: 3,
    inn_lobby_wall_lamp: 4,
    inn_lobby_large_plant: 5,
    inn_lobby_bookshelf: 6,
    inn_lobby_coat_hooks: 7,
    inn_lobby_rug_tl: 8,
    inn_lobby_rug_t1: 9,
    inn_lobby_rug_t2: 10,
    inn_lobby_rug_tr: 11,
    inn_lobby_round_table: 12,
    inn_lobby_supply_crate: 13,
    inn_lobby_barrel: 14,
    inn_lobby_candle_table: 15,
    inn_lobby_rug_ml: 16,
    inn_lobby_rug_m1: 17,
    inn_lobby_rug_m2: 18,
    inn_lobby_rug_mr: 19,
    inn_lobby_coffee_table: 20,
    inn_lobby_pillows: 21,
    inn_lobby_flower_box: 22,
    inn_lobby_painting: 23,
    inn_lobby_rug_bl: 24,
    inn_lobby_rug_b1: 25,
    inn_lobby_rug_b2: 26,
    inn_lobby_rug_br: 27,
    inn_lobby_vase_table: 28,
    inn_lobby_banner: 29,
    inn_lobby_sideboard: 30,
    inn_lobby_potted_plant: 31,
    inn_lobby_flower_counter: 34,
    inn_lobby_flowering_plant: 35,
    inn_lobby_stool: 36,
    inn_lobby_chest: 37,
    inn_lobby_lantern: 38,
    inn_lobby_curtain_window: 39
  };
  return frames[tileId] ?? null;
};

const bedroomInnTileFrame = (tileId: string) => {
  const frames: Record<string, number> = {
    inn_bedroom_wall: 0,
    inn_bedroom_window_left: 3,
    inn_bedroom_window_right: 4,
    inn_bedroom_floor_a: 8,
    inn_bedroom_floor_b: 9,
    inn_bedroom_floor_c: 10,
    inn_bedroom_floor_d: 11,
    inn_bedroom_floor_e: 12,
    inn_bedroom_floor_f: 13,
    inn_bedroom_floor_g: 14,
    inn_bedroom_floor_h: 15,
    inn_bedroom_bed: 16,
    inn_bedroom_nightstand_candle: 17,
    inn_bedroom_wardrobe: 18,
    inn_bedroom_dresser: 19,
    inn_bedroom_linen_shelf: 20,
    inn_bedroom_plant: 21,
    inn_bedroom_round_rug: 22,
    inn_bedroom_vine_plant: 23,
    inn_bedroom_runner_rug: 24,
    inn_bedroom_small_rug: 25,
    inn_bedroom_chest: 26,
    inn_bedroom_books: 27,
    inn_bedroom_wall_art: 28,
    inn_bedroom_blankets: 29,
    inn_bedroom_privacy_screen: 30,
    inn_bedroom_round_table: 31,
    inn_bedroom_exit_mat: 35,
    inn_bedroom_wall_south: 37,
    inn_bedroom_wall_side: 40,
    inn_bedroom_wall_side_left: 40,
    inn_bedroom_wall_side_right: 41
  };
  return frames[tileId] ?? null;
};

const weaponShopTileFrame = (tileId: string, x: number, y: number) => {
  if (tileId === 'armory_floor') {
    const roll = Math.abs((x * 17 + y * 11 + x * y * 5) % 11);
    if (roll === 0) return 2;
    if (roll < 3) return 1;
    return 0;
  }
  const frames: Record<string, number> = {
    armory_floor_dark: 3,
    armory_stone_floor: 4,
    armory_wall_base: 5,
    armory_wall_upper: 8,
    armory_wall_shadow: 10,
    armory_wall_side_left: 34,
    armory_wall_side_right: 36,
    armory_wall_south: 47,
    armory_exit: 11,
    armory_counter: 12,
    armory_counter_corner: 14,
    armory_sword_rack: 16,
    armory_spear_rack: 17,
    armory_shield_display: 18,
    armory_armor_stand: 19,
    armory_helmet_stand: 20,
    armory_sword_table: 21,
    armory_shield_crate: 22,
    armory_anvil: 23,
    armory_forge: 24,
    armory_brazier: 25,
    armory_barrel: 26,
    armory_crate: 27,
    armory_supply_shelf: 28,
    armory_rug_runner: 29,
    armory_rug_square: 30,
    armory_banner: 31,
    armory_lantern: 32,
    armory_display_case: 33,
    armory_corner_wall: 34,
    armory_wall_window: 35,
    armory_weapon_sign: 38,
    armory_armor_sign: 39,
    armory_weapon_crate: 42,
    armory_plant: 44,
    armory_stool: 45,
    armory_threshold: 46
  };
  return frames[tileId] ?? null;
};

const villageFrameSets: Record<Exclude<AreaTilesetId, 'greenhollow' | 'overworld_main' | 'mossvale_cave' | 'dustbridge_ruins' | 'flooded_shrine' | 'ironvein_fortress' | 'eclipse_tower'>, VillageFrameSet> = {
  waymeet: {
    grass: [frame(0, 0), frame(1, 0), frame(0, 1)],
    grassVariant: frame(1, 0),
    flower: frame(2, 1),
    tallGrass: frame(7, 1),
    path: { isolated: frame(3, 0), vertical: frame(4, 0), horizontal: frame(5, 0), junction: frame(6, 0) },
    fence: { isolated: frame(9, 0), vertical: frame(9, 1), horizontal: frame(8, 0), junction: frame(8, 1) },
    roof: { left: frame(3, 1), middle: frame(4, 1), right: frame(5, 1) },
    wall: frame(3, 2),
    wallUpper: frame(4, 2),
    wallShadow: frame(5, 2),
    door: frame(4, 3),
    shopSign: frame(5, 3),
    saveCrystal: frame(6, 3),
    woodFloor: [frame(3, 2), frame(4, 2)],
    stoneFloor: [frame(0, 4), frame(1, 4)],
    water: [frame(7, 4), frame(8, 4)],
    bridge: frame(6, 4),
    gate: frame(5, 4)
  },
  lumaire: {
    grass: [frame(0, 0), frame(1, 0), frame(2, 0)],
    grassVariant: frame(1, 0),
    flower: frame(4, 4),
    tallGrass: frame(8, 4),
    path: { isolated: frame(3, 0), vertical: frame(4, 0), horizontal: frame(5, 0), junction: frame(6, 0) },
    fence: { isolated: frame(4, 0), vertical: frame(5, 0), horizontal: frame(4, 0), junction: frame(5, 0) },
    roof: { left: frame(3, 1), middle: frame(4, 1), right: frame(5, 1) },
    wall: frame(4, 1),
    wallUpper: frame(5, 1),
    wallShadow: frame(6, 1),
    door: frame(8, 3),
    shopSign: frame(5, 5),
    saveCrystal: frame(2, 4),
    woodFloor: [frame(3, 0), frame(4, 0), frame(5, 0)],
    stoneFloor: [frame(4, 0), frame(5, 0), frame(3, 1), frame(4, 1)],
    water: [frame(0, 1), frame(1, 1), frame(0, 2), frame(1, 2)],
    bridge: frame(2, 2),
    gate: frame(8, 3)
  },
  ironmarch: {
    grass: [frame(0, 0), frame(1, 0), frame(0, 1)],
    grassVariant: frame(1, 0),
    flower: frame(4, 4),
    tallGrass: frame(8, 4),
    path: { isolated: frame(3, 0), vertical: frame(4, 0), horizontal: frame(5, 0), junction: frame(6, 0) },
    fence: { isolated: frame(5, 2), vertical: frame(6, 2), horizontal: frame(7, 2), junction: frame(8, 2) },
    roof: { left: frame(0, 1), middle: frame(1, 1), right: frame(2, 1) },
    wall: frame(3, 2),
    wallUpper: frame(4, 2),
    wallShadow: frame(5, 2),
    door: frame(3, 3),
    shopSign: frame(4, 3),
    saveCrystal: frame(5, 4),
    woodFloor: [frame(2, 3), frame(3, 3)],
    stoneFloor: [frame(6, 0), frame(7, 0), frame(8, 0)],
    water: [frame(0, 4), frame(1, 4)],
    bridge: frame(6, 3),
    gate: frame(6, 1)
  },
  sunspire: {
    grass: [frame(0, 0), frame(1, 0), frame(2, 0)],
    grassVariant: frame(1, 0),
    flower: frame(7, 4),
    tallGrass: frame(8, 4),
    path: { isolated: frame(3, 0), vertical: frame(4, 0), horizontal: frame(5, 0), junction: frame(6, 0) },
    fence: { isolated: frame(0, 3), vertical: frame(1, 3), horizontal: frame(2, 3), junction: frame(3, 3) },
    roof: { left: frame(2, 1), middle: frame(3, 1), right: frame(4, 1) },
    wall: frame(0, 2),
    wallUpper: frame(0, 1),
    wallShadow: frame(1, 2),
    door: frame(5, 3),
    shopSign: frame(4, 3),
    saveCrystal: frame(5, 4),
    woodFloor: [frame(5, 2), frame(6, 2)],
    stoneFloor: [frame(0, 0), frame(1, 0), frame(2, 0)],
    water: [frame(0, 4), frame(1, 4)],
    bridge: frame(2, 4),
    gate: frame(6, 3)
  }
};

const villageTileFrame = (tilesetId: keyof typeof villageFrameSets, map: MapDefinition, tileId: string, x: number, y: number, layer: TileLayerName) => {
  const frames = villageFrameSets[tilesetId];
  if (tileId === 'grass_plain') return pickFrame(frames.grass, x, y);
  if (tileId === 'grass_variant') return frames.grassVariant;
  if (tileId === 'flower_grass') return frames.flower;
  if (tileId === 'tall_grass') return frames.tallGrass;
  if (tileId === 'dirt_path' || tileId === 'road_stone') return connectedFrame(map, layer, x, y, tileId, frames.path);
  if (tileId === 'wood_fence') return connectedFrame(map, layer, x, y, tileId, frames.fence);
  if (tileId === 'building_roof') return roofFrame(map, layer, x, y, frames.roof);
  if (tileId === 'building_wall') return frames.wall;
  if (tileId === 'building_wall_upper') return frames.wallUpper;
  if (tileId === 'building_wall_upper_shadow') return frames.wallShadow;
  if (tileId === 'door_house') return frames.door;
  if (tileId === 'shop_sign') return frames.shopSign;
  if (tileId === 'save_crystal') return frames.saveCrystal;
  if (tileId === 'wood_floor') return pickFrame(frames.woodFloor, x, y);
  if (tileId === 'stone_floor') return pickFrame(frames.stoneFloor, x, y);
  if (tileId === 'water_shallow' || tileId === 'water_deep') return pickFrame(frames.water, x, y);
  if (tileId === 'wood_bridge_horizontal') return frames.bridge;
  if (tileId === 'castle_gate' || tileId === 'tower_gate' || tileId === 'town_marker') return frames.gate;
  return null;
};

const dungeonFrameSets: Record<Exclude<AreaTilesetId, 'greenhollow' | 'overworld_main' | 'waymeet' | 'lumaire' | 'ironmarch' | 'sunspire'>, DungeonFrameSet> = {
  mossvale_cave: {
    id: 'mossvale_cave',
    floor: frame(2, 5, 16),
    accent: frame(3, 5, 16),
    wall: frame(8, 0, 16),
    cliff: frame(8, 2, 16),
    water: frame(6, 0, 16),
    lava: frame(7, 0, 16),
    stairsUp: frame(0, 4, 16),
    stairsDown: frame(1, 4, 16),
    chest: frame(10, 5, 16),
    saveCrystal: frame(2, 4, 16),
    gate: frame(3, 4, 16),
    fence: frame(4, 4, 16)
  },
  dustbridge_ruins: {
    id: 'dustbridge_ruins',
    floor: frame(4, 0),
    accent: frame(5, 0),
    wall: frame(0, 2),
    cliff: frame(0, 2),
    water: frame(4, 0),
    lava: frame(5, 0),
    stairsUp: frame(6, 2),
    stairsDown: frame(7, 2),
    chest: frame(8, 4),
    saveCrystal: frame(6, 4),
    gate: frame(7, 1),
    fence: frame(2, 4)
  },
  flooded_shrine: {
    id: 'flooded_shrine',
    floor: frame(2, 1),
    accent: frame(2, 1),
    wall: frame(0, 3),
    cliff: frame(0, 3),
    water: frame(0, 2),
    lava: frame(2, 1),
    stairsUp: frame(6, 2),
    stairsDown: frame(7, 2),
    chest: frame(8, 4),
    saveCrystal: frame(4, 4),
    gate: frame(7, 3),
    fence: frame(5, 4)
  },
  ironvein_fortress: {
    id: 'ironvein_fortress',
    floor: frame(0, 0),
    accent: frame(4, 0),
    wall: frame(0, 1),
    cliff: frame(0, 2),
    water: frame(0, 0),
    lava: frame(5, 4),
    stairsUp: frame(6, 1),
    stairsDown: frame(7, 1),
    chest: frame(8, 4),
    saveCrystal: frame(4, 5),
    gate: frame(8, 1),
    fence: frame(3, 2),
    props: {
      armory_floor_dark: frame(4, 0),
      armory_stone_floor: frame(0, 0),
      armory_spear_rack: frame(4, 2),
      armory_shield_display: frame(5, 2),
      armory_crate: frame(8, 3),
      armory_anvil: frame(4, 3),
      armory_forge: frame(5, 3),
      armory_brazier: frame(6, 3)
    }
  },
  eclipse_tower: {
    id: 'eclipse_tower',
    floor: frame(0, 0),
    accent: frame(3, 0),
    wall: frame(0, 1),
    cliff: frame(0, 2),
    water: frame(3, 0),
    lava: frame(5, 0),
    stairsUp: frame(6, 1),
    stairsDown: frame(7, 1),
    chest: frame(8, 4),
    saveCrystal: frame(4, 4),
    gate: frame(8, 1),
    fence: frame(3, 2)
  }
};

const dungeonTileFrame = (tilesetId: keyof typeof dungeonFrameSets, tileId: string, x: number, y: number) => {
  const frames = dungeonFrameSets[tilesetId];
  const prop = frames.props?.[tileId];
  if (prop !== undefined) return pickFrame(prop, x, y);
  if (tileId === 'cave_floor' || tileId === 'dungeon_floor' || tileId === 'shrine_floor' || tileId === 'stone_floor') return pickFrame(frames.floor, x, y);
  if (tileId === 'road_stone' || tileId === 'armory_floor_dark') return pickFrame(frames.accent, x, y);
  if (tileId === 'mountain_wall' || tileId === 'building_wall' || tileId === 'building_wall_upper') return pickFrame(frames.wall, x, y);
  if (tileId === 'cliff_face') return pickFrame(frames.cliff, x, y);
  if (tileId === 'water_shallow' || tileId === 'water_deep') return pickFrame(frames.water, x, y);
  if (tileId === 'lava') return pickFrame(frames.lava, x, y);
  if (tileId === 'stairs_up') return frames.stairsUp;
  if (tileId === 'stairs_down') return frames.stairsDown;
  if (tileId === 'chest_closed') return frames.chest;
  if (tileId === 'save_crystal') return frames.saveCrystal;
  if (tileId === 'castle_gate' || tileId === 'tower_gate' || tileId === 'cave_mouth' || tileId === 'door_house') return frames.gate;
  if (tileId === 'wood_fence') return frames.fence;
  return null;
};

export const areaTilesetIdForMap = (map: MapDefinition): AreaTilesetId | 'weapon_shop' | 'inn' | null => {
  if (map.defaultBiome === 'inn') return 'inn';
  if (map.defaultBiome === 'armoryShop') return 'weapon_shop';
  if (map.id === 'overworld_main') return 'overworld_main';
  if (map.id === 'greenhollow') return 'greenhollow';
  if (map.id.startsWith('waymeet')) return 'waymeet';
  if (map.id.startsWith('lumaire')) return 'lumaire';
  if (map.id.startsWith('ironmarch')) return 'ironmarch';
  if (map.id.startsWith('sunspire')) return 'sunspire';
  if (map.id.startsWith('mossvale')) return 'mossvale_cave';
  if (map.id.startsWith('dustbridge_ruins')) return 'dustbridge_ruins';
  if (map.id.startsWith('flooded_shrine')) return 'flooded_shrine';
  if (map.id.startsWith('ironvein_fortress')) return 'ironvein_fortress';
  if (map.id.startsWith('eclipse_tower')) return 'eclipse_tower';
  return null;
};

export const tilesetKeyForMap = (map: MapDefinition) => {
  const tilesetId = areaTilesetIdForMap(map);
  return tilesetId ? textureKeyForTileset(tilesetId) : null;
};

export const resolveTileVisual = ({ map, tileId, x, y, layer, lockedTransition = false }: TileVisualContext): TileVisual => {
  const bedroomFrame = bedroomInnTileFrame(tileId);
  if (bedroomFrame !== null) return { textureKey: textureKeyForTileset('inn_bedroom'), frame: bedroomFrame };

  const lobbyFrame = lobbyInnTileFrame(tileId);
  if (lobbyFrame !== null) return { textureKey: textureKeyForTileset('inn_lobby'), frame: lobbyFrame };

  if (map.defaultBiome === 'inn') {
    const innFrame = innTileFrame(tileId, lockedTransition);
    if (innFrame !== null) return { textureKey: textureKeyForTileset('inn'), frame: innFrame };
  }

  if (map.defaultBiome === 'armoryShop') {
    const frameId = weaponShopTileFrame(tileId, x, y);
    if (frameId !== null) return { textureKey: textureKeyForTileset('weapon_shop'), frame: frameId };
  }

  if (map.id === 'greenhollow') {
    const frameId = greenhollowTileFrame(map, tileId, x, y, layer);
    if (frameId !== null) return { textureKey: textureKeyForTileset('greenhollow'), frame: frameId };
  }

  if (map.id === 'overworld_main') {
    const detailFrame = overworldDetailFrame(tileId);
    if (detailFrame !== null) return { textureKey: 'tiles:overworld-greenhollow-details', frame: detailFrame };
    const frameId = overworldTileFrame(map, tileId, x, y, layer);
    if (frameId !== null) return { textureKey: textureKeyForTileset('overworld_main'), frame: frameId };
  }

  const areaTilesetId = areaTilesetIdForMap(map);
  if (areaTilesetId && areaTilesetId in villageFrameSets) {
    const frameId = villageTileFrame(areaTilesetId as keyof typeof villageFrameSets, map, tileId, x, y, layer);
    if (frameId !== null) return { textureKey: textureKeyForTileset(areaTilesetId), frame: frameId };
  }
  if (areaTilesetId && areaTilesetId in dungeonFrameSets) {
    const frameId = dungeonTileFrame(areaTilesetId as keyof typeof dungeonFrameSets, tileId, x, y);
    if (frameId !== null) return { textureKey: textureKeyForTileset(areaTilesetId), frame: frameId };
  }

  return { textureKey: `tile:${tileId}` };
};

export const buildTilesetUsageReport = (maps: Record<string, MapDefinition>): TileUsageReport => {
  const unresolved: TileUsageIssue[] = [];
  const summaries: TileUsageMapSummary[] = [];
  let tileCount = 0;

  for (const map of Object.values(maps)) {
    const textureKeys = new Set<string>();
    let mapTileCount = 0;
    let mapUnresolvedCount = 0;
    for (const layer of TILE_VISUAL_LAYERS) {
      for (let y = 0; y < map.layers[layer].length; y += 1) {
        const row = map.layers[layer][y];
        for (let x = 0; x < row.length; x += 1) {
          const tile = row[x];
          if (!tile) continue;
          const visual = resolveTileVisual({ map, tileId: tile.id, x, y, layer });
          mapTileCount += 1;
          tileCount += 1;
          if (visual.hidden) continue;
          textureKeys.add(visual.textureKey);
          if (visual.textureKey.startsWith('tile:')) {
            mapUnresolvedCount += 1;
            unresolved.push({ mapId: map.id, layer, x, y, tileId: tile.id, textureKey: visual.textureKey });
          }
        }
      }
    }
    summaries.push({
      mapId: map.id,
      name: map.name,
      primaryTilesetKey: tilesetKeyForMap(map),
      textureKeys: [...textureKeys].sort(),
      tileCount: mapTileCount,
      unresolvedCount: mapUnresolvedCount
    });
  }

  return {
    mapCount: summaries.length,
    tileCount,
    unresolved,
    maps: summaries
  };
};

export const formatTilesetUsageReport = (report: TileUsageReport) => {
  const lines = [
    `Tileset usage: ${report.mapCount} maps, ${report.tileCount} placed tiles`,
    `Unresolved procedural tile fallbacks: ${report.unresolved.length}`
  ];
  if (report.unresolved.length > 0) {
    lines.push('First unresolved tiles:');
    for (const issue of report.unresolved.slice(0, 20)) {
      lines.push(`- ${issue.mapId} ${issue.layer} (${issue.x},${issue.y}) ${issue.tileId} -> ${issue.textureKey}`);
    }
  }
  lines.push('Map tilesets:');
  for (const map of report.maps) {
    lines.push(`- ${map.mapId}: ${map.textureKeys.join(', ') || 'none'}${map.unresolvedCount > 0 ? ` (${map.unresolvedCount} unresolved)` : ''}`);
  }
  return lines.join('\n');
};
