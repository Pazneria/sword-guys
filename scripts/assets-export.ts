import { mkdir, readFile, writeFile } from 'node:fs/promises';
import {
  ASSET_GENERATION_BATCHES,
  AssetGenerationBatchId,
  buildImageGenerationBatchPacket,
  getAssetGenerationBatch
} from '../src/game/assets/pipeline';

const args = process.argv.slice(2);
const includeApproved = args.includes('--include-approved');
const checkOnly = args.includes('--check');
const batchId = args.find((arg) => !arg.startsWith('--')) as AssetGenerationBatchId | undefined;
const normalizeLineEndings = (value: string) => value.replace(/\r\n/g, '\n');

if (!batchId || batchId === 'list') {
  console.log('Available asset batches:');
  for (const batch of ASSET_GENERATION_BATCHES) console.log(`- ${batch.id}: ${batch.title}`);
  process.exit(batchId ? 0 : 1);
}

try {
  const outDir = new URL('../docs/asset-manifests/batches/', import.meta.url);
  await mkdir(outDir, { recursive: true });
  const batchIds =
    batchId === ('all' as AssetGenerationBatchId)
      ? ASSET_GENERATION_BATCHES.map((batch) => batch.id)
      : [getAssetGenerationBatch(batchId).id];

  for (const id of batchIds) {
    const outFile = new URL(`${id}.md`, outDir);
    const expected = `${buildImageGenerationBatchPacket(id, { includeApproved })}\n`;
    if (checkOnly) {
      let current = '';
      try {
        current = await readFile(outFile, 'utf8');
      } catch {
        console.error(`Missing docs/asset-manifests/batches/${id}.md`);
        process.exitCode = 1;
        continue;
      }
      if (normalizeLineEndings(current) !== expected) {
        console.error(`Stale docs/asset-manifests/batches/${id}.md`);
        process.exitCode = 1;
      } else {
        console.log(`Fresh docs/asset-manifests/batches/${id}.md`);
      }
      continue;
    }
    await writeFile(outFile, expected, 'utf8');
    console.log(`Wrote docs/asset-manifests/batches/${id}.md`);
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  console.error(`Known batches: ${ASSET_GENERATION_BATCHES.map((batch) => batch.id).join(', ')}, all`);
  process.exit(1);
}
