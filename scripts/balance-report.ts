import { formatBalanceProjection, projectBalanceRoute } from '../src/game/balance/model';

const projection = projectBalanceRoute();
const warnings = projection.steps.flatMap((step) => step.warnings);
const unaffordable = projection.steps.flatMap((step) =>
  step.unaffordablePurchases.map((itemId) => `${step.stepId}:${itemId}`)
);

console.log(formatBalanceProjection(projection));

if (process.argv.includes('--strict') && (warnings.length > 0 || unaffordable.length > 0)) {
  if (warnings.length) console.error(`Balance warnings: ${warnings.join(' | ')}`);
  if (unaffordable.length) console.error(`Unaffordable route purchases: ${unaffordable.join(', ')}`);
  process.exit(1);
}
