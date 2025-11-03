import { GameState } from '../../entities/game-state.js';

const DEFAULT_OPTIONS = Object.freeze({
  onSelect: null,
  document: typeof document !== 'undefined' ? document : null,
});

const CLASS_NAMES = Object.freeze({
  ROOT: 'skills-panel',
  SECTIONS: 'skills-panel__sections',
  SECTION: 'skills-panel__section',
  SECTION_TITLE: 'skills-panel__section-title',
  LIST: 'skills-panel__list',
  ITEM: 'skills-panel__item',
  ITEM_SELECTED: 'skills-panel__item--selected',
  ITEM_DETAILS: 'skills-panel__item-details',
  ITEM_NAME: 'skills-panel__item-name',
  ITEM_META: 'skills-panel__item-meta',
  LEARN_BUTTON: 'skills-panel__learn-button',
});

export class SkillsPanel {
  constructor(gameState, options = {}) {
    if (!(gameState instanceof GameState)) {
      throw new TypeError('A GameState instance must be provided to SkillsPanel.');
    }

    const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

    if (!mergedOptions.document || typeof mergedOptions.document.createElement !== 'function') {
      throw new TypeError('SkillsPanel requires a document with a createElement function.');
    }

    this.gameState = gameState;
    this.document = mergedOptions.document;
    this.onSelect = typeof mergedOptions.onSelect === 'function' ? mergedOptions.onSelect : null;

    this.container = null;
    this.availableList = null;
    this.learnedList = null;
    this.selectedSkillId = null;
    this.skillItems = new Map();
  }

  mount(root) {
    if (!this.container) {
      this.container = this.#createContainer();
      this.#renderLists();
    }

    if (root) {
      if (typeof root.appendChild === 'function') {
        root.appendChild(this.container);
      } else if (Array.isArray(root.children)) {
        root.children.push(this.container);
      }
    }

    this.gameState.addEventListener('skillschange', this.#handleSkillsChange);
    return this.container;
  }

  destroy() {
    this.gameState.removeEventListener('skillschange', this.#handleSkillsChange);

    if (this.container) {
      if (typeof this.container.remove === 'function') {
        this.container.remove();
      } else if (this.container.parentNode && typeof this.container.parentNode.removeChild === 'function') {
        this.container.parentNode.removeChild(this.container);
      }
    }

    this.container = null;
    this.availableList = null;
    this.learnedList = null;
    this.skillItems.clear();
    this.selectedSkillId = null;
  }

  getSelectedSkillId() {
    return this.selectedSkillId;
  }

  getSkillElements(skillId) {
    return this.skillItems.get(skillId) ?? null;
  }

  selectSkill(skillId) {
    if (skillId && !this.skillItems.has(skillId)) {
      return false;
    }

    const previous = this.selectedSkillId;
    this.selectedSkillId = skillId ?? null;
    this.#updateSelectionStyles();

    if (this.selectedSkillId && this.selectedSkillId !== previous) {
      const skill = this.gameState.getSkill(this.selectedSkillId);
      this.onSelect?.(skill, { selectedSkillId: this.selectedSkillId });
    }

    if (!this.selectedSkillId && previous) {
      this.onSelect?.(null, { selectedSkillId: null });
    }

    return true;
  }

  #handleSkillsChange = (event) => {
    this.#renderLists();

    if (this.selectedSkillId && !this.skillItems.has(this.selectedSkillId)) {
      this.selectedSkillId = null;
    }

    this.#updateSelectionStyles();
  };

  #createContainer() {
    const container = this.document.createElement('div');
    container.classList.add(CLASS_NAMES.ROOT);

    const title = this.document.createElement('h2');
    title.textContent = 'Skills';
    container.appendChild(title);

    const sectionsWrapper = this.document.createElement('div');
    sectionsWrapper.classList.add(CLASS_NAMES.SECTIONS);
    container.appendChild(sectionsWrapper);

    const availableSection = this.#createSection('Available Skills');
    const learnedSection = this.#createSection('Learned Skills');

    this.availableList = availableSection.list;
    this.learnedList = learnedSection.list;

    sectionsWrapper.appendChild(availableSection.section);
    sectionsWrapper.appendChild(learnedSection.section);

    return container;
  }

  #createSection(titleText) {
    const section = this.document.createElement('section');
    section.classList.add(CLASS_NAMES.SECTION);

    const title = this.document.createElement('h3');
    title.classList.add(CLASS_NAMES.SECTION_TITLE);
    title.textContent = titleText;
    section.appendChild(title);

    const list = this.document.createElement('ul');
    list.classList.add(CLASS_NAMES.LIST);
    section.appendChild(list);

    return { section, list };
  }

  #renderLists() {
    if (!this.availableList || !this.learnedList) {
      return;
    }

    this.skillItems = new Map();

    const availableItems = this.#buildAvailableItems();
    const learnedItems = this.#buildLearnedItems();

    this.availableList.replaceChildren(...availableItems);
    this.learnedList.replaceChildren(...learnedItems);
  }

  #buildAvailableItems() {
    const items = [];
    this.gameState.getAvailableSkills().forEach((skillId) => {
      const skill = this.gameState.getSkill(skillId);
      if (!skill) {
        return;
      }

      const item = this.document.createElement('li');
      item.classList.add(CLASS_NAMES.ITEM);
      item.dataset.skillId = skill.id;

      const details = this.#createSkillDetails(skill);
      item.appendChild(details);

      const learnButton = this.document.createElement('button');
      learnButton.type = 'button';
      learnButton.classList.add(CLASS_NAMES.LEARN_BUTTON);
      learnButton.textContent = `Learn (${skill.cost})`;
      learnButton.disabled = !this.gameState.canLearnSkill(skill.id);
      learnButton.addEventListener('click', (event) => {
        event?.stopPropagation?.();
        this.#attemptLearn(skill.id);
      });

      item.addEventListener('click', () => {
        this.selectSkill(skill.id);
      });

      item.appendChild(learnButton);

      items.push(item);
      this.skillItems.set(skill.id, {
        element: item,
        learnButton,
        section: 'available',
      });
    });

    if (items.length === 0) {
      const empty = this.document.createElement('li');
      empty.classList.add(CLASS_NAMES.ITEM);
      empty.textContent = 'No skills available';
      items.push(empty);
    }

    return items;
  }

  #buildLearnedItems() {
    const items = [];

    this.gameState.getLearnedSkills().forEach((skillId) => {
      const skill = this.gameState.getSkill(skillId);
      if (!skill) {
        return;
      }

      const item = this.document.createElement('li');
      item.classList.add(CLASS_NAMES.ITEM);
      item.dataset.skillId = skill.id;

      const details = this.#createSkillDetails(skill);
      item.appendChild(details);

      item.addEventListener('click', () => {
        this.selectSkill(skill.id);
      });

      items.push(item);
      this.skillItems.set(skill.id, {
        element: item,
        learnButton: null,
        section: 'learned',
      });
    });

    if (items.length === 0) {
      const empty = this.document.createElement('li');
      empty.classList.add(CLASS_NAMES.ITEM);
      empty.textContent = 'No skills learned yet';
      items.push(empty);
    }

    return items;
  }

  #createSkillDetails(skill) {
    const wrapper = this.document.createElement('div');
    wrapper.classList.add(CLASS_NAMES.ITEM_DETAILS);

    const name = this.document.createElement('div');
    name.classList.add(CLASS_NAMES.ITEM_NAME);
    name.textContent = skill.name;
    wrapper.appendChild(name);

    const meta = this.document.createElement('div');
    meta.classList.add(CLASS_NAMES.ITEM_META);
    const prerequisites = skill.prerequisites?.length
      ? `Requires: ${skill.prerequisites.join(', ')}`
      : 'Requires: none';
    meta.textContent = `${skill.description} • ${prerequisites}`;
    wrapper.appendChild(meta);

    return wrapper;
  }

  #attemptLearn(skillId) {
    const learned = this.gameState.learnSkill(skillId);
    if (learned) {
      this.selectSkill(skillId);
    }
  }

  #updateSelectionStyles() {
    this.skillItems.forEach((entry, skillId) => {
      if (!entry?.element?.classList) {
        return;
      }

      const isSelected = this.selectedSkillId === skillId;
      if (isSelected) {
        entry.element.classList.add(CLASS_NAMES.ITEM_SELECTED);
      } else {
        entry.element.classList.remove(CLASS_NAMES.ITEM_SELECTED);
      }
    });
  }
}

