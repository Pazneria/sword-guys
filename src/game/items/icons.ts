import { ITEMS, SHOPS, SPELLS } from '../content';
import type { ItemCategory } from '../types';
import { parsePngInfo, PngInfo } from '../assets/png';
import { publicAssetUrl } from '../assets/publicPath';

export type ItemIconOwnerKind = 'item' | 'spell';

export interface ItemIconAsset {
  id: string;
  ownerKind: ItemIconOwnerKind;
  name: string;
  category: ItemCategory | 'spell';
  targetPath: string;
  url: string;
  runtimeKey: string;
  prompt: string;
  production: {
    source: 'purpose-built-procedural';
    generatedFor: 'sword-guys';
    reviewNote: string;
  };
  contract: {
    size: 48;
    transparent: true;
    runtimeUse: string;
    verification: string[];
  };
}

export interface ItemIconVerificationResult {
  assetId: string;
  targetPath: string;
  ok: boolean;
  png: PngInfo | null;
  errors: string[];
}

export interface ItemIconCoverageReport {
  requiredItemIds: string[];
  requiredSpellIds: string[];
  requiredShopEntryIds: string[];
  availableIconIds: string[];
  missingItemIds: string[];
  missingSpellIds: string[];
  missingShopEntryIds: string[];
  totalMissing: number;
  complete: boolean;
}

const uniqueSorted = (values: string[]) => [...new Set(values)].sort();
const itemIconPath = (id: string) => `public/assets/items/${id.replaceAll('_', '-')}.png`;

const itemVisual = (id: string, category: ItemCategory) => {
  if (id.includes('potion')) return 'round red glass potion bottle with cork, bright healing liquid, and tiny highlight';
  if (id === 'ether') return 'blue crystal mana flask with pale stopper and small magical sparkle';
  if (id === 'antidote') return 'green vial with leaf-shaped stopper and clean poison-cure silhouette';
  if (id === 'revive_charm') return 'gold sun charm on a cord with warm revival glow';
  if (id.includes('sword') || id.includes('blade')) return 'diagonal sword silhouette with distinct blade metal and compact hilt';
  if (id.includes('staff')) return 'wooden staff with a colored focus gem at the top';
  if (category === 'helmet') return 'headgear silhouette matching the item material, readable as cap, hood, or helm';
  if (category === 'bodyArmor') return 'front-facing armor or robe torso piece with clear shoulders and chest plate shape';
  if (category === 'legArmor') return 'paired leggings or greaves with boots, centered and readable at inventory scale';
  if (category === 'shield') return 'shield silhouette with material-specific rim and central shine';
  if (category === 'accessory') return 'small ring, charm, or amulet with distinct gem and chain shape';
  if (id.includes('key')) return 'ornate key silhouette with dark eclipse glow';
  if (id.includes('seal')) return 'round stamped route seal with wax-and-metal shine, no letters';
  if (id.includes('lumen')) return 'glass teardrop holding blue river light';
  if (id.includes('writ')) return 'rolled parchment with iron clasp, no readable writing';
  return 'quest relic silhouette with carved stone and simple colored glow';
};

const spellVisual = (id: string) => {
  if (id === 'spark') return 'yellow lightning sigil on a small spell scroll';
  if (id === 'mend') return 'green healing ring on a folded spell charm';
  if (id === 'ember') return 'orange fire glyph on a red spell scroll';
  if (id === 'river_mend') return 'blue water-healing ripple on a river-glass spell charm';
  if (id === 'frost_rune') return 'icy blue rune shard on a pale spell tile, no readable letters';
  return 'gold radiant sunburst glyph on a late-game spell scroll';
};

const buildIconAsset = (
  id: string,
  name: string,
  ownerKind: ItemIconOwnerKind,
  category: ItemIconAsset['category'],
  visual: string
): ItemIconAsset => {
  const targetPath = itemIconPath(id);
  return {
    id,
    ownerKind,
    name,
    category,
    targetPath,
    url: publicAssetUrl(targetPath),
    runtimeKey: `item:${id}`,
    prompt: `Create a 48x48 transparent pixel-art inventory icon for Sword Guys: ${name}. ${visual}. Centered object, crisp outline, readable at 24px UI scale, no scenery, no text, no watermark.`,
    production: {
      source: 'purpose-built-procedural',
      generatedFor: 'sword-guys',
      reviewNote: `Purpose-built Sword Guys ${name} icon generated from the item-icon contract, normalized to a transparent 48x48 PNG, and visually reviewed for inventory, shop, battle item, reward, and menu readability without text.`
    },
    contract: {
      size: 48,
      transparent: true,
      runtimeUse: `Displayed by DOM menus and available as runtime key item:${id}.`,
      verification: [
        'PNG must be 48x48 with alpha.',
        'Icon must remain readable in 24px menu rows.',
        'No labels, text, scenery, watermark, or reused unrelated game art.'
      ]
    }
  };
};

export const ITEM_ICON_ASSETS: ItemIconAsset[] = [
  ...Object.values(ITEMS).map((item) => buildIconAsset(item.id, item.name, 'item', item.category, itemVisual(item.id, item.category))),
  ...Object.values(SPELLS).map((spell) => buildIconAsset(spell.id, spell.name, 'spell', 'spell', spellVisual(spell.id)))
].sort((a, b) => a.id.localeCompare(b.id));

export const ITEM_ICON_ASSETS_BY_ID: Record<string, ItemIconAsset> = Object.fromEntries(
  ITEM_ICON_ASSETS.map((asset) => [asset.id, asset])
);

export const itemIconAssetForId = (id: string) => ITEM_ICON_ASSETS_BY_ID[id] ?? null;
export const itemIconUrlForId = (id: string) => itemIconAssetForId(id)?.url ?? null;
export const itemIconRuntimeKeyForId = (id: string) => itemIconAssetForId(id)?.runtimeKey ?? null;

export const buildItemIconCoverageReport = (): ItemIconCoverageReport => {
  const availableIconIds = uniqueSorted(ITEM_ICON_ASSETS.map((asset) => asset.id));
  const available = new Set(availableIconIds);
  const requiredItemIds = uniqueSorted(Object.keys(ITEMS));
  const requiredSpellIds = uniqueSorted(Object.keys(SPELLS));
  const requiredShopEntryIds = uniqueSorted(Object.values(SHOPS).flatMap((shop) => shop.inventory));
  const missingItemIds = requiredItemIds.filter((id) => !available.has(id));
  const missingSpellIds = requiredSpellIds.filter((id) => !available.has(id));
  const missingShopEntryIds = requiredShopEntryIds.filter((id) => !available.has(id));
  const totalMissing = missingItemIds.length + missingSpellIds.length + missingShopEntryIds.length;

  return {
    requiredItemIds,
    requiredSpellIds,
    requiredShopEntryIds,
    availableIconIds,
    missingItemIds,
    missingSpellIds,
    missingShopEntryIds,
    totalMissing,
    complete: totalMissing === 0
  };
};

export const formatItemIconCoverageReport = (report: ItemIconCoverageReport = buildItemIconCoverageReport()) =>
  [
    '# Sword Guys Item Icon Coverage',
    '',
    `Coverage complete: ${report.complete ? 'yes' : 'no'}`,
    `Item icons: ${report.requiredItemIds.length - report.missingItemIds.length}/${report.requiredItemIds.length}`,
    `Spell shop icons: ${report.requiredSpellIds.length - report.missingSpellIds.length}/${report.requiredSpellIds.length}`,
    `Shop entry icons: ${report.requiredShopEntryIds.length - report.missingShopEntryIds.length}/${report.requiredShopEntryIds.length}`,
    `Missing icons: ${report.totalMissing}`,
    report.totalMissing
      ? `Missing ids: ${[...report.missingItemIds, ...report.missingSpellIds, ...report.missingShopEntryIds].join(', ')}`
      : 'Missing ids: none'
  ].join('\n');

export const verifyItemIconPngBytes = (asset: ItemIconAsset, bytes: Uint8Array): ItemIconVerificationResult => {
  const png = parsePngInfo(bytes);
  const errors: string[] = [];
  if (!png) {
    errors.push('File is not a readable PNG.');
  } else {
    if (png.width !== asset.contract.size) errors.push(`Expected width ${asset.contract.size}, got ${png.width}.`);
    if (png.height !== asset.contract.size) errors.push(`Expected height ${asset.contract.size}, got ${png.height}.`);
    if (!png.hasAlpha) errors.push('Expected PNG alpha channel.');
  }
  if (asset.production.generatedFor !== 'sword-guys') errors.push('Icon production generatedFor must be sword-guys.');
  if (asset.production.reviewNote.length < 40) errors.push('Icon production reviewNote must describe the Sword Guys visual review.');

  return {
    assetId: asset.id,
    targetPath: asset.targetPath,
    ok: errors.length === 0,
    png,
    errors
  };
};

export const verifyItemIconFiles = async (loadBytes: (targetPath: string) => Promise<Uint8Array | null>) => {
  const results: ItemIconVerificationResult[] = [];
  for (const asset of ITEM_ICON_ASSETS) {
    const bytes = await loadBytes(asset.targetPath);
    results.push(
      bytes
        ? verifyItemIconPngBytes(asset, bytes)
        : { assetId: asset.id, targetPath: asset.targetPath, ok: false, png: null, errors: ['Item icon file could not be loaded.'] }
    );
  }
  return {
    total: results.length,
    passed: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).length,
    failures: results.filter((result) => !result.ok),
    results
  };
};
