export class TitleScreen {
  constructor(root) {
    this.root = root;
  }

  mount() {
    this.root.replaceChildren(this.#createView());
  }

  #createView() {
    const wrapper = document.createElement('div');
    wrapper.className = 'title-screen scene';

    const image = document.createElement('img');
    image.className = 'title-screen__image';
    image.src = 'assets/images/sword-guys-title.png';
    image.alt = 'Sword Guys title screen';

    wrapper.append(image);

    return wrapper;
  }
}
