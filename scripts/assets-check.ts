import { readFile } from 'node:fs/promises';
import { buildAssetTargetCheckReport, formatAssetTargetCheckReport } from '../src/game/assets/targetCheck';

const fileExistsAndBytes = async (targetPath: string) => {
  try {
    return new Uint8Array(await readFile(new URL(`../${targetPath}`, import.meta.url)));
  } catch {
    return null;
  }
};

const report = await buildAssetTargetCheckReport(fileExistsAndBytes);
console.log(formatAssetTargetCheckReport(report));

if (process.argv.includes('--strict') && (report.missingApproved.length > 0 || report.malformed.length > 0)) {
  process.exit(1);
}
