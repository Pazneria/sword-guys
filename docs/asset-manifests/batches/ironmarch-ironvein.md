# Ironmarch + Ironvein

Batch ID: ironmarch-ironvein

Scope: Ironmarch NPCs, miner road event, mine and fortress enemies, Iron Castellan, mine/fortress/keep battle art, and forge/fortress tiles.

QA Routes: event-ironmarch-miner, ironvein-branch, ironvein-boss

Acceptance: Ironmarch NPCs feel forge-worn and grounded. | Fortress enemies separate human soldiers from machine/insect threats. | Iron Castellan is visually heavier than normal fortress enemies. | Forge and fortress tiles make lava/hazards and branch paths obvious.

Assets in this bundle: 0
## Batch Review Checklist
Asset count: 0
By kind: npcSprite=0, enemySprite=0, battleBackdrop=0, tileset=0, spellEffect=0

### Acceptance
- [ ] Ironmarch NPCs feel forge-worn and grounded.
- [ ] Fortress enemies separate human soldiers from machine/insect threats.
- [ ] Iron Castellan is visually heavier than normal fortress enemies.
- [ ] Forge and fortress tiles make lava/hazards and branch paths obvious.

### Save Targets

### QA Routes
- [ ] event-ironmarch-miner
- [ ] ironvein-branch
- [ ] ironvein-boss

### Verification Commands
- [ ] npm run assets:stage -- ironmarch-ironvein --write
- [ ] npm run assets:receipt -- --asset <asset-id> --review-note "Purpose-built Sword Guys art reviewed in QA." --write
- [ ] npm run assets:promote -- --batch ironmarch-ironvein
- [ ] npm run assets:promote -- --batch ironmarch-ironvein --purpose-built --write
- [ ] npm run assets:check -- --strict
- [ ] npm run assets:verify
- [ ] npm run content:matrix -- --strict

### Approval Notes
- Keep manifest status unchanged until the PNG exists at its target path and passes the output contract.
- Do not promote prototype, recycled, cache-sourced, or other-project-looking art as production.
- Write a production receipt for each approved PNG; the receipt must preserve the manifest prompt and visual review note.
- Use --purpose-built only after every promotion candidate has a valid receipt beside its PNG.
- After approving an asset, capture the relevant QA route and add any visual notes back to the manifest entry.
