import { mkdir, writeFile } from 'node:fs/promises';
import { buildGoalAuditReport, formatGoalAuditReport } from '../src/game/progression/goalAudit';

const report = buildGoalAuditReport();
const formatted = formatGoalAuditReport(report);

if (process.argv.includes('--write')) {
  const outDir = new URL('../docs/', import.meta.url);
  const outFile = new URL('GOAL_AUDIT.md', outDir);
  await mkdir(outDir, { recursive: true });
  await writeFile(outFile, `${formatted}\n`, 'utf8');
  console.log('Wrote docs/GOAL_AUDIT.md');
} else {
  console.log(formatted);
}

if (process.argv.includes('--strict') && !report.complete) process.exit(1);
