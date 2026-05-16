# Foundation: Greenhollow + Mossvale

Batch ID: foundation-greenhollow-mossvale

Scope: Existing Greenhollow art, first-region placeholder upgrades, Mossvale Cave art, shared town/interior sheets, and common town battle art.

QA Routes: route-start, cave-mouth, mossvale-mouth, mossvale-split, mossvale-grotto

Acceptance: Greenhollow NPCs read clearly at overworld scale. | First-region enemies have distinct silhouettes in battle. | Mossvale cave rooms preserve step-on transition readability. | Battle backdrops leave quiet space for the lower battle UI.

Assets in this bundle: 0
## Batch Review Checklist
Asset count: 0
By kind: npcSprite=0, enemySprite=0, battleBackdrop=0, tileset=0, spellEffect=0

### Acceptance
- [ ] Greenhollow NPCs read clearly at overworld scale.
- [ ] First-region enemies have distinct silhouettes in battle.
- [ ] Mossvale cave rooms preserve step-on transition readability.
- [ ] Battle backdrops leave quiet space for the lower battle UI.

### Save Targets

### QA Routes
- [ ] route-start
- [ ] cave-mouth
- [ ] mossvale-mouth
- [ ] mossvale-split
- [ ] mossvale-grotto

### Verification Commands
- [ ] npm run assets:stage -- foundation-greenhollow-mossvale --write
- [ ] npm run assets:receipt -- --asset <asset-id> --review-note "Purpose-built Sword Guys art reviewed in QA." --write
- [ ] npm run assets:promote -- --batch foundation-greenhollow-mossvale
- [ ] npm run assets:promote -- --batch foundation-greenhollow-mossvale --purpose-built --write
- [ ] npm run assets:check -- --strict
- [ ] npm run assets:verify
- [ ] npm run content:matrix -- --strict

### Approval Notes
- Keep manifest status unchanged until the PNG exists at its target path and passes the output contract.
- Do not promote prototype, recycled, cache-sourced, or other-project-looking art as production.
- Write a production receipt for each approved PNG; the receipt must preserve the manifest prompt and visual review note.
- Use --purpose-built only after every promotion candidate has a valid receipt beside its PNG.
- After approving an asset, capture the relevant QA route and add any visual notes back to the manifest entry.
