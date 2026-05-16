export type AssetKind = 'npcSprite' | 'enemySprite' | 'battleBackdrop' | 'tileset' | 'spellEffect';
export type AssetStatus = 'approved' | 'integrated-placeholder' | 'planned' | 'needs-generation';
export type AssetProductionSource = 'purpose-built-imagegen';

export interface AssetProductionEvidence {
  source: AssetProductionSource;
  generatedFor: 'sword-guys';
  reviewNote: string;
}

export interface ImageGenAssetEntry {
  id: string;
  kind: AssetKind;
  status: AssetStatus;
  targetPath: string;
  prompt: string;
  production?: AssetProductionEvidence;
  frameWidth?: number;
  frameHeight?: number;
  frameCount?: number;
  frameDurationMs?: number;
  references?: string[];
  notes?: string;
}

const npcPrompt = (name: string, role: string, town: string, visual: string) =>
  `Create a 64x64 top-down pixel RPG overworld NPC sprite for ${name}, ${role} in ${town}. ${visual}. Transparent background, crisp pixel-art clusters, readable face and outfit at 32px display scale, no scenery, no text, no watermark.`;

const enemyPrompt = (name: string, family: string, region: string, visual: string) =>
  `Create a compact pixel-art battle sprite for ${name}, a ${family} enemy from ${region}. ${visual}. Transparent background, strong silhouette, readable at 3x battle scale, no scenery, no text, no watermark.`;

const backdropPrompt = (name: string, visual: string) =>
  `Create a 16:9 pixel-art JRPG battle backdrop for ${name}. ${visual}. Leave readable floor/ground space for Ari on the left and enemies on the right, keep the lower UI area visually quiet, no characters, no text, no watermark.`;

const tilesetPrompt = (name: string, visual: string) =>
  `Create a 32x32-tile pixel-art environment tileset for ${name}. ${visual}. Orthographic top-down RPG readability, seamless ground variants, collision-friendly props, no labels, no text, no watermark.`;

const spellPrompt = (name: string, visual: string) =>
  `Create a short transparent pixel-art spell effect strip for ${name}. ${visual}. Evenly spaced frames, centered impact/cast effect, crisp edges, no character, no scenery, no text, no watermark.`;

const productionImageGen = (reviewNote: string): AssetProductionEvidence => ({
  source: 'purpose-built-imagegen',
  generatedFor: 'sword-guys',
  reviewNote
});

const GREENHOLLOW_NPC_PRODUCTION = productionImageGen('Purpose-built Sword Guys Greenhollow NPC sheet accepted as first-village production art.');
const GREENHOLLOW_BACKDROP_PRODUCTION = productionImageGen('Purpose-built Sword Guys first-region battle backdrop accepted for the Greenhollow field encounter family.');
const GREENHOLLOW_TILE_PRODUCTION = productionImageGen('Purpose-built Sword Guys foundation tileset accepted for Greenhollow, overworld, and shared interior map rendering.');

export const NPC_ASSETS: ImageGenAssetEntry[] = [
  {
    id: 'greenhollow_elder',
    kind: 'npcSprite',
    status: 'approved',
    targetPath: 'public/assets/characters/npcs/greenhollow-npcs.png',
    references: ['public/assets/characters/npcs/greenhollow-npcs-preview.png'],
    prompt: npcPrompt('Elder Rowan', 'village elder and first quest giver', 'Greenhollow', 'Gray hair, walking staff, green-and-gold village robes, calm authority'),
    production: GREENHOLLOW_NPC_PRODUCTION,
    notes: 'Integrated in the Greenhollow NPC sheet, frame 0.'
  },
  {
    id: 'greenhollow_guard',
    kind: 'npcSprite',
    status: 'approved',
    targetPath: 'public/assets/characters/npcs/greenhollow-npcs.png',
    references: ['public/assets/characters/npcs/greenhollow-npcs-preview.png'],
    prompt: npcPrompt('Gate Guard', 'route guard', 'Greenhollow', 'Spear, simple helmet, gray-blue guard tunic, practical stance'),
    production: GREENHOLLOW_NPC_PRODUCTION,
    notes: 'Integrated in the Greenhollow NPC sheet, frame 1.'
  },
  {
    id: 'greenhollow_rumor',
    kind: 'npcSprite',
    status: 'approved',
    targetPath: 'public/assets/characters/npcs/greenhollow-npcs.png',
    references: ['public/assets/characters/npcs/greenhollow-npcs-preview.png'],
    prompt: npcPrompt('Mara', 'rumor villager', 'Greenhollow', 'Basket, warm hair, green village clothes, curious posture'),
    production: GREENHOLLOW_NPC_PRODUCTION,
    notes: 'Integrated in the Greenhollow NPC sheet, frame 2.'
  },
  {
    id: 'greenhollow_shop_keeper',
    kind: 'npcSprite',
    status: 'approved',
    targetPath: 'public/assets/characters/npcs/greenhollow-npcs.png',
    references: ['public/assets/characters/npcs/greenhollow-npcs-preview.png'],
    prompt: npcPrompt('Greenhollow General keeper', 'shopkeeper', 'Greenhollow', 'Satchel, tan cap, warm shop apron, welcoming market pose'),
    production: GREENHOLLOW_NPC_PRODUCTION,
    notes: 'Integrated in the Greenhollow NPC sheet, frame 3.'
  },
  {
    id: 'greenhollow_inn_keeper',
    kind: 'npcSprite',
    status: 'approved',
    targetPath: 'public/assets/characters/npcs/greenhollow-npcs.png',
    references: ['public/assets/characters/npcs/greenhollow-npcs-preview.png'],
    prompt: npcPrompt('Greenhollow Inn Keeper', 'innkeeper', 'Greenhollow', 'Basket, red-brown tunic, soft hospitality silhouette'),
    production: GREENHOLLOW_NPC_PRODUCTION,
    notes: 'Integrated in the Greenhollow NPC sheet, frame 4.'
  },
  {
    id: 'waymeet_broker',
    kind: 'npcSprite',
    status: 'approved',
    targetPath: 'public/assets/characters/npcs/waymeet-broker.png',
    prompt: npcPrompt('Broker Sel', 'merchant objective giver', 'Waymeet', 'Trade ledger, road cloak, coin-brass accents, calculating posture'),
    notes: 'Purpose-built image-gen sprite normalized to a 64x64 transparent PNG and loaded as npc:waymeet_broker.',
    production: { source: 'purpose-built-imagegen', generatedFor: 'sword-guys', reviewNote: 'Purpose-built Waymeet Broker sprite generated from the staged manifest prompt, checkerboard-cleaned, normalized to a 64x64 transparent PNG, and visually reviewed on dark and light backgrounds for 32px overworld readability.' }
  },
  {
    id: 'waymeet_scout',
    kind: 'npcSprite',
    status: 'approved',
    targetPath: 'public/assets/characters/npcs/waymeet-scout.png',
    prompt: npcPrompt('Road Scout', 'rumor scout', 'Waymeet', 'Dusty green road gear, satchel, short travel cloak, alert stance'),
    notes: 'Purpose-built image-gen sprite normalized to a 64x64 transparent PNG and loaded as npc:waymeet_scout.',
    production: { source: 'purpose-built-imagegen', generatedFor: 'sword-guys', reviewNote: 'Purpose-built Waymeet Scout sprite generated from the staged manifest prompt, checkerboard-cleaned, normalized to a 64x64 transparent PNG, and visually reviewed on dark and light backgrounds for 32px overworld readability.' }
  },
  {
    id: 'waymeet_shop_keeper',
    kind: 'npcSprite',
    status: 'approved',
    targetPath: 'public/assets/characters/npcs/waymeet-shop-keeper.png',
    prompt: npcPrompt('Waymeet Outfitter keeper', 'outfitter shopkeeper', 'Waymeet', 'Tool belt, folded cloth, merchant vest, road-market palette'),
    notes: 'Purpose-built image-gen sprite normalized to a 64x64 transparent PNG and loaded as npc:waymeet_shop_keeper.',
    production: { source: 'purpose-built-imagegen', generatedFor: 'sword-guys', reviewNote: 'Purpose-built Waymeet Shop Keeper sprite generated from the staged manifest prompt, checkerboard-cleaned, normalized to a 64x64 transparent PNG, and visually reviewed on dark and light backgrounds for 32px overworld readability.' }
  },
  {
    id: 'waymeet_inn_keeper',
    kind: 'npcSprite',
    status: 'approved',
    targetPath: 'public/assets/characters/npcs/waymeet-inn-keeper.png',
    prompt: npcPrompt('Waymeet Inn Keeper', 'innkeeper', 'Waymeet', 'Travel apron, kettle or towel detail, warm road-stop colors'),
    notes: 'Purpose-built image-gen sprite normalized to a 64x64 transparent PNG and loaded as npc:waymeet_inn_keeper.',
    production: { source: 'purpose-built-imagegen', generatedFor: 'sword-guys', reviewNote: 'Purpose-built Waymeet Inn Keeper sprite generated from the staged manifest prompt, checkerboard-cleaned, normalized to a 64x64 transparent PNG, and visually reviewed on dark and light backgrounds for 32px overworld readability.' }
  },
  {
    id: 'lumaire_oracle',
    kind: 'npcSprite',
    status: 'approved',
    targetPath: 'public/assets/characters/npcs/lumaire-oracle.png',
    prompt: npcPrompt('Oracle Niva', 'river oracle and trainer', 'Lumaire', 'Blue-violet robe, river-glass charm, book or bell, calm magical posture'),
    production: { source: 'purpose-built-imagegen', generatedFor: 'sword-guys', reviewNote: 'Purpose-built Lumaire Oracle sprite generated from the staged manifest prompt, chroma-key-cleaned, normalized to a 64x64 transparent PNG, and visually reviewed on dark and light backgrounds for 32px overworld readability, blue-violet river-oracle silhouette, bell/book detail, and no scenery or text.' },
    notes: 'Purpose-built image-gen sprite normalized to a 64x64 transparent PNG and loaded as npc:lumaire_oracle.'
  },
  {
    id: 'lumaire_student',
    kind: 'npcSprite',
    status: 'approved',
    targetPath: 'public/assets/characters/npcs/lumaire-student.png',
    prompt: npcPrompt('River Student', 'magic flavor NPC', 'Lumaire', 'Novice robe, damp sleeves, small spellbook, anxious-but-bright expression'),
    production: { source: 'purpose-built-imagegen', generatedFor: 'sword-guys', reviewNote: 'Purpose-built Lumaire Student sprite generated from the staged manifest prompt, chroma-key-cleaned, normalized to a 64x64 transparent PNG, and visually reviewed on dark and light backgrounds for 32px overworld readability, novice robe, spellbook silhouette, and no scenery or text.' },
    notes: 'Purpose-built image-gen sprite normalized to a 64x64 transparent PNG and loaded as npc:lumaire_student.'
  },
  {
    id: 'lumaire_shop_keeper',
    kind: 'npcSprite',
    status: 'approved',
    targetPath: 'public/assets/characters/npcs/lumaire-shop-keeper.png',
    prompt: npcPrompt('Lumaire Arcana keeper', 'magic shopkeeper', 'Lumaire', 'Arcane shop apron, river-blue trim, scroll bundle, gentle scholar stance'),
    production: { source: 'purpose-built-imagegen', generatedFor: 'sword-guys', reviewNote: 'Purpose-built Lumaire Shop Keeper sprite generated from the staged manifest prompt, chroma-key-cleaned, normalized to a 64x64 transparent PNG, and visually reviewed on dark and light backgrounds for 32px overworld readability, arcana-shop apron silhouette, scroll bundle, non-textual apron mark, and no scenery or text.' },
    notes: 'Purpose-built image-gen sprite normalized to a 64x64 transparent PNG and loaded as npc:lumaire_shop_keeper.'
  },
  {
    id: 'lumaire_inn_keeper',
    kind: 'npcSprite',
    status: 'approved',
    targetPath: 'public/assets/characters/npcs/lumaire-inn-keeper.png',
    prompt: npcPrompt('Lumaire Inn Keeper', 'innkeeper', 'Lumaire', 'Blue-green inn clothes, lantern, ferry-town hospitality'),
    production: { source: 'purpose-built-imagegen', generatedFor: 'sword-guys', reviewNote: 'Purpose-built Lumaire Inn Keeper sprite generated from the staged manifest prompt, chroma-key-cleaned, normalized to a 64x64 transparent PNG, and visually reviewed on dark and light backgrounds for 32px overworld readability, lantern silhouette, warm inn apron, ferry-town palette, and no scenery or text.' },
    notes: 'Purpose-built image-gen sprite normalized to a 64x64 transparent PNG and loaded as npc:lumaire_inn_keeper.'
  },
  {
    id: 'ironmarch_marshal',
    kind: 'npcSprite',
    status: 'approved',
    targetPath: 'public/assets/characters/npcs/ironmarch-marshal.png',
    prompt: npcPrompt('Marshal Brinn', 'forge-town objective giver', 'Ironmarch', 'Dark armor coat, iron badge, strong squared stance, forge-warm trim'),
    production: { source: 'purpose-built-imagegen', generatedFor: 'sword-guys', reviewNote: 'Purpose-built Ironmarch Marshal NPC sprite generated from the staged manifest prompt, green-key-cleaned, normalized to a 64x64 transparent PNG with a bottom-middle map anchor, and visually reviewed on dark and light backgrounds for 32px overworld readability, dark armor coat, iron badge shape without lettering, squared stance, forge-warm trim, and no scenery or text.' },
    notes: 'Purpose-built image-gen sprite normalized to a 64x64 transparent PNG and loaded as npc:ironmarch_marshal.'
  },
  {
    id: 'ironmarch_miner',
    kind: 'npcSprite',
    status: 'approved',
    targetPath: 'public/assets/characters/npcs/ironmarch-miner.png',
    prompt: npcPrompt('Tired Miner', 'rumor miner', 'Ironmarch', 'Work cap, hammer, dusty mining clothes, tired shoulders'),
    production: { source: 'purpose-built-imagegen', generatedFor: 'sword-guys', reviewNote: 'Purpose-built Ironmarch Miner NPC sprite generated from the staged manifest prompt, green-key-cleaned, normalized to a 64x64 transparent PNG with a bottom-middle map anchor, and visually reviewed on dark and light backgrounds for 32px overworld readability, dusty work cap, small hammer, tired slumped posture, soot-smudged mining clothes, and no scenery or text.' },
    notes: 'Purpose-built image-gen sprite normalized to a 64x64 transparent PNG and loaded as npc:ironmarch_miner.'
  },
  {
    id: 'ironmarch_shop_keeper',
    kind: 'npcSprite',
    status: 'approved',
    targetPath: 'public/assets/characters/npcs/ironmarch-shop-keeper.png',
    prompt: npcPrompt('Ironmarch Armory keeper', 'armory shopkeeper', 'Ironmarch', 'Leather apron, steel tongs or hammer, soot marks, forge palette'),
    production: { source: 'purpose-built-imagegen', generatedFor: 'sword-guys', reviewNote: 'Purpose-built Ironmarch Shop Keeper NPC sprite generated from the staged manifest prompt, green-key-cleaned, normalized to a 64x64 transparent PNG with a bottom-middle map anchor, and visually reviewed on dark and light backgrounds for 32px overworld readability, dark leather apron, forge palette, soot/tool-belt silhouette, sturdy merchant stance, and no scenery or text.' },
    notes: 'Purpose-built image-gen sprite normalized to a 64x64 transparent PNG and loaded as npc:ironmarch_shop_keeper.'
  },
  {
    id: 'ironmarch_inn_keeper',
    kind: 'npcSprite',
    status: 'approved',
    targetPath: 'public/assets/characters/npcs/ironmarch-inn-keeper.png',
    prompt: npcPrompt('Ironmarch Inn Keeper', 'innkeeper', 'Ironmarch', 'Heavy cloth apron, warm lantern, forge-town hospitality'),
    production: { source: 'purpose-built-imagegen', generatedFor: 'sword-guys', reviewNote: 'Purpose-built Ironmarch Inn Keeper NPC sprite regenerated with crop-safe framing, green-key-cleaned with corrected non-cropping resize geometry, normalized to a 64x64 transparent PNG with a bottom-middle map anchor, and visually reviewed on dark and light backgrounds for complete head/hair visibility, heavy cloth apron, warm lantern, forge-town hospitality silhouette, amber highlights, and no scenery or text.' },
    notes: 'Purpose-built image-gen sprite normalized to a 64x64 transparent PNG and loaded as npc:ironmarch_inn_keeper.'
  },
  {
    id: 'sunspire_keeper',
    kind: 'npcSprite',
    status: 'approved',
    targetPath: 'public/assets/characters/npcs/sunspire-keeper.png',
    prompt: npcPrompt('Keeper Aster', 'capital keeper and final quest giver', 'Sunspire', 'Gold-and-white archive robe, key motif, dignified stillness'),
    production: { source: 'purpose-built-imagegen', generatedFor: 'sword-guys', reviewNote: 'Purpose-built Sunspire Keeper NPC sprite generated from the staged manifest prompt, green-key-cleaned, normalized to a 64x64 transparent PNG with a bottom-middle map anchor, and visually reviewed on dark and light backgrounds for 32px overworld readability, complete head and hood framing, white-and-gold archive robe, small key motif without lettering, dignified final-quest-giver posture, and no scenery or text.' },
    notes: 'Purpose-built image-gen sprite normalized to a 64x64 transparent PNG and loaded as npc:sunspire_keeper.'
  },
  {
    id: 'sunspire_captain',
    kind: 'npcSprite',
    status: 'approved',
    targetPath: 'public/assets/characters/npcs/sunspire-captain.png',
    prompt: npcPrompt('Capital Captain', 'Sunspire guard captain', 'Sunspire', 'Polished guard armor, gold-blue tabard, command posture'),
    production: { source: 'purpose-built-imagegen', generatedFor: 'sword-guys', reviewNote: 'Purpose-built Sunspire Captain NPC sprite generated from the staged manifest prompt, green-key-cleaned, normalized to a 64x64 transparent PNG with a bottom-middle map anchor, and visually reviewed on dark and light backgrounds for 32px overworld readability, complete head and cape framing, polished silver armor, gold-blue tabard, upright command posture, and no scenery or text.' },
    notes: 'Purpose-built image-gen sprite normalized to a 64x64 transparent PNG and loaded as npc:sunspire_captain.'
  },
  {
    id: 'sunspire_shop_keeper',
    kind: 'npcSprite',
    status: 'approved',
    targetPath: 'public/assets/characters/npcs/sunspire-shop-keeper.png',
    prompt: npcPrompt('Sunspire Grand Market keeper', 'late-game market shopkeeper', 'Sunspire', 'Fine market robe, gold trim, rare goods satchel, confident merchant stance'),
    production: { source: 'purpose-built-imagegen', generatedFor: 'sword-guys', reviewNote: 'Purpose-built Sunspire Shop Keeper NPC sprite generated from the staged manifest prompt, green-key-cleaned, normalized to a 64x64 transparent PNG with a bottom-middle map anchor, and visually reviewed on dark and light backgrounds for 32px overworld readability, complete cap/head framing, fine market robe, gold trim, rare-goods satchel, presenting hand silhouette, and no scenery or text.' },
    notes: 'Purpose-built image-gen sprite normalized to a 64x64 transparent PNG and loaded as npc:sunspire_shop_keeper.'
  },
  {
    id: 'sunspire_inn_keeper',
    kind: 'npcSprite',
    status: 'approved',
    targetPath: 'public/assets/characters/npcs/sunspire-inn-keeper.png',
    prompt: npcPrompt('Sunspire Inn Keeper', 'capital innkeeper', 'Sunspire', 'Clean white-and-gold inn clothes, bell motif, calm elegance'),
    production: { source: 'purpose-built-imagegen', generatedFor: 'sword-guys', reviewNote: 'Purpose-built Sunspire Inn Keeper NPC sprite generated from the staged manifest prompt, green-key-cleaned, normalized to a 64x64 transparent PNG with a bottom-middle map anchor, and visually reviewed on dark and light backgrounds for 32px overworld readability, complete head/cap framing, clean white-and-gold inn clothes, apron/robe layer, small bell motif, calm hospitality posture, and no scenery or text.' },
    notes: 'Purpose-built image-gen sprite normalized to a 64x64 transparent PNG and loaded as npc:sunspire_inn_keeper.'
  },
  {
    id: 'route_waymeet_courier',
    kind: 'npcSprite',
    status: 'approved',
    targetPath: 'public/assets/characters/npcs/route-waymeet-courier.png',
    prompt: npcPrompt('Wounded Courier', 'route-event courier', 'the Waymeet road', 'Dusty cloak, courier tag, bandaged arm, urgent wounded posture'),
    notes: 'Purpose-built image-gen sprite normalized to a 64x64 transparent PNG and loaded as npc:route_waymeet_courier.',
    production: { source: 'purpose-built-imagegen', generatedFor: 'sword-guys', reviewNote: 'Purpose-built Waymeet Courier sprite generated from the staged manifest prompt, checkerboard-cleaned, normalized to a 64x64 transparent PNG, and visually reviewed on dark and light backgrounds for 32px overworld readability.' }
  },
  {
    id: 'route_lumaire_ferryman',
    kind: 'npcSprite',
    status: 'approved',
    targetPath: 'public/assets/characters/npcs/route-lumaire-ferryman.png',
    prompt: npcPrompt('Stranded Ferryman', 'route-event ferryman', 'the Lumaire crossing', 'Blue-gray river coat, ferry pole, wary stance, wet boots'),
    production: { source: 'purpose-built-imagegen', generatedFor: 'sword-guys', reviewNote: 'Purpose-built Lumaire Ferryman route-event sprite generated from the staged manifest prompt, chroma-key-cleaned, normalized to a 64x64 transparent PNG, and visually reviewed on dark and light backgrounds for 32px overworld readability, ferry-pole silhouette, wet blue-gray river coat, wary stance, and no scenery or text.' },
    notes: 'Purpose-built image-gen sprite normalized to a 64x64 transparent PNG and loaded as npc:route_lumaire_ferryman.'
  },
  {
    id: 'route_ironmarch_miner',
    kind: 'npcSprite',
    status: 'approved',
    targetPath: 'public/assets/characters/npcs/route-ironmarch-miner.png',
    prompt: npcPrompt('Ash-Covered Miner', 'route-event survivor', 'the Ironmarch pass', 'Sooty miner clothes, cracked lamp, ash on shoulders, shaken posture'),
    production: { source: 'purpose-built-imagegen', generatedFor: 'sword-guys', reviewNote: 'Purpose-built Route Ironmarch Miner NPC sprite regenerated with crop-safe framing, green-key-cleaned with corrected non-cropping resize geometry, normalized to a 64x64 transparent PNG with a bottom-middle map anchor, and visually reviewed on dark and light backgrounds for complete helmet/head visibility, soot-dark mining clothes, ash-coated shoulders, low cracked lantern silhouette, shaken survivor posture, and no scenery or text.' },
    notes: 'Purpose-built image-gen sprite normalized to a 64x64 transparent PNG and loaded as npc:route_ironmarch_miner.'
  },
  {
    id: 'route_sunspire_bellrunner',
    kind: 'npcSprite',
    status: 'approved',
    targetPath: 'public/assets/characters/npcs/route-sunspire-bellrunner.png',
    prompt: npcPrompt('Bell Runner', 'route-event messenger', 'the Sunspire road', 'Gold-blue messenger sash, hand bell, running cloak, urgent capital-road silhouette'),
    production: { source: 'purpose-built-imagegen', generatedFor: 'sword-guys', reviewNote: 'Purpose-built Sunspire Bell Runner route-event NPC sprite generated from the staged manifest prompt, green-key-cleaned, normalized to a 64x64 transparent PNG with a bottom-middle map anchor, and visually reviewed on dark and light backgrounds for 32px overworld readability, complete head/bell/cloak framing, gold-blue messenger sash, compact running posture, urgent capital-road silhouette, and no scenery or text.' },
    notes: 'Purpose-built image-gen sprite normalized to a 64x64 transparent PNG and loaded as npc:route_sunspire_bellrunner.'
  },
  {
    id: 'route_eclipse_page',
    kind: 'npcSprite',
    status: 'approved',
    targetPath: 'public/assets/characters/npcs/route-eclipse-page.png',
    prompt: npcPrompt("Aster's Page", 'route-event page', 'the Eclipse Tower road', 'White-and-gold page uniform, small key satchel, nervous final-road posture'),
    production: { source: 'purpose-built-imagegen', generatedFor: 'sword-guys', reviewNote: 'Purpose-built Eclipse Page route-event NPC sprite generated from the staged manifest prompt, green-key-cleaned, normalized to a 64x64 transparent PNG with a bottom-middle map anchor, and visually reviewed on dark and light backgrounds for 32px overworld readability, complete head/satchel/boots framing, white-and-gold page uniform, small key satchel, anxious final-road posture, and no scenery or text.' },
    notes: 'Purpose-built image-gen sprite normalized to a 64x64 transparent PNG and loaded as npc:route_eclipse_page.'
  }
];

export const ENEMY_ASSETS: ImageGenAssetEntry[] = [
  { id: 'field_slime', kind: 'enemySprite', status: 'approved', targetPath: 'public/assets/characters/enemies/field-slime.png', prompt: enemyPrompt('Field Slime', 'slime', 'Greenhollow fields', 'Soft green blob, bright wet highlight, simple friendly-danger read'), notes: 'Purpose-built image-gen sprite normalized to a 64x64 transparent PNG and loaded as enemy:field_slime.',
    production: { source: 'purpose-built-imagegen', generatedFor: 'sword-guys', reviewNote: 'Purpose-built Field Slime sprite generated from the staged manifest prompt, chroma-keyed, normalized to 64x64, and visually reviewed in the asset QA gallery.' }
  },
  { id: 'mire_slug', kind: 'enemySprite', status: 'approved', targetPath: 'public/assets/characters/enemies/mire-slug.png', prompt: enemyPrompt('Mire Slug', 'slime', 'Greenhollow fields', 'Longer green slug body, damp underside, low silhouette'), notes: 'Purpose-built image-gen sprite normalized to a 64x64 transparent PNG and loaded as enemy:mire_slug.',
    production: { source: 'purpose-built-imagegen', generatedFor: 'sword-guys', reviewNote: 'Purpose-built Mire Slug sprite generated from the staged manifest prompt, chroma-keyed, normalized to 64x64, and visually reviewed in the asset QA gallery.' }
  },
  { id: 'pebble_imp', kind: 'enemySprite', status: 'approved', targetPath: 'public/assets/characters/enemies/pebble-imp.png', prompt: enemyPrompt('Pebble Imp', 'imp', 'Greenhollow fields', 'Small stone-brown imp with horn-like ears and mischievous eyes'), notes: 'Purpose-built image-gen sprite normalized to a 64x64 transparent PNG and loaded as enemy:pebble_imp.',
    production: { source: 'purpose-built-imagegen', generatedFor: 'sword-guys', reviewNote: 'Purpose-built Pebble Imp sprite generated from the staged manifest prompt, chroma-keyed, normalized to 64x64, and visually reviewed on dark and light backgrounds.' }
  },
  { id: 'grass_wolf', kind: 'enemySprite', status: 'approved', targetPath: 'public/assets/characters/enemies/grass-wolf.png', prompt: enemyPrompt('Grass Wolf', 'beast', 'grassland road', 'Lean mossy wolf, low running profile, yellow-green coat'), notes: 'Purpose-built image-gen sprite normalized to a 64x64 transparent PNG and loaded as enemy:grass_wolf.',
    production: { source: 'purpose-built-imagegen', generatedFor: 'sword-guys', reviewNote: 'Purpose-built Grass Wolf sprite generated from the staged manifest prompt, chroma-keyed, normalized to 64x64, and visually reviewed on dark and light backgrounds.' }
  },
  { id: 'road_rat', kind: 'enemySprite', status: 'approved', targetPath: 'public/assets/characters/enemies/road-rat.png', prompt: enemyPrompt('Road Rat', 'beast', 'trade road', 'Scrappy dusty rat, long tail, road-tan fur'), notes: 'Purpose-built image-gen sprite normalized to a 64x64 transparent PNG and loaded as enemy:road_rat.',
    production: { source: 'purpose-built-imagegen', generatedFor: 'sword-guys', reviewNote: 'Purpose-built Road Rat sprite generated from the staged manifest prompt, chroma-keyed, normalized to 64x64, and visually reviewed on dark and light backgrounds.' }
  },
  { id: 'thistle_bat', kind: 'enemySprite', status: 'approved', targetPath: 'public/assets/characters/enemies/thistle-bat.png', prompt: enemyPrompt('Thistle Bat', 'beast', 'forest edge', 'Purple bat with thorny wing silhouette and tiny bright eyes'), notes: 'Purpose-built image-gen sprite normalized to a 64x64 transparent PNG and loaded as enemy:thistle_bat.',
    production: { source: 'purpose-built-imagegen', generatedFor: 'sword-guys', reviewNote: 'Purpose-built Thistle Bat sprite generated from the staged manifest prompt, chroma-keyed, normalized to 64x64, and visually reviewed on dark and light backgrounds.' }
  },
  { id: 'cave_tick', kind: 'enemySprite', status: 'approved', targetPath: 'public/assets/characters/enemies/cave-tick.png', prompt: enemyPrompt('Cave Tick', 'cave insect', 'Mossvale Cave', 'Round cave insect, many small legs, dark brown shell'), notes: 'Purpose-built image-gen sprite normalized to a 64x64 transparent PNG and loaded as enemy:cave_tick.',
    production: { source: 'purpose-built-imagegen', generatedFor: 'sword-guys', reviewNote: 'Purpose-built Cave Tick sprite generated from the staged manifest prompt, chroma-keyed, normalized to 64x64, and visually reviewed on dark and light backgrounds.' }
  },
  { id: 'moss_goblin', kind: 'enemySprite', status: 'approved', targetPath: 'public/assets/characters/enemies/moss-goblin.png', prompt: enemyPrompt('Moss Goblin', 'goblin', 'Mossvale Cave', 'Green squat goblin with mossy ears and cave-scrap clothing'), notes: 'Purpose-built image-gen sprite normalized to a 64x64 transparent PNG and loaded as enemy:moss_goblin.',
    production: { source: 'purpose-built-imagegen', generatedFor: 'sword-guys', reviewNote: 'Purpose-built Moss Goblin sprite generated from the staged manifest prompt, chroma-keyed, normalized to 64x64, and visually reviewed on dark and light backgrounds.' }
  },
  { id: 'drip_wisp', kind: 'enemySprite', status: 'approved', targetPath: 'public/assets/characters/enemies/drip-wisp.png', prompt: enemyPrompt('Drip Wisp', 'spirit', 'Mossvale Cave', 'Floating blue water-drop ghost with faint glow'), notes: 'Purpose-built image-gen sprite normalized to a 64x64 transparent PNG and loaded as enemy:drip_wisp.',
    production: { source: 'purpose-built-imagegen', generatedFor: 'sword-guys', reviewNote: 'Purpose-built Drip Wisp sprite generated from the staged manifest prompt, chroma-keyed, normalized to 64x64, and visually reviewed on dark and light backgrounds.' }
  },
  { id: 'bandit_cutpurse', kind: 'enemySprite', status: 'approved', targetPath: 'public/assets/characters/enemies/bandit-cutpurse.png', prompt: enemyPrompt('Bandit Cutpurse', 'human bandit', 'Dustbridge road', 'Red-brown cloak, dagger, quick thief posture'),
    production: { source: 'purpose-built-imagegen', generatedFor: 'sword-guys', reviewNote: 'Purpose-built Bandit Cutpurse sprite generated from the staged manifest prompt, chroma-key-cleaned, normalized to a 64x64 transparent PNG, and visually reviewed on dark and light backgrounds for 3x battle readability.' },
    notes: 'Purpose-built image-gen sprite normalized to a 64x64 transparent PNG and loaded as enemy:bandit_cutpurse.'
  },
  { id: 'bandit_archer', kind: 'enemySprite', status: 'approved', targetPath: 'public/assets/characters/enemies/bandit-archer.png', prompt: enemyPrompt('Bandit Archer', 'human bandit', 'Dustbridge road', 'Leather hood, short bow, dusty ambush palette'),
    production: { source: 'purpose-built-imagegen', generatedFor: 'sword-guys', reviewNote: 'Purpose-built Bandit Archer sprite generated from the staged manifest prompt, chroma-key-cleaned, normalized to a 64x64 transparent PNG, and visually reviewed on dark and light backgrounds for 3x battle readability.' },
    notes: 'Purpose-built image-gen sprite normalized to a 64x64 transparent PNG and loaded as enemy:bandit_archer.'
  },
  { id: 'dust_sprite', kind: 'enemySprite', status: 'approved', targetPath: 'public/assets/characters/enemies/dust-sprite.png', prompt: enemyPrompt('Dust Sprite', 'spirit', 'Dustbridge Ruins', 'Tiny ochre dust spirit, broken tile fragments, swirling body'),
    production: { source: 'purpose-built-imagegen', generatedFor: 'sword-guys', reviewNote: 'Purpose-built Dust Sprite sprite generated from the staged manifest prompt, chroma-key-cleaned, normalized to a 64x64 transparent PNG, and visually reviewed on dark and light backgrounds for 3x battle readability.' },
    notes: 'Purpose-built image-gen sprite normalized to a 64x64 transparent PNG and loaded as enemy:dust_sprite.'
  },
  { id: 'ruin_sentinel', kind: 'enemySprite', status: 'approved', targetPath: 'public/assets/characters/enemies/ruin-sentinel.png', prompt: enemyPrompt('Ruin Sentinel', 'construct', 'Dustbridge Ruins', 'Small cracked stone guardian with old route-seal symbol'),
    production: { source: 'purpose-built-imagegen', generatedFor: 'sword-guys', reviewNote: 'Purpose-built Ruin Sentinel sprite generated from the staged manifest prompt, chroma-key-cleaned, normalized to a 64x64 transparent PNG, and visually reviewed on dark and light backgrounds for 3x battle readability.' },
    notes: 'Purpose-built image-gen sprite normalized to a 64x64 transparent PNG and loaded as enemy:ruin_sentinel.'
  },
  { id: 'river_eel', kind: 'enemySprite', status: 'approved', targetPath: 'public/assets/characters/enemies/river-eel.png', prompt: enemyPrompt('River Eel', 'beast', 'Lumaire river', 'Blue river eel curled like a strike, wet highlight, sharp mouth'),
    production: { source: 'purpose-built-imagegen', generatedFor: 'sword-guys', reviewNote: 'Purpose-built River Eel enemy sprite generated from the staged manifest prompt, chroma-key-cleaned, normalized to a 64x64 transparent PNG, and visually reviewed on dark and light backgrounds for 3x battle readability, curled strike silhouette, wet blue highlights, sharp mouth, and no scenery or text.' },
    notes: 'Purpose-built image-gen sprite normalized to a 64x64 transparent PNG and loaded as enemy:river_eel.'
  },
  { id: 'reed_stalker', kind: 'enemySprite', status: 'approved', targetPath: 'public/assets/characters/enemies/reed-stalker.png', prompt: enemyPrompt('Reed Stalker', 'plant', 'Lumaire riverbank', 'Reed-like plant creature with hidden eyes and root feet'),
    production: { source: 'purpose-built-imagegen', generatedFor: 'sword-guys', reviewNote: 'Purpose-built Reed Stalker enemy sprite generated from the staged manifest prompt, magenta-key-cleaned, normalized to a 64x64 transparent PNG, and visually reviewed on dark and light backgrounds for 3x battle readability, hidden eyes, reed-bundle silhouette, root feet, and no scenery or text.' },
    notes: 'Purpose-built image-gen sprite normalized to a 64x64 transparent PNG and loaded as enemy:reed_stalker.'
  },
  { id: 'hex_frog', kind: 'enemySprite', status: 'approved', targetPath: 'public/assets/characters/enemies/hex-frog.png', prompt: enemyPrompt('Hex Frog', 'beast', 'Flooded Shrine', 'Green magical frog with rune spots and squat spellcaster posture'),
    production: { source: 'purpose-built-imagegen', generatedFor: 'sword-guys', reviewNote: 'Purpose-built Hex Frog enemy sprite generated from the staged manifest prompt, magenta-key-cleaned, normalized to a 64x64 transparent PNG, and visually reviewed on dark and light backgrounds for 3x battle readability, squat frog silhouette, non-letter rune spots, magical highlights, and no scenery or text.' },
    notes: 'Purpose-built image-gen sprite normalized to a 64x64 transparent PNG and loaded as enemy:hex_frog.'
  },
  { id: 'mirror_wisp', kind: 'enemySprite', status: 'approved', targetPath: 'public/assets/characters/enemies/mirror-wisp.png', prompt: enemyPrompt('Mirror Wisp', 'spirit', 'Flooded Shrine', 'Pale-blue reflective wisp with shard-like outline'),
    production: { source: 'purpose-built-imagegen', generatedFor: 'sword-guys', reviewNote: 'Purpose-built Mirror Wisp enemy sprite generated from the staged manifest prompt, green-key-cleaned, normalized to a 64x64 transparent PNG, and visually reviewed on dark and light backgrounds for 3x battle readability, shard-spirit silhouette, inner eye glow, cyan reflective facets, and no scenery or text.' },
    notes: 'Purpose-built image-gen sprite normalized to a 64x64 transparent PNG and loaded as enemy:mirror_wisp.'
  },
  { id: 'shrine_adept', kind: 'enemySprite', status: 'approved', targetPath: 'public/assets/characters/enemies/shrine-adept.png', prompt: enemyPrompt('Shrine Adept', 'human shrine caster', 'Flooded Shrine', 'River robe, mask or veil, mirrored staff'),
    production: { source: 'purpose-built-imagegen', generatedFor: 'sword-guys', reviewNote: 'Purpose-built Shrine Adept enemy sprite generated from the staged manifest prompt, magenta-key-cleaned, normalized to a 64x64 transparent PNG with a humanoid south anchor, and visually reviewed on dark and light backgrounds for 3x battle readability, masked river-robed caster silhouette, mirrored staff, and no scenery or text.' },
    notes: 'Purpose-built image-gen sprite normalized to a 64x64 transparent PNG and loaded as enemy:shrine_adept.'
  },
  { id: 'mine_mole', kind: 'enemySprite', status: 'approved', targetPath: 'public/assets/characters/enemies/mine-mole.png', prompt: enemyPrompt('Mine Mole', 'beast', 'Ironmarch mine', 'Brown digging mole with iron dust and big claws'),
    production: { source: 'purpose-built-imagegen', generatedFor: 'sword-guys', reviewNote: 'Purpose-built Mine Mole enemy sprite generated from the staged manifest prompt, green-key-cleaned, normalized to a centered 64x64 transparent PNG, and visually reviewed on dark and light backgrounds for 3x battle readability, compact low burrowing silhouette, brown iron-dusted fur, oversized digging claws, complete body framing, and no scenery or text.' },
    notes: 'Purpose-built image-gen sprite normalized to a 64x64 transparent PNG and loaded as enemy:mine_mole.'
  },
  { id: 'iron_beetle', kind: 'enemySprite', status: 'approved', targetPath: 'public/assets/characters/enemies/iron-beetle.png', prompt: enemyPrompt('Iron Beetle', 'insect', 'Ironvein Fortress', 'Metallic beetle shell, rivet-like carapace, heavy squat shape'),
    production: { source: 'purpose-built-imagegen', generatedFor: 'sword-guys', reviewNote: 'Purpose-built Iron Beetle enemy sprite generated from the staged manifest prompt, green-key-cleaned, normalized to a centered 64x64 transparent PNG, and visually reviewed on dark and light backgrounds for 3x battle readability, complete plated beetle body, rivet-like carapace, heavy squat fortress silhouette, short armored legs, and no scenery or text.' },
    notes: 'Purpose-built image-gen sprite normalized to a 64x64 transparent PNG and loaded as enemy:iron_beetle.'
  },
  { id: 'ember_bat', kind: 'enemySprite', status: 'approved', targetPath: 'public/assets/characters/enemies/ember-bat.png', prompt: enemyPrompt('Ember Bat', 'beast', 'Ironmarch forge tunnels', 'Orange ember bat, singed wings, small coal glow'),
    production: { source: 'purpose-built-imagegen', generatedFor: 'sword-guys', reviewNote: 'Purpose-built Ember Bat enemy sprite generated from the staged manifest prompt, green-key-cleaned, normalized to a centered 64x64 transparent PNG, and visually reviewed on dark and light backgrounds for 3x battle readability, complete compact wing silhouette, charred body, ember-orange coal glow, singed wing edges, and no scenery or text.' },
    notes: 'Purpose-built image-gen sprite normalized to a 64x64 transparent PNG and loaded as enemy:ember_bat.'
  },
  { id: 'fort_guard', kind: 'enemySprite', status: 'approved', targetPath: 'public/assets/characters/enemies/fort-guard.png', prompt: enemyPrompt('Fort Guard', 'human fortress guard', 'Ironvein Fortress', 'Steel guard with squared shield, fortress gray palette'),
    production: { source: 'purpose-built-imagegen', generatedFor: 'sword-guys', reviewNote: 'Purpose-built Fort Guard enemy sprite generated from the staged manifest prompt, green-key-cleaned, normalized to a grounded 64x64 transparent PNG, and visually reviewed on dark and light backgrounds for 3x battle readability, complete helmet/head framing, squared shield silhouette, steel-gray armor, short weapon, defensive fortress stance, and no scenery or text.' },
    notes: 'Purpose-built image-gen sprite normalized to a 64x64 transparent PNG and loaded as enemy:fort_guard.'
  },
  { id: 'fort_lancer', kind: 'enemySprite', status: 'approved', targetPath: 'public/assets/characters/enemies/fort-lancer.png', prompt: enemyPrompt('Fort Lancer', 'human fortress lancer', 'Ironvein Fortress', 'Long spear, narrow helmet, steel-blue armor'),
    production: { source: 'purpose-built-imagegen', generatedFor: 'sword-guys', reviewNote: 'Purpose-built Fort Lancer enemy sprite generated from the staged manifest prompt, green-key-cleaned, normalized to a centered 64x64 transparent PNG with extra spear margin, and visually reviewed on dark and light backgrounds for 3x battle readability, complete helmet/head framing, full diagonal spear silhouette, steel-blue armor, agile fortress stance, and no scenery or text.' },
    notes: 'Purpose-built image-gen sprite normalized to a 64x64 transparent PNG and loaded as enemy:fort_lancer.'
  },
  { id: 'smoke_alchemist', kind: 'enemySprite', status: 'approved', targetPath: 'public/assets/characters/enemies/smoke-alchemist.png', prompt: enemyPrompt('Smoke Alchemist', 'human alchemist', 'Ironvein Fortress', 'Dark flask belt, smoky mask, hunched potion-thrower pose'),
    production: { source: 'purpose-built-imagegen', generatedFor: 'sword-guys', reviewNote: 'Purpose-built Smoke Alchemist enemy sprite generated from the staged manifest prompt, green-key-cleaned, normalized to a centered 64x64 transparent PNG with smoke kept inside the frame, and visually reviewed on dark and light backgrounds for 3x battle readability, complete hood/mask framing, hunched potion-thrower silhouette, dark flask belt, attached smoke curls, and no scenery or text.' },
    notes: 'Purpose-built image-gen sprite normalized to a 64x64 transparent PNG and loaded as enemy:smoke_alchemist.'
  },
  { id: 'capital_duelist', kind: 'enemySprite', status: 'approved', targetPath: 'public/assets/characters/enemies/capital-duelist.png', prompt: enemyPrompt('Capital Duelist', 'human duelist', 'Sunspire capital road', 'Fine rapier silhouette, pale cloak, elegant combat stance'),
    production: { source: 'purpose-built-imagegen', generatedFor: 'sword-guys', reviewNote: 'Purpose-built Capital Duelist battle enemy sprite generated from the staged manifest prompt, green-key-cleaned, normalized to a 64x64 transparent PNG with a bottom-middle battle anchor, and visually reviewed on dark and light backgrounds for 3x battle readability, complete rapier/cloak/boots framing, polished Sunspire court-duelist silhouette, and no scenery or text.' },
    notes: 'Purpose-built image-gen sprite normalized to a 64x64 transparent PNG and loaded as enemy:capital_duelist.'
  },
  { id: 'sunspire_magus', kind: 'enemySprite', status: 'approved', targetPath: 'public/assets/characters/enemies/sunspire-magus.png', prompt: enemyPrompt('Sunspire Magus', 'human mage', 'Sunspire', 'Gold mage robe, sunlit staff, composed casting pose'),
    production: { source: 'purpose-built-imagegen', generatedFor: 'sword-guys', reviewNote: 'Purpose-built Sunspire Magus battle enemy sprite generated from the staged manifest prompt, green-key-cleaned, normalized to a 64x64 transparent PNG with a bottom-middle battle anchor, and visually reviewed on dark and light backgrounds for 3x battle readability, complete staff/robe/feet framing, bright gold-white Sunspire mage silhouette, composed casting posture, and no scenery or text.' },
    notes: 'Purpose-built image-gen sprite normalized to a 64x64 transparent PNG and loaded as enemy:sunspire_magus.'
  },
  { id: 'eclipse_hound', kind: 'enemySprite', status: 'approved', targetPath: 'public/assets/characters/enemies/eclipse-hound.png', prompt: enemyPrompt('Eclipse Hound', 'shadow beast', 'Eclipse road', 'Dark hound with violet shadow flame and bright eye points'),
    production: { source: 'purpose-built-imagegen', generatedFor: 'sword-guys', reviewNote: 'Purpose-built Eclipse Hound battle enemy sprite generated from the staged manifest prompt, green-key-cleaned, normalized to a 64x64 transparent PNG with a bottom-middle battle anchor, and visually reviewed on dark and light backgrounds for 3x battle readability, complete snout/flame-tail/paws framing, violet shadow-flame silhouette, bright eye points, and no scenery or text.' },
    notes: 'Purpose-built image-gen sprite normalized to a 64x64 transparent PNG and loaded as enemy:eclipse_hound.'
  },
  { id: 'void_moth', kind: 'enemySprite', status: 'approved', targetPath: 'public/assets/characters/enemies/void-moth.png', prompt: enemyPrompt('Void Moth', 'shadow insect', 'Eclipse Tower', 'Purple-black moth with starless wing spots'),
    production: { source: 'purpose-built-imagegen', generatedFor: 'sword-guys', reviewNote: 'Purpose-built Void Moth battle enemy sprite generated from the staged manifest prompt, green-key-cleaned, normalized to a 64x64 transparent PNG with a centered battle anchor, and visually reviewed on dark and light backgrounds for 3x battle readability, complete antennae/wing/body framing, purple-black starless wing spots, bright eye points, and no scenery or text.' },
    notes: 'Purpose-built image-gen sprite normalized to a 64x64 transparent PNG and loaded as enemy:void_moth.'
  },
  { id: 'hollow_knight', kind: 'enemySprite', status: 'approved', targetPath: 'public/assets/characters/enemies/hollow-knight.png', prompt: enemyPrompt('Hollow Knight', 'undead knight', 'Eclipse Tower', 'Empty armor, dark visor, cracked moonlit steel'),
    production: { source: 'purpose-built-imagegen', generatedFor: 'sword-guys', reviewNote: 'Purpose-built Hollow Knight battle enemy sprite generated from the staged manifest prompt, green-key-cleaned, normalized to a 64x64 transparent PNG with a bottom-middle battle anchor, and visually reviewed on dark and light backgrounds for 3x battle readability, complete helmet/sword/armor/boots framing, empty visor, cracked moonlit steel silhouette, and no scenery or text.' },
    notes: 'Purpose-built image-gen sprite normalized to a 64x64 transparent PNG and loaded as enemy:hollow_knight.'
  },
  { id: 'starved_gargoyle', kind: 'enemySprite', status: 'approved', targetPath: 'public/assets/characters/enemies/starved-gargoyle.png', prompt: enemyPrompt('Starved Gargoyle', 'demon statue', 'Eclipse Tower', 'Thin stone gargoyle, hunched wings, pale gray cracks'),
    production: { source: 'purpose-built-imagegen', generatedFor: 'sword-guys', reviewNote: 'Purpose-built Starved Gargoyle battle enemy sprite generated from the staged manifest prompt, green-key-cleaned, normalized to a 64x64 transparent PNG with a bottom-middle battle anchor, and visually reviewed on dark and light backgrounds for 3x battle readability, complete horns/folded-wings/claws/feet framing, pale cracked stone silhouette, hunched starved posture, and no scenery or text.' },
    notes: 'Purpose-built image-gen sprite normalized to a 64x64 transparent PNG and loaded as enemy:starved_gargoyle.'
  },
  { id: 'obsidian_acolyte', kind: 'enemySprite', status: 'approved', targetPath: 'public/assets/characters/enemies/obsidian-acolyte.png', prompt: enemyPrompt('Obsidian Acolyte', 'cultist', 'Eclipse Tower', 'Black-violet robe, obsidian mask, ritual dagger'),
    production: { source: 'purpose-built-imagegen', generatedFor: 'sword-guys', reviewNote: 'Purpose-built Obsidian Acolyte battle enemy sprite generated from the staged manifest prompt, green-key-cleaned, normalized to a 64x64 transparent PNG with a bottom-middle battle anchor, and visually reviewed on dark and light backgrounds for 3x battle readability, complete hood/mask/dagger/robe framing, black-violet cultist silhouette, guarded chant posture, and no scenery or text.' },
    notes: 'Purpose-built image-gen sprite normalized to a 64x64 transparent PNG and loaded as enemy:obsidian_acolyte.'
  },
  { id: 'eclipse_seraph', kind: 'enemySprite', status: 'approved', targetPath: 'public/assets/characters/enemies/eclipse-seraph.png', prompt: enemyPrompt('Eclipse Seraph', 'angelic shadow', 'Eclipse Tower', 'Pale winged figure corrupted by eclipse shadow, elegant boss-minion silhouette'),
    production: { source: 'purpose-built-imagegen', generatedFor: 'sword-guys', reviewNote: 'Purpose-built Eclipse Seraph battle enemy sprite generated from the staged manifest prompt, green-key-cleaned, normalized to a 64x64 transparent PNG with a centered battle anchor, and visually reviewed on dark and light backgrounds for 3x battle readability, complete halo/folded-wings/robe framing, pale corrupted angelic-shadow silhouette, compact boss-minion posture, and no scenery or text.' },
    notes: 'Purpose-built image-gen sprite normalized to a 64x64 transparent PNG and loaded as enemy:eclipse_seraph.'
  },
  { id: 'bandit_captain_rusk', kind: 'enemySprite', status: 'approved', targetPath: 'public/assets/characters/enemies/bandit-captain-rusk.png', prompt: enemyPrompt('Bandit Captain Rusk', 'human boss', 'Dustbridge Ruins', 'Broad red captain cloak, heavy blade, fake route-seal trophy'),
    production: { source: 'purpose-built-imagegen', generatedFor: 'sword-guys', reviewNote: 'Purpose-built Bandit Captain Rusk boss sprite generated from the staged manifest prompt, chroma-key-cleaned, normalized to a 64x64 transparent PNG, and visually reviewed on dark and light backgrounds for 3x boss battle readability.' },
    notes: 'Purpose-built image-gen boss sprite normalized to a 64x64 transparent PNG and loaded as enemy:bandit_captain_rusk.'
  },
  { id: 'mire_warden', kind: 'enemySprite', status: 'approved', targetPath: 'public/assets/characters/enemies/mire-warden.png', prompt: enemyPrompt('Mire Warden', 'shrine boss', 'Flooded Shrine', 'Huge blue-green river guardian, mirror mask, reed crown'),
    production: { source: 'purpose-built-imagegen', generatedFor: 'sword-guys', reviewNote: 'Purpose-built Mire Warden boss sprite generated from the staged manifest prompt, magenta-key-cleaned, normalized to a 64x64 transparent PNG, and visually reviewed on dark and light backgrounds for 3x battle readability, mirror-mask boss silhouette, reed crown, lantern-like river glow, and no scenery or text.' },
    notes: 'Purpose-built image-gen boss sprite normalized to a 64x64 transparent PNG and loaded as enemy:mire_warden.'
  },
  { id: 'iron_castellan', kind: 'enemySprite', status: 'approved', targetPath: 'public/assets/characters/enemies/iron-castellan.png', prompt: enemyPrompt('Iron Castellan', 'fortress boss', 'Ironvein Fortress', 'Massive armored machine-knight, forge core glow, heavy hammer stance'),
    production: { source: 'purpose-built-imagegen', generatedFor: 'sword-guys', reviewNote: 'Purpose-built Iron Castellan boss sprite generated from the staged manifest prompt, green-key-cleaned, normalized to a centered 64x64 transparent PNG with extra hammer margin, and visually reviewed on dark and light backgrounds for 3x boss readability, massive armored machine-knight silhouette, glowing forge core, complete helmet/head framing, heavy hammer stance, and no scenery or text.' },
    notes: 'Purpose-built image-gen boss sprite normalized to a 64x64 transparent PNG and loaded as enemy:iron_castellan.'
  },
  { id: 'hollow_regent', kind: 'enemySprite', status: 'approved', targetPath: 'public/assets/characters/enemies/hollow-regent.png', prompt: enemyPrompt('Hollow Regent', 'final boss', 'Eclipse Tower', 'Tall royal shadow figure, eclipse crown, elegant terrifying silhouette'),
    production: { source: 'purpose-built-imagegen', generatedFor: 'sword-guys', reviewNote: 'Purpose-built Hollow Regent final boss sprite generated from the staged manifest prompt, green-key-cleaned, normalized to a 64x64 transparent PNG with a centered battle anchor, and visually reviewed on dark and light backgrounds for 3x boss battle readability, complete eclipse-crown/mask/mantle/hands/lower-shadow framing, tall royal shadow silhouette, and no scenery or text.' },
    notes: 'Purpose-built image-gen sprite normalized to a 64x64 transparent PNG and loaded as enemy:hollow_regent.'
  }
];

export const BATTLE_BACKDROP_ASSETS: ImageGenAssetEntry[] = [
  { id: 'grassland', kind: 'battleBackdrop', status: 'approved', targetPath: 'public/assets/battle/greenhollow-fields-battle.png', references: ['public/assets/battle/greenhollow-fields-battle-raw.png'], prompt: backdropPrompt('Greenhollow fields', 'Sunny green meadow, dirt road, soft tree line, cozy first-region mood'), production: GREENHOLLOW_BACKDROP_PRODUCTION },
  { id: 'town', kind: 'battleBackdrop', status: 'approved', targetPath: 'public/assets/battle/town-battle.png', prompt: backdropPrompt('village town edge', 'Fence, cottage hints, warm safe-town colors, no major characters'), notes: 'Purpose-built image-gen battle backdrop normalized to a 1280x720 opaque PNG and loaded as backdrop:town.',
    production: { source: 'purpose-built-imagegen', generatedFor: 'sword-guys', reviewNote: 'Purpose-built town battle backdrop generated from the staged manifest prompt, normalized to opaque 1280x720, and visually reviewed for left/right combat space plus a quiet lower battle UI area.' }
  },
  { id: 'cave', kind: 'battleBackdrop', status: 'approved', targetPath: 'public/assets/battle/mossvale-cave-battle.png', prompt: backdropPrompt('Mossvale Cave', 'Brown cave floor, moss glow, shallow blue pool hints, gentle first-dungeon contrast'), notes: 'Purpose-built image-gen battle backdrop normalized to a 1280x720 opaque PNG and loaded as backdrop:cave.',
    production: { source: 'purpose-built-imagegen', generatedFor: 'sword-guys', reviewNote: 'Purpose-built Mossvale Cave battle backdrop generated from the staged manifest prompt, normalized to a 1280x720 opaque PNG, and visually reviewed for left/right combat space plus a quiet lower battle UI area.' }
  },
  { id: 'road', kind: 'battleBackdrop', status: 'approved', targetPath: 'public/assets/battle/waymeet-road-battle.png', prompt: backdropPrompt('Waymeet road', 'Dusty trade road, broken signpost, wagon track, bandit ambush mood'),
    production: { source: 'purpose-built-imagegen', generatedFor: 'sword-guys', reviewNote: 'Purpose-built Waymeet Road battle backdrop generated from the staged manifest prompt, normalized to an opaque 1600x900 PNG, and visually reviewed for clear left/right battle space, quiet lower UI area, and no characters or readable text.' },
    notes: 'Purpose-built image-gen battle backdrop normalized to an opaque 1600x900 PNG and loaded as backdrop:road.'
  },
  { id: 'ruin', kind: 'battleBackdrop', status: 'approved', targetPath: 'public/assets/battle/dustbridge-ruins-battle.png', prompt: backdropPrompt('Dustbridge Ruins', 'Broken stone bridge, ochre dust, old route-seal carvings'),
    production: { source: 'purpose-built-imagegen', generatedFor: 'sword-guys', reviewNote: 'Purpose-built Dustbridge Ruins battle backdrop generated from the staged manifest prompt, normalized to an opaque 1600x900 PNG, and visually reviewed for clear left/right battle space, quiet lower UI area, and no characters or readable text.' },
    notes: 'Purpose-built image-gen battle backdrop normalized to an opaque 1600x900 PNG and loaded as backdrop:ruin.'
  },
  { id: 'river', kind: 'battleBackdrop', status: 'approved', targetPath: 'public/assets/battle/lumaire-river-battle.png', prompt: backdropPrompt('Lumaire riverbank', 'Bright river water, reeds, bells in the far distance, reflective magic mood'),
    production: { source: 'purpose-built-imagegen', generatedFor: 'sword-guys', reviewNote: 'Purpose-built Lumaire River battle backdrop generated from the staged manifest prompt, normalized to an opaque 1600x900 PNG, and visually reviewed for bright riverbank identity, clear left/right battle space, quiet lower UI area, distant bells, and no characters or readable text.' },
    notes: 'Purpose-built image-gen battle backdrop normalized to an opaque 1600x900 PNG and loaded as backdrop:river.'
  },
  { id: 'shrine', kind: 'battleBackdrop', status: 'approved', targetPath: 'public/assets/battle/flooded-shrine-battle.png', prompt: backdropPrompt('Flooded Shrine', 'Mirror pools, blue stone, shallow water, pale reflected sky'),
    production: { source: 'purpose-built-imagegen', generatedFor: 'sword-guys', reviewNote: 'Purpose-built Flooded Shrine battle backdrop generated from the staged manifest prompt, normalized to an opaque 1600x900 PNG, and visually reviewed for mirror-pool shrine identity, clear left/right battle space, quiet lower UI area, blue stone readability, and no characters or readable text.' },
    notes: 'Purpose-built image-gen battle backdrop normalized to an opaque 1600x900 PNG and loaded as backdrop:shrine.'
  },
  { id: 'mine', kind: 'battleBackdrop', status: 'approved', targetPath: 'public/assets/battle/ironmarch-mine-battle.png', prompt: backdropPrompt('Ironmarch mine', 'Rock wall, rails, warm forge light, dark dust'),
    production: { source: 'purpose-built-imagegen', generatedFor: 'sword-guys', reviewNote: 'Purpose-built Ironmarch mine battle backdrop generated from the staged manifest prompt, normalized to an opaque 1600x900 PNG, and visually reviewed for left/right battle staging space, quiet lower UI area, rough rock walls, rails, warm forge light, dark dust, and no characters or text.' },
    notes: 'Purpose-built image-gen battle backdrop normalized to an opaque 1600x900 PNG and loaded as backdrop:mine.'
  },
  { id: 'fortress', kind: 'battleBackdrop', status: 'approved', targetPath: 'public/assets/battle/ironvein-fortress-battle.png', prompt: backdropPrompt('Ironvein Fortress', 'Steel floor, furnace glow, heavy doors, industrial pressure'),
    production: { source: 'purpose-built-imagegen', generatedFor: 'sword-guys', reviewNote: 'Purpose-built Ironvein Fortress battle backdrop generated from the staged manifest prompt, normalized to an opaque 1600x900 PNG, and visually reviewed for left/right battle staging space, quiet lower UI area, iron-plated walls, riveted steel floor, sealed fortress doors, furnace glow, industrial pressure, and no characters or text.' },
    notes: 'Purpose-built image-gen battle backdrop normalized to an opaque 1600x900 PNG and loaded as backdrop:fortress.'
  },
  { id: 'castle', kind: 'battleBackdrop', status: 'approved', targetPath: 'public/assets/battle/ironvein-castle-battle.png', prompt: backdropPrompt('Ironvein keep', 'Stone-and-iron fortress interior, banner shadows, boss-room weight'),
    production: { source: 'purpose-built-imagegen', generatedFor: 'sword-guys', reviewNote: 'Purpose-built Ironvein keep boss-chamber battle backdrop generated from the staged manifest prompt, normalized to an opaque 1600x900 PNG, and visually reviewed for left/right battle staging space, quiet lower UI area, stone-and-iron fortress interior, banner shadows without readable text, boss-room weight, and no characters or text.' },
    notes: 'Purpose-built image-gen battle backdrop normalized to an opaque 1600x900 PNG and loaded as backdrop:castle.'
  },
  { id: 'capital', kind: 'battleBackdrop', status: 'approved', targetPath: 'public/assets/battle/sunspire-capital-battle.png', prompt: backdropPrompt('Sunspire capital road', 'Gold stone, banners, bell tower hints, clean late-game light'),
    production: { source: 'purpose-built-imagegen', generatedFor: 'sword-guys', reviewNote: 'Purpose-built Sunspire Capital battle backdrop generated from the staged manifest prompt, normalized to an opaque 1600x900 PNG, and visually reviewed for JRPG battle readability: clear left and right floor lanes for Ari and enemies, quiet darker lower third for DOM battle UI, gold-stone capital road, banner and bell-tower hints, clean late-game light, and no characters or text.' },
    notes: 'Purpose-built image-gen battle backdrop normalized to an opaque 1600x900 PNG and loaded as backdrop:capital.'
  },
  { id: 'dungeon', kind: 'battleBackdrop', status: 'approved', targetPath: 'public/assets/battle/generic-dungeon-battle.png', prompt: backdropPrompt('old dungeon room', 'Dark stone, cracked floor, neutral dungeon fallback'),
    production: { source: 'purpose-built-imagegen', generatedFor: 'sword-guys', reviewNote: 'Purpose-built generic dungeon battle backdrop generated from the staged manifest prompt, normalized to an opaque 1600x900 PNG, and visually reviewed for reusable JRPG battle readability: clear left and right floor lanes for Ari and enemies, quiet dark lower third for DOM battle UI, cracked neutral stone room, restrained dungeon depth, and no characters or text.' },
    notes: 'Purpose-built image-gen battle backdrop normalized to an opaque 1600x900 PNG and loaded as backdrop:dungeon.'
  },
  { id: 'eclipse', kind: 'battleBackdrop', status: 'approved', targetPath: 'public/assets/battle/eclipse-tower-battle.png', prompt: backdropPrompt('Eclipse Tower', 'Starless violet-black tower interior, broken moonlight, final-region dread'),
    production: { source: 'purpose-built-imagegen', generatedFor: 'sword-guys', reviewNote: 'Purpose-built Eclipse Tower battle backdrop generated from the staged manifest prompt, normalized to an opaque 1600x900 PNG, and visually reviewed for final-region JRPG battle readability: clear left and right floor lanes for Ari and enemies, quiet dark lower third for DOM battle UI, violet-black tower interior, broken moonlight, eclipse-window focal point, and no characters or text.' },
    notes: 'Purpose-built image-gen battle backdrop normalized to an opaque 1600x900 PNG and loaded as backdrop:eclipse.'
  }
];

export const TILESET_ASSETS: ImageGenAssetEntry[] = [
  { id: 'greenhollow', kind: 'tileset', status: 'approved', targetPath: 'public/assets/environment/greenhollow-tiles.png', references: ['public/assets/environment/greenhollow-tiles-preview.png'], prompt: tilesetPrompt('Greenhollow village', 'Grass variants, dirt paths, fences, cottage walls, red roofs, save crystal'), production: GREENHOLLOW_TILE_PRODUCTION },
  { id: 'overworld_main', kind: 'tileset', status: 'approved', targetPath: 'public/assets/environment/overworld-greenhollow-tiles.png', references: ['public/assets/environment/overworld-greenhollow-tiles-preview.png'], prompt: tilesetPrompt('Five Roads overworld', 'Grassland, dirt roads, water, cliffs, cave mouth, town markers, bridge'), production: GREENHOLLOW_TILE_PRODUCTION },
  { id: 'overworld_details', kind: 'tileset', status: 'approved', targetPath: 'public/assets/environment/overworld-greenhollow-details.png', references: ['public/assets/environment/overworld-greenhollow-details-preview.png'], prompt: tilesetPrompt('overworld decorative details', 'Small flowers, clover, tall grass, scuffs, readable low-noise details'), production: GREENHOLLOW_TILE_PRODUCTION },
  { id: 'weapon_shop', kind: 'tileset', status: 'approved', targetPath: 'public/assets/environment/weapon-shop-tiles.png', references: ['public/assets/environment/weapon-shop-tiles-preview.png'], prompt: tilesetPrompt('weapon and armor shop interiors', 'Counters, sword racks, armor stands, forge props, threshold tiles'), production: GREENHOLLOW_TILE_PRODUCTION },
  { id: 'inn', kind: 'tileset', status: 'approved', targetPath: 'public/assets/environment/inn-tiles.png', references: ['public/assets/environment/inn-tiles-preview.png'], prompt: tilesetPrompt('inn interiors base', 'Wood floors, walls, beds, tables, rugs, warm hospitality props'), production: GREENHOLLOW_TILE_PRODUCTION },
  { id: 'inn_lobby', kind: 'tileset', status: 'approved', targetPath: 'public/assets/environment/inn-lobby-tiles.png', references: ['public/assets/environment/inn-lobby-tiles-preview.png'], prompt: tilesetPrompt('inn lobby', 'Couches, fireplace, bookshelves, rugs, plants, counter details'), production: GREENHOLLOW_TILE_PRODUCTION },
  { id: 'inn_bedroom', kind: 'tileset', status: 'approved', targetPath: 'public/assets/environment/inn-bedroom-tiles.png', references: ['public/assets/environment/inn-bedroom-tiles-preview.png'], prompt: tilesetPrompt('inn bedroom', 'Bedroom walls, window, bed, nightstand, privacy screen, linen props'), production: GREENHOLLOW_TILE_PRODUCTION },
  { id: 'waymeet', kind: 'tileset', status: 'approved', targetPath: 'public/assets/environment/waymeet-tiles.png', prompt: tilesetPrompt('Waymeet Trade Post', 'Market stalls, crates, road signs, caravan props, trade-road palette'),
    production: { source: 'purpose-built-imagegen', generatedFor: 'sword-guys', reviewNote: 'Purpose-built Waymeet Trade Post tileset generated from the staged manifest prompt, chroma-key-cleaned, normalized to a transparent 320x192 PNG, and visually reviewed on dark and light backgrounds for 32x32 grid readability, walkable trade-road ground, stalls, crates, road signs without lettering, and collision-friendly props.' },
    notes: 'Purpose-built image-gen tileset normalized to a transparent 320x192 PNG and loaded as tiles:waymeet.'
  },
  { id: 'lumaire', kind: 'tileset', status: 'approved', targetPath: 'public/assets/environment/lumaire-tiles.png', prompt: tilesetPrompt('Lumaire river village', 'Water edges, bells, river-glass, ferry dock, blue-green magic props'),
    production: { source: 'purpose-built-imagegen', generatedFor: 'sword-guys', reviewNote: 'Purpose-built Lumaire river-village tileset generated from the staged manifest prompt, magenta-key-cleaned, normalized to a transparent 320x192 PNG, and visually reviewed on dark and light backgrounds for 32x32 grid readability, walkable ground, water edges, ferry dock pieces, bell and river-glass props without lettering, and collision-friendly decorations.' },
    notes: 'Purpose-built image-gen tileset normalized to a transparent 320x192 PNG and loaded as tiles:lumaire.'
  },
  { id: 'ironmarch', kind: 'tileset', status: 'approved', targetPath: 'public/assets/environment/ironmarch-tiles.png', prompt: tilesetPrompt('Ironmarch forge town', 'Forge stone, metal doors, rail details, brazier light, soot'),
    production: { source: 'purpose-built-imagegen', generatedFor: 'sword-guys', reviewNote: 'Purpose-built Ironmarch forge-town tileset generated from the staged manifest prompt, green-key-cleaned, normalized to a transparent 320x192 PNG, and visually reviewed on dark and light backgrounds for 32x32 grid readability, soot-dark forge-stone ground, rail tracks, iron doors, furnace blocks, anvils, coal and ore props, braziers, and collision-friendly blocking pieces without letters or labels.' },
    notes: 'Purpose-built image-gen tileset normalized to a transparent 320x192 PNG and loaded as tiles:ironmarch.'
  },
  { id: 'sunspire', kind: 'tileset', status: 'approved', targetPath: 'public/assets/environment/sunspire-tiles.png', prompt: tilesetPrompt('Sunspire capital village', 'Gold stone, banners, archive props, tower gate, clean late-game palette'),
    production: { source: 'purpose-built-imagegen', generatedFor: 'sword-guys', reviewNote: 'Purpose-built Sunspire capital village tileset generated from the staged manifest prompt, chroma-key-cleaned, normalized to a transparent 320x192 PNG with a 10x6 grid of 32x32 tiles, and visually reviewed for gold-stone floors, road variants, white-and-gold wall pieces, banner props, archive props, tower gate pieces, collision-friendly readability, and no text or characters.' },
    notes: 'Purpose-built image-gen tileset normalized to a transparent 320x192 PNG and loaded as tiles:sunspire.'
  },
  { id: 'mossvale_cave', kind: 'tileset', status: 'approved', targetPath: 'public/assets/environment/mossvale-cave-tiles.png', prompt: tilesetPrompt('Mossvale Cave', 'Cave floor, moss glow, shallow pools, cliff walls, stairs, chest'), notes: 'Purpose-built image-gen tileset normalized to a transparent 512x512 PNG and loaded as tiles:mossvale_cave.',
    production: { source: 'purpose-built-imagegen', generatedFor: 'sword-guys', reviewNote: 'Purpose-built Mossvale Cave tileset generated from the staged manifest prompt, checkerboard-cleaned into a transparent 512x512 PNG, and visually reviewed for 32x32 tile-grid readability, cave floors, pools, walls, stairs, chests, and collision-friendly props.' }
  },
  { id: 'dustbridge_ruins', kind: 'tileset', status: 'approved', targetPath: 'public/assets/environment/dustbridge-ruins-tiles.png', prompt: tilesetPrompt('Dustbridge Ruins', 'Broken roads, ruin walls, fake route seal props, barricades'),
    production: { source: 'purpose-built-imagegen', generatedFor: 'sword-guys', reviewNote: 'Purpose-built Dustbridge Ruins tileset generated from the staged manifest prompt, chroma-key-cleaned, normalized to a transparent 320x192 PNG, and visually reviewed on dark and light backgrounds for 32x32 grid readability, cracked roads, ruin walls, route-seal props without lettering, barricades, and collision-friendly props.' },
    notes: 'Purpose-built image-gen tileset normalized to a transparent 320x192 PNG and loaded as tiles:dustbridge_ruins.'
  },
  { id: 'flooded_shrine', kind: 'tileset', status: 'approved', targetPath: 'public/assets/environment/flooded-shrine-tiles.png', prompt: tilesetPrompt('Flooded Shrine', 'Mirror pools, blue shrine floors, reed edges, sluice props'),
    production: { source: 'purpose-built-imagegen', generatedFor: 'sword-guys', reviewNote: 'Purpose-built Flooded Shrine tileset generated from the staged manifest prompt, magenta-key-cleaned, normalized to a transparent 320x192 PNG, and visually reviewed on dark and light backgrounds for 32x32 grid readability, blue shrine floors, mirror pools, water edges, sluice props, reeds, stairs, and collision-friendly blocking pieces without lettering.' },
    notes: 'Purpose-built image-gen tileset normalized to a transparent 320x192 PNG and loaded as tiles:flooded_shrine.'
  },
  { id: 'ironvein_fortress', kind: 'tileset', status: 'approved', targetPath: 'public/assets/environment/ironvein-fortress-tiles.png', prompt: tilesetPrompt('Ironvein Fortress', 'Steel floors, furnace walls, heavy doors, machinery props'),
    production: { source: 'purpose-built-imagegen', generatedFor: 'sword-guys', reviewNote: 'Purpose-built Ironvein Fortress tileset generated from the staged manifest prompt, green-key-cleaned, normalized to a transparent 320x192 PNG, and visually reviewed on dark and light backgrounds for 32x32 grid readability, riveted steel floors, furnace walls, heavy doors, barred gates, machinery, pressure pipes, vents, grates, boss-door pieces, and collision-friendly blocking props without letters or labels.' },
    notes: 'Purpose-built image-gen tileset normalized to a transparent 320x192 PNG and loaded as tiles:ironvein_fortress.'
  },
  { id: 'eclipse_tower', kind: 'tileset', status: 'approved', targetPath: 'public/assets/environment/eclipse-tower-tiles.png', prompt: tilesetPrompt('Eclipse Tower', 'Starless stone, violet light, archive shelves, observatory gate'),
    production: { source: 'purpose-built-imagegen', generatedFor: 'sword-guys', reviewNote: 'Purpose-built Eclipse Tower tileset generated from the staged manifest prompt, chroma-key-cleaned, normalized to a transparent 320x192 PNG with a 10x6 grid of 32x32 tiles, and visually reviewed on dark and light QA backgrounds for starless stone floors, cracked wall pieces, violet-lit archive shelves, crystal lamps, observatory gate pieces, collision-friendly readability, and no text or characters.' },
    notes: 'Purpose-built image-gen tileset normalized to a transparent 320x192 PNG and loaded as tiles:eclipse_tower.'
  }
];

export const SPELL_EFFECT_ASSETS: ImageGenAssetEntry[] = [
  { id: 'spark', kind: 'spellEffect', status: 'approved', targetPath: 'public/assets/effects/spells/spark-strip.png', prompt: spellPrompt('Spark', 'Fast yellow lightning bolt, 6-frame projectile and hit flash'), frameWidth: 64, frameHeight: 64, frameCount: 6, frameDurationMs: 45, notes: 'Purpose-built image-gen spell strip loaded as spell:spark with 6 frames.',
    production: { source: 'purpose-built-imagegen', generatedFor: 'sword-guys', reviewNote: 'Purpose-built Spark spell effect strip generated from the staged manifest prompt, chroma-key-cleaned, normalized to a transparent 384x64 PNG with 6 evenly spaced 64x64 frames, and visually reviewed for fast yellow lightning readability, compact hit flash, no text, no characters, and battle-UI-safe scale.' }
  },
  { id: 'mend', kind: 'spellEffect', status: 'approved', targetPath: 'public/assets/effects/spells/mend-strip.png', prompt: spellPrompt('Mend', 'Green-blue healing pulse, 8-frame expanding ring and soft sparkle'), frameWidth: 64, frameHeight: 64, frameCount: 8, frameDurationMs: 55, notes: 'Purpose-built image-gen spell strip loaded as spell:mend with 8 frames.',
    production: { source: 'purpose-built-imagegen', generatedFor: 'sword-guys', reviewNote: 'Purpose-built Mend spell effect strip generated from the staged manifest prompt, chroma-key-cleaned, normalized to a transparent 512x64 PNG with 8 evenly spaced 64x64 frames, and visually reviewed for green-blue healing pulse readability, soft sparkle fade, no text, no characters, and battle-UI-safe scale.' }
  },
  { id: 'ember', kind: 'spellEffect', status: 'approved', targetPath: 'public/assets/effects/spells/ember-strip.png', prompt: spellPrompt('Ember', 'Small orange fire projectile, 8-frame burst with simple flame tongues'), frameWidth: 64, frameHeight: 64, frameCount: 8, frameDurationMs: 45, notes: 'Purpose-built image-gen spell strip loaded as spell:ember with 8 frames.',
    production: { source: 'purpose-built-imagegen', generatedFor: 'sword-guys', reviewNote: 'Purpose-built Ember spell effect strip generated from the staged manifest prompt, chroma-key-cleaned, normalized to a transparent 512x64 PNG with 8 evenly spaced 64x64 frames, and visually reviewed for orange projectile-to-burst readability, compact flame tongues, no text, no characters, and battle-UI-safe scale.' }
  },
  { id: 'river_mend', kind: 'spellEffect', status: 'approved', targetPath: 'public/assets/effects/spells/river-mend-strip.png', prompt: spellPrompt('River Mend', 'Water-light healing ring, 10-frame blue ripple and white glints'), frameWidth: 64, frameHeight: 64, frameCount: 10, frameDurationMs: 50, notes: 'Purpose-built image-gen spell strip loaded as spell:river_mend with 10 frames.',
    production: { source: 'purpose-built-imagegen', generatedFor: 'sword-guys', reviewNote: 'Purpose-built River Mend spell effect strip generated from the staged manifest prompt, chroma-key-cleaned, normalized to a transparent 640x64 PNG with 10 evenly spaced 64x64 frames, and visually reviewed for blue water-light ripple readability, distinct healing identity from Mend, no text, no characters, and battle-UI-safe scale.' }
  },
  { id: 'frost_rune', kind: 'spellEffect', status: 'approved', targetPath: 'public/assets/effects/spells/frost-rune-strip.png', prompt: spellPrompt('Frost Rune', 'Blue-white icy sigil, 10-frame rune reveal and sharp crystal impact'), frameWidth: 64, frameHeight: 64, frameCount: 10, frameDurationMs: 50, notes: 'Purpose-built image-gen spell strip loaded as spell:frost_rune with 10 frames.',
    production: { source: 'purpose-built-imagegen', generatedFor: 'sword-guys', reviewNote: 'Purpose-built Frost Rune spell effect strip generated from the staged manifest prompt, chroma-key-cleaned, normalized to a transparent 640x64 PNG with 10 evenly spaced 64x64 frames, and visually reviewed for abstract blue-white rune buildup, compact crystal impact, no readable letters, no characters, and battle-UI-safe scale.' }
  },
  { id: 'sunflare', kind: 'spellEffect', status: 'approved', targetPath: 'public/assets/effects/spells/sunflare-strip.png', prompt: spellPrompt('Sunflare', 'Golden late-game light burst, 12-frame beam flare and radiant impact'), frameWidth: 64, frameHeight: 64, frameCount: 12, frameDurationMs: 45, notes: 'Purpose-built image-gen spell strip loaded as spell:sunflare with a stronger 12-frame dramatic impact bloom.',
    production: { source: 'purpose-built-imagegen', generatedFor: 'sword-guys', reviewNote: 'Purpose-built Sunflare spell effect strip generated from the revised dramatic staged prompt, chroma-key-cleaned, normalized to a transparent 768x64 PNG with 12 evenly spaced 64x64 frames, and visually reviewed for a stronger golden beam, large radiant impact bloom, halo fade, no text, no characters, and battle-UI-safe scale.' }
  }
];

export const IMAGE_GEN_ASSETS: ImageGenAssetEntry[] = [
  ...NPC_ASSETS,
  ...ENEMY_ASSETS,
  ...BATTLE_BACKDROP_ASSETS,
  ...TILESET_ASSETS,
  ...SPELL_EFFECT_ASSETS
];
