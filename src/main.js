import { SceneManager } from './core/scene-manager.js';
import { GameState } from './core/game-state.js';
import { StartingAreaScene } from './scenes/starting-area.js';
import { TitleScreen } from './scenes/title-screen.js';

async function bootstrap() {
  const root = document.getElementById('game-root');
  const scenes = new SceneManager();
  const gameState = new GameState();

  await gameState.initialize();

  const showTitleScreen = () => {
    const titleScreen = new TitleScreen(root, {
      onNew: () => {
        const startingArea = new StartingAreaScene(root, {
          onExit: showTitleScreen,
          gameState,
        });
        scenes.show(startingArea);
      },
      onContinue: () => {
        // Continue support will be implemented once save data is available.
      },
      onLoad: () => {
        // Load support will be implemented once save data is available.
      },
    });

    scenes.show(titleScreen);
  };

  showTitleScreen();
}

document.addEventListener('DOMContentLoaded', () => {
  bootstrap().catch((error) => {
    console.error('Failed to bootstrap Sword Guys', error);
  });
});
