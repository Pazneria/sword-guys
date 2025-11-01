export class TitleScreen {
  constructor(
    root,
    { onContinue = undefined, onNew = undefined, onLoad = undefined } = {}
  ) {
    this.root = root;
    this.handlers = { onContinue, onNew, onLoad };
    this.focusIndex = 0;
    this.buttons = [];
    this.#boundHandleKeyDown = this.#handleKeyDown.bind(this);
  }

  mount() {
    this.view = this.#createView();
    this.root.replaceChildren(this.view);
    window.addEventListener('keydown', this.#boundHandleKeyDown);
    this.#updateFocus(0);
  }

  unmount() {
    window.removeEventListener('keydown', this.#boundHandleKeyDown);
    this.buttons = [];

    if (this.view && this.view.isConnected) {
      this.view.remove();
    }

    this.view = undefined;
  }

  #createView() {
    const container = document.createElement('div');
    container.className = 'title-screen';

    const image = document.createElement('img');
    image.className = 'title-screen__image';
    image.src = 'assets/images/sword-guys-title.png';
    image.alt = 'Sword Guys title screen';
    container.append(image);

    const menu = document.createElement('ul');
    menu.className = 'title-screen__menu';

    const options = [
      { label: 'Continue', handler: this.handlers.onContinue },
      { label: 'New', handler: this.handlers.onNew },
      { label: 'Load', handler: this.handlers.onLoad },
    ];

    this.buttons = [];
    options.forEach((option, index) => {
      const item = document.createElement('li');
      item.className = 'title-screen__menu-item';

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'title-screen__menu-option';
      button.textContent = option.label;
      button.dataset.index = String(index);

      button.addEventListener('pointerenter', () => {
        this.#updateFocus(index);
      });

      button.addEventListener('pointerdown', () => {
        this.#updateFocus(index);
      });

      button.addEventListener('click', () => {
        this.#activateOption(index);
      });

      item.append(button);
      menu.append(item);
      this.buttons.push({ button, handler: option.handler });
    });

    container.append(menu);

    return container;
  }

  #handleKeyDown(event) {
    if (!this.buttons.length) {
      return;
    }

    switch (event.key) {
      case 'ArrowUp':
      case 'Up':
        event.preventDefault();
        this.#updateFocus((this.focusIndex - 1 + this.buttons.length) % this.buttons.length);
        break;
      case 'ArrowDown':
      case 'Down':
        event.preventDefault();
        this.#updateFocus((this.focusIndex + 1) % this.buttons.length);
        break;
      case 'Enter':
      case ' ': 
      case 'Spacebar': {
        event.preventDefault();
        const targetIndex = this.focusIndex;
        this.#activateOption(targetIndex);
        break;
      }
      default:
        break;
    }
  }

  #updateFocus(index) {
    if (this.buttons[this.focusIndex] && this.focusIndex !== index) {
      this.buttons[this.focusIndex].button.classList.remove('title-screen__menu-option--active');
    }

    this.focusIndex = index;

    if (this.buttons[this.focusIndex]) {
      this.buttons[this.focusIndex].button.classList.add('title-screen__menu-option--active');
      this.buttons[this.focusIndex].button.focus({ preventScroll: true });
    }
  }

  #activateOption(index) {
    const entry = this.buttons[index];
    if (!entry) {
      return;
    }

    const { handler, button } = entry;
    button.classList.add('title-screen__menu-option--pressed');
    if (typeof handler === 'function') {
      handler();
    }

    window.requestAnimationFrame(() => {
      button.classList.remove('title-screen__menu-option--pressed');
    });
  }
}
