# Lumaire + Flooded Shrine

Batch ID: lumaire-flooded-shrine

Scope: Lumaire village NPCs, ferryman road event, river and shrine enemies, Mire Warden, river/shrine battle art, and water/shrine tiles.

QA Routes: event-lumaire-ferryman, flooded-shrine-branch, flooded-shrine-boss

Acceptance: Lumaire reads as blue-green river magic without becoming low-contrast. | River and shrine enemies stay distinct from watery backdrops. | Mire Warden has a strong boss silhouette. | Flooded Shrine tiles keep walkable shallows and blocking props legible.

Assets in this bundle: 0
## Batch Review Checklist
Asset count: 0
By kind: npcSprite=0, enemySprite=0, battleBackdrop=0, tileset=0, spellEffect=0

### Acceptance
- [ ] Lumaire reads as blue-green river magic without becoming low-contrast.
- [ ] River and shrine enemies stay distinct from watery backdrops.
- [ ] Mire Warden has a strong boss silhouette.
- [ ] Flooded Shrine tiles keep walkable shallows and blocking props legible.

### Save Targets

### QA Routes
- [ ] event-lumaire-ferryman
- [ ] flooded-shrine-branch
- [ ] flooded-shrine-boss

### Verification Commands
- [ ] npm run assets:stage -- lumaire-flooded-shrine --write
- [ ] npm run assets:receipt -- --asset <asset-id> --review-note "Purpose-built Sword Guys art reviewed in QA." --write
- [ ] npm run assets:promote -- --batch lumaire-flooded-shrine
- [ ] npm run assets:promote -- --batch lumaire-flooded-shrine --purpose-built --write
- [ ] npm run assets:check -- --strict
- [ ] npm run assets:verify
- [ ] npm run content:matrix -- --strict

### Approval Notes
- Keep manifest status unchanged until the PNG exists at its target path and passes the output contract.
- Do not promote prototype, recycled, cache-sourced, or other-project-looking art as production.
- Write a production receipt for each approved PNG; the receipt must preserve the manifest prompt and visual review note.
- Use --purpose-built only after every promotion candidate has a valid receipt beside its PNG.
- After approving an asset, capture the relevant QA route and add any visual notes back to the manifest entry.
