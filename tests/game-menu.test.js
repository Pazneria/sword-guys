import test from 'node:test';
import assert from 'node:assert/strict';

import { GameMenu } from '../src/ui/components/game-menu.js';
import { GameState } from '../src/core/game-state.js';
import { StartingAreaScene } from '../src/scenes/starting-area.js';

class ClassList {
  constructor(element) {
    this.element = element;
  }

  #set() {
    if (!this.element._classSet) {
      this.element._classSet = new Set();
    }
    return this.element._classSet;
  }

  add(...classes) {
    const set = this.#set();
    classes
      .filter(Boolean)
      .forEach((cls) => {
        set.add(cls);
      });
    this.element._syncClassName();
  }

  remove(...classes) {
    const set = this.#set();
    classes
      .filter(Boolean)
      .forEach((cls) => {
        set.delete(cls);
      });
    this.element._syncClassName();
  }

  toggle(cls, force) {
    const set = this.#set();
    if (force === undefined) {
      if (set.has(cls)) {
        set.delete(cls);
        this.element._syncClassName();
        return false;
      }
      set.add(cls);
      this.element._syncClassName();
      return true;
    }

    if (force) {
      set.add(cls);
    } else {
      set.delete(cls);
    }
    this.element._syncClassName();
    return !!force;
  }

  contains(cls) {
    return this.#set().has(cls);
  }

  get value() {
    return this.element.className;
  }
}

const toDataAttributeName = (key) =>
  `data-${String(key)
    .replace(/([A-Z])/g, '-$1')
    .toLowerCase()}`;

class TestElement {
  constructor(tagName, ownerDocument) {
    this.tagName = String(tagName ?? '').toUpperCase();
    this.ownerDocument = ownerDocument;
    this.children = [];
    this.parentNode = null;
    this._classSet = new Set();
    this._className = '';
    this.eventListeners = new Map();
    this.attributes = new Map();
    this.dataset = new Proxy(
      {},
      {
        set: (target, key, value) => {
          const attributeName = toDataAttributeName(key);
          const stringValue = String(value);
          target[key] = stringValue;
          this.attributes.set(attributeName, stringValue);
          return true;
        },
        get: (target, key) => target[key],
        deleteProperty: (target, key) => {
          const attributeName = toDataAttributeName(key);
          delete target[key];
          this.attributes.delete(attributeName);
          return true;
        },
      },
    );
    this.style = {};
    this.tabIndex = 0;
    this._classList = new ClassList(this);
  }

  _syncClassName() {
    this._className = Array.from(this._classSet).join(' ');
  }

  get className() {
    return this._className;
  }

  set className(value) {
    const classes = String(value ?? '')
      .split(/\s+/)
      .map((cls) => cls.trim())
      .filter(Boolean);
    this._classSet = new Set(classes);
    this._syncClassName();
  }

  get classList() {
    return this._classList;
  }

  get textContent() {
    return this._textContent ?? '';
  }

  set textContent(value) {
    this._textContent = String(value ?? '');
  }

  append(...nodes) {
    nodes.forEach((node) => {
      if (!node) {
        return;
      }
      if (typeof node === 'string') {
        return;
      }
      if (node.parentNode) {
        const index = node.parentNode.children.indexOf(node);
        if (index >= 0) {
          node.parentNode.children.splice(index, 1);
        }
      }
      node.parentNode = this;
      this.children.push(node);
    });
    return this;
  }

  replaceChildren(...nodes) {
    this.children.forEach((child) => {
      child.parentNode = null;
    });
    this.children = [];
    this.append(...nodes);
  }

  remove() {
    if (!this.parentNode) {
      return;
    }
    const index = this.parentNode.children.indexOf(this);
    if (index >= 0) {
      this.parentNode.children.splice(index, 1);
    }
    this.parentNode = null;
  }

  get isConnected() {
    if (!this.parentNode) {
      return false;
    }
    if (this.parentNode === this.ownerDocument) {
      return true;
    }
    return this.parentNode.isConnected ?? true;
  }

  addEventListener(type, handler) {
    const handlers = this.eventListeners.get(type);
    if (handlers) {
      handlers.push(handler);
    } else {
      this.eventListeners.set(type, [handler]);
    }
  }

  removeEventListener(type, handler) {
    const handlers = this.eventListeners.get(type);
    if (!handlers) {
      return;
    }
    const index = handlers.indexOf(handler);
    if (index >= 0) {
      handlers.splice(index, 1);
    }
  }

  dispatchEvent(event) {
    if (!event || !event.type) {
      throw new TypeError('Event object with type is required.');
    }

    if (event.target == null) {
      try {
        event.target = this;
      } catch {
        // Ignore read-only target assignments for native events.
      }
    }
    try {
      event.currentTarget = this;
    } catch {
      // Ignore read-only currentTarget assignments for native events.
    }
    if (event.bubbles === undefined) {
      event.bubbles = true;
    }

    const handlers = this.eventListeners.get(event.type);
    if (handlers?.length) {
      handlers.slice().forEach((handler) => {
        handler.call(this, event);
      });
    }

    if (!event.cancelBubble && event.bubbles && this.parentNode) {
      this.parentNode.dispatchEvent(event);
    }

    return !event.defaultPrevented;
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] ?? null;
  }

  querySelectorAll(selector) {
    const results = [];
    this.children.forEach((child) => {
      if (!(child instanceof TestElement)) {
        return;
      }
      child.#collectMatches(selector, results);
    });
    return results;
  }

  #collectMatches(selector, results) {
    if (this.matches(selector)) {
      results.push(this);
    }
    this.children.forEach((child) => {
      if (child instanceof TestElement) {
        child.#collectMatches(selector, results);
      }
    });
  }

  matches(selector) {
    const trimmed = selector.trim();
    if (!trimmed) {
      return false;
    }

    const attrMatch = trimmed.match(/\[([^=\]]+)(?:=["']?([^\]"']+)["']?)?\]/);
    let attrName = null;
    let attrValue = null;
    let baseSelector = trimmed;

    if (attrMatch) {
      attrName = attrMatch[1];
      attrValue = attrMatch[2] ?? null;
      baseSelector = baseSelector.replace(attrMatch[0], '').trim();
    }

    let tagName = '';
    const classNames = [];
    if (baseSelector.includes('.')) {
      const segments = baseSelector.split('.').filter(Boolean);
      tagName = segments.shift() ?? '';
      classNames.push(...segments);
    } else if (baseSelector.startsWith('.')) {
      classNames.push(baseSelector.slice(1));
    } else if (baseSelector) {
      tagName = baseSelector;
    }

    if (tagName) {
      if (this.tagName.toLowerCase() !== tagName.toLowerCase()) {
        return false;
      }
    }

    if (classNames.length) {
      const hasClasses = classNames.every((cls) => this.classList.contains(cls));
      if (!hasClasses) {
        return false;
      }
    }

    if (attrName) {
      const attributeValue = this.getAttribute(attrName);
      if (attrValue !== null) {
        return attributeValue === attrValue;
      }
      return attributeValue != null;
    }

    return true;
  }

  setAttribute(name, value) {
    const stringValue = value === null ? null : String(value);
    if (name === 'class') {
      this.className = stringValue ?? '';
      return;
    }
    if (name === 'id') {
      this.id = stringValue ?? '';
    }
    if (stringValue === null) {
      this.attributes.delete(name);
    } else {
      this.attributes.set(name, stringValue);
    }
  }

  getAttribute(name) {
    if (name === 'class') {
      return this.className;
    }
    if (name === 'id') {
      return this.id ?? '';
    }
    return this.attributes.get(name) ?? null;
  }

  removeAttribute(name) {
    if (name === 'class') {
      this.className = '';
      return;
    }
    if (name === 'id') {
      this.id = '';
      return;
    }
    this.attributes.delete(name);
  }

  focus() {
    if (this.ownerDocument) {
      this.ownerDocument.activeElement = this;
    }
  }

  blur() {
    if (this.ownerDocument?.activeElement === this) {
      this.ownerDocument.activeElement = null;
    }
  }

  getContext() {
    return {
      save() {},
      restore() {},
      setTransform() {},
      clearRect() {},
      fillRect() {},
      translate() {},
      scale() {},
      beginPath() {},
      moveTo() {},
      lineTo() {},
      closePath() {},
      fill() {},
      stroke() {},
      ellipse() {},
      arc() {},
      setLineDash() {},
    };
  }
}

class TestDocument {
  constructor() {
    this.body = new TestElement('body', this);
    this.body.parentNode = this;
    this.activeElement = null;
    this.eventListeners = new Map();
  }

  createElement(tagName) {
    const element = new TestElement(tagName, this);
    return element;
  }

  querySelector(selector) {
    return this.body.querySelector(selector);
  }

  querySelectorAll(selector) {
    return this.body.querySelectorAll(selector);
  }

  addEventListener(type, handler) {
    const handlers = this.eventListeners.get(type);
    if (handlers) {
      handlers.push(handler);
    } else {
      this.eventListeners.set(type, [handler]);
    }
  }

  removeEventListener(type, handler) {
    const handlers = this.eventListeners.get(type);
    if (!handlers) {
      return;
    }
    const index = handlers.indexOf(handler);
    if (index >= 0) {
      handlers.splice(index, 1);
    }
  }

  dispatchEvent(event) {
    if (!event || !event.type) {
      throw new TypeError('Event object with type is required.');
    }

    if (event.target == null) {
      try {
        event.target = this;
      } catch {
        // Ignore read-only target assignments for native events.
      }
    }
    try {
      event.currentTarget = this;
    } catch {
      // Ignore read-only currentTarget assignments for native events.
    }
    if (event.bubbles === undefined) {
      event.bubbles = true;
    }

    const handlers = this.eventListeners.get(event.type);
    if (handlers?.length) {
      handlers.slice().forEach((handler) => {
        handler.call(this, event);
      });
    }

    if (!event.cancelBubble && event.bubbles && this.defaultView) {
      this.defaultView.dispatchEvent(event.type, event);
    }

    return !event.defaultPrevented;
  }
}

const createWindowStub = () => {
  const listeners = new Map();
  return {
    devicePixelRatio: 1,
    addEventListener(type, handler) {
      const handlers = listeners.get(type);
      if (handlers) {
        handlers.push(handler);
      } else {
        listeners.set(type, [handler]);
      }
    },
    removeEventListener(type, handler) {
      const handlers = listeners.get(type);
      if (!handlers) {
        return;
      }
      const index = handlers.indexOf(handler);
      if (index >= 0) {
        handlers.splice(index, 1);
      }
    },
    dispatchEvent(type, event) {
      const handlers = listeners.get(type);
      if (!handlers) {
        return;
      }
      handlers.slice().forEach((handler) => {
        handler(event);
      });
    },
  };
};

const createKeyboardEvent = (key) => ({
  key,
  repeat: false,
  preventDefault() {
    this.defaultPrevented = true;
  },
});

const createBubblingKeyEvent = (key) => ({
  type: 'keydown',
  key,
  bubbles: true,
  preventDefault() {
    this.defaultPrevented = true;
  },
  stopPropagation() {
    this.cancelBubble = true;
  },
});

const createPlayerControllerStub = () => {
  let running = false;
  return {
    startCalls: 0,
    stopCalls: 0,
    start() {
      if (!running) {
        running = true;
        this.startCalls += 1;
      }
    },
    stop() {
      if (running) {
        running = false;
        this.stopCalls += 1;
      }
    },
  };
};

const createMapStub = () => ({
  followSmoothing: 0,
  setCameraTarget() {},
  setPlayerPosition() {},
  start() {},
  destroy() {},
});

const createTestEnvironment = () => {
  const document = new TestDocument();
  const window = createWindowStub();
  document.defaultView = window;
  window.document = document;
  return { document, window };
};

test('pressing E toggles the game menu and pauses player movement', () => {
  const { document, window } = createTestEnvironment();
  const root = document.createElement('div');
  document.body.append(root);

  const playerController = createPlayerControllerStub();
  const scene = new StartingAreaScene(root, {
    document,
    window,
    factories: {
      createMap: () => createMapStub(),
      createPlayerController: () => playerController,
    },
  });

  scene.mount();

  assert.equal(playerController.startCalls, 1, 'player controller should start on mount');
  assert.equal(scene.gameMenu.isVisible(), false);

  window.dispatchEvent('keydown', createKeyboardEvent('E'));

  assert.equal(scene.gameMenu.isVisible(), true, 'game menu should be visible after pressing E');
  assert.equal(
    playerController.stopCalls,
    1,
    'player controller should stop when the menu opens',
  );

  window.dispatchEvent('keydown', createKeyboardEvent('Escape'));

  assert.equal(scene.gameMenu.isVisible(), false, 'game menu should hide on escape');
  assert.equal(
    playerController.startCalls,
    2,
    'player controller should restart when the menu closes',
  );

  scene.unmount();
});

test('game menu arrow navigation moves focus between options', () => {
  const { document } = createTestEnvironment();
  const root = document.createElement('div');
  document.body.append(root);

  const gameState = GameState.getInstance();
  gameState.reset({ emit: false });

  const menu = new GameMenu(root, { gameState, document });

  menu.show();

  const labels = () => document.activeElement?.textContent;

  assert.equal(labels(), 'Status');

  let event = createBubblingKeyEvent('ArrowDown');
  event.target = document.activeElement;
  document.activeElement.dispatchEvent(event);
  assert.equal(labels(), 'Save');

  event = createBubblingKeyEvent('ArrowDown');
  event.target = document.activeElement;
  document.activeElement.dispatchEvent(event);
  assert.equal(labels(), 'Close');

  event = createBubblingKeyEvent('ArrowDown');
  event.target = document.activeElement;
  document.activeElement.dispatchEvent(event);
  assert.equal(labels(), 'Status');

  event = createBubblingKeyEvent('ArrowUp');
  event.target = document.activeElement;
  document.activeElement.dispatchEvent(event);
  assert.equal(labels(), 'Close');

  menu.destroy();
  root.remove();
  gameState.reset({ emit: false });
});
