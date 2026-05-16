import { AssetKind, AssetStatus, IMAGE_GEN_ASSETS, ImageGenAssetEntry } from './manifest';
import { ITEM_ICON_ASSETS, ItemIconAsset } from '../items/icons';

export type RuntimeAssetKind = AssetKind | 'itemIcon';
export type RuntimeAssetLoader = 'image' | 'spritesheet';

export interface RuntimeAssetLoad {
  id: string;
  kind: RuntimeAssetKind;
  key: string;
  targetPath: string;
  url: string;
  loader: RuntimeAssetLoader;
  frameWidth?: number;
  frameHeight?: number;
  frameCount?: number;
  frameDurationMs?: number;
}

export interface SpellEffectRuntimeSpec {
  id: string;
  key: string;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  frameDurationMs: number;
}

const LOADABLE_STATUSES = new Set<AssetStatus>(['approved']);

const publicUrl = (targetPath: string) => `/${targetPath.replace(/^public\//, '')}`;

const tileRuntimeKey: Record<string, string> = {
  greenhollow: 'tiles:greenhollow',
  overworld_main: 'tiles:overworld-greenhollow',
  overworld_details: 'tiles:overworld-greenhollow-details',
  weapon_shop: 'tiles:weapon-shop',
  inn: 'tiles:inn',
  inn_lobby: 'tiles:inn-lobby',
  inn_bedroom: 'tiles:inn-bedroom'
};

const runtimeLoadForEntry = (entry: ImageGenAssetEntry): RuntimeAssetLoad | null => {
  if (!LOADABLE_STATUSES.has(entry.status) || !entry.targetPath.startsWith('public/')) return null;

  if (entry.kind === 'battleBackdrop') {
    return { id: entry.id, kind: entry.kind, key: `backdrop:${entry.id}`, targetPath: entry.targetPath, url: publicUrl(entry.targetPath), loader: 'image' };
  }

  if (entry.kind === 'enemySprite') {
    return { id: entry.id, kind: entry.kind, key: `enemy:${entry.id}`, targetPath: entry.targetPath, url: publicUrl(entry.targetPath), loader: 'image' };
  }

  if (entry.kind === 'npcSprite') {
    if (entry.targetPath.endsWith('/greenhollow-npcs.png')) {
      return {
        id: 'greenhollow_npc_sheet',
        kind: entry.kind,
        key: 'npc:greenhollow:npcs',
        targetPath: entry.targetPath,
        url: publicUrl(entry.targetPath),
        loader: 'spritesheet',
        frameWidth: 64,
        frameHeight: 64
      };
    }
    return { id: entry.id, kind: entry.kind, key: `npc:${entry.id}`, targetPath: entry.targetPath, url: publicUrl(entry.targetPath), loader: 'image' };
  }

  if (entry.kind === 'tileset') {
    return {
      id: entry.id,
      kind: entry.kind,
      key: tileRuntimeKey[entry.id] ?? `tiles:${entry.id}`,
      targetPath: entry.targetPath,
      url: publicUrl(entry.targetPath),
      loader: 'spritesheet',
      frameWidth: entry.frameWidth ?? 32,
      frameHeight: entry.frameHeight ?? 32
    };
  }

  if (entry.kind === 'spellEffect') {
    return {
      id: entry.id,
      kind: entry.kind,
      key: `spell:${entry.id}`,
      targetPath: entry.targetPath,
      url: publicUrl(entry.targetPath),
      loader: 'spritesheet',
      frameWidth: entry.frameWidth ?? 64,
      frameHeight: entry.frameHeight ?? 64,
      frameCount: entry.frameCount,
      frameDurationMs: entry.frameDurationMs
    };
  }

  return null;
};

const runtimeLoadForItemIcon = (entry: ItemIconAsset): RuntimeAssetLoad => ({
  id: entry.id,
  kind: 'itemIcon',
  key: entry.runtimeKey,
  targetPath: entry.targetPath,
  url: entry.url,
  loader: 'image'
});

export const getApprovedRuntimeAssetLoads = (kinds?: RuntimeAssetKind[]): RuntimeAssetLoad[] => {
  const kindFilter = kinds ? new Set(kinds) : null;
  const byKey = new Map<string, RuntimeAssetLoad>();
  for (const entry of IMAGE_GEN_ASSETS) {
    if (kindFilter && !kindFilter.has(entry.kind)) continue;
    const load = runtimeLoadForEntry(entry);
    if (!load || byKey.has(load.key)) continue;
    byKey.set(load.key, load);
  }
  for (const entry of ITEM_ICON_ASSETS) {
    if (kindFilter && !kindFilter.has('itemIcon')) continue;
    const load = runtimeLoadForItemIcon(entry);
    if (byKey.has(load.key)) continue;
    byKey.set(load.key, load);
  }
  return [...byKey.values()];
};

export const runtimeAssetKeyForId = (assetId: string) => {
  const entry = IMAGE_GEN_ASSETS.find((candidate) => candidate.id === assetId);
  if (!entry) return null;
  return runtimeLoadForEntry(entry)?.key ?? null;
};

export const spellEffectRuntimeSpecForId = (spellId: string): SpellEffectRuntimeSpec | null => {
  const entry = IMAGE_GEN_ASSETS.find((candidate) => candidate.id === spellId && candidate.kind === 'spellEffect');
  if (!entry) return null;
  return {
    id: entry.id,
    key: `spell:${entry.id}`,
    frameWidth: entry.frameWidth ?? 64,
    frameHeight: entry.frameHeight ?? 64,
    frameCount: entry.frameCount ?? 1,
    frameDurationMs: entry.frameDurationMs ?? 55
  };
};
