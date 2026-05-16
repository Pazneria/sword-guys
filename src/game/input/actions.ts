import Phaser from 'phaser';
import { InputActionState } from '../types';

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
  if (!keyboard) throw new Error('Keyboard input is not available.');
  const code = Phaser.Input.Keyboard.KeyCodes;
  return {
    up: [keyboard.addKey(code.W), keyboard.addKey(code.UP)],
    down: [keyboard.addKey(code.S), keyboard.addKey(code.DOWN)],
    left: [keyboard.addKey(code.A), keyboard.addKey(code.LEFT)],
    right: [keyboard.addKey(code.D), keyboard.addKey(code.RIGHT)],
    confirm: [keyboard.addKey(code.E), keyboard.addKey(code.ENTER), keyboard.addKey(code.SPACE)],
    cancel: [keyboard.addKey(code.ESC), keyboard.addKey(code.BACKSPACE)],
    menu: [keyboard.addKey(code.M), keyboard.addKey(code.TAB)],
    map: [keyboard.addKey(code.N)],
    debug: [keyboard.addKey(code.F3)],
    playtestPower: [keyboard.addKey(code.F9)],
    playtestRoutes: [keyboard.addKey(code.F10)]
  };
};

export const readActions = (keys: ActionKeys): InputActionState => {
  const left = isDown(keys.left);
  const right = isDown(keys.right);
  const up = isDown(keys.up);
  const down = isDown(keys.down);
  return {
    moveX: (right ? 1 : 0) - (left ? 1 : 0),
    moveY: (down ? 1 : 0) - (up ? 1 : 0),
    confirmPressed: justDown(keys.confirm),
    cancelPressed: justDown(keys.cancel),
    menuPressed: justDown(keys.menu),
    mapPressed: justDown(keys.map),
    debugPressed: justDown(keys.debug),
    playtestPowerPressed: justDown(keys.playtestPower),
    playtestRoutesPressed: justDown(keys.playtestRoutes),
    upPressed: justDown(keys.up),
    downPressed: justDown(keys.down),
    leftPressed: justDown(keys.left),
    rightPressed: justDown(keys.right)
  };
};
