export const TILE_SIZE = 32;

export type Direction =
  | 'north'
  | 'northeast'
  | 'east'
  | 'southeast'
  | 'south'
  | 'southwest'
  | 'west'
  | 'northwest';

export type MapType = 'overworld' | 'town' | 'interior' | 'cave' | 'dungeon' | 'castle' | 'shrine' | 'special';
export type CameraMode = 'smoothFollow' | 'fixedScreen' | 'fixedRoom' | 'regionBased';
export type TileLayerName = 'ground' | 'lowerObject' | 'upperObject' | 'effects';
export type CollisionShape = null | 'full' | { x: number; y: number; width: number; height: number };

export interface TileDefinition {
  id: string;
  family: string;
  defaultProperties: TileProperties;
  variants?: string[];
  autotileRules?: string | null;
}

export interface TileProperties {
  walkable: boolean;
  collision: CollisionShape;
  terrain: string;
  movementCost?: number;
  layer: TileLayerName;
  occludesActor?: boolean;
  animation?: string[];
  tags?: string[];
  trigger?: TriggerDefinition;
  transition?: TransitionTarget;
  interactable?: InteractableDefinition;
  hazard?: HazardDefinition;
  oneWayMovement?: Direction[];
  soundSurface?: string;
  lighting?: string;
  color?: number;
}

export interface PlacedTile {
  id: string;
  overrides?: Partial<TileProperties>;
}

export type TileGrid = Array<Array<PlacedTile | null>>;

export interface TriggerDefinition {
  type: 'enter' | 'exit' | 'interact';
  script?: string;
}

export interface TransitionTarget {
  toMap: string;
  toSpawn: string;
  requiresFlag?: string;
  clearFlag?: string;
  clearFlags?: string[];
  lockedCollision?: boolean;
  blockedMessage?: string;
  transitionStyle?: 'fade' | 'cut' | 'slide';
}

export interface InteractableDefinition {
  kind: 'npc' | 'door' | 'chest' | 'sign' | 'shop' | 'inn' | 'savePoint' | 'transition' | 'boss';
  label?: string;
}

export interface HazardDefinition {
  damage: number;
  status?: StatusEffectId;
}

export interface MapDefinition {
  id: string;
  name: string;
  type: MapType;
  width: number;
  height: number;
  tileSize: number;
  cameraMode: CameraMode;
  defaultBiome: string;
  battleBackdrop: string;
  layers: Record<TileLayerName, TileGrid>;
  objects: MapObject[];
  npcs: NPCDefinition[];
  enemies: EnemyEntity[];
  regions: Region[];
  transitions: Transition[];
  spawnPoints: SpawnPoint[];
  music?: string;
  lighting?: string;
}

export interface MapObject {
  id: string;
  type: 'door' | 'gate' | 'chest' | 'sign' | 'savePoint' | 'shopCounter' | 'innBed' | 'relic' | 'bossSeal' | 'scenery';
  x: number;
  y: number;
  width: number;
  height: number;
  state?: 'closed' | 'open' | 'locked' | 'unlocked' | 'opened' | 'active';
  interactable?: boolean;
  collision?: CollisionShape;
  script?: string;
  text?: string;
  shopId?: string;
  innCost?: number;
  givesItemId?: string;
  transition?: TransitionTarget;
  requiresFlag?: string;
  hiddenUntilFlag?: string;
  removeWhenFlag?: string;
}

export interface Region {
  id: string;
  type: 'encounterZone' | 'safeZone' | 'cameraRegion' | 'district' | 'biome' | 'music' | 'lighting' | 'patrolTerritory';
  bounds: Rect;
  tags?: string[];
  encounterTable?: string;
  battleBackdrop?: string;
  dangerLevel?: number;
}

export interface Transition {
  id: string;
  fromMap: string;
  trigger:
    | { type: 'bounds'; bounds: Rect }
    | { type: 'edge'; direction: 'north' | 'south' | 'east' | 'west'; screenX?: number; screenY?: number }
    | { type: 'interact'; objectId: string }
    | { type: 'script'; script: string };
  toMap: string;
  toSpawn: string;
  requiresFlag?: string;
  clearFlag?: string;
  clearFlags?: string[];
  lockedCollision?: boolean;
  blockedMessage?: string;
  transitionStyle?: 'fade' | 'cut' | 'slide';
}

export interface SpawnPoint {
  id: string;
  x: number;
  y: number;
  facing?: Direction;
}

export interface NPCDefinition {
  id: string;
  name: string;
  x: number;
  y: number;
  facing: Direction;
  dialogueId: string;
  role?: 'objectiveGiver' | 'shopkeeper' | 'innkeeper' | 'guard' | 'rumor' | 'trainer' | 'blacksmith' | 'flavor';
  shopId?: string | null;
  innCost?: number;
  questHooks?: string[];
  hiddenUntilFlag?: string;
}

export interface EnemyEntity {
  id: string;
  encounterId: string;
  x: number;
  y: number;
  home: { x: number; y: number };
  territoryRegionId?: string;
  roamingRadius: number;
  aggroRadius: number;
  moveSpeed: number;
  behavior: EnemyBehavior;
  respawn: 'onMapReload' | 'onRest' | 'never';
  patrolPath?: Array<{ x: number; y: number }>;
  requiresFlag?: string;
  hiddenUntilFlag?: string;
  boss?: boolean;
}

export type EnemyBehavior =
  | 'passiveWanderer'
  | 'aggressiveWanderer'
  | 'patroller'
  | 'guard'
  | 'ambusher'
  | 'bossEntity';

export interface EnemyDefinition {
  id: string;
  name: string;
  family: string;
  biome: string;
  stats: CombatStats;
  xp: number;
  gold: number;
  actions: EnemyAction[];
  weaknesses?: string[];
  resistances?: string[];
  drops?: DropDefinition[];
  boss?: boolean;
  color: number;
}

export interface EncounterDefinition {
  id: string;
  name: string;
  enemyIds: string[];
  backdrop: string;
  escapeAllowed: boolean;
  questFlagOnVictory?: string;
  keyItemOnVictory?: string;
  endingOnVictory?: boolean;
}

export interface EnemyAction {
  id: string;
  label: string;
  power: number;
  kind: 'physical' | 'magic' | 'status';
  status?: StatusEffectId;
  weight?: number;
}

export interface DropDefinition {
  itemId: string;
  chance: number;
  quantity?: number;
}

export interface ItemDefinition {
  id: string;
  name: string;
  category: ItemCategory;
  description: string;
  price: number;
  sellPrice?: number;
  effect?: ItemEffect;
  equipmentSlot?: EquipmentSlot;
  stats?: Partial<CombatStats>;
  keyItem?: boolean;
}

export interface EquipmentDefinition extends ItemDefinition {
  equipmentSlot: EquipmentSlot;
  stats: Partial<CombatStats>;
}

export interface SpellDefinition {
  id: string;
  name: string;
  mpCost: number;
  power: number;
  kind: 'damage' | 'healing' | 'utility' | 'buff' | 'debuff';
  element?: string;
  description: string;
}

export type ItemCategory =
  | 'consumable'
  | 'weapon'
  | 'helmet'
  | 'bodyArmor'
  | 'legArmor'
  | 'shield'
  | 'accessory'
  | 'spell'
  | 'keyItem'
  | 'material';

export type EquipmentSlot =
  | 'weapon'
  | 'helmet'
  | 'bodyArmor'
  | 'legArmor'
  | 'shield'
  | 'accessory1'
  | 'accessory2';

export type ItemEffect =
  | { type: 'healHp'; amount: number }
  | { type: 'healMp'; amount: number }
  | { type: 'cureStatus'; status?: StatusEffectId }
  | { type: 'learnSpell'; spellId: string };

export type StatusEffectId = 'poison' | 'slow' | 'burn' | 'stun' | 'attackDown' | 'defenseDown';

export interface ShopDefinition {
  id: string;
  name: string;
  type: 'general' | 'weapon' | 'armor' | 'magic' | 'inn' | 'specialty';
  townId: string;
  inventory: string[];
  buyMultiplier?: number;
  sellMultiplier?: number;
}

export interface QuestDefinition {
  id: string;
  title: string;
  state: 'inactive' | 'active' | 'completed';
  currentStep: string;
  steps: Record<string, QuestStep>;
  rewards: QuestReward;
}

export interface QuestStep {
  type: 'talk' | 'findItem' | 'findPerson' | 'deliverItem' | 'defeatEnemy' | 'reachLocation' | 'unlockPath' | 'investigate' | 'returnReport';
  npcId?: string;
  itemId?: string;
  enemyId?: string;
  mapId?: string;
  summary: string;
}

export interface QuestReward {
  gold?: number;
  items?: string[];
  flags?: string[];
  spells?: string[];
}

export interface CombatStats {
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  attack: number;
  defense: number;
  speed: number;
  magic: number;
}

export interface PlayerState {
  name: string;
  level: number;
  xp: number;
  xpToNext: number;
  gold: number;
  stats: CombatStats;
  baseStats: CombatStats;
  equipment: Record<EquipmentSlot, string | null>;
  spells: string[];
  worldX: number;
  worldY: number;
  facing: Direction;
  movementHoldMs: number;
  moving: boolean;
}

export interface GameState {
  currentMapId: string;
  currentSpawnId: string;
  player: PlayerState;
  questFlags: Record<string, boolean>;
  activeQuestIds: string[];
  completedQuestIds: string[];
  inventory: Record<string, number>;
  keyItems: Record<string, boolean>;
  gameLog: string[];
  mapState: Record<string, MapRuntimeState>;
  checkpoint: SaveSnapshot | null;
  endingReached: boolean;
}

export interface MapRuntimeState {
  openedObjects: Record<string, boolean>;
  defeatedEnemies: Record<string, boolean>;
  unlockedObjects: Record<string, boolean>;
}

export interface SleepVisualEffect {
  mapId: string;
  bedX: number;
  bedY: number;
  wakeX: number;
  wakeY: number;
  wakeFacing: Direction;
}

export interface SaveSnapshot {
  version: number;
  savedAt: string;
  state: GameState;
}

export interface BattleState {
  id: string;
  sourceMapId: string;
  sourceEnemyEntityId: string;
  encounterId: string;
  enemies: BattleActor[];
  player: BattleActor;
  phase: 'intro' | 'playerTurn' | 'enemyTurn' | 'victory' | 'defeat' | 'escaped';
  commandLog: string[];
  rewards: BattleRewards | null;
  escapeAllowed: boolean;
  backdrop: string;
}

export interface BattleCommandResult {
  battle: BattleState;
  consumedTurn: boolean;
  message: string;
}

export type BattleVisualEvent =
  | { type: 'playerAttack'; targetId: string }
  | { type: 'playerMagic'; targetId: string; spellId: string; element?: string }
  | { type: 'playerHeal'; spellId?: string; itemId?: string }
  | { type: 'playerDefend' }
  | { type: 'playerItem'; itemId: string }
  | { type: 'playerRun'; success: boolean }
  | { type: 'enemyAttack'; sourceId: string; actionId: string; kind: EnemyAction['kind'] };

export interface BattleActor {
  id: string;
  name: string;
  stats: CombatStats;
  defending?: boolean;
  statuses?: StatusEffectId[];
  color?: number;
}

export interface BattleRewards {
  xp: number;
  gold: number;
  items: Array<{ itemId: string; quantity: number }>;
  flags: string[];
}

export interface InputActionState {
  moveX: number;
  moveY: number;
  confirmPressed: boolean;
  cancelPressed: boolean;
  menuPressed: boolean;
  mapPressed: boolean;
  debugPressed: boolean;
  playtestPowerPressed: boolean;
  playtestRoutesPressed: boolean;
  upPressed: boolean;
  downPressed: boolean;
  leftPressed: boolean;
  rightPressed: boolean;
}

export type InputAction =
  | 'moveNorth'
  | 'moveSouth'
  | 'moveWest'
  | 'moveEast'
  | 'confirm'
  | 'cancel'
  | 'openMenu'
  | 'openMap'
  | 'toggleDebug';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DialogueResult {
  type: 'dialogue';
  speaker: string;
  lines: string[];
}

export interface ShopResult {
  type: 'shop';
  shopId: string;
}

export interface InnResult {
  type: 'inn';
  innCost: number;
  name: string;
}

export interface SavePointResult {
  type: 'savePoint';
  name: string;
}

export interface BedRestResult {
  type: 'bedRest';
  name: string;
}

export interface TransitionResult {
  type: 'transition';
  target: TransitionTarget;
}

export interface EmptyInteractionResult {
  type: 'none';
  message?: string;
}

export type InteractionResult = DialogueResult | ShopResult | InnResult | SavePointResult | BedRestResult | TransitionResult | EmptyInteractionResult;
