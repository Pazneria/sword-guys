import { buildFiveRoadsContentMatrix, formatFiveRoadsContentMatrix } from '../src/game/progression/contentMatrix';

const matrix = buildFiveRoadsContentMatrix();

console.log(formatFiveRoadsContentMatrix(matrix));

if (process.argv.includes('--strict') && matrix.warnings.length > 0) {
  console.error(`Content matrix warnings: ${matrix.warnings.join(' | ')}`);
  process.exit(1);
}
