import test from 'node:test';
import assert from 'node:assert/strict';

import { GameState } from '../../src/core/game-state.js';
import { InventoryPanel } from '../../src/ui/components/inventory-panel.js';
import { GameMenu } from '../../src/ui/components/game-menu.js';

class MockEvent {
  constructor(type, { bubbles = false } = {}) {
    this.type = type;
    this.bubbles = bubbles;
    this.defaultPrevented = false;
    this.target = null;
    this.currentTarget = null;
  }

  preventDefault() {
    this.defaultPrevented = true;
  }
}

class MockMouseEvent extends MockEvent {}

class MockClassList {
  constructor(element) {
    this.element = element;
    this.tokens = new Set();
  }

  add(...tokens) {
    for (const token of tokens) {
      if (token) {
        this.tokens.add(token);
      }
    }
    this.#commit();
  }

  remove(...tokens) {
    for (const token of tokens) {
      this.tokens.delete(token);
    }
    this.#commit();
  }

  contains(token) {
    return this.tokens.has(token);
  }

  setFromString(value) {
    this.tokens = new Set((value ?? '').split(/\s+/).filter(Boolean));
    this.#commit(false);
  }

  toString() {
    return Array.from(this.tokens).join(' ');
  }

  #commit(updateDataset = true) {
    if (updateDataset) {
      this.element._className = this.toString();
    }
  }
}

class MockElement {
  constructor(tagName, ownerDocument) {
    this.tagName = tagName.toUpperCase();
    this.ownerDocument = ownerDocument;
    this.children = [];
    this.parentNode = null;
    this._className = '';
    this.classList = new MockClassList(this);
    this.dataset = new Proxy(
      Object.create(null),
      {
        set: (target, prop, value) => {
          target[prop] = String(value);
          const attrName = `data-${prop.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
          this.attributes[attrName] = String(value);
          return true;
        },
        get: (target, prop) => target[prop],
      },
    );
    this.attributes = Object.create(null);
    this.eventListeners = new Map();
    this.hidden = false;
    this.tabIndex = -1;
    this.isFragment = false;
  }

  set className(value) {
    this._className = value ?? '';
    this.classList.setFromString(this._className);
  }

  get className() {
    return this._className;
  }

  set textContent(value) {
    this._textContent = value ?? '';
    this.children = [];
  }

  get textContent() {
    if (this.children.length) {
      return this.children.map((child) => child.textContent ?? '').join('');
    }
    return this._textContent ?? '';
  }

  set type(value) {
    this.attributes.type = value;
  }

  get type() {
    return this.attributes.type;
  }

  set id(value) {
    this.attributes.id = value;
  }

  get id() {
    return this.attributes.id;
  }

  append(...nodes) {
    for (const node of nodes) {
      this.appendChild(node);
    }
  }

  appendChild(node) {
    if (!node) {
      return node;
    }

    if (node.isFragment) {
      for (const child of [...node.children]) {
        this.appendChild(child);
      }
      node.children = [];
      return node;
    }

    if (node.parentNode) {
      node.parentNode.removeChild(node);
    }

    this.children.push(node);
    node.parentNode = this;
    return node;
  }

  removeChild(child) {
    const index = this.children.indexOf(child);
    if (index >= 0) {
      this.children.splice(index, 1);
      child.parentNode = null;
    }
    return child;
  }

  replaceChildren(...nodes) {
    for (const child of [...this.children]) {
      child.parentNode = null;
    }
    this.children = [];
    if (nodes.length) {
      this.append(...nodes);
    }
  }

  remove() {
    if (this.parentNode) {
      this.parentNode.removeChild(this);
    }
  }

  focus() {
    if (this.ownerDocument) {
      this.ownerDocument.activeElement = this;
    }
  }

  addEventListener(type, handler) {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, []);
    }
    this.eventListeners.get(type).push(handler);
  }

  removeEventListener(type, handler) {
    const listeners = this.eventListeners.get(type);
    if (!listeners) {
      return;
    }

    const index = listeners.indexOf(handler);
    if (index >= 0) {
      listeners.splice(index, 1);
    }
  }

  dispatchEvent(event) {
    event.target = event.target ?? this;
    event.currentTarget = this;

    const listeners = this.eventListeners.get(event.type) ?? [];
    for (const listener of [...listeners]) {
      listener.call(this, event);
    }

    if (event.bubbles && this.parentNode) {
      this.parentNode.dispatchEvent(event);
    }

    return !event.defaultPrevented;
  }

  querySelector(selector) {
    const [first] = this.querySelectorAll(selector);
    return first ?? null;
  }

  querySelectorAll(selector) {
    const selectors = selector.split(',').map((entry) => entry.trim()).filter(Boolean);
    const results = [];

    const traverse = (node) => {
      for (const child of node.children) {
        if (child instanceof MockElement) {
          if (selectors.some((entry) => matchesSelector(child, entry))) {
            results.push(child);
          }
          traverse(child);
        }
      }
    };

    traverse(this);
    return results;
  }

  get isConnected() {
    return Boolean(this.parentNode);
  }
}

class MockDocumentFragment extends MockElement {
  constructor(ownerDocument) {
    super('#fragment', ownerDocument);
    this.isFragment = true;
  }
}

class MockDocument {
  constructor() {
    this.body = new MockElement('body', this);
    this.activeElement = null;
  }

  createElement(tagName) {
    return new MockElement(tagName, this);
  }

  createDocumentFragment() {
    return new MockDocumentFragment(this);
  }

  getElementById(id) {
    return this.body.querySelector(`#${id}`);
  }
}

class MockWindow {
  constructor(document) {
    this.document = document;
    this.MouseEvent = class extends MockMouseEvent {
      constructor(type, options = {}) {
        super(type, options);
      }
    };
  }
}

function matchesSelector(element, selector) {
  if (!selector) {
    return false;
  }

  let main = selector;
  const attributeMatchers = [];

  const attributePattern = /\[[^\]]+\]/g;
  const attributes = selector.match(attributePattern) ?? [];
  if (attributes.length) {
    main = selector.replace(attributePattern, '').trim();
    attributeMatchers.push(
      ...attributes.map((attribute) => {
        const trimmed = attribute.slice(1, -1);
        const [name, rawValue] = trimmed.split('=');
        const value = rawValue ? rawValue.replace(/^"|"$/g, '') : null;
        return { name: name.trim(), value };
      }),
    );
  }

  if (main.startsWith('.')) {
    const className = main.slice(1);
    if (!element.classList.contains(className)) {
      return false;
    }
  } else if (main.startsWith('#')) {
    const id = main.slice(1);
    if (element.id !== id) {
      return false;
    }
  } else if (main) {
    const [tagName, className] = main.split('.');
    if (tagName && element.tagName.toLowerCase() !== tagName.toLowerCase()) {
      return false;
    }
    if (className && !element.classList.contains(className)) {
      return false;
    }
  }

  for (const matcher of attributeMatchers) {
    const actual = getAttribute(element, matcher.name);
    if (matcher.value == null) {
      if (actual == null) {
        return false;
      }
    } else if (actual !== matcher.value) {
      return false;
    }
  }

  return true;
}

function getAttribute(element, attribute) {
  if (attribute.startsWith('data-')) {
    const key = attribute
      .slice(5)
      .split('-')
      .map((chunk, index) => (index === 0 ? chunk : chunk.charAt(0).toUpperCase() + chunk.slice(1)))
      .join('');
    return element.dataset[key] ?? null;
  }

  if (attribute === 'id') {
    return element.id ?? null;
  }

  if (attribute === 'class') {
    return element.className;
  }

  return element.attributes[attribute] ?? null;
}

async function withDom(callback) {
  const document = new MockDocument();
  const window = new MockWindow(document);

  globalThis.document = document;
  globalThis.window = window;
  globalThis.HTMLElement = MockElement;
  globalThis.Node = MockElement;

  try {
    const root = document.createElement('div');
    root.id = 'root';
    document.body.append(root);
    await callback(root);
  } finally {
    delete globalThis.document;
    delete globalThis.window;
    delete globalThis.HTMLElement;
    delete globalThis.Node;
  }
}

test('inventory panel renders grouped items and updates on changes', async () => {
  await withDom((root) => {
    const gameState = new GameState({
      starterInventory: [
        { id: 'minor-healing-potion', quantity: 1 },
        { id: 'wooden-sword', quantity: 1 },
      ],
    });

    const panel = new InventoryPanel(gameState);
    panel.mount(root);

    const potionButton = root.querySelector(
      '.inventory-panel__item-button[data-item-id="minor-healing-potion"]',
    );
    assert.ok(potionButton, 'potion should be rendered');
    assert.equal(potionButton.dataset.itemId, 'minor-healing-potion');
    assert.equal(potionButton.dataset.quantity, '1');

    gameState.addItem('minor-healing-potion', 2);

    const updatedPotion = root.querySelector(
      '.inventory-panel__item-button[data-item-id="minor-healing-potion"]',
    );
    assert.ok(updatedPotion, 'potion button should still exist after update');
    assert.equal(updatedPotion.dataset.quantity, '3', 'quantity should reflect new total');

    const sections = root.querySelectorAll('.inventory-panel__section');
    assert.ok(sections.length >= 1, 'at least one category section should be rendered');

    panel.unmount();
  });
});

test('game menu wires use events to game state inventory', async () => {
  await withDom((root) => {
    const gameState = new GameState({
      starterInventory: [
        { id: 'minor-healing-potion', quantity: 1 },
      ],
    });

    const menu = new GameMenu(root, { gameState });
    menu.mount();

    const useButton = root.querySelector(
      '.inventory-panel__action--use[data-item-id="minor-healing-potion"]',
    );
    assert.ok(useButton, 'use button should exist for potion');

    useButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    assert.equal(gameState.getItemQuantity('minor-healing-potion'), 0, 'item should be consumed');

    menu.unmount();
  });
});
