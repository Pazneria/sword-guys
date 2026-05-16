# Controls

- Move: `WASD` or arrow keys
- Interact / confirm: `E`, `Enter`, or `Space`
- Cancel / back: `Escape` or `Backspace`
- Menu: `M` or `Tab`
- Debug overlays: `F3`

The player supports eight-direction facing and movement. From idle, holding a new direction turns first, then movement starts after a short pause.

## Dev QA

- Route warp: `window.__SWORD_GUYS__.qa.go('route-start')`
- Shop visual QA: `window.__SWORD_GUYS__.qa.go('lumaire-shop')`, then interact with the counter
- Forced battle: `window.__SWORD_GUYS__.qa.battle('greenhollow-fields')`
- URL forced battle: `/?qaBattle=greenhollow-fields`
