import { InventoryPanel } from './inventory-panel.js';

export class GameMenu {
  constructor(root, { gameState, onInspectItem, onUseItem } = {}) {
    this.root = root;
    this.gameState = gameState;
    this.onInspectItem = onInspectItem;
    this.onUseItem = onUseItem;

    this.container = null;
    this.optionsList = null;
    this.content = null;
    this.inventoryPanel = null;
    this.activeOptionId = null;

    this.optionButtons = [];
  }

  mount() {
    this.container = document.createElement('section');
    this.container.className = 'game-menu';

    const heading = document.createElement('h1');
    heading.className = 'game-menu__title';
    heading.textContent = 'Game Menu';
    this.container.append(heading);

    const layout = document.createElement('div');
    layout.className = 'game-menu__layout';

    this.optionsList = document.createElement('ul');
    this.optionsList.className = 'game-menu__options';

    const options = [
      { id: 'inventory', label: 'Inventory', handler: () => this.#showInventory() },
      {
        id: 'status',
        label: 'Status',
        handler: () => this.#showPlaceholder('Status screen coming soon.'),
      },
      {
        id: 'settings',
        label: 'Settings',
        handler: () => this.#showPlaceholder('Settings are not available yet.'),
      },
    ];

    options.forEach((option, index) => {
      const item = document.createElement('li');
      item.className = 'game-menu__option';

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'game-menu__option-button';
      button.dataset.optionId = option.id;
      button.textContent = option.label;
      button.addEventListener('click', () => {
        this.#selectOption(option.id, option.handler);
      });
      button.addEventListener('keydown', (event) => {
        switch (event.key) {
          case 'ArrowUp':
          case 'Up':
            event.preventDefault();
            this.#moveOptionFocus(index, -1, options);
            break;
          case 'ArrowDown':
          case 'Down':
            event.preventDefault();
            this.#moveOptionFocus(index, 1, options);
            break;
          case 'Enter':
          case ' ': {
            event.preventDefault();
            this.#selectOption(option.id, option.handler);
            break;
          }
          default:
            break;
        }
      });

      item.append(button);
      this.optionsList.append(item);
      this.optionButtons.push(button);
    });

    layout.append(this.optionsList);

    this.content = document.createElement('div');
    this.content.className = 'game-menu__content';
    layout.append(this.content);

    this.container.append(layout);
    this.root.append(this.container);

    this.#selectOption('inventory', options[0].handler);
  }

  unmount() {
    this.#teardownInventoryPanel();
    this.optionButtons = [];

    if (this.container?.isConnected) {
      this.container.remove();
    }

    this.container = null;
    this.optionsList = null;
    this.content = null;
  }

  #moveOptionFocus(currentIndex, delta, options) {
    if (!this.optionButtons.length) {
      return;
    }

    const nextIndex = (currentIndex + delta + this.optionButtons.length) % this.optionButtons.length;
    const button = this.optionButtons[nextIndex];
    const option = options[nextIndex];
    if (!button || !option) {
      return;
    }

    button.focus({ preventScroll: true });
  }

  #selectOption(optionId, handler) {
    if (this.activeOptionId === optionId) {
      if (typeof handler === 'function') {
        handler();
      }
      return;
    }

    if (this.activeOptionId && this.optionsList) {
      const previous = this.optionsList.querySelector(
        `.game-menu__option-button[data-option-id="${this.activeOptionId}"]`,
      );
      previous?.classList.remove('game-menu__option-button--active');
    }

    this.activeOptionId = optionId;

    if (this.optionsList) {
      const next = this.optionsList.querySelector(
        `.game-menu__option-button[data-option-id="${optionId}"]`,
      );
      next?.classList.add('game-menu__option-button--active');
      next?.focus({ preventScroll: true });
    }

    this.#teardownInventoryPanel();
    this.content.replaceChildren();

    if (typeof handler === 'function') {
      handler();
    }
  }

  #showInventory() {
    const mountPoint = document.createElement('div');
    mountPoint.className = 'game-menu__inventory';
    this.content.append(mountPoint);

    this.inventoryPanel = new InventoryPanel(this.gameState, {
      onInspect: (payload) => {
        this.onInspectItem?.(payload);
      },
      onUse: (payload) => {
        const success = this.gameState.useItem(payload.id, payload.quantity ?? 1);
        if (success) {
          this.onUseItem?.({
            ...payload,
            remaining: this.gameState.getItemQuantity(payload.id),
          });
        }
      },
    });

    this.inventoryPanel.mount(mountPoint);
  }

  #showPlaceholder(message) {
    const paragraph = document.createElement('p');
    paragraph.className = 'game-menu__placeholder';
    paragraph.textContent = message;
    this.content.append(paragraph);
  }

  #teardownInventoryPanel() {
    if (this.inventoryPanel) {
      this.inventoryPanel.unmount();
      this.inventoryPanel = null;
    }
  }
}
