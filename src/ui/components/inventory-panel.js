export class InventoryPanel {
  #handleInventoryChange = (snapshot) => {
    this.snapshot = snapshot;
    this.#render();
  };

  #handleKeyDown = (event) => {
    if (!this.itemButtons.length) {
      return;
    }

    switch (event.key) {
      case 'ArrowUp':
      case 'Up': {
        event.preventDefault();
        this.#moveFocus(-1);
        break;
      }
      case 'ArrowDown':
      case 'Down': {
        event.preventDefault();
        this.#moveFocus(1);
        break;
      }
      case 'Home': {
        event.preventDefault();
        this.#updateFocus(0);
        break;
      }
      case 'End': {
        event.preventDefault();
        this.#updateFocus(this.itemButtons.length - 1);
        break;
      }
      case 'Enter':
      case ' ': {
        event.preventDefault();
        this.#triggerInspect(this.focusIndex ?? 0);
        break;
      }
      case 'u':
      case 'U': {
        event.preventDefault();
        this.#triggerUse(this.focusIndex ?? 0);
        break;
      }
      default:
        break;
    }
  };

  constructor(gameState, { onInspect, onUse } = {}) {
    this.gameState = gameState;
    this.onInspect = onInspect;
    this.onUse = onUse;

    this.container = null;
    this.listContainer = null;
    this.header = null;
    this.emptyState = null;

    this.itemButtons = [];
    this.focusIndex = null;
    this.activeItemId = null;

    this.snapshot = { categories: [] };
    this.entriesById = new Map();
    this.unsubscribe = null;
  }

  mount(root) {
    this.container = document.createElement('section');
    this.container.className = 'inventory-panel';

    const title = document.createElement('h1');
    title.className = 'inventory-panel__title';
    title.textContent = 'Inventory';
    this.container.append(title);

    this.listContainer = document.createElement('div');
    this.listContainer.className = 'inventory-panel__sections';
    this.listContainer.tabIndex = 0;
    this.listContainer.addEventListener('keydown', this.#handleKeyDown);
    this.container.append(this.listContainer);

    this.emptyState = document.createElement('p');
    this.emptyState.className = 'inventory-panel__empty';
    this.emptyState.textContent = 'Your inventory is empty.';
    this.container.append(this.emptyState);

    root.append(this.container);

    this.unsubscribe = this.gameState.addInventoryListener(this.#handleInventoryChange);
  }

  unmount() {
    if (typeof this.unsubscribe === 'function') {
      this.unsubscribe();
      this.unsubscribe = null;
    }

    if (this.listContainer) {
      this.listContainer.removeEventListener('keydown', this.#handleKeyDown);
    }

    if (this.container?.isConnected) {
      this.container.remove();
    }

    this.container = null;
    this.listContainer = null;
    this.emptyState = null;
    this.itemButtons = [];
    this.focusIndex = null;
    this.activeItemId = null;
    this.entriesById.clear();
  }

  #render() {
    if (!this.listContainer) {
      return;
    }

    this.listContainer.replaceChildren();
    this.entriesById.clear();
    this.itemButtons = [];

    const fragment = document.createDocumentFragment();

    for (const category of this.snapshot.categories) {
      const section = document.createElement('section');
      section.className = 'inventory-panel__section';
      section.dataset.category = category.category;

      const header = document.createElement('h2');
      header.className = 'inventory-panel__category';
      header.textContent = category.category;
      section.append(header);

      const list = document.createElement('ul');
      list.className = 'inventory-panel__items';

      for (const item of category.items) {
        this.entriesById.set(item.id, item);

        const listItem = document.createElement('li');
        listItem.className = 'inventory-panel__item';
        listItem.dataset.itemId = item.id;

        const inspectButton = document.createElement('button');
        inspectButton.type = 'button';
        inspectButton.className = 'inventory-panel__item-button';
        inspectButton.dataset.itemId = item.id;
        inspectButton.dataset.quantity = String(item.quantity);
        inspectButton.textContent = `${item.definition.name} (x${item.quantity})`;
        inspectButton.addEventListener('focus', () => {
          const index = this.itemButtons.indexOf(inspectButton);
          if (index >= 0) {
            this.#updateFocus(index, { focusDom: false });
          }
        });
        inspectButton.addEventListener('pointerenter', () => {
          const index = this.itemButtons.indexOf(inspectButton);
          if (index >= 0) {
            this.#updateFocus(index, { focusDom: false });
          }
        });
        inspectButton.addEventListener('click', (event) => {
          event.preventDefault();
          const index = this.itemButtons.indexOf(inspectButton);
          this.#triggerInspect(index >= 0 ? index : 0);
        });

        listItem.append(inspectButton);

        const actions = document.createElement('div');
        actions.className = 'inventory-panel__actions';

        const inspectAction = document.createElement('button');
        inspectAction.type = 'button';
        inspectAction.className = 'inventory-panel__action inventory-panel__action--inspect';
        inspectAction.dataset.role = 'inspect-item';
        inspectAction.dataset.itemId = item.id;
        inspectAction.textContent = 'Inspect';
        inspectAction.addEventListener('click', (event) => {
          event.preventDefault();
          const index = this.itemButtons.indexOf(inspectButton);
          this.#triggerInspect(index >= 0 ? index : 0);
        });
        actions.append(inspectAction);

        const useAction = document.createElement('button');
        useAction.type = 'button';
        useAction.className = 'inventory-panel__action inventory-panel__action--use';
        useAction.dataset.role = 'use-item';
        useAction.dataset.itemId = item.id;
        useAction.textContent = 'Use';
        useAction.disabled = item.quantity <= 0;
        useAction.addEventListener('click', (event) => {
          event.preventDefault();
          const index = this.itemButtons.indexOf(inspectButton);
          this.#triggerUse(index >= 0 ? index : 0);
        });
        actions.append(useAction);

        listItem.append(actions);
        list.append(listItem);
        this.itemButtons.push(inspectButton);
      }

      section.append(list);
      fragment.append(section);
    }

    if (!this.snapshot.categories.length) {
      this.emptyState.hidden = false;
    } else {
      this.emptyState.hidden = true;
    }

    this.listContainer.append(fragment);

    if (this.itemButtons.length) {
      const targetIndex = this.activeItemId
        ? this.itemButtons.findIndex((button) => button.dataset.itemId === this.activeItemId)
        : 0;
      const resolvedIndex = targetIndex >= 0 ? targetIndex : 0;
      this.#updateFocus(resolvedIndex);
    } else {
      this.focusIndex = null;
      this.activeItemId = null;
    }
  }

  #moveFocus(delta) {
    if (!this.itemButtons.length) {
      return;
    }

    const nextIndex = ((this.focusIndex ?? 0) + delta + this.itemButtons.length) % this.itemButtons.length;
    this.#updateFocus(nextIndex);
  }

  #updateFocus(index, { focusDom = true } = {}) {
    if (!this.itemButtons.length) {
      this.focusIndex = null;
      this.activeItemId = null;
      return;
    }

    const clampedIndex = Math.max(0, Math.min(index, this.itemButtons.length - 1));
    const button = this.itemButtons[clampedIndex];
    if (!button) {
      return;
    }

    if (this.focusIndex != null && this.itemButtons[this.focusIndex]) {
      this.itemButtons[this.focusIndex].classList.remove('inventory-panel__item-button--active');
    }

    this.focusIndex = clampedIndex;
    this.activeItemId = button.dataset.itemId ?? null;
    button.classList.add('inventory-panel__item-button--active');

    if (focusDom) {
      button.focus({ preventScroll: true });
    }
  }

  #triggerInspect(index) {
    const button = this.itemButtons[index];
    if (!button) {
      return;
    }

    this.#updateFocus(index);

    const entry = this.entriesById.get(button.dataset.itemId);
    if (!entry) {
      return;
    }

    this.onInspect?.({
      id: entry.id,
      definition: entry.definition,
      quantity: entry.quantity,
      stacks: [...entry.stacks],
    });
  }

  #triggerUse(index) {
    const button = this.itemButtons[index];
    if (!button) {
      return;
    }

    this.#updateFocus(index);

    const entry = this.entriesById.get(button.dataset.itemId);
    if (!entry) {
      return;
    }

    if (entry.quantity <= 0) {
      return;
    }

    this.onUse?.({
      id: entry.id,
      definition: entry.definition,
      quantity: 1,
      stacks: [...entry.stacks],
    });
  }
}
