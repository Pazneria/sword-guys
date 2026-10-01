import { describe, expect, it } from 'vitest';
import { TouchActionSource } from '../src/game/input/touch';

describe('touch action ownership', () => {
  it('moves diagonally while another finger confirms, then releases each independently', () => {
    const source = new TouchActionSource();
    source.hold(1, ['up', 'right']);
    source.hold(2, ['confirm']);
    expect(source.read()).toMatchObject({ moveX: 1, moveY: -1, confirmPressed: true });
    source.release(2);
    expect(source.read()).toMatchObject({ moveX: 1, moveY: -1, confirmPressed: false });
    source.release(1);
    expect(source.read()).toMatchObject({ moveX: 0, moveY: 0 });
  });

  it('keeps a shared direction held when one owner releases and emits one press per hold', () => {
    const source = new TouchActionSource();
    source.hold(1, ['left']);
    expect(source.read().leftPressed).toBe(true);
    source.hold(2, ['left']);
    source.release(1);
    expect(source.read()).toMatchObject({ moveX: -1, leftPressed: false });
    source.release(2);
    source.hold(3, ['left']);
    expect(source.read().leftPressed).toBe(true);
  });

  it('clears both held and pending input on cancellation and lifecycle changes', () => {
    const source = new TouchActionSource();
    source.hold(1, ['down']); source.hold(2, ['menu']);
    source.reset();
    expect(source.read()).toMatchObject({ moveX: 0, moveY: 0, downPressed: false, menuPressed: false });
  });
  it('cancels a pending press without releasing another finger', () => {
    const source = new TouchActionSource();
    source.hold(1, ['up']); source.hold(2, ['confirm']);
    source.cancel(2);
    expect(source.read()).toMatchObject({ moveY: -1, upPressed: true, confirmPressed: false });
  });
});
