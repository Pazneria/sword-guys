import { EQUIPMENT_SLOT_IDS } from './equipment-slots.js';

const normalizeSlotIds = (slotIds = []) => {
  const validIds = new Set(EQUIPMENT_SLOT_IDS);
  return [...new Set(slotIds.filter((slotId) => validIds.has(slotId)))];
};

const normalizeSlotTags = (slotTags = []) => [...new Set(slotTags)].filter(Boolean);

const createItem = (item) => {
  const requirements = item.requirements ?? {};
  const normalized = {
    slotIds: normalizeSlotIds(requirements.slotIds),
    slotTags: normalizeSlotTags(requirements.slotTags),
  };

  return Object.freeze({
    ...item,
    requirements: normalized,
  });
};

const definitions = [
  createItem({
    id: 'rusty-sword',
    name: 'Rusty Sword',
    description: 'A well-worn blade with more sentiment than sharpness.',
    requirements: { slotTags: ['weapon'] },
  }),
  createItem({
    id: 'oak-shield',
    name: 'Oak Shield',
    description: 'Sturdy wooden shield reinforced with iron bands.',
    requirements: { slotIds: ['offhand'], slotTags: ['shield'] },
  }),
  createItem({
    id: 'leather-cap',
    name: 'Leather Cap',
    description: 'Offers modest protection for the head.',
    requirements: { slotIds: ['head'], slotTags: ['armor-head'] },
  }),
  createItem({
    id: 'leather-vest',
    name: 'Leather Vest',
    description: 'Light armor favored by novice adventurers.',
    requirements: { slotIds: ['body'], slotTags: ['armor-body'] },
  }),
  createItem({
    id: 'traveler-charm',
    name: 'Traveler\'s Charm',
    description: 'A lucky token said to ward off danger.',
    requirements: { slotIds: ['accessory'], slotTags: ['accessory'] },
  }),
];

export const ITEMS = Object.freeze(definitions);
export const ITEMS_BY_ID = Object.freeze(
  Object.fromEntries(ITEMS.map((item) => [item.id, item]))
);

export function getItemDefinition(itemId) {
  return ITEMS_BY_ID[itemId] ?? null;
}
