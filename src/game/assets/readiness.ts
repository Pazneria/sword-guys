import { AssetKind, AssetStatus, IMAGE_GEN_ASSETS, ImageGenAssetEntry } from './manifest';
import {
  ASSET_GENERATION_BATCHES,
  AssetGenerationBatchId,
  getAssetBatchEntries,
  generationQueueForBatch
} from './pipeline';

export interface AssetReadinessBatch {
  id: AssetGenerationBatchId;
  title: string;
  total: number;
  approved: number;
  playable: number;
  pendingProduction: number;
  byKind: Partial<Record<AssetKind, number>>;
  byStatus: Partial<Record<AssetStatus, number>>;
  nextAssetIds: string[];
  productionComplete: boolean;
}

export interface AssetReadinessReport {
  total: number;
  approved: number;
  playable: number;
  pendingProduction: number;
  productionComplete: boolean;
  byKind: Record<AssetKind, number>;
  byStatus: Record<AssetStatus, number>;
  nextBatchId: AssetGenerationBatchId | null;
  nextAssetIds: string[];
  batches: AssetReadinessBatch[];
}

const ASSET_KINDS: AssetKind[] = ['npcSprite', 'enemySprite', 'battleBackdrop', 'tileset', 'spellEffect'];
const ASSET_STATUSES: AssetStatus[] = ['approved', 'integrated-placeholder', 'planned', 'needs-generation'];
const PLAYABLE_STATUSES = new Set<AssetStatus>(['approved', 'integrated-placeholder']);

const countEntries = <T extends string>(entries: ImageGenAssetEntry[], keys: readonly T[], read: (entry: ImageGenAssetEntry) => T) =>
  Object.fromEntries(keys.map((key) => [key, entries.filter((entry) => read(entry) === key).length]));

const countByKind = (entries: ImageGenAssetEntry[]) =>
  countEntries(entries, ASSET_KINDS, (entry) => entry.kind) as Record<AssetKind, number>;

const countByStatus = (entries: ImageGenAssetEntry[]) =>
  countEntries(entries, ASSET_STATUSES, (entry) => entry.status) as Record<AssetStatus, number>;

const summarizeBatchReadiness = (batchId: AssetGenerationBatchId): AssetReadinessBatch => {
  const batch = ASSET_GENERATION_BATCHES.find((candidate) => candidate.id === batchId)!;
  const entries = getAssetBatchEntries(batchId);
  const approved = entries.filter((entry) => entry.status === 'approved').length;
  const playable = entries.filter((entry) => PLAYABLE_STATUSES.has(entry.status)).length;
  const nextAssetIds = generationQueueForBatch(batchId).map((entry) => entry.id);

  return {
    id: batch.id,
    title: batch.title,
    total: entries.length,
    approved,
    playable,
    pendingProduction: entries.length - approved,
    byKind: countByKind(entries),
    byStatus: countByStatus(entries),
    nextAssetIds,
    productionComplete: approved === entries.length
  };
};

export const buildAssetReadinessReport = (): AssetReadinessReport => {
  const batches = ASSET_GENERATION_BATCHES.map((batch) => summarizeBatchReadiness(batch.id));
  const approved = IMAGE_GEN_ASSETS.filter((entry) => entry.status === 'approved').length;
  const playable = IMAGE_GEN_ASSETS.filter((entry) => PLAYABLE_STATUSES.has(entry.status)).length;
  const nextBatch = batches.find((batch) => !batch.productionComplete) ?? null;

  return {
    total: IMAGE_GEN_ASSETS.length,
    approved,
    playable,
    pendingProduction: IMAGE_GEN_ASSETS.length - approved,
    productionComplete: approved === IMAGE_GEN_ASSETS.length,
    byKind: countByKind(IMAGE_GEN_ASSETS),
    byStatus: countByStatus(IMAGE_GEN_ASSETS),
    nextBatchId: nextBatch?.id ?? null,
    nextAssetIds: nextBatch?.nextAssetIds.slice(0, 8) ?? [],
    batches
  };
};

export const formatAssetReadinessReport = (report: AssetReadinessReport = buildAssetReadinessReport()) => {
  const lines = [
    '# Sword Guys Asset Readiness',
    '',
    `Production complete: ${report.productionComplete ? 'yes' : 'no'}`,
    `Approved production assets: ${report.approved}/${report.total}`,
    `Playable assets including placeholders: ${report.playable}/${report.total}`,
    `Pending production assets: ${report.pendingProduction}`,
    `Next batch: ${report.nextBatchId ?? 'none'}`,
    `Next assets: ${report.nextAssetIds.length ? report.nextAssetIds.join(', ') : 'none'}`,
    '',
    `By kind: ${ASSET_KINDS.map((kind) => `${kind}=${report.byKind[kind]}`).join(', ')}`,
    `By status: ${ASSET_STATUSES.map((status) => `${status}=${report.byStatus[status]}`).join(', ')}`,
    ''
  ];

  for (const batch of report.batches) {
    lines.push(`## ${batch.title}`);
    lines.push(`Batch ID: ${batch.id}`);
    lines.push(`Approved: ${batch.approved}/${batch.total}`);
    lines.push(`Playable: ${batch.playable}/${batch.total}`);
    lines.push(`Pending production: ${batch.pendingProduction}`);
    lines.push(`Next assets: ${batch.nextAssetIds.slice(0, 8).join(', ') || 'none'}`);
    lines.push(`Production complete: ${batch.productionComplete ? 'yes' : 'no'}`);
    lines.push('');
  }

  return lines.join('\n');
};
