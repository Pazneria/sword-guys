import { buildAssetCoverageReport, formatAssetCoverageReport } from '../src/game/assets/coverage';

const report = buildAssetCoverageReport();
console.log(formatAssetCoverageReport(report));

if (process.argv.includes('--strict') && !report.complete) process.exit(1);
