import { AssetProductionEvidence, IMAGE_GEN_ASSETS, ImageGenAssetEntry } from './manifest';

export type AssetReceiptSource = 'purpose-built-imagegen';
export type AssetReceiptCreatedWith = 'built-in-image-gen' | 'imagegen-cli' | 'external-imagegen';

export interface AssetProductionReceipt {
  assetId: string;
  targetPath: string;
  source: AssetReceiptSource;
  generatedFor: 'sword-guys';
  createdWith: AssetReceiptCreatedWith;
  manifestPrompt: string;
  finalPrompt: string;
  reviewNote: string;
}

const CREATED_WITH_VALUES = new Set<AssetReceiptCreatedWith>(['built-in-image-gen', 'imagegen-cli', 'external-imagegen']);

export const receiptPathForAsset = (entry: ImageGenAssetEntry) => `${entry.targetPath}.receipt.json`;

export const assetEntryById = (assetId: string, entries: ImageGenAssetEntry[] = IMAGE_GEN_ASSETS) =>
  entries.find((entry) => entry.id === assetId) ?? null;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const readString = (record: Record<string, unknown>, key: keyof AssetProductionReceipt) =>
  typeof record[key] === 'string' ? record[key] : '';

export const parseAssetProductionReceipt = (source: string): AssetProductionReceipt | null => {
  try {
    const parsed: unknown = JSON.parse(source);
    if (!isRecord(parsed)) return null;
    return {
      assetId: readString(parsed, 'assetId'),
      targetPath: readString(parsed, 'targetPath'),
      source: readString(parsed, 'source') as AssetReceiptSource,
      generatedFor: readString(parsed, 'generatedFor') as 'sword-guys',
      createdWith: readString(parsed, 'createdWith') as AssetReceiptCreatedWith,
      manifestPrompt: readString(parsed, 'manifestPrompt'),
      finalPrompt: readString(parsed, 'finalPrompt'),
      reviewNote: readString(parsed, 'reviewNote')
    };
  } catch {
    return null;
  }
};

export const validateAssetProductionReceipt = (entry: ImageGenAssetEntry, receipt: AssetProductionReceipt | null) => {
  const errors: string[] = [];
  if (!receipt) return ['Receipt is not valid JSON with the required production fields.'];

  if (receipt.assetId !== entry.id) errors.push(`Receipt assetId ${receipt.assetId || '(missing)'} does not match ${entry.id}.`);
  if (receipt.targetPath !== entry.targetPath) errors.push(`Receipt targetPath ${receipt.targetPath || '(missing)'} does not match ${entry.targetPath}.`);
  if (receipt.source !== 'purpose-built-imagegen') errors.push('Receipt source must be purpose-built-imagegen.');
  if (receipt.generatedFor !== 'sword-guys') errors.push('Receipt generatedFor must be sword-guys.');
  if (!CREATED_WITH_VALUES.has(receipt.createdWith)) errors.push(`Receipt createdWith must be one of ${[...CREATED_WITH_VALUES].join(', ')}.`);
  if (receipt.manifestPrompt !== entry.prompt) errors.push('Receipt manifestPrompt must exactly match the manifest prompt.');
  if (receipt.finalPrompt.length < 80) errors.push('Receipt finalPrompt must capture the image-generation prompt used for this asset.');
  if (receipt.reviewNote.length < 20) errors.push('Receipt reviewNote must describe the in-context Sword Guys visual review.');

  return errors;
};

export const productionEvidenceFromReceipt = (receipt: AssetProductionReceipt): AssetProductionEvidence => ({
  source: 'purpose-built-imagegen',
  generatedFor: 'sword-guys',
  reviewNote: receipt.reviewNote
});

export const buildAssetProductionReceipt = (
  entry: ImageGenAssetEntry,
  options: {
    createdWith: AssetReceiptCreatedWith;
    finalPrompt?: string;
    reviewNote: string;
  }
) =>
  JSON.stringify(
    {
      assetId: entry.id,
      targetPath: entry.targetPath,
      source: 'purpose-built-imagegen',
      generatedFor: 'sword-guys',
      createdWith: options.createdWith,
      manifestPrompt: entry.prompt,
      finalPrompt: options.finalPrompt ?? entry.prompt,
      reviewNote: options.reviewNote
    } satisfies AssetProductionReceipt,
    null,
    2
  );
