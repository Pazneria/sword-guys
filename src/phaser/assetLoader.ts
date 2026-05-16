import Phaser from 'phaser';
import { AssetKind } from '../game/assets/manifest';
import { getApprovedRuntimeAssetLoads, RuntimeAssetLoad } from '../game/assets/runtime';

export interface ApprovedImageGenLoadAction {
  asset: RuntimeAssetLoad;
  replaceExistingTexture: boolean;
}

const approvedImageGenTextureKeys = new Set<string>();

export const planApprovedImageGenTextureLoads = (
  assets: readonly RuntimeAssetLoad[],
  existingTextureKeys: ReadonlySet<string>,
  approvedTextureKeys: ReadonlySet<string>
): ApprovedImageGenLoadAction[] =>
  assets
    .map((asset) => ({
      asset,
      replaceExistingTexture: existingTextureKeys.has(asset.key) && !approvedTextureKeys.has(asset.key)
    }))
    .filter(({ asset, replaceExistingTexture }) => replaceExistingTexture || !existingTextureKeys.has(asset.key));

export const loadApprovedImageGenAssets = (scene: Phaser.Scene, kinds?: AssetKind[]) => {
  const assets = getApprovedRuntimeAssetLoads(kinds);
  const existingTextureKeys = new Set(assets.filter((asset) => scene.textures.exists(asset.key)).map((asset) => asset.key));

  for (const { asset, replaceExistingTexture } of planApprovedImageGenTextureLoads(assets, existingTextureKeys, approvedImageGenTextureKeys)) {
    if (replaceExistingTexture) scene.textures.remove(asset.key);
    if (asset.loader === 'spritesheet') {
      scene.load.spritesheet(asset.key, asset.url, {
        frameWidth: asset.frameWidth ?? 32,
        frameHeight: asset.frameHeight ?? 32
      });
    } else {
      scene.load.image(asset.key, asset.url);
    }
    approvedImageGenTextureKeys.add(asset.key);
  }
};
