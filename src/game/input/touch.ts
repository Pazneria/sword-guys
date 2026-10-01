import type { InputActionState } from '../types';

type Direction = 'up' | 'down' | 'left' | 'right';
type TouchAction = Direction | 'confirm' | 'cancel' | 'menu' | 'map';

// Pointer ownership keeps releasing one finger from releasing another finger's input.
export class TouchActionSource {
  private pointers = new Map<number, TouchAction[]>();
  private pressed = new Set<TouchAction>();

  hold(pointerId: number, actions: TouchAction[]) {
    const before = this.held();
    this.pointers.set(pointerId, actions);
    for (const action of actions) if (!before.has(action)) this.pressed.add(action);
  }

  release(pointerId: number) {
    this.pointers.delete(pointerId);
  }

  cancel(pointerId: number) {
    const actions = this.pointers.get(pointerId) ?? [];
    this.release(pointerId);
    const remaining = this.held();
    for (const action of actions) if (!remaining.has(action)) this.pressed.delete(action);
  }

  reset() {
    this.pointers.clear();
    this.pressed.clear();
  }

  private held() {
    return new Set([...this.pointers.values()].flat());
  }

  read(): Pick<InputActionState, 'moveX' | 'moveY' | 'confirmPressed' | 'cancelPressed' | 'menuPressed' | 'mapPressed' | 'upPressed' | 'downPressed' | 'leftPressed' | 'rightPressed'> {
    const held = this.held();
    const result = {
      moveX: Number(held.has('right')) - Number(held.has('left')),
      moveY: Number(held.has('down')) - Number(held.has('up')),
      confirmPressed: this.pressed.has('confirm'), cancelPressed: this.pressed.has('cancel'),
      menuPressed: this.pressed.has('menu'), mapPressed: this.pressed.has('map'),
      upPressed: this.pressed.has('up'), downPressed: this.pressed.has('down'),
      leftPressed: this.pressed.has('left'), rightPressed: this.pressed.has('right')
    };
    this.pressed.clear();
    return result;
  }
}

export const touchActions = new TouchActionSource();

export const installTouchControls = () => {
  const root = document.createElement('nav');
  root.id = 'touch-controls';
  root.setAttribute('aria-label', 'Touch game controls');
  const button = (label: string, action: string, ariaLabel = label) =>
    `<button type="button" data-touch-action="${action}" aria-label="${ariaLabel}">${label}</button>`;
  root.innerHTML = `
    <div class="touch-toolbar">${button('Menu', 'menu')}${button('Map', 'map')}</div>
    <div class="touch-dpad" aria-label="Movement and selection">
      ${button('↖', 'up left', 'Move northwest')}${button('▲', 'up', 'Move up')}${button('↗', 'up right', 'Move northeast')}
      ${button('◀', 'left', 'Move left')}<span aria-hidden="true">Move</span>${button('▶', 'right', 'Move right')}
      ${button('↙', 'down left', 'Move southwest')}${button('▼', 'down', 'Move down')}${button('↘', 'down right', 'Move southeast')}
    </div>
    <div class="touch-actions">${button('OK', 'confirm', 'Interact or confirm')}${button('Back', 'cancel', 'Cancel or go back')}</div>`;
  document.body.append(root);
  const coarse = window.matchMedia('(any-pointer: coarse)');
  const updateVisibility = () => {
    document.documentElement.classList.toggle('has-touch-controls', coarse.matches || navigator.maxTouchPoints > 0);
    touchActions.reset();
  };
  updateVisibility();
  const owners = new Map<number, HTMLElement>();
  const parse = (element: HTMLElement) => element.dataset.touchAction!.split(' ') as TouchAction[];
  const paint = () => {
    root.querySelectorAll<HTMLElement>('button').forEach((element) => {
      element.classList.toggle('held', [...owners.values()].includes(element));
    });
  };
  const reset = () => { owners.clear(); touchActions.reset(); paint(); };
  root.addEventListener('pointerdown', (event) => {
    const target = (event.target as Element).closest<HTMLElement>('[data-touch-action]');
    if (!target || document.documentElement.classList.contains('session-open')) return;
    event.preventDefault();
    target.setPointerCapture(event.pointerId);
    owners.set(event.pointerId, target);
    touchActions.hold(event.pointerId, parse(target));
    paint();
  });
  root.addEventListener('pointermove', (event) => {
    const owner = owners.get(event.pointerId);
    if (!owner?.closest('.touch-dpad')) return;
    event.preventDefault();
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('.touch-dpad [data-touch-action]');
    const actions = target ? parse(target) : [];
    touchActions.hold(event.pointerId, actions);
    if (target) owners.set(event.pointerId, target);
    paint();
  });
  const release = (event: PointerEvent) => {
    touchActions.release(event.pointerId);
    owners.delete(event.pointerId);
    paint();
  };
  root.addEventListener('pointerup', release);
  root.addEventListener('pointercancel', (event) => {
    touchActions.cancel(event.pointerId);
    owners.delete(event.pointerId);
    paint();
  });
  root.addEventListener('lostpointercapture', release);
  window.addEventListener('blur', reset);
  window.addEventListener('pagehide', reset);
  window.addEventListener('resize', reset);
  document.addEventListener('visibilitychange', reset);
  coarse.addEventListener('change', updateVisibility);
  return { reset, destroy: () => {
    reset(); root.remove();
    window.removeEventListener('blur', reset); window.removeEventListener('pagehide', reset);
    window.removeEventListener('resize', reset); document.removeEventListener('visibilitychange', reset);
    coarse.removeEventListener('change', updateVisibility);
  } };
};
