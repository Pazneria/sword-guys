import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { IMAGE_GEN_ASSETS } from '../src/game/assets/manifest';
import {
  AssetReceiptCreatedWith,
  buildAssetProductionReceipt,
  parseAssetProductionReceipt,
  receiptPathForAsset,
  validateAssetProductionReceipt
} from '../src/game/assets/receipts';

const args = process.argv.slice(2);
const write = args.includes('--write');

const valuesAfter = (flag: string) =>
  args.flatMap((arg, index) => {
    if (arg === flag) return args[index + 1] && !args[index + 1].startsWith('--') ? [args[index + 1]] : [];
    if (arg.startsWith(`${flag}=`)) return [arg.slice(flag.length + 1)];
    return [];
  });

const assetId = valuesAfter('--asset')[0];
const createdWith = (valuesAfter('--created-with')[0] ?? 'built-in-image-gen') as AssetReceiptCreatedWith;
const reviewNote = valuesAfter('--review-note')[0];
const finalPrompt = valuesAfter('--final-prompt')[0];
const finalPromptFile = valuesAfter('--final-prompt-file')[0];

if (!assetId) {
  console.error('Usage: npm run assets:receipt -- --asset <asset-id> --review-note "..." [--write]');
  process.exit(1);
}

const entry = IMAGE_GEN_ASSETS.find((candidate) => candidate.id === assetId);
if (!entry) {
  console.error(`Unknown asset id: ${assetId}`);
  process.exit(1);
}

if (!reviewNote) {
  console.error('Missing --review-note "...".');
  process.exit(1);
}

const promptFromFile = finalPromptFile ? await readFile(finalPromptFile, 'utf8') : null;
const receiptText = buildAssetProductionReceipt(entry, {
  createdWith,
  finalPrompt: promptFromFile?.trim() || finalPrompt,
  reviewNote
});
const receipt = parseAssetProductionReceipt(receiptText);
const errors = validateAssetProductionReceipt(entry, receipt);

if (errors.length) {
  for (const error of errors) console.error(error);
  process.exit(1);
}

const receiptPath = receiptPathForAsset(entry);

if (!write) {
  console.log(receiptText);
  console.log('');
  console.log(`Receipt target: ${receiptPath}`);
  process.exit(0);
}

const targetUrl = new URL(`../${entry.targetPath}`, import.meta.url);
try {
  await access(targetUrl);
} catch {
  console.error(`Refusing to write receipt before the generated PNG exists: ${entry.targetPath}`);
  process.exit(1);
}

const receiptUrl = new URL(`../${receiptPath}`, import.meta.url);
await mkdir(dirname(fileURLToPath(receiptUrl)), { recursive: true });
await writeFile(receiptUrl, `${receiptText}\n`, 'utf8');
console.log(`Wrote ${receiptPath}`);
