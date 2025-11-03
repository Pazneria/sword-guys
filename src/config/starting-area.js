const TILES = Object.freeze({
  GRASS: 'grass',
  TREE: 'tree',
  WATER: 'water',
  ROCK: 'rock',
  PATH: 'path',
  SPAWN: 'spawn',
});

const PASSABLE_TILES = Object.freeze({
  [TILES.GRASS]: true,
  [TILES.PATH]: true,
  [TILES.SPAWN]: true,
});

const STARTING_AREA_WIDTH = 64;
const STARTING_AREA_HEIGHT = 40;

const createLayout = () => {
  const rows = Array.from({ length: STARTING_AREA_HEIGHT }, () =>
    Array.from({ length: STARTING_AREA_WIDTH }, () => TILES.GRASS),
  );

  const setTile = (x, y, tile) => {
    if (x < 0 || y < 0 || x >= STARTING_AREA_WIDTH || y >= STARTING_AREA_HEIGHT) {
      return;
    }

    rows[y][x] = tile;
  };

  const paintBorder = () => {
    for (let x = 0; x < STARTING_AREA_WIDTH; x += 1) {
      setTile(x, 0, TILES.TREE);
      setTile(x, STARTING_AREA_HEIGHT - 1, TILES.TREE);
    }

    for (let y = 0; y < STARTING_AREA_HEIGHT; y += 1) {
      setTile(0, y, TILES.TREE);
      setTile(STARTING_AREA_WIDTH - 1, y, TILES.TREE);
    }
  };

  const addWaterPatch = (originX, originY, radiusX, radiusY) => {
    for (let y = originY - radiusY; y <= originY + radiusY; y += 1) {
      for (let x = originX - radiusX; x <= originX + radiusX; x += 1) {
        const dx = (x - originX) / radiusX;
        const dy = (y - originY) / radiusY;
        if (dx * dx + dy * dy <= 1.05) {
          setTile(x, y, TILES.WATER);
        }
      }
    }
  };

  const addTreeCluster = (originX, originY, radius) => {
    for (let y = originY - radius; y <= originY + radius; y += 1) {
      for (let x = originX - radius; x <= originX + radius; x += 1) {
        const dx = x - originX;
        const dy = y - originY;
        if (dx * dx + dy * dy <= radius * radius && rows[y]?.[x] !== TILES.WATER) {
          setTile(x, y, TILES.TREE);
        }
      }
    }
  };

  const addRockPatch = (startX, startY, width, height) => {
    for (let y = startY; y < startY + height; y += 1) {
      for (let x = startX; x < startX + width; x += 1) {
        if (rows[y]?.[x] && rows[y][x] !== TILES.WATER && rows[y][x] !== TILES.PATH) {
          setTile(x, y, TILES.ROCK);
        }
      }
    }
  };

  paintBorder();
  addWaterPatch(14, 10, 5, 3);
  addWaterPatch(48, 28, 6, 4);
  addTreeCluster(10, 24, 5);
  addTreeCluster(52, 12, 6);
  addTreeCluster(30, 32, 4);
  addRockPatch(20, 6, 4, 3);
  addRockPatch(36, 20, 5, 2);

  const pathY = Math.floor(STARTING_AREA_HEIGHT / 2) - 1;
  const pathX = Math.floor(STARTING_AREA_WIDTH / 2) - 1;

  for (let x = 2; x < STARTING_AREA_WIDTH - 2; x += 1) {
    setTile(x, pathY, TILES.PATH);
    setTile(x, pathY + 1, TILES.PATH);
  }

  for (let y = 2; y < STARTING_AREA_HEIGHT - 2; y += 1) {
    setTile(pathX, y, TILES.PATH);
    setTile(pathX + 1, y, TILES.PATH);
  }

  const spawnX = pathX;
  const spawnY = pathY;
  setTile(spawnX, spawnY, TILES.SPAWN);

  return rows;
};

const layout = createLayout();

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
  passableTiles: PASSABLE_TILES,
});
