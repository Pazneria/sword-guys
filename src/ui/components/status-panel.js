import { GameState } from '../../core/game-state.js';

const ensureDocument = (doc) => {
  if (doc) {
    return doc;
  }

  if (typeof document !== 'undefined') {
    return document;
  }

  throw new Error('A document-like object is required to render the status panel.');
};

export class StatusPanel {
  constructor({ gameState, document: doc, onClose } = {}) {
    if (!(gameState instanceof GameState)) {
      throw new TypeError('StatusPanel requires a GameState instance.');
    }

    this.gameState = gameState;
    this.document = ensureDocument(doc);
    this.onClose = typeof onClose === 'function' ? onClose : null;

    this.root = null;
    this.sections = null;
    this.unsubscribe = null;
  }

  mount() {
    if (this.root) {
      return this.root;
    }

    this.root = this.#createView();
    this.sections = this.#querySections(this.root);
    this.unsubscribe = this.gameState.onChange((snapshot) => this.#render(snapshot));
    this.#render(this.gameState.getSnapshot());
    return this.root;
  }

  unmount() {
    if (typeof this.unsubscribe === 'function') {
      this.unsubscribe();
      this.unsubscribe = null;
    }

    if (this.root?.isConnected) {
      this.root.remove();
    }

    this.root = null;
    this.sections = null;
  }

  getElement() {
    if (!this.root) {
      return this.mount();
    }

    return this.root;
  }

  #createView() {
    const container = this.document.createElement('div');
    container.className = 'status-panel';

    const header = this.document.createElement('header');
    header.className = 'status-panel__header';

    const title = this.document.createElement('h2');
    title.className = 'status-panel__title';
    title.textContent = 'Status';

    header.append(title);

    if (this.onClose) {
      const closeButton = this.document.createElement('button');
      closeButton.type = 'button';
      closeButton.className = 'status-panel__close';
      closeButton.textContent = 'Back';
      closeButton.addEventListener('click', () => {
        this.onClose?.();
      });
      header.append(closeButton);
    }

    container.append(header);

    const summarySection = this.document.createElement('section');
    summarySection.className = 'status-panel__section status-panel__section--summary';

    const summaryList = this.document.createElement('dl');
    summaryList.className = 'status-panel__list';

    summaryList.append(
      ...this.#createDefinition('Level', 'level'),
      ...this.#createDefinition('Experience', 'experience'),
      ...this.#createDefinition('HP', 'hp'),
      ...this.#createDefinition('MP', 'mp'),
    );

    summarySection.append(summaryList);
    container.append(summarySection);

    const attributesSection = this.document.createElement('section');
    attributesSection.className = 'status-panel__section status-panel__section--attributes';

    const attributesHeading = this.document.createElement('h3');
    attributesHeading.className = 'status-panel__section-title';
    attributesHeading.textContent = 'Attributes';

    const attributesList = this.document.createElement('dl');
    attributesList.className = 'status-panel__list status-panel__list--grid';
    attributesList.dataset.section = 'attributes';

    attributesSection.append(attributesHeading, attributesList);
    container.append(attributesSection);

    const conditionsSection = this.document.createElement('section');
    conditionsSection.className = 'status-panel__section status-panel__section--conditions';

    const conditionsHeading = this.document.createElement('h3');
    conditionsHeading.className = 'status-panel__section-title';
    conditionsHeading.textContent = 'Condition Effects';

    const conditionsList = this.document.createElement('ul');
    conditionsList.className = 'status-panel__conditions';
    conditionsList.dataset.section = 'conditions';

    conditionsSection.append(conditionsHeading, conditionsList);
    container.append(conditionsSection);

    return container;
  }

  #querySections(root) {
    const attributesList = root.querySelector('[data-section="attributes"]');
    const conditionsList = root.querySelector('[data-section="conditions"]');

    const map = new Map();

    root.querySelectorAll('[data-field]').forEach((element) => {
      map.set(element.dataset.field, element);
    });

    return {
      fieldMap: map,
      attributesList,
      conditionsList,
    };
  }

  #createDefinition(label, fieldName) {
    const term = this.document.createElement('dt');
    term.className = 'status-panel__term';
    term.textContent = label;

    const description = this.document.createElement('dd');
    description.className = 'status-panel__description';
    description.dataset.field = fieldName;

    return [term, description];
  }

  #render(snapshot) {
    if (!snapshot || !this.sections) {
      return;
    }

    const { fieldMap, attributesList, conditionsList } = this.sections;

    const levelField = fieldMap.get('level');
    if (levelField) {
      levelField.textContent = `${snapshot.level}`;
    }

    const experienceField = fieldMap.get('experience');
    if (experienceField) {
      experienceField.textContent = `${snapshot.experience.current} / ${snapshot.experience.nextLevel}`;
    }

    const hpField = fieldMap.get('hp');
    if (hpField) {
      hpField.textContent = `${snapshot.hp.current} / ${snapshot.hp.max}`;
    }

    const mpField = fieldMap.get('mp');
    if (mpField) {
      mpField.textContent = `${snapshot.mp.current} / ${snapshot.mp.max}`;
    }

    if (attributesList) {
      attributesList.replaceChildren();
      Object.entries(snapshot.attributes).forEach(([key, value]) => {
        const name = key.replace(/([A-Z])/g, ' $1');

        const term = this.document.createElement('dt');
        term.className = 'status-panel__term';
        term.textContent = this.#capitalize(name);

        const description = this.document.createElement('dd');
        description.className = 'status-panel__description';
        description.textContent = `${value}`;

        attributesList.append(term, description);
      });
    }

    if (conditionsList) {
      conditionsList.replaceChildren();
      const conditions = snapshot.conditions?.length ? snapshot.conditions : ['None'];

      conditions.forEach((condition) => {
        const item = this.document.createElement('li');
        item.className = 'status-panel__condition';
        item.textContent = condition;
        conditionsList.append(item);
      });
    }
  }

  #capitalize(value) {
    if (!value) {
      return '';
    }

    return value
      .toLowerCase()
      .replace(/(^|\s)([a-z])/g, (match, prefix, letter) => `${prefix}${letter.toUpperCase()}`)
      .replace(/\s+/g, ' ')
      .trim();
  }
}
