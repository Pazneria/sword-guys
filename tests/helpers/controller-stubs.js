export const createWindowStub = () => {
  const listeners = new Map();

  return {
    addEventListener(type, handler) {
      const existing = listeners.get(type);
      if (existing) {
        existing.push(handler);
      } else {
        listeners.set(type, [handler]);
      }
    },
    removeEventListener(type, handler) {
      const existing = listeners.get(type);
      if (!existing) {
        return;
      }

      const index = existing.indexOf(handler);
      if (index >= 0) {
        existing.splice(index, 1);
      }
    },
    dispatchEvent(type, event) {
      const handlers = listeners.get(type);
      if (!handlers) {
        return;
      }

      handlers.slice().forEach((handler) => handler(event));
    },
  };
};

export const createTickerStub = () => ({
  request: () => 1,
  cancel: () => {},
});

export const createKeyboardEvent = (key, overrides = {}) => ({
  key,
  repeat: false,
  preventDefault() {},
  ...overrides,
});
