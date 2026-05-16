import { readFile } from 'node:fs/promises';
import { verifyApprovedAssetFiles } from '../src/game/assets/verification';

const readProjectFile = async (targetPath: string) => {
  try {
    return new Uint8Array(await readFile(new URL(`../${targetPath}`, import.meta.url)));
  } catch {
    return null;
  }
};

const report = await verifyApprovedAssetFiles(readProjectFile);

console.log(`Approved PNGs checked: ${report.total}`);
console.log(`Passed: ${report.passed}`);
console.log(`Failed: ${report.failed}`);

for (const failure of report.failures) {
  console.log(`\n${failure.assetId} (${failure.targetPath})`);
  for (const error of failure.errors) console.log(`- ${error}`);
}

if (report.failed > 0) process.exit(1);
