# Image Generation Asset Manifests

The production image-generation backlog lives in `src/game/assets/manifest.ts` so it can be validated against game content.

## Status Values

- `approved`: final or current production art exists and is integrated.
- `integrated-placeholder`: generated in code or otherwise playable, but still needs a production image pass.
- `planned`: scoped for a later art pass, not expected to exist on disk yet.
- `needs-generation`: the next image-generation pass should produce this asset.

Every manifest entry must use a concrete `public/assets/...` `targetPath`, even when the current runtime still uses an integrated placeholder. Virtual runtime keys such as generated Phaser textures belong in notes, not in the production output path.

Approved production entries must also include `production` evidence showing the asset was purpose-built for Sword Guys. Prototype, cache-sourced, recycled, or other-project-looking art can live outside production targets for review, but it must stay out of `approved` status until a Sword Guys-specific image-generation pass is reviewed in context.

## Required Coverage

The manifest must cover:

- Every NPC currently present in `MAPS`.
- Every enemy currently present in `ENEMIES`.
- Every battle backdrop used by maps or encounters.
- Every spell currently present in `SPELLS`.
- Tileset groups for the five villages, current shared interiors, overworld, and each dungeon identity.

## Asset Workflow

1. Pick a region batch from `ASSET_GENERATION_BATCHES` in `src/game/assets/pipeline.ts`.
2. Run `npm run assets:export -- <batch-id>` to write the markdown batch packet, prompt bundle, output contracts, and review checklist.
3. Run `npm run assets:stage -- <batch-id> --write` to create per-asset prompt files and receipt templates under `docs/asset-manifests/staging/<batch-id>/`.
4. Save outputs to the `targetPath` listed in the manifest, using a versioned sibling if replacing art is not intended.
5. For animated sprites or spell strips, normalize frames before integration.
6. Run `npm run assets:check` to validate generated files before changing manifest status.
7. Run `npm run assets:receipt -- --asset <asset-id> --review-note "..." --write` for each approved PNG after checking it in-game. This writes `<targetPath>.receipt.json` beside the generated PNG.
8. Run `npm run assets:promote -- --batch <batch-id>` to review validated pending files, then add `--purpose-built --write` only after every candidate has a valid receipt.
9. Capture a playtest screenshot and add it to the manifest entry notes or a follow-up checklist.
10. Run `npm run assets:verify` to validate approved public PNGs.
11. Keep status `approved` only after the asset is integrated and verified in-game.

Spell strips use the `frameWidth`, `frameHeight`, `frameCount`, and `frameDurationMs` metadata in `manifest.ts`. Once a spell effect is marked `approved` and saved at its `targetPath`, BattleScene loads `spell:<id>` and plays that strip before falling back to its procedural placeholder.

## Dev Console Hooks

In dev builds, `window.__SWORD_GUYS__.assets` exposes the production queue:

- `summary()` returns manifest totals, status counts, batch progress, and missing/duplicate assignment checks.
- `promptBundle(batchId)` returns a markdown bundle for the next image-generation pass in that batch.
- `readiness()` returns production-art readiness, including approved assets versus playable placeholders.
- `readinessReport()` returns a readable markdown report for deciding the next image-generation batch.
- `verifyApproved()` fetches approved public PNGs and checks them against the output contract shape, transparency, and frame/grid expectations.
- `batches` lists the supported batch ids, QA routes, scope, and acceptance notes.

Prompt bundles include an output contract for every asset. The contract states the expected shape, transparency requirement, runtime key/use, and verification checks before an output should be marked `approved`.

## CLI Hooks

- `npm run assets:readiness` prints the full production-art readiness report.
- `npm run assets:coverage -- --strict` verifies manifest coverage for current NPCs, enemies, battle backdrops, spell animations, and required tilesets.
- `npm run assets:check` validates any manifest target files already present on disk, including pending files awaiting approval.
- `npm run assets:check -- --strict` fails when approved files are missing or any present PNG violates its output contract.
- `npm run assets:receipt -- --asset <asset-id> --review-note "..." --write` creates the purpose-built production receipt required before promotion.
- `npm run assets:promote -- --batch <batch-id>` prints shape-valid pending files and reminds you that production promotion still requires purpose-built Sword Guys review evidence.
- `npm run assets:promote -- --batch <batch-id> --purpose-built --write` validates each candidate receipt, updates `src/game/assets/manifest.ts` from pending status to `approved`, and records purpose-built production evidence.
- `npm run assets:stage -- <batch-id> --write` creates per-asset prompt files and receipt templates for a purpose-built generation pass.
- `npm run assets:staging-check` fails if the staged prompt files or receipt templates for the next production batch are missing or stale.
- `npm run assets:export -- <batch-id>` writes `docs/asset-manifests/batches/<batch-id>.md` with prompts, target paths, acceptance checks, QA routes, and verification commands.
- `npm run assets:export-all` writes packet markdown for every generation batch.
- `npm run assets:packets-check` fails if exported packet markdown is missing or stale.
- `npm run assets:prompt -- <batch-id>` prints the next prompt bundle for a generation batch.
- `npm run assets:prompt -- <batch-id> --include-approved` includes already approved assets for style-reference refreshes.
- `npm run assets:prompt -- list` lists known batch ids.
- `npm run assets:verify` checks all approved public PNGs against their output contracts and fails if approved manifest entries lack Sword Guys production evidence.

Current batch ids:

- `foundation-greenhollow-mossvale`
- `waymeet-dustbridge`
- `lumaire-flooded-shrine`
- `ironmarch-ironvein`
- `sunspire-eclipse`
- `spell-effects`

## Quality Gates

- Transparent sprite assets must have clean alpha and stable scale.
- NPCs must read at overworld scale.
- Enemies must read at battle scale and not blend into their backdrop.
- Backdrops must leave quiet lower space for battle UI.
- Tilesets must preserve collision readability.
- Spell effects must be short, clear, and visually distinct from each other.
- Production approval must reject prototype, recycled, cache-sourced, or other-project-looking art unless it is regenerated specifically for Sword Guys.
