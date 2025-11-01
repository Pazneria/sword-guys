import { STARTING_AREA_CONFIG } from '../config/starting-area.js';

export class StartingAreaScene {
  constructor(root, { config = STARTING_AREA_CONFIG, onExit } = {}) {
    this.root = root;
    this.config = config;
    this.onExit = onExit;
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

  getSpawnPoint() {
    return this.config.spawn;
  }

  #createView() {
    const container = document.createElement('div');
    container.className = 'starting-area';

    const heading = document.createElement('h2');
    heading.className = 'starting-area__title';
    heading.textContent = 'Starting Area';

    const grid = this.#createGrid();
    const controls = this.#createControls();

    container.append(heading, grid, controls);
    return container;
  }

  #createGrid() {
    const { layout, tiles } = this.config;
    const grid = document.createElement('div');
    grid.className = 'starting-area__grid';
    grid.style.setProperty('--starting-area-rows', layout.length);
    grid.style.setProperty('--starting-area-columns', layout[0]?.length ?? 0);

    layout.forEach((row, y) => {
      row.forEach((tile, x) => {
        const tileElement = document.createElement('div');
        tileElement.className = `starting-area__tile starting-area__tile--${tile}`;
        tileElement.dataset.x = String(x);
        tileElement.dataset.y = String(y);

        if (tile === tiles.SPAWN) {
          tileElement.appendChild(this.#createSpawnMarker());
        }

        grid.appendChild(tileElement);
      });
    });

    return grid;
  }

  #createControls() {
    const controls = document.createElement('div');
    controls.className = 'starting-area__controls';

    if (typeof this.onExit === 'function') {
      const exitButton = document.createElement('button');
      exitButton.type = 'button';
      exitButton.className = 'starting-area__button';
      exitButton.textContent = 'Return to Title';
      exitButton.addEventListener('click', () => {
        this.onExit();
      });
      controls.appendChild(exitButton);
    }

    return controls;
  }

  #createSpawnMarker() {
    const marker = document.createElement('div');
    marker.className = 'starting-area__spawn';
    marker.textContent = 'Player spawn';
    return marker;
  }
}
