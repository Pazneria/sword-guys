import { SettingsPanel } from './settings-panel.js';

const clone = (value) => {
  if (typeof globalThis.structuredClone === 'function') {
    return globalThis.structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value));
};

export class GameMenu {
  constructor(root, { gameState, playerController, onExit } = {}) {
    this.root = root ?? null;
    this.gameState = gameState ?? null;
    this.playerController = playerController ?? null;
    this.onExit = typeof onExit === 'function' ? onExit : null;

    this.container = null;
    this.settingsHost = null;
    this.settingsPanel = null;
    this.resumeButton = null;
    this.settingsButton = null;
    this.exitButton = null;

    this.isOpen = false;
    this.previewBaseline = null;
    this.activePreview = null;

    this.#handleWindowKeyDown = this.#handleWindowKeyDown.bind(this);
    this.#handleContainerKeyDown = this.#handleContainerKeyDown.bind(this);
  }

  mount() {
    if (!this.root || typeof document === 'undefined') {
      return;
    }

    if (this.container) {
      return;
    }

    this.container = document.createElement('div');
    this.container.className = 'game-menu';
    this.container.setAttribute('hidden', '');
    this.container.tabIndex = -1;
    this.container.addEventListener('keydown', this.#handleContainerKeyDown);

    const backdrop = document.createElement('div');
    backdrop.className = 'game-menu__backdrop';
    this.container.append(backdrop);

    const content = document.createElement('div');
    content.className = 'game-menu__content';

    const nav = document.createElement('nav');
    nav.className = 'game-menu__actions';

    this.resumeButton = this.#createMenuButton('Resume', () => {
      this.close();
    });
    nav.append(this.resumeButton);

    this.settingsButton = this.#createMenuButton('Settings', () => {
      this.open();
      this.#showSettingsPanel();
    });
    if (!this.gameState) {
      this.settingsButton.disabled = true;
      this.settingsButton.title = 'Settings unavailable';
    }
    nav.append(this.settingsButton);

    this.exitButton = this.#createMenuButton('Exit to title', () => {
      this.close();
      this.onExit?.();
    });
    nav.append(this.exitButton);

    content.append(nav);

    this.settingsHost = document.createElement('div');
    this.settingsHost.className = 'game-menu__settings-host';
    content.append(this.settingsHost);

    this.container.append(content);
    this.root.append(this.container);

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this.#handleWindowKeyDown);
    }
  }

  destroy() {
    this.close();
    this.#teardownSettingsPanel();

    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.#handleWindowKeyDown);
    }

    if (this.container) {
      this.container.removeEventListener('keydown', this.#handleContainerKeyDown);
      if (this.container.isConnected) {
        this.container.remove();
      }
    }

    this.container = null;
    this.settingsHost = null;
    this.resumeButton = null;
    this.settingsButton = null;
    this.exitButton = null;
  }

  open() {
    if (!this.container) {
      return;
    }

    this.container.removeAttribute('hidden');
    this.container.classList.add('game-menu--open');
    this.isOpen = true;
    (this.settingsPanel ? this.settingsPanel.container : this.resumeButton)?.focus?.({
      preventScroll: true,
    });
  }

  close() {
    if (!this.container) {
      return;
    }

    this.container.setAttribute('hidden', '');
    this.container.classList.remove('game-menu--open');
    this.isOpen = false;

    if (this.settingsPanel) {
      this.#handleSettingsCancel();
    }
  }

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  #createMenuButton(label, handler) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'game-menu__button';
    button.textContent = label;
    button.addEventListener('click', handler);
    return button;
  }

  #handleWindowKeyDown(event) {
    if (event.key === 'Escape') {
      if (this.isOpen) {
        this.close();
      } else {
        this.open();
      }
    }
  }

  #handleContainerKeyDown(event) {
    if (event.key === 'Escape') {
      if (this.settingsPanel) {
        event.preventDefault();
        this.#handleSettingsCancel();
      } else {
        this.close();
      }
    }
  }

  #showSettingsPanel() {
    if (!this.gameState || !this.settingsHost || this.settingsPanel) {
      return;
    }

    this.previewBaseline = this.gameState.getSettings();
    this.settingsPanel = new SettingsPanel(this.settingsHost, {
      settings: this.previewBaseline,
      onPreview: (draft) => {
        const preview = this.gameState?.previewSettings?.(draft) ?? clone(draft);
        this.#applyPreview(preview);
      },
      onSubmit: async (draft) => {
        await this.gameState.updateSettings(draft);
        const applied = this.gameState.getSettings();
        this.#applyPreview(applied);
        this.#teardownSettingsPanel();
        this.close();
      },
      onCancel: () => {
        if (this.previewBaseline) {
          this.#applyPreview(this.previewBaseline);
        }
        this.#teardownSettingsPanel();
        this.close();
      },
    });

    this.settingsPanel.mount();
  }

  #applyPreview(settings) {
    if (!settings) {
      return;
    }

    this.activePreview = settings;

    const movement = settings?.keybindings?.movement;
    if (movement && this.playerController?.setKeyBindings) {
      this.playerController.setKeyBindings(movement);
    }
  }

  #handleSettingsCancel() {
    if (this.previewBaseline) {
      this.#applyPreview(this.previewBaseline);
    }

    this.#teardownSettingsPanel();
  }

  #teardownSettingsPanel() {
    if (this.settingsPanel) {
      this.settingsPanel.destroy();
      this.settingsPanel = null;
    }

    this.previewBaseline = null;
    this.activePreview = null;
  }
}
