const DEFAULT_STATE = Object.freeze({
  scene: null,
  player: {
    position: null,
  },
  metadata: {},
});

const clone = (value) => {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value));
};

const mergeDeep = (target, source) => {
  const output = Array.isArray(target) ? [...target] : { ...target };

  if (!source || typeof source !== 'object') {
    return output;
  }

  Object.entries(source).forEach(([key, value]) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      output[key] = mergeDeep(output[key] ?? {}, value);
    } else {
      output[key] = value;
    }
  });

  return output;
};

export class GameState {
  static #state = clone(DEFAULT_STATE);

  static reset(overrides = {}) {
    GameState.#state = mergeDeep(clone(DEFAULT_STATE), overrides);
    return GameState.snapshot();
  }

  static hydrate(snapshot) {
    if (!snapshot || typeof snapshot !== 'object') {
      return GameState.reset();
    }

    GameState.#state = mergeDeep(clone(DEFAULT_STATE), snapshot);
    return GameState.snapshot();
  }

  static snapshot() {
    return clone(GameState.#state);
  }

  static setScene(sceneName) {
    GameState.#state.scene = sceneName ?? null;
  }

  static getScene() {
    return GameState.#state.scene;
  }

  static updatePlayerPosition(position) {
    if (!position || typeof position !== 'object') {
      return;
    }

    GameState.#state.player = GameState.#state.player ?? {};
    GameState.#state.player.position = {
      x: Number.isFinite(position.x) ? position.x : 0,
      y: Number.isFinite(position.y) ? position.y : 0,
    };
  }

  static getPlayerPosition() {
    const position = GameState.#state.player?.position ?? null;
    if (!position) {
      return null;
    }

    return { x: position.x, y: position.y };
  }
}
