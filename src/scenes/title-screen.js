export class TitleScreen {
  constructor(root) {
    this.root = root;
  }

  mount() {
    this.root.replaceChildren(this.#createView());
  }

  #createView() {
    const container = document.createElement('section');
    container.className = 'title-screen';

    const scene = document.createElement('div');
    scene.className = 'title-screen__scene';

    const shadow = document.createElement('div');
    shadow.className = 'title-screen__scene-shadow';

    const knight = document.createElement('div');
    knight.className = 'title-screen__knight';

    const sword = document.createElement('div');
    sword.className = 'title-screen__sword';

    scene.append(shadow, knight, sword);

    const content = document.createElement('div');
    content.className = 'title-screen__content';

    const logo = document.createElement('h1');
    logo.className = 'title-screen__logo';
    logo.textContent = 'Sword Guys';

    const subtitle = document.createElement('p');
    subtitle.className = 'title-screen__subtitle';
    subtitle.textContent = 'An Epic Pixel RPG Adventure';

    const cta = document.createElement('p');
    cta.className = 'title-screen__cta';
    cta.textContent = 'Insert Coin';

    const footer = document.createElement('p');
    footer.className = 'title-screen__footer';
    footer.textContent = '© 2024 Sword Guys Studio';

    content.append(logo, subtitle, cta, footer);

    container.append(scene, content);

    return container;
  }
}
