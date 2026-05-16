import { buildAssetReadinessReport } from '../assets/readiness';
import { ASSET_GENERATION_BATCHES } from '../assets/pipeline';
import { buildAssetCoverageReport } from '../assets/coverage';
import { projectBalanceRoute } from '../balance/model';
import { buildItemEconomyReport } from '../items/economy';
import { buildFiveRoadsContentMatrix } from './contentMatrix';

export interface GoalAuditCriterion {
  id: string;
  requirement: string;
  evidence: string;
  ok: boolean;
}

export interface GoalAuditReport {
  complete: boolean;
  criteria: GoalAuditCriterion[];
  blockers: string[];
}

const criterion = (id: string, requirement: string, evidence: string, ok: boolean): GoalAuditCriterion => ({
  id,
  requirement,
  evidence,
  ok
});

export const buildGoalAuditReport = (): GoalAuditReport => {
  const content = buildFiveRoadsContentMatrix();
  const balance = projectBalanceRoute();
  const assets = buildAssetReadinessReport();
  const coverage = buildAssetCoverageReport();
  const itemEconomy = buildItemEconomyReport();
  const balanceWarnings = balance.steps.flatMap((step) => step.warnings);
  const unaffordable = balance.steps.flatMap((step) =>
    step.unaffordablePurchases.map((purchase) => `${step.stepId}:${purchase}`)
  );
  const criteria = [
    criterion(
      'five-villages',
      'Five Roads story visits all five villages.',
      `content matrix villages ${content.totals.villages}/5, objectives ${content.totals.objectiveComplete}/5`,
      content.totals.villages === 5 && content.totals.objectiveComplete === 5
    ),
    criterion(
      'route-events',
      'Meaningful route events exist between villages.',
      `content matrix route events ${content.totals.routeEvents}/5`,
      content.totals.routeEvents === 5
    ),
    criterion(
      'expanded-dungeons',
      'Every story dungeon has at least three rooms, branches, objectives, and random encounters.',
      `content matrix rooms ${content.totals.dungeonRooms}, three-room dungeons ${content.totals.threeRoomDungeons}/5, warnings ${content.totals.warnings}`,
      content.totals.threeRoomDungeons === 5 && content.totals.warnings === 0
    ),
    criterion(
      'balance-route',
      'Balance model projects expected encounters, XP, gold, levels, bosses, stats, equipment, and spells across the route.',
      `normal encounters ${balance.totals.expectedNormalEncounters}, bosses ${balance.totals.bosses}, warnings ${balanceWarnings.length}`,
      balance.totals.expectedNormalEncounters > 0 && balance.totals.bosses === 4 && balanceWarnings.length === 0
    ),
    criterion(
      'economy-equipment',
      'Economy and equipment pacing are affordable across the projected route.',
      `unaffordable purchases ${unaffordable.length}, projected gold income ${balance.totals.gold}`,
      unaffordable.length === 0 && balance.totals.gold > 0
    ),
    criterion(
      'items-drops-icons',
      'Item values, sell prices, shop entries, drop tables, equipment progression, and item icons pass the focused economy audit.',
      `items ${itemEconomy.itemCount}, shops ${itemEconomy.shopCount}, distinct drops ${itemEconomy.distinctDropItemIds.length}, icon coverage ${itemEconomy.iconCoverageComplete ? 'complete' : 'missing'}, issues ${itemEconomy.issues.length}`,
      itemEconomy.complete
    ),
    criterion(
      'asset-pipeline',
      'Image-generation pipeline covers NPC sprites, enemy sprites, battle backdrops, tilesets, spell animations, and item icon coverage.',
      `manifest assets ${assets.total}, batches ${ASSET_GENERATION_BATCHES.length}, by kind ${Object.entries(assets.byKind)
        .map(([kind, count]) => `${kind}=${count}`)
        .join(', ')}, missing coverage ${coverage.totalMissing}`,
      assets.total > 0 &&
        ASSET_GENERATION_BATCHES.length === 6 &&
        Object.values(assets.byKind).every((count) => count > 0) &&
        coverage.complete
    ),
    criterion(
      'production-art',
      'Production image assets are generated, approved, and ready for runtime loading.',
      `approved ${assets.approved}/${assets.total}, playable ${assets.playable}/${assets.total}, pending production ${assets.pendingProduction}`,
      assets.productionComplete
    )
  ];
  const blockers = criteria.filter((item) => !item.ok).map((item) => `${item.id}: ${item.evidence}`);

  return {
    complete: blockers.length === 0,
    criteria,
    blockers
  };
};

export const formatGoalAuditReport = (report: GoalAuditReport = buildGoalAuditReport()) => {
  const lines = [
    '# Sword Guys Goal Audit',
    '',
    `Goal complete: ${report.complete ? 'yes' : 'no'}`,
    '',
    '| Requirement | Evidence | Status |',
    '| --- | --- | --- |'
  ];

  for (const item of report.criteria) {
    lines.push(`| ${item.requirement} | ${item.evidence} | ${item.ok ? 'pass' : 'blocked'} |`);
  }

  lines.push('', '## Blockers');
  if (report.blockers.length) {
    for (const blocker of report.blockers) lines.push(`- ${blocker}`);
  } else {
    lines.push('- none');
  }

  lines.push(
    '',
    '## Verification Commands',
    '- npm run goal:audit',
    '- npm run content:matrix -- --strict',
    '- npm run balance:report -- --strict',
    '- npm run items:economy -- --strict',
    '- npm run assets:readiness',
    '- npm run assets:coverage -- --strict',
    '- npm run assets:check -- --strict',
    '- npm run assets:promote -- --strict',
    '- npm run assets:staging-check',
    '- npm run assets:packets-check',
    '- npm run assets:verify',
    '- npm test',
    '- npm run build'
  );

  return lines.join('\n');
};
