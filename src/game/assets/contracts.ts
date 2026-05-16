import { ImageGenAssetEntry } from './manifest';

export interface AssetOutputContract {
  assetId: string;
  targetPath: string;
  transparent: boolean;
  outputShape: string;
  runtimeUse: string;
  verification: string[];
}

const isSharedGreenhollowNpcSheet = (entry: ImageGenAssetEntry) =>
  entry.kind === 'npcSprite' && entry.targetPath.endsWith('/greenhollow-npcs.png');

export const buildAssetOutputContract = (entry: ImageGenAssetEntry): AssetOutputContract => {
  if (entry.kind === 'npcSprite') {
    return {
      assetId: entry.id,
      targetPath: entry.targetPath,
      transparent: true,
      outputShape: isSharedGreenhollowNpcSheet(entry)
        ? 'Shared NPC spritesheet with 64x64 frames; one readable frame per listed NPC.'
        : 'Single 64x64 PNG, transparent background, character centered on bottom-middle anchor.',
      runtimeUse: isSharedGreenhollowNpcSheet(entry)
        ? 'Loaded as npc:greenhollow:npcs spritesheet and indexed by NPC frame.'
        : `Loaded as npc:${entry.id} image when the asset is approved.`,
      verification: [
        'PNG alpha must be preserved.',
        'Sprite must read clearly at 32px overworld display scale.',
        'No scenery, labels, text, watermark, or poster composition.'
      ]
    };
  }

  if (entry.kind === 'enemySprite') {
    return {
      assetId: entry.id,
      targetPath: entry.targetPath,
      transparent: true,
      outputShape: 'Single transparent PNG, centered battle sprite with consistent empty margin.',
      runtimeUse: `Loaded as enemy:${entry.id} image when the asset is approved.`,
      verification: [
        'PNG alpha must be preserved.',
        'Silhouette must read at 3x battle scale.',
        'Sprite must not include scenery, text, watermark, or a battle backdrop.'
      ]
    };
  }

  if (entry.kind === 'battleBackdrop') {
    return {
      assetId: entry.id,
      targetPath: entry.targetPath,
      transparent: false,
      outputShape: 'Opaque 16:9 PNG battle backdrop.',
      runtimeUse: `Loaded as backdrop:${entry.id} image and stretched to the battle viewport.`,
      verification: [
        'Ari has readable floor space on the left and enemies on the right.',
        'Lower third stays visually quiet for DOM battle UI.',
        'No characters, labels, text, or watermark.'
      ]
    };
  }

  if (entry.kind === 'tileset') {
    return {
      assetId: entry.id,
      targetPath: entry.targetPath,
      transparent: true,
      outputShape: 'Tileset PNG with dimensions divisible by 32; each tile occupies a 32x32 grid cell.',
      runtimeUse: `Loaded as a tileset spritesheet for ${entry.id} map rendering.`,
      verification: [
        'Tile boundaries must align to the 32x32 grid.',
        'Blocking props and walkable ground must remain visually distinct.',
        'No labels, text, watermark, or perspective scene composition.'
      ]
    };
  }

  const frameWidth = entry.frameWidth ?? 64;
  const frameHeight = entry.frameHeight ?? 64;
  const frameCount = entry.frameCount ?? 1;
  return {
    assetId: entry.id,
    targetPath: entry.targetPath,
    transparent: true,
    outputShape: `Horizontal transparent spell strip, ${frameCount} frames, ${frameWidth}x${frameHeight} per frame, total ${frameWidth * frameCount}x${frameHeight}.`,
    runtimeUse: `Loaded as spell:${entry.id} spritesheet and played before the procedural fallback.`,
    verification: [
      'Frames must be evenly spaced with no gutters unless the strip is normalized afterward.',
      'Effect must not obscure enemy HP bars or command feedback.',
      'No character, scenery, label, text, or watermark.'
    ]
  };
};

export const formatAssetOutputContract = (entry: ImageGenAssetEntry) => {
  const contract = buildAssetOutputContract(entry);
  return [
    `Output Contract: ${contract.outputShape}`,
    `Runtime Use: ${contract.runtimeUse}`,
    `Transparency: ${contract.transparent ? 'required' : 'not required'}`,
    `Verification: ${contract.verification.join(' | ')}`
  ].join('\n');
};
