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

    const normalized = this.#normalizeSnapshot(snapshot);
    const { fieldMap, attributesList, conditionsList } = this.sections;

    const levelField = fieldMap.get('level');
    if (levelField) {
      levelField.textContent = `${normalized.level}`;
    }

    const experienceField = fieldMap.get('experience');
    if (experienceField) {
      const { current, nextLevel } = normalized.experience;
      const experienceText = Number.isFinite(nextLevel) && nextLevel > 0 ? `${current} / ${nextLevel}` : `${current}`;
      experienceField.textContent = experienceText;
    }

    const hpField = fieldMap.get('hp');
    if (hpField) {
      hpField.textContent = `${normalized.hp.current} / ${normalized.hp.max}`;
    }

    const mpField = fieldMap.get('mp');
    if (mpField) {
      mpField.textContent = `${normalized.mp.current} / ${normalized.mp.max}`;
    }

    if (attributesList) {
      attributesList.replaceChildren();
      const entries = Object.entries(normalized.attributes);

      if (entries.length === 0) {
        const description = this.document.createElement('dd');
        description.className = 'status-panel__description status-panel__description--empty';
        description.textContent = 'None';
        attributesList.append(description);
      } else {
        entries.forEach(([key, value]) => {
          const term = this.document.createElement('dt');
          term.className = 'status-panel__term';
          term.textContent = this.#formatLabel(key);

          const description = this.document.createElement('dd');
          description.className = 'status-panel__description';
          description.textContent = `${value}`;

          attributesList.append(term, description);
        });
      }
    }

    if (conditionsList) {
      conditionsList.replaceChildren();
      const conditions = normalized.conditions.length ? normalized.conditions : ['None'];

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

  #formatLabel(value) {
    if (!value) {
      return '';
    }

    const spaced = `${value}`
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/[_-]+/g, ' ');

    return this.#capitalize(spaced);
  }

  #normalizeSnapshot(snapshot) {
    const defaultSnapshot = {
      level: 1,
      experience: { current: 0, nextLevel: null },
      hp: { current: 0, max: 0 },
      mp: { current: 0, max: 0 },
      attributes: {},
      conditions: [],
    };

    if (!snapshot) {
      return defaultSnapshot;
    }

    const player = snapshot.player ?? snapshot;
    const stats = player.stats ?? snapshot.stats ?? {};

    const toNumber = (value, fallback = 0) => {
      if (Number.isFinite(value)) {
        return value;
      }

      const numeric = typeof value === 'string' && value.trim().length > 0 ? Number(value) : NaN;
      return Number.isFinite(numeric) ? numeric : fallback;
    };

    const level = toNumber(stats.level, defaultSnapshot.level);

    let experienceCurrent = 0;
    let experienceNextLevel = null;
    const experienceValue = stats.experience;
    if (experienceValue && typeof experienceValue === 'object') {
      experienceCurrent = toNumber(experienceValue.current, 0);
      const maybeNext = toNumber(experienceValue.nextLevel, NaN);
      experienceNextLevel = Number.isFinite(maybeNext) ? maybeNext : null;
    } else {
      experienceCurrent = toNumber(experienceValue, 0);
    }

    const hpCurrent = toNumber(stats.health ?? stats.hp?.current, 0);
    const hpMax = toNumber(stats.maxHealth ?? stats.hp?.max, hpCurrent);

    const mpCurrent = toNumber(stats.mana ?? stats.mp?.current, 0);
    const mpMax = toNumber(stats.maxMana ?? stats.mp?.max, mpCurrent);

    const attributeSource =
      player.attributes && typeof player.attributes === 'object'
        ? player.attributes
        : null;

    const attributes = attributeSource
      ? Object.fromEntries(
          Object.entries(attributeSource).filter(([, value]) => value != null),
        )
      : Object.fromEntries(
          Object.entries(stats).filter(([key, value]) => {
            if (['health', 'maxHealth', 'mana', 'maxMana', 'level', 'experience'].includes(key)) {
              return false;
            }

            if (value == null) {
              return false;
            }

            return typeof value !== 'object';
          }),
        );

    const conditions = Array.isArray(player.conditions)
      ? player.conditions
          .map((condition) => (condition == null ? null : `${condition}`.trim()))
          .filter((condition) => condition && condition.length > 0)
      : [];

    return {
      level,
      experience: { current: experienceCurrent, nextLevel: experienceNextLevel },
      hp: { current: hpCurrent, max: hpMax },
      mp: { current: mpCurrent, max: mpMax },
      attributes,
      conditions,
    };
  }
}
