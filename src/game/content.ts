import {
  EncounterDefinition,
  EnemyDefinition,
  EnemyEntity,
  CollisionShape,
  CombatStats,
  DropDefinition,
  EquipmentSlot,
  ItemDefinition,
  MapDefinition,
  NPCDefinition,
  PlacedTile,
  QuestDefinition,
  Region,
  ShopDefinition,
  SpawnPoint,
  SpellDefinition,
  TILE_SIZE,
  TileDefinition,
  TileGrid,
  TileLayerName,
  Transition
} from './types';

const tile = (id: string): PlacedTile => ({ id });
const blank = (width: number, height: number): TileGrid =>
  Array.from({ length: height }, () => Array.from({ length: width }, () => null));
const filled = (width: number, height: number, id: string): TileGrid =>
  Array.from({ length: height }, () => Array.from({ length: width }, () => tile(id)));
const layers = (width: number, height: number, ground: string): Record<TileLayerName, TileGrid> => ({
  ground: filled(width, height, ground),
  lowerObject: blank(width, height),
  upperObject: blank(width, height),
  effects: blank(width, height)
});

const setTile = (grid: TileGrid, x: number, y: number, id: string) => {
  if (grid[y]?.[x] !== undefined) grid[y][x] = tile(id);
};

const rect = (grid: TileGrid, x: number, y: number, width: number, height: number, id: string) => {
  for (let yy = y; yy < y + height; yy += 1) {
    for (let xx = x; xx < x + width; xx += 1) setTile(grid, xx, yy, id);
  }
};

const line = (grid: TileGrid, fromX: number, fromY: number, toX: number, toY: number, id: string) => {
  let x = fromX;
  let y = fromY;
  while (x !== toX) {
    setTile(grid, x, y, id);
    x += Math.sign(toX - x);
  }
  while (y !== toY) {
    setTile(grid, x, y, id);
    y += Math.sign(toY - y);
  }
  setTile(grid, toX, toY, id);
};

const trail = (grid: TileGrid, fromX: number, fromY: number, toX: number, toY: number, id: string) => {
  let x = fromX;
  let y = fromY;
  const dx = Math.abs(toX - fromX);
  const dy = Math.abs(toY - fromY);
  const sx = fromX < toX ? 1 : -1;
  const sy = fromY < toY ? 1 : -1;
  let err = dx - dy;
  setTile(grid, x, y, id);
  while (x !== toX || y !== toY) {
    const previousX = x;
    const previousY = y;
    const e2 = err * 2;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
    if (x !== previousX && y !== previousY) setTile(grid, x, previousY, id);
    setTile(grid, x, y, id);
  }
};

const TILE_ROWS = [
    ['grass_plain', 'grass', true, null, 'grass', 'ground', 0x68b64d],
    ['grass_variant', 'grass', true, null, 'grass', 'ground', 0x74c95c],
    ['tall_grass', 'grass', true, null, 'grass', 'ground', 0x3f8f3b],
    ['flower_grass', 'grass', true, null, 'grass', 'ground', 0x83c85f],
    ['field_grass_detail', 'grassDetail', true, null, 'grass', 'effects', 0x9bd874],
    ['field_flower_detail', 'grassDetail', true, null, 'grass', 'effects', 0xf6dc5f],
    ['field_tall_grass_detail', 'grassDetail', true, null, 'grass', 'effects', 0x2f7e2e],
    ['field_clover_detail', 'grassDetail', true, null, 'grass', 'effects', 0x4f9a42],
    ['field_dirt_scuff_detail', 'grassDetail', true, null, 'grass', 'effects', 0xb98245],
    ['dirt_path', 'road', true, null, 'road', 'ground', 0xb98245],
    ['road_stone', 'road', true, null, 'road', 'ground', 0x97907c],
    ['sand_plain', 'sand', true, null, 'sand', 'ground', 0xd7c16d],
    ['stone_floor', 'floor', true, null, 'floor', 'ground', 0x85818a],
    ['wood_floor', 'floor', true, null, 'floor', 'ground', 0x9a6333],
    ['cave_floor', 'cave', true, null, 'cave', 'ground', 0x5f5147],
    ['dungeon_floor', 'dungeon', true, null, 'dungeon', 'ground', 0x4a4b61],
    ['shrine_floor', 'shrine', true, null, 'shrine', 'ground', 0x6678a8],
    ['water_deep', 'water', false, 'full', 'water', 'ground', 0x2477b8],
    ['water_shallow', 'water', true, null, 'water', 'ground', 0x49a7cf],
    ['lava', 'hazard', false, 'full', 'lava', 'ground', 0xe05c2f],
    ['mountain_wall', 'mountain', false, 'full', 'mountain', 'lowerObject', 0x706b60],
    ['cliff_face', 'mountain', false, 'full', 'mountain', 'lowerObject', 0x5a5048],
    ['tree_trunk', 'tree', false, 'full', 'forest', 'lowerObject', 0x6b3d1e],
    ['tree_canopy', 'tree', true, null, 'forest', 'upperObject', 0x2f7d32],
    ['bush', 'tree', false, 'full', 'forest', 'lowerObject', 0x2f9d4f],
    ['building_wall', 'building', false, 'full', 'town', 'lowerObject', 0x8c5d43],
    ['building_wall_upper', 'building', false, 'full', 'town', 'lowerObject', 0xa87955],
    ['building_wall_upper_shadow', 'building', false, 'full', 'town', 'lowerObject', 0x7d523c],
    ['building_roof', 'building', false, 'full', 'town', 'upperObject', 0xb44242],
    ['door_house', 'door', true, null, 'town', 'lowerObject', 0x5c3823],
    ['shop_sign', 'sign', true, null, 'town', 'upperObject', 0xf2d36f],
    ['wood_bridge_horizontal', 'bridge', true, null, 'bridge', 'ground', 0xa66d3a],
    ['wood_fence', 'fence', false, 'full', 'town', 'lowerObject', 0x9c6b3d],
    ['chest_closed', 'chest', false, 'full', 'floor', 'lowerObject', 0xa66d22],
    ['save_crystal', 'savePoint', true, null, 'floor', 'effects', 0x6edcff],
    ['stairs_up', 'transition', true, null, 'floor', 'lowerObject', 0xc5b58b],
    ['stairs_down', 'transition', true, null, 'floor', 'lowerObject', 0x7e705d],
    ['town_marker', 'town', true, null, 'town', 'lowerObject', 0xe4d1a3],
    ['cave_mouth', 'door', true, null, 'mountain', 'lowerObject', 0x2f2521],
    ['castle_gate', 'door', true, null, 'castle', 'lowerObject', 0x7c7c88],
    ['tower_gate', 'door', true, null, 'shrine', 'lowerObject', 0x4f477c],
    ['armory_floor', 'floor', true, null, 'floor', 'ground', 0x9b6232],
    ['armory_floor_dark', 'floor', true, null, 'floor', 'ground', 0x5d3a22],
    ['armory_stone_floor', 'floor', true, null, 'floor', 'ground', 0x696763],
    ['armory_wall_upper', 'building', false, 'full', 'interiorWall', 'lowerObject', 0xb99167],
    ['armory_wall_base', 'building', false, 'full', 'interiorWall', 'lowerObject', 0x795a3e],
    ['armory_wall_shadow', 'building', false, 'full', 'interiorWall', 'lowerObject', 0x5a4636],
    ['armory_wall_side_left', 'building', false, 'full', 'interiorWall', 'lowerObject', 0x9a6444],
    ['armory_wall_side_right', 'building', false, 'full', 'interiorWall', 'lowerObject', 0x9a6444],
    ['armory_wall_south', 'building', false, 'full', 'interiorWall', 'lowerObject', 0x9c7351],
    ['armory_exit', 'transition', true, null, 'floor', 'lowerObject', 0x3c2a1f],
    ['armory_counter', 'counter', false, 'full', 'counter', 'lowerObject', 0x9b5e2d],
    ['armory_counter_corner', 'counter', false, 'full', 'counter', 'lowerObject', 0x8a5128],
    ['armory_sword_rack', 'weaponDisplay', false, 'full', 'prop', 'lowerObject', 0x9d713d],
    ['armory_spear_rack', 'weaponDisplay', false, 'full', 'prop', 'lowerObject', 0x8f693f],
    ['armory_shield_display', 'armorDisplay', false, 'full', 'prop', 'lowerObject', 0x7e694d],
    ['armory_armor_stand', 'armorDisplay', false, 'full', 'prop', 'lowerObject', 0x8a8178],
    ['armory_helmet_stand', 'armorDisplay', false, 'full', 'prop', 'lowerObject', 0x89877f],
    ['armory_sword_table', 'weaponDisplay', false, 'full', 'prop', 'lowerObject', 0x8a5730],
    ['armory_shield_crate', 'armorDisplay', false, 'full', 'prop', 'lowerObject', 0x7a5438],
    ['armory_anvil', 'forge', false, 'full', 'prop', 'lowerObject', 0x57514c],
    ['armory_forge', 'forge', false, 'full', 'prop', 'lowerObject', 0x443833],
    ['armory_brazier', 'forge', false, 'full', 'prop', 'lowerObject', 0xb55c22],
    ['armory_barrel', 'prop', false, 'full', 'prop', 'lowerObject', 0x7b4f2b],
    ['armory_crate', 'prop', false, 'full', 'prop', 'lowerObject', 0x8b5a2e],
    ['armory_supply_shelf', 'shelf', false, 'full', 'prop', 'lowerObject', 0x745332],
    ['armory_rug_runner', 'rug', true, null, 'rug', 'lowerObject', 0x8e3d31],
    ['armory_rug_square', 'rug', true, null, 'rug', 'lowerObject', 0x8e3d31],
    ['armory_banner', 'wallDecor', true, null, 'wallDecor', 'upperObject', 0x8e2f24],
    ['armory_lantern', 'light', true, null, 'prop', 'effects', 0xf2c35a],
    ['armory_display_case', 'displayCase', false, 'full', 'prop', 'lowerObject', 0x7d5c3c],
    ['armory_corner_wall', 'building', false, 'full', 'interiorWall', 'lowerObject', 0x8b6848],
    ['armory_wall_window', 'building', false, 'full', 'interiorWall', 'lowerObject', 0x8b6848],
    ['armory_weapon_sign', 'sign', true, null, 'wallDecor', 'upperObject', 0x3e5d9a],
    ['armory_armor_sign', 'sign', true, null, 'wallDecor', 'upperObject', 0x426d39],
    ['armory_weapon_crate', 'weaponDisplay', false, 'full', 'prop', 'lowerObject', 0x765438],
    ['armory_plant', 'prop', false, 'full', 'prop', 'lowerObject', 0x4f8b3b],
    ['armory_stool', 'prop', false, 'full', 'prop', 'lowerObject', 0x8b5b30],
    ['armory_threshold', 'transition', true, null, 'floor', 'lowerObject', 0x7a5d42],
    ['inn_floor', 'floor', true, null, 'floor', 'ground', 0x91602f],
    ['inn_floor_parquet', 'floor', true, null, 'floor', 'ground', 0x9a6a38],
    ['inn_floor_dark', 'floor', true, null, 'floor', 'ground', 0x60391f],
    ['inn_bedroom_floor_a', 'floor', true, null, 'floor', 'ground', 0x9a642f],
    ['inn_bedroom_floor_b', 'floor', true, null, 'floor', 'ground', 0x8f592a],
    ['inn_bedroom_floor_c', 'floor', true, null, 'floor', 'ground', 0xa86c34],
    ['inn_bedroom_floor_d', 'floor', true, null, 'floor', 'ground', 0x875027],
    ['inn_bedroom_floor_e', 'floor', true, null, 'floor', 'ground', 0xb07136],
    ['inn_bedroom_floor_f', 'floor', true, null, 'floor', 'ground', 0x9e622e],
    ['inn_bedroom_floor_g', 'floor', true, null, 'floor', 'ground', 0xa96b31],
    ['inn_bedroom_floor_h', 'floor', true, null, 'floor', 'ground', 0x8a542a],
    ['inn_stone_floor', 'floor', true, null, 'floor', 'ground', 0x777067],
    ['inn_bedroom_wall', 'building', false, 'full', 'interiorWall', 'lowerObject', 0x8b5a34],
    ['inn_bedroom_window_left', 'building', false, 'full', 'interiorWall', 'lowerObject', 0x5f8bc0],
    ['inn_bedroom_window_right', 'building', false, 'full', 'interiorWall', 'lowerObject', 0x5f8bc0],
    ['inn_bedroom_wall_side', 'building', false, 'full', 'interiorWall', 'lowerObject', 0x6f4426],
    ['inn_bedroom_wall_side_left', 'building', false, 'full', 'interiorWall', 'lowerObject', 0x6f4426],
    ['inn_bedroom_wall_side_right', 'building', false, 'full', 'interiorWall', 'lowerObject', 0x6f4426],
    ['inn_bedroom_wall_south', 'building', false, 'full', 'interiorWall', 'lowerObject', 0x6a3e23],
    ['inn_bedroom_exit_mat', 'transition', true, null, 'floor', 'lowerObject', 0xb58c5a],
    ['inn_bedroom_bed', 'bed', false, 'full', 'prop', 'lowerObject', 0x3d6f45],
    ['inn_bedroom_nightstand_candle', 'light', false, 'full', 'prop', 'lowerObject', 0x8b5a2e],
    ['inn_bedroom_wardrobe', 'furniture', false, 'full', 'prop', 'lowerObject', 0x7b4a28],
    ['inn_bedroom_dresser', 'furniture', false, 'full', 'prop', 'lowerObject', 0x8a552c],
    ['inn_bedroom_linen_shelf', 'shelf', false, 'full', 'prop', 'lowerObject', 0xa88463],
    ['inn_bedroom_plant', 'prop', false, 'full', 'prop', 'lowerObject', 0x4b8b44],
    ['inn_bedroom_round_rug', 'rug', true, null, 'rug', 'lowerObject', 0x406e3d],
    ['inn_bedroom_vine_plant', 'prop', false, 'full', 'prop', 'lowerObject', 0x486f36],
    ['inn_bedroom_runner_rug', 'rug', true, null, 'rug', 'lowerObject', 0x406e3d],
    ['inn_bedroom_small_rug', 'rug', true, null, 'rug', 'lowerObject', 0x406e3d],
    ['inn_bedroom_chest', 'furniture', false, 'full', 'prop', 'lowerObject', 0x6d4828],
    ['inn_bedroom_books', 'prop', false, 'full', 'prop', 'lowerObject', 0x3f624e],
    ['inn_bedroom_wall_art', 'wallDecor', false, 'full', 'interiorWall', 'lowerObject', 0x6f5d43],
    ['inn_bedroom_blankets', 'linen', false, 'full', 'prop', 'lowerObject', 0xd8d1c7],
    ['inn_bedroom_privacy_screen', 'screen', false, 'full', 'prop', 'lowerObject', 0x314a75],
    ['inn_bedroom_round_table', 'furniture', false, 'full', 'prop', 'lowerObject', 0x83542f],
    ['inn_wall_upper', 'building', false, 'full', 'interiorWall', 'lowerObject', 0xb88c5f],
    ['inn_wall_base', 'building', false, 'full', 'interiorWall', 'lowerObject', 0x7d5534],
    ['inn_wall_side_left', 'building', false, 'full', 'interiorWall', 'lowerObject', 0x7d5534],
    ['inn_wall_side_right', 'building', false, 'full', 'interiorWall', 'lowerObject', 0x7d5534],
    ['inn_wall_south', 'building', false, 'full', 'interiorWall', 'lowerObject', 0x8b6040],
    ['inn_window_wall', 'building', false, 'full', 'interiorWall', 'lowerObject', 0xa77950],
    ['inn_lamp_wall', 'building', false, 'full', 'interiorWall', 'lowerObject', 0xa77950],
    ['inn_fireplace_wall', 'fireplace', false, 'full', 'interiorWall', 'lowerObject', 0x5e4635],
    ['inn_door_inside', 'transition', true, null, 'floor', 'lowerObject', 0x4b2d1d],
    ['inn_exit_mat', 'transition', true, null, 'floor', 'lowerObject', 0xb58c5a],
    ['inn_counter', 'counter', false, 'full', 'counter', 'lowerObject', 0x9b622f],
    ['inn_counter_corner', 'counter', false, 'full', 'counter', 'lowerObject', 0xa87339],
    ['inn_plaque', 'sign', true, null, 'wallDecor', 'upperObject', 0xd0a55d],
    ['inn_lobby_couch_left', 'seating', false, 'full', 'prop', 'lowerObject', 0x42683d],
    ['inn_lobby_couch_right', 'seating', false, 'full', 'prop', 'lowerObject', 0x42683d],
    ['inn_lobby_armchair', 'seating', false, 'full', 'prop', 'lowerObject', 0x4c7042],
    ['inn_lobby_fireplace', 'fireplace', false, 'full', 'interiorWall', 'lowerObject', 0x6b4634],
    ['inn_lobby_wall_lamp', 'light', false, 'full', 'interiorWall', 'lowerObject', 0xd49b3b],
    ['inn_lobby_large_plant', 'prop', false, 'full', 'prop', 'lowerObject', 0x4b8b44],
    ['inn_lobby_bookshelf', 'shelf', false, 'full', 'prop', 'lowerObject', 0x7a4f2d],
    ['inn_lobby_coat_hooks', 'wallDecor', false, 'full', 'interiorWall', 'lowerObject', 0x7a4f2d],
    ['inn_lobby_rug_tl', 'rug', true, null, 'rug', 'ground', 0x445f35],
    ['inn_lobby_rug_t1', 'rug', true, null, 'rug', 'ground', 0x445f35],
    ['inn_lobby_rug_t2', 'rug', true, null, 'rug', 'ground', 0x445f35],
    ['inn_lobby_rug_tr', 'rug', true, null, 'rug', 'ground', 0x445f35],
    ['inn_lobby_rug_ml', 'rug', true, null, 'rug', 'ground', 0x445f35],
    ['inn_lobby_rug_m1', 'rug', true, null, 'rug', 'ground', 0x445f35],
    ['inn_lobby_rug_m2', 'rug', true, null, 'rug', 'ground', 0x445f35],
    ['inn_lobby_rug_mr', 'rug', true, null, 'rug', 'ground', 0x445f35],
    ['inn_lobby_rug_bl', 'rug', true, null, 'rug', 'ground', 0x445f35],
    ['inn_lobby_rug_b1', 'rug', true, null, 'rug', 'ground', 0x445f35],
    ['inn_lobby_rug_b2', 'rug', true, null, 'rug', 'ground', 0x445f35],
    ['inn_lobby_rug_br', 'rug', true, null, 'rug', 'ground', 0x445f35],
    ['inn_lobby_round_table', 'furniture', false, 'full', 'prop', 'lowerObject', 0x83542f],
    ['inn_lobby_supply_crate', 'prop', false, 'full', 'prop', 'lowerObject', 0x8b5a2e],
    ['inn_lobby_barrel', 'prop', false, 'full', 'prop', 'lowerObject', 0x7b4b25],
    ['inn_lobby_candle_table', 'light', false, 'full', 'prop', 'lowerObject', 0x8b5a2e],
    ['inn_lobby_coffee_table', 'furniture', false, 'full', 'prop', 'lowerObject', 0x83542f],
    ['inn_lobby_pillows', 'prop', false, 'full', 'prop', 'lowerObject', 0x8d4b3d],
    ['inn_lobby_flower_box', 'prop', false, 'full', 'prop', 'lowerObject', 0x5a7b3d],
    ['inn_lobby_painting', 'wallDecor', false, 'full', 'interiorWall', 'lowerObject', 0x6f5d43],
    ['inn_lobby_vase_table', 'furniture', false, 'full', 'prop', 'lowerObject', 0x8b5a2e],
    ['inn_lobby_banner', 'wallDecor', false, 'full', 'interiorWall', 'lowerObject', 0x405f38],
    ['inn_lobby_sideboard', 'furniture', false, 'full', 'prop', 'lowerObject', 0x7b4a28],
    ['inn_lobby_potted_plant', 'prop', false, 'full', 'prop', 'lowerObject', 0x4b8b44],
    ['inn_lobby_flower_counter', 'furniture', false, 'full', 'prop', 'lowerObject', 0x8b5a2e],
    ['inn_lobby_flowering_plant', 'prop', false, 'full', 'prop', 'lowerObject', 0x4b8b44],
    ['inn_lobby_stool', 'furniture', false, 'full', 'prop', 'lowerObject', 0x83542f],
    ['inn_lobby_chest', 'furniture', false, 'full', 'prop', 'lowerObject', 0x6d4828],
    ['inn_lobby_lantern', 'light', false, 'full', 'prop', 'lowerObject', 0xd49b3b],
    ['inn_lobby_curtain_window', 'building', false, 'full', 'interiorWall', 'lowerObject', 0x507d71],
    ['inn_rug_green', 'rug', true, null, 'rug', 'lowerObject', 0x406e3d],
    ['inn_rug_red', 'rug', true, null, 'rug', 'lowerObject', 0x8b342f],
    ['inn_rug_blue', 'rug', true, null, 'rug', 'lowerObject', 0x405c79],
    ['inn_bed_green', 'bed', false, 'full', 'prop', 'lowerObject', 0x3d6f45],
    ['inn_bed_green_foot', 'bed', false, 'full', 'prop', 'lowerObject', 0x315f3a],
    ['inn_bed_blue', 'bed', false, 'full', 'prop', 'lowerObject', 0x405c86],
    ['inn_bed_red', 'bed', false, 'full', 'prop', 'lowerObject', 0x8e3b35],
    ['inn_bed_side', 'bed', false, 'full', 'prop', 'lowerObject', 0x6d4b2f],
    ['inn_pillow_stack', 'linen', false, 'full', 'prop', 'lowerObject', 0xd8d1c7],
    ['inn_blanket_folded', 'linen', false, 'full', 'prop', 'lowerObject', 0x4268a0],
    ['inn_nightstand_candle', 'light', false, 'full', 'prop', 'lowerObject', 0x8b5a2e],
    ['inn_lamp_table', 'light', false, 'full', 'prop', 'lowerObject', 0x8b5a2e],
    ['inn_dresser', 'furniture', false, 'full', 'prop', 'lowerObject', 0x8a552c],
    ['inn_wardrobe', 'furniture', false, 'full', 'prop', 'lowerObject', 0x7b4a28],
    ['inn_chest', 'furniture', false, 'full', 'prop', 'lowerObject', 0x6d4828],
    ['inn_table', 'furniture', false, 'full', 'prop', 'lowerObject', 0x8b5a2e],
    ['inn_chair', 'furniture', false, 'full', 'prop', 'lowerObject', 0x77512f],
    ['inn_round_table', 'furniture', false, 'full', 'prop', 'lowerObject', 0x83542f],
    ['inn_bookshelf', 'shelf', false, 'full', 'prop', 'lowerObject', 0x7a4f2d],
    ['inn_barrel', 'prop', false, 'full', 'prop', 'lowerObject', 0x7b4b25],
    ['inn_crate', 'prop', false, 'full', 'prop', 'lowerObject', 0x8b5a2e],
    ['inn_plant', 'prop', false, 'full', 'prop', 'lowerObject', 0x4b8b44],
    ['inn_curtain_window', 'building', false, 'full', 'interiorWall', 'lowerObject', 0x806047],
    ['inn_linen_shelf', 'shelf', false, 'full', 'prop', 'lowerObject', 0xa88463],
    ['inn_folded_linen_shelf', 'shelf', false, 'full', 'prop', 'lowerObject', 0xa88463],
    ['inn_privacy_screen', 'screen', false, 'full', 'prop', 'lowerObject', 0x314a75],
    ['inn_rug_runner_red', 'rug', true, null, 'rug', 'lowerObject', 0x8b342f],
    ['inn_rug_runner_blue', 'rug', true, null, 'rug', 'lowerObject', 0x405c79],
    ['inn_rug_runner_green', 'rug', true, null, 'rug', 'lowerObject', 0x406e3d],
    ['inn_mat', 'rug', true, null, 'rug', 'lowerObject', 0xc3a36b]
  ] satisfies Array<[string, string, boolean, CollisionShape, string, TileLayerName, number]>;

export const TILE_DEFINITIONS = Object.fromEntries(
  TILE_ROWS.map(([id, family, walkable, collision, terrain, layerName, color]) => [
    id,
    {
      id,
      family,
      defaultProperties: {
        walkable: Boolean(walkable),
        collision,
        terrain,
        layer: layerName as TileLayerName,
        movementCost: id === 'tall_grass' || id === 'sand_plain' ? 1.15 : 1,
        occludesActor: layerName === 'upperObject',
        tags: [String(family), String(terrain)],
        color: Number(color)
      },
      variants: id === 'grass_plain' ? ['grass_plain', 'grass_variant', 'flower_grass'] : undefined,
      autotileRules: id.includes('water') || id.includes('road') ? 'neighbor-aware-placeholder' : null
    }
  ])
) as Record<string, TileDefinition>;

const equipment = (
  id: string,
  name: string,
  category: ItemDefinition['category'],
  slot: EquipmentSlot,
  price: number,
  stats: NonNullable<ItemDefinition['stats']>,
  description: string
): ItemDefinition => ({ id, name, category, equipmentSlot: slot, price, sellPrice: Math.floor(price * 0.45), stats, description });

const consumable = (
  id: string,
  name: string,
  price: number,
  effect: NonNullable<ItemDefinition['effect']>,
  description: string
): ItemDefinition => ({ id, name, category: 'consumable', price, sellPrice: Math.floor(price * 0.45), effect, description });

const ITEM_LIST = [
    consumable('small_potion', 'Small Potion', 12, { type: 'healHp', amount: 24 }, 'Restores 24 HP.'),
    consumable('potion', 'Potion', 32, { type: 'healHp', amount: 60 }, 'Restores 60 HP.'),
    consumable('ether', 'Ether', 44, { type: 'healMp', amount: 18 }, 'Restores 18 MP.'),
    consumable('antidote', 'Antidote', 18, { type: 'cureStatus' }, 'Cures poison and other simple status effects.'),
    consumable('revive_charm', 'Revive Charm', 140, { type: 'healHp', amount: 80 }, 'A late-game emergency charm.'),
    equipment('wooden_sword', 'Wooden Sword', 'weapon', 'weapon', 20, { attack: 2 }, 'A practice blade with real courage behind it.'),
    equipment('rusty_sword', 'Rusty Sword', 'weapon', 'weapon', 38, { attack: 4 }, 'Old iron, still sharp enough for slimes.'),
    equipment('iron_sword', 'Iron Sword', 'weapon', 'weapon', 90, { attack: 8 }, 'Reliable road-town steel.'),
    equipment('steel_sword', 'Steel Sword', 'weapon', 'weapon', 210, { attack: 14 }, 'A soldier-grade blade.'),
    equipment('silver_sword', 'Silver Sword', 'weapon', 'weapon', 430, { attack: 21, magic: 2 }, 'Bright metal made for cursed things.'),
    equipment('enchanted_blade', 'Enchanted Blade', 'weapon', 'weapon', 720, { attack: 28, magic: 5 }, 'A sword that hums near old magic.'),
    equipment('apprentice_staff', 'Apprentice Staff', 'weapon', 'weapon', 130, { attack: 3, magic: 7, maxMp: 5 }, 'A simple focus for new spellwork.'),
    equipment('master_staff', 'Master Staff', 'weapon', 'weapon', 640, { attack: 7, magic: 18, maxMp: 14 }, 'A carved focus from the Sunspire archives.'),
    equipment('cloth_cap', 'Cloth Cap', 'helmet', 'helmet', 14, { defense: 1 }, 'Better than bravery alone.'),
    equipment('leather_cap', 'Leather Cap', 'helmet', 'helmet', 55, { defense: 3 }, 'Road dust has met its match.'),
    equipment('mage_hood', 'Mage Hood', 'helmet', 'helmet', 120, { defense: 2, magic: 5, maxMp: 5 }, 'Keeps rain and stray thoughts out.'),
    equipment('steel_helmet', 'Steel Helmet', 'helmet', 'helmet', 230, { defense: 7 }, 'Heavy, honest protection.'),
    equipment('plate_helm', 'Plate Helm', 'helmet', 'helmet', 440, { defense: 11, maxHp: 8 }, 'Capital-grade defensive work.'),
    equipment('cloth_tunic', 'Cloth Tunic', 'bodyArmor', 'bodyArmor', 18, { defense: 2 }, 'A starter tunic.'),
    equipment('leather_armor', 'Leather Armor', 'bodyArmor', 'bodyArmor', 95, { defense: 6 }, 'Travel gear for dangerous roads.'),
    equipment('mage_robe', 'Mage Robe', 'bodyArmor', 'bodyArmor', 150, { defense: 4, magic: 7, maxMp: 10 }, 'Robes threaded with river-glass.'),
    equipment('chainmail', 'Chainmail', 'bodyArmor', 'bodyArmor', 280, { defense: 12, speed: -1 }, 'Strong enough to feel brave in.'),
    equipment('plate_armor', 'Plate Armor', 'bodyArmor', 'bodyArmor', 540, { defense: 19, speed: -2, maxHp: 16 }, 'Built for the end road.'),
    equipment('cloth_leggings', 'Cloth Leggings', 'legArmor', 'legArmor', 14, { defense: 1 }, 'Light starter legwear.'),
    equipment('leather_leggings', 'Leather Leggings', 'legArmor', 'legArmor', 70, { defense: 4, speed: 1 }, 'Quiet and quick.'),
    equipment('mage_trousers', 'Mage Trousers', 'legArmor', 'legArmor', 120, { defense: 3, magic: 3, maxMp: 5 }, 'Oddly comfortable.'),
    equipment('steel_greaves', 'Steel Greaves', 'legArmor', 'legArmor', 250, { defense: 8, speed: -1 }, 'For crossing worse roads.'),
    equipment('plate_greaves', 'Plate Greaves', 'legArmor', 'legArmor', 460, { defense: 12, maxHp: 8 }, 'Heavy endgame leg armor.'),
    equipment('small_shield', 'Small Shield', 'shield', 'shield', 28, { defense: 2 }, 'A round little promise.'),
    equipment('iron_shield', 'Iron Shield', 'shield', 'shield', 100, { defense: 6 }, 'Road-tested protection.'),
    equipment('tower_shield', 'Tower Shield', 'shield', 'shield', 320, { defense: 12, speed: -2 }, 'Almost a door.'),
    equipment('sunward_aegis', 'Sunward Aegis', 'shield', 'shield', 620, { defense: 17, magic: 3 }, 'A capital shield etched with warding marks.'),
    equipment('copper_ring', 'Copper Ring', 'accessory', 'accessory1', 85, { maxHp: 10 }, 'A cheap charm with warm metal.'),
    equipment('river_charm', 'River Charm', 'accessory', 'accessory1', 190, { maxMp: 12, magic: 3 }, 'Popular in Lumaire.'),
    equipment('ember_amulet', 'Ember Amulet', 'accessory', 'accessory1', 420, { attack: 3, magic: 4 }, 'Warm even in rain.'),
    { id: 'cave_relic', name: 'Cave Relic', category: 'keyItem', price: 0, keyItem: true, description: 'A moss-stained relic from Mossvale Cave.' },
    { id: 'road_seal', name: 'Road Seal', category: 'keyItem', price: 0, keyItem: true, description: 'Proof that Waymeet trusts you on the trade road.' },
    { id: 'shrine_lumen', name: 'Shrine Lumen', category: 'keyItem', price: 0, keyItem: true, description: 'A pulse of river-light sealed in glass.' },
    { id: 'iron_writ', name: 'Iron Writ', category: 'keyItem', price: 0, keyItem: true, description: 'A fortress writ opening the Sunspire road.' },
    { id: 'eclipse_key', name: 'Eclipse Key', category: 'keyItem', price: 0, keyItem: true, description: 'A key that drinks the color from nearby shadows.' }
  ] satisfies ItemDefinition[];

export const ITEMS = Object.fromEntries(ITEM_LIST.map((item) => [item.id, item])) as Record<string, ItemDefinition>;

const SPELL_LIST = [
    { id: 'spark', name: 'Spark', mpCost: 4, power: 13, kind: 'damage', element: 'lightning', description: 'A fast little bolt.' },
    { id: 'mend', name: 'Mend', mpCost: 5, power: 28, kind: 'healing', description: 'Restores HP in battle.' },
    { id: 'ember', name: 'Ember', mpCost: 7, power: 22, kind: 'damage', element: 'fire', description: 'Burns beasts and brambles.' },
    { id: 'river_mend', name: 'River Mend', mpCost: 9, power: 52, kind: 'healing', description: 'A stronger healing spell from Lumaire.' },
    { id: 'frost_rune', name: 'Frost Rune', mpCost: 10, power: 34, kind: 'damage', element: 'ice', description: 'Useful against iron and flame.' },
    { id: 'sunflare', name: 'Sunflare', mpCost: 16, power: 58, kind: 'damage', element: 'light', description: 'Late-game light magic.' }
  ] satisfies SpellDefinition[];

export const SPELLS = Object.fromEntries(SPELL_LIST.map((spell) => [spell.id, spell])) as Record<string, SpellDefinition>;

export const SHOPS: Record<string, ShopDefinition> = Object.fromEntries(
  [
    ['greenhollow_general', 'Greenhollow General', 'general', 'greenhollow', ['small_potion', 'antidote', 'rusty_sword', 'cloth_cap', 'cloth_tunic', 'cloth_leggings', 'small_shield']],
    ['waymeet_outfitter', 'Waymeet Outfitter', 'weapon', 'waymeet', ['potion', 'antidote', 'iron_sword', 'leather_cap', 'leather_armor', 'leather_leggings', 'iron_shield', 'copper_ring']],
    ['lumaire_arcana', 'Lumaire Arcana', 'magic', 'lumaire', ['potion', 'ether', 'ember', 'river_mend', 'frost_rune', 'apprentice_staff', 'mage_hood', 'mage_robe', 'mage_trousers', 'river_charm']],
    ['ironmarch_armory', 'Ironmarch Armory', 'armor', 'ironmarch', ['potion', 'ether', 'steel_sword', 'steel_helmet', 'chainmail', 'steel_greaves', 'tower_shield', 'ember_amulet']],
    ['sunspire_market', 'Sunspire Grand Market', 'specialty', 'sunspire', ['potion', 'ether', 'revive_charm', 'sunflare', 'silver_sword', 'enchanted_blade', 'master_staff', 'plate_helm', 'plate_armor', 'plate_greaves', 'sunward_aegis']]
  ].map(([id, name, type, townId, inventory]) => [
    id,
    { id, name, type, townId, inventory, buyMultiplier: 1, sellMultiplier: 0.45 } as ShopDefinition
  ])
);

const dropTableForEnemy = (family: string, biome: string, tier: number): DropDefinition[] => {
  const drops: DropDefinition[] = [{ itemId: tier > 4 ? 'potion' : 'small_potion', chance: tier > 7 ? 0.14 : 0.1 }];
  const poisonHabitats = new Set(['grassland', 'forest', 'cave', 'river', 'swamp']);
  const arcaneFamilies = new Set(['spirit', 'construct', 'human', 'cultist', 'angelic', 'shrineBoss', 'finalBoss']);

  if (poisonHabitats.has(biome) || ['slime', 'plant', 'insect'].includes(family)) {
    drops.push({ itemId: 'antidote', chance: tier > 4 ? 0.08 : 0.06 });
  }
  if (arcaneFamilies.has(family) || ['shrine', 'capital', 'eclipse', 'fortress'].includes(biome)) {
    drops.push({ itemId: 'ether', chance: tier > 6 ? 0.08 : 0.05 });
  }
  if (tier >= 8) drops.push({ itemId: 'revive_charm', chance: 0.035 });

  return drops;
};

const enemy = (id: string, name: string, family: string, biome: string, tier: number, color: number): EnemyDefinition => ({
  id,
  name,
  family,
  biome,
  stats: {
    hp: 18 + tier * 8,
    maxHp: 18 + tier * 8,
    mp: tier > 3 ? 6 + tier * 2 : 0,
    maxMp: tier > 3 ? 6 + tier * 2 : 0,
    attack: 4 + tier * 3,
    defense: 1 + tier * 2,
    speed: 4 + tier,
    magic: tier > 3 ? 3 + tier * 2 : tier
  },
  xp: 5 + tier * 6,
  gold: 4 + tier * 5,
  actions: [{ id: 'strike', label: 'Strike', power: 2 + tier, kind: 'physical', weight: 1 }],
  drops: dropTableForEnemy(family, biome, tier),
  color
});

const boss = (
  id: string,
  name: string,
  family: string,
  biome: string,
  tier: number,
  color: number,
  statOverrides: Partial<CombatStats> = {}
): EnemyDefinition => {
  const stats = {
    hp: 75 + tier * 30,
    maxHp: 75 + tier * 30,
    mp: 20 + tier * 8,
    maxMp: 20 + tier * 8,
    attack: 12 + tier * 5,
    defense: 7 + tier * 3,
    speed: 6 + tier,
    magic: 7 + tier * 4
  };
  Object.assign(stats, statOverrides);
  if (statOverrides.hp && statOverrides.maxHp === undefined) stats.maxHp = statOverrides.hp;
  if (statOverrides.maxHp && statOverrides.hp === undefined) stats.hp = statOverrides.maxHp;
  return {
    ...enemy(id, name, family, biome, tier, color),
    boss: true,
    stats,
    xp: 55 + tier * 35,
    gold: 60 + tier * 45,
    actions: [
      { id: 'heavy_strike', label: 'Heavy Strike', power: 7 + tier, kind: 'physical', weight: 2 },
      { id: 'dark_cast', label: 'Dark Cast', power: 9 + tier, kind: 'magic', weight: 1 }
    ]
  };
};

export const ENEMIES: Record<string, EnemyDefinition> = Object.fromEntries(
  [
    enemy('field_slime', 'Field Slime', 'slime', 'grassland', 1, 0x5ecf6d),
    enemy('mire_slug', 'Mire Slug', 'slime', 'grassland', 1, 0x6aa84f),
    enemy('pebble_imp', 'Pebble Imp', 'imp', 'grassland', 1, 0xb7a57a),
    enemy('grass_wolf', 'Grass Wolf', 'beast', 'grassland', 2, 0x87945d),
    enemy('road_rat', 'Road Rat', 'beast', 'road', 1, 0x8f745f),
    enemy('thistle_bat', 'Thistle Bat', 'beast', 'forest', 2, 0x704f96),
    enemy('cave_tick', 'Cave Tick', 'cave', 'cave', 2, 0x4a3328),
    enemy('moss_goblin', 'Moss Goblin', 'goblin', 'cave', 2, 0x4f9d61),
    enemy('drip_wisp', 'Drip Wisp', 'spirit', 'cave', 3, 0x59c0d8),
    enemy('bandit_cutpurse', 'Bandit Cutpurse', 'human', 'road', 3, 0x8c4035),
    enemy('bandit_archer', 'Bandit Archer', 'human', 'road', 3, 0x7d4e2d),
    enemy('dust_sprite', 'Dust Sprite', 'spirit', 'ruin', 3, 0xc9a45b),
    enemy('ruin_sentinel', 'Ruin Sentinel', 'construct', 'ruin', 4, 0x8b8274),
    enemy('river_eel', 'River Eel', 'beast', 'river', 4, 0x366c91),
    enemy('reed_stalker', 'Reed Stalker', 'plant', 'river', 4, 0x2f7d4d),
    enemy('hex_frog', 'Hex Frog', 'beast', 'swamp', 5, 0x4d8f62),
    enemy('mirror_wisp', 'Mirror Wisp', 'spirit', 'shrine', 5, 0x9bc7ff),
    enemy('shrine_adept', 'Shrine Adept', 'human', 'shrine', 5, 0x6d75d9),
    enemy('mine_mole', 'Mine Mole', 'beast', 'mountain', 5, 0x6f5846),
    enemy('iron_beetle', 'Iron Beetle', 'insect', 'mountain', 6, 0x586170),
    enemy('ember_bat', 'Ember Bat', 'beast', 'mine', 6, 0xd0663f),
    enemy('fort_guard', 'Fort Guard', 'human', 'fortress', 6, 0x9c9caa),
    enemy('fort_lancer', 'Fort Lancer', 'human', 'fortress', 7, 0x7f8190),
    enemy('smoke_alchemist', 'Smoke Alchemist', 'human', 'fortress', 7, 0x58576c),
    enemy('capital_duelist', 'Capital Duelist', 'human', 'capital', 8, 0xb4b1a5),
    enemy('sunspire_magus', 'Sunspire Magus', 'human', 'capital', 8, 0xf0c86a),
    enemy('eclipse_hound', 'Eclipse Hound', 'shadow', 'eclipse', 8, 0x313247),
    enemy('void_moth', 'Void Moth', 'shadow', 'eclipse', 9, 0x5f4b8b),
    enemy('hollow_knight', 'Hollow Knight', 'undead', 'eclipse', 9, 0x53606c),
    enemy('starved_gargoyle', 'Starved Gargoyle', 'demon', 'eclipse', 10, 0x777278),
    enemy('obsidian_acolyte', 'Obsidian Acolyte', 'cultist', 'eclipse', 10, 0x3d293f),
    enemy('eclipse_seraph', 'Eclipse Seraph', 'angelic', 'eclipse', 11, 0xc7bfdc),
    boss('bandit_captain_rusk', 'Bandit Captain Rusk', 'humanBoss', 'ruin', 3, 0xb13b2e, { hp: 140 }),
    boss('mire_warden', 'Mire Warden', 'shrineBoss', 'shrine', 5, 0x2e9d9f),
    boss('iron_castellan', 'Iron Castellan', 'humanBoss', 'fortress', 7, 0x9098a6, { hp: 250 }),
    boss('hollow_regent', 'Hollow Regent', 'finalBoss', 'eclipse', 11, 0x1d183b, { hp: 330 })
  ].map((e) => [e.id, e])
);

export const ENCOUNTERS: Record<string, EncounterDefinition> = Object.fromEntries(
  [
    ['slime_pair', 'Slime Pair', ['field_slime', 'mire_slug'], 'grassland', true],
    ['greenhollow_roamers', 'Greenhollow Roamers', ['field_slime', 'pebble_imp', 'thistle_bat'], 'grassland', true],
    ['grass_wolf_pack', 'Grass Wolf Pack', ['grass_wolf', 'road_rat'], 'grassland', true],
    ['moss_cave_pack', 'Moss Cave Pack', ['cave_tick', 'moss_goblin', 'drip_wisp'], 'cave', true],
    ['bandit_scouts', 'Bandit Scouts', ['bandit_cutpurse', 'bandit_archer'], 'road', true],
    ['dust_ruin_pack', 'Dust Ruin Pack', ['dust_sprite', 'ruin_sentinel'], 'ruin', true],
    ['river_menace', 'River Menace', ['river_eel', 'reed_stalker', 'hex_frog'], 'river', true],
    ['shrine_mirrors', 'Shrine Mirrors', ['mirror_wisp', 'shrine_adept'], 'shrine', true],
    ['iron_mine_pack', 'Iron Mine Pack', ['mine_mole', 'iron_beetle', 'ember_bat'], 'mine', true],
    ['fort_patrol', 'Fort Patrol', ['fort_guard', 'fort_lancer'], 'fortress', true],
    ['capital_duel', 'Capital Duel', ['capital_duelist', 'sunspire_magus'], 'capital', true],
    ['eclipse_pack', 'Eclipse Pack', ['eclipse_hound', 'void_moth', 'hollow_knight'], 'eclipse', true],
    ['eclipse_elite', 'Eclipse Elite', ['starved_gargoyle', 'obsidian_acolyte', 'eclipse_seraph'], 'eclipse', true],
    ['boss_rusk', 'Bandit Captain Rusk', ['bandit_captain_rusk'], 'ruin', false, 'banditCaptainDefeated', 'road_seal'],
    ['boss_mire_warden', 'Mire Warden', ['mire_warden'], 'shrine', false, 'mireWardenDefeated', 'shrine_lumen'],
    ['boss_iron_castellan', 'Iron Castellan', ['iron_castellan'], 'castle', false, 'ironCastellanDefeated', 'iron_writ'],
    ['boss_hollow_regent', 'Hollow Regent', ['hollow_regent'], 'eclipse', false, 'hollowRegentDefeated', undefined, true]
  ].map(([id, name, enemyIds, backdrop, escapeAllowed, questFlagOnVictory, keyItemOnVictory, endingOnVictory]) => [
    id,
    { id, name, enemyIds, backdrop, escapeAllowed, questFlagOnVictory, keyItemOnVictory, endingOnVictory } as EncounterDefinition
  ])
);

export const QUESTS: Record<string, QuestDefinition> = {
  cave_relic: {
    id: 'cave_relic',
    title: 'The Cave Relic',
    state: 'inactive',
    currentStep: 'retrieve_relic',
    steps: {
      speak_to_elder: { type: 'talk', npcId: 'greenhollow_elder', summary: 'Speak with Elder Rowan in Greenhollow.' },
      retrieve_relic: { type: 'findItem', itemId: 'cave_relic', summary: 'Recover the relic from Mossvale Cave.' },
      return_to_elder: { type: 'returnReport', npcId: 'greenhollow_elder', summary: 'Return the relic to Elder Rowan.' }
    },
    rewards: { gold: 70, flags: ['routeToWaymeetUnlocked'], items: ['iron_sword'] }
  },
  road_seal: {
    id: 'road_seal',
    title: 'Road Trouble',
    state: 'inactive',
    currentStep: 'defeat_rusk',
    steps: {
      defeat_rusk: { type: 'defeatEnemy', enemyId: 'bandit_captain_rusk', summary: 'Defeat Rusk in Dustbridge Ruins.' }
    },
    rewards: { gold: 120, flags: ['routeToLumaireUnlocked'] }
  },
  shrine_lumen: {
    id: 'shrine_lumen',
    title: 'The Flooded Shrine',
    state: 'inactive',
    currentStep: 'defeat_warden',
    steps: {
      defeat_warden: { type: 'defeatEnemy', enemyId: 'mire_warden', summary: 'Defeat the Mire Warden in the Flooded Shrine.' }
    },
    rewards: { gold: 180, flags: ['routeToIronmarchUnlocked'], spells: ['river_mend'] }
  },
  iron_writ: {
    id: 'iron_writ',
    title: 'Ironmarch Orders',
    state: 'inactive',
    currentStep: 'defeat_castellan',
    steps: {
      defeat_castellan: { type: 'defeatEnemy', enemyId: 'iron_castellan', summary: 'Defeat the Iron Castellan.' }
    },
    rewards: { gold: 240, flags: ['routeToSunspireUnlocked'] }
  },
  eclipse_key: {
    id: 'eclipse_key',
    title: 'The Eclipse Tower',
    state: 'inactive',
    currentStep: 'defeat_regent',
    steps: {
      defeat_regent: { type: 'defeatEnemy', enemyId: 'hollow_regent', summary: 'Climb Eclipse Tower and defeat the Hollow Regent.' }
    },
    rewards: { flags: ['mainGameComplete'] }
  }
};

const spawn = (id: string, x: number, y: number): SpawnPoint => ({ id, x, y, facing: 'south' });
const enemyEntity = (
  id: string,
  encounterId: string,
  x: number,
  y: number,
  behavior: EnemyEntity['behavior'],
  tier = 1,
  bossFlag = false
): EnemyEntity => ({
  id,
  encounterId,
  x,
  y,
  home: { x, y },
  roamingRadius: bossFlag ? 1 : 4 + tier,
  aggroRadius: bossFlag ? 2 : 4 + tier,
  moveSpeed: bossFlag ? 0 : 0.75 + tier * 0.08,
  behavior,
  respawn: bossFlag ? 'never' : 'onMapReload',
  boss: bossFlag
});

const entranceTransition = (
  id: string,
  fromMap: string,
  x: number,
  y: number,
  toMap: string,
  toSpawn: string,
  requiresFlag?: string,
  blockedMessage?: string
): Transition => ({
  id,
  fromMap,
  trigger: { type: 'bounds', bounds: { x, y, width: 1, height: 1 } },
  toMap,
  toSpawn,
  requiresFlag,
  blockedMessage,
  transitionStyle: 'fade'
});

const boundsTransition = (
  id: string,
  fromMap: string,
  x: number,
  y: number,
  width: number,
  height: number,
  toMap: string,
  toSpawn: string,
  requiresFlag?: string,
  blockedMessage?: string
): Transition => ({
  id,
  fromMap,
  trigger: { type: 'bounds', bounds: { x, y, width, height } },
  toMap,
  toSpawn,
  requiresFlag,
  blockedMessage,
  transitionStyle: 'fade'
});

const drawHouse = (mapLayers: Record<TileLayerName, TileGrid>, x: number, y: number) => {
  rect(mapLayers.lowerObject, x, y + 1, 4, 1, 'building_wall_upper');
  rect(mapLayers.lowerObject, x, y + 2, 4, 1, 'building_wall');
  rect(mapLayers.upperObject, x, y, 4, 1, 'building_roof');
  setTile(mapLayers.lowerObject, x + 1, y + 2, 'door_house');
};

const ARMORY_SHOP_TYPES = new Set(['general', 'weapon', 'armor', 'specialty']);

const decorateArmoryShop = (mapLayers: Record<TileLayerName, TileGrid>) => {
  rect(mapLayers.lowerObject, 1, 0, 18, 1, 'armory_wall_upper');
  rect(mapLayers.lowerObject, 1, 1, 18, 1, 'armory_wall_base');
  rect(mapLayers.lowerObject, 0, 0, 1, 12, 'armory_wall_side_left');
  rect(mapLayers.lowerObject, 19, 0, 1, 12, 'armory_wall_side_right');
  rect(mapLayers.lowerObject, 1, 11, 18, 1, 'armory_wall_south');
  setTile(mapLayers.lowerObject, 9, 11, 'armory_threshold');
  rect(mapLayers.lowerObject, 7, 4, 6, 1, 'armory_counter');
  setTile(mapLayers.lowerObject, 6, 4, 'armory_counter_corner');
  setTile(mapLayers.lowerObject, 13, 4, 'armory_counter_corner');
  setTile(mapLayers.lowerObject, 2, 2, 'armory_sword_rack');
  setTile(mapLayers.lowerObject, 4, 2, 'armory_spear_rack');
  setTile(mapLayers.lowerObject, 6, 2, 'armory_shield_display');
  setTile(mapLayers.lowerObject, 15, 2, 'armory_armor_stand');
  setTile(mapLayers.lowerObject, 17, 2, 'armory_helmet_stand');
  setTile(mapLayers.lowerObject, 3, 7, 'armory_weapon_crate');
  setTile(mapLayers.lowerObject, 5, 7, 'armory_shield_crate');
  setTile(mapLayers.lowerObject, 7, 7, 'armory_supply_shelf');
  setTile(mapLayers.lowerObject, 11, 7, 'armory_sword_table');
  setTile(mapLayers.lowerObject, 15, 7, 'armory_anvil');
  setTile(mapLayers.lowerObject, 17, 7, 'armory_barrel');
  setTile(mapLayers.lowerObject, 3, 9, 'armory_crate');
  setTile(mapLayers.lowerObject, 5, 9, 'armory_brazier');
  setTile(mapLayers.lowerObject, 12, 9, 'armory_rug_square');
  setTile(mapLayers.upperObject, 3, 1, 'armory_weapon_sign');
  setTile(mapLayers.upperObject, 16, 1, 'armory_armor_sign');
  setTile(mapLayers.effects, 18, 3, 'armory_lantern');
};

const makeShopInterior = (id: string, name: string, townId: string, shopId: string): MapDefinition => {
  const shop = SHOPS[shopId];
  const useArmoryTiles = ARMORY_SHOP_TYPES.has(shop.type);
  const mapLayers = layers(20, 12, useArmoryTiles ? 'armory_floor' : 'wood_floor');
  if (useArmoryTiles) {
    decorateArmoryShop(mapLayers);
  } else {
    rect(mapLayers.lowerObject, 0, 0, 20, 1, 'building_wall');
    rect(mapLayers.lowerObject, 0, 11, 20, 1, 'building_wall');
    rect(mapLayers.lowerObject, 0, 0, 1, 12, 'building_wall');
    rect(mapLayers.lowerObject, 19, 0, 1, 12, 'building_wall');
    rect(mapLayers.lowerObject, 5, 4, 10, 1, 'wood_fence');
    setTile(mapLayers.lowerObject, 9, 11, 'door_house');
  }
  return {
    id,
    name,
    type: 'interior',
    width: 20,
    height: 12,
    tileSize: TILE_SIZE,
    cameraMode: 'fixedScreen',
    defaultBiome: useArmoryTiles ? 'armoryShop' : 'town',
    battleBackdrop: 'town',
    layers: mapLayers,
    objects: [
      { id: `${id}_counter`, type: 'shopCounter', x: 8, y: 4, width: 4, height: 1, interactable: true, shopId, collision: 'full' }
    ],
    npcs: [
      { id: `${id}_keeper`, name: SHOPS[shopId].name, x: 9, y: 3, facing: 'south', dialogueId: 'shopkeeper', role: 'shopkeeper', shopId }
    ],
    enemies: [],
    regions: [{ id: `${id}_safe`, type: 'safeZone', bounds: { x: 0, y: 0, width: 20, height: 12 }, tags: ['indoors', townId] }],
    transitions: [entranceTransition(`${id}_exit`, id, 9, 11, townId, 'shop_return')],
    spawnPoints: [spawn('entry', 9, 10), spawn('shop_return', 9, 10)]
  };
};

const decorateInnShell = (mapLayers: Record<TileLayerName, TileGrid>) => {
  rect(mapLayers.lowerObject, 1, 0, 18, 1, 'inn_wall_upper');
  rect(mapLayers.lowerObject, 1, 1, 18, 1, 'inn_wall_base');
  rect(mapLayers.lowerObject, 0, 0, 1, 12, 'inn_wall_side_left');
  rect(mapLayers.lowerObject, 19, 0, 1, 12, 'inn_wall_side_right');
  rect(mapLayers.lowerObject, 1, 11, 18, 1, 'inn_wall_south');
};

const decorateInnBedroomShell = (mapLayers: Record<TileLayerName, TileGrid>) => {
  for (let y = 0; y < mapLayers.ground.length; y += 1) {
    for (let x = 0; x < (mapLayers.ground[y]?.length ?? 0); x += 1) {
      setTile(mapLayers.ground, x, y, 'inn_bedroom_floor_a');
    }
  }
  rect(mapLayers.lowerObject, 0, 0, 20, 1, 'inn_bedroom_wall');
  setTile(mapLayers.lowerObject, 8, 0, 'inn_bedroom_window_left');
  setTile(mapLayers.lowerObject, 9, 0, 'inn_bedroom_window_right');
  rect(mapLayers.lowerObject, 0, 1, 1, 11, 'inn_bedroom_wall_side_left');
  rect(mapLayers.lowerObject, 19, 1, 1, 11, 'inn_bedroom_wall_side_right');
  rect(mapLayers.lowerObject, 1, 11, 18, 1, 'inn_bedroom_wall_south');
  setTile(mapLayers.lowerObject, 9, 11, 'inn_bedroom_exit_mat');
};

const decorateInnLobby = (mapLayers: Record<TileLayerName, TileGrid>) => {
  decorateInnShell(mapLayers);
  setTile(mapLayers.lowerObject, 4, 0, 'inn_window_wall');
  setTile(mapLayers.lowerObject, 3, 0, 'inn_lobby_fireplace');
  setTile(mapLayers.lowerObject, 10, 0, 'inn_lobby_wall_lamp');
  setTile(mapLayers.lowerObject, 14, 0, 'inn_lobby_painting');
  setTile(mapLayers.lowerObject, 17, 0, 'inn_lobby_coat_hooks');
  setTile(mapLayers.lowerObject, 16, 1, 'inn_door_inside');
  setTile(mapLayers.lowerObject, 9, 11, 'inn_exit_mat');
  rect(mapLayers.lowerObject, 6, 4, 7, 1, 'inn_counter');
  setTile(mapLayers.lowerObject, 13, 4, 'inn_counter_corner');
  setTile(mapLayers.upperObject, 4, 1, 'inn_plaque');
  setTile(mapLayers.lowerObject, 2, 3, 'inn_lobby_flower_counter');
  setTile(mapLayers.lowerObject, 15, 3, 'inn_lobby_candle_table');
  setTile(mapLayers.ground, 3, 6, 'inn_lobby_rug_tl');
  setTile(mapLayers.ground, 4, 6, 'inn_lobby_rug_t1');
  setTile(mapLayers.ground, 5, 6, 'inn_lobby_rug_t2');
  setTile(mapLayers.ground, 6, 6, 'inn_lobby_rug_tr');
  setTile(mapLayers.ground, 3, 7, 'inn_lobby_rug_ml');
  setTile(mapLayers.ground, 4, 7, 'inn_lobby_rug_m1');
  setTile(mapLayers.ground, 5, 7, 'inn_lobby_rug_m2');
  setTile(mapLayers.ground, 6, 7, 'inn_lobby_rug_mr');
  setTile(mapLayers.ground, 3, 8, 'inn_lobby_rug_bl');
  setTile(mapLayers.ground, 4, 8, 'inn_lobby_rug_b1');
  setTile(mapLayers.ground, 5, 8, 'inn_lobby_rug_b2');
  setTile(mapLayers.ground, 6, 8, 'inn_lobby_rug_br');
  setTile(mapLayers.lowerObject, 2, 6, 'inn_lobby_couch_left');
  setTile(mapLayers.lowerObject, 3, 6, 'inn_lobby_couch_right');
  setTile(mapLayers.lowerObject, 6, 6, 'inn_lobby_armchair');
  setTile(mapLayers.lowerObject, 4, 7, 'inn_lobby_coffee_table');
  setTile(mapLayers.lowerObject, 6, 8, 'inn_lobby_pillows');
  setTile(mapLayers.lowerObject, 8, 7, 'inn_lobby_round_table');
  setTile(mapLayers.lowerObject, 12, 7, 'inn_lobby_candle_table');
  setTile(mapLayers.lowerObject, 14, 8, 'inn_lobby_sideboard');
  setTile(mapLayers.lowerObject, 17, 6, 'inn_lobby_bookshelf');
  setTile(mapLayers.lowerObject, 17, 8, 'inn_lobby_large_plant');
  setTile(mapLayers.lowerObject, 16, 9, 'inn_lobby_barrel');
  setTile(mapLayers.lowerObject, 13, 9, 'inn_lobby_stool');
};

const decorateInnRoom = (mapLayers: Record<TileLayerName, TileGrid>) => {
  decorateInnBedroomShell(mapLayers);
  setTile(mapLayers.lowerObject, 12, 0, 'inn_bedroom_wall_art');
  setTile(mapLayers.lowerObject, 5, 4, 'inn_bedroom_bed');
  setTile(mapLayers.lowerObject, 6, 4, 'inn_bedroom_nightstand_candle');
  setTile(mapLayers.lowerObject, 3, 4, 'inn_bedroom_dresser');
  setTile(mapLayers.lowerObject, 13, 3, 'inn_bedroom_wardrobe');
  setTile(mapLayers.lowerObject, 15, 3, 'inn_bedroom_linen_shelf');
  setTile(mapLayers.lowerObject, 17, 3, 'inn_bedroom_plant');
  setTile(mapLayers.lowerObject, 4, 7, 'inn_bedroom_runner_rug');
  setTile(mapLayers.lowerObject, 7, 6, 'inn_bedroom_small_rug');
  setTile(mapLayers.lowerObject, 9, 7, 'inn_bedroom_round_rug');
  setTile(mapLayers.lowerObject, 12, 8, 'inn_bedroom_round_table');
  setTile(mapLayers.lowerObject, 14, 8, 'inn_bedroom_chest');
  setTile(mapLayers.lowerObject, 7, 8, 'inn_bedroom_books');
  setTile(mapLayers.lowerObject, 16, 7, 'inn_bedroom_blankets');
  setTile(mapLayers.lowerObject, 17, 6, 'inn_bedroom_privacy_screen');
  setTile(mapLayers.lowerObject, 18, 8, 'inn_bedroom_vine_plant');
};

const makeInnMaps = (id: string, name: string, townId: string, cost: number): MapDefinition[] => {
  const lobbyLayers = layers(20, 12, 'inn_floor');
  decorateInnLobby(lobbyLayers);
  const roomLayers = layers(20, 12, 'inn_floor_parquet');
  decorateInnRoom(roomLayers);
  const roomPaidFlag = `${id}RoomPaid`;
  const roomNightFlag = `${id}RoomNight`;
  const lobby: MapDefinition = {
    id,
    name,
    type: 'interior',
    width: 20,
    height: 12,
    tileSize: TILE_SIZE,
    cameraMode: 'fixedScreen',
    defaultBiome: 'inn',
    battleBackdrop: 'town',
    layers: lobbyLayers,
    objects: [],
    npcs: [{ id: `${id}_keeper`, name: `${name} Keeper`, x: 9, y: 3, facing: 'south', dialogueId: 'innkeeper', role: 'innkeeper', innCost: cost }],
    enemies: [],
    regions: [{ id: `${id}_safe`, type: 'safeZone', bounds: { x: 0, y: 0, width: 20, height: 12 }, tags: ['indoors', townId, 'innLobby'] }],
    transitions: [
      entranceTransition(`${id}_exit`, id, 9, 11, townId, 'inn_return'),
      {
        ...entranceTransition(`${id}_to_room`, id, 16, 1, `${id}_room`, 'entry', roomPaidFlag, 'Pay the innkeeper before entering the room.'),
        lockedCollision: true
      }
    ],
    spawnPoints: [spawn('entry', 9, 10), spawn('inn_return', 9, 10), spawn('room_return', 16, 2)]
  };
  const room: MapDefinition = {
    id: `${id}_room`,
    name: `${name} Room`,
    type: 'interior',
    width: 20,
    height: 12,
    tileSize: TILE_SIZE,
    cameraMode: 'fixedScreen',
    defaultBiome: 'inn',
    battleBackdrop: 'town',
    layers: roomLayers,
    objects: [
      {
        id: `${id}_room_bed`,
        type: 'innBed',
        x: 5,
        y: 4,
        width: 1,
        height: 1,
        interactable: true,
        collision: 'full',
        text: 'Sleep'
      }
    ],
    npcs: [],
    enemies: [],
    regions: [{ id: `${id}_room_safe`, type: 'safeZone', bounds: { x: 0, y: 0, width: 20, height: 12 }, tags: ['indoors', townId, 'innRoom'] }],
    transitions: [{ ...entranceTransition(`${id}_room_exit`, `${id}_room`, 9, 11, id, 'room_return'), clearFlags: [roomPaidFlag, roomNightFlag] }],
    spawnPoints: [spawn('wake', 6, 7), spawn('entry', 9, 10)]
  };
  return [lobby, room];
};

const makeTown = (
  id: string,
  name: string,
  shopId: string,
  overworldSpawn: string,
  innCost: number,
  npcs: NPCDefinition[]
): MapDefinition => {
  const mapLayers = layers(20, 12, 'grass_plain');
  line(mapLayers.ground, 4, 5, 14, 5, 'dirt_path');
  line(mapLayers.ground, 10, 5, 10, 11, 'dirt_path');
  line(mapLayers.ground, 10, 9, 16, 9, 'dirt_path');
  rect(mapLayers.lowerObject, 0, 0, 20, 1, 'wood_fence');
  rect(mapLayers.lowerObject, 0, 0, 1, 12, 'wood_fence');
  rect(mapLayers.lowerObject, 19, 0, 1, 12, 'wood_fence');
  drawHouse(mapLayers, 3, 2);
  drawHouse(mapLayers, 13, 2);
  setTile(mapLayers.upperObject, 4, 2, 'shop_sign');
  setTile(mapLayers.effects, 16, 8, 'save_crystal');
  return {
    id,
    name,
    type: 'town',
    width: 20,
    height: 12,
    tileSize: TILE_SIZE,
    cameraMode: 'fixedScreen',
    defaultBiome: 'town',
    battleBackdrop: 'town',
    layers: mapLayers,
    objects: [
      { id: `${id}_save`, type: 'savePoint', x: 16, y: 8, width: 1, height: 1, interactable: true, collision: 'full' }
    ],
    npcs,
    enemies: [],
    regions: [{ id: `${id}_safe`, type: 'safeZone', bounds: { x: 0, y: 0, width: 20, height: 12 }, tags: ['town', id] }],
    transitions: [
      boundsTransition(`${id}_to_overworld`, id, 10, 11, 1, 1, 'overworld_main', overworldSpawn),
      entranceTransition(`${id}_to_shop`, id, 4, 4, `${id}_shop`, 'entry'),
      entranceTransition(`${id}_to_inn`, id, 14, 4, `${id}_inn`, 'entry')
    ],
    spawnPoints: [spawn('start', 10, 7), spawn('entry', 10, 10), spawn('shop_return', 4, 5), spawn('inn_return', 14, 5)],
    music: 'town'
  };
};

const makeHostileMap = (
  id: string,
  name: string,
  type: MapDefinition['type'],
  ground: string,
  exitSpawn: string,
  encounterIds: string[],
  bossEncounter?: string,
  rewardObject?: { id: string; itemId: string; text: string }
): MapDefinition => {
  const mapLayers = layers(20, 12, ground);
  rect(mapLayers.lowerObject, 0, 0, 20, 1, 'mountain_wall');
  rect(mapLayers.lowerObject, 0, 11, 20, 1, 'mountain_wall');
  rect(mapLayers.lowerObject, 0, 0, 1, 12, 'mountain_wall');
  rect(mapLayers.lowerObject, 19, 0, 1, 12, 'mountain_wall');
  line(mapLayers.ground, 2, 9, 17, 9, type === 'shrine' ? 'shrine_floor' : ground);
  line(mapLayers.ground, 10, 2, 10, 9, type === 'shrine' ? 'shrine_floor' : ground);
  setTile(mapLayers.lowerObject, 10, 11, 'stairs_up');
  if (rewardObject) setTile(mapLayers.lowerObject, 16, 3, 'chest_closed');
  const enemies = encounterIds.map((encounterId, index) =>
    enemyEntity(`${id}_enemy_${index + 1}`, encounterId, 5 + index * 4, 7 - (index % 2) * 2, 'aggressiveWanderer', index + 2)
  );
  if (bossEncounter) enemies.push(enemyEntity(`${id}_boss`, bossEncounter, 10, 3, 'bossEntity', 8, true));
  return {
    id,
    name,
    type,
    width: 20,
    height: 12,
    tileSize: TILE_SIZE,
    cameraMode: 'fixedRoom',
    defaultBiome: type,
    battleBackdrop: type,
    layers: mapLayers,
    objects: [
      ...(rewardObject
        ? [
            {
              id: rewardObject.id,
              type: 'chest' as const,
              x: 16,
              y: 3,
              width: 1,
              height: 1,
              interactable: true,
              collision: 'full' as const,
              givesItemId: rewardObject.itemId,
              text: rewardObject.text
            }
          ]
        : [])
    ],
    npcs: [],
    enemies,
    regions: [{ id: `${id}_danger`, type: 'encounterZone', bounds: { x: 1, y: 1, width: 18, height: 10 }, tags: [type], dangerLevel: bossEncounter ? 5 : 2 }],
    transitions: [entranceTransition(`${id}_exit`, id, 10, 11, 'overworld_main', exitSpawn)],
    spawnPoints: [spawn('entry', 10, 10)]
  };
};

const frameCaveRoom = (mapLayers: Record<TileLayerName, TileGrid>, width: number, height: number) => {
  rect(mapLayers.lowerObject, 0, 0, width, 1, 'mountain_wall');
  rect(mapLayers.lowerObject, 0, height - 1, width, 1, 'mountain_wall');
  rect(mapLayers.lowerObject, 0, 0, 1, height, 'mountain_wall');
  rect(mapLayers.lowerObject, width - 1, 0, 1, height, 'mountain_wall');
};

const makeMossvaleCaveMaps = (): MapDefinition[] => {
  const mouthLayers = layers(20, 12, 'cave_floor');
  frameCaveRoom(mouthLayers, 20, 12);
  line(mouthLayers.ground, 10, 11, 10, 2, 'cave_floor');
  line(mouthLayers.ground, 6, 7, 14, 7, 'cave_floor');
  rect(mouthLayers.lowerObject, 3, 3, 4, 1, 'cliff_face');
  rect(mouthLayers.lowerObject, 13, 4, 4, 1, 'cliff_face');
  setTile(mouthLayers.lowerObject, 10, 11, 'stairs_up');
  setTile(mouthLayers.lowerObject, 10, 2, 'stairs_down');

  const splitLayers = layers(24, 14, 'cave_floor');
  frameCaveRoom(splitLayers, 24, 14);
  rect(splitLayers.lowerObject, 11, 2, 1, 7, 'mountain_wall');
  rect(splitLayers.lowerObject, 15, 5, 1, 7, 'mountain_wall');
  rect(splitLayers.lowerObject, 3, 4, 5, 1, 'cliff_face');
  rect(splitLayers.lowerObject, 17, 9, 4, 1, 'cliff_face');
  line(splitLayers.ground, 4, 13, 4, 8, 'cave_floor');
  line(splitLayers.ground, 4, 8, 20, 8, 'cave_floor');
  line(splitLayers.ground, 20, 8, 20, 2, 'cave_floor');
  line(splitLayers.ground, 4, 8, 5, 3, 'cave_floor');
  rect(splitLayers.ground, 17, 4, 3, 2, 'water_shallow');
  setTile(splitLayers.lowerObject, 4, 13, 'stairs_up');
  setTile(splitLayers.lowerObject, 20, 2, 'stairs_down');
  setTile(splitLayers.lowerObject, 5, 3, 'chest_closed');

  const grottoLayers = layers(20, 12, 'cave_floor');
  frameCaveRoom(grottoLayers, 20, 12);
  rect(grottoLayers.ground, 7, 3, 5, 3, 'water_shallow');
  rect(grottoLayers.lowerObject, 4, 2, 3, 1, 'cliff_face');
  rect(grottoLayers.lowerObject, 11, 8, 4, 1, 'cliff_face');
  line(grottoLayers.ground, 3, 10, 8, 7, 'cave_floor');
  line(grottoLayers.ground, 8, 7, 14, 3, 'cave_floor');
  setTile(grottoLayers.lowerObject, 3, 10, 'stairs_up');
  setTile(grottoLayers.lowerObject, 14, 3, 'chest_closed');

  const mouth: MapDefinition = {
    id: 'mossvale_cave',
    name: 'Mossvale Cave Mouth',
    type: 'cave',
    width: 20,
    height: 12,
    tileSize: TILE_SIZE,
    cameraMode: 'fixedRoom',
    defaultBiome: 'cave',
    battleBackdrop: 'cave',
    layers: mouthLayers,
    objects: [],
    npcs: [],
    enemies: [],
    regions: [{ id: 'mossvale_cave_mouth_danger', type: 'encounterZone', bounds: { x: 1, y: 1, width: 18, height: 10 }, tags: ['cave', 'mouth'], encounterTable: 'slime_pair', battleBackdrop: 'cave', dangerLevel: 1 }],
    transitions: [
      entranceTransition('mossvale_cave_exit', 'mossvale_cave', 10, 11, 'overworld_main', 'mossvale_cave_exit'),
      entranceTransition('mossvale_cave_to_split', 'mossvale_cave', 10, 2, 'mossvale_cave_split', 'entry')
    ],
    spawnPoints: [spawn('entry', 10, 10), spawn('split_return', 10, 3)]
  };

  const split: MapDefinition = {
    id: 'mossvale_cave_split',
    name: 'Mossvale Glowcap Split',
    type: 'cave',
    width: 24,
    height: 14,
    tileSize: TILE_SIZE,
    cameraMode: 'smoothFollow',
    defaultBiome: 'cave',
    battleBackdrop: 'cave',
    layers: splitLayers,
    objects: [
      {
        id: 'mossvale_split_cache',
        type: 'chest',
        x: 5,
        y: 3,
        width: 1,
        height: 1,
        interactable: true,
        collision: 'full',
        givesItemId: 'leather_cap',
        text: 'Inside the old explorer cache: a Leather Cap.'
      }
    ],
    npcs: [],
    enemies: [],
    regions: [{ id: 'mossvale_split_danger', type: 'encounterZone', bounds: { x: 1, y: 1, width: 22, height: 12 }, tags: ['cave', 'split'], encounterTable: 'moss_cave_pack', battleBackdrop: 'cave', dangerLevel: 2 }],
    transitions: [
      entranceTransition('mossvale_split_to_mouth', 'mossvale_cave_split', 4, 13, 'mossvale_cave', 'split_return'),
      entranceTransition('mossvale_split_to_grotto', 'mossvale_cave_split', 20, 2, 'mossvale_relic_grotto', 'entry')
    ],
    spawnPoints: [spawn('entry', 4, 12), spawn('grotto_return', 19, 3)]
  };

  const grotto: MapDefinition = {
    id: 'mossvale_relic_grotto',
    name: 'Mossvale Relic Grotto',
    type: 'cave',
    width: 20,
    height: 12,
    tileSize: TILE_SIZE,
    cameraMode: 'fixedRoom',
    defaultBiome: 'cave',
    battleBackdrop: 'cave',
    layers: grottoLayers,
    objects: [
      {
        id: 'mossvale_relic_chest',
        type: 'chest',
        x: 14,
        y: 3,
        width: 1,
        height: 1,
        interactable: true,
        collision: 'full',
        givesItemId: 'cave_relic',
        text: 'Inside the chest: the Cave Relic, cold and mossy.'
      }
    ],
    npcs: [],
    enemies: [],
    regions: [{ id: 'mossvale_grotto_danger', type: 'encounterZone', bounds: { x: 1, y: 1, width: 18, height: 10 }, tags: ['cave', 'relic'], encounterTable: 'moss_cave_pack', battleBackdrop: 'cave', dangerLevel: 3 }],
    transitions: [entranceTransition('mossvale_grotto_to_split', 'mossvale_relic_grotto', 3, 10, 'mossvale_cave_split', 'grotto_return')],
    spawnPoints: [spawn('entry', 3, 9)]
  };

  return [mouth, split, grotto];
};

type StoryDungeonStyle = 'ruin' | 'shrine' | 'fortress' | 'eclipse';

type StoryDungeonConfig = {
  id: string;
  name: string;
  type: MapDefinition['type'];
  ground: string;
  accent: string;
  exitSpawn: string;
  battleBackdrop: string;
  bossBattleBackdrop?: string;
  style: StoryDungeonStyle;
  entranceEncounterId: string;
  routeEncounterId: string;
  branchEncounterId: string;
  bossEncounterId: string;
  bossEntityId: string;
  treasure: { id: string; itemId: string; text: string };
  rooms: {
    routeId: string;
    routeName: string;
    branchId: string;
    branchName: string;
    bossId: string;
    bossName: string;
  };
  dangerLevel: number;
};

const dungeonChest = (
  id: string,
  x: number,
  y: number,
  itemId: string,
  text: string
): MapDefinition['objects'][number] => ({
  id,
  type: 'chest',
  x,
  y,
  width: 1,
  height: 1,
  interactable: true,
  collision: 'full',
  givesItemId: itemId,
  text
});

const decorateStoryDungeon = (
  mapLayers: Record<TileLayerName, TileGrid>,
  config: StoryDungeonConfig,
  room: 'entrance' | 'route' | 'branch' | 'boss'
) => {
  const accent = config.accent;
  if (room === 'entrance') {
    line(mapLayers.ground, 10, 11, 10, 2, accent);
    line(mapLayers.ground, 5, 8, 15, 8, accent);
  } else if (room === 'route') {
    rect(mapLayers.lowerObject, 11, 2, 1, 5, 'mountain_wall');
    rect(mapLayers.lowerObject, 15, 9, 1, 3, 'mountain_wall');
    line(mapLayers.ground, 4, 13, 4, 8, accent);
    line(mapLayers.ground, 4, 8, 20, 8, accent);
    line(mapLayers.ground, 20, 8, 20, 2, accent);
    line(mapLayers.ground, 4, 8, 5, 3, accent);
  } else if (room === 'branch') {
    line(mapLayers.ground, 3, 10, 8, 7, accent);
    line(mapLayers.ground, 8, 7, 15, 3, accent);
  } else {
    line(mapLayers.ground, 3, 10, 10, 7, accent);
    line(mapLayers.ground, 10, 7, 14, 4, accent);
    rect(mapLayers.ground, 7, 3, 7, 4, accent);
  }

  if (config.style === 'ruin') {
    if (room === 'entrance') {
      rect(mapLayers.lowerObject, 3, 3, 5, 1, 'cliff_face');
      rect(mapLayers.lowerObject, 13, 5, 4, 1, 'cliff_face');
    } else if (room === 'route') {
      rect(mapLayers.lowerObject, 3, 4, 5, 1, 'cliff_face');
      rect(mapLayers.lowerObject, 17, 10, 4, 1, 'cliff_face');
    } else if (room === 'branch') {
      rect(mapLayers.lowerObject, 5, 2, 4, 1, 'cliff_face');
      rect(mapLayers.lowerObject, 11, 8, 4, 1, 'cliff_face');
    } else {
      rect(mapLayers.lowerObject, 4, 3, 4, 1, 'cliff_face');
      rect(mapLayers.lowerObject, 13, 8, 3, 1, 'cliff_face');
    }
    return;
  }

  if (config.style === 'shrine') {
    if (room === 'entrance') {
      rect(mapLayers.ground, 4, 4, 4, 2, 'water_shallow');
      rect(mapLayers.ground, 13, 6, 3, 2, 'water_shallow');
    } else if (room === 'route') {
      rect(mapLayers.ground, 17, 4, 4, 3, 'water_shallow');
      rect(mapLayers.ground, 6, 10, 3, 2, 'water_shallow');
    } else if (room === 'branch') {
      rect(mapLayers.ground, 7, 3, 5, 3, 'water_shallow');
      rect(mapLayers.lowerObject, 4, 7, 4, 1, 'cliff_face');
    } else {
      rect(mapLayers.ground, 5, 4, 4, 4, 'water_shallow');
      rect(mapLayers.ground, 13, 4, 3, 4, 'water_shallow');
    }
    return;
  }

  if (config.style === 'fortress') {
    const metalTile = 'armory_floor_dark';
    if (room === 'entrance') {
      line(mapLayers.ground, 4, 5, 16, 5, metalTile);
      rect(mapLayers.lowerObject, 4, 3, 4, 1, 'armory_spear_rack');
      rect(mapLayers.lowerObject, 13, 3, 3, 1, 'armory_shield_display');
    } else if (room === 'route') {
      rect(mapLayers.ground, 7, 3, 4, 8, metalTile);
      rect(mapLayers.ground, 17, 3, 3, 3, 'lava');
      rect(mapLayers.lowerObject, 18, 10, 3, 1, 'armory_crate');
    } else if (room === 'branch') {
      rect(mapLayers.ground, 7, 6, 7, 2, metalTile);
      rect(mapLayers.lowerObject, 4, 4, 3, 1, 'armory_anvil');
      rect(mapLayers.lowerObject, 12, 3, 3, 1, 'armory_crate');
    } else {
      rect(mapLayers.ground, 5, 5, 10, 2, metalTile);
      rect(mapLayers.ground, 15, 3, 2, 5, 'lava');
    }
    return;
  }

  if (room === 'entrance') {
    rect(mapLayers.lowerObject, 3, 3, 4, 1, 'cliff_face');
    rect(mapLayers.ground, 13, 4, 3, 3, 'dungeon_floor');
  } else if (room === 'route') {
    rect(mapLayers.ground, 17, 4, 4, 3, 'dungeon_floor');
    rect(mapLayers.lowerObject, 5, 5, 4, 1, 'cliff_face');
  } else if (room === 'branch') {
    rect(mapLayers.ground, 7, 3, 5, 3, 'dungeon_floor');
    rect(mapLayers.lowerObject, 12, 8, 4, 1, 'cliff_face');
  } else {
    rect(mapLayers.ground, 6, 2, 8, 2, 'dungeon_floor');
    rect(mapLayers.lowerObject, 4, 8, 4, 1, 'cliff_face');
  }
};

const makeStoryDungeonMaps = (config: StoryDungeonConfig): MapDefinition[] => {
  const bossBattleBackdrop = config.bossBattleBackdrop ?? config.battleBackdrop;
  const entranceLayers = layers(20, 12, config.ground);
  frameCaveRoom(entranceLayers, 20, 12);
  decorateStoryDungeon(entranceLayers, config, 'entrance');
  setTile(entranceLayers.lowerObject, 10, 11, 'stairs_up');
  setTile(entranceLayers.lowerObject, 10, 2, 'stairs_down');

  const routeLayers = layers(24, 14, config.ground);
  frameCaveRoom(routeLayers, 24, 14);
  decorateStoryDungeon(routeLayers, config, 'route');
  setTile(routeLayers.lowerObject, 4, 13, 'stairs_up');
  setTile(routeLayers.lowerObject, 5, 3, 'stairs_down');
  setTile(routeLayers.lowerObject, 20, 2, 'stairs_down');

  const branchLayers = layers(20, 12, config.ground);
  frameCaveRoom(branchLayers, 20, 12);
  decorateStoryDungeon(branchLayers, config, 'branch');
  setTile(branchLayers.lowerObject, 3, 10, 'stairs_up');
  setTile(branchLayers.lowerObject, 15, 3, 'chest_closed');

  const bossLayers = layers(20, 12, config.ground);
  frameCaveRoom(bossLayers, 20, 12);
  decorateStoryDungeon(bossLayers, config, 'boss');
  setTile(bossLayers.lowerObject, 3, 10, 'stairs_up');

  const commonRegionTags = [config.style, config.id];
  const entrance: MapDefinition = {
    id: config.id,
    name: config.name,
    type: config.type,
    width: 20,
    height: 12,
    tileSize: TILE_SIZE,
    cameraMode: 'fixedRoom',
    defaultBiome: config.battleBackdrop,
    battleBackdrop: config.battleBackdrop,
    layers: entranceLayers,
    objects: [],
    npcs: [],
    enemies: [],
    regions: [
      {
        id: `${config.id}_entrance_danger`,
        type: 'encounterZone',
        bounds: { x: 1, y: 1, width: 18, height: 10 },
        tags: [...commonRegionTags, 'entrance'],
        encounterTable: config.entranceEncounterId,
        battleBackdrop: config.battleBackdrop,
        dangerLevel: config.dangerLevel
      }
    ],
    transitions: [
      entranceTransition(`${config.id}_exit`, config.id, 10, 11, 'overworld_main', config.exitSpawn),
      entranceTransition(`${config.id}_to_route`, config.id, 10, 2, config.rooms.routeId, 'entry')
    ],
    spawnPoints: [spawn('entry', 10, 10), spawn('route_return', 10, 3)]
  };

  const route: MapDefinition = {
    id: config.rooms.routeId,
    name: config.rooms.routeName,
    type: config.type,
    width: 24,
    height: 14,
    tileSize: TILE_SIZE,
    cameraMode: 'smoothFollow',
    defaultBiome: config.battleBackdrop,
    battleBackdrop: config.battleBackdrop,
    layers: routeLayers,
    objects: [],
    npcs: [],
    enemies: [],
    regions: [
      {
        id: `${config.id}_route_danger`,
        type: 'encounterZone',
        bounds: { x: 1, y: 1, width: 22, height: 12 },
        tags: [...commonRegionTags, 'route'],
        encounterTable: config.routeEncounterId,
        battleBackdrop: config.battleBackdrop,
        dangerLevel: config.dangerLevel + 1
      }
    ],
    transitions: [
      entranceTransition(`${config.id}_route_to_entrance`, config.rooms.routeId, 4, 13, config.id, 'route_return'),
      entranceTransition(`${config.id}_route_to_branch`, config.rooms.routeId, 5, 3, config.rooms.branchId, 'entry'),
      entranceTransition(`${config.id}_route_to_boss`, config.rooms.routeId, 20, 2, config.rooms.bossId, 'entry')
    ],
    spawnPoints: [spawn('entry', 4, 12), spawn('branch_return', 6, 4), spawn('boss_return', 19, 3)]
  };

  const branch: MapDefinition = {
    id: config.rooms.branchId,
    name: config.rooms.branchName,
    type: config.type,
    width: 20,
    height: 12,
    tileSize: TILE_SIZE,
    cameraMode: 'fixedRoom',
    defaultBiome: config.battleBackdrop,
    battleBackdrop: config.battleBackdrop,
    layers: branchLayers,
    objects: [dungeonChest(config.treasure.id, 15, 3, config.treasure.itemId, config.treasure.text)],
    npcs: [],
    enemies: [],
    regions: [
      {
        id: `${config.id}_branch_danger`,
        type: 'encounterZone',
        bounds: { x: 1, y: 1, width: 18, height: 10 },
        tags: [...commonRegionTags, 'treasureBranch'],
        encounterTable: config.branchEncounterId,
        battleBackdrop: config.battleBackdrop,
        dangerLevel: config.dangerLevel + 1
      }
    ],
    transitions: [entranceTransition(`${config.id}_branch_to_route`, config.rooms.branchId, 3, 10, config.rooms.routeId, 'branch_return')],
    spawnPoints: [spawn('entry', 3, 9)]
  };

  const boss: MapDefinition = {
    id: config.rooms.bossId,
    name: config.rooms.bossName,
    type: config.type,
    width: 20,
    height: 12,
    tileSize: TILE_SIZE,
    cameraMode: 'fixedRoom',
    defaultBiome: bossBattleBackdrop,
    battleBackdrop: bossBattleBackdrop,
    layers: bossLayers,
    objects: [],
    npcs: [],
    enemies: [enemyEntity(config.bossEntityId, config.bossEncounterId, 14, 4, 'bossEntity', config.dangerLevel + 3, true)],
    regions: [
      {
        id: `${config.id}_boss_danger`,
        type: 'encounterZone',
        bounds: { x: 1, y: 1, width: 18, height: 10 },
        tags: [...commonRegionTags, 'boss'],
        battleBackdrop: bossBattleBackdrop,
        dangerLevel: config.dangerLevel + 3
      }
    ],
    transitions: [entranceTransition(`${config.id}_boss_to_route`, config.rooms.bossId, 3, 10, config.rooms.routeId, 'boss_return')],
    spawnPoints: [spawn('entry', 3, 9)]
  };

  return [entrance, route, branch, boss];
};

const makeDustbridgeRuinsMaps = (): MapDefinition[] =>
  makeStoryDungeonMaps({
    id: 'dustbridge_ruins',
    name: 'Dustbridge Ruins',
    type: 'dungeon',
    ground: 'dungeon_floor',
    accent: 'road_stone',
    exitSpawn: 'dustbridge_exit',
    battleBackdrop: 'ruin',
    style: 'ruin',
    entranceEncounterId: 'bandit_scouts',
    routeEncounterId: 'dust_ruin_pack',
    branchEncounterId: 'dust_ruin_pack',
    bossEncounterId: 'boss_rusk',
    bossEntityId: 'dustbridge_ruins_boss',
    treasure: {
      id: 'dustbridge_ledger_cache',
      itemId: 'copper_ring',
      text: 'Inside the ledger cache: a Copper Ring wrapped in old receipts.'
    },
    rooms: {
      routeId: 'dustbridge_ruins_ledger_hall',
      routeName: 'Dustbridge Ledger Hall',
      branchId: 'dustbridge_ruins_bridge_loop',
      branchName: 'Dustbridge Broken Loop',
      bossId: 'dustbridge_ruins_map_room',
      bossName: 'Dustbridge Map Room'
    },
    dangerLevel: 3
  });

const makeFloodedShrineMaps = (): MapDefinition[] =>
  makeStoryDungeonMaps({
    id: 'flooded_shrine',
    name: 'Flooded Shrine',
    type: 'shrine',
    ground: 'shrine_floor',
    accent: 'water_shallow',
    exitSpawn: 'flooded_shrine_exit',
    battleBackdrop: 'shrine',
    style: 'shrine',
    entranceEncounterId: 'river_menace',
    routeEncounterId: 'shrine_mirrors',
    branchEncounterId: 'river_menace',
    bossEncounterId: 'boss_mire_warden',
    bossEntityId: 'flooded_shrine_boss',
    treasure: {
      id: 'flooded_shrine_sluice_cache',
      itemId: 'river_charm',
      text: 'Inside the dry lockbox: a River Charm humming with blue light.'
    },
    rooms: {
      routeId: 'flooded_shrine_reed_maze',
      routeName: 'Flooded Shrine Reed Maze',
      branchId: 'flooded_shrine_sluice_chapel',
      branchName: 'Flooded Shrine Sluice Chapel',
      bossId: 'flooded_shrine_lumen_sanctum',
      bossName: 'Flooded Shrine Lumen Sanctum'
    },
    dangerLevel: 4
  });

const makeIronveinFortressMaps = (): MapDefinition[] =>
  makeStoryDungeonMaps({
    id: 'ironvein_fortress',
    name: 'Ironvein Fortress',
    type: 'castle',
    ground: 'stone_floor',
    accent: 'armory_floor_dark',
    exitSpawn: 'ironvein_exit',
    battleBackdrop: 'fortress',
    bossBattleBackdrop: 'castle',
    style: 'fortress',
    entranceEncounterId: 'iron_mine_pack',
    routeEncounterId: 'fort_patrol',
    branchEncounterId: 'iron_mine_pack',
    bossEncounterId: 'boss_iron_castellan',
    bossEntityId: 'ironvein_fortress_boss',
    treasure: {
      id: 'ironvein_forge_cache',
      itemId: 'ember_amulet',
      text: 'Inside the forge safe: an Ember Amulet, still warm.'
    },
    rooms: {
      routeId: 'ironvein_fortress_barracks',
      routeName: 'Ironvein Fortress Barracks',
      branchId: 'ironvein_fortress_forge_core',
      branchName: 'Ironvein Forge Core',
      bossId: 'ironvein_fortress_castellan_chamber',
      bossName: 'Ironvein Castellan Chamber'
    },
    dangerLevel: 5
  });

const makeEclipseTowerMaps = (): MapDefinition[] =>
  makeStoryDungeonMaps({
    id: 'eclipse_tower',
    name: 'Eclipse Tower',
    type: 'dungeon',
    ground: 'shrine_floor',
    accent: 'dungeon_floor',
    exitSpawn: 'eclipse_tower_exit',
    battleBackdrop: 'eclipse',
    style: 'eclipse',
    entranceEncounterId: 'eclipse_pack',
    routeEncounterId: 'eclipse_elite',
    branchEncounterId: 'eclipse_pack',
    bossEncounterId: 'boss_hollow_regent',
    bossEntityId: 'eclipse_tower_boss',
    treasure: {
      id: 'eclipse_shadow_cache',
      itemId: 'sunward_aegis',
      text: 'Inside the shadow-latched coffer: the Sunward Aegis.'
    },
    rooms: {
      routeId: 'eclipse_tower_library',
      routeName: 'Eclipse Tower Library',
      branchId: 'eclipse_tower_shadow_stair',
      branchName: 'Eclipse Tower Shadow Stair',
      bossId: 'eclipse_tower_observatory',
      bossName: 'Eclipse Tower Observatory'
    },
    dangerLevel: 6
  });

const makeOverworld = (): MapDefinition => {
  const mapLayers = layers(120, 80, 'grass_plain');
  const mossvaleCave = { x: 23, y: 10 };
  const roadTile = (id?: string) => id === 'dirt_path' || id === 'road_stone' || id === 'wood_bridge_horizontal';
  const nearRoad = (x: number, y: number, radius: number) => {
    for (let yy = y - radius; yy <= y + radius; yy += 1) {
      for (let xx = x - radius; xx <= x + radius; xx += 1) {
        if (roadTile(mapLayers.ground[yy]?.[xx]?.id)) return true;
      }
    }
    return false;
  };
  const clearForScenery = (x: number, y: number, roadClearance = 0) =>
    mapLayers.ground[y]?.[x]?.id === 'grass_plain' &&
    !mapLayers.lowerObject[y]?.[x] &&
    !mapLayers.upperObject[y]?.[x] &&
    !nearRoad(x, y, roadClearance);
  const placeTree = (x: number, y: number) => {
    if (!clearForScenery(x, y, 2) || !clearForScenery(x, y - 1, 1) || mapLayers.upperObject[y - 1]?.[x]) return;
    mapLayers.effects[y][x] = null;
    mapLayers.effects[y - 1][x] = null;
    setTile(mapLayers.lowerObject, x, y, 'tree_trunk');
    setTile(mapLayers.upperObject, x, y - 1, 'tree_canopy');
  };
  const placeBush = (x: number, y: number) => {
    if (!clearForScenery(x, y, 1)) return;
    mapLayers.effects[y][x] = null;
    setTile(mapLayers.lowerObject, x, y, 'bush');
  };
  const placeGrove = (trees: Array<[number, number]>, bushes: Array<[number, number]> = []) => {
    trees.forEach(([x, y]) => placeTree(x, y));
    bushes.forEach(([x, y]) => placeBush(x, y));
  };
  const clearPathNoise = (padding: number) => {
    for (let y = 4; y < 34; y += 1) {
      for (let x = 3; x < 44; x += 1) {
        if (nearRoad(x, y, padding)) mapLayers.effects[y][x] = null;
      }
    }
  };
  const varyMeadow = () => {
    for (let y = 5; y < 34; y += 1) {
      for (let x = 3; x < 45; x += 1) {
        if (mapLayers.ground[y]?.[x]?.id !== 'grass_plain' || nearRoad(x, y, 1)) continue;
        const roll = Math.abs((x * 31 + y * 47 + x * y * 5) % 113);
        if (roll === 47 && !nearRoad(x, y, 4)) setTile(mapLayers.ground, x, y, 'flower_grass');
      }
    }
  };
  rect(mapLayers.lowerObject, 0, 0, 120, 2, 'mountain_wall');
  rect(mapLayers.lowerObject, 0, 78, 120, 2, 'mountain_wall');
  rect(mapLayers.lowerObject, 0, 0, 2, 80, 'mountain_wall');
  rect(mapLayers.lowerObject, 118, 0, 2, 80, 'mountain_wall');
  rect(mapLayers.ground, 64, 0, 4, 80, 'water_deep');
  rect(mapLayers.ground, 1, 54, 44, 18, 'sand_plain');
  rect(mapLayers.ground, 72, 8, 20, 20, 'tall_grass');
  rect(mapLayers.ground, 90, 38, 24, 18, 'stone_floor');
  rect(mapLayers.ground, 99, 62, 16, 14, 'shrine_floor');
  line(mapLayers.ground, 12, 12, 19, 12, 'dirt_path');
  line(mapLayers.ground, 19, 12, 19, 11, 'dirt_path');
  line(mapLayers.ground, 19, 11, 23, 11, 'dirt_path');
  line(mapLayers.ground, 23, 11, mossvaleCave.x, mossvaleCave.y, 'dirt_path');
  line(mapLayers.ground, 24, 11, 26, 11, 'dirt_path');
  line(mapLayers.ground, 26, 11, 26, 12, 'dirt_path');
  line(mapLayers.ground, 26, 12, 32, 12, 'dirt_path');
  line(mapLayers.ground, 32, 12, 32, 16, 'dirt_path');
  line(mapLayers.ground, 32, 16, 40, 16, 'dirt_path');
  line(mapLayers.ground, 40, 16, 40, 20, 'dirt_path');
  trail(mapLayers.ground, 40, 20, 64, 30, 'dirt_path');
  trail(mapLayers.ground, 68, 30, 72, 16, 'dirt_path');
  trail(mapLayers.ground, 72, 16, 93, 42, 'road_stone');
  trail(mapLayers.ground, 93, 42, 105, 68, 'road_stone');
  trail(mapLayers.ground, 105, 68, 110, 72, 'road_stone');
  rect(mapLayers.ground, 64, 29, 4, 4, 'wood_bridge_horizontal');
  rect(mapLayers.lowerObject, mossvaleCave.x - 4, mossvaleCave.y - 3, 9, 1, 'mountain_wall');
  rect(mapLayers.lowerObject, mossvaleCave.x - 3, mossvaleCave.y - 2, 7, 1, 'cliff_face');
  rect(mapLayers.lowerObject, mossvaleCave.x - 1, mossvaleCave.y - 1, 3, 1, 'cliff_face');
  setTile(mapLayers.lowerObject, mossvaleCave.x - 2, mossvaleCave.y - 1, 'mountain_wall');
  setTile(mapLayers.lowerObject, mossvaleCave.x + 2, mossvaleCave.y - 1, 'mountain_wall');
  varyMeadow();
  for (let y = 6; y < 30; y += 1) {
    for (let x = 4; x < 32; x += 1) {
      if (mapLayers.ground[y]?.[x]?.id !== 'grass_plain') continue;
      const roll = Math.abs((x * 29 + y * 17 + x * y * 3) % 79);
      if (roll === 0 && !nearRoad(x, y, 3)) setTile(mapLayers.effects, x, y, 'field_flower_detail');
      else if (roll === 14 && !nearRoad(x, y, 2)) setTile(mapLayers.effects, x, y, 'field_clover_detail');
    }
  }
  clearPathNoise(2);
  for (let y = 7; y < 31; y += 1) {
    for (let x = 5; x < 36; x += 1) {
      const ground = mapLayers.ground[y]?.[x]?.id;
      if (ground !== 'dirt_path' && ground !== 'road_stone') continue;
      for (const [dx, dy] of [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1]
      ]) {
        const sx = x + dx;
        const sy = y + dy;
        if (mapLayers.ground[sy]?.[sx]?.id !== 'grass_plain' || mapLayers.effects[sy]?.[sx]) continue;
        const roll = Math.abs((sx * 11 + sy * 23 + sx * sy) % 19);
        if (roll === 0) setTile(mapLayers.effects, sx, sy, 'field_dirt_scuff_detail');
        else if (roll === 1) setTile(mapLayers.effects, sx, sy, 'field_clover_detail');
      }
    }
  }
  placeGrove(
    [
      [5, 7],
      [6, 7],
      [7, 8],
      [9, 7],
      [10, 7],
      [11, 8],
      [14, 6],
      [17, 6]
    ],
    [
      [4, 10],
      [6, 16],
      [8, 14],
      [10, 15]
    ]
  );
  placeGrove(
    [
      [20, 5],
      [24, 5],
      [29, 6],
      [32, 7],
      [35, 9],
      [37, 12]
    ],
    [
      [21, 6],
      [28, 14],
      [34, 15]
    ]
  );
  placeGrove(
    [
      [5, 25],
      [8, 26],
      [13, 27],
      [20, 27],
      [27, 26],
      [34, 25]
    ],
    [
      [6, 27],
      [14, 24],
      [23, 23],
      [30, 22]
    ]
  );
  [
    [11, 12, 'shop_sign'],
    [40, 20, 'shop_sign'],
    [72, 16, 'shop_sign'],
    [93, 42, 'shop_sign'],
    [105, 68, 'shop_sign'],
    [mossvaleCave.x, mossvaleCave.y, 'cave_mouth'],
    [50, 28, 'castle_gate'],
    [76, 32, 'tower_gate'],
    [96, 50, 'castle_gate'],
    [110, 72, 'tower_gate']
  ].forEach(([x, y, id]) => setTile(mapLayers.lowerObject, Number(x), Number(y), String(id)));

  const regions: Region[] = [
    { id: 'mossvale_approach', type: 'encounterZone', bounds: { x: 20, y: 7, width: 11, height: 9 }, tags: ['grassland', 'caveMouth'], encounterTable: 'grass_wolf_pack', battleBackdrop: 'grassland', dangerLevel: 2 },
    { id: 'greenhollow_woodline', type: 'encounterZone', bounds: { x: 15, y: 7, width: 20, height: 18 }, tags: ['grassland', 'forest'], encounterTable: 'greenhollow_roamers', battleBackdrop: 'grassland', dangerLevel: 1 },
    { id: 'greenhollow_fields', type: 'encounterZone', bounds: { x: 4, y: 6, width: 28, height: 24 }, tags: ['grassland'], encounterTable: 'slime_pair', battleBackdrop: 'grassland', dangerLevel: 1 },
    { id: 'waymeet_roads', type: 'encounterZone', bounds: { x: 32, y: 12, width: 28, height: 24 }, tags: ['road'], encounterTable: 'bandit_scouts', battleBackdrop: 'road', dangerLevel: 2 },
    { id: 'lumaire_river', type: 'encounterZone', bounds: { x: 68, y: 6, width: 24, height: 30 }, tags: ['river'], encounterTable: 'river_menace', battleBackdrop: 'river', dangerLevel: 3 },
    { id: 'ironmarch_frontier', type: 'encounterZone', bounds: { x: 86, y: 35, width: 28, height: 24 }, tags: ['mountain'], encounterTable: 'fort_patrol', battleBackdrop: 'mine', dangerLevel: 4 },
    { id: 'sunspire_eclipse', type: 'encounterZone', bounds: { x: 98, y: 60, width: 18, height: 16 }, tags: ['eclipse'], encounterTable: 'eclipse_pack', battleBackdrop: 'eclipse', dangerLevel: 5 }
  ];

  return {
    id: 'overworld_main',
    name: 'The Five Roads',
    type: 'overworld',
    width: 120,
    height: 80,
    tileSize: TILE_SIZE,
    cameraMode: 'smoothFollow',
    defaultBiome: 'grassland',
    battleBackdrop: 'grassland',
    layers: mapLayers,
    objects: [
      { id: 'sign_waymeet', type: 'sign', x: 41, y: 20, width: 1, height: 1, interactable: true, text: 'Waymeet Trade Post. Bandits dislike receipts.' },
      { id: 'sign_lumaire', type: 'sign', x: 73, y: 16, width: 1, height: 1, interactable: true, text: 'Lumaire: river magic, quiet bells, wet shoes.' }
    ],
    npcs: [
      {
        id: 'route_waymeet_courier',
        name: 'Wounded Courier',
        x: 35,
        y: 15,
        facing: 'south',
        dialogueId: 'route_waymeet_courier',
        role: 'flavor',
        hiddenUntilFlag: 'routeToWaymeetUnlocked'
      },
      {
        id: 'route_lumaire_ferryman',
        name: 'Stranded Ferryman',
        x: 68,
        y: 31,
        facing: 'west',
        dialogueId: 'route_lumaire_ferryman',
        role: 'flavor',
        hiddenUntilFlag: 'routeToLumaireUnlocked'
      },
      {
        id: 'route_ironmarch_miner',
        name: 'Ash-Covered Miner',
        x: 91,
        y: 41,
        facing: 'southeast',
        dialogueId: 'route_ironmarch_miner',
        role: 'flavor',
        hiddenUntilFlag: 'routeToIronmarchUnlocked'
      },
      {
        id: 'route_sunspire_bellrunner',
        name: 'Bell Runner',
        x: 102,
        y: 66,
        facing: 'southeast',
        dialogueId: 'route_sunspire_bellrunner',
        role: 'flavor',
        hiddenUntilFlag: 'routeToSunspireUnlocked'
      },
      {
        id: 'route_eclipse_page',
        name: "Aster's Page",
        x: 108,
        y: 71,
        facing: 'east',
        dialogueId: 'route_eclipse_page',
        role: 'flavor',
        hiddenUntilFlag: 'routeToFinalUnlocked'
      }
    ],
    enemies: [],
    regions,
    transitions: [
      entranceTransition('to_greenhollow', 'overworld_main', 12, 12, 'greenhollow', 'entry'),
      entranceTransition('to_mossvale_cave', 'overworld_main', mossvaleCave.x, mossvaleCave.y, 'mossvale_cave', 'entry'),
      entranceTransition('to_waymeet', 'overworld_main', 40, 20, 'waymeet', 'entry', 'routeToWaymeetUnlocked', 'The western guard still wants the Greenhollow relic returned before this road opens.'),
      entranceTransition('to_dustbridge_ruins', 'overworld_main', 50, 28, 'dustbridge_ruins', 'entry', 'routeToWaymeetUnlocked', 'The ruin road is watched by Waymeet patrols for now.'),
      entranceTransition('to_lumaire', 'overworld_main', 72, 16, 'lumaire', 'entry', 'routeToLumaireUnlocked', 'The trade road is unsafe until Rusk is beaten.'),
      entranceTransition('to_flooded_shrine', 'overworld_main', 76, 32, 'flooded_shrine', 'entry', 'routeToLumaireUnlocked', 'Lumaire has not opened the shrine ferry yet.'),
      entranceTransition('to_ironmarch', 'overworld_main', 93, 42, 'ironmarch', 'entry', 'routeToIronmarchUnlocked', 'The river ward still blocks the mountain pass.'),
      entranceTransition('to_ironvein_fortress', 'overworld_main', 96, 50, 'ironvein_fortress', 'entry', 'routeToIronmarchUnlocked', 'The Ironmarch pass remains closed.'),
      entranceTransition('to_sunspire', 'overworld_main', 105, 68, 'sunspire', 'entry', 'routeToSunspireUnlocked', 'The capital road opens after the fortress falls.'),
      entranceTransition('to_eclipse_tower', 'overworld_main', 110, 72, 'eclipse_tower', 'entry', 'routeToFinalUnlocked', 'The Eclipse Key has not answered yet.')
    ],
    spawnPoints: [
      spawn('greenhollow_gate', 12, 13),
      spawn('mossvale_cave_exit', mossvaleCave.x, mossvaleCave.y + 1),
      spawn('waymeet_gate', 40, 21),
      spawn('dustbridge_exit', 50, 29),
      spawn('lumaire_gate', 72, 17),
      spawn('flooded_shrine_exit', 76, 33),
      spawn('ironmarch_gate', 93, 43),
      spawn('ironvein_exit', 96, 51),
      spawn('sunspire_gate', 105, 69),
      spawn('eclipse_tower_exit', 110, 73)
    ],
    music: 'overworld'
  };
};

const maps = [
  makeOverworld(),
  makeTown('greenhollow', 'Greenhollow', 'greenhollow_general', 'greenhollow_gate', 8, [
    { id: 'greenhollow_elder', name: 'Elder Rowan', x: 10, y: 4, facing: 'south', dialogueId: 'greenhollow_elder', role: 'objectiveGiver', questHooks: ['cave_relic'] },
    { id: 'greenhollow_guard', name: 'Gate Guard', x: 8, y: 10, facing: 'south', dialogueId: 'greenhollow_guard', role: 'guard' },
    { id: 'greenhollow_rumor', name: 'Mara', x: 15, y: 7, facing: 'west', dialogueId: 'greenhollow_rumor', role: 'rumor' }
  ]),
  makeShopInterior('greenhollow_shop', 'Greenhollow Store', 'greenhollow', 'greenhollow_general'),
  ...makeInnMaps('greenhollow_inn', 'Greenhollow Inn', 'greenhollow', 8),
  makeTown('waymeet', 'Waymeet Trade Post', 'waymeet_outfitter', 'waymeet_gate', 18, [
    { id: 'waymeet_broker', name: 'Broker Sel', x: 9, y: 4, facing: 'south', dialogueId: 'waymeet_broker', role: 'objectiveGiver', questHooks: ['road_seal'] },
    { id: 'waymeet_scout', name: 'Road Scout', x: 14, y: 8, facing: 'west', dialogueId: 'waymeet_scout', role: 'rumor' }
  ]),
  makeShopInterior('waymeet_shop', 'Waymeet Outfitter', 'waymeet', 'waymeet_outfitter'),
  ...makeInnMaps('waymeet_inn', 'Waymeet Inn', 'waymeet', 18),
  makeTown('lumaire', 'Lumaire', 'lumaire_arcana', 'lumaire_gate', 28, [
    { id: 'lumaire_oracle', name: 'Oracle Niva', x: 10, y: 4, facing: 'south', dialogueId: 'lumaire_oracle', role: 'trainer', questHooks: ['shrine_lumen'] },
    { id: 'lumaire_student', name: 'River Student', x: 13, y: 8, facing: 'west', dialogueId: 'lumaire_student', role: 'flavor' }
  ]),
  makeShopInterior('lumaire_shop', 'Lumaire Arcana', 'lumaire', 'lumaire_arcana'),
  ...makeInnMaps('lumaire_inn', 'Lumaire Inn', 'lumaire', 28),
  makeTown('ironmarch', 'Ironmarch', 'ironmarch_armory', 'ironmarch_gate', 42, [
    { id: 'ironmarch_marshal', name: 'Marshal Brinn', x: 10, y: 4, facing: 'south', dialogueId: 'ironmarch_marshal', role: 'objectiveGiver', questHooks: ['iron_writ'] },
    { id: 'ironmarch_miner', name: 'Tired Miner', x: 15, y: 7, facing: 'west', dialogueId: 'ironmarch_miner', role: 'rumor' }
  ]),
  makeShopInterior('ironmarch_shop', 'Ironmarch Armory', 'ironmarch', 'ironmarch_armory'),
  ...makeInnMaps('ironmarch_inn', 'Ironmarch Inn', 'ironmarch', 42),
  makeTown('sunspire', 'Sunspire', 'sunspire_market', 'sunspire_gate', 64, [
    { id: 'sunspire_keeper', name: 'Keeper Aster', x: 10, y: 4, facing: 'south', dialogueId: 'sunspire_keeper', role: 'objectiveGiver', questHooks: ['eclipse_key'] },
    { id: 'sunspire_captain', name: 'Capital Captain', x: 14, y: 8, facing: 'west', dialogueId: 'sunspire_captain', role: 'guard' }
  ]),
  makeShopInterior('sunspire_shop', 'Sunspire Grand Market', 'sunspire', 'sunspire_market'),
  ...makeInnMaps('sunspire_inn', 'Sunspire Inn', 'sunspire', 64),
  ...makeMossvaleCaveMaps(),
  ...makeDustbridgeRuinsMaps(),
  ...makeFloodedShrineMaps(),
  ...makeIronveinFortressMaps(),
  ...makeEclipseTowerMaps()
];

export const MAPS: Record<string, MapDefinition> = Object.fromEntries(maps.map((map) => [map.id, map]));

export const START_MAP_ID = 'greenhollow';
export const START_SPAWN_ID = 'start';

export const getTileDefinition = (tileId: string): TileDefinition => TILE_DEFINITIONS[tileId] ?? TILE_DEFINITIONS.grass_plain;
