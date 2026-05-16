# Waymeet + Dustbridge

Batch ID: waymeet-dustbridge

Scope: Waymeet village NPCs, the Waymeet road event, Dustbridge enemy set, Dustbridge boss, road/ruin battle art, and Waymeet/Dustbridge tiles.

QA Routes: event-waymeet-courier, dustbridge-branch, dustbridge-boss

Acceptance: Waymeet NPC sprites feel like road-market people, not Greenhollow recolors. | Bandits and ruin enemies are visually different at battle scale. | Rusk is boss-sized and readable without moving on the map. | Dustbridge tiles support broken-route and treasure-branch rooms.

Assets in this bundle: 0
## Batch Review Checklist
Asset count: 0
By kind: npcSprite=0, enemySprite=0, battleBackdrop=0, tileset=0, spellEffect=0

### Acceptance
- [ ] Waymeet NPC sprites feel like road-market people, not Greenhollow recolors.
- [ ] Bandits and ruin enemies are visually different at battle scale.
- [ ] Rusk is boss-sized and readable without moving on the map.
- [ ] Dustbridge tiles support broken-route and treasure-branch rooms.

### Save Targets

### QA Routes
- [ ] event-waymeet-courier
- [ ] dustbridge-branch
- [ ] dustbridge-boss

### Verification Commands
- [ ] npm run assets:stage -- waymeet-dustbridge --write
- [ ] npm run assets:receipt -- --asset <asset-id> --review-note "Purpose-built Sword Guys art reviewed in QA." --write
- [ ] npm run assets:promote -- --batch waymeet-dustbridge
- [ ] npm run assets:promote -- --batch waymeet-dustbridge --purpose-built --write
- [ ] npm run assets:check -- --strict
- [ ] npm run assets:verify
- [ ] npm run content:matrix -- --strict

### Approval Notes
- Keep manifest status unchanged until the PNG exists at its target path and passes the output contract.
- Do not promote prototype, recycled, cache-sourced, or other-project-looking art as production.
- Write a production receipt for each approved PNG; the receipt must preserve the manifest prompt and visual review note.
- Use --purpose-built only after every promotion candidate has a valid receipt beside its PNG.
- After approving an asset, capture the relevant QA route and add any visual notes back to the manifest entry.
