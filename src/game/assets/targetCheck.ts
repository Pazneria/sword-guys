import { IMAGE_GEN_ASSETS, ImageGenAssetEntry } from './manifest';
import { AssetVerificationResult, verifyAssetPngBytes } from './verification';

export interface AssetTargetCheckRow {
  entry: ImageGenAssetEntry;
  exists: boolean;
  verification: AssetVerificationResult | null;
}

export interface AssetTargetCheckReport {
  rows: AssetTargetCheckRow[];
  approved: AssetTargetCheckRow[];
  existingPending: AssetTargetCheckRow[];
  missingApproved: AssetTargetCheckRow[];
  malformed: AssetTargetCheckRow[];
  readyToReview: AssetTargetCheckRow[];
  absentPending: AssetTargetCheckRow[];
}

export const buildAssetTargetCheckReport = async (
  loadBytes: (targetPath: string) => Promise<Uint8Array | null>,
  entries: ImageGenAssetEntry[] = IMAGE_GEN_ASSETS
): Promise<AssetTargetCheckReport> => {
  const rows: AssetTargetCheckRow[] = [];

  for (const entry of entries) {
    const bytes = entry.targetPath.startsWith('public/') ? await loadBytes(entry.targetPath) : null;
    const verification = bytes ? verifyAssetPngBytes(entry, bytes) : null;
    rows.push({ entry, exists: Boolean(bytes), verification });
  }

  const approved = rows.filter((row) => row.entry.status === 'approved');
  const existingPending = rows.filter((row) => row.entry.status !== 'approved' && row.exists);
  const missingApproved = approved.filter((row) => !row.exists);
  const malformed = rows.filter((row) => row.verification && !row.verification.ok);
  const readyToReview = existingPending.filter((row) => row.verification?.ok);
  const absentPending = rows.filter((row) => row.entry.status !== 'approved' && !row.exists);

  return {
    rows,
    approved,
    existingPending,
    missingApproved,
    malformed,
    readyToReview,
    absentPending
  };
};

export const formatAssetTargetCheckReport = (report: AssetTargetCheckReport) => {
  const lines = [
    '# Sword Guys Asset Target Check',
    '',
    `Manifest entries: ${report.rows.length}`,
    `Approved files present: ${report.approved.length - report.missingApproved.length}/${report.approved.length}`,
    `Pending generated files present: ${report.existingPending.length}`,
    `Shape-valid pending files: ${report.readyToReview.length}`,
    `Absent pending files: ${report.absentPending.length}`,
    `Malformed existing files: ${report.malformed.length}`,
    '',
    'Production promotion still requires purpose-built Sword Guys art evidence; PNG shape alone is not approval.'
  ];

  if (report.readyToReview.length) {
    lines.push('', '## Shape-Valid Pending Files');
    for (const row of report.readyToReview) {
      lines.push(`- ${row.entry.id}: ${row.entry.status} -> approved (${row.entry.targetPath})`);
    }
  }

  if (report.missingApproved.length) {
    lines.push('', '## Missing Approved Files');
    for (const row of report.missingApproved) lines.push(`- ${row.entry.id}: ${row.entry.targetPath}`);
  }

  if (report.malformed.length) {
    lines.push('', '## Malformed Existing Files');
    for (const row of report.malformed) {
      lines.push(`- ${row.entry.id}: ${row.entry.targetPath}`);
      for (const error of row.verification?.errors ?? []) lines.push(`  - ${error}`);
    }
  }

  return lines.join('\n');
};
