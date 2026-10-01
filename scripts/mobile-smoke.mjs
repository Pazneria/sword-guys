import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

// Uses an existing server; never starts a second preview. Run from the repo root.
const url = process.env.SWORD_GUYS_TEST_URL ?? 'http://127.0.0.1:5178/';
await mkdir('playtest-shots', { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
const errors = [];
const check = (name) => { results.push(name); console.log(`PASS ${name}`); };
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    window.__touchProof = [];
    document.addEventListener('pointerdown', (event) => window.__touchProof.push({ type: event.pointerType, trusted: event.isTrusted }));
  });
  const ready = async () => {
    await page.waitForFunction(() => window.__SWORD_GUYS__?.game.scene.isActive('WorldScene'));
    await page.waitForTimeout(250);
    await page.evaluate(() => window.__SWORD_GUYS__.game.scene.getScenes(true).forEach((scene) => { scene.input.keyboard.enabled = false; }));
  };
  const state = () => page.evaluate(() => {
    const engine = window.__SWORD_GUYS__.getGameEngine();
    const battle = window.__SWORD_GUYS__.game.scene.getScene('BattleScene');
    return { map: engine.state.currentMapId, x: engine.state.player.worldX, y: engine.state.player.worldY,
      hp: engine.currentBattle?.player.stats.hp ?? engine.state.player.stats.hp, mp: engine.currentBattle?.player.stats.mp ?? engine.state.player.stats.mp, gold: engine.state.player.gold,
      inventory: engine.state.inventory, questFlags: engine.state.questFlags,
      overlay: document.getElementById('ui-root').dataset.overlay,
      phase: engine.currentBattle?.phase, animating: battle.battleAnimating,
      enemies: engine.currentBattle?.enemies.map((enemy) => ({ hp: enemy.stats.hp, id: enemy.id })),
      log: engine.currentBattle?.commandLog, slot: localStorage.getItem('sword-guys-save-v1') };
  });
  const tap = async (selector) => {
    const element = page.locator(selector).first();
    await element.scrollIntoViewIfNeeded();
    await element.tap();
    await page.waitForTimeout(90);
  };
  const point = async (selector, id) => {
    const bounds = await page.locator(selector).boundingBox();
    assert(bounds, selector);
    return { id, x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2, radiusX: 2, radiusY: 2, force: 1 };
  };
  const cdp = await context.newCDPSession(page);
  const touch = (type, touchPoints) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints });
  await page.goto(url);
  await ready();
  assert(await page.locator('#touch-controls').isVisible());
  const start = await state();
  const up = await point('[data-touch-action="up"]', 1);
  const ok = await point('[data-touch-action="confirm"]', 2);
  await touch('touchStart', [up]);
  await page.waitForFunction(() => window.__SWORD_GUYS__.getGameEngine().prompt().includes('Elder Rowan'));
  await touch('touchStart', [up, ok]);
  await page.waitForTimeout(120);
  await touch('touchEnd', [ok]);
  const held = await page.evaluate(async () => (await import('/src/game/input/touch.ts')).touchActions.read());
  assert.equal(held.moveY, -1);
  await touch('touchEnd', []);
  assert((await state()).y < start.y - 35);
  assert.equal((await state()).overlay, 'dialogue');
  assert.equal((await state()).questFlags.spokeToElder, true);
  await page.screenshot({ path: 'playtest-shots/sword-guys-mobile-dialogue.png' });
  check('trusted two-finger movement + interaction, independent release, Elder dialogue');
  for (let index = 0; index < 8 && (await state()).overlay === 'dialogue'; index++) await tap('.advance [data-ui-choice="confirm"]');
  assert.equal((await state()).overlay, 'none');

  await tap('[data-touch-action="menu"]');
  assert.equal((await state()).overlay, 'menu');
  await tap('[data-ui-choice="tab"][data-index="1"]');
  assert.equal(await page.locator('.panel-body .panel-title').textContent(), 'Status');
  await tap('[data-ui-choice="tab"][data-index="3"]');
  await tap('[data-ui-choice="menu-row"][data-index="0"]');
  assert.match(await page.locator('.panel-body').textContent(), /Equipped|equipped/);
  await page.evaluate(() => { window.__SWORD_GUYS__.getGameEngine().state.player.stats.hp = 20; });
  await tap('[data-ui-choice="tab"][data-index="0"]');
  const itemCount = (await state()).inventory.small_potion;
  await tap('[data-ui-choice="menu-row"][data-index="0"]');
  assert((await state()).hp > 20);
  assert.equal((await state()).inventory.small_potion, itemCount - 1);
  await page.screenshot({ path: 'playtest-shots/sword-guys-mobile-menu.png' });
  await tap('[data-ui-choice="tab"][data-index="6"]');
  await tap('.content-list [data-ui-choice="confirm"]');
  const saved = await state();
  await page.evaluate(() => { window.__SWORD_GUYS__.getGameEngine().state.player.gold += 7; });
  await tap('[data-ui-choice="tab"][data-index="7"]');
  await tap('.content-list [data-ui-choice="confirm"]');
  assert.equal((await state()).gold, saved.gold);
  await tap('[data-touch-action="cancel"]');
  assert.equal((await state()).overlay, 'none');
  await page.reload(); await ready();
  assert.equal((await state()).slot, saved.slot);
  assert.equal((await state()).y, saved.y);
  assert.equal((await state()).inventory.small_potion, saved.inventory.small_potion);
  check('tap tabs, equipment, field item, Save, Load, Back, and exact saved bytes across reload');
  await tap('[data-touch-action="map"]');
  assert.equal((await state()).overlay, 'map');
  await tap('.map-overlay [data-ui-choice="cancel"]');
  assert.equal((await state()).overlay, 'none');

  // Known locations set up services and battles; all their interactions use real touch input.
  await page.evaluate(() => window.__SWORD_GUYS__.qa.go('greenhollow-shop')); await ready();
  await tap('[data-touch-action="up"]');
  const shopUp = await point('[data-touch-action="up"]', 1);
  await touch('touchStart', [shopUp]); await page.waitForTimeout(220); await touch('touchEnd', []);
  await tap('[data-touch-action="confirm"]');
  assert.equal((await state()).overlay, 'shop');
  const beforeBuy = await state();
  await tap('[data-ui-choice="shop-row"][data-index="0"]');
  assert((await state()).gold < beforeBuy.gold);
  await tap('[data-ui-choice="shop-mode"][data-index="1"]');
  await tap('[data-ui-choice="shop-row"][data-index="0"]');
  await tap('.overlay-close');
  assert.equal((await state()).overlay, 'none');
  check('touch map and shop buy/sell/exit');

  await page.evaluate(() => {
    const engine = window.__SWORD_GUYS__.getGameEngine();
    engine.qaWarpToTile('greenhollow', 10, 7, 'south');
    window.__SWORD_GUYS__.game.scene.getScene('WorldScene').scene.restart();
  });
  await ready();
  const diagonal = await point('[data-touch-action="down right"]', 1);
  const beforeDiagonal = await state();
  await touch('touchStart', [diagonal]); await page.waitForTimeout(220);
  await touch('touchCancel', []);
  const afterDiagonal = await state();
  assert(afterDiagonal.x > beforeDiagonal.x && afterDiagonal.y > beforeDiagonal.y);
  await page.waitForTimeout(160);
  assert.equal((await state()).x, afterDiagonal.x);
  check('diagonal movement and native touchCancel release');
  const rotateUp = await point('[data-touch-action="up"]', 1);
  await touch('touchStart', [rotateUp]); await page.waitForTimeout(80);
  await page.setViewportSize({ width: 844, height: 390 });
  await touch('touchEnd', []); await page.waitForTimeout(200);
  const afterRotate = await state(); await page.waitForTimeout(150);
  assert.equal((await state()).y, afterRotate.y);
  await tap('[data-touch-action="menu"]');
  await tap('[data-ui-choice="tab"][data-index="8"]');
  await tap('[data-touch-action="cancel"]');
  await page.screenshot({ path: 'playtest-shots/sword-guys-mobile-landscape.png' });
  check('rotation clears held input; landscape menu and HUD stay usable');

  await tap('[data-session-action="pause"]');
  assert(await page.locator('.session-modal').isVisible());
  assert(await page.evaluate(() => window.__SWORD_GUYS__.game.scene.isPaused('WorldScene')));
  const paused = await state(); await page.waitForTimeout(160);
  assert.equal((await state()).y, paused.y);
  await tap('[data-session-action="restart"]');
  await tap('.session-modal [data-session-action="pause"]'); // Cancel the restart prompt.
  assert.equal((await state()).slot, paused.slot);
  await tap('[data-session-action="restart"]');
  await tap('[data-session-action="confirm-restart"]');
  await ready();
  assert.equal((await state()).slot, paused.slot);
  assert.equal((await state()).y, saved.y);
  await tap('[data-session-action="pause"]');
  await tap('[data-session-action="exit"]');
  await page.screenshot({ path: 'playtest-shots/sword-guys-mobile-exit.png' });
  assert(await page.evaluate(() => window.__SWORD_GUYS__.game.scene.isPaused('WorldScene')));
  await tap('[data-session-action="resume"]');
  assert.equal((await state()).slot, paused.slot);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  assert(await page.locator('.session-modal').isVisible());
  await tap('[data-session-action="resume"]');
  check('pause/resume, confirmed checkpoint restart, safe exit/return, and focus loss pause');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.__SWORD_GUYS__.qa.battle('greenhollow-fields'));
  await page.waitForFunction(() => window.__SWORD_GUYS__.game.scene.isActive('BattleScene'));
  await page.evaluate(() => window.__SWORD_GUYS__.game.scene.getScene('BattleScene').input.keyboard.enabled = false);
  const battleReady = () => page.waitForFunction(() => {
    const scene = window.__SWORD_GUYS__.game.scene.getScene('BattleScene');
    return !scene.battleAnimating && !scene.returningToWorld;
  });
  await battleReady(); await page.waitForTimeout(150);
  await tap('[data-ui-choice="battle-command"][data-index="0"]');
  assert.match(await page.locator('.battle-title').last().textContent(), /Target: Attack/);
  await tap('[data-touch-action="cancel"]');
  await tap('[data-ui-choice="battle-command"][data-index="1"]');
  await tap('[data-ui-choice="battle-option"][data-index="0"]');
  const mpBefore = (await state()).mp;
  await tap('[data-ui-choice="battle-target"][data-index="1"]');
  await battleReady();
  assert((await state()).mp < mpBefore);
  await tap('[data-ui-choice="battle-command"][data-index="2"]');
  const potionBefore = (await state()).inventory.small_potion;
  await tap('[data-ui-choice="battle-option"][data-index="0"]');
  await battleReady();
  assert.equal((await state()).inventory.small_potion, potionBefore - 1);
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(160);
  await tap('[data-ui-choice="battle-command"][data-index="3"]');
  await battleReady();
  await page.screenshot({ path: 'playtest-shots/sword-guys-mobile-battle-landscape.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(160);
  await tap('[data-ui-choice="battle-command"][data-index="0"]');
  const hpBefore = (await state()).enemies[0].hp;
  await tap('[data-ui-choice="battle-target"][data-index="0"]');
  await tap('[data-session-action="pause"]');
  assert(await page.evaluate(() => window.__SWORD_GUYS__.game.scene.isPaused('BattleScene')));
  await page.screenshot({ path: 'playtest-shots/sword-guys-mobile-paused.png' });
  await tap('[data-session-action="resume"]');
  await battleReady();
  assert((await state()).enemies[0].hp < hpBefore);
  await page.screenshot({ path: 'playtest-shots/sword-guys-mobile-battle.png' });
  for (let turn = 0; turn < 16 && (await state()).phase === 'playerTurn'; turn++) {
    await tap('[data-ui-choice="battle-command"][data-index="0"]');
    await tap('[data-ui-choice="battle-target"][data-index="0"]');
    await battleReady();
  }
  assert.equal((await state()).phase, 'victory');
  await tap('.battle-panel [data-ui-choice="confirm"]');
  await ready();
  check('Attack target/cancel, Magic target, Item, Defend, paused battle animation, victory and return');

  await page.evaluate(() => window.__SWORD_GUYS__.qa.battle('greenhollow-fields'));
  await page.waitForFunction(() => window.__SWORD_GUYS__.game.scene.isActive('BattleScene'));
  await battleReady();
  for (let attempt = 0; attempt < 12 && (await state()).phase === 'playerTurn'; attempt++) {
    await tap('[data-ui-choice="battle-command"][data-index="4"]'); await battleReady();
  }
  assert.equal((await state()).phase, 'escaped');
  await tap('[data-touch-action="confirm"]'); await ready();
  check('Run and touch continue back to exploration');
  assert((await page.evaluate(() => window.__touchProof)).every((event) => event.type === 'touch' && event.trusted));
  check('all mobile pointer presses came from trusted emulated touch events');
  await context.close();

  const security = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const securityPage = await security.newPage();
  securityPage.on('pageerror', (error) => errors.push(error.message));
  const hostile = JSON.parse(saved.slot);
  hostile.state.player.gold = '<img src=x onerror="window.__saveXss=true">';
  const hostileRaw = JSON.stringify(hostile);
  await securityPage.addInitScript((raw) => {
    if (!localStorage.getItem('fixture-installed')) {
      localStorage.setItem('sword-guys-save-v1', raw);
      localStorage.setItem('fixture-installed', 'true');
    }
  }, hostileRaw);
  await securityPage.goto(url);
  await securityPage.waitForFunction(() => window.__SWORD_GUYS__?.game.scene.isActive('WorldScene'));
  assert.equal(await securityPage.evaluate(() => localStorage.getItem('sword-guys-save-v1')), hostileRaw);
  assert.equal(await securityPage.evaluate(() => window.__saveXss), undefined);
  await securityPage.locator('[data-touch-action="menu"]').tap();
  await securityPage.locator('[data-ui-choice="tab"][data-index="7"]').tap();
  await securityPage.locator('.content-list [data-ui-choice="confirm"]').tap();
  await securityPage.waitForTimeout(120);
  assert.match(await securityPage.locator('.panel-body').textContent(), /stored slot has been kept/);
  const textOnly = JSON.parse(saved.slot);
  textOnly.state.gameLog.unshift('<img src=x onerror="window.__saveXss=true">');
  await securityPage.evaluate((raw) => localStorage.setItem('sword-guys-save-v1', raw), JSON.stringify(textOnly));
  await securityPage.reload();
  await securityPage.waitForFunction(() => window.__SWORD_GUYS__?.game.scene.isActive('WorldScene'));
  await securityPage.locator('[data-touch-action="menu"]').tap();
  await securityPage.locator('[data-ui-choice="tab"][data-index="5"]').tap();
  await securityPage.waitForTimeout(120);
  assert.match(await securityPage.locator('.content-list').textContent(), /<img src=x/);
  assert.equal(await securityPage.locator('.content-list img').count(), 0);
  assert.equal(await securityPage.evaluate(() => window.__saveXss), undefined);
  await security.close();
  check('hostile numeric save rejected and preserved; saved log markup renders only as text');

  const desktop = await browser.newContext({ viewport: { width: 1100, height: 700 } });
  const desktopPage = await desktop.newPage();
  desktopPage.on('pageerror', (error) => errors.push(error.message));
  await desktopPage.goto(url);
  await desktopPage.waitForFunction(() => window.__SWORD_GUYS__?.game.scene.isActive('WorldScene'));
  assert(!(await desktopPage.locator('#touch-controls').isVisible()));
  const desktopY = await desktopPage.evaluate(() => window.__SWORD_GUYS__.getGameEngine().state.player.worldY);
  await desktopPage.keyboard.down('ArrowDown'); await desktopPage.waitForTimeout(180); await desktopPage.keyboard.up('ArrowDown');
  assert(await desktopPage.evaluate((y) => window.__SWORD_GUYS__.getGameEngine().state.player.worldY > y, desktopY));
  await desktopPage.keyboard.press('m', { delay: 80 }); await desktopPage.waitForTimeout(80);
  assert(await desktopPage.locator('.panel').isVisible());
  await desktopPage.keyboard.press('Escape', { delay: 80 }); await desktopPage.waitForTimeout(80);
  await desktopPage.keyboard.press('n', { delay: 80 }); await desktopPage.waitForTimeout(80);
  assert(await desktopPage.locator('.map-overlay').isVisible());
  await desktopPage.keyboard.press('Escape', { delay: 80 });
  await desktopPage.keyboard.press('p', { delay: 80 }); await desktopPage.waitForTimeout(80);
  assert(await desktopPage.locator('.session-modal').isVisible());
  await desktopPage.keyboard.press('p', { delay: 80 });
  await desktop.close();
  check('desktop keyboard movement, menu, map, Escape, and P preserved');
  assert.deepEqual(errors, []);
  await writeFile('playtest-shots/mobile-smoke-results.json', JSON.stringify({ url, passed: results, pageErrors: errors, physicalPhone: 'Not tested' }, null, 2));
} finally {
  await browser.close();
}
