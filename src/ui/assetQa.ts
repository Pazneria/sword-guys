import { ImageGenAssetEntry } from '../game/assets/manifest';
import { ASSET_GENERATION_BATCHES, AssetGenerationBatchId, getAssetBatchEntries } from '../game/assets/pipeline';
import { buildAssetReadinessReport } from '../game/assets/readiness';
import { receiptPathForAsset } from '../game/assets/receipts';

const esc = (value: string | number) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

const pathToUrl = (targetPath: string) => `/${targetPath.replace(/^public\//, '')}`;

const statusLabel = (entry: ImageGenAssetEntry) => {
  if (entry.status === 'approved') return 'approved';
  if (entry.status === 'integrated-placeholder') return 'playable placeholder';
  if (entry.status === 'planned') return 'planned';
  return 'needs generation';
};

const renderPreview = (entry: ImageGenAssetEntry) => {
  if (entry.status !== 'approved') return `<div class="asset-qa-missing">${esc(entry.kind)}</div>`;
  const shapeClass = entry.kind === 'battleBackdrop' ? 'wide' : entry.kind === 'tileset' ? 'tiles' : 'sprite';
  return `<img class="${shapeClass}" src="${esc(pathToUrl(entry.targetPath))}" alt="${esc(entry.id)}" />`;
};

const renderAssetCard = (entry: ImageGenAssetEntry) => `
  <article class="asset-qa-card ${esc(entry.status)}">
    <div class="asset-qa-preview">${renderPreview(entry)}</div>
    <div class="asset-qa-meta">
      <div class="asset-qa-id">${esc(entry.id)}</div>
      <div class="asset-qa-row"><span>${esc(entry.kind)}</span><strong>${esc(statusLabel(entry))}</strong></div>
      <div class="asset-qa-path">${esc(entry.targetPath)}</div>
      ${entry.status === 'approved' ? `<div class="asset-qa-path">${esc(entry.production?.reviewNote ?? 'Missing production evidence')}</div>` : `<div class="asset-qa-path">Receipt: ${esc(receiptPathForAsset(entry))}</div>`}
    </div>
  </article>
`;

export const renderAssetQaPanel = (batchId?: string) => {
  const readiness = buildAssetReadinessReport();
  const selectedBatch =
    ASSET_GENERATION_BATCHES.find((batch) => batch.id === batchId) ??
    ASSET_GENERATION_BATCHES.find((batch) => batch.id === readiness.nextBatchId) ??
    ASSET_GENERATION_BATCHES[0];
  const entries = getAssetBatchEntries(selectedBatch.id as AssetGenerationBatchId);

  return `
    <section class="asset-qa-panel" aria-label="Sword Guys asset QA">
      <header class="asset-qa-header">
        <div>
          <div class="asset-qa-kicker">Image Production QA</div>
          <h1>${esc(selectedBatch.title)}</h1>
          <p>${esc(selectedBatch.scope)}</p>
        </div>
        <div class="asset-qa-summary">
          <strong>${readiness.approved}/${readiness.total}</strong>
          <span>approved</span>
          <strong>${readiness.pendingProduction}</strong>
          <span>pending</span>
        </div>
      </header>
      <div class="asset-qa-batches">
        ${ASSET_GENERATION_BATCHES.map((batch) => `<a class="${batch.id === selectedBatch.id ? 'selected' : ''}" href="?qa=asset-gallery&assetBatch=${esc(batch.id)}">${esc(batch.title)}</a>`).join('')}
      </div>
      <div class="asset-qa-strip">
        <span>Next assets</span>
        <strong>${esc(readiness.nextAssetIds.join(', ') || 'none')}</strong>
      </div>
      <div class="asset-qa-grid">
        ${entries.map(renderAssetCard).join('')}
      </div>
    </section>
  `;
};

export const installAssetQaPanel = (batchId?: string) => {
  const existing = document.getElementById('asset-qa-root');
  if (existing) existing.remove();
  const root = document.createElement('div');
  root.id = 'asset-qa-root';
  root.innerHTML = renderAssetQaPanel(batchId);
  document.body.append(root);
};
