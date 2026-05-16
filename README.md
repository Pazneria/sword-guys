# Sword Guys

Fresh rebuild of **Sword Guys** as a fullscreen browser RPG foundation.

## Run

```bash
npm install
npm run dev
```

## Checks

```bash
npm run typecheck
npm run test
npm run build
```

## Route Reports

```bash
npm run goal:audit
npm run goal:audit -- --write
npm run balance:report
npm run balance:report -- --strict
npm run items:economy
npm run items:economy -- --strict
npm run content:matrix
npm run content:matrix -- --strict
```

## Asset Pipeline

```bash
npm run assets:readiness
npm run assets:coverage -- --strict
npm run assets:check
npm run assets:promote -- --batch foundation-greenhollow-mossvale
npm run assets:export -- foundation-greenhollow-mossvale
npm run assets:export-all
npm run assets:packets-check
npm run assets:prompt -- foundation-greenhollow-mossvale
npm run assets:verify
npm run items:icons
```

## Dev Hooks

In a dev build, `window.__SWORD_GUYS__` exposes:

- `qa.routes`, `qa.go(id)`, `qa.battleScenes`, and `qa.battle(id)` for route warps plus forced battle-backdrop QA.
- `projectBalanceRoute()` and `formatBalanceProjection()` for the current route economy and combat projection.
- `itemEconomy.build()`, `itemEconomy.format()`, and `itemEconomy.iconCoverageReport()` for item values, drops, shops, equipment, and icon coverage.
- `contentMatrix.build()` and `contentMatrix.format()` for Five Roads story/dungeon/QA coverage.
- `assets.summary()`, `assets.readiness()`, `assets.readinessReport()`, `assets.verifyApproved()`, and `assets.promptBundle(batchId)` for image-generation batch planning.

## Shape

The game uses Phaser for the canvas/world and DOM overlays for HUD, menus, dialogue, shops, and battle commands. Runtime rules live in `src/game`, while Phaser scenes adapt simulation state into sprites, camera, transitions, and visual feedback.
