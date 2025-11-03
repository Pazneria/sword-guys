import { GameState } from '../../core/game-state.js';
import { StatusPanel } from './status-panel.js';

const ensureDocument = (doc) => {
  if (doc) {
    return doc;
  }

  if (typeof document !== 'undefined') {
    return document;
  }

  throw new Error('A document-like object is required to render the game menu.');
};

export class GameMenu {
  constructor(root, { gameState, document: doc, onClose } = {}) {
    if (!root) {
      throw new TypeError('GameMenu requires a root element to mount into.');
    }

    if (!(gameState instanceof GameState)) {
      throw new TypeError('GameMenu requires a GameState instance.');
    }

    this.root = root;
    this.gameState = gameState;
    this.document = ensureDocument(doc);
    this.onClose = typeof onClose === 'function' ? onClose : null;

    this.container = null;
    this.menuList = null;
    this.panelContainer = null;
    this.statusPanel = null;
    this.focusIndex = 0;
    this.menuOptions = [];
  }

  mount() {
    if (this.container) {
      return;
    }

    this.container = this.#createView();
    this.root.append(this.container);
    this.#showMenu();
  }

  unmount() {
    this.#teardownPanel();

    if (this.container?.isConnected) {
      this.container.remove();
    }

    this.container = null;
    this.menuList = null;
    this.panelContainer = null;
    this.menuOptions = [];
  }

  #createView() {
    const overlay = this.document.createElement('div');
    overlay.className = 'game-menu';

    const windowElement = this.document.createElement('div');
    windowElement.className = 'game-menu__window';

    const heading = this.document.createElement('h2');
    heading.className = 'game-menu__title';
    heading.textContent = 'Menu';

    const content = this.document.createElement('div');
    content.className = 'game-menu__content';

    this.menuList = this.document.createElement('ul');
    this.menuList.className = 'game-menu__options';

    const options = [
      { label: 'Status', handler: () => this.#showStatusPanel() },
      { label: 'Items', handler: null },
      { label: 'Equipment', handler: null },
      { label: 'Save', handler: null },
      { label: 'Close', handler: () => this.onClose?.() },
    ];

    this.menuOptions = options.map((option, index) => {
      const item = this.document.createElement('li');
      item.className = 'game-menu__option-item';

      const button = this.document.createElement('button');
      button.type = 'button';
      button.className = 'game-menu__option';
      button.textContent = option.label;
      button.dataset.index = String(index);
      button.addEventListener('click', () => {
        this.#activateOption(index);
      });

      item.append(button);
      this.menuList.append(item);

      return { button, handler: option.handler };
    });

    this.menuList.addEventListener('keydown', (event) => {
      this.#handleKeyDown(event);
    });

    content.append(this.menuList);

    this.panelContainer = this.document.createElement('div');
    this.panelContainer.className = 'game-menu__panel';
    content.append(this.panelContainer);

    windowElement.append(heading, content);
    overlay.append(windowElement);

    return overlay;
  }

  #handleKeyDown(event) {
    if (!this.menuOptions.length) {
      return;
    }

    switch (event.key) {
      case 'ArrowUp':
      case 'Up':
        event.preventDefault();
        this.#updateFocus((this.focusIndex - 1 + this.menuOptions.length) % this.menuOptions.length);
        break;
      case 'ArrowDown':
      case 'Down':
        event.preventDefault();
        this.#updateFocus((this.focusIndex + 1) % this.menuOptions.length);
        break;
      case 'Enter':
      case ' ':
      case 'Spacebar':
        event.preventDefault();
        this.#activateOption(this.focusIndex);
        break;
      default:
        break;
    }
  }

  #updateFocus(index) {
    if (!this.menuOptions[index]) {
      return;
    }

    if (this.menuOptions[this.focusIndex]) {
      this.menuOptions[this.focusIndex].button.classList.remove('game-menu__option--active');
    }

    this.focusIndex = index;
    const entry = this.menuOptions[this.focusIndex];
    entry.button.classList.add('game-menu__option--active');
    entry.button.focus({ preventScroll: true });
  }

  #activateOption(index) {
    const entry = this.menuOptions[index];
    if (!entry) {
      return;
    }

    entry.button.classList.add('game-menu__option--pressed');

    if (typeof entry.handler === 'function') {
      entry.handler();
    }
  }

  #showMenu() {
    if (!this.menuList || !this.panelContainer) {
      return;
    }

    this.menuList.hidden = false;
    this.panelContainer.hidden = true;
    this.panelContainer.replaceChildren();
    this.#teardownPanel();

    if (this.menuOptions.length) {
      this.#updateFocus(0);
    }
  }

  #showStatusPanel() {
    if (!this.panelContainer) {
      return;
    }

    if (!this.statusPanel) {
      this.statusPanel = new StatusPanel({
        gameState: this.gameState,
        document: this.document,
        onClose: () => this.#showMenu(),
      });
    }

    const element = this.statusPanel.getElement();
    this.panelContainer.replaceChildren(element);
    this.panelContainer.hidden = false;
    this.menuList.hidden = true;
  }

  #teardownPanel() {
    if (this.statusPanel) {
      this.statusPanel.unmount();
      this.statusPanel = null;
    }
  }
}
