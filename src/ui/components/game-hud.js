/**
 * Game HUD - Shows player stats, gold, etc. during gameplay
 */

export class GameHUD {
  #container;
  #gameState;

  constructor(gameState) {
    this.#gameState = gameState;
    this.#container = null;
  }

  mount(parentElement) {
    this.#container = document.createElement('div');
    this.#container.className = 'game-hud';
    this.#container.innerHTML = `
      <div class="hud-stats">
        <div class="hud-hp">
          <span class="hud-label">HP</span>
          <span class="hud-value" id="hud-hp">100/100</span>
        </div>
        <div class="hud-mp">
          <span class="hud-label">MP</span>
          <span class="hud-value" id="hud-mp">50/50</span>
        </div>
        <div class="hud-gold">
          <span class="hud-label">Gold</span>
          <span class="hud-value" id="hud-gold">100</span>
        </div>
        <div class="hud-level">
          <span class="hud-label">Lv</span>
          <span class="hud-value" id="hud-level">1</span>
        </div>
      </div>
    `;

    parentElement.appendChild(this.#container);

    // Subscribe to game state changes
    this.#gameState.playerState.subscribe('stats', () => this.update());
    this.update();
  }

  update() {
    const stats = this.#gameState.getPlayerStats();

    const hpEl = this.#container.querySelector('#hud-hp');
    const mpEl = this.#container.querySelector('#hud-mp');
    const goldEl = this.#container.querySelector('#hud-gold');
    const levelEl = this.#container.querySelector('#hud-level');

    if (hpEl) hpEl.textContent = `${stats.health}/${stats.maxHealth}`;
    if (mpEl) mpEl.textContent = `${stats.mana}/${stats.maxMana}`;
    if (goldEl) goldEl.textContent = `${stats.gold || 0}`;
    if (levelEl) levelEl.textContent = `${stats.level}`;
  }

  unmount() {
    if (this.#container && this.#container.parentElement) {
      this.#container.parentElement.removeChild(this.#container);
    }
    this.#container = null;
  }
}
