import test from 'node:test';
import assert from 'node:assert/strict';

import { GameState } from '../src/core/game-state.js';
import { StatusPanel } from '../src/ui/components/status-panel.js';

class MockClassList {
  constructor(element) {
    this.element = element;
  }

  add(...tokens) {
    const classes = new Set(this.element.className.split(/\s+/).filter(Boolean));
    tokens.forEach((token) => {
      if (token) {
        classes.add(token);
      }
    });
    this.element.className = Array.from(classes).join(' ');
  }

  remove(...tokens) {
    const classes = new Set(this.element.className.split(/\s+/).filter(Boolean));
    tokens.forEach((token) => {
      classes.delete(token);
    });
    this.element.className = Array.from(classes).join(' ');
  }
}

class MockNode {
  constructor() {
    this.parentNode = null;
    this.childNodes = [];
  }

  appendChild(node) {
    if (!node) {
      return node;
    }

    if (node instanceof MockDocumentFragment) {
      node.childNodes.forEach((child) => this.appendChild(child));
      return node;
    }

    if (node.parentNode) {
      node.parentNode.removeChild(node);
    }

    node.parentNode = this;
    this.childNodes.push(node);
    return node;
  }

  append(...nodes) {
    nodes.forEach((node) => {
      if (typeof node === 'string') {
        const textNode = new MockText(node);
        this.appendChild(textNode);
      } else if (node instanceof MockDocumentFragment) {
        node.childNodes.forEach((child) => this.appendChild(child));
      } else if (node) {
        this.appendChild(node);
      }
    });
  }

  removeChild(node) {
    const index = this.childNodes.indexOf(node);
    if (index !== -1) {
      this.childNodes.splice(index, 1);
      node.parentNode = null;
    }
    return node;
  }

  replaceChildren(...nodes) {
    [...this.childNodes].forEach((child) => this.removeChild(child));
    this.append(...nodes);
  }

  remove() {
    if (this.parentNode) {
      this.parentNode.removeChild(this);
    }
  }

  get isConnected() {
    if (!this.parentNode) {
      return false;
    }

    return this.parentNode instanceof MockDocument ? true : this.parentNode.isConnected;
  }
}

class MockText extends MockNode {
  constructor(text = '') {
    super();
    this.textContent = text;
  }
}

class MockElement extends MockNode {
  constructor(tagName) {
    super();
    this.tagName = tagName.toLowerCase();
    this.attributes = new Map();
    this.dataset = {};
    this.className = '';
    this.classList = new MockClassList(this);
    this.eventListeners = {};
    this.hidden = false;
    this.textContent = '';
  }

  set textContent(value) {
    this._textContent = value ?? '';
  }

  get textContent() {
    return this._textContent ?? '';
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
    if (name.startsWith('data-')) {
      const key = name
        .slice(5)
        .split('-')
        .map((part, index) => (index === 0 ? part : `${part.charAt(0).toUpperCase()}${part.slice(1)}`))
        .join('');
      this.dataset[key] = String(value);
    }
  }

  addEventListener(type, handler) {
    if (!this.eventListeners[type]) {
      this.eventListeners[type] = new Set();
    }

    this.eventListeners[type].add(handler);
  }

  dispatchEvent(event) {
    const listeners = this.eventListeners[event.type] ?? [];
    listeners.forEach((listener) => listener.call(this, event));
  }

  focus() {
    this.classList.add('focus');
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] ?? null;
  }

  querySelectorAll(selector) {
    const results = [];

    const matches = (node) => {
      if (!(node instanceof MockElement)) {
        return false;
      }

      const attrMatch = selector.match(/^\[data-([\w-]+)(="([^"]*)")?\]$/);
      if (attrMatch) {
        const [, attr, , expectedValue] = attrMatch;
        const key = attr
          .split('-')
          .map((part, index) => (index === 0 ? part : `${part.charAt(0).toUpperCase()}${part.slice(1)}`))
          .join('');

        if (!(key in node.dataset)) {
          return false;
        }

        if (expectedValue != null && node.dataset[key] !== expectedValue) {
          return false;
        }

        return true;
      }

      return false;
    };

    const walk = (node) => {
      node.childNodes.forEach((child) => {
        if (matches(child)) {
          results.push(child);
        }
        if (child instanceof MockElement) {
          walk(child);
        }
      });
    };

    walk(this);
    return results;
  }
}

class MockDocumentFragment extends MockNode {}

class MockDocument extends MockNode {
  constructor() {
    super();
    this.body = new MockElement('body');
  }

  createElement(tagName) {
    return new MockElement(tagName);
  }

  createDocumentFragment() {
    return new MockDocumentFragment();
  }
}

const createMockDocument = () => new MockDocument();

const textContentOf = (root, field) => {
  const element = root.querySelector(`[data-field="${field}"]`);
  return element ? element.textContent : '';
};

test('status panel reflects updates from the game state', () => {
  const mockDocument = createMockDocument();
  const gameState = GameState.getInstance();
  gameState.reset({
    emit: false,
    initialState: {
      stats: {
        level: 5,
        experience: { current: 120, nextLevel: 200 },
        health: 34,
        maxHealth: 40,
        mana: 18,
        maxMana: 20,
        strength: 15,
        agility: 13,
        intelligence: 12,
        defense: 11,
      },
      conditions: ['Poisoned'],
    },
  });

  const panel = new StatusPanel({ gameState, document: mockDocument });
  const element = panel.getElement();

  const levelElement = element.querySelector('[data-field="level"]');
  assert.ok(levelElement, 'level field should be rendered');

  assert.equal(textContentOf(element, 'level'), '5');
  assert.equal(textContentOf(element, 'experience'), '120 / 200');
  assert.equal(textContentOf(element, 'hp'), '34 / 40');
  assert.equal(textContentOf(element, 'mp'), '18 / 20');

  const playerState = gameState.getPlayerState();

  playerState.updateStats({ level: 6 });
  assert.equal(textContentOf(element, 'level'), '6');

  playerState.updateStats({ experience: { current: 150, nextLevel: 200 } });
  assert.equal(textContentOf(element, 'experience'), '150 / 200');

  playerState.updateStats({ health: 24 });
  assert.equal(textContentOf(element, 'hp'), '24 / 40');

  playerState.updateStats({ mana: 13 });
  assert.equal(textContentOf(element, 'mp'), '13 / 20');

  playerState.updateStats({ agility: 16 });
  const attributesList = element.querySelector('[data-section="attributes"]');
  const attributeEntries = attributesList
    ? attributesList.childNodes.filter((node) => node instanceof MockElement && node.tagName === 'dd')
    : [];
  assert.ok(attributeEntries.some((entry) => entry.textContent === '16'));

  playerState.addCondition('Blessed');
  const conditionsList = element.querySelector('[data-section="conditions"]');
  const conditionNames = conditionsList
    ? conditionsList.childNodes
        .filter((node) => node instanceof MockElement)
        .map((node) => node.textContent)
    : [];
  assert.deepEqual(conditionNames, ['Poisoned', 'Blessed']);

  playerState.removeCondition('Poisoned');
  const afterRemoval = conditionsList
    ? conditionsList.childNodes
        .filter((node) => node instanceof MockElement)
        .map((node) => node.textContent)
    : [];
  assert.deepEqual(afterRemoval, ['Blessed']);

  playerState.clearConditions();
  const afterClear = conditionsList
    ? conditionsList.childNodes
        .filter((node) => node instanceof MockElement)
        .map((node) => node.textContent)
    : [];
  assert.deepEqual(afterClear, ['None']);

  panel.unmount();
  gameState.reset({ emit: false });
});
