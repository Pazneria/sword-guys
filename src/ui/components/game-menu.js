const DEFAULT_MENU_ITEMS = Object.freeze([
  { label: 'Inventory', value: 'inventory' },
  { label: 'Status', value: 'status' },
  { label: 'Equipment', value: 'equipment' },
  { label: 'Skills', value: 'skills' },
  { label: 'Save', value: 'save' },
  { label: 'Settings', value: 'settings' },
  { label: 'Return to Title', value: 'return-to-title' },
]);

const resolveDocument = (providedDocument) => {
  if (providedDocument) {
    return providedDocument;
  }

  if (typeof document !== 'undefined') {
    return document;
  }

  throw new Error('GameMenu requires a document instance to render.');
};

const normalizeItems = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    return DEFAULT_MENU_ITEMS;
  }

  return items
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const label = String(item.label ?? '').trim();
      const value = String(item.value ?? '').trim();

      if (!label || !value) {
        return null;
      }

      return { label, value };
    })
    .filter(Boolean);
};

export class GameMenu {
  #document;

  #items;

  #onSelect;

  #onShow;

  #onHide;

  #handleKeyDown = (event) => {
    if (!this.visible) {
      return;
    }

    if (!event || typeof event.key !== 'string') {
      return;
    }

    const key = event.key;

    const normalizedIndex = this.#resolveActiveIndex();
    if (normalizedIndex >= 0) {
      this.activeIndex = normalizedIndex;
    }

    switch (key) {
      case 'ArrowDown':
      case 'ArrowRight':
        event.preventDefault?.();
        this.#moveFocus(1);
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        event.preventDefault?.();
        this.#moveFocus(-1);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault?.();
        this.#activateItem(this.activeIndex);
        break;
      case 'Escape':
        event.preventDefault?.();
        this.hide();
        break;
      default:
        break;
    }
  };

  constructor({
    document: providedDocument,
    items = DEFAULT_MENU_ITEMS,
    onSelect,
    onShow,
    onHide,
    title = 'Menu',
  } = {}) {
    this.#document = resolveDocument(providedDocument);
    this.#items = normalizeItems(items);
    if (this.#items.length === 0) {
      this.#items = DEFAULT_MENU_ITEMS;
    }

    this.#onSelect = typeof onSelect === 'function' ? onSelect : null;
    this.#onShow = typeof onShow === 'function' ? onShow : null;
    this.#onHide = typeof onHide === 'function' ? onHide : null;

    this.title = String(title ?? '').trim() || 'Menu';

    this.element = this.#createMenu();
    this.buttons = Array.from(this.element.querySelectorAll('[data-menu-item]'));
    this.activeIndex = 0;
    this.visible = false;

    this.element.addEventListener('keydown', this.#handleKeyDown);
  }

  show() {
    if (this.visible) {
      return;
    }

    this.visible = true;
    this.element.classList.add('game-menu--visible');
    this.element.setAttribute('aria-hidden', 'false');
    this.element.removeAttribute('inert');
    this.#focusItem(0);
    this.#emit('game-menu:show');
    this.#onShow?.();
  }

  hide() {
    if (!this.visible) {
      return;
    }

    this.visible = false;
    this.element.classList.remove('game-menu--visible');
    this.element.setAttribute('aria-hidden', 'true');
    this.element.setAttribute('inert', '');
    this.activeIndex = 0;
    this.#emit('game-menu:hide');
    this.#onHide?.();
  }

  destroy() {
    this.hide();
    this.element.removeEventListener('keydown', this.#handleKeyDown);
    if (this.element?.isConnected) {
      this.element.remove();
    }
    this.buttons.length = 0;
  }

  isVisible() {
    return this.visible;
  }

  #createMenu() {
    const overlay = this.#document.createElement('div');
    overlay.className = 'game-menu';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-hidden', 'true');
    overlay.setAttribute('inert', '');

    const panel = this.#document.createElement('div');
    panel.className = 'game-menu__panel';

    const heading = this.#document.createElement('h2');
    heading.className = 'game-menu__title';
    heading.textContent = this.title;

    const list = this.#document.createElement('ul');
    list.className = 'game-menu__list';

    this.#items.forEach((item, index) => {
      const listItem = this.#document.createElement('li');
      listItem.className = 'game-menu__list-item';

      const button = this.#document.createElement('button');
      button.type = 'button';
      button.className = 'game-menu__item';
      button.textContent = item.label;
      button.dataset.menuValue = item.value;
      button.setAttribute('data-menu-item', '');
      button.setAttribute('data-menu-index', String(index));
      button.addEventListener('click', () => {
        this.#activateItem(this.buttons.indexOf(button));
      });

      listItem.append(button);
      list.append(listItem);
    });

    panel.append(heading, list);
    overlay.append(panel);

    return overlay;
  }

  #focusItem(index) {
    if (!this.buttons.length) {
      return;
    }

    const normalizedIndex = ((index % this.buttons.length) + this.buttons.length) % this.buttons.length;
    const button = this.buttons[normalizedIndex];
    if (button) {
      button.focus?.();
      this.activeIndex = normalizedIndex;
      this.element.setAttribute('data-active-index', String(normalizedIndex));
    }
  }

  #moveFocus(delta) {
    if (!this.buttons.length) {
      return;
    }

    const nextIndex = this.activeIndex + delta;
    this.#focusItem(nextIndex);
  }

  #activateItem(index) {
    if (!this.buttons.length) {
      return;
    }

    const button = this.buttons[index];
    if (!button) {
      return;
    }

    const value = button.dataset.menuValue;
    this.#emit('game-menu:select', { value });
    this.#onSelect?.(value, button);
  }

  #resolveActiveIndex() {
    if (!this.buttons.length) {
      return -1;
    }

    const active = this.#document.activeElement;
    const index = this.buttons.indexOf(active);
    return index;
  }

  #emit(type, detail) {
    const event = typeof CustomEvent === 'function'
      ? new CustomEvent(type, { detail })
      : { type, detail };

    this.element.dispatchEvent?.(event);
  }
}

GameMenu.DEFAULT_ITEMS = DEFAULT_MENU_ITEMS;
