# Sword Guys player guide

The documentation-only guide lives in `public/wiki/index.html` and `public/wiki/styles.css`. Vite copies `public/` into `dist/`, and the existing Pages workflow publishes `dist`. The guide needs no application code, build changes, dependencies, JavaScript, or browser-storage access.

- Canonical relative route: `wiki/`
- Planned published URL: `https://pazneria.github.io/sword-guys/wiki/`
- Game link: `../`, opened in a new tab
- Assets: existing `../assets/items/wooden-sword.png` and `iron-sword.png`

This branch is unpublished. Add a hub link only after deployment succeeds and the exact URL is checked. Integrate the mobile/save runtime revision with the wiki before publishing this edition. Use isolated browser profiles for testing; do not test against a player's existing saved origin.

## Reviewed basis

Reviewed 2026-09-30 against runtime commit `bc97b4f32a81edf3a694556b3e5de3bdfdf10958` (`Add mobile touch gameplay and preserve existing saves`), branch `codex/sword-guys-mobile`, on base `81bcfe25a907478c1640667295e5d4bb480e3b16`. Both the owner's `sword-guys-mobile-handoff.txt` and the final runtime source were read. The package version is `1.0.0`; the commit is the more precise content basis. Public source links pin `bc97b4f`. Later implementation work must update both the relevant guide text and the source revision note.

This docs-only branch retains the baseline runtime in its own checkout. Its guide describes the pending combined mobile/save integration, not the older standalone runtime bundle or an already-published release. Runtime files were not copied or changed in this branch.

| Guide facts | Source of truth |
| --- | --- |
| Start, inventory, gold, equipment, XP growth | `src/game/simulation/engine.ts`: `createInitialState`, `computeEffectiveStats`, `gainXp` |
| Damage, turns, targets, Run probability, Defend, status limits | `engine.ts`: `calculatePhysicalDamage`, `calculateMagicDamage`, `submitBattleCommand`, `enemyRound`, `finishBattle`; `src/ui/dom.ts`: `handleBattleActions` |
| Items, spell costs/power, prices, shops, inn costs | `src/game/content.ts`: `ITEM_LIST`, `SPELL_LIST`, `SHOPS`, map construction; `engine.ts`: `buyItem`, `sellItem`, `equip`, `useItem`, `restAtInn`; `dom.ts`: `fieldCast` |
| Keyboard and eight-direction touch controls, independent fingers, held-input reset | `src/game/input/actions.ts`: `createActionKeys`, `readActions`; `src/game/input/touch.ts`: `TouchActionSource`, `installTouchControls`; `dom.ts`: menu/shop/map/dialogue/ending handlers |
| Movement/facing, interaction, safe pauses, encounters, respawns | `engine.ts`: `movePlayer`, `findNearbyNpc`, `findNearbyObject`, `stepExploration`, `checkRandomEncounter`, `loadRuntimeEnemies` |
| Route order, road conversations, boss unlocks, endings | `engine.ts`: `currentObjective`, `handleNpc`, `resolveVictory`, `completeQuestWithRewards`, `syncProgressionRoutes`, `continueAfterEnding`, `restartGame`; `content.ts`: `ENCOUNTERS`, `QUESTS`, story dungeon and overworld maps |
| Map legend and objective marker | `dom.ts`: `questTarget`, `renderMapContent`, `renderMapSvg` |
| Save validation, startup resume/preservation, checkpoint behavior | `engine.ts`: constructor, `createCheckpoint`, `loadSavedGame`, `restoreCheckpoint`, `sleepInInnBed`; `src/game/saveValidation.ts`: `parseSavedGame`, `loadSavedGameSafely`; `src/ui/session.ts`: `resumeSavedGameOnBoot`; `src/main.ts`: startup call |
| Pause/Resume, confirmed checkpoint restart, Exit/Return | `src/ui/session.ts`: `installSessionControls`, scene pause/resume, reset and click/key handlers |
| Tappable UI, battle animation input discard | `dom.ts`: `pendingTap`, `applyTap`, `clearPendingActions`, generated choice buttons; `BattleScene.ts`: animation gate and action reset |
| Options and development-only shortcuts | `dom.ts`: `renderMenu`; `src/phaser/scenes/WorldScene.ts` and `BattleScene.ts`: `import.meta.env.DEV` guards |
| Pages architecture | `vite.config.ts` (`base: './'`), `.github/workflows/pages.yml` (builds and uploads `dist`) |

`README.md` and `CONTROLS.md` provide orientation, but input and UI source take precedence. `docs/BIG_GOAL.md` describes goals and candidates; it is not evidence that a proposed mechanic exists. `docs/GOAL_AUDIT.md` reports remaining production-art work. No invented lore, elemental advantages, party mechanics, resurrection, weighted boss behavior, crafting, or difficulty settings were added to the guide.

## Source findings requiring care

1. **Save preservation fix:** baseline `81bcfe2` overwrote the slot at startup. Runtime `bc97b4f` persists a starting checkpoint only after confirming the slot is empty, resumes valid version-one data through validation without rewriting its bytes, and retains malformed/unsupported/unreadable slots. Explicit Save/crystal/rest/sleep and the existing ending Start Over still write saves. The old current-behavior overwrite warning has been removed from this guide.
2. **Quest rewards:** middle boss victories call `completeQuestWithRewards`, grant quest gold, and unlock the next route immediately. Do not require a second NPC hand-in. Greenhollow does require returning the Cave Relic to Rowan; Aster grants the final key and route.
3. **Road objectives:** road NPC flags advance the objective/map text but do not gate the middle boss route unlocks. Skipping a road conversation can leave the objective text pointing backward.
4. **Descriptions versus behavior:** spell element labels have no weakness multiplier. Antidote has a `cureStatus` definition but no implemented cure branch; statuses are initialized empty. Revive Charm is `healHp: 80`, not resurrection. `enemyRound` uses `definition.actions[0]`, not weighted selection.
5. **Equipment:** upgrades do not replace filled slots automatically. There is no explicit unequip or accessory slot selector. Buying already learned spells still charges gold.
6. **Level-up health:** `gainXp` heals the exploration state, but `finishBattle` then copies battle HP/MP back. The guide intentionally makes no promise of a full post-battle heal on level-up.
7. **Mobile/session controls:** verified against the final runtime source and its test handoff: eight held directions, sliding direction changes, independent second-finger OK, Back, tappable menus/tabs/entries and battle commands/spells/items/targets, plus Pause/Resume and confirmed checkpoint restart. Checkpoint restart and Exit preserve the persistent slot; Exit keeps only the current in-memory session until closing/reloading. The ending Start Over is a separate slot-replacing action. Physical phones and mobile Safari/WebKit remain untested.
8. **Cave direction:** Rowan's dialogue says “west cave,” but `makeOverworld` places Mossvale at `(23, 10)` and Greenhollow at `(12, 12)`. The first-steps guide follows the actual northeast map position and calls out the dialogue mismatch.

## Lightweight validation

From the repository root:

```sh
node docs/wiki/check.mjs
npm run build
node docs/wiki/check.mjs --dist
npm run preview -- --host 127.0.0.1 --port 4185
node docs/wiki/browser-check.mjs http://127.0.0.1:4185/sword-guys/wiki/ playtest-shots/wiki
```

The browser check uses one headless Chromium instance, new contexts, and local HTTP. It checks desktop/mobile width, keyboard navigation, native route disclosure, relative assets/links, console errors, storage preservation, and a 200% text-size layout. It saves desktop/mobile PNGs and a JSON report to the supplied ignored evidence directory. Close the owned preview server afterward. It does not play a full campaign or open the game on the user's saved origin.

For a project-subpath production preview, serve `dist` as `/sword-guys/` with a local static-server mount. Vite preview commonly serves the game at `/`; if so, use `http://127.0.0.1:4185/wiki/`. Always verify the subpath deployment as well.

The sandbox's default esbuild config loader could not enumerate an ancestor directory. The production build passed with `npm run build -- --configLoader native`, including the normal TypeScript check. This is an invocation-only workaround; no package or Vite config was changed.

The initial documentation validation on 2026-09-30 passed source/built-output structure and links, production packaging, Chromium layout at 1280/760/393/320 pixels, keyboard navigation, native route disclosures, 200% text sizing, and isolated storage preservation. Its baseline simulation probe found the old startup overwrite; that finding is historical and the runtime fix supersedes it. The final mobile/save documentation update also passed structure/link/security and short wiki browser checks with the new revision basis, with no console errors, failed resources, or external requests. Updated desktop/mobile screenshots were visually reviewed, and the built guide exactly matched its source bytes. A docs-only build verifies static packaging; it does not certify a combined runtime build.

Runtime testing is attributed to the owner's handoff: 133 tests and 11 mobile smoke groups passed, plus a 320x568 production check, exact save-byte preservation after reload, desktop controls, and portrait/landscape inspections. The wiki task did not rerun or claim those gameplay tests. Physical phones, mobile Safari/WebKit, actual device cutouts/browser chrome, sustained performance, and a full story completion remain unverified. No existing player browser profile or save was used by the wiki checks.

## Narrow security review

Scope: the new wiki HTML/CSS, its documentation, and its check scripts. This is not a whole-game security audit.

- **Data:** the wiki serves public static guide text, two existing public item icons, and a reviewed source commit ID. It does not read, write, import, export, or display game saves, names, credentials, or private files.
- **Untrusted input:** URL fragments select native HTML anchors. Query parameters, names, saves/imports, and fetched content are never parsed into the wiki. No script, HTML-generation sink, inline event handler, form, iframe, `postMessage`, or `base` override exists. Text is literal HTML; authored ampersands are escaped as `&amp;`.
- **Links/resources:** relative resources stay within the game's published tree. The seven outbound source links use HTTPS on `github.com/Pazneria/sword-guys` and pin the reviewed runtime commit. The game link opens a new tab with `rel="noopener"`. There are no remote fonts, scripts, styles, analytics, or new runtime dependencies. The browser check verifies no cross-origin resource requests from the guide; it does not click through to GitHub or launch a game tab that could affect a save.
- **Checks:** the structural validator rejects scripts, inline handlers, forms/embeds, external CSS imports/resources, missing anchors/files, absolute local routes, unapproved remote source links, and new-tab links without opener isolation. Browser checks inspect link protocols, opener isolation, resource failures, layout, and an isolated synthetic storage sentinel.
- **Limits:** these checks are not a security certification, penetration test, or dependency vulnerability audit. They do not certify the gameplay runtime, browser storage trust, GitHub content, hosting headers, or physical-phone behavior. The mobile runtime handoff separately reports its save-validation and HTML-escaping checks; this wiki review does not duplicate that audit. No credentials, account settings, network permissions, or game security settings were changed.

## Integration

1. Review/cherry-pick the docs commit, or copy only the changed README, `docs/WIKI.md`, `docs/wiki/`, and `public/wiki/` files. The branch changes no `src/`, package files, Pages workflow, Vite configuration, or Arcade hub.
2. Include runtime commit `bc97b4f32a81edf3a694556b3e5de3bdfdf10958` alongside these docs. The controls and save prose already reflect it. Ensure that pinned revision is publicly reachable when publishing source links (merge the original runtime commit or push its branch). If the runtime is cherry-picked under a different published commit ID, update the guide's source links, revision note, and `reviewedRevision` in `docs/wiki/check.mjs` before deployment.
3. Run the lightweight checks above and the normal production build. Confirm `dist/wiki/index.html`, its CSS, and referenced item assets exist.
4. Publish only when explicitly authorized. After publication, verify `/sword-guys/wiki/` and its return link, then ask the hub owner to link that exact URL.

The guide is semantic HTML with a skip link, section navigation, native disclosure controls, table captions and headers, visible focus, touch-sized navigation, reduced-motion support, no external fonts, and no scripts. Its source inspection and short browser checks should not be described as a full playthrough or a full screen-reader audit.
