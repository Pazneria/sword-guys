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
