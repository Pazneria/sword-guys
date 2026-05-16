# Spell Effects

Batch ID: spell-effects

Scope: All player spell strips, normalized for battle playback and readable timing.

QA Routes: route-start, event-lumaire-ferryman, eclipse-boss

Acceptance: Every strip has evenly spaced frames. | Healing, fire, ice, lightning, river, and sun effects are visually distinct. | Effects do not hide enemy HP bars or battle command feedback. | Frame timing feels snappy in battle and does not stall turns.

Assets in this bundle: 0
## Batch Review Checklist
Asset count: 0
By kind: npcSprite=0, enemySprite=0, battleBackdrop=0, tileset=0, spellEffect=0

### Acceptance
- [ ] Every strip has evenly spaced frames.
- [ ] Healing, fire, ice, lightning, river, and sun effects are visually distinct.
- [ ] Effects do not hide enemy HP bars or battle command feedback.
- [ ] Frame timing feels snappy in battle and does not stall turns.

### Save Targets

### QA Routes
- [ ] route-start
- [ ] event-lumaire-ferryman
- [ ] eclipse-boss

### Verification Commands
- [ ] npm run assets:stage -- spell-effects --write
- [ ] npm run assets:receipt -- --asset <asset-id> --review-note "Purpose-built Sword Guys art reviewed in QA." --write
- [ ] npm run assets:promote -- --batch spell-effects
- [ ] npm run assets:promote -- --batch spell-effects --purpose-built --write
- [ ] npm run assets:check -- --strict
- [ ] npm run assets:verify
- [ ] npm run content:matrix -- --strict

### Approval Notes
- Keep manifest status unchanged until the PNG exists at its target path and passes the output contract.
- Do not promote prototype, recycled, cache-sourced, or other-project-looking art as production.
- Write a production receipt for each approved PNG; the receipt must preserve the manifest prompt and visual review note.
- Use --purpose-built only after every promotion candidate has a valid receipt beside its PNG.
- After approving an asset, capture the relevant QA route and add any visual notes back to the manifest entry.
