import { MAPS } from '../src/game/content';
import { buildTilesetUsageReport, formatTilesetUsageReport } from '../src/phaser/tileVisuals';

const report = buildTilesetUsageReport(MAPS);

console.log(formatTilesetUsageReport(report));

if (process.argv.includes('--strict') && report.unresolved.length > 0) {
  process.exitCode = 1;
}
