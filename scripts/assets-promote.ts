import { readFile, writeFile } from 'node:fs/promises';
import { IMAGE_GEN_ASSETS, ImageGenAssetEntry } from '../src/game/assets/manifest';
import { ASSET_GENERATION_BATCHES, AssetGenerationBatchId, getAssetBatchEntries } from '../src/game/assets/pipeline';
import {
  applyAssetPromotionStatuses,
  buildAssetPromotionPlan,
  formatAssetPromotionPlan
} from '../src/game/assets/promotion';
import {
  parseAssetProductionReceipt,
  productionEvidenceFromReceipt,
  receiptPathForAsset,
  validateAssetProductionReceipt
} from '../src/game/assets/receipts';

const args = process.argv.slice(2);
const write = args.includes('--write');
const strict = args.includes('--strict');
const purposeBuilt = args.includes('--purpose-built');

const valuesAfter = (flag: string) =>
  args.flatMap((arg, index) => {
    if (arg === flag) return args[index + 1] && !args[index + 1].startsWith('--') ? [args[index + 1]] : [];
    if (arg.startsWith(`${flag}=`)) return [arg.slice(flag.length + 1)];
    return [];
  });

const assetIds = new Set(valuesAfter('--asset').flatMap((value) => value.split(',').map((item) => item.trim()).filter(Boolean)));
const batchId = valuesAfter('--batch')[0] as AssetGenerationBatchId | undefined;

const knownBatchIds = new Set(ASSET_GENERATION_BATCHES.map((batch) => batch.id));
if (batchId && !knownBatchIds.has(batchId)) {
  console.error(`Unknown batch: ${batchId}`);
  console.error(`Known batches: ${[...knownBatchIds].join(', ')}`);
  process.exit(1);
}

const entriesForScope = (): ImageGenAssetEntry[] => {
  const batchEntries = batchId ? getAssetBatchEntries(batchId) : IMAGE_GEN_ASSETS;
  if (!assetIds.size) return batchEntries;
  return batchEntries.filter((entry) => assetIds.has(entry.id));
};

const entries = entriesForScope();
const foundIds = new Set(entries.map((entry) => entry.id));
const unknownAssetIds = [...assetIds].filter((assetId) => !foundIds.has(assetId));
if (unknownAssetIds.length) {
  console.error(`Unknown asset ids in scope: ${unknownAssetIds.join(', ')}`);
  process.exit(1);
}

const fileExistsAndBytes = async (targetPath: string) => {
  try {
    return new Uint8Array(await readFile(new URL(`../${targetPath}`, import.meta.url)));
  } catch {
    return null;
  }
};

const plan = await buildAssetPromotionPlan(fileExistsAndBytes, entries);
console.log(formatAssetPromotionPlan(plan));

if (strict && (plan.malformed.length > 0 || plan.missingApproved.length > 0)) {
  process.exit(1);
}

if (write) {
  if (!plan.candidates.length) {
    console.error('No valid pending assets are ready to promote.');
    process.exit(1);
  }
  if (!purposeBuilt) {
    console.error('Refusing to promote without --purpose-built. Production assets must come from a Sword Guys-specific image-generation pass.');
    process.exit(1);
  }

  const productionEvidenceByAssetId = new Map();
  for (const candidate of plan.candidates) {
    const receiptPath = receiptPathForAsset(candidate.entry);
    let receiptSource = '';
    try {
      receiptSource = await readFile(new URL(`../${receiptPath}`, import.meta.url), 'utf8');
    } catch {
      console.error(`Missing production receipt for ${candidate.entry.id}: ${receiptPath}`);
      process.exit(1);
    }
    const receipt = parseAssetProductionReceipt(receiptSource);
    const receiptErrors = validateAssetProductionReceipt(candidate.entry, receipt);
    if (receiptErrors.length || !receipt) {
      console.error(`Invalid production receipt for ${candidate.entry.id}: ${receiptPath}`);
      for (const error of receiptErrors) console.error(`- ${error}`);
      process.exit(1);
    }
    productionEvidenceByAssetId.set(candidate.entry.id, productionEvidenceFromReceipt(receipt));
  }

  const manifestUrl = new URL('../src/game/assets/manifest.ts', import.meta.url);
  const manifestSource = await readFile(manifestUrl, 'utf8');
  const result = applyAssetPromotionStatuses(manifestSource, plan.candidates, (candidate) => productionEvidenceByAssetId.get(candidate.entry.id)!);

  if (result.errors.length) {
    for (const error of result.errors) console.error(error);
    process.exit(1);
  }

  await writeFile(manifestUrl, result.source, 'utf8');
  console.log('');
  console.log(`Updated src/game/assets/manifest.ts for ${result.edits.length} promoted asset(s).`);
}
