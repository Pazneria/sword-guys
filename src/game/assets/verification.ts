import { buildAssetOutputContract } from './contracts';
import { IMAGE_GEN_ASSETS, ImageGenAssetEntry } from './manifest';
import { parsePngInfo, PngInfo } from './png';

export interface AssetPngExpectation {
  width?: number;
  height?: number;
  widthMultiple?: number;
  heightMultiple?: number;
  aspectRatio?: number;
  transparent: boolean;
}

export interface AssetVerificationResult {
  assetId: string;
  targetPath: string;
  ok: boolean;
  png: PngInfo | null;
  errors: string[];
}

const isSharedGreenhollowNpcSheet = (entry: ImageGenAssetEntry) =>
  entry.kind === 'npcSprite' && entry.targetPath.endsWith('/greenhollow-npcs.png');

export const pngExpectationForAsset = (entry: ImageGenAssetEntry): AssetPngExpectation => {
  const contract = buildAssetOutputContract(entry);
  if (entry.kind === 'npcSprite' && isSharedGreenhollowNpcSheet(entry)) {
    return { widthMultiple: 64, height: 64, transparent: contract.transparent };
  }
  if (entry.kind === 'npcSprite') return { width: 64, height: 64, transparent: contract.transparent };
  if (entry.kind === 'enemySprite') return { transparent: contract.transparent };
  if (entry.kind === 'battleBackdrop') return { aspectRatio: 16 / 9, transparent: contract.transparent };
  if (entry.kind === 'tileset') return { widthMultiple: 32, heightMultiple: 32, transparent: contract.transparent };
  return {
    width: (entry.frameWidth ?? 64) * (entry.frameCount ?? 1),
    height: entry.frameHeight ?? 64,
    transparent: contract.transparent
  };
};

export const verifyAssetPngBytes = (entry: ImageGenAssetEntry, bytes: Uint8Array): AssetVerificationResult => {
  const png = parsePngInfo(bytes);
  const expected = pngExpectationForAsset(entry);
  const errors: string[] = [];

  if (!png) {
    errors.push('File is not a readable PNG.');
  } else {
    if (expected.width !== undefined && png.width !== expected.width) errors.push(`Expected width ${expected.width}, got ${png.width}.`);
    if (expected.height !== undefined && png.height !== expected.height) errors.push(`Expected height ${expected.height}, got ${png.height}.`);
    if (expected.widthMultiple !== undefined && png.width % expected.widthMultiple !== 0) {
      errors.push(`Expected width to be divisible by ${expected.widthMultiple}, got ${png.width}.`);
    }
    if (expected.heightMultiple !== undefined && png.height % expected.heightMultiple !== 0) {
      errors.push(`Expected height to be divisible by ${expected.heightMultiple}, got ${png.height}.`);
    }
    if (expected.aspectRatio !== undefined) {
      const ratio = png.width / Math.max(1, png.height);
      if (Math.abs(ratio - expected.aspectRatio) > 0.025) errors.push(`Expected 16:9 aspect ratio, got ${png.width}x${png.height}.`);
    }
    if (expected.transparent && !png.hasAlpha) errors.push('Expected PNG alpha channel.');
  }

  return {
    assetId: entry.id,
    targetPath: entry.targetPath,
    ok: errors.length === 0,
    png,
    errors
  };
};

export const productionEvidenceErrorsForAsset = (entry: ImageGenAssetEntry) => {
  const errors: string[] = [];
  if (entry.status !== 'approved') return errors;

  if (!entry.production) {
    errors.push('Approved production asset is missing Sword Guys production evidence.');
    return errors;
  }
  if (entry.production.source !== 'purpose-built-imagegen') errors.push('Approved production asset source must be purpose-built-imagegen.');
  if (entry.production.generatedFor !== 'sword-guys') errors.push('Approved production asset generatedFor must be sword-guys.');
  if (entry.production.reviewNote.length < 20) errors.push('Approved production asset reviewNote must describe the Sword Guys visual review.');

  return errors;
};

const withProductionEvidenceCheck = (entry: ImageGenAssetEntry, result: AssetVerificationResult): AssetVerificationResult => {
  const evidenceErrors = productionEvidenceErrorsForAsset(entry);
  const errors = [...result.errors, ...evidenceErrors];
  return {
    ...result,
    ok: errors.length === 0,
    errors
  };
};

export const verifyApprovedAssetFiles = async (
  loadBytes: (targetPath: string) => Promise<Uint8Array | null>,
  entries: ImageGenAssetEntry[] = IMAGE_GEN_ASSETS
) => {
  const approvedPublicEntries = entries.filter((entry) => entry.status === 'approved' && entry.targetPath.startsWith('public/'));
  const results: AssetVerificationResult[] = [];

  for (const entry of approvedPublicEntries) {
    const bytes = await loadBytes(entry.targetPath);
    if (!bytes) {
      results.push({
        assetId: entry.id,
        targetPath: entry.targetPath,
        ok: false,
        png: null,
        errors: ['Approved asset file could not be loaded.']
      });
      continue;
    }
    results.push(withProductionEvidenceCheck(entry, verifyAssetPngBytes(entry, bytes)));
  }

  return {
    total: results.length,
    passed: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).length,
    failures: results.filter((result) => !result.ok),
    results
  };
};

export const verifyApprovedAssetUrls = () =>
  verifyApprovedAssetFiles(async (targetPath) => {
    const response = await fetch(`/${targetPath.replace(/^public\//, '')}`);
    if (!response.ok) return null;
    return new Uint8Array(await response.arrayBuffer());
  });
