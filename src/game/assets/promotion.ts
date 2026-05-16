import { ASSET_GENERATION_BATCHES, AssetGenerationBatchId } from './pipeline';
import { AssetProductionEvidence, AssetStatus, IMAGE_GEN_ASSETS, ImageGenAssetEntry } from './manifest';
import { buildAssetTargetCheckReport, AssetTargetCheckRow } from './targetCheck';

export interface AssetPromotionCandidate {
  entry: ImageGenAssetEntry;
  batchId: AssetGenerationBatchId | null;
  fromStatus: Exclude<AssetStatus, 'approved'>;
  toStatus: 'approved';
  pngSummary: string;
  manifestEdit: string;
  verificationCommands: string[];
}

export interface AssetPromotionPlan {
  candidates: AssetPromotionCandidate[];
  malformed: AssetTargetCheckRow[];
  missingApproved: AssetTargetCheckRow[];
  absentPending: AssetTargetCheckRow[];
}

export interface ManifestPromotionEdit {
  assetId: string;
  fromStatus: AssetStatus;
  toStatus: 'approved';
  targetPath: string;
}

export interface ManifestPromotionResult {
  source: string;
  edits: ManifestPromotionEdit[];
  errors: string[];
}

export type AssetProductionEvidenceProvider =
  | AssetProductionEvidence
  | ((candidate: AssetPromotionCandidate) => AssetProductionEvidence);

const quoteForManifest = (value: string) => value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

const formatProductionEvidenceForManifest = (evidence: AssetProductionEvidence) =>
  `production: { source: '${evidence.source}', generatedFor: '${evidence.generatedFor}', reviewNote: '${quoteForManifest(evidence.reviewNote)}' }`;

const withProductionEvidence = (block: string, evidence: AssetProductionEvidence) => {
  const withoutClose = block.slice(0, -1).trimEnd();
  const separator = withoutClose.endsWith(',') ? '' : ',';
  return `${withoutClose}${separator}\n    ${formatProductionEvidenceForManifest(evidence)}\n  }`;
};

const batchIdByAssetId = new Map<string, AssetGenerationBatchId>(
  ASSET_GENERATION_BATCHES.flatMap((batch) => batch.assetIds.map((assetId) => [assetId, batch.id] as const))
);

const pngSummaryForRow = (row: AssetTargetCheckRow) => {
  const png = row.verification?.png;
  if (!png) return 'unknown PNG shape';
  return `${png.width}x${png.height}${png.hasAlpha ? ' alpha' : ''}`;
};

const candidateForRow = (row: AssetTargetCheckRow): AssetPromotionCandidate => ({
  entry: row.entry,
  batchId: batchIdByAssetId.get(row.entry.id) ?? null,
  fromStatus: row.entry.status as Exclude<AssetStatus, 'approved'>,
  toStatus: 'approved',
  pngSummary: pngSummaryForRow(row),
  manifestEdit: `Set ${row.entry.id} status from '${row.entry.status}' to 'approved' in src/game/assets/manifest.ts.`,
  verificationCommands: [
    'npm run assets:check -- --strict',
    'npm run assets:verify',
    'npm run assets:readiness',
    'npm test'
  ]
});

export const buildAssetPromotionPlan = async (
  loadBytes: (targetPath: string) => Promise<Uint8Array | null>,
  entries: ImageGenAssetEntry[] = IMAGE_GEN_ASSETS
): Promise<AssetPromotionPlan> => {
  const report = await buildAssetTargetCheckReport(loadBytes, entries);
  return {
    candidates: report.readyToReview.map(candidateForRow),
    malformed: report.malformed,
    missingApproved: report.missingApproved,
    absentPending: report.absentPending
  };
};

export const formatAssetPromotionPlan = (plan: AssetPromotionPlan) => {
  const lines = [
    '# Sword Guys Asset Promotion Plan',
    '',
    `Shape-valid candidates: ${plan.candidates.length}`,
    `Malformed existing files: ${plan.malformed.length}`,
    `Missing approved files: ${plan.missingApproved.length}`,
    `Absent pending files: ${plan.absentPending.length}`,
    '',
    'Writing promotion requires --purpose-built plus a valid .receipt.json generated after in-game Sword Guys visual review.'
  ];

  if (plan.candidates.length) {
    lines.push('', '## Shape-Valid Candidates');
    for (const candidate of plan.candidates) {
      lines.push(
        `- ${candidate.entry.id} (${candidate.batchId ?? 'unbatched'}): ${candidate.fromStatus} -> ${candidate.toStatus}`,
        `  File: ${candidate.entry.targetPath}`,
        `  PNG: ${candidate.pngSummary}`,
        `  Manifest: ${candidate.manifestEdit}`,
        `  Verify: ${candidate.verificationCommands.join(' && ')}`
      );
    }
  }

  if (plan.malformed.length) {
    lines.push('', '## Blocked by Malformed Files');
    for (const row of plan.malformed) {
      lines.push(`- ${row.entry.id}: ${row.entry.targetPath}`);
      for (const error of row.verification?.errors ?? []) lines.push(`  - ${error}`);
    }
  }

  if (plan.missingApproved.length) {
    lines.push('', '## Missing Approved Files');
    for (const row of plan.missingApproved) lines.push(`- ${row.entry.id}: ${row.entry.targetPath}`);
  }

  return lines.join('\n');
};

export const applyAssetPromotionStatuses = (
  manifestSource: string,
  candidates: AssetPromotionCandidate[],
  productionEvidence: AssetProductionEvidenceProvider
): ManifestPromotionResult => {
  let source = manifestSource;
  const edits: ManifestPromotionEdit[] = [];
  const errors: string[] = [];

  for (const candidate of candidates) {
    const idNeedle = `id: '${candidate.entry.id}'`;
    const idIndex = source.indexOf(idNeedle);
    if (idIndex === -1) {
      errors.push(`Could not find manifest entry for ${candidate.entry.id}.`);
      continue;
    }

    const start = source.lastIndexOf('{', idIndex);
    const end = source.indexOf('}', idIndex);
    if (start === -1 || end === -1 || end <= start) {
      errors.push(`Could not isolate manifest entry for ${candidate.entry.id}.`);
      continue;
    }

    const block = source.slice(start, end + 1);
    if (!block.includes(`targetPath: '${candidate.entry.targetPath}'`)) {
      errors.push(`Manifest entry for ${candidate.entry.id} did not match ${candidate.entry.targetPath}.`);
      continue;
    }
    if (!block.includes(`status: '${candidate.fromStatus}'`)) {
      errors.push(`Manifest entry for ${candidate.entry.id} did not have status '${candidate.fromStatus}'.`);
      continue;
    }

    const evidence = typeof productionEvidence === 'function' ? productionEvidence(candidate) : productionEvidence;
    const statusUpdatedBlock = block.replace(`status: '${candidate.fromStatus}'`, "status: 'approved'");
    const nextBlock = statusUpdatedBlock.includes('production:')
      ? statusUpdatedBlock.replace(/production: \{[^}]+\}/, formatProductionEvidenceForManifest(evidence))
      : withProductionEvidence(statusUpdatedBlock, evidence);
    source = `${source.slice(0, start)}${nextBlock}${source.slice(end + 1)}`;
    edits.push({
      assetId: candidate.entry.id,
      fromStatus: candidate.fromStatus,
      toStatus: 'approved',
      targetPath: candidate.entry.targetPath
    });
  }

  return { source, edits, errors };
};
