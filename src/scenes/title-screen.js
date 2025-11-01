export class TitleScreen {
  constructor(root, { onNew, onContinue, onLoad } = {}) {
    this.root = root;
    this.onNew = onNew;
    this.onContinue = onContinue;
    this.onLoad = onLoad;
    this.container = null;
  }

  mount() {
    this.container = this.#createView();
    this.root.replaceChildren(this.container);
  }

  unmount() {
    if (this.container?.isConnected) {
      this.container.remove();
    }

    this.container = null;
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

    const menu = document.createElement('div');
    menu.className = 'title-screen__menu';

    menu.append(
      this.#createButton('New Game', this.onNew),
      this.#createDisabledButton('Continue'),
      this.#createDisabledButton('Load Game'),
    );

    container.append(image, menu);
    return container;
  }

  #createButton(label, handler) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'title-screen__button';
    button.textContent = label;

    if (typeof handler === 'function') {
      button.addEventListener('click', handler);
    }

    return button;
  }

  #createDisabledButton(label) {
    const button = this.#createButton(label, null);
    button.disabled = true;
    button.title = 'Coming soon';
    return button;
  }
}
