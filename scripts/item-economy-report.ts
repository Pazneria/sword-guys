import { readFile } from 'node:fs/promises';
import { buildItemEconomyReport, formatItemEconomyReport } from '../src/game/items/economy';
import { formatItemIconCoverageReport, verifyItemIconFiles } from '../src/game/items/icons';

const fileExistsAndBytes = async (targetPath: string) => {
  try {
    return new Uint8Array(await readFile(new URL(`../${targetPath}`, import.meta.url)));
  } catch {
    return null;
  }
};

const economy = buildItemEconomyReport();
const iconVerification = await verifyItemIconFiles(fileExistsAndBytes);

console.log(formatItemEconomyReport(economy));
console.log('');
console.log(formatItemIconCoverageReport());
console.log('');
console.log('# Sword Guys Item Icon File Check');
console.log('');
console.log(`Verified icons: ${iconVerification.passed}/${iconVerification.total}`);
console.log(`Missing or malformed icons: ${iconVerification.failed}`);
if (iconVerification.failures.length) {
  for (const failure of iconVerification.failures) {
    console.log(`- ${failure.assetId}: ${failure.errors.join(' | ')}`);
  }
}

if (process.argv.includes('--strict') && (!economy.complete || iconVerification.failed > 0)) {
  process.exit(1);
}
