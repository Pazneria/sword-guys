# Sunspire + Eclipse Tower

Batch ID: sunspire-eclipse

Scope: Sunspire NPCs, late-route events, capital and eclipse enemies, Hollow Regent, capital/eclipsed tower battle art, and final-region tiles.

QA Routes: event-sunspire-bellrunner, event-eclipse-page, eclipse-branch, eclipse-boss

Acceptance: Sunspire art reads as late-game capital polish. | Eclipse enemies stay readable against dark violet tower backdrops. | The Hollow Regent has final-boss presence without obscuring UI. | Final-region tiles preserve pathing through dark rooms.

Assets in this bundle: 0
## Batch Review Checklist
Asset count: 0
By kind: npcSprite=0, enemySprite=0, battleBackdrop=0, tileset=0, spellEffect=0

### Acceptance
- [ ] Sunspire art reads as late-game capital polish.
- [ ] Eclipse enemies stay readable against dark violet tower backdrops.
- [ ] The Hollow Regent has final-boss presence without obscuring UI.
- [ ] Final-region tiles preserve pathing through dark rooms.

### Save Targets

### QA Routes
- [ ] event-sunspire-bellrunner
- [ ] event-eclipse-page
- [ ] eclipse-branch
- [ ] eclipse-boss

### Verification Commands
- [ ] npm run assets:stage -- sunspire-eclipse --write
- [ ] npm run assets:receipt -- --asset <asset-id> --review-note "Purpose-built Sword Guys art reviewed in QA." --write
- [ ] npm run assets:promote -- --batch sunspire-eclipse
- [ ] npm run assets:promote -- --batch sunspire-eclipse --purpose-built --write
- [ ] npm run assets:check -- --strict
- [ ] npm run assets:verify
- [ ] npm run content:matrix -- --strict

### Approval Notes
- Keep manifest status unchanged until the PNG exists at its target path and passes the output contract.
- Do not promote prototype, recycled, cache-sourced, or other-project-looking art as production.
- Write a production receipt for each approved PNG; the receipt must preserve the manifest prompt and visual review note.
- Use --purpose-built only after every promotion candidate has a valid receipt beside its PNG.
- After approving an asset, capture the relevant QA route and add any visual notes back to the manifest entry.
