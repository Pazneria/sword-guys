# Sword Guys player guide

The guide is published at **https://pazneria.github.io/sword-guys/wiki/**. Its canonical relative route is `wiki/`; the game link is `../` and opens a new tab. The original wiki and mobile/save update were published together in `ee21b89ac970d7c99426b206c9fca1060c468b64`.

Edit `public/wiki/index.html` and `public/wiki/styles.css`. This is one hand-authored page with nine sections, five route disclosures, and three reference tables; there is no page generator. Vite copies it into `dist/wiki/`, and the existing Pages workflow publishes `dist`. The guide uses two existing item icons and needs no JavaScript, browser storage, dependencies, or build changes.

## Source basis

Rules were rechecked on 2026-10-01 against published revision `ee21b89ac970d7c99426b206c9fca1060c468b64`. It includes the mobile/save fix `bc97b4f32a81edf3a694556b3e5de3bdfdf10958`. Source links in the guide and `reviewedRevision` in `docs/wiki/check.mjs` pin `ee21b89`. When gameplay changes, check the affected rules and update the text, source links, and revision together. The package version, `1.0.0`, is less precise than the source commit.

| Guide facts | Source of truth |
| --- | --- |
| Start, inventory, gold, equipment, XP growth | `src/game/simulation/engine.ts`: `createInitialState`, `computeEffectiveStats`, `gainXp` |
| Damage, turns, targets, Run probability, Defend, status limits | `engine.ts`: `calculatePhysicalDamage`, `calculateMagicDamage`, `submitBattleCommand`, `enemyRound`, `finishBattle`; `src/ui/dom.ts`: `handleBattleActions` |
| Items, spell costs/power, prices, shops, inn costs | `src/game/content.ts`: `ITEM_LIST`, `SPELL_LIST`, `SHOPS`, map construction; `engine.ts`: `buyItem`, `sellItem`, `equip`, `useItem`, `restAtInn`; `dom.ts`: `fieldCast` |
| Keyboard and eight-direction touch controls, independent fingers, held-input reset | `src/game/input/actions.ts`: `createActionKeys`, `readActions`; `src/game/input/touch.ts`: `TouchActionSource`, `installTouchControls`; `dom.ts`: menu/shop/map/dialogue/ending handlers |
| Movement/facing, interaction, safe pauses, encounters, respawns | `engine.ts`: `movePlayer`, `findNearbyNpc`, `findNearbyObject`, `stepExploration`, `checkRandomEncounter`, `loadRuntimeEnemies` |
| Route order, road conversations, boss unlocks, endings | `engine.ts`: `currentObjective`, `handleNpc`, `resolveVictory`, `completeQuestWithRewards`, `syncProgressionRoutes`, `continueAfterEnding`, `restartGame`; `content.ts`: `ENCOUNTERS`, `QUESTS`, story dungeon and overworld maps |
| Map legend and objective marker | `dom.ts`: `questTarget`, `renderMapContent`, `renderMapSvg` |
| Save validation, startup resume/preservation, checkpoints | `engine.ts`: constructor, `createCheckpoint`, `loadSavedGame`, `restoreCheckpoint`, `sleepInInnBed`; `src/game/saveValidation.ts`: `parseSavedGame`, `loadSavedGameSafely`; `src/ui/session.ts`: `resumeSavedGameOnBoot`; `src/main.ts`: startup call |
| Pause/Resume, confirmed checkpoint restart, Exit/Return | `src/ui/session.ts`: `installSessionControls`, scene pause/resume, reset and click/key handlers |
| Tappable UI, battle animation input discard | `dom.ts`: `pendingTap`, `applyTap`, `clearPendingActions`, choice buttons; `BattleScene.ts`: animation gate and action reset |
| Options and development-only shortcuts | `dom.ts`: `renderMenu`; `src/phaser/scenes/WorldScene.ts` and `BattleScene.ts`: `import.meta.env.DEV` guards |
| Pages architecture | `vite.config.ts` (`base: './'`), `.github/workflows/pages.yml` (builds and uploads `dist`) |

`README.md` and `CONTROLS.md` provide orientation, but the runtime source determines behavior. `docs/BIG_GOAL.md` contains design goals, not proof that a feature exists. Do not turn planned mechanics or descriptions into player instructions without checking their implementation.

## Rules that need careful wording

- **Saves:** startup resumes valid version-one data without rewriting it. A starting save is persisted only when the slot is confirmed empty. Malformed, unsupported, or unreadable data is retained. Save/crystal/rest/sleep and the ending's Start Over can replace it. The startup overwrite in `81bcfe2` is historical; it was fixed by the published mobile/save update.
- **Session controls:** Pause/Resume retains the current state. A confirmed Restart checkpoint restores the session's checkpoint and clears a battle without writing the saved slot. Exit also preserves the slot and retains the session until the page closes or reloads. Ending Start Over creates a new journey and replaces the slot.
- **Quest rewards:** Rusk, the Mire Warden, and the Iron Castellan immediately complete their quests, award quest gold, and open the next road. Rowan requires a relic hand-in; Aster grants the final key. Road conversations advance objective text but do not gate the middle-boss unlocks.
- **Combat:** elements have no weakness/resistance multiplier. Antidote's `cureStatus` definition has no implemented cure branch, and statuses are not applied. Revive Charm is `healHp: 80`. Enemies use `definition.actions[0]`. Defend scales base physical damage by 0.5 and magic by 0.65 before the random addition.
- **Equipment:** filled slots are not replaced on purchase. There is no Unequip command or accessory slot picker. Buying an already learned spell still charges gold.
- **Level-up health:** `gainXp` heals exploration stats, then `finishBattle` copies battle HP/MP back. Do not promise a full post-battle heal on level-up.
- **Cave direction:** Rowan says "west cave," but Mossvale is at `(23, 10)` and Greenhollow at `(12, 12)` in `makeOverworld`. The guide correctly directs players northeast.

## Validation

Run these from the repository root:

```sh
node docs/wiki/check.mjs
npm run build
node docs/wiki/check.mjs --dist
node docs/wiki/browser-check.mjs http://127.0.0.1:4185/sword-guys/wiki/ playtest-shots/wiki
```

Serve `dist` locally under `/sword-guys/` for the browser check. The check uses one headless Chromium instance and fresh contexts at widths 1280, 760, 393, and 320. It checks layout, images, relative links, keyboard navigation, native disclosures, 200% text sizing, console/resource errors, and preservation of an isolated storage sentinel. It saves desktop/mobile screenshots and a JSON report in the ignored evidence directory. Visually review the screenshots and close the owned server. Do not use a player's browser profile or saved game origin.

In this Windows sandbox, Vite's default esbuild config loader cannot enumerate an ancestor directory. `npm run build -- --configLoader native` runs the TypeScript check and production build without changing configuration. The existing bundle-size warning is unrelated to the wiki.

The mobile owner's earlier handoff reports 133 tests, 11 mobile smoke groups, a 320×568 production check, exact save-byte preservation, desktop controls, and portrait/landscape checks. Wiki validation does not repeat those gameplay tests or constitute a full campaign, screen-reader, physical-phone, or Safari/WebKit test.

For the 2026-10-01 editorial pass, use these reader questions to check that the page works without prior game knowledge:

1. Where do I find the first quest item, and what do I do with the reward?
2. How do I move, interact, and choose a battle target on a phone?
3. Which actions preserve progress after I close the page, and what happens on defeat or checkpoint restart?

## Security scope

The guide handles public static text, two public icons, and source links. It does not access names, game saves, imported data, credentials, or private files. URL fragments use native anchors; query parameters and fetched content are not interpreted. Authored text is literal HTML with escaped ampersands. There are no scripts, inline handlers, forms, embeds, iframes, `postMessage`, or document-base overrides.

Relative assets remain within the published tree. Outbound links use HTTPS and pin source in `github.com/Pazneria/sword-guys`; the game link uses `rel="noopener"`. There are no new dependencies, remote fonts, analytics, or external resources. The structural check rejects unsafe schemes, unapproved remote links, missing files/anchors, scripts, embeds, remote CSS resources, and new-tab links without opener isolation. Browser checks detect external resource requests and verify isolated storage preservation.

This review covers the wiki only. Functional checks are not a security certification or a dependency audit; they do not certify gameplay, hosting headers, or physical devices. No account, credential, network-permission, or game-security settings are changed.

## Publishing and coordination

The 2026-10-01 editorial pass changes only `public/wiki/index.html`, `docs/WIKI.md`, and `docs/wiki/check.mjs`. Runtime, CSS, packages, workflows, asset/planning documents, and the Arcade hub are outside its scope. Preserve concurrent production work by basing publication on the current `main` and using a fast-forward update.

After checks and an authorized deployment, verify the exact Pages workflow revision and compare the live wiki to the built file. The hub route remains `https://pazneria.github.io/sword-guys/wiki/`; no integration with the earlier mobile branch is pending.
