import { TitleScreen } from './scenes/title-screen.js';

function bootstrap() {
  const root = document.getElementById('game-root');
  const titleScreen = new TitleScreen(root);
  titleScreen.mount();
}

document.addEventListener('DOMContentLoaded', bootstrap);
