const slots = [
  {
    id: 'weapon',
    label: 'Weapon',
    compatibleTags: ['weapon', 'two-handed-weapon'],
    description: 'Primary hand weapon slot.',
  },
  {
    id: 'offhand',
    label: 'Offhand',
    compatibleTags: ['offhand', 'shield', 'focus'],
    description: 'Secondary hand equipment slot.',
  },
  {
    id: 'head',
    label: 'Head',
    compatibleTags: ['armor-head'],
    description: 'Helmets, hats, and other headgear.',
  },
  {
    id: 'body',
    label: 'Body',
    compatibleTags: ['armor-body'],
    description: 'Chest armor and robes.',
  },
  {
    id: 'accessory',
    label: 'Accessory',
    compatibleTags: ['accessory'],
    description: 'Rings, amulets, and other accessories.',
  },
];

const slotById = new Map(slots.map((slot) => [slot.id, Object.freeze({ ...slot })]));

export const EQUIPMENT_SLOTS = slots.map((slot) => Object.freeze({ ...slot }));
export const EQUIPMENT_SLOT_IDS = EQUIPMENT_SLOTS.map((slot) => slot.id);
export const EQUIPMENT_SLOT_MAP = Object.freeze(
  Object.fromEntries(EQUIPMENT_SLOTS.map((slot) => [slot.id, slotById.get(slot.id)]))
);

export function getEquipmentSlot(slotId) {
  return EQUIPMENT_SLOT_MAP[slotId] ?? null;
}
