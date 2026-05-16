import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { getApprovedRuntimeAssetLoads } from '../src/game/assets/runtime';
import { QA_BATTLE_SCENE_IDS, QA_BATTLE_SCENES } from '../src/game/qa/battles';

const baseUrl = process.env.SWORD_GUYS_QA_BASE_URL ?? 'http://localhost:5179';
const outputDir = fileURLToPath(new URL('../playtest-shots/battle-backdrops/', import.meta.url));
const backdropAssets = new Map(getApprovedRuntimeAssetLoads(['battleBackdrop']).map((asset) => [asset.id, asset]));

interface BattleBackdropQaResult {
  id: string;
  label: string;
  expectedBackdrop: string;
  expectedUrl: string;
  battleBackdrop: string | null;
  textureKey: string | null;
  textureSource: string | null;
  assetLoaded: boolean;
  textureWidth: number;
  textureHeight: number;
  screenshotPath: string;
  ok: boolean;
}

const screenshotPathForId = (id: string) => `${outputDir}${id}.png`;

await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 960 }, deviceScaleFactor: 1 });
const results: BattleBackdropQaResult[] = [];

for (const id of QA_BATTLE_SCENE_IDS) {
  const scene = QA_BATTLE_SCENES[id];
  const expectedAsset = backdropAssets.get(scene.expectedBackdrop);
  const expectedUrl = expectedAsset?.url ?? '';
  const url = `${baseUrl}/?qaBattle=${encodeURIComponent(id)}`;
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.battle-panel', { state: 'visible', timeout: 10000 });
  await page.waitForFunction(() => Boolean((window as any).__SWORD_GUYS__?.getGameEngine().currentBattle), undefined, {
    timeout: 10000
  });

  const state = await page.evaluate(({ expectedBackdrop, expectedUrl }) => {
    const app = (window as any).__SWORD_GUYS__;
    const battle = app?.getGameEngine?.().currentBattle;
    const battleScene = app?.game?.scene?.getScene?.('BattleScene');
    const expectedKey = `backdrop:${expectedBackdrop}`;
    const backdrop = battleScene?.children?.list?.find((child: any) => child?.texture?.key === expectedKey);
    const texture = battleScene?.textures?.get?.(expectedKey);
    const image = texture?.getSourceImage?.() as HTMLImageElement | HTMLCanvasElement | undefined;
    const source =
      image && 'currentSrc' in image
        ? image.currentSrc || (image as HTMLImageElement).src || null
        : image && 'src' in image
          ? String((image as HTMLImageElement).src)
          : null;

    return {
      battleBackdrop: battle?.backdrop ?? null,
      textureKey: backdrop?.texture?.key ?? null,
      textureSource: source,
      assetLoaded: performance.getEntriesByType('resource').some((entry) => entry.name.includes(expectedUrl)),
      textureWidth: Number(image?.width ?? 0),
      textureHeight: Number(image?.height ?? 0)
    };
  }, { expectedBackdrop: scene.expectedBackdrop, expectedUrl });

  const screenshotPath = screenshotPathForId(id);
  await page.screenshot({ path: screenshotPath, fullPage: false });

  const ok =
    state.battleBackdrop === scene.expectedBackdrop &&
    state.textureKey === `backdrop:${scene.expectedBackdrop}` &&
    state.textureWidth > 0 &&
    state.textureHeight > 0 &&
    Boolean(expectedUrl && state.assetLoaded);

  results.push({
    id,
    label: scene.label,
    expectedBackdrop: scene.expectedBackdrop,
    expectedUrl,
    battleBackdrop: state.battleBackdrop,
    textureKey: state.textureKey,
    textureSource: state.textureSource,
    assetLoaded: state.assetLoaded,
    textureWidth: state.textureWidth,
    textureHeight: state.textureHeight,
    screenshotPath,
    ok
  });
}

await browser.close();

for (const result of results) {
  const status = result.ok ? 'pass' : 'FAIL';
  console.log(
    `${status} ${result.id}: expected ${result.expectedBackdrop} (${result.expectedUrl}), got battle=${result.battleBackdrop}, texture=${result.textureKey}, loaded=${result.assetLoaded}, source=${result.textureSource}, ${result.textureWidth}x${result.textureHeight}`
  );
}

const failures = results.filter((result) => !result.ok);
console.log(`Battle backdrop QA: ${results.length - failures.length}/${results.length} passed.`);
if (failures.length) process.exitCode = 1;
