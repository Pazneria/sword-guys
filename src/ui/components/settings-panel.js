import { GameState } from '../../core/game-state.js';

const clone = (value) => {
  if (typeof globalThis.structuredClone === 'function') {
    return globalThis.structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value));
};

const formatVolume = (value) => `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%`;

const normalizeKeyTokens = (value) => {
  if (Array.isArray(value)) {
    return value.map((token) => String(token).trim()).filter((token) => token.length > 0);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((token) => token.trim())
      .filter((token) => token.length > 0);
  }

  return [];
};

export class SettingsPanel {
  constructor(root, { settings, onPreview, onSubmit, onCancel } = {}) {
    this.root = root ?? null;
    const baseSettings = settings && typeof settings === 'object' ? settings : GameState.DEFAULT_SETTINGS;
    this.initialSettings = clone(baseSettings);
    this.draft = clone(baseSettings);
    this.callbacks = {
      onPreview: typeof onPreview === 'function' ? onPreview : null,
      onSubmit: typeof onSubmit === 'function' ? onSubmit : null,
      onCancel: typeof onCancel === 'function' ? onCancel : null,
    };

    this.container = null;
    this.form = null;
    this.confirmButton = null;
    this.validationErrors = new Set();
    this.audioDisplays = new Map();
    this.movementInputs = new Map();

    this.#handleFormSubmit = this.#handleFormSubmit.bind(this);
    this.#handleCancelClick = this.#handleCancelClick.bind(this);
    this.#handleContainerKeyDown = this.#handleContainerKeyDown.bind(this);
  }

  mount() {
    if (!this.root || typeof document === 'undefined') {
      return;
    }

    if (this.container) {
      return;
    }

    this.container = document.createElement('section');
    this.container.className = 'settings-panel';
    this.container.setAttribute('role', 'dialog');
    this.container.setAttribute('aria-modal', 'true');
    this.container.setAttribute('aria-label', 'Game settings');
    this.container.tabIndex = -1;
    this.container.addEventListener('keydown', this.#handleContainerKeyDown);

    const heading = document.createElement('header');
    heading.className = 'settings-panel__header';

    const title = document.createElement('h2');
    title.className = 'settings-panel__title';
    title.textContent = 'Settings';
    heading.append(title);

    const subtitle = document.createElement('p');
    subtitle.className = 'settings-panel__subtitle';
    subtitle.textContent = 'Adjust gameplay, audio, and accessibility options.';
    heading.append(subtitle);

    this.container.append(heading);

    this.form = document.createElement('form');
    this.form.className = 'settings-panel__form';
    this.form.addEventListener('submit', this.#handleFormSubmit);

    this.container.append(this.form);

    this.#buildAudioSection();
    this.#buildMovementSection();
    this.#buildAccessibilitySection();
    this.#buildActions();

    this.root.append(this.container);
    this.container.focus({ preventScroll: true });
    this.#updateFormValidity();
    this.#triggerPreview();
  }

  unmount() {
    if (!this.container) {
      return;
    }

    this.container.removeEventListener('keydown', this.#handleContainerKeyDown);

    if (this.form) {
      this.form.removeEventListener('submit', this.#handleFormSubmit);
      this.form = null;
    }

    if (this.container.isConnected) {
      this.container.remove();
    }

    this.container = null;
    this.confirmButton = null;
    this.audioDisplays.clear();
    this.movementInputs.clear();
  }

  destroy() {
    this.unmount();
  }

  #buildAudioSection() {
    if (!this.form) {
      return;
    }

    const fieldset = document.createElement('fieldset');
    fieldset.className = 'settings-panel__fieldset settings-panel__fieldset--audio';

    const legend = document.createElement('legend');
    legend.textContent = 'Audio';
    fieldset.append(legend);

    this.#createVolumeControl(fieldset, {
      label: 'Master volume',
      key: 'masterVolume',
    });

    this.#createVolumeControl(fieldset, {
      label: 'Music volume',
      key: 'musicVolume',
    });

    this.#createVolumeControl(fieldset, {
      label: 'Sound effects volume',
      key: 'sfxVolume',
    });

    const muteWrapper = document.createElement('label');
    muteWrapper.className = 'settings-panel__toggle';
    muteWrapper.textContent = 'Mute all audio';

    const muteInput = document.createElement('input');
    muteInput.type = 'checkbox';
    muteInput.checked = Boolean(this.draft.audio?.muteAll);
    muteInput.addEventListener('change', () => {
      this.draft.audio.muteAll = Boolean(muteInput.checked);
      this.#triggerPreview();
    });

    muteWrapper.prepend(muteInput);
    fieldset.append(muteWrapper);

    this.form.append(fieldset);
  }

  #createVolumeControl(fieldset, { label, key }) {
    const value = Number(this.draft.audio?.[key] ?? 1);

    const wrapper = document.createElement('div');
    wrapper.className = 'settings-panel__slider';

    const labelElement = document.createElement('label');
    labelElement.textContent = label;
    labelElement.htmlFor = `settings-panel-audio-${key}`;
    wrapper.append(labelElement);

    const input = document.createElement('input');
    input.type = 'range';
    input.min = '0';
    input.max = '100';
    input.step = '5';
    input.value = String(Math.round(Math.min(1, Math.max(0, value)) * 100));
    input.id = labelElement.htmlFor;
    input.addEventListener('input', () => {
      const numeric = Math.min(1, Math.max(0, Number(input.value) / 100));
      this.draft.audio[key] = numeric;
      this.#updateAudioDisplay(key, numeric);
      this.#triggerPreview();
    });
    wrapper.append(input);

    const display = document.createElement('span');
    display.className = 'settings-panel__slider-value';
    display.textContent = formatVolume(value);
    wrapper.append(display);

    this.audioDisplays.set(key, display);

    fieldset.append(wrapper);
  }

  #buildMovementSection() {
    if (!this.form) {
      return;
    }

    const movement = this.draft.keybindings?.movement ?? {};

    const fieldset = document.createElement('fieldset');
    fieldset.className = 'settings-panel__fieldset settings-panel__fieldset--movement';

    const legend = document.createElement('legend');
    legend.textContent = 'Movement controls';
    fieldset.append(legend);

    const directions = [
      ['up', 'Move up'],
      ['down', 'Move down'],
      ['left', 'Move left'],
      ['right', 'Move right'],
      ['upRight', 'Move up-right'],
      ['upLeft', 'Move up-left'],
      ['downRight', 'Move down-right'],
      ['downLeft', 'Move down-left'],
    ];

    directions.forEach(([direction, label]) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'settings-panel__binding';

      const labelElement = document.createElement('label');
      labelElement.className = 'settings-panel__binding-label';
      labelElement.textContent = label;
      labelElement.htmlFor = `settings-panel-binding-${direction}`;
      wrapper.append(labelElement);

      const input = document.createElement('input');
      input.type = 'text';
      input.id = labelElement.htmlFor;
      input.className = 'settings-panel__binding-input';
      input.autocomplete = 'off';
      input.spellcheck = false;
      input.value = (movement[direction] ?? []).join(', ');
      input.dataset.direction = direction;
      input.addEventListener('change', () => {
        this.#updateMovementBinding(direction, input);
      });
      input.addEventListener('blur', () => {
        this.#updateMovementBinding(direction, input);
      });
      input.addEventListener('keydown', (event) => {
        if (event.key === 'Tab') {
          return;
        }

        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          this.#handleCancelClick();
          return;
        }

        if (event.key === 'Backspace' || event.key === 'Delete') {
          event.preventDefault();
          input.value = '';
          this.#updateMovementBinding(direction, input);
          return;
        }

        if (
          event.key === 'Shift' ||
          event.key === 'Control' ||
          event.key === 'Alt' ||
          event.key === 'Meta'
        ) {
          return;
        }

        event.preventDefault();
        const keyName = event.key === ' ' ? 'Space' : event.key;
        input.value = keyName;
        this.#updateMovementBinding(direction, input);
      });

      wrapper.append(input);
      this.movementInputs.set(direction, input);
      fieldset.append(wrapper);
    });

    this.form.append(fieldset);
  }

  #buildAccessibilitySection() {
    if (!this.form) {
      return;
    }

    const accessibility = this.draft.accessibility ?? {};

    const fieldset = document.createElement('fieldset');
    fieldset.className = 'settings-panel__fieldset settings-panel__fieldset--accessibility';

    const legend = document.createElement('legend');
    legend.textContent = 'Accessibility';
    fieldset.append(legend);

    const toggles = [
      ['subtitles', 'Enable subtitles'],
      ['highContrast', 'High contrast visuals'],
      ['reduceMotion', 'Reduce camera motion'],
      ['screenShake', 'Screen shake effects'],
    ];

    toggles.forEach(([key, label]) => {
      const wrapper = document.createElement('label');
      wrapper.className = 'settings-panel__toggle';
      wrapper.textContent = label;

      const input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = Boolean(accessibility[key]);
      input.addEventListener('change', () => {
        this.draft.accessibility[key] = Boolean(input.checked);
        this.#triggerPreview();
      });

      wrapper.prepend(input);
      fieldset.append(wrapper);
    });

    this.form.append(fieldset);
  }

  #buildActions() {
    if (!this.form) {
      return;
    }

    const actions = document.createElement('div');
    actions.className = 'settings-panel__actions';

    this.confirmButton = document.createElement('button');
    this.confirmButton.type = 'submit';
    this.confirmButton.className = 'settings-panel__button settings-panel__button--primary';
    this.confirmButton.textContent = 'Save';
    actions.append(this.confirmButton);

    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.className = 'settings-panel__button';
    cancelButton.textContent = 'Cancel';
    cancelButton.addEventListener('click', this.#handleCancelClick);
    actions.append(cancelButton);

    this.form.append(actions);
  }

  #updateMovementBinding(direction, input) {
    if (!input) {
      return;
    }

    const tokens = normalizeKeyTokens(input.value);
    if (!tokens.length) {
      this.validationErrors.add(direction);
      input.setAttribute('aria-invalid', 'true');
      input.classList.add('settings-panel__binding-input--invalid');
      input.title = 'Enter at least one key for this direction.';
      this.#updateFormValidity();
      return;
    }

    this.validationErrors.delete(direction);
    input.removeAttribute('aria-invalid');
    input.classList.remove('settings-panel__binding-input--invalid');
    input.removeAttribute('title');

    if (!this.draft.keybindings) {
      this.draft.keybindings = {};
    }
    if (!this.draft.keybindings.movement) {
      this.draft.keybindings.movement = {};
    }
    this.draft.keybindings.movement[direction] = tokens;
    this.#updateFormValidity();
    this.#triggerPreview();
  }

  #updateAudioDisplay(key, value) {
    const display = this.audioDisplays.get(key);
    if (display) {
      display.textContent = formatVolume(value);
    }
  }

  #triggerPreview() {
    if (this.validationErrors.size > 0) {
      return;
    }

    this.callbacks.onPreview?.(clone(this.draft));
  }

  #handleFormSubmit(event) {
    event.preventDefault();
    if (this.validationErrors.size > 0) {
      return;
    }

    this.callbacks.onSubmit?.(clone(this.draft));
  }

  #handleCancelClick(event) {
    if (event) {
      event.preventDefault();
    }

    this.callbacks.onCancel?.();
  }

  #handleContainerKeyDown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.#handleCancelClick();
    }
  }

  #updateFormValidity() {
    if (!this.confirmButton) {
      return;
    }

    this.confirmButton.disabled = this.validationErrors.size > 0;
  }
}
