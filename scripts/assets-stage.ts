import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { basename } from 'node:path';
import {
  ASSET_GENERATION_BATCHES,
  AssetGenerationBatchId,
  getAssetBatchEntries,
  generationQueueForBatch
} from '../src/game/assets/pipeline';
import {
  buildAssetPromptStageText,
  buildAssetReceiptTemplateText,
  buildAssetStagePlan
} from '../src/game/assets/staging';
import { buildAssetReadinessReport } from '../src/game/assets/readiness';

const args = process.argv.slice(2);
const batchArg = args.find((arg) => !arg.startsWith('--')) as AssetGenerationBatchId | 'next' | undefined;
const write = args.includes('--write');
const checkOnly = args.includes('--check');

const knownBatchIds = new Set(ASSET_GENERATION_BATCHES.map((batch) => batch.id));
if (!batchArg || batchArg === ('list' as AssetGenerationBatchId)) {
  console.log('Available asset batches:');
  console.log('- next: current next incomplete production batch');
  for (const batch of ASSET_GENERATION_BATCHES) console.log(`- ${batch.id}: ${batch.title}`);
  process.exit(batchArg ? 0 : 1);
}
const resolvedBatchId =
  batchArg === 'next'
    ? buildAssetReadinessReport().nextBatchId
    : batchArg;

if (!resolvedBatchId) {
  const message = 'No next production batch is available.';
  if (checkOnly || write) {
    console.log(message);
    process.exit(0);
  }
  console.error(message);
  process.exit(1);
}

if (!knownBatchIds.has(resolvedBatchId)) {
  console.error(`Unknown batch: ${batchArg}`);
  console.error(`Known batches: ${[...knownBatchIds].join(', ')}`);
  process.exit(1);
}

const plan = buildAssetStagePlan(resolvedBatchId);
console.log(`# ${plan.title} Staging`);
console.log(`Batch ID: ${plan.batchId}`);
console.log(`Assets staged: ${plan.files.length}`);

for (const file of plan.files) {
  console.log(`- ${file.assetId}`);
  console.log(`  Prompt: ${file.promptPath}`);
  console.log(`  Receipt template: ${file.receiptTemplatePath}`);
  console.log(`  Target: ${file.targetPath}`);
}

if (!write && !checkOnly) {
  console.log('');
  console.log('Add --write to create prompt and receipt template files, or --check to verify existing files.');
  process.exit(0);
}

const entries = generationQueueForBatch(resolvedBatchId);
const entryById = new Map(getAssetBatchEntries(resolvedBatchId).map((entry) => [entry.id, entry]));
const expectedStageFileNames = new Set(
  plan.files.flatMap((file) => [basename(file.promptPath), basename(file.receiptTemplatePath)])
);
const generatedStageFilePattern = /^\d{2}-[a-z0-9-]+\.(prompt\.txt|receipt\.template\.json)$/;

if (write) {
  const stagingDirUrl = new URL(`../docs/asset-manifests/staging/${plan.batchId}/`, import.meta.url);
  try {
    const existingFiles = await readdir(stagingDirUrl);
    for (const fileName of existingFiles) {
      if (generatedStageFilePattern.test(fileName) && !expectedStageFileNames.has(fileName)) {
        await rm(new URL(fileName, stagingDirUrl));
      }
    }
  } catch {
    // Directory will be created below.
  }
}

for (const file of plan.files) {
  const entry = entryById.get(file.assetId);
  if (!entry || !entries.some((candidate) => candidate.id === entry.id)) continue;

  const promptUrl = new URL(`../${file.promptPath}`, import.meta.url);
  const receiptUrl = new URL(`../${file.receiptTemplatePath}`, import.meta.url);
  const expectedPrompt = `${buildAssetPromptStageText(entry)}\n`;
  const expectedReceipt = `${buildAssetReceiptTemplateText(entry)}\n`;

  if (checkOnly) {
    let currentPrompt = '';
    let currentReceipt = '';
    try {
      currentPrompt = await readFile(promptUrl, 'utf8');
    } catch {
      console.error(`Missing ${file.promptPath}`);
      process.exitCode = 1;
    }
    try {
      currentReceipt = await readFile(receiptUrl, 'utf8');
    } catch {
      console.error(`Missing ${file.receiptTemplatePath}`);
      process.exitCode = 1;
    }
    if (currentPrompt && currentPrompt !== expectedPrompt) {
      console.error(`Stale ${file.promptPath}`);
      process.exitCode = 1;
    }
    if (currentReceipt && currentReceipt !== expectedReceipt) {
      console.error(`Stale ${file.receiptTemplatePath}`);
      process.exitCode = 1;
    }
    continue;
  }

  await mkdir(new URL('.', promptUrl), { recursive: true });
  await mkdir(new URL('.', receiptUrl), { recursive: true });
  await writeFile(promptUrl, expectedPrompt, 'utf8');
  await writeFile(receiptUrl, expectedReceipt, 'utf8');
}

console.log('');
if (checkOnly) {
  if (!process.exitCode) console.log('Staging files are fresh.');
} else {
  console.log(`Wrote ${plan.files.length * 2} staging files.`);
}
