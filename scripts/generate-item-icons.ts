import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { deflateSync } from 'node:zlib';
import { ITEM_ICON_ASSETS, ItemIconAsset } from '../src/game/items/icons';

type Rgba = [number, number, number, number];

const SIZE = 48;
const TRANSPARENT: Rgba = [0, 0, 0, 0];
const OUTLINE: Rgba = [29, 24, 30, 255];
const SHADOW: Rgba = [0, 0, 0, 70];
const WHITE: Rgba = [245, 241, 214, 255];
const GOLD: Rgba = [235, 183, 78, 255];
const SILVER: Rgba = [202, 214, 221, 255];
const STEEL: Rgba = [132, 147, 155, 255];
const IRON: Rgba = [106, 113, 121, 255];
const LEATHER: Rgba = [142, 86, 45, 255];
const CLOTH: Rgba = [106, 174, 118, 255];
const MAGE: Rgba = [78, 134, 187, 255];
const PLATE: Rgba = [214, 203, 156, 255];

const rgba = (hex: number): Rgba => [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255, 255];

const crcTable = new Uint32Array(256).map((_, index) => {
  let c = index;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

const crc32 = (bytes: Uint8Array) => {
  let c = 0xffffffff;
  for (const byte of bytes) c = crcTable[(c ^ byte) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

const u32 = (value: number) => {
  const bytes = new Uint8Array(4);
  bytes[0] = (value >>> 24) & 255;
  bytes[1] = (value >>> 16) & 255;
  bytes[2] = (value >>> 8) & 255;
  bytes[3] = value & 255;
  return bytes;
};

const chunk = (type: string, data = new Uint8Array()) => {
  const typeBytes = new TextEncoder().encode(type);
  const joined = new Uint8Array(typeBytes.length + data.length);
  joined.set(typeBytes);
  joined.set(data, typeBytes.length);
  return Buffer.concat([Buffer.from(u32(data.length)), Buffer.from(typeBytes), Buffer.from(data), Buffer.from(u32(crc32(joined)))]);
};

class Canvas48 {
  readonly data = new Uint8Array(SIZE * SIZE * 4);

  constructor() {
    for (let i = 0; i < SIZE * SIZE; i += 1) this.setRaw(i, TRANSPARENT);
  }

  private setRaw(index: number, color: Rgba) {
    const offset = index * 4;
    this.data[offset] = color[0];
    this.data[offset + 1] = color[1];
    this.data[offset + 2] = color[2];
    this.data[offset + 3] = color[3];
  }

  pixel(x: number, y: number, color: Rgba) {
    if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return;
    this.setRaw(y * SIZE + x, color);
  }

  rect(x: number, y: number, w: number, h: number, color: Rgba) {
    for (let yy = y; yy < y + h; yy += 1) {
      for (let xx = x; xx < x + w; xx += 1) this.pixel(xx, yy, color);
    }
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, color: Rgba) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y += 1) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x += 1) {
        if (((x - cx) * (x - cx)) / (rx * rx) + ((y - cy) * (y - cy)) / (ry * ry) <= 1) this.pixel(x, y, color);
      }
    }
  }

  strokeEllipse(cx: number, cy: number, rx: number, ry: number, color: Rgba) {
    this.ellipse(cx, cy, rx, ry, color);
    this.ellipse(cx, cy, Math.max(1, rx - 2), Math.max(1, ry - 2), TRANSPARENT);
  }

  diamond(cx: number, cy: number, rx: number, ry: number, color: Rgba) {
    for (let y = cy - ry; y <= cy + ry; y += 1) {
      const span = Math.floor(rx * (1 - Math.abs(y - cy) / ry));
      for (let x = cx - span; x <= cx + span; x += 1) this.pixel(x, y, color);
    }
  }

  line(x0: number, y0: number, x1: number, y1: number, color: Rgba, width = 1) {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let i = 0; i <= steps; i += 1) {
      const x = Math.round(x0 + ((x1 - x0) * i) / Math.max(1, steps));
      const y = Math.round(y0 + ((y1 - y0) * i) / Math.max(1, steps));
      const radius = Math.floor(width / 2);
      for (let yy = -radius; yy <= radius; yy += 1) {
        for (let xx = -radius; xx <= radius; xx += 1) this.pixel(x + xx, y + yy, color);
      }
    }
  }

  toPng() {
    const raw = new Uint8Array((SIZE * 4 + 1) * SIZE);
    for (let y = 0; y < SIZE; y += 1) {
      const rowStart = y * (SIZE * 4 + 1);
      raw[rowStart] = 0;
      raw.set(this.data.slice(y * SIZE * 4, (y + 1) * SIZE * 4), rowStart + 1);
    }
    const ihdr = new Uint8Array(13);
    ihdr.set(u32(SIZE), 0);
    ihdr.set(u32(SIZE), 4);
    ihdr[8] = 8;
    ihdr[9] = 6;
    const png = Buffer.concat([
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      chunk('IHDR', ihdr),
      chunk('IDAT', deflateSync(raw)),
      chunk('IEND')
    ]);
    return png;
  }
}

const materialFor = (id: string, category: string): Rgba => {
  if (id.includes('wooden') || id.includes('rusty')) return id.includes('wooden') ? rgba(0xa86f3d) : rgba(0x9a6a43);
  if (id.includes('iron')) return IRON;
  if (id.includes('steel') || id.includes('chain')) return STEEL;
  if (id.includes('silver')) return rgba(0xd9e6ee);
  if (id.includes('enchanted') || id.includes('eclipse')) return rgba(0xa57bed);
  if (id.includes('leather')) return LEATHER;
  if (id.includes('cloth')) return CLOTH;
  if (id.includes('mage') || id.includes('river')) return MAGE;
  if (id.includes('plate') || id.includes('sunward')) return PLATE;
  if (category === 'shield') return STEEL;
  return GOLD;
};

const base = () => {
  const c = new Canvas48();
  c.ellipse(24, 38, 15, 4, SHADOW);
  return c;
};

const drawPotion = (c: Canvas48, fill: Rgba) => {
  c.rect(20, 8, 8, 7, OUTLINE);
  c.rect(21, 9, 6, 5, WHITE);
  c.ellipse(24, 27, 13, 15, OUTLINE);
  c.ellipse(24, 27, 10, 12, fill);
  c.rect(18, 17, 12, 5, fill);
  c.rect(28, 20, 4, 9, [255, 255, 255, 95]);
  c.pixel(29, 18, [255, 255, 255, 150]);
};

const drawSword = (c: Canvas48, blade: Rgba) => {
  c.line(13, 35, 34, 12, OUTLINE, 7);
  c.line(13, 35, 34, 12, blade, 4);
  c.line(16, 37, 10, 31, OUTLINE, 4);
  c.line(17, 36, 11, 30, GOLD, 2);
  c.rect(9, 36, 8, 5, OUTLINE);
  c.rect(10, 37, 6, 3, rgba(0x7d4a2b));
  c.pixel(31, 14, WHITE);
};

const drawStaff = (c: Canvas48, gem: Rgba) => {
  c.line(16, 39, 30, 9, OUTLINE, 5);
  c.line(16, 39, 30, 9, rgba(0x8b5b38), 2);
  c.ellipse(31, 10, 6, 6, OUTLINE);
  c.ellipse(31, 10, 4, 4, gem);
  c.pixel(33, 8, WHITE);
};

const drawHelmet = (c: Canvas48, id: string, color: Rgba) => {
  c.ellipse(24, 24, 15, 13, OUTLINE);
  c.ellipse(24, 24, 12, 10, color);
  if (id.includes('hood')) {
    c.rect(13, 25, 22, 10, OUTLINE);
    c.rect(16, 26, 16, 8, color);
  } else {
    c.rect(13, 24, 22, 7, OUTLINE);
    c.rect(15, 24, 18, 5, color);
    c.rect(23, 14, 2, 17, WHITE);
  }
};

const drawArmor = (c: Canvas48, id: string, color: Rgba) => {
  c.rect(15, 14, 18, 25, OUTLINE);
  c.rect(17, 16, 14, 21, color);
  c.rect(10, 18, 7, 12, OUTLINE);
  c.rect(31, 18, 7, 12, OUTLINE);
  c.rect(11, 19, 5, 10, color);
  c.rect(32, 19, 5, 10, color);
  if (id.includes('chain')) {
    for (let y = 19; y < 34; y += 4) c.line(18, y, 30, y, rgba(0xc8d3d8), 1);
  } else if (id.includes('robe')) {
    c.diamond(24, 27, 11, 14, color);
    c.diamond(24, 27, 7, 10, rgba(0x65bce0));
  } else {
    c.line(18, 22, 30, 22, WHITE, 1);
  }
};

const drawLegs = (c: Canvas48, color: Rgba) => {
  c.rect(14, 13, 8, 26, OUTLINE);
  c.rect(26, 13, 8, 26, OUTLINE);
  c.rect(16, 15, 5, 22, color);
  c.rect(27, 15, 5, 22, color);
  c.rect(12, 37, 11, 4, OUTLINE);
  c.rect(25, 37, 11, 4, OUTLINE);
};

const drawShield = (c: Canvas48, color: Rgba) => {
  c.diamond(24, 25, 17, 20, OUTLINE);
  c.diamond(24, 25, 13, 16, color);
  c.line(24, 12, 24, 38, WHITE, 2);
  c.line(17, 24, 31, 24, [255, 255, 255, 95], 1);
};

const drawAccessory = (c: Canvas48, id: string, color: Rgba) => {
  if (id.includes('ring')) {
    c.strokeEllipse(24, 25, 13, 13, OUTLINE);
    c.strokeEllipse(24, 25, 10, 10, color);
    c.ellipse(24, 12, 4, 4, rgba(0xffcc66));
  } else {
    c.line(16, 13, 24, 22, OUTLINE, 3);
    c.line(32, 13, 24, 22, OUTLINE, 3);
    c.diamond(24, 28, 10, 12, OUTLINE);
    c.diamond(24, 28, 7, 9, color);
    c.pixel(26, 24, WHITE);
  }
};

const drawKeyItem = (c: Canvas48, id: string) => {
  if (id.includes('key')) {
    c.strokeEllipse(18, 19, 8, 8, OUTLINE);
    c.strokeEllipse(18, 19, 5, 5, rgba(0xb98df4));
    c.line(24, 24, 36, 36, OUTLINE, 5);
    c.line(24, 24, 36, 36, GOLD, 2);
    c.rect(34, 33, 8, 3, OUTLINE);
    c.rect(37, 29, 3, 7, OUTLINE);
  } else if (id.includes('writ')) {
    c.rect(13, 14, 22, 22, OUTLINE);
    c.rect(15, 16, 18, 18, rgba(0xe8d1a3));
    c.rect(19, 11, 10, 5, OUTLINE);
    c.rect(19, 33, 10, 5, OUTLINE);
  } else if (id.includes('seal')) {
    c.ellipse(24, 24, 15, 15, OUTLINE);
    c.ellipse(24, 24, 12, 12, rgba(0xc24f48));
    c.diamond(24, 24, 7, 7, GOLD);
  } else if (id.includes('lumen')) {
    c.diamond(24, 25, 13, 18, OUTLINE);
    c.diamond(24, 25, 10, 14, rgba(0x7bd8ff));
    c.ellipse(24, 26, 5, 6, [255, 255, 255, 120]);
  } else {
    c.diamond(24, 25, 15, 15, OUTLINE);
    c.diamond(24, 25, 11, 11, rgba(0x8ca36d));
    c.line(19, 25, 29, 25, rgba(0xcfe6a1), 1);
  }
};

const drawSpell = (c: Canvas48, id: string) => {
  c.rect(12, 13, 24, 22, OUTLINE);
  c.rect(14, 15, 20, 18, rgba(0xf0dfb5));
  const color =
    id === 'spark'
      ? rgba(0xffe45c)
      : id === 'mend'
        ? rgba(0x6fd98e)
        : id === 'ember'
          ? rgba(0xff7a36)
          : id === 'river_mend'
            ? rgba(0x5cc8ff)
            : id === 'frost_rune'
              ? rgba(0xbbefff)
              : rgba(0xffcf5a);
  if (id === 'spark') {
    c.line(25, 17, 20, 25, color, 3);
    c.line(20, 25, 27, 24, color, 3);
    c.line(27, 24, 22, 32, color, 3);
  } else if (id.includes('mend')) {
    c.strokeEllipse(24, 24, 7, 7, color);
    c.line(24, 18, 24, 30, color, 2);
    c.line(18, 24, 30, 24, color, 2);
  } else if (id === 'ember') {
    c.diamond(24, 25, 6, 10, color);
    c.diamond(24, 28, 4, 6, rgba(0xffcf5a));
  } else if (id === 'frost_rune') {
    c.line(17, 24, 31, 24, color, 2);
    c.line(24, 17, 24, 31, color, 2);
    c.line(19, 19, 29, 29, color, 2);
  } else {
    c.ellipse(24, 24, 8, 8, color);
    c.line(24, 13, 24, 35, color, 1);
    c.line(13, 24, 35, 24, color, 1);
  }
};

const drawIcon = (asset: ItemIconAsset) => {
  const c = base();
  if (asset.ownerKind === 'spell') {
    drawSpell(c, asset.id);
    return c.toPng();
  }
  if (asset.category === 'consumable') {
    const fill = asset.id === 'ether' ? rgba(0x4dbde8) : asset.id === 'antidote' ? rgba(0x5fc56d) : asset.id === 'revive_charm' ? GOLD : rgba(0xe25a54);
    if (asset.id === 'revive_charm') drawAccessory(c, asset.id, fill);
    else drawPotion(c, fill);
  } else if (asset.category === 'weapon') {
    if (asset.id.includes('staff')) drawStaff(c, asset.id.includes('master') ? rgba(0xffd66b) : rgba(0x61c8ff));
    else drawSword(c, materialFor(asset.id, asset.category));
  } else if (asset.category === 'helmet') {
    drawHelmet(c, asset.id, materialFor(asset.id, asset.category));
  } else if (asset.category === 'bodyArmor') {
    drawArmor(c, asset.id, materialFor(asset.id, asset.category));
  } else if (asset.category === 'legArmor') {
    drawLegs(c, materialFor(asset.id, asset.category));
  } else if (asset.category === 'shield') {
    drawShield(c, materialFor(asset.id, asset.category));
  } else if (asset.category === 'accessory') {
    drawAccessory(c, asset.id, materialFor(asset.id, asset.category));
  } else if (asset.category === 'keyItem') {
    drawKeyItem(c, asset.id);
  }
  return c.toPng();
};

for (const asset of ITEM_ICON_ASSETS) {
  const outputPath = resolve(asset.targetPath);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, drawIcon(asset));
}

console.log(`Generated ${ITEM_ICON_ASSETS.length} item and shop icons in public/assets/items.`);
