const TILES = Object.freeze({
  WALL: 'wall',
  FLOOR: 'floor',
  SPAWN: 'spawn',
});

const layout = [
  [TILES.WALL, TILES.WALL, TILES.WALL, TILES.WALL, TILES.WALL, TILES.WALL],
  [TILES.WALL, TILES.FLOOR, TILES.FLOOR, TILES.FLOOR, TILES.FLOOR, TILES.WALL],
  [TILES.WALL, TILES.FLOOR, TILES.SPAWN, TILES.FLOOR, TILES.FLOOR, TILES.WALL],
  [TILES.WALL, TILES.FLOOR, TILES.FLOOR, TILES.FLOOR, TILES.FLOOR, TILES.WALL],
  [TILES.WALL, TILES.WALL, TILES.WALL, TILES.WALL, TILES.WALL, TILES.WALL],
];

const spawn = (() => {
  for (let y = 0; y < layout.length; y += 1) {
    for (let x = 0; x < layout[y].length; x += 1) {
      if (layout[y][x] === TILES.SPAWN) {
        return { x, y };
      }
    }
  }

  return null;
})();

export const STARTING_AREA_CONFIG = Object.freeze({
  name: 'starting-area',
  tileSize: 32,
  layout,
  spawn,
  tiles: TILES,
});
