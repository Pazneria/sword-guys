import { ITEMS, MAPS, SPELLS, TILE_DEFINITIONS } from '../game/content';
import { itemIconUrlForId } from '../game/items/icons';
import { GameEngine } from '../game/simulation/engine';
import { BattleState, InputActionState, InteractionResult, TILE_SIZE, TileLayerName } from '../game/types';

type Overlay = 'none' | 'dialogue' | 'cutscene' | 'menu' | 'shop' | 'inn' | 'bedRest' | 'savePoint' | 'map' | 'battle' | 'ending';
type ShopMode = 'buy' | 'sell';
type BattleMode = 'commands' | 'magic' | 'items' | 'targets';
type UiOption = { id: string; label: string; meta: string; iconId?: string };

const esc = (value: string | number) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

export class UIManager {
  overlay: Overlay = 'none';
  private readonly root: HTMLElement;
  private dialogue = { speaker: '', lines: [] as string[], index: 0 };
  private menuTab = 0;
  private menuIndex = 0;
  private shopId = '';
  private shopMode: ShopMode = 'buy';
  private shopIndex = 0;
  private innCost = 0;
  private notice = '';
  private noticeTimer = 0;
  private battleMode: BattleMode = 'commands';
  private battleIndex = 0;
  private battleSubIndex = 0;
  private battleTargetIndex = 0;
  private battleTargetCommand: 'attack' | 'magic' | null = null;
  private battleTargetOptionId = '';
  private endingIndex = 0;
  private endingClickAction: 'continue' | 'restart' | null = null;
  private lastHtml = '';

  constructor(root: HTMLElement) {
    this.root = root;
    this.root.addEventListener?.('click', (event) => {
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-ending-action]') : null;
      const action = target?.dataset.endingAction;
      if (action === 'continue' || action === 'restart') this.endingClickAction = action;
    });
  }

  get blockingExploration() {
    return this.overlay !== 'none' && this.overlay !== 'ending';
  }

  openInteraction(result: InteractionResult, engine: GameEngine) {
    if (result.type === 'dialogue') {
      this.overlay = 'dialogue';
      this.dialogue = { speaker: result.speaker, lines: result.lines, index: 0 };
    }
    if (result.type === 'shop') this.openShop(result.shopId);
    if (result.type === 'inn') {
      this.overlay = 'inn';
      this.innCost = result.innCost;
      this.notice = `${result.name}: rest for ${result.innCost}g?`;
    }
    if (result.type === 'bedRest') {
      this.overlay = 'bedRest';
      this.notice = `${result.name}: sleep here?`;
    }
    if (result.type === 'savePoint') {
      this.overlay = 'savePoint';
      this.notice = `${result.name}: save here?`;
    }
    if (result.type === 'none' && result.message) engine.setMessage(result.message);
  }

  openCutscene(speaker: string, lines: string[]) {
    this.overlay = 'cutscene';
    this.dialogue = { speaker, lines, index: 0 };
  }

  openMenu() {
    this.overlay = 'menu';
    this.menuTab = 0;
    this.menuIndex = 0;
  }

  openMap() {
    this.overlay = 'map';
  }

  openShop(shopId: string) {
    this.overlay = 'shop';
    this.shopId = shopId;
    this.shopMode = 'buy';
    this.shopIndex = 0;
  }

  openBattle() {
    this.overlay = 'battle';
    this.battleMode = 'commands';
    this.battleIndex = 0;
    this.battleSubIndex = 0;
    this.battleTargetIndex = 0;
    this.battleTargetCommand = null;
    this.battleTargetOptionId = '';
  }

  openEnding() {
    this.overlay = 'ending';
    this.endingIndex = 0;
  }

  close() {
    this.overlay = 'none';
    this.notice = '';
  }

  handleExplorationActions(actions: InputActionState, engine: GameEngine) {
    if (this.overlay === 'none') {
      if (actions.mapPressed) {
        this.openMap();
        return true;
      }
      if (actions.menuPressed) {
        this.openMenu();
        return true;
      }
      return false;
    }
    if (this.overlay === 'dialogue') this.handleDialogue(actions);
    if (this.overlay === 'cutscene') this.handleDialogue(actions);
    if (this.overlay === 'menu') this.handleMenu(actions, engine);
    if (this.overlay === 'shop') this.handleShop(actions, engine);
    if (this.overlay === 'inn') this.handleInn(actions, engine);
    if (this.overlay === 'bedRest') this.handleBedRest(actions, engine);
    if (this.overlay === 'savePoint') this.handleSavePoint(actions, engine);
    if (this.overlay === 'map') this.handleMap(actions);
    if (this.overlay === 'ending') this.handleEnding(actions, engine);
    return true;
  }

  handleBattleActions(actions: InputActionState, engine: GameEngine): 'world' | 'stay' {
    const battle = engine.currentBattle;
    if (!battle) {
      if (this.overlay === 'battle') this.close();
      return 'world';
    }
    if (this.overlay !== 'battle') this.openBattle();
    if ((battle.phase === 'victory' || battle.phase === 'escaped') && actions.confirmPressed) {
      engine.finishBattle();
      this.close();
      return 'world';
    }
    if (battle.phase === 'defeat' && actions.confirmPressed) {
      engine.restoreCheckpoint();
      this.close();
      return 'world';
    }
    if (battle.phase !== 'playerTurn') return 'stay';

    if (actions.cancelPressed) {
      if (this.battleMode === 'targets') {
        this.battleMode = this.battleTargetCommand === 'magic' ? 'magic' : 'commands';
        this.battleTargetCommand = null;
        this.battleTargetOptionId = '';
      } else if (this.battleMode !== 'commands') {
        this.battleMode = 'commands';
        this.battleSubIndex = 0;
      } else if (battle.escapeAllowed) {
        this.battleIndex = 4;
      }
      return 'stay';
    }

    const options = this.battleOptions(engine);
    if (this.battleMode === 'commands') {
      if (actions.leftPressed) this.moveBattleCommand(-1, 0);
      if (actions.rightPressed) this.moveBattleCommand(1, 0);
      if (actions.upPressed) this.moveBattleCommand(0, -1);
      if (actions.downPressed) this.moveBattleCommand(0, 1);
    } else if (this.battleMode === 'targets') {
      const targets = this.battleTargets(battle);
      this.battleTargetIndex = Math.min(this.battleTargetIndex, Math.max(0, targets.length - 1));
      if (actions.upPressed) this.battleTargetIndex = Math.max(0, this.battleTargetIndex - 1);
      if (actions.downPressed) this.battleTargetIndex = Math.min(Math.max(0, targets.length - 1), this.battleTargetIndex + 1);
    } else {
      if (actions.upPressed) this.battleSubIndex = Math.max(0, this.battleSubIndex - 1);
      if (actions.downPressed) this.battleSubIndex = Math.min(Math.max(0, options.length - 1), this.battleSubIndex + 1);
    }
    if (!actions.confirmPressed) return 'stay';

    const command = ['attack', 'magic', 'item', 'defend', 'run'][this.battleIndex] as 'attack' | 'magic' | 'item' | 'defend' | 'run';
    if (this.battleMode === 'targets') {
      const target = this.battleTargets(battle)[this.battleTargetIndex];
      if (!target || !this.battleTargetCommand) return 'stay';
      const result =
        this.battleTargetCommand === 'magic'
          ? engine.submitBattleCommand('magic', this.battleTargetOptionId, target.id)
          : engine.submitBattleCommand('attack', undefined, target.id);
      if (result.consumedTurn) {
        this.battleMode = 'commands';
        this.battleTargetCommand = null;
        this.battleTargetOptionId = '';
      }
      return 'stay';
    }
    if (this.battleMode === 'commands' && command === 'attack') {
      this.openBattleTargets('attack');
      return 'stay';
    }
    if (this.battleMode === 'commands' && command === 'magic') {
      this.battleMode = 'magic';
      this.battleSubIndex = 0;
      return 'stay';
    }
    if (this.battleMode === 'commands' && command === 'item') {
      this.battleMode = 'items';
      this.battleSubIndex = 0;
      return 'stay';
    }
    if (this.battleMode === 'magic') {
      const spell = options[this.battleSubIndex];
      if (!spell) return 'stay';
      const definition = SPELLS[spell];
      if (definition?.kind !== 'healing' && battle.player.stats.mp >= (definition?.mpCost ?? Number.POSITIVE_INFINITY)) {
        this.openBattleTargets('magic', spell);
        return 'stay';
      }
      const result = engine.submitBattleCommand('magic', spell);
      if (result.consumedTurn) this.battleMode = 'commands';
      return 'stay';
    }
    if (this.battleMode === 'items') {
      const item = options[this.battleSubIndex];
      const result = engine.submitBattleCommand('item', item);
      if (result.consumedTurn) this.battleMode = 'commands';
      return 'stay';
    }
    engine.submitBattleCommand(command);
    return 'stay';
  }

  sync(engine: GameEngine) {
    if (this.overlay === 'ending' && this.endingClickAction) {
      this.activateEndingChoice(this.endingClickAction, engine);
      this.endingClickAction = null;
    }
    this.noticeTimer = Math.max(0, this.noticeTimer - 16);
    if (this.overlay === 'none') {
      const intro = engine.startIntroCutscene();
      if (intro) this.openCutscene(intro.speaker, intro.lines);
    }
    if (engine.state.endingReached && this.overlay !== 'ending' && !engine.currentBattle) this.openEnding();
    const html = [this.renderHud(engine), this.renderOverlay(engine)].join('');
    if (html !== this.lastHtml) {
      this.root.innerHTML = html;
      this.lastHtml = html;
    }
  }

  private handleDialogue(actions: InputActionState) {
    if (actions.confirmPressed) {
      if (this.dialogue.index < this.dialogue.lines.length - 1) this.dialogue.index += 1;
      else this.close();
    }
    if (actions.cancelPressed) this.close();
  }

  private handleMenu(actions: InputActionState, engine: GameEngine) {
    const tabs = this.menuTabs();
    if (actions.cancelPressed) {
      this.close();
      return;
    }
    if (actions.leftPressed) {
      this.menuTab = (this.menuTab + tabs.length - 1) % tabs.length;
      this.menuIndex = 0;
    }
    if (actions.rightPressed) {
      this.menuTab = (this.menuTab + 1) % tabs.length;
      this.menuIndex = 0;
    }
    const options = this.menuOptions(engine);
    if (actions.upPressed) this.menuIndex = Math.max(0, this.menuIndex - 1);
    if (actions.downPressed) this.menuIndex = Math.min(Math.max(0, options.length - 1), this.menuIndex + 1);
    if (!actions.confirmPressed) return;
    const tab = tabs[this.menuTab];
    const selected = options[this.menuIndex]?.id;
    if (tab === 'Items' && selected) this.notice = ITEMS[selected]?.keyItem ? 'Key items cannot be used here.' : engine.useItem(selected);
    if (tab === 'Equipment' && selected) this.notice = engine.equip(selected);
    if (tab === 'Magic' && selected) this.notice = this.fieldCast(engine, selected);
    if (tab === 'Save') this.notice = engine.createCheckpoint('Saved from menu.');
    if (tab === 'Load') this.notice = engine.loadSavedGame();
    if (tab === 'Close') this.close();
  }

  private handleShop(actions: InputActionState, engine: GameEngine) {
    if (actions.cancelPressed) {
      this.close();
      return;
    }
    if (actions.leftPressed || actions.rightPressed) {
      this.shopMode = this.shopMode === 'buy' ? 'sell' : 'buy';
      this.shopIndex = 0;
    }
    const options = this.shopOptions(engine);
    if (actions.upPressed) this.shopIndex = Math.max(0, this.shopIndex - 1);
    if (actions.downPressed) this.shopIndex = Math.min(Math.max(0, options.length - 1), this.shopIndex + 1);
    if (!actions.confirmPressed || !options[this.shopIndex]) return;
    this.notice =
      this.shopMode === 'buy'
        ? engine.buyItem(this.shopId, options[this.shopIndex].id)
        : engine.sellItem(options[this.shopIndex].id);
  }

  private handleInn(actions: InputActionState, engine: GameEngine) {
    if (actions.cancelPressed) this.close();
    if (actions.confirmPressed) {
      this.notice = engine.restAtInn(this.innCost);
      if (this.notice.startsWith('Rested')) this.close();
    }
  }

  private handleBedRest(actions: InputActionState, engine: GameEngine) {
    if (actions.cancelPressed) this.close();
    if (actions.confirmPressed) {
      this.notice = engine.sleepInInnBed();
      this.close();
    }
  }

  private handleSavePoint(actions: InputActionState, engine: GameEngine) {
    if (actions.cancelPressed) this.close();
    if (actions.confirmPressed) {
      this.notice = engine.createCheckpoint('Saved at crystal.');
      this.close();
    }
  }

  private handleMap(actions: InputActionState) {
    if (actions.cancelPressed || actions.confirmPressed || actions.mapPressed) this.close();
  }

  private handleEnding(actions: InputActionState, engine: GameEngine) {
    if (actions.leftPressed || actions.upPressed) this.endingIndex = Math.max(0, this.endingIndex - 1);
    if (actions.rightPressed || actions.downPressed) this.endingIndex = Math.min(1, this.endingIndex + 1);
    if (actions.cancelPressed) {
      this.activateEndingChoice('continue', engine);
      return;
    }
    if (actions.confirmPressed) this.activateEndingChoice(this.endingIndex === 0 ? 'continue' : 'restart', engine);
  }

  private activateEndingChoice(action: 'continue' | 'restart', engine: GameEngine) {
    if (action === 'continue') engine.continueAfterEnding();
    else engine.restartGame();
    this.close();
  }

  private menuTabs() {
    return ['Items', 'Status', 'Map', 'Equipment', 'Magic', 'Game Log', 'Save', 'Load', 'Options', 'Close'];
  }

  private menuOptions(engine: GameEngine): UiOption[] {
    const tab = this.menuTabs()[this.menuTab];
    if (tab === 'Items') {
      const usableItems = Object.entries(engine.state.inventory)
        .filter(([id]) => ITEMS[id]?.effect)
        .map(([id, qty]) => ({ id, label: `${ITEMS[id].name} x${qty}`, meta: ITEMS[id].description, iconId: id }));
      const keyItems = Object.entries(engine.state.keyItems)
        .filter(([id, present]) => present && ITEMS[id])
        .map(([id]) => ({ id, label: ITEMS[id].name, meta: ITEMS[id].description, iconId: id }));
      return [...usableItems, ...keyItems];
    }
    if (tab === 'Equipment') {
      return Object.entries(engine.state.inventory)
        .filter(([id]) => ITEMS[id]?.equipmentSlot)
        .map(([id]) => ({ id, label: ITEMS[id].name, meta: this.equipMeta(id, engine), iconId: id }));
    }
    if (tab === 'Magic') {
      return engine.state.player.spells.map((id) => ({ id, label: SPELLS[id].name, meta: `${SPELLS[id].mpCost} MP - ${SPELLS[id].description}`, iconId: id }));
    }
    if (tab === 'Game Log') return engine.state.gameLog.map((entry, index) => ({ id: String(index), label: entry, meta: '' }));
    return [];
  }

  private equipMeta(id: string, engine: GameEngine) {
    const item = ITEMS[id];
    const equipped = item.equipmentSlot ? engine.state.player.equipment[item.equipmentSlot] === id : false;
    const stats = Object.entries(item.stats ?? {})
      .map(([key, value]) => `${key} ${Number(value) >= 0 ? '+' : ''}${value}`)
      .join(', ');
    return `${equipped ? 'Equipped. ' : ''}${stats}`;
  }

  private fieldCast(engine: GameEngine, spellId: string) {
    const spell = SPELLS[spellId];
    if (!spell) return 'Unknown spell.';
    if (spell.kind !== 'healing') return `${spell.name} is battle-only.`;
    if (engine.state.player.stats.mp < spell.mpCost) return 'Not enough MP.';
    engine.state.player.stats.mp -= spell.mpCost;
    engine.state.player.stats.hp = Math.min(engine.state.player.stats.maxHp, engine.state.player.stats.hp + spell.power + engine.state.player.stats.magic);
    return `Cast ${spell.name}.`;
  }

  private shopOptions(engine: GameEngine): UiOption[] {
    const shop = engine.getShop(this.shopId);
    if (!shop) return [];
    if (this.shopMode === 'buy') {
      return shop.inventory.map((id) => {
        const item = ITEMS[id];
        const spell = SPELLS[id];
        return {
          id,
          label: item?.name ?? spell?.name ?? id,
          meta: item ? `${item.price}g - ${item.description}` : `${(spell?.mpCost ?? 5) * 18}g - ${spell?.description ?? ''}`,
          iconId: id
        };
      });
    }
    return Object.entries(engine.state.inventory)
      .filter(([id, qty]) => qty > 0 && ITEMS[id] && !ITEMS[id].keyItem && ITEMS[id].category !== 'keyItem')
      .map(([id, qty]) => ({ id, label: `${ITEMS[id].name} x${qty}`, meta: `${ITEMS[id].sellPrice ?? Math.floor(ITEMS[id].price * 0.45)}g`, iconId: id }));
  }

  private battleOptions(engine: GameEngine) {
    if (this.battleMode === 'magic') return engine.state.player.spells;
    if (this.battleMode === 'items') return Object.entries(engine.state.inventory).filter(([id]) => ITEMS[id]?.effect).map(([id]) => id);
    return ['attack', 'magic', 'item', 'defend', 'run'];
  }

  private battleTargets(battle: BattleState) {
    return battle.enemies.filter((enemy) => enemy.stats.hp > 0);
  }

  private openBattleTargets(command: 'attack' | 'magic', optionId = '') {
    this.battleMode = 'targets';
    this.battleTargetIndex = 0;
    this.battleTargetCommand = command;
    this.battleTargetOptionId = optionId;
  }

  private moveBattleCommand(dx: number, dy: number) {
    const columns = 2;
    const count = 5;
    const index = this.battleIndex;
    if (dx !== 0) {
      const rowStart = Math.floor(index / columns) * columns;
      const target = index + dx;
      if (target >= rowStart && target < Math.min(rowStart + columns, count)) this.battleIndex = target;
      return;
    }
    if (dy !== 0) {
      const row = Math.floor(index / columns);
      const col = index % columns;
      const targetRow = row + dy;
      if (targetRow < 0) return;
      this.battleIndex = Math.min(count - 1, targetRow * columns + col);
    }
  }

  private questTarget(engine: GameEngine) {
    const flags = engine.state.questFlags;
    if (!flags.spokeToElder) return { mapId: 'greenhollow', id: 'greenhollow_elder', label: 'Talk to Elder Rowan' };
    if (!flags.caveRelicFound) return { mapId: 'mossvale_relic_grotto', id: 'mossvale_relic_chest', label: 'Recover the Cave Relic' };
    if (!flags.relicReturned) return { mapId: 'greenhollow', id: 'greenhollow_elder', label: 'Return to Elder Rowan' };
    if (!flags.waymeetRoadEventSeen) return { mapId: 'overworld_main', id: 'route_waymeet_courier', label: 'Check the courier' };
    if (!flags.roadQuestStarted) return { mapId: 'waymeet', id: 'waymeet_broker', label: 'Speak to Broker Sel' };
    if (!flags.banditCaptainDefeated) return { mapId: 'dustbridge_ruins_map_room', id: 'dustbridge_ruins_boss', label: 'Defeat Rusk' };
    if (!flags.lumaireRiverEventSeen) return { mapId: 'overworld_main', id: 'route_lumaire_ferryman', label: 'Meet the ferryman' };
    if (!flags.shrineQuestStarted) return { mapId: 'lumaire', id: 'lumaire_oracle', label: 'Speak to Oracle Niva' };
    if (!flags.mireWardenDefeated) return { mapId: 'flooded_shrine_lumen_sanctum', id: 'flooded_shrine_boss', label: 'Defeat the Mire Warden' };
    if (!flags.ironmarchPassEventSeen) return { mapId: 'overworld_main', id: 'route_ironmarch_miner', label: 'Inspect the miner' };
    if (!flags.fortressQuestStarted) return { mapId: 'ironmarch', id: 'ironmarch_marshal', label: 'Speak to Marshal Brinn' };
    if (!flags.ironCastellanDefeated) return { mapId: 'ironvein_fortress_castellan_chamber', id: 'ironvein_fortress_boss', label: 'Break the Iron Castellan' };
    if (!flags.sunspireBellEventSeen) return { mapId: 'overworld_main', id: 'route_sunspire_bellrunner', label: 'Follow the bell runner' };
    if (!flags.routeToFinalUnlocked) return { mapId: 'sunspire', id: 'sunspire_keeper', label: 'Report to Keeper Aster' };
    if (!flags.eclipseRoadEventSeen) return { mapId: 'overworld_main', id: 'route_eclipse_page', label: 'Meet Aster\'s page' };
    if (!flags.hollowRegentDefeated) return { mapId: 'eclipse_tower_observatory', id: 'eclipse_tower_boss', label: 'Defeat the Hollow Regent' };
    return { mapId: engine.state.currentMapId, id: '', label: 'Main story complete' };
  }

  private tileMapColor(engine: GameEngine, x: number, y: number) {
    const map = engine.map;
    const layerOrder: TileLayerName[] = ['effects', 'upperObject', 'lowerObject', 'ground'];
    for (const layer of layerOrder) {
      const placed = map.layers[layer][y]?.[x];
      if (!placed) continue;
      const color = TILE_DEFINITIONS[placed.id]?.defaultProperties.color;
      if (typeof color === 'number') return `#${color.toString(16).padStart(6, '0')}`;
    }
    return '#1d2431';
  }

  private markerSvg(x: number, y: number, color: string, label: string, kind: string, radius: number, target = false) {
    const safeLabel = esc(label);
    return `
      <g class="map-marker ${target ? 'target' : ''}" data-kind="${esc(kind)}">
        ${target ? `<circle cx="${x}" cy="${y}" r="${radius * 2.2}" fill="none" stroke="#f1c75b" stroke-width="${Math.max(0.18, radius * 0.35)}" />` : ''}
        <circle cx="${x}" cy="${y}" r="${radius}" fill="${color}" stroke="#111820" stroke-width="${Math.max(0.12, radius * 0.22)}" />
        <title>${safeLabel}</title>
      </g>
    `;
  }

  private renderMapSvg(engine: GameEngine, mode: 'mini' | 'full') {
    const map = engine.map;
    const target = this.questTarget(engine);
    const maxCells = mode === 'mini' ? 38 : 72;
    const stride = Math.max(1, Math.ceil(Math.max(map.width / maxCells, map.height / maxCells)));
    const terrain: string[] = [];
    for (let y = 0; y < map.height; y += stride) {
      for (let x = 0; x < map.width; x += stride) {
        terrain.push(`<rect x="${x}" y="${y}" width="${stride}" height="${stride}" fill="${this.tileMapColor(engine, x, y)}" />`);
      }
    }
    const markerRadius = Math.max(mode === 'mini' ? 0.9 : 0.55, Math.min(map.width, map.height) / (mode === 'mini' ? 28 : 42));
    const markers: string[] = [];
    for (const transition of map.transitions) {
      if (transition.trigger.type !== 'bounds') continue;
      const bounds = transition.trigger.bounds;
      const x = bounds.x + bounds.width / 2;
      const y = bounds.y + bounds.height / 2;
      const toMap = MAPS[transition.toMap];
      const isTarget = target.mapId === transition.toMap;
      const color = toMap?.type === 'town' ? '#f1c75b' : toMap?.type === 'overworld' ? '#79c7ff' : '#ff8178';
      markers.push(this.markerSvg(x, y, color, toMap?.name ?? transition.toMap, 'exit', markerRadius, isTarget));
    }
    for (const object of engine.map.objects) {
      if (object.hiddenUntilFlag && !engine.state.questFlags[object.hiddenUntilFlag]) continue;
      if (object.removeWhenFlag && engine.state.questFlags[object.removeWhenFlag]) continue;
      const x = object.x + object.width / 2;
      const y = object.y + object.height / 2;
      const isTarget = target.mapId === map.id && target.id === object.id;
      const color =
        object.type === 'chest'
          ? '#f1c75b'
          : object.type === 'savePoint'
            ? '#79c7ff'
            : object.type === 'shopCounter' || object.type === 'innBed'
              ? '#8bd66b'
              : '#f5efd8';
      markers.push(this.markerSvg(x, y, color, object.text ?? object.type, object.type, markerRadius * 0.88, isTarget));
    }
    for (const npc of engine.map.npcs) {
      if (npc.hiddenUntilFlag && !engine.state.questFlags[npc.hiddenUntilFlag]) continue;
      const isTarget = target.mapId === map.id && target.id === npc.id;
      if (mode === 'mini' && !isTarget) continue;
      markers.push(this.markerSvg(npc.x + 0.5, npc.y + 0.5, '#f5efd8', npc.name, 'npc', markerRadius * 0.76, isTarget));
    }
    for (const enemy of engine.runtimeEnemies) {
      const isTarget = target.mapId === map.id && target.id === enemy.id;
      if (mode === 'mini' && !isTarget) continue;
      markers.push(this.markerSvg(enemy.worldX / TILE_SIZE, enemy.worldY / TILE_SIZE, enemy.boss ? '#ff8178' : '#d86b53', enemy.id, 'enemy', markerRadius * 0.72, isTarget));
    }
    const px = engine.state.player.worldX / TILE_SIZE;
    const py = engine.state.player.worldY / TILE_SIZE;
    markers.push(`
      <g class="map-player">
        <circle cx="${px}" cy="${py}" r="${markerRadius * 1.3}" fill="#ffffff" stroke="#111820" stroke-width="${Math.max(0.14, markerRadius * 0.25)}" />
        <circle cx="${px}" cy="${py}" r="${markerRadius * 0.45}" fill="#79c7ff" />
        <title>You are here</title>
      </g>
    `);
    return `
      <svg class="map-svg ${mode === 'mini' ? 'mini-map-svg' : 'full-map-svg'}" viewBox="0 0 ${map.width} ${map.height}" role="img" aria-label="${esc(map.name)} map">
        <rect x="0" y="0" width="${map.width}" height="${map.height}" fill="#111820" />
        ${terrain.join('')}
        ${markers.join('')}
      </svg>
    `;
  }

  private renderMapContent(engine: GameEngine, mode: 'panel' | 'overlay') {
    const target = this.questTarget(engine);
    const playerTile = {
      x: Math.floor(engine.state.player.worldX / TILE_SIZE),
      y: Math.floor(engine.state.player.worldY / TILE_SIZE)
    };
    const targetMapName = MAPS[target.mapId]?.name ?? target.mapId;
    return `
      <div class="map-content ${mode}">
        <div class="map-header">
          <div>
            <div class="panel-title">${esc(engine.map.name)}</div>
            <div class="muted">You are at ${playerTile.x}, ${playerTile.y}.</div>
          </div>
          <div class="map-destination"><span>Next</span>${esc(target.label)}${target.mapId !== engine.map.id ? `<br><em>${esc(targetMapName)}</em>` : ''}</div>
        </div>
        <div class="map-frame">${this.renderMapSvg(engine, 'full')}</div>
        <div class="map-legend">
          <span><b class="you"></b>You</span>
          <span><b class="goal"></b>Goal</span>
          <span><b class="exit"></b>Exit</span>
          <span><b class="enemy"></b>Enemy</span>
          <span><b class="service"></b>Shop/Save</span>
        </div>
      </div>
    `;
  }

  private renderHud(engine: GameEngine) {
    return `
      ${engine.prompt() && this.overlay === 'none' ? `<div class="prompt">E ${esc(engine.prompt())}</div>` : ''}
      ${engine.message ? `<div class="toast">${esc(engine.message)}</div>` : ''}
      ${engine.debug ? `<div class="debug-chip">F3 debug: collision / transitions / regions / aggro</div>` : ''}
    `;
  }

  private renderOverlay(engine: GameEngine) {
    if (this.overlay === 'dialogue') return this.renderDialogue();
    if (this.overlay === 'cutscene') return this.renderCutscene();
    if (this.overlay === 'menu') return this.renderMenu(engine);
    if (this.overlay === 'shop') return this.renderShop(engine);
    if (this.overlay === 'inn') return this.renderConfirm('Rest', this.notice || `Rest for ${this.innCost}g?`);
    if (this.overlay === 'bedRest') return this.renderConfirm('Sleep', this.notice || 'Sleep here?');
    if (this.overlay === 'savePoint') return this.renderConfirm('Save', this.notice || 'Save at this crystal?');
    if (this.overlay === 'map') return this.renderMapOverlay(engine);
    if (this.overlay === 'battle' && engine.currentBattle) return this.renderBattle(engine.currentBattle, engine);
    if (this.overlay === 'ending') return this.renderEnding();
    return '';
  }

  private renderDialogue() {
    return `
      <div class="dialogue">
        <div class="speaker">${esc(this.dialogue.speaker)}</div>
        <div class="dialogue-text">${esc(this.dialogue.lines[this.dialogue.index] ?? '')}</div>
        <div class="advance">E / Enter</div>
      </div>
    `;
  }

  private renderCutscene() {
    return `
      <div class="cutscene">
        <div class="speaker">${esc(this.dialogue.speaker)}</div>
        <div class="dialogue-text">${esc(this.dialogue.lines[this.dialogue.index] ?? '')}</div>
        <div class="advance">E / Enter</div>
      </div>
    `;
  }

  private itemIconHtml(iconId?: string) {
    const url = iconId ? itemIconUrlForId(iconId) : null;
    return url ? `<img class="item-icon" src="${esc(url)}" alt="" loading="lazy" decoding="async">` : '';
  }

  private renderOptionRow(option: UiOption, index: number, selected: boolean, className: 'line' | 'shop-row' = 'line') {
    return `
      <div class="${className} ${selected ? 'selected' : ''}">
        <span class="option-main">${this.itemIconHtml(option.iconId)}<span class="option-label">${esc(option.label)}</span></span>
        <span class="muted option-meta">${esc(option.meta)}</span>
      </div>
    `;
  }

  private renderBattleOption(iconId: string | undefined, label: string, selected: boolean) {
    return `
      <div class="command ${selected ? 'selected' : ''}">
        <span class="option-main">${this.itemIconHtml(iconId)}<span class="option-label">${esc(label)}</span></span>
      </div>
    `;
  }

  private renderBattleRewardItems(battle: BattleState) {
    const rewards = battle.rewards?.items ?? [];
    if (!rewards.length) return '';
    return `
      <div class="battle-rewards">
        ${rewards
          .map((reward) => {
            const item = ITEMS[reward.itemId];
            const label = `${item?.name ?? reward.itemId}${reward.quantity > 1 ? ` x${reward.quantity}` : ''}`;
            return `<span class="reward-item">${this.itemIconHtml(reward.itemId)}<span>${esc(label)}</span></span>`;
          })
          .join('')}
      </div>
    `;
  }

  private renderMenu(engine: GameEngine) {
    const tabs = this.menuTabs();
    const tab = tabs[this.menuTab];
    const options = this.menuOptions(engine);
    const status = engine.state.player.stats;
    const empty = `<div class="line muted">No entries here.</div>`;
    const content =
      tab === 'Status'
        ? `
          <div class="line">HP <span>${status.hp}/${status.maxHp}</span></div>
          <div class="line">MP <span>${status.mp}/${status.maxMp}</span></div>
          <div class="line">Attack <span>${status.attack}</span></div>
          <div class="line">Defense <span>${status.defense}</span></div>
          <div class="line">Speed <span>${status.speed}</span></div>
          <div class="line">Magic <span>${status.magic}</span></div>
          <div class="line">XP <span>${engine.state.player.xp}/${engine.state.player.xpToNext}</span></div>`
        : tab === 'Map'
          ? this.renderMapContent(engine, 'panel')
        : tab === 'Options'
          ? [
              `<div class="line">Move <span>WASD / Arrows</span></div>`,
              `<div class="line">Confirm <span>E / Enter / Space</span></div>`,
              `<div class="line">Menu <span>M / Tab</span></div>`,
              `<div class="line">Map <span>N</span></div>`,
              `<div class="line">Debug <span>F3</span></div>`,
              import.meta.env.DEV ? `<div class="line">Max stats <span>F9</span></div>` : '',
              import.meta.env.DEV ? `<div class="line">Unlock routes <span>F10</span></div>` : ''
            ].join('')
          : tab === 'Save' || tab === 'Load' || tab === 'Close'
            ? `<div class="line selected">${tab === 'Save' ? 'Save current checkpoint' : tab === 'Load' ? 'Load local save slot' : 'Return to game'}</div>`
            : options.length
              ? options
                  .map((option, index) => this.renderOptionRow(option, index, index === this.menuIndex))
                  .join('')
              : empty;
    return `
      <div class="panel">
        <div class="tabs">${tabs.map((name, index) => `<div class="tab ${index === this.menuTab ? 'selected' : ''}">${esc(name)}</div>`).join('')}</div>
        <div class="panel-body">
          <div class="panel-title">${esc(tab)}</div>
          <div class="content-list">${content}</div>
          ${this.notice ? `<p class="good">${esc(this.notice)}</p>` : ''}
          <p class="muted">Left/right tabs. Up/down select. Confirm acts. Cancel closes.</p>
        </div>
      </div>
    `;
  }

  private renderShop(engine: GameEngine) {
    const shop = engine.getShop(this.shopId);
    const options = this.shopOptions(engine);
    return `
      <div class="panel">
        <div class="tabs">
          <div class="panel-title">${esc(shop?.name ?? 'Shop')}</div>
          <div class="shop-toggle"><span class="${this.shopMode === 'buy' ? 'selected' : ''}">Buy</span><span class="${this.shopMode === 'sell' ? 'selected' : ''}">Sell</span></div>
          <div class="muted">Gold: ${engine.state.player.gold}g</div>
        </div>
        <div class="panel-body">
          <div class="content-list">
            ${
              options.length
                ? options.map((option, index) => this.renderOptionRow(option, index, index === this.shopIndex, 'shop-row')).join('')
                : '<div class="line muted">Nothing available.</div>'
            }
          </div>
          ${this.notice ? `<p class="good">${esc(this.notice)}</p>` : ''}
          <p class="muted">Left/right toggles buy/sell. Cancel exits.</p>
        </div>
      </div>
    `;
  }

  private renderConfirm(title: string, text: string) {
    return `
      <div class="dialogue">
        <div class="speaker">${esc(title)}</div>
        <div class="dialogue-text">${esc(text)}</div>
        <div class="advance">Confirm / Cancel</div>
      </div>
    `;
  }

  private renderMapOverlay(engine: GameEngine) {
    return `
      <div class="map-overlay">
        ${this.renderMapContent(engine, 'overlay')}
        <div class="advance">N / Confirm / Cancel</div>
      </div>
    `;
  }

  private renderBattle(battle: BattleState, engine: GameEngine) {
    const commands = ['Attack', 'Magic', 'Item', 'Defend', battle.escapeAllowed ? 'Run' : 'No Run'];
    const options = this.battleOptions(engine);
    const targets = this.battleTargets(battle);
    const right =
      this.battleMode === 'targets'
        ? targets.length
          ? targets
              .map((enemy, index) => `<div class="command target-command ${index === this.battleTargetIndex ? 'selected' : ''}"><span>${esc(enemy.name)}</span><span class="muted">${Math.max(0, enemy.stats.hp)}/${enemy.stats.maxHp}</span></div>`)
              .join('')
          : '<div class="command muted">No targets</div>'
      : this.battleMode === 'commands'
        ? commands.map((command, index) => `<div class="command ${index === this.battleIndex ? 'selected' : ''}">${command}</div>`).join('')
        : options
            .map((id, index) => {
              const label = this.battleMode === 'magic' ? `${SPELLS[id].name} (${SPELLS[id].mpCost} MP)` : `${ITEMS[id].name} x${engine.state.inventory[id]}`;
              return this.renderBattleOption(id, label, index === this.battleSubIndex);
            })
            .join('');
    const enemyLine = battle.enemies.map((enemy) => `${enemy.name} ${Math.max(0, enemy.stats.hp)}/${enemy.stats.maxHp}`).join(' | ');
    const commandTitle =
      this.battleMode === 'targets'
        ? this.battleTargetCommand === 'magic'
          ? `Target: ${SPELLS[this.battleTargetOptionId]?.name ?? 'Spell'}`
          : 'Target: Attack'
        : 'Commands';
    return `
      <div class="battle-panel">
        <div>
          <div class="battle-title">${esc(enemyLine)}</div>
          <div>Ari HP ${battle.player.stats.hp}/${battle.player.stats.maxHp} MP ${battle.player.stats.mp}/${battle.player.stats.maxMp}</div>
          <div class="battle-log">${battle.commandLog.slice(-5).map((line) => `<div>${esc(line)}</div>`).join('')}</div>
          ${this.renderBattleRewardItems(battle)}
          ${battle.phase === 'victory' || battle.phase === 'escaped' || battle.phase === 'defeat' ? '<p class="good">Confirm to continue.</p>' : ''}
        </div>
        <div>
          <div class="battle-title">${esc(commandTitle)}</div>
          <div class="commands ${this.battleMode === 'targets' ? 'target-list' : ''}">${right || '<div class="command muted">None</div>'}</div>
        </div>
      </div>
    `;
  }

  private renderEnding() {
    return `
      <div class="ending">
        <h1>Sword Guys</h1>
        <p>The Hollow Regent falls. Greenhollow's road, Waymeet's bridge, Lumaire's river, Ironmarch's forge, and Sunspire's bells all answer the same dawn.</p>
        <p class="muted">Main game complete.</p>
        <div class="ending-actions">
          <button class="${this.endingIndex === 0 ? 'selected' : ''}" data-ending-action="continue" type="button">Continue Exploring</button>
          <button class="${this.endingIndex === 1 ? 'selected' : ''}" data-ending-action="restart" type="button">Start Over</button>
        </div>
        <p class="muted">Confirm continues. Arrows choose. Cancel also continues.</p>
      </div>
    `;
  }
}

let singleton: UIManager | null = null;

export const getUIManager = () => {
  if (!singleton) {
    const root = document.getElementById('ui-root');
    if (!root) throw new Error('Missing #ui-root.');
    singleton = new UIManager(root);
  }
  return singleton;
};
