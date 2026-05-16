import Phaser from 'phaser';
import './ui/styles.css';
import {
  ASSET_GENERATION_BATCHES,
  buildImageGenerationPromptBundle,
  summarizeAssetPipeline
} from './game/assets/pipeline';
import { buildAssetReadinessReport, formatAssetReadinessReport } from './game/assets/readiness';
import { verifyApprovedAssetUrls } from './game/assets/verification';
import { formatBalanceProjection, projectBalanceRoute } from './game/balance/model';
import { buildItemEconomyReport, formatItemEconomyReport } from './game/items/economy';
import { buildItemIconCoverageReport, formatItemIconCoverageReport } from './game/items/icons';
import { buildFiveRoadsContentMatrix, formatFiveRoadsContentMatrix } from './game/progression/contentMatrix';
import { applyQaBattleScene, QA_BATTLE_SCENE_IDS, QA_BATTLE_SCENES } from './game/qa/battles';
import { applyQaRoute, QA_ROUTE_IDS } from './game/qa/routes';
import { getGameEngine } from './game/simulation/engine';
import { BattleScene } from './phaser/scenes/BattleScene';
import { WorldScene } from './phaser/scenes/WorldScene';
import { installAssetQaPanel, renderAssetQaPanel } from './ui/assetQa';

if (import.meta.env.DEV) {
  const params = new URLSearchParams(window.location.search);
  const qaRoute = params.get('qa');
  const qaBattle = params.get('qaBattle');
  if (qaBattle) applyQaBattleScene(qaBattle);
  else if (qaRoute && qaRoute !== 'asset-gallery') applyQaRoute(qaRoute);
  if (qaRoute === 'asset-gallery') installAssetQaPanel(params.get('assetBatch') ?? undefined);
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-root',
  backgroundColor: '#111820',
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: window.innerWidth,
    height: window.innerHeight
  },
  scene: [WorldScene, BattleScene]
};

const game = new Phaser.Game(config);

if (import.meta.env.DEV) {
  const restartScene = (sceneKey: 'WorldScene' | 'BattleScene') => {
    game.scene.stop('WorldScene');
    game.scene.stop('BattleScene');
    game.scene.start(sceneKey);
  };
  const goQaRoute = (id: string) => {
    const message = applyQaRoute(id);
    if (!message.startsWith('Unknown')) restartScene('WorldScene');
    return message;
  };
  const goQaBattle = (id: string) => {
    const message = applyQaBattleScene(id);
    if (!message.startsWith('Unknown')) restartScene('BattleScene');
    return message;
  };
  Object.assign(window, {
    __SWORD_GUYS__: {
      game,
      getGameEngine,
      grantPlaytestPower: (unlockRoutes = false) => getGameEngine().grantPlaytestPower({ unlockRoutes }),
      projectBalanceRoute,
      formatBalanceProjection,
      itemEconomy: {
        build: buildItemEconomyReport,
        format: formatItemEconomyReport,
        iconCoverage: buildItemIconCoverageReport,
        iconCoverageReport: formatItemIconCoverageReport
      },
      contentMatrix: {
        build: buildFiveRoadsContentMatrix,
        format: formatFiveRoadsContentMatrix
      },
      assets: {
        batches: ASSET_GENERATION_BATCHES,
        summary: summarizeAssetPipeline,
        promptBundle: buildImageGenerationPromptBundle,
        readiness: buildAssetReadinessReport,
        readinessReport: formatAssetReadinessReport,
        verifyApproved: verifyApprovedAssetUrls,
        qaPanel: renderAssetQaPanel
      },
      qa: {
        routes: QA_ROUTE_IDS,
        go: goQaRoute,
        battleScenes: QA_BATTLE_SCENE_IDS,
        battles: QA_BATTLE_SCENES,
        battle: goQaBattle
      }
    }
  });
}
