/**
 * MenuScene - Full-screen menu for inventory, equipment, status
 */

import { getItem } from '../data/items.js';

export class MenuScene {
  #container;
  #gameState;
  #currentTab;
  #selectedIndex;
  #onClose;
  #keyHandler;

  constructor(gameState, onClose) {
    this.#gameState = gameState;
    this.#onClose = onClose;
    this.#container = null;
    this.#currentTab = 'status';
    this.#selectedIndex = 0;
  }

  mount(parentElement) {
    this.#container = document.createElement('div');
    this.#container.className = 'menu-scene';
    this.#container.innerHTML = `
      <div class="menu-container">
        <div class="menu-tabs">
          <button class="menu-tab active" data-tab="status">Status</button>
          <button class="menu-tab" data-tab="inventory">Items</button>
          <button class="menu-tab" data-tab="equipment">Equipment</button>
        </div>
        <div class="menu-content" id="menu-content">
          <!-- Content will be rendered here -->
        </div>
        <div class="menu-footer">
          Press ESC to close
        </div>
      </div>
    `;

    parentElement.appendChild(this.#container);

    // Add tab click handlers
    this.#container.querySelectorAll('.menu-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.#switchTab(tab.dataset.tab);
      });
    });

    // Keyboard controls
    this.#keyHandler = (e) => this.#handleKey(e);
    document.addEventListener('keydown', this.#keyHandler);

    this.#renderContent();
  }

  #switchTab(tab) {
    this.#currentTab = tab;
    this.#selectedIndex = 0;

    // Update tab visuals
    this.#container.querySelectorAll('.menu-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === tab);
    });

    this.#renderContent();
  }

  #renderContent() {
    const contentEl = this.#container.querySelector('#menu-content');
    if (!contentEl) return;

    switch (this.#currentTab) {
      case 'status':
        contentEl.innerHTML = this.#renderStatus();
        break;
      case 'inventory':
        contentEl.innerHTML = this.#renderInventory();
        break;
      case 'equipment':
        contentEl.innerHTML = this.#renderEquipment();
        break;
    }
  }

  #renderStatus() {
    const stats = this.#gameState.getPlayerStats();

    return `
      <div class="menu-status">
        <h2>Character Status</h2>
        <div class="status-grid">
          <div class="stat-row">
            <span class="stat-label">Level:</span>
            <span class="stat-value">${stats.level}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Experience:</span>
            <span class="stat-value">${stats.experience}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">HP:</span>
            <span class="stat-value">${stats.health} / ${stats.maxHealth}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">MP:</span>
            <span class="stat-value">${stats.mana} / ${stats.maxMana}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Strength:</span>
            <span class="stat-value">${stats.strength}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Defense:</span>
            <span class="stat-value">${stats.defense}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Agility:</span>
            <span class="stat-value">${stats.agility}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Intelligence:</span>
            <span class="stat-value">${stats.intelligence}</span>
          </div>
          <div class="stat-row gold">
            <span class="stat-label">Gold:</span>
            <span class="stat-value">${stats.gold || 0}</span>
          </div>
        </div>
      </div>
    `;
  }

  #renderInventory() {
    const inventory = this.#gameState.getInventory();

    if (inventory.length === 0) {
      return '<div class="menu-empty">No items in inventory</div>';
    }

    const items = inventory.map((invItem, index) => {
      const item = getItem(invItem.id);
      if (!item) return '';

      const selected = index === this.#selectedIndex ? 'selected' : '';
      return `
        <div class="menu-item ${selected}" data-index="${index}">
          <span class="item-name">${item.name}</span>
          <span class="item-desc">${item.description}</span>
        </div>
      `;
    }).join('');

    return `
      <div class="menu-inventory">
        <h2>Inventory</h2>
        <div class="item-list">
          ${items}
        </div>
      </div>
    `;
  }

  #renderEquipment() {
    const equipment = this.#gameState.getEquipment();

    const renderSlot = (slotName, itemId) => {
      const item = itemId ? getItem(itemId) : null;
      return `
        <div class="equipment-slot">
          <span class="slot-label">${slotName}:</span>
          <span class="slot-value">${item ? item.name : 'Empty'}</span>
        </div>
      `;
    };

    return `
      <div class="menu-equipment">
        <h2>Equipment</h2>
        <div class="equipment-grid">
          ${renderSlot('Weapon', equipment.weapon)}
          ${renderSlot('Armor', equipment.armor)}
          ${renderSlot('Accessory', equipment.accessory)}
        </div>
      </div>
    `;
  }

  #handleKey(e) {
    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        this.close();
        break;
      case 'ArrowUp':
        e.preventDefault();
        this.#selectedIndex = Math.max(0, this.#selectedIndex - 1);
        this.#renderContent();
        break;
      case 'ArrowDown':
        e.preventDefault();
        const maxIndex = this.#getMaxIndex();
        this.#selectedIndex = Math.min(maxIndex, this.#selectedIndex + 1);
        this.#renderContent();
        break;
      case 'Tab':
        e.preventDefault();
        const tabs = ['status', 'inventory', 'equipment'];
        const currentIndex = tabs.indexOf(this.#currentTab);
        const nextIndex = (currentIndex + 1) % tabs.length;
        this.#switchTab(tabs[nextIndex]);
        break;
    }
  }

  #getMaxIndex() {
    if (this.#currentTab === 'inventory') {
      return Math.max(0, this.#gameState.getInventory().length - 1);
    }
    return 0;
  }

  close() {
    this.unmount();
    if (this.#onClose) {
      this.#onClose();
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
