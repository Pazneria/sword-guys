/**
 * BattleScene - Turn-based combat interface
 */

import { BATTLE_STATES } from '../systems/battle-system.js';
import { getItem } from '../data/items.js';

export class BattleScene {
  #container;
  #battleSystem;
  #gameState;
  #onComplete;
  #keyHandler;
  #selectedOption;
  #currentMenu;
  #itemList;

  constructor(battleSystem, gameState, onComplete) {
    this.#battleSystem = battleSystem;
    this.#gameState = gameState;
    this.#onComplete = onComplete;
    this.#container = null;
    this.#selectedOption = 0;
    this.#currentMenu = 'main'; // main, items
    this.#itemList = [];
  }

  mount(parentElement) {
    this.#container = document.createElement('div');
    this.#container.className = 'battle-scene';
    this.#container.innerHTML = `
      <div class="battle-container">
        <div class="battle-enemy">
          <div class="enemy-info">
            <div class="enemy-name" id="enemy-name"></div>
            <div class="enemy-hp-bar">
              <div class="hp-bar-fill" id="enemy-hp-fill"></div>
            </div>
            <div class="enemy-hp-text" id="enemy-hp-text"></div>
          </div>
        </div>
        <div class="battle-log" id="battle-log">
          <!-- Battle messages -->
        </div>
        <div class="battle-player">
          <div class="player-info">
            <div class="player-hp">HP: <span id="player-hp"></span></div>
            <div class="player-mp">MP: <span id="player-mp"></span></div>
          </div>
        </div>
        <div class="battle-menu" id="battle-menu">
          <!-- Battle options -->
        </div>
      </div>
    `;

    parentElement.appendChild(this.#container);

    // Keyboard controls
    this.#keyHandler = (e) => this.#handleKey(e);
    document.addEventListener('keydown', this.#keyHandler);

    // Start the battle
    this.#battleSystem.start();
    this.#update();
  }

  #handleKey(e) {
    const state = this.#battleSystem.getState();

    if (state !== BATTLE_STATES.PLAYER_TURN) {
      // Allow space/enter to continue after victory/defeat
      if ((state === BATTLE_STATES.VICTORY || state === BATTLE_STATES.DEFEAT || state === BATTLE_STATES.FLEE) &&
          (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault();
        this.close();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        this.#selectedOption = Math.max(0, this.#selectedOption - 1);
        this.#renderMenu();
        break;
      case 'ArrowDown':
        e.preventDefault();
        const maxOption = this.#getMaxOption();
        this.#selectedOption = Math.min(maxOption, this.#selectedOption + 1);
        this.#renderMenu();
        break;
      case ' ':
      case 'Enter':
      case 'z':
        e.preventDefault();
        this.#selectOption();
        break;
      case 'Escape':
      case 'x':
        e.preventDefault();
        if (this.#currentMenu !== 'main') {
          this.#currentMenu = 'main';
          this.#selectedOption = 0;
          this.#renderMenu();
        }
        break;
    }
  }

  #getMaxOption() {
    if (this.#currentMenu === 'main') {
      return 2; // Attack, Items, Flee
    } else if (this.#currentMenu === 'items') {
      return Math.max(0, this.#itemList.length - 1);
    }
    return 0;
  }

  #selectOption() {
    if (this.#currentMenu === 'main') {
      switch (this.#selectedOption) {
        case 0: // Attack
          this.#battleSystem.playerAction({ type: 'attack' });
          this.#update();
          break;
        case 1: // Items
          this.#showItemsMenu();
          break;
        case 2: // Flee
          const result = this.#battleSystem.playerAction({ type: 'flee' });
          this.#update();
          if (result.success) {
            setTimeout(() => this.close(), 1000);
          }
          break;
      }
    } else if (this.#currentMenu === 'items') {
      const item = this.#itemList[this.#selectedOption];
      if (item) {
        this.#battleSystem.playerAction({ type: 'item', itemId: item.id });
        this.#currentMenu = 'main';
        this.#selectedOption = 0;
        this.#update();
      }
    }
  }

  #showItemsMenu() {
    // Get usable items
    this.#itemList = this.#gameState.getInventory()
      .map(invItem => getItem(invItem.id))
      .filter(item => item && item.usableInBattle);

    this.#currentMenu = 'items';
    this.#selectedOption = 0;
    this.#renderMenu();
  }

  #update() {
    this.#updateEnemyInfo();
    this.#updatePlayerInfo();
    this.#updateBattleLog();
    this.#renderMenu();
  }

  #updateEnemyInfo() {
    const enemy = this.#battleSystem.getEnemy();

    const nameEl = this.#container.querySelector('#enemy-name');
    const hpFillEl = this.#container.querySelector('#enemy-hp-fill');
    const hpTextEl = this.#container.querySelector('#enemy-hp-text');

    if (nameEl) nameEl.textContent = enemy.name;

    const hpPercent = Math.max(0, (enemy.stats.hp / enemy.stats.maxHp) * 100);
    if (hpFillEl) hpFillEl.style.width = `${hpPercent}%`;
    if (hpTextEl) hpTextEl.textContent = `${Math.max(0, enemy.stats.hp)}/${enemy.stats.maxHp}`;
  }

  #updatePlayerInfo() {
    const stats = this.#gameState.getPlayerStats();

    const hpEl = this.#container.querySelector('#player-hp');
    const mpEl = this.#container.querySelector('#player-mp');

    if (hpEl) hpEl.textContent = `${stats.health}/${stats.maxHealth}`;
    if (mpEl) mpEl.textContent = `${stats.mana}/${stats.maxMana}`;
  }

  #updateBattleLog() {
    const logEl = this.#container.querySelector('#battle-log');
    if (!logEl) return;

    const log = this.#battleSystem.getLog();
    const messages = log.slice(-5).map(entry => `<div>${entry.message}</div>`).join('');
    logEl.innerHTML = messages;
  }

  #renderMenu() {
    const menuEl = this.#container.querySelector('#battle-menu');
    if (!menuEl) return;

    const state = this.#battleSystem.getState();

    if (state === BATTLE_STATES.VICTORY) {
      const rewards = this.#battleSystem.getRewards();
      menuEl.innerHTML = `
        <div class="battle-victory">
          <div class="victory-title">Victory!</div>
          <div>Gained ${rewards.exp} EXP</div>
          <div>Received ${rewards.gold} Gold</div>
          ${rewards.items.length > 0 ? `<div>Items: ${rewards.items.join(', ')}</div>` : ''}
          <div class="menu-prompt">Press SPACE to continue</div>
        </div>
      `;
      return;
    }

    if (state === BATTLE_STATES.DEFEAT) {
      menuEl.innerHTML = `
        <div class="battle-defeat">
          <div class="defeat-title">Defeated...</div>
          <div class="menu-prompt">Press SPACE to continue</div>
        </div>
      `;
      return;
    }

    if (state === BATTLE_STATES.FLEE) {
      menuEl.innerHTML = `
        <div class="battle-flee">
          <div>Fled from battle!</div>
          <div class="menu-prompt">Press SPACE to continue</div>
        </div>
      `;
      return;
    }

    if (state !== BATTLE_STATES.PLAYER_TURN) {
      menuEl.innerHTML = '<div class="menu-waiting">...</div>';
      return;
    }

    if (this.#currentMenu === 'main') {
      const options = [
        { name: 'Attack', index: 0 },
        { name: 'Items', index: 1 },
        { name: 'Flee', index: 2 }
      ];

      const html = options.map(opt => {
        const selected = opt.index === this.#selectedOption ? 'selected' : '';
        return `<div class="menu-option ${selected}">▸ ${opt.name}</div>`;
      }).join('');

      menuEl.innerHTML = `<div class="battle-options">${html}</div>`;
    } else if (this.#currentMenu === 'items') {
      if (this.#itemList.length === 0) {
        menuEl.innerHTML = '<div class="menu-empty">No usable items</div>';
        setTimeout(() => {
          this.#currentMenu = 'main';
          this.#renderMenu();
        }, 1000);
        return;
      }

      const html = this.#itemList.map((item, index) => {
        const selected = index === this.#selectedOption ? 'selected' : '';
        return `<div class="menu-option ${selected}">▸ ${item.name}</div>`;
      }).join('');

      menuEl.innerHTML = `
        <div class="battle-items">
          <div class="menu-title">Items</div>
          ${html}
          <div class="menu-hint">ESC to go back</div>
        </div>
      `;
    }
  }

  close() {
    this.unmount();
    if (this.#onComplete) {
      this.#onComplete(this.#battleSystem.getState());
    }
  }

  unmount() {
    if (this.#keyHandler) {
      document.removeEventListener('keydown', this.#keyHandler);
      this.#keyHandler = null;
    }

    if (this.#container && this.#container.parentElement) {
      this.#container.parentElement.removeChild(this.#container);
    }
    this.#container = null;
  }
}
