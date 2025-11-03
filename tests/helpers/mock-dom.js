class MockEvent {
  constructor(type, options = {}) {
    this.type = type;
    this.detail = options.detail ?? null;
    this.defaultPrevented = false;
    this._propagationStopped = false;
    this.target = null;
    this.currentTarget = null;
  }

  stopPropagation() {
    this._propagationStopped = true;
  }

  preventDefault() {
    this.defaultPrevented = true;
  }
}

class MockClassList {
  constructor(element) {
    this.element = element;
    this.classes = new Set();
  }

  add(...tokens) {
    tokens.forEach((token) => {
      if (token) {
        this.classes.add(token);
      }
    });
    this.#sync();
  }

  remove(...tokens) {
    tokens.forEach((token) => {
      this.classes.delete(token);
    });
    this.#sync();
  }

  toggle(token, force) {
    if (force === true) {
      this.add(token);
      return true;
    }

    if (force === false) {
      this.remove(token);
      return false;
    }

    if (this.classes.has(token)) {
      this.classes.delete(token);
      this.#sync();
      return false;
    }

    this.classes.add(token);
    this.#sync();
    return true;
  }

  contains(token) {
    return this.classes.has(token);
  }

  toString() {
    return [...this.classes].join(' ');
  }

  #sync() {
    this.element._className = this.toString();
  }
}

class MockElement {
  constructor(tagName, ownerDocument) {
    this.tagName = String(tagName ?? '').toUpperCase();
    this.ownerDocument = ownerDocument;
    this.parentNode = null;
    this.children = [];
    this.dataset = Object.create(null);
    this.attributes = Object.create(null);
    this.eventListeners = new Map();
    this.classList = new MockClassList(this);
    this._className = '';
    this._textContent = '';
    this.style = {};
    this.disabled = false;
    this.type = '';
  }

  get className() {
    return this._className;
  }

  set className(value) {
    this._className = value ?? '';
    this.classList.classes = new Set(
      (this._className || '')
        .split(/\s+/)
        .map((part) => part.trim())
        .filter(Boolean),
    );
  }

  get textContent() {
    if (this.children.length === 0) {
      return this._textContent;
    }

    return (
      this._textContent +
      this.children
        .map((child) => (typeof child.textContent === 'string' ? child.textContent : ''))
        .join('')
    );
  }

  set textContent(value) {
    this._textContent = value ?? '';
    this.children.forEach((child) => {
      child.parentNode = null;
    });
    this.children = [];
  }

  appendChild(child) {
    if (!child) {
      return child;
    }

    if (child.parentNode && typeof child.parentNode.removeChild === 'function') {
      child.parentNode.removeChild(child);
    }

    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  replaceChildren(...nodes) {
    this.children.forEach((child) => {
      child.parentNode = null;
    });
    this.children = [];
    nodes.forEach((node) => {
      if (node) {
        this.appendChild(node);
      }
    });
  }

  removeChild(child) {
    const index = this.children.indexOf(child);
    if (index >= 0) {
      this.children.splice(index, 1);
      child.parentNode = null;
    }
    return child;
  }

  remove() {
    if (this.parentNode && typeof this.parentNode.removeChild === 'function') {
      this.parentNode.removeChild(this);
    }
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }

  getAttribute(name) {
    return Object.prototype.hasOwnProperty.call(this.attributes, name)
      ? this.attributes[name]
      : null;
  }

  addEventListener(type, listener) {
    if (typeof listener !== 'function') {
      return;
    }

    const listeners = this.eventListeners.get(type);
    if (listeners) {
      listeners.push(listener);
    } else {
      this.eventListeners.set(type, [listener]);
    }
  }

  removeEventListener(type, listener) {
    const listeners = this.eventListeners.get(type);
    if (!listeners) {
      return;
    }

    const index = listeners.indexOf(listener);
    if (index >= 0) {
      listeners.splice(index, 1);
    }
  }

  dispatchEvent(event) {
    if (!event || typeof event.type !== 'string') {
      return true;
    }

    if (!event.target) {
      event.target = this;
    }

    event.currentTarget = this;

    const listeners = this.eventListeners.get(event.type) ?? [];
    for (const listener of [...listeners]) {
      listener.call(this, event);
      if (event._propagationStopped) {
        return !event.defaultPrevented;
      }
    }

    if (this.parentNode && typeof this.parentNode.dispatchEvent === 'function') {
      return this.parentNode.dispatchEvent(event);
    }

    return !event.defaultPrevented;
  }
}

class MockDocument {
  constructor() {
    this.body = new MockElement('body', this);
  }

  createElement(tagName) {
    return new MockElement(tagName, this);
  }

  createTextNode(text) {
    const node = new MockElement('#text', this);
    node.textContent = text;
    return node;
  }
}

export const createMockDocument = () => {
  const document = new MockDocument();
  const root = document.createElement('div');
  document.body.appendChild(root);
  return { document, root };
};

export { MockEvent };

