export class SceneManager {
  constructor() {
    this.activeScene = null;
  }

  show(scene) {
    if (this.activeScene && typeof this.activeScene.unmount === 'function') {
      this.activeScene.unmount();
    }

    this.activeScene = scene ?? null;

    if (this.activeScene && typeof this.activeScene.mount === 'function') {
      this.activeScene.mount();
    }
  }
}
