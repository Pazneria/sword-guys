import Phaser from 'phaser';
import { getGameEngine } from '../game/simulation/engine';
import { touchActions } from '../game/input/touch';
import { getUIManager } from './dom';
import { loadSavedGameSafely, SAVE_SLOT_KEY } from '../game/saveValidation';

// Resume a valid existing slot without replacing its original bytes.
export const resumeSavedGameOnBoot = () => {
  let saved: string | null = null;
  try { saved = localStorage.getItem(SAVE_SLOT_KEY); } catch { /* In-memory play still works. */ }
  const engine = getGameEngine();
  if (saved !== null) {
    try {
      const message = loadSavedGameSafely(engine);
      if (message !== 'Loaded saved game.') engine.setMessage(message, 5000);
    } catch { /* Storage may be unavailable. */ }
  }
};

export const installSessionControls = (game: Phaser.Game, resetTouch: () => void) => {
  const root = document.createElement('div');
  root.id = 'session-controls';
  root.innerHTML = '<button type="button" class="pause-button" data-session-action="pause">Pause</button><div class="session-modal" hidden></div>';
  document.body.append(root);
  const modal = root.querySelector<HTMLElement>('.session-modal')!;
  const uiRoot = document.getElementById('ui-root')!;
  let pausedScenes: string[] = [];
  let state: 'playing' | 'paused' | 'restart' | 'exit' = 'playing';
  const reset = () => {
    resetTouch(); touchActions.reset();
    getUIManager().clearPendingActions();
    game.scene.getScenes(false).forEach((scene) => scene.input.keyboard?.resetKeys());
  };
  const render = () => {
    document.documentElement.classList.toggle('session-open', state !== 'playing');
    uiRoot.inert = state !== 'playing';
    modal.hidden = state === 'playing';
    const choice = (action: string, label: string) => `<button type="button" data-session-action="${action}">${label}</button>`;
    if (state === 'playing') return;
    const title = state === 'exit' ? 'Sword Guys' : state === 'restart' ? 'Restart checkpoint?' : 'Paused';
    const text = state === 'exit' ? 'Game stopped. Your current journey stays here until you close this page. Save from the menu before leaving to keep recent progress.'
      : state === 'restart' ? 'Return to the last checkpoint. Progress since that checkpoint will be lost. Your saved slot stays intact.'
      : 'The game and battle animations are paused.';
    const buttons = state === 'exit' ? choice('resume', 'Return to game')
      : state === 'restart' ? choice('confirm-restart', 'Restart checkpoint') + choice('pause', 'Cancel')
      : choice('resume', 'Resume') + choice('restart', 'Restart checkpoint…') + choice('exit', 'Exit game');
    modal.innerHTML = `<section role="dialog" aria-modal="true" aria-label="${title}" class="session-panel"><h1>${title}</h1><p>${text}</p>${buttons}</section>`;
    modal.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
  };
  const pause = () => {
    if (state === 'playing') {
      pausedScenes = game.scene.getScenes(true).map((scene) => scene.sys.settings.key);
      pausedScenes.forEach((key) => game.scene.pause(key));
    }
    state = 'paused'; reset(); render();
  };
  const resume = () => {
    reset();
    pausedScenes.forEach((key) => game.scene.resume(key));
    pausedScenes = []; state = 'playing'; render();
  };
  root.addEventListener('click', (event) => {
    const action = (event.target as Element).closest<HTMLElement>('[data-session-action]')?.dataset.sessionAction;
    if (action === 'pause') pause();
    if (action === 'resume') resume();
    if (action === 'restart') { state = 'restart'; render(); }
    if (action === 'exit') { state = 'exit'; reset(); render(); }
    if (action === 'confirm-restart') {
      reset();
      getGameEngine().restoreCheckpoint();
      getUIManager().close();
      pausedScenes.forEach((key) => game.scene.stop(key));
      pausedScenes = []; state = 'playing'; render();
      game.scene.start('WorldScene');
    }
  });
  const onKey = (event: KeyboardEvent) => {
    if (event.code === 'KeyP' && !event.repeat) {
      event.preventDefault(); state === 'playing' ? pause() : resume();
    } else if (state !== 'playing' && event.code === 'Escape') {
      event.preventDefault(); event.stopImmediatePropagation();
      state === 'restart' ? pause() : resume();
    }
  };
  const onBlur = () => { if (state === 'playing') pause(); };
  const onVisibility = () => { if (document.hidden) onBlur(); };
  window.addEventListener('keydown', onKey, true);
  window.addEventListener('blur', onBlur);
  document.addEventListener('visibilitychange', onVisibility);
  const resize = () => {
    reset();
    const viewport = document.getElementById('game-root')!;
    game.scale.resize(viewport.clientWidth, viewport.clientHeight);
  };
  window.visualViewport?.addEventListener('resize', resize);
  game.events.once(Phaser.Core.Events.DESTROY, () => {
    root.remove(); window.removeEventListener('keydown', onKey, true);
    window.removeEventListener('blur', onBlur); document.removeEventListener('visibilitychange', onVisibility);
    window.visualViewport?.removeEventListener('resize', resize);
  });
};
