import Phaser from 'phaser';
import { InputActionState } from '../types';
import { touchActions } from './touch';

export interface ActionKeys {
  up: Phaser.Input.Keyboard.Key[];
  down: Phaser.Input.Keyboard.Key[];
  left: Phaser.Input.Keyboard.Key[];
  right: Phaser.Input.Keyboard.Key[];
  confirm: Phaser.Input.Keyboard.Key[];
  cancel: Phaser.Input.Keyboard.Key[];
  menu: Phaser.Input.Keyboard.Key[];
  map: Phaser.Input.Keyboard.Key[];
  debug: Phaser.Input.Keyboard.Key[];
  playtestPower: Phaser.Input.Keyboard.Key[];
  playtestRoutes: Phaser.Input.Keyboard.Key[];
}

const isDown = (keys: Phaser.Input.Keyboard.Key[]) => keys.some((key) => key.isDown);
const justDown = (keys: Phaser.Input.Keyboard.Key[]) => keys.some((key) => Phaser.Input.Keyboard.JustDown(key));

export const createActionKeys = (scene: Phaser.Scene): ActionKeys => {
  const keyboard = scene.input.keyboard;
  const code = Phaser.Input.Keyboard.KeyCodes;
  const add = (...codes: number[]) => keyboard ? codes.map((value) => keyboard.addKey(value)) : [];
  touchActions.reset();
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => touchActions.reset());
  return {
    up: add(code.W, code.UP), down: add(code.S, code.DOWN),
    left: add(code.A, code.LEFT), right: add(code.D, code.RIGHT),
    confirm: add(code.E, code.ENTER, code.SPACE), cancel: add(code.ESC, code.BACKSPACE),
    menu: add(code.M, code.TAB), map: add(code.N), debug: add(code.F3),
    playtestPower: add(code.F9), playtestRoutes: add(code.F10)
  };
};

export const readActions = (keys: ActionKeys): InputActionState => {
  const touch = touchActions.read();
  const left = isDown(keys.left) || touch.moveX < 0;
  const right = isDown(keys.right) || touch.moveX > 0;
  const up = isDown(keys.up) || touch.moveY < 0;
  const down = isDown(keys.down) || touch.moveY > 0;
  return {
    moveX: (right ? 1 : 0) - (left ? 1 : 0),
    moveY: (down ? 1 : 0) - (up ? 1 : 0),
    confirmPressed: justDown(keys.confirm) || touch.confirmPressed,
    cancelPressed: justDown(keys.cancel) || touch.cancelPressed,
    menuPressed: justDown(keys.menu) || touch.menuPressed,
    mapPressed: justDown(keys.map) || touch.mapPressed,
    debugPressed: justDown(keys.debug),
    playtestPowerPressed: justDown(keys.playtestPower),
    playtestRoutesPressed: justDown(keys.playtestRoutes),
    upPressed: justDown(keys.up) || touch.upPressed,
    downPressed: justDown(keys.down) || touch.downPressed,
    leftPressed: justDown(keys.left) || touch.leftPressed,
    rightPressed: justDown(keys.right) || touch.rightPressed
  };
};
