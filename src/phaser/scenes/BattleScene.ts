import Phaser from 'phaser';
import { versionedPublicAssetUrl } from '../../game/assets/publicPath';
import { spellEffectRuntimeSpecForId } from '../../game/assets/runtime';
import { createActionKeys, readActions, ActionKeys } from '../../game/input/actions';
import { getGameEngine } from '../../game/simulation/engine';
import { BattleVisualEvent } from '../../game/types';
import { getUIManager, UIManager } from '../../ui/dom';
import { loadApprovedImageGenAssets } from '../assetLoader';
import { ensureGameTextures } from '../textures';

const PLAYER_IDLE_ASSET_VERSION = 'idle-facing-20260508-2';
const PLAYER_BATTLE_IDLE_FRAME = 6;

export class BattleScene extends Phaser.Scene {
  private keys!: ActionKeys;
  private engine = getGameEngine();
  private ui!: UIManager;
  private enemySprites = new Map<string, Phaser.GameObjects.Image>();
  private enemyBasePositions = new Map<string, { x: number; y: number }>();
  private backdrop?: Phaser.GameObjects.Image;
  private floorShade?: Phaser.GameObjects.Rectangle;
  private playerSprite?: Phaser.GameObjects.Sprite;
  private playerBasePosition = { x: 0, y: 0 };
  private battleVisualQueue: BattleVisualEvent[] = [];
  private battleAnimating = false;
  private returningToWorld = false;
  private readonly handleResize = () => this.layoutBattle();

  constructor() {
    super('BattleScene');
  }

  preload() {
    loadApprovedImageGenAssets(this, ['battleBackdrop', 'enemySprite', 'spellEffect']);
    if (!this.textures.exists('player:overworld:idle')) {
      this.load.spritesheet('player:overworld:idle', versionedPublicAssetUrl('public/assets/characters/player/player-overworld-idle.png', PLAYER_IDLE_ASSET_VERSION), {
        frameWidth: 64,
        frameHeight: 64
      });
    }
  }

  create() {
    this.returningToWorld = false;
    ensureGameTextures(this);
    this.keys = createActionKeys(this);
    this.ui = getUIManager();
    const battle = this.engine.startPendingBattle();
    this.ui.openBattle();
    this.cameras.main.fadeIn(160, 0, 0, 0);
    if (!battle) {
      this.scene.start('WorldScene');
      return;
    }
    this.backdrop = this.add.image(this.scale.width / 2, this.scale.height / 2, `backdrop:${battle.backdrop}`).setDepth(-10);
    this.floorShade = this.add.rectangle(this.scale.width / 2, this.scale.height * 0.62, this.scale.width, this.scale.height * 0.34, 0x111820, 0.52).setDepth(-5);
    this.playerSprite = this.add
      .sprite(this.scale.width * 0.22, this.scale.height * 0.58, 'player:overworld:idle', PLAYER_BATTLE_IDLE_FRAME)
      .setOrigin(0.5, 1)
      .setDepth(5);
    battle.enemies.forEach((enemy, index) => {
      const x = this.scale.width * (0.58 + index * 0.13);
      const y = this.scale.height * 0.46 + (index % 2) * 34;
      this.enemySprites.set(enemy.id, this.add.image(x, y, `enemy:${enemy.id}`).setDepth(5));
    });
    this.scale.on('resize', this.handleResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', this.handleResize));
    this.layoutBattle();
  }

  update() {
    if (this.returningToWorld) return;
    if (this.battleAnimating) {
      this.ui.sync(this.engine);
      return;
    }
    const actions = readActions(this.keys);
    if (import.meta.env.DEV && actions.playtestPowerPressed) this.engine.grantPlaytestPower();
    if (import.meta.env.DEV && actions.playtestRoutesPressed) this.engine.grantPlaytestPower({ unlockRoutes: true });
    const result = this.ui.handleBattleActions(actions, this.engine);
    this.queueBattleVisuals(this.engine.consumeBattleVisualEvents());
    this.ui.sync(this.engine);
    if (result === 'world') {
      this.returningToWorld = true;
      this.cameras.main.fadeOut(150, 0, 0, 0);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start('WorldScene'));
    }
  }

  private layoutBattle() {
    const width = Math.max(1, this.scale.width);
    const height = Math.max(1, this.scale.height);
    const fit = Math.max(0.72, Math.min(1.18, Math.min(width / 1100, height / 700)));
    this.backdrop?.setPosition(width / 2, height / 2).setDisplaySize(width, height);
    this.floorShade?.setPosition(width / 2, height * 0.62).setSize(width, height * 0.34);
    this.playerBasePosition = { x: width * 0.22, y: height * 0.6 };
    this.playerSprite?.setScale(1.7 * fit);
    if (!this.battleAnimating) this.playerSprite?.setPosition(this.playerBasePosition.x, this.playerBasePosition.y);
    const battle = this.engine.currentBattle;
    this.enemyBasePositions.clear();
    battle?.enemies.forEach((enemy, index) => {
      const sprite = this.enemySprites.get(enemy.id);
      if (!sprite) return;
      const baseScale = enemy?.id.includes('regent') ? 4 : enemy?.id.includes('boss') ? 3.5 : 3;
      const position = { x: width * (0.58 + index * 0.13), y: height * 0.46 + (index % 2) * 34 * fit };
      this.enemyBasePositions.set(enemy.id, position);
      if (!this.battleAnimating) sprite.setPosition(position.x, position.y);
      sprite.setScale(baseScale * fit).setAlpha(enemy.stats.hp <= 0 ? 0.32 : 1);
    });
  }

  private queueBattleVisuals(events: BattleVisualEvent[]) {
    if (!events.length) return;
    this.battleVisualQueue.push(...events);
    this.playNextBattleVisual();
  }

  private playNextBattleVisual() {
    if (this.battleAnimating) return;
    const event = this.battleVisualQueue.shift();
    if (!event) {
      this.layoutBattle();
      return;
    }
    this.battleAnimating = true;
    if (event.type === 'playerAttack') this.playPlayerAttack(event.targetId);
    else if (event.type === 'playerMagic') this.playPlayerMagic(event);
    else if (event.type === 'enemyAttack') this.playEnemyAttack(event.sourceId);
    else if (event.type === 'playerHeal') this.playPlayerHeal(event);
    else if (event.type === 'playerDefend') this.playPlayerPulse(0x79c7ff);
    else if (event.type === 'playerRun') this.playRunHop(event.success);
    else this.finishBattleVisual();
  }

  private finishBattleVisual() {
    this.battleAnimating = false;
    this.layoutBattle();
    this.playNextBattleVisual();
  }

  private playPlayerAttack(targetId: string) {
    const player = this.playerSprite;
    const target = this.enemySprites.get(targetId);
    const targetBase = this.enemyBasePositions.get(targetId);
    if (!player || !target || !targetBase) {
      this.finishBattleVisual();
      return;
    }
    const start = this.playerBasePosition;
    const dx = targetBase.x - start.x;
    const dy = targetBase.y - start.y;
    const distance = Math.max(1, Math.hypot(dx, dy));
    const strike = {
      x: targetBase.x - (dx / distance) * 76,
      y: targetBase.y - (dy / distance) * 42
    };
    this.tweens.add({
      targets: player,
      x: strike.x,
      y: strike.y,
      duration: 135,
      ease: 'Sine.easeOut',
      onComplete: () => {
        this.flashHit(target, 0xf7df83);
        this.tweens.add({
          targets: player,
          x: start.x,
          y: start.y,
          duration: 155,
          ease: 'Sine.easeIn',
          onComplete: () => this.finishBattleVisual()
        });
      }
    });
  }

  private playPlayerMagic(event: Extract<BattleVisualEvent, { type: 'playerMagic' }>) {
    const target = this.enemySprites.get(event.targetId);
    const targetBase = this.enemyBasePositions.get(event.targetId);
    if (!target || !targetBase) {
      this.finishBattleVisual();
      return;
    }
    if (this.playGeneratedDamageSpell(event, target, targetBase)) return;
    if (event.spellId === 'spark') {
      this.playSparkSpell(target, targetBase);
      return;
    }
    if (event.spellId === 'ember') {
      this.playEmberSpell(target, targetBase);
      return;
    }
    if (event.spellId === 'frost_rune') {
      this.playFrostRuneSpell(target, targetBase);
      return;
    }
    if (event.spellId === 'sunflare') {
      this.playSunflareSpell(target, targetBase);
      return;
    }
    const color = this.magicColor(event.element);
    const orb = this.add.circle(this.playerBasePosition.x + 22, this.playerBasePosition.y - 44, 7, color, 1).setDepth(8);
    this.tweens.add({
      targets: orb,
      x: targetBase.x,
      y: targetBase.y,
      scale: 1.5,
      duration: 230,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        orb.destroy();
        this.flashHit(target, color);
        this.time.delayedCall(90, () => this.finishBattleVisual());
      }
    });
  }

  private playGeneratedDamageSpell(
    event: Extract<BattleVisualEvent, { type: 'playerMagic' }>,
    target: Phaser.GameObjects.Image,
    targetBase: { x: number; y: number }
  ) {
    return this.playGeneratedSpellStrip(event.spellId, targetBase.x, targetBase.y, 1.45, () => {
      this.flashHit(target, this.magicColor(event.element));
    });
  }

  private playSparkSpell(target: Phaser.GameObjects.Image, targetBase: { x: number; y: number }) {
    const start = { x: this.playerBasePosition.x + 24, y: this.playerBasePosition.y - 58 };
    const bolt = this.add.graphics().setDepth(9);
    bolt.lineStyle(5, 0xffffd0, 0.95);
    bolt.beginPath();
    bolt.moveTo(start.x, start.y);
    for (let step = 1; step < 6; step += 1) {
      const progress = step / 6;
      bolt.lineTo(
        Phaser.Math.Linear(start.x, targetBase.x, progress) + Phaser.Math.Between(-12, 12),
        Phaser.Math.Linear(start.y, targetBase.y, progress) + Phaser.Math.Between(-16, 16)
      );
    }
    bolt.lineTo(targetBase.x, targetBase.y);
    bolt.strokePath();

    const hit = this.add.circle(targetBase.x, targetBase.y, 15, 0xf7df63, 0.4).setDepth(8);
    this.flashHit(target, 0xf7df63);
    this.tweens.add({
      targets: hit,
      scale: 2,
      alpha: 0,
      duration: 170,
      ease: 'Sine.easeOut'
    });
    this.tweens.add({
      targets: bolt,
      alpha: 0,
      duration: 120,
      ease: 'Sine.easeOut',
      onComplete: () => {
        bolt.destroy();
        hit.destroy();
        this.finishBattleVisual();
      }
    });
  }

  private playEmberSpell(target: Phaser.GameObjects.Image, targetBase: { x: number; y: number }) {
    const ember = this.add.circle(this.playerBasePosition.x + 24, this.playerBasePosition.y - 48, 8, 0xff8a3d, 1).setDepth(9);
    const core = this.add.circle(ember.x, ember.y, 4, 0xfff0a8, 1).setDepth(10);
    const sparks = Array.from({ length: 4 }, (_, index) =>
      this.add.circle(ember.x - index * 9, ember.y + Phaser.Math.Between(-8, 8), 3, 0xffc15c, 0.75).setDepth(8)
    );
    this.tweens.add({
      targets: [ember, core, ...sparks],
      x: targetBase.x,
      y: targetBase.y,
      duration: 235,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        ember.destroy();
        core.destroy();
        sparks.forEach((spark) => spark.destroy());
        const burst = this.add.circle(targetBase.x, targetBase.y, 14, 0xff7a24, 0.55).setDepth(9);
        this.flashHit(target, 0xff8a3d);
        this.tweens.add({
          targets: burst,
          scale: 2.4,
          alpha: 0,
          duration: 145,
          ease: 'Sine.easeOut',
          onComplete: () => {
            burst.destroy();
            this.finishBattleVisual();
          }
        });
      }
    });
  }

  private playFrostRuneSpell(target: Phaser.GameObjects.Image, targetBase: { x: number; y: number }) {
    const rune = this.add.graphics().setDepth(9).setAlpha(0);
    rune.lineStyle(3, 0xd8f7ff, 0.92);
    rune.strokeCircle(targetBase.x, targetBase.y, 24);
    rune.strokeTriangle(targetBase.x, targetBase.y - 27, targetBase.x - 24, targetBase.y + 16, targetBase.x + 24, targetBase.y + 16);
    rune.lineBetween(targetBase.x - 18, targetBase.y, targetBase.x + 18, targetBase.y);
    rune.lineBetween(targetBase.x, targetBase.y - 18, targetBase.x, targetBase.y + 18);
    const frost = this.add.circle(targetBase.x, targetBase.y, 18, 0x9bdcff, 0.2).setDepth(8);
    this.tweens.add({
      targets: rune,
      alpha: 1,
      scale: 1.12,
      duration: 115,
      ease: 'Sine.easeOut',
      onComplete: () => {
        this.flashHit(target, 0x9bdcff);
        this.tweens.add({
          targets: [rune, frost],
          scale: 1.75,
          alpha: 0,
          duration: 180,
          ease: 'Sine.easeIn',
          onComplete: () => {
            rune.destroy();
            frost.destroy();
            this.finishBattleVisual();
          }
        });
      }
    });
  }

  private playSunflareSpell(target: Phaser.GameObjects.Image, targetBase: { x: number; y: number }) {
    const beam = this.add.rectangle(targetBase.x, targetBase.y - 80, 18, 150, 0xf7f2c0, 0.64).setDepth(9);
    const flare = this.add.star(targetBase.x, targetBase.y, 8, 10, 38, 0xffe78a, 0.62).setDepth(10).setScale(0.25);
    this.cameras.main.flash(95, 247, 242, 192, false);
    this.flashHit(target, 0xf7f2c0);
    this.tweens.add({
      targets: flare,
      scale: 1.25,
      alpha: 0,
      duration: 225,
      ease: 'Sine.easeOut'
    });
    this.tweens.add({
      targets: beam,
      scaleY: 1.2,
      alpha: 0,
      duration: 225,
      ease: 'Sine.easeIn',
      onComplete: () => {
        beam.destroy();
        flare.destroy();
        this.finishBattleVisual();
      }
    });
  }

  private playEnemyAttack(sourceId: string) {
    const source = this.enemySprites.get(sourceId);
    const sourceBase = this.enemyBasePositions.get(sourceId);
    const player = this.playerSprite;
    if (!source || !sourceBase || !player) {
      this.finishBattleVisual();
      return;
    }
    const dx = this.playerBasePosition.x - sourceBase.x;
    const dy = this.playerBasePosition.y - sourceBase.y;
    const distance = Math.max(1, Math.hypot(dx, dy));
    const strike = {
      x: this.playerBasePosition.x - (dx / distance) * 72,
      y: this.playerBasePosition.y - (dy / distance) * 36
    };
    this.tweens.add({
      targets: source,
      x: strike.x,
      y: strike.y,
      duration: 140,
      ease: 'Sine.easeOut',
      onComplete: () => {
        this.flashHit(player, 0xff8178);
        this.tweens.add({
          targets: source,
          x: sourceBase.x,
          y: sourceBase.y,
          duration: 155,
          ease: 'Sine.easeIn',
          onComplete: () => this.finishBattleVisual()
        });
      }
    });
  }

  private playPlayerPulse(color: number) {
    const player = this.playerSprite;
    if (!player) {
      this.finishBattleVisual();
      return;
    }
    const ring = this.add.circle(this.playerBasePosition.x, this.playerBasePosition.y - 34, 16, color, 0.18).setDepth(7);
    this.tweens.add({
      targets: ring,
      scale: 2.3,
      alpha: 0,
      duration: 240,
      ease: 'Sine.easeOut',
      onComplete: () => {
        ring.destroy();
        this.finishBattleVisual();
      }
    });
  }

  private playRunHop(success: boolean) {
    const player = this.playerSprite;
    if (!player) {
      this.finishBattleVisual();
      return;
    }
    this.tweens.add({
      targets: player,
      x: this.playerBasePosition.x + (success ? -34 : -16),
      y: this.playerBasePosition.y + (success ? 0 : 6),
      yoyo: !success,
      duration: success ? 180 : 90,
      ease: 'Sine.easeOut',
      onComplete: () => this.finishBattleVisual()
    });
  }

  private playPlayerHeal(event: Extract<BattleVisualEvent, { type: 'playerHeal' }>) {
    if (event.spellId && this.playGeneratedHealSpell(event.spellId)) return;
    if (event.spellId === 'river_mend') {
      this.playRiverMendPulse();
      return;
    }
    this.playPlayerPulse(event.itemId ? 0xf2c879 : 0x75f08f);
  }

  private playGeneratedHealSpell(spellId: string) {
    return this.playGeneratedSpellStrip(spellId, this.playerBasePosition.x, this.playerBasePosition.y - 42, 1.55);
  }

  private playGeneratedSpellStrip(spellId: string, x: number, y: number, scale: number, onStart?: () => void) {
    const animation = this.ensureGeneratedSpellAnimation(spellId);
    if (!animation) return false;
    const sprite = this.add.sprite(x, y, animation.textureKey, 0).setOrigin(0.5).setDepth(12).setScale(scale);
    onStart?.();
    sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      sprite.destroy();
      this.finishBattleVisual();
    });
    sprite.play(animation.animationKey);
    this.time.delayedCall(animation.durationMs + 120, () => {
      if (!sprite.active) return;
      sprite.destroy();
      this.finishBattleVisual();
    });
    return true;
  }

  private ensureGeneratedSpellAnimation(spellId: string) {
    const spec = spellEffectRuntimeSpecForId(spellId);
    if (!spec || !this.textures.exists(spec.key)) return null;
    const animationKey = `${spec.key}:battle`;
    if (!this.anims.exists(animationKey)) {
      const created = this.anims.create({
        key: animationKey,
        frames: this.anims.generateFrameNumbers(spec.key, { start: 0, end: Math.max(0, spec.frameCount - 1) }),
        frameRate: Math.max(1, Math.round(1000 / spec.frameDurationMs)),
        repeat: 0
      });
      if (!created && !this.anims.exists(animationKey)) return null;
    }
    return {
      textureKey: spec.key,
      animationKey,
      durationMs: spec.frameCount * spec.frameDurationMs
    };
  }

  private playRiverMendPulse() {
    const player = this.playerSprite;
    if (!player) {
      this.finishBattleVisual();
      return;
    }
    const rings = [0, 1, 2].map((index) =>
      this.add
        .circle(this.playerBasePosition.x, this.playerBasePosition.y - 34, 14 + index * 5, 0x79dfff, 0.12)
        .setStrokeStyle(2, 0xcff8ff, 0.7)
        .setDepth(7)
        .setScale(0.35 + index * 0.12)
    );
    const glint = this.add.star(this.playerBasePosition.x + 22, this.playerBasePosition.y - 58, 5, 3, 10, 0xe8ffff, 0.9).setDepth(8);
    this.tweens.add({
      targets: rings,
      scale: 2.35,
      alpha: 0,
      duration: 300,
      ease: 'Sine.easeOut'
    });
    this.tweens.add({
      targets: glint,
      y: glint.y - 16,
      alpha: 0,
      duration: 260,
      ease: 'Sine.easeOut',
      onComplete: () => {
        rings.forEach((ring) => ring.destroy());
        glint.destroy();
        this.finishBattleVisual();
      }
    });
  }

  private flashHit(target: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite, color = 0xffffff) {
    const originalX = target.x;
    target.setTint(color);
    this.tweens.add({
      targets: target,
      x: originalX + 8,
      yoyo: true,
      repeat: 1,
      duration: 45,
      onComplete: () => {
        target.clearTint();
        target.x = originalX;
      }
    });
  }

  private magicColor(element?: string) {
    const colors: Record<string, number> = {
      lightning: 0xf7df63,
      fire: 0xff8a3d,
      ice: 0x9bdcff,
      light: 0xf7f2c0
    };
    return colors[element ?? ''] ?? 0x79c7ff;
  }
}
