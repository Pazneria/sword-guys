import { GameState } from './core/game-state.js';
import { SaveManager } from './core/save-manager.js';
import { SceneManager } from './core/scene-manager.js';
import { RPGScene } from './scenes/rpg-scene.js';
import { TitleScreen } from './scenes/title-screen.js';

async function bootstrap() {
  const root = document.getElementById('game-root');
  const scenes = new SceneManager();
  const saveManager = new SaveManager();

  const startRPG = () => {
    const gameState = GameState.getInstance();
    const rpgScene = new RPGScene(root, {
      gameState,
      saveManager,
      startMapId: 'overworld'
    });
    scenes.show(rpgScene);
  };

  const showTitleScreen = () => {
    GameState.setScene('title-screen');

    const titleScreen = new TitleScreen(root, {
      saveManager,
      onNew: () => {
        GameState.reset();
        startRPG();
      },
      onContinue: (slot) => {
        if (!slot?.slotId) {
          return;
        }

        const snapshot = slot.data ?? saveManager.load(slot.slotId);
        if (snapshot) {
          GameState.hydrate(snapshot);
          startRPG();
        }
      },
      onLoad: (slots) => {
        const target = Array.isArray(slots) && slots.length ? slots[0] : null;
        if (!target?.slotId) {
          return;
        }

        const snapshot = target.data ?? saveManager.load(target.slotId);
        if (snapshot) {
          GameState.hydrate(snapshot);
          startRPG();
        }
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
