# Sword Guys Big Goal

## North Star

Sword Guys should become a compact, complete, image-rich browser RPG about opening the Five Roads. The player should visit all five villages, solve a local crisis in each region, grow through readable equipment and spell upgrades, and end with a final confrontation that feels earned rather than merely reached.

The game should stay small enough to finish, but rich enough that each town, dungeon, enemy family, and battle backdrop has a distinct identity.

## Target Experience

- A 2D top-down Phaser RPG with DOM menus and battle commands.
- A complete main story across five villages: Greenhollow, Waymeet, Lumaire, Ironmarch, and Sunspire.
- A route-based adventure loop: town setup, road event, dungeon, boss or relic objective, return or unlock, next road.
- Image-generated final art for NPC sprites, enemy sprites, village tilesets, dungeon tilesets, battle scenes, spell effects, and important story moments.
- A balance model that predicts expected XP, gold, equipment access, spell access, battle difficulty, and player level at every major step.
- A QA-friendly structure with warps, deterministic balance simulations, content manifests, and visual checklists.

## Design Pillars

### 1. Every Village Matters

Each village needs:

- A clear fantasy and visual identity.
- A reason the road to it is blocked or unsafe.
- A local character who defines the crisis.
- A shop, inn, save point, and at least two flavor NPCs.
- One main story beat that changes the world state.
- One local reward that meaningfully changes combat or traversal.

### 2. The Roads Are The Plot

The core story is not just "go east because the map says so." Each road should open because Ari repairs trust, safety, or magic in the previous region.

The road unlocks should be visible:

- Guards step aside.
- A bridge is repaired.
- A ferry starts running.
- A ward or gate changes state.
- NPC dialogue updates after each crisis.
- Map markers and objective text change immediately.

### 3. Dungeons Are Small Adventures

Every dungeon should be at least three rooms, but not three identical rectangles. A good dungeon has:

- A first room that teaches the local enemy or hazard.
- A middle route with a choice, loop, dead end, or treasure branch.
- A final room with a boss, relic, seal, or major encounter.
- Optional treasure that changes the next balance step.
- A reason to explore beyond the shortest path.

### 4. Combat Is Predictable Enough To Tune

The player should be able to win through normal play, shopping, and spell use without grinding. Grinding can help, but should not be required.

Balance should be based on expected route budgets:

- Expected encounters per road segment.
- Expected dungeon encounters.
- Mandatory boss fights.
- Expected XP and gold earned.
- Expected equipment purchases before each boss.
- Expected spells unlocked before each boss.
- Expected player stats after level and gear.

### 5. Asset Quality Is Part Of The Game, Not Decoration

Every named NPC and every enemy should have a unique readable sprite. Every region should have a battle scene. Every spell should have an animation language.

Image generation should be used intentionally, with manifests and acceptance criteria, so generated assets become a stable production pipeline instead of one-off art drops.

## Story Spine

### Opening: Greenhollow

Ari wakes in Greenhollow after the Five Roads go quiet. Elder Rowan explains that the roads are not just trade routes. They are old agreements between towns, shrines, gates, and ward stones. Something has started breaking those agreements from the edges inward.

The first road problem is local: Mossvale Cave is glowing again, monsters are leaving the woodline, and Greenhollow will not open its gate until the Cave Relic is recovered.

Goal:

- Talk to Elder Rowan.
- Leave Greenhollow.
- Reach Mossvale Cave.
- Recover the Cave Relic.
- Return to Rowan.
- Unlock Waymeet.

Story event:

- After the relic returns, the Greenhollow gate guard changes dialogue and the first road marker lights up on the map.

### Village 2: Waymeet Trade Post

Waymeet is a road market built around receipts, tolls, caravans, and practical distrust. Bandit Captain Rusk has taken Dustbridge Ruins and is forging fake route seals, which makes the trade road unsafe.

The reason to go is not only "the next town exists." Greenhollow needs Waymeet to validate the relic route, and Waymeet needs someone outside its merchant politics to break Rusk's toll racket.

Goal:

- Reach Waymeet.
- Speak to Broker Sel.
- Investigate a road ambush or broken caravan.
- Clear Dustbridge Ruins.
- Defeat Rusk.
- Earn the Road Seal.
- Unlock Lumaire.

Story event:

- A caravan arrives in Waymeet after Rusk falls. Shops can add one new item tier or discount a starter item as a visible reward.

### Village 3: Lumaire

Lumaire is a river village of mages, ferries, bells, and mirror-water. The river wards are reflecting the wrong sky because the Flooded Shrine has been bent by the eclipse.

The reason to go is that the Road Seal is not enough for the eastern crossing. Lumaire controls the ferry and must restore the river ward before anyone can cross safely.

Goal:

- Reach Lumaire.
- Speak to Oracle Niva.
- Learn Ember or another region spell.
- Investigate the river mirror event.
- Clear the Flooded Shrine.
- Defeat the Mire Warden.
- Recover the Shrine Lumen.
- Unlock Ironmarch.

Story event:

- The river changes visually or the ferry marker becomes active after the shrine is cleared.

### Village 4: Ironmarch

Ironmarch is a forge and mining village. Its crisis is industrial and haunted: Ironvein Fortress has stopped sending signals, and the fortress machinery is beating like a second heart.

The reason to go is that Sunspire's capital road is sealed until Ironmarch can issue the Iron Writ. Ironmarch cannot do that while the fortress is occupied by the Iron Castellan.

Goal:

- Reach Ironmarch.
- Speak to Marshal Brinn.
- Hear rumors from miners and armorers.
- Clear Ironvein Fortress.
- Defeat the Iron Castellan.
- Earn the Iron Writ.
- Unlock Sunspire.

Story event:

- The forge relights. Ironmarch Armory gains the late-midgame equipment tier or upgrades one existing item.

### Village 5: Sunspire

Sunspire is the capital road village: bells, towers, gold stone, archives, and old promises. The city is still standing, but it is holding its breath because the Eclipse Tower has begun opening.

The reason to go is culmination. Sunspire knows the truth: the Hollow Regent is not attacking towns directly. It is breaking the agreements that let towns trust roads, commerce, ferries, fortresses, and magic.

Goal:

- Reach Sunspire.
- Speak to Keeper Aster.
- Receive the Eclipse Key.
- Prepare with final market gear and spells.
- Enter Eclipse Tower.
- Defeat the Hollow Regent.
- Complete the Five Roads.

Story event:

- The ending should mention each restored village and let the player continue exploring or start over.

## Route Events

The game needs connective events between villages so travel has story pressure.

Candidate route events:

- Greenhollow to Waymeet: a broken signpost and a wounded courier introduce Rusk before the player meets him.
- Waymeet to Lumaire: a caravan returns after Rusk falls, but the river ferry refuses to move because the river reflects stars at noon.
- Lumaire to Ironmarch: a river ward opens the mountain pass, revealing burnt metal fragments and a miner warning.
- Ironmarch to Sunspire: the forge relights, but its first clean bell tone is answered by Eclipse Tower.
- Sunspire to Eclipse Tower: the capital road is not blocked by a guard but by ceremony. Keeper Aster gives permission and the key.

Implementation shape:

- Add road event objects or NPCs to the overworld.
- Add route-stage flags separate from boss-defeated flags.
- Let events change dialogue, map markers, and blocked messages.

## Dungeon Expansion

### Mossvale Cave

Purpose: first dungeon, gentle combat, relic recovery.

Minimum rooms:

- Cave Mouth: teaches cave movement, first visible enemy, safe exit.
- Glowcap Split: two paths, one treasure dead end, one main route.
- Relic Grotto: relic chest, slightly harder enemy pack, optional save crystal or shortcut.

Treasure ideas:

- Rusty Sword or leather armor.
- Ether before the player has many MP options.
- Cave Relic key item.

### Dustbridge Ruins

Purpose: first true boss dungeon, road seal crisis.

Minimum rooms:

- Toll Yard: bandit scouts and visible barricades.
- Ledger Hall: dead-end rooms with gold, fake seals, and item pickups.
- Broken Bridge Loop: longer route to treasure, shortcut back after a switch.
- Rusk's Map Room: boss fight.

Treasure ideas:

- Iron Shield.
- Copper Ring.
- Gold cache that helps afford Waymeet gear.

### Flooded Shrine

Purpose: magic dungeon, water/mirror identity, fire spell relevance.

Minimum rooms:

- Mirror Pool: shrine mood and first water enemy.
- Reed Maze: branching route with shallow water and optional chest.
- Sluice Chapel: dead end with spell or charm reward.
- Lumen Sanctum: Mire Warden boss.

Treasure ideas:

- River Charm.
- Mage Hood or apprentice staff.
- Ether stash.

### Ironvein Fortress

Purpose: defense and gear check, physical pressure.

Minimum rooms:

- Outer Yard: patrol movement and guard fights.
- Barracks Loop: two routes, one harder but treasure-rich.
- Forge Core: environmental hazard or high encounter danger.
- Castellan Chamber: boss fight.

Treasure ideas:

- Steel Helmet or Steel Greaves.
- Ember Amulet.
- Tower Shield behind a longer route.

### Eclipse Tower

Purpose: final exam, mixed enemy families, final boss.

Minimum rooms:

- Lower Bell Hall: establishes final atmosphere.
- Starless Library: magic enemies and optional lore.
- Shadow Stair: longer route with elite fights and strong treasure.
- Observatory Gate: final preparation or save.
- Regent's Observatory: Hollow Regent boss.

Treasure ideas:

- Sunward Aegis.
- Revive Charm.
- Sunflare access if not already purchased.

## NPC Scope

Every village should have:

- 1 main objective NPC.
- 1 shopkeeper.
- 1 innkeeper.
- 1 guard or route blocker.
- 1 rumor/flavor NPC.
- Optional local specialist, such as oracle, miner, courier, ferryman, archivist, blacksmith.

Minimum named NPC set:

- Greenhollow: Elder Rowan, Gate Guard, Mara, shopkeeper, innkeeper.
- Waymeet: Broker Sel, Road Scout, caravan courier, shopkeeper, innkeeper.
- Lumaire: Oracle Niva, River Student, ferryman, shopkeeper, innkeeper.
- Ironmarch: Marshal Brinn, Tired Miner, blacksmith, shopkeeper, innkeeper.
- Sunspire: Keeper Aster, Capital Captain, archivist, shopkeeper, innkeeper.

Sprite requirement:

- Every named NPC gets a generated overworld sprite.
- Shopkeepers and innkeepers may share base silhouettes across towns only if palette, clothing, and town identity differ.
- Objective NPCs must be visually distinct.
- Important NPCs should have idle south-facing frames first, then full directional idle/walk only when needed.

## Enemy Scope

Every enemy definition should get:

- A unique battle sprite.
- A tiny overworld or dungeon roaming sprite if it appears visibly.
- A family silhouette rule so related enemies feel connected.
- A color/material palette tied to its region.

Enemy families:

- Greenhollow/Mossvale: slimes, imps, bats, grass wolves, moss goblins.
- Waymeet/Dustbridge: bandits, dust spirits, ruin sentinels.
- Lumaire/Flooded Shrine: river beasts, reeds, mirror spirits, shrine adepts.
- Ironmarch/Ironvein: mine beasts, iron insects, fortress guards, alchemists.
- Sunspire/Eclipse: capital duelists, magi, eclipse hounds, void moths, hollow knights, gargoyles, acolytes, seraphs.

Bosses:

- Bandit Captain Rusk.
- Mire Warden.
- Iron Castellan.
- Hollow Regent.

## Battle Scenes

Every location category should have a battle backdrop:

- Greenhollow fields.
- Mossvale cave.
- Waymeet road.
- Dustbridge ruins.
- Lumaire riverbank.
- Flooded Shrine.
- Ironmarch mountain pass.
- Ironvein fortress.
- Sunspire capital road.
- Eclipse Tower.

Acceptance criteria:

- Backdrops should read clearly behind battle sprites.
- No UI-important details should sit behind command panels.
- Each backdrop should support enemy placement on the right and Ari on the left.
- Backdrops should be generated as full battle compositions, not cropped concept art.

## Tilesets

Required tileset work:

- Five village identities, even if the base town layout generator is shared.
- Expanded overworld road/event tiles.
- Unique dungeon tiles for each major dungeon.
- Treasure, gates, switches, locks, doors, ferry/bridge/ward props.
- Visual state changes for route unlocks.

Suggested tileset groups:

- Greenhollow: fences, grass, cottages, save crystal.
- Waymeet: market stalls, signposts, road stones, caravan crates.
- Lumaire: water edges, bells, river glass, shrine ferry.
- Ironmarch: forge stone, mine rails, metal doors, brazier light.
- Sunspire: gold stone, banners, archives, tower gate.
- Dungeons: cave, ruin, flooded shrine, fortress, eclipse tower.

## Spell Animations

Every spell should have:

- Battle cast effect.
- Hit effect.
- Optional field/menu effect for healing spells.
- Color language and timing.

Current spell set:

- Spark: fast yellow lightning bolt.
- Mend: green/blue healing pulse.
- Ember: small orange fire projectile and burst.
- River Mend: larger water-light healing ring.
- Frost Rune: icy sigil, sharp blue-white impact.
- Sunflare: late-game golden beam or burst.

Implementation shape:

- Start with Phaser-generated effects for timing and gameplay clarity.
- Replace or augment with image-generated sprite sheets once timing feels good.
- Keep each spell animation short, readable, and reusable.

## Image Generation Pipeline

Use image generation for production-bound raster assets, but keep a manifest so the game knows what exists and what still needs work.

Recommended directories:

- `public/assets/characters/npcs/`
- `public/assets/characters/enemies/`
- `public/assets/battle/`
- `public/assets/environment/`
- `public/assets/effects/spells/`
- `docs/asset-manifests/`

For each generated asset, record:

- Asset id.
- Intended game use.
- Prompt.
- Source or reference image.
- Output file path.
- Frame size and strip layout if animated.
- Status: draft, approved, integrated, needs-rework.
- In-game verification screenshot.

Sprite workflow:

- Generate or approve one seed frame.
- Generate full animation strips from that seed frame.
- Normalize into fixed-size frames.
- Validate at game scale.
- Integrate only after preview approval.

## Balance Goal

The game should be completable without grinding if the player:

- Fights the expected encounters on the main route.
- Opens most obvious treasure chests.
- Buys a reasonable amount of gear.
- Uses potions and healing spells sometimes.
- Rests at inns between major route legs.

Grinding should reduce risk, not become required.

## Balance Model

Create a balance model that reads actual game content and simulates the main route.

Inputs:

- Player base stats and XP curve.
- Enemy stats, XP, gold, drops, and encounter groups.
- Shop inventories and prices.
- Equipment stats by slot.
- Spell costs and damage/healing.
- Expected encounter count per route segment.
- Mandatory boss fights.
- Treasure gold/items per dungeon.

Outputs:

- Expected level before each boss.
- Expected gold before each shop.
- Expected gear loadout before each boss.
- Expected player stats after gear.
- Expected damage dealt and damage received.
- Expected turns to defeat normal encounters and bosses.
- Expected potion and ether pressure.
- Failure risk flags, such as "boss kills expected player in 3 turns."

Suggested first expected route budget:

| Segment | Expected Normal Encounters | Mandatory Boss | Target Level At End | Economy Target |
| --- | ---: | --- | ---: | --- |
| Greenhollow to Cave Relic | 5-7 | none | 2-3 | Can afford 1 starter gear upgrade or supplies |
| Waymeet and Dustbridge | 7-10 | Rusk | 4-5 | Can afford iron weapon or armor before/after boss |
| Lumaire and Flooded Shrine | 8-11 | Mire Warden | 6-8 | Can afford magic gear or spell plus supplies |
| Ironmarch and Ironvein | 10-13 | Iron Castellan | 9-11 | Can afford steel defensive tier |
| Sunspire and Eclipse Tower | 12-16 | Hollow Regent | 13-15 | Can afford one final weapon/armor path plus consumables |

Combat tuning targets:

- Normal encounters should usually last 2-4 player turns.
- Elite dungeon encounters can last 4-6 player turns.
- Bosses should last 6-10 player turns.
- A boss should threaten defeat if the player never heals.
- A boss should not require perfect item use or exact equipment.
- New gear should reduce danger noticeably, but not erase it.
- New spells should feel situationally useful, not mandatory for every fight.

Economy tuning targets:

- The player should not be able to buy every new item in every town on first arrival.
- The player should usually afford one meaningful upgrade path per village.
- Treasure should create interesting choices, not replace shops entirely.
- Inn prices should matter early and become less stressful later.
- Consumables should remain useful without becoming the only correct gold sink.

Equipment assumptions per boss:

- Rusk: iron weapon or several leather/iron defense pieces.
- Mire Warden: Ember available, at least one magic or MP upgrade likely.
- Iron Castellan: steel weapon or defensive steel tier likely.
- Hollow Regent: final market access, at least one high-end weapon or armor path, several consumables.

## Implementation Milestones

### Milestone 1: Story And Route Foundation

- Expand village dialogue and route-event flags.
- Add road event objects/NPCs between villages.
- Make the objective chain explicit in code and map UI.
- Add tests for route unlock state and objective text.

Done when:

- Every village has a reason to visit.
- Every route unlock has a story event.
- The map and dialogue point the player to the next step.

### Milestone 2: Dungeon Expansion

- Convert each dungeon from one hostile room to multi-room maps.
- Add transitions, treasure branches, room-specific enemies, and boss rooms.
- Add dungeon QA warps.
- Add tests for room transitions, treasure state, and boss reachability.

Done when:

- Every dungeon has at least three rooms.
- Each dungeon has one optional treasure route.
- Boss rooms are reachable and return paths work.

### Milestone 3: Balance Model

- Add a balance simulation script or test helper.
- Define expected encounter counts per segment.
- Generate route projections for level, gold, gear, and combat risk.
- Tune XP, gold, prices, gear, and boss stats against the model.

Done when:

- The model produces readable balance reports.
- Boss targets fall within desired turns and survival windows.
- Economy supports meaningful but constrained purchases.

### Milestone 4: NPC And Enemy Art Pass

- Create an asset manifest.
- Generate unique NPC sprites.
- Generate unique enemy battle sprites.
- Integrate sprites region by region.
- Capture visual QA screenshots.

Done when:

- Every NPC and enemy has a non-placeholder sprite.
- Sprites are consistent in scale, palette, and readability.
- No battle sprite fights the UI or backdrop.

### Milestone 5: Battle Backdrops, Tilesets, And Spell Effects

- Generate battle scenes for every location category.
- Generate or refine region/dungeon tilesets.
- Implement spell animation effects.
- Replace placeholder Phaser effects with approved generated strips where useful.

Done when:

- Every battle location has a unique backdrop.
- Every major dungeon has visual identity.
- Every spell has readable cast and hit feedback.

### Milestone 6: Full Playthrough QA

- Add playtest route shortcuts and final smoke checks.
- Run full main-route playthroughs with and without extra grinding.
- Capture screenshots for towns, dungeons, battles, shops, map overlay, and ending.
- Fix pacing, balance, visual readability, and route confusion.

Done when:

- A normal player can finish the game without grinding.
- A cautious player can improve odds through exploration and shopping.
- The ending feels like the Five Roads were actually restored.

## Immediate Next Work

The best next implementation pass is one of these:

1. Build the balance model first, so dungeon/enemy/economy work has math underneath it.
2. Expand Mossvale Cave into the first real multi-room dungeon as the template.
3. Create the asset manifest and generate the first NPC/enemy batch for Greenhollow and Mossvale.

Recommendation:

Start with the balance model and Mossvale Cave together. The balance model tells us how many fights the first dungeon should carry, and Mossvale becomes the template for room transitions, treasure branches, enemy placement, and visual QA.
