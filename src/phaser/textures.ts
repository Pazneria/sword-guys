import Phaser from 'phaser';
import { ENEMIES, TILE_DEFINITIONS } from '../game/content';
import { Direction, TILE_SIZE } from '../game/types';

const directions: Direction[] = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'];

const generate = (scene: Phaser.Scene, key: string, width: number, height: number, draw: (g: Phaser.GameObjects.Graphics) => void) => {
  if (scene.textures.exists(key)) return;
  const g = scene.add.graphics();
  draw(g);
  g.generateTexture(key, width, height);
  g.destroy();
};

type NpcPalette = {
  skin: number;
  hair: number;
  shirt: number;
  trim: number;
  legs: number;
  accent?: number;
  hat?: number;
  beard?: number;
  tool?: 'staff' | 'spear' | 'basket' | 'book' | 'hammer' | 'satchel';
};

const generateNpc = (scene: Phaser.Scene, key: string, palette: NpcPalette) => {
  generate(scene, key, 32, 40, (g) => {
    g.fillStyle(0x151821, 0.45);
    g.fillEllipse(16, 35, 18, 6);

    if (palette.tool === 'staff') {
      g.lineStyle(2, palette.accent ?? 0x8b5a2b, 1);
      g.beginPath();
      g.moveTo(25, 10);
      g.lineTo(29, 35);
      g.strokePath();
      g.fillStyle(0xf1d36b, 1);
      g.fillCircle(24, 9, 2);
    }
    if (palette.tool === 'spear') {
      g.lineStyle(2, 0x5e4429, 1);
      g.beginPath();
      g.moveTo(25, 8);
      g.lineTo(29, 36);
      g.strokePath();
      g.fillStyle(0xdbe4ea, 1);
      g.fillTriangle(24, 7, 27, 2, 30, 7);
    }

    g.fillStyle(palette.legs, 1);
    g.fillRect(10, 29, 4, 7);
    g.fillRect(18, 29, 4, 7);
    g.fillStyle(0x201714, 1);
    g.fillRect(9, 35, 6, 3);
    g.fillRect(17, 35, 6, 3);

    g.fillStyle(palette.shirt, 1);
    g.fillRoundedRect(8, 16, 16, 16, 4);
    g.fillStyle(palette.trim, 1);
    g.fillRect(8, 23, 16, 3);
    g.fillRect(15, 16, 2, 16);
    if (palette.accent) {
      g.fillStyle(palette.accent, 1);
      g.fillCircle(16, 24, 2);
    }

    if (palette.tool === 'basket') {
      g.fillStyle(0x9a6731, 1);
      g.fillRoundedRect(23, 21, 6, 8, 2);
      g.lineStyle(1, 0x513419, 1);
      g.strokeRoundedRect(23, 21, 6, 8, 2);
    }
    if (palette.tool === 'book') {
      g.fillStyle(palette.accent ?? 0x8a3659, 1);
      g.fillRect(22, 20, 6, 7);
      g.lineStyle(1, 0xf4e7a1, 1);
      g.lineBetween(25, 20, 25, 27);
    }
    if (palette.tool === 'hammer') {
      g.lineStyle(2, 0x6b4628, 1);
      g.lineBetween(25, 22, 29, 30);
      g.fillStyle(0xbac1c8, 1);
      g.fillRect(24, 20, 7, 3);
    }
    if (palette.tool === 'satchel') {
      g.fillStyle(0x7a4c24, 1);
      g.fillRoundedRect(22, 23, 7, 7, 2);
      g.lineStyle(1, 0x2d1c12, 1);
      g.strokeRoundedRect(22, 23, 7, 7, 2);
    }

    g.fillStyle(palette.skin, 1);
    g.fillCircle(16, 10, 7);
    g.fillStyle(0x1b2634, 1);
    g.fillCircle(13, 10, 1);
    g.fillCircle(19, 10, 1);

    g.fillStyle(palette.hair, 1);
    g.fillCircle(11, 7, 4);
    g.fillCircle(16, 5, 5);
    g.fillCircle(21, 7, 4);
    g.fillRect(9, 8, 14, 4);
    if (palette.beard) {
      g.fillStyle(palette.beard, 1);
      g.fillRoundedRect(12, 13, 8, 5, 2);
      g.fillRect(14, 17, 4, 2);
    }
    if (palette.hat) {
      g.fillStyle(palette.hat, 1);
      g.fillRect(8, 4, 16, 4);
      g.fillRoundedRect(11, 0, 10, 7, 2);
    }

    g.lineStyle(1, 0x111111, 0.5);
    g.strokeRoundedRect(8, 16, 16, 16, 4);
  });
};

const drawEnemySprite = (
  g: Phaser.GameObjects.Graphics,
  enemy: { id: string; family: string; color: number; boss?: boolean }
) => {
  g.fillStyle(0x151821, 0.32);
  g.fillEllipse(17, 26, enemy.boss ? 28 : 22, 6);

  if (enemy.id === 'field_slime' || enemy.id === 'mire_slug') {
    g.fillStyle(enemy.color, 1);
    g.fillEllipse(17, enemy.id === 'mire_slug' ? 18 : 17, enemy.id === 'mire_slug' ? 27 : 23, enemy.id === 'mire_slug' ? 15 : 20);
    g.fillStyle(0xffffff, 0.36);
    g.fillEllipse(12, 11, 8, 5);
    g.fillStyle(0x102117, 0.82);
    g.fillCircle(13, 17, 1.6);
    g.fillCircle(21, 17, 1.6);
  } else if (enemy.id === 'pebble_imp') {
    g.fillStyle(enemy.color, 1);
    g.fillTriangle(8, 10, 12, 2, 15, 12);
    g.fillTriangle(19, 12, 23, 2, 27, 10);
    g.fillRoundedRect(8, 9, 19, 18, 6);
    g.fillStyle(0x43362a, 1);
    g.fillCircle(14, 16, 2);
    g.fillCircle(22, 16, 2);
  } else if (enemy.id === 'thistle_bat') {
    g.fillStyle(enemy.color, 1);
    g.fillTriangle(17, 14, 2, 7, 6, 22);
    g.fillTriangle(17, 14, 32, 7, 28, 22);
    g.fillRoundedRect(12, 9, 10, 16, 4);
    g.fillStyle(0xf1d7ff, 0.9);
    g.fillCircle(15, 14, 1.5);
    g.fillCircle(19, 14, 1.5);
  } else if (enemy.id === 'grass_wolf' || enemy.id === 'road_rat') {
    g.fillStyle(enemy.color, 1);
    g.fillEllipse(17, 18, enemy.id === 'grass_wolf' ? 25 : 24, enemy.id === 'grass_wolf' ? 14 : 11);
    g.fillCircle(enemy.id === 'grass_wolf' ? 25 : 27, 14, enemy.id === 'grass_wolf' ? 6 : 4);
    g.fillTriangle(23, 10, 25, 3, 28, 11);
    if (enemy.id === 'road_rat') {
      g.lineStyle(2, enemy.color, 1);
      g.beginPath();
      g.moveTo(6, 19);
      g.lineTo(2, 22);
      g.lineTo(7, 24);
      g.strokePath();
    }
    g.fillStyle(0x151821, 0.9);
    g.fillCircle(26, 14, 1.5);
  } else if (enemy.id === 'cave_tick') {
    g.fillStyle(enemy.color, 1);
    g.fillEllipse(17, 17, 22, 16);
    g.lineStyle(2, 0x2a1d18, 1);
    for (const y of [13, 17, 21]) {
      g.lineBetween(9, y, 3, y - 3);
      g.lineBetween(25, y, 31, y - 3);
    }
  } else if (enemy.id === 'moss_goblin') {
    g.fillStyle(enemy.color, 1);
    g.fillRoundedRect(8, 8, 20, 18, 5);
    g.fillTriangle(8, 12, 3, 8, 8, 17);
    g.fillTriangle(28, 12, 33, 8, 28, 17);
    g.fillStyle(0xf2e6b1, 0.9);
    g.fillCircle(14, 15, 2);
    g.fillCircle(22, 15, 2);
  } else if (enemy.id === 'drip_wisp') {
    g.fillStyle(enemy.color, 0.75);
    g.fillCircle(17, 13, 9);
    g.fillTriangle(10, 18, 17, 29, 24, 18);
    g.fillStyle(0xffffff, 0.72);
    g.fillCircle(14, 12, 2);
    g.fillCircle(20, 12, 2);
  } else {
    g.fillStyle(enemy.color, 1);
    g.fillRoundedRect(4, 6, 26, 20, 8);
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(13, 14, 2);
    g.fillCircle(21, 14, 2);
  }

  if (enemy.boss) {
    g.lineStyle(2, 0xf1c75b, 1);
    g.strokeRoundedRect(3, 5, 28, 22, 8);
  }
};

export const ensureGameTextures = (scene: Phaser.Scene) => {
  for (const definition of Object.values(TILE_DEFINITIONS)) {
    const color = definition.defaultProperties.color ?? 0x777777;
    generate(scene, `tile:${definition.id}`, TILE_SIZE, TILE_SIZE, (g) => {
      g.fillStyle(color, 1);
      g.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
      g.lineStyle(1, 0x000000, 0.08);
      g.strokeRect(0, 0, TILE_SIZE, TILE_SIZE);
      if (definition.id === 'grass_plain' || definition.id === 'grass_variant' || definition.id === 'flower_grass') {
        g.fillStyle(definition.id === 'grass_variant' ? 0x5ca846 : 0x579a42, 0.9);
        g.fillTriangle(5, 22, 8, 14, 11, 22);
        g.fillTriangle(21, 28, 24, 20, 27, 28);
        g.fillStyle(0x9bd874, 0.65);
        g.fillRect(15, 7, 2, 6);
        g.fillRect(17, 9, 2, 4);
        if (definition.id === 'flower_grass') {
          g.fillStyle(0xffd6e0, 1);
          g.fillCircle(8, 8, 1.5);
          g.fillStyle(0xf7ef87, 1);
          g.fillCircle(26, 14, 1.5);
        }
      }
      if (definition.id.includes('water')) {
        g.lineStyle(2, 0xffffff, 0.28);
        g.beginPath();
        g.moveTo(4, 13);
        g.lineTo(15, 10);
        g.lineTo(28, 14);
        g.strokePath();
      }
      if (definition.id.includes('road') || definition.id.includes('path')) {
        g.fillStyle(0x8f653a, 0.28);
        g.fillEllipse(16, 17, 26, 19);
        g.fillStyle(0xffffff, 0.1);
        g.fillCircle(8, 8, 2);
        g.fillCircle(21, 23, 2);
        g.fillStyle(0x6c4a2d, 0.35);
        g.fillCircle(13, 18, 1.5);
        g.fillCircle(27, 9, 1.25);
      }
      if (definition.id.includes('tree_canopy')) {
        g.fillStyle(0x1f5f2d, 1);
        g.fillCircle(9, 13, 8);
        g.fillCircle(18, 10, 9);
        g.fillCircle(22, 20, 8);
      }
      if (definition.id === 'building_wall') {
        g.fillStyle(0x9d6d4f, 1);
        g.fillRect(0, 0, 32, 32);
        g.fillStyle(0x744730, 0.55);
        g.fillRect(0, 0, 32, 3);
        g.fillRect(0, 14, 32, 2);
        g.fillRect(0, 28, 32, 3);
        g.lineStyle(1, 0x5e3826, 0.45);
        g.lineBetween(8, 3, 8, 14);
        g.lineBetween(22, 16, 22, 28);
      }
      if (definition.id === 'building_wall_upper' || definition.id === 'building_wall_upper_shadow') {
        const shaded = definition.id === 'building_wall_upper_shadow';
        g.fillStyle(shaded ? 0x8c6547 : 0xb58660, 1);
        g.fillRect(0, 0, 32, 32);
        g.fillStyle(shaded ? 0x6f4b36 : 0x946745, 0.55);
        g.fillRect(0, 0, 32, 3);
        g.fillRect(0, 29, 32, 2);
        g.lineStyle(1, shaded ? 0x4c3022 : 0x65432f, 0.4);
        g.lineBetween(8, 3, 8, 28);
        g.lineBetween(22, 6, 22, 31);
      }
      if (definition.id.includes('building_roof')) {
        g.fillStyle(0x8b2f36, 1);
        g.fillRect(0, 12, 32, 20);
        g.fillStyle(0x6d242a, 1);
        g.fillTriangle(0, 30, 16, 4, 32, 30);
        g.lineStyle(1, 0xf0b05c, 0.35);
        g.lineBetween(7, 18, 25, 18);
        g.lineBetween(4, 24, 28, 24);
        g.lineStyle(1, 0x42151b, 0.45);
        g.lineBetween(16, 5, 16, 31);
      }
      if (definition.id === 'door_house') {
        g.fillStyle(0x6b3f23, 1);
        g.fillRect(6, 3, 20, 29);
        g.fillStyle(0x8a572f, 1);
        g.fillRect(9, 5, 5, 25);
        g.fillRect(17, 5, 5, 25);
        g.fillStyle(0xe3bf62, 1);
        g.fillCircle(22, 18, 2);
        g.lineStyle(2, 0x2f1b10, 1);
        g.strokeRect(6, 3, 20, 29);
      }
      if (definition.id === 'wood_fence') {
        g.fillStyle(0x7b4e29, 1);
        g.fillRect(2, 9, 5, 22);
        g.fillRect(13, 7, 5, 24);
        g.fillRect(24, 9, 5, 22);
        g.fillStyle(0xb98248, 1);
        g.fillRect(0, 15, 32, 5);
        g.fillRect(0, 24, 32, 5);
        g.lineStyle(1, 0x3e2617, 0.7);
        g.strokeRect(0, 15, 32, 5);
        g.strokeRect(0, 24, 32, 5);
      }
    });
  }

  generate(scene, 'object:chest', 28, 24, (g) => {
    g.fillStyle(0x8c5420, 1);
    g.fillRect(3, 7, 22, 14);
    g.fillStyle(0xf1c75b, 1);
    g.fillRect(12, 11, 4, 5);
    g.lineStyle(2, 0x3a2415, 1);
    g.strokeRect(3, 7, 22, 14);
  });
  generate(scene, 'object:save', 30, 34, (g) => {
    g.fillStyle(0x82e8ff, 0.8);
    g.fillTriangle(15, 2, 25, 15, 15, 28);
    g.fillTriangle(15, 2, 5, 15, 15, 28);
    g.fillStyle(0xffffff, 0.8);
    g.fillCircle(15, 12, 4);
  });
  generate(scene, 'object:sign', 30, 30, (g) => {
    g.fillStyle(0x7a4a26, 1);
    g.fillRect(13, 12, 4, 15);
    g.fillStyle(0xd9b46a, 1);
    g.fillRect(3, 3, 24, 13);
    g.lineStyle(1, 0x3a2415, 1);
    g.strokeRect(3, 3, 24, 13);
  });
  generate(scene, 'npc:base', 28, 34, (g) => {
    g.fillStyle(0xf4c47a, 1);
    g.fillCircle(14, 9, 7);
    g.fillStyle(0x4b72b8, 1);
    g.fillRoundedRect(7, 16, 14, 15, 4);
    g.fillStyle(0x212733, 1);
    g.fillRect(10, 29, 4, 4);
    g.fillRect(16, 29, 4, 4);
  });
  generateNpc(scene, 'npc:elder-rowan', {
    skin: 0xf0c987,
    hair: 0xbfc7bd,
    beard: 0xd9ddd0,
    shirt: 0x486b47,
    trim: 0xd6c47a,
    legs: 0x3a3028,
    accent: 0xe4d57a,
    tool: 'staff'
  });
  generateNpc(scene, 'npc:greenhollow-guard', {
    skin: 0xe8b575,
    hair: 0x5b3425,
    hat: 0x9aa7ad,
    shirt: 0x65727a,
    trim: 0x243344,
    legs: 0x333940,
    accent: 0xe0c15a,
    tool: 'spear'
  });
  generateNpc(scene, 'npc:mara', {
    skin: 0xf2c184,
    hair: 0xa44f2e,
    shirt: 0x2f8c73,
    trim: 0xf0cf65,
    legs: 0x24443c,
    accent: 0xd95d6a,
    tool: 'basket'
  });
  generateNpc(scene, 'npc:shopkeeper', {
    skin: 0xf0bd7a,
    hair: 0x6e3f25,
    hat: 0xd4b365,
    shirt: 0x9a5c34,
    trim: 0xf0e2bd,
    legs: 0x49311f,
    accent: 0xd8bf76,
    tool: 'satchel'
  });
  generateNpc(scene, 'npc:innkeeper', {
    skin: 0xf4c482,
    hair: 0x74402b,
    shirt: 0xa0524a,
    trim: 0xf1d6a1,
    legs: 0x54342f,
    accent: 0xf4e4ba,
    tool: 'basket'
  });
  generateNpc(scene, 'npc:trainer', {
    skin: 0xf0c184,
    hair: 0x2b2640,
    shirt: 0x5a4da0,
    trim: 0x9ed7e9,
    legs: 0x312b55,
    accent: 0xf0d76a,
    tool: 'book'
  });
  generateNpc(scene, 'npc:town-keeper', {
    skin: 0xf0c184,
    hair: 0x6b482c,
    shirt: 0xd6a84b,
    trim: 0xf7e7b4,
    legs: 0x4d3a26,
    accent: 0x8fc9d9,
    tool: 'book'
  });
  generateNpc(scene, 'npc:worker', {
    skin: 0xe0a968,
    hair: 0x3d2a1d,
    hat: 0xb47b38,
    shirt: 0x6c5b49,
    trim: 0xd49b52,
    legs: 0x332b24,
    accent: 0xc9c2ad,
    tool: 'hammer'
  });
  generateNpc(scene, 'npc:scout', {
    skin: 0xe8b879,
    hair: 0x56351f,
    shirt: 0x3f6d52,
    trim: 0x92b678,
    legs: 0x2f3a2d,
    accent: 0xd9bd6a,
    tool: 'satchel'
  });
  generate(scene, 'enemy:default', 30, 28, (g) => {
    g.fillStyle(0xc45b58, 1);
    g.fillCircle(15, 15, 11);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(11, 12, 2);
    g.fillCircle(19, 12, 2);
  });

  for (const enemy of Object.values(ENEMIES)) {
    generate(scene, `enemy:${enemy.id}`, 34, 30, (g) => {
      drawEnemySprite(g, enemy);
    });
  }

  for (const direction of directions) {
    generate(scene, `player:${direction}`, 30, 38, (g) => {
      g.fillStyle(0xf1c75b, 1);
      g.fillCircle(15, 8, 7);
      g.fillStyle(0x2f63bd, 1);
      g.fillRoundedRect(7, 15, 16, 17, 4);
      g.fillStyle(0x16233c, 1);
      g.fillRect(10, 31, 4, 5);
      g.fillRect(17, 31, 4, 5);
      g.fillStyle(0xffffff, 0.9);
      const marker = {
        north: [15, 1],
        northeast: [24, 5],
        east: [27, 17],
        southeast: [24, 29],
        south: [15, 36],
        southwest: [6, 29],
        west: [3, 17],
        northwest: [6, 5]
      }[direction];
      g.fillCircle(marker[0], marker[1], 3);
    });
  }

  for (const [key, color] of Object.entries({
    grassland: 0x6cbf5e,
    cave: 0x3d3330,
    road: 0xad855a,
    ruin: 0x6f6c82,
    river: 0x397ca2,
    shrine: 0x5364a0,
    mine: 0x4c4a45,
    fortress: 0x626675,
    capital: 0xd2b56a,
    eclipse: 0x181729,
    dungeon: 0x2b2d42,
    castle: 0x555866,
    town: 0x6fbf73,
    special: 0x35364a
  })) {
    generate(scene, `backdrop:${key}`, 320, 180, (g) => {
      g.fillGradientStyle(color, color, 0x101620, 0x101620, 1);
      g.fillRect(0, 0, 320, 180);
      g.fillStyle(0xffffff, 0.06);
      for (let i = 0; i < 18; i += 1) g.fillCircle(12 + i * 18, 35 + ((i * 23) % 90), 8 + (i % 3) * 4);
    });
  }
};
