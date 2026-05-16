import { formatAssetOutputContract } from './contracts';
import { ImageGenAssetEntry } from './manifest';
import {
  AssetGenerationBatchId,
  getAssetGenerationBatch,
  getAssetBatchEntries,
  generationQueueForBatch
} from './pipeline';
import { receiptPathForAsset } from './receipts';

export interface AssetStageFile {
  assetId: string;
  promptPath: string;
  receiptTemplatePath: string;
  targetPath: string;
}

export interface AssetStagePlan {
  batchId: AssetGenerationBatchId;
  title: string;
  files: AssetStageFile[];
}

const fileSlug = (index: number, entry: ImageGenAssetEntry) =>
  `${String(index + 1).padStart(2, '0')}-${entry.id.replaceAll('_', '-')}`;

export const buildAssetPromptStageText = (entry: ImageGenAssetEntry) =>
  [
    `Asset: ${entry.id}`,
    `Kind: ${entry.kind}`,
    `Target: ${entry.targetPath}`,
    `Receipt: ${receiptPathForAsset(entry)}`,
    '',
    'Prompt:',
    entry.prompt,
    '',
    formatAssetOutputContract(entry),
    '',
    'After saving the generated PNG at the target path:',
    `npm run assets:receipt -- --asset ${entry.id} --review-note "Purpose-built ${entry.id} art reviewed in Sword Guys QA." --write`
  ].join('\n');

export const buildAssetReceiptTemplateText = (entry: ImageGenAssetEntry) =>
  JSON.stringify(
    {
      assetId: entry.id,
      targetPath: entry.targetPath,
      source: 'purpose-built-imagegen',
      generatedFor: 'sword-guys',
      createdWith: 'built-in-image-gen',
      manifestPrompt: entry.prompt,
      finalPrompt: entry.prompt,
      reviewNote: 'TODO: replace after in-game Sword Guys visual review'
    },
    null,
    2
  );

export const buildAssetStagePlan = (batchId: AssetGenerationBatchId): AssetStagePlan => {
  const batch = getAssetGenerationBatch(batchId);
  const batchEntries = getAssetBatchEntries(batch.id);
  const entries = generationQueueForBatch(batch.id);

  return {
    batchId: batch.id,
    title: batch.title,
    files: entries.map((entry) => {
      const index = Math.max(0, batchEntries.findIndex((candidate) => candidate.id === entry.id));
      const slug = fileSlug(index, entry);
      return {
        assetId: entry.id,
        promptPath: `docs/asset-manifests/staging/${batch.id}/${slug}.prompt.txt`,
        receiptTemplatePath: `docs/asset-manifests/staging/${batch.id}/${slug}.receipt.template.json`,
        targetPath: entry.targetPath
      };
    })
  };
};
