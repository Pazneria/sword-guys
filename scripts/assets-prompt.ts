import {
  ASSET_GENERATION_BATCHES,
  AssetGenerationBatchId,
  buildImageGenerationPromptBundle,
  getAssetGenerationBatch
} from '../src/game/assets/pipeline';

const args = process.argv.slice(2);
const includeApproved = args.includes('--include-approved');
const batchId = args.find((arg) => !arg.startsWith('--')) as AssetGenerationBatchId | undefined;

if (!batchId || batchId === 'list') {
  console.log('Available asset batches:');
  for (const batch of ASSET_GENERATION_BATCHES) console.log(`- ${batch.id}: ${batch.title}`);
  process.exit(batchId ? 0 : 1);
}

try {
  getAssetGenerationBatch(batchId);
  console.log(buildImageGenerationPromptBundle(batchId, { includeApproved }));
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  console.error(`Known batches: ${ASSET_GENERATION_BATCHES.map((batch) => batch.id).join(', ')}`);
  process.exit(1);
}
