import { SceneManager } from './core/scene-manager.js';
import { StartingAreaScene } from './scenes/starting-area.js';
import { TitleScreen } from './scenes/title-screen.js';

function bootstrap() {
  const root = document.getElementById('game-root');
  const scenes = new SceneManager();

  const showTitleScreen = () => {
    const titleScreen = new TitleScreen(root, {
      onNew: () => {
        const startingArea = new StartingAreaScene(root, {
          onExit: showTitleScreen,
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

document.addEventListener('DOMContentLoaded', bootstrap);
