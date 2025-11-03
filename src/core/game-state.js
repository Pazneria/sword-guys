import { EQUIPMENT_SLOT_MAP, EQUIPMENT_SLOT_IDS } from '../data/equipment-slots.js';
import { ITEMS_BY_ID } from '../data/items.js';

const cloneInventory = (inventory) => Array.from(inventory ?? []);

const createEmptyEquipment = () => {
  const equipment = {};
  for (const slotId of EQUIPMENT_SLOT_IDS) {
    equipment[slotId] = null;
  }
  return equipment;
};

const normalizeEquipment = (initialEquipment = {}) => {
  const equipment = createEmptyEquipment();

  for (const [slotId, itemId] of Object.entries(initialEquipment)) {
    if (slotId in equipment) {
      equipment[slotId] = itemId ?? null;
    }
  }

  return equipment;
};

export class GameState {
  constructor({ inventory = [], equipment = {} } = {}) {
    this.inventory = cloneInventory(inventory);
    this.equipment = normalizeEquipment(equipment);
  }

  getInventory() {
    return cloneInventory(this.inventory);
  }

  getEquipped(slotId) {
    this.#assertSlot(slotId);
    return this.equipment[slotId];
  }

  getEquippedItems() {
    return { ...this.equipment };
  }

  hasInInventory(itemId) {
    return this.inventory.includes(itemId);
  }

  addToInventory(itemId) {
    this.#assertItem(itemId);
    this.inventory.push(itemId);
  }

  removeFromInventory(itemId) {
    const index = this.inventory.indexOf(itemId);
    if (index === -1) {
      return false;
    }
    this.inventory.splice(index, 1);
    return true;
  }

  canEquip(slotId, itemId) {
    const slot = this.#getSlot(slotId);
    const item = this.#getItem(itemId);
    if (!slot || !item) {
      return false;
    }

    const { slotIds = [], slotTags = [] } = item.requirements ?? {};

    if (slotIds.length > 0 && !slotIds.includes(slotId)) {
      return false;
    }

    if (slotTags.length > 0) {
      const slotCompatible = new Set(slot.compatibleTags ?? []);
      const matches = slotTags.some((tag) => slotCompatible.has(tag));
      if (!matches) {
        return false;
      }
    }

    return true;
  }

  equipItem(slotId, itemId) {
    this.#assertSlot(slotId);
    this.#assertItem(itemId);

    if (!this.canEquip(slotId, itemId)) {
      throw new Error(`Item ${itemId} cannot be equipped in slot ${slotId}.`);
    }

    const index = this.inventory.indexOf(itemId);
    if (index === -1) {
      throw new Error(`Item ${itemId} is not available in the inventory.`);
    }

    const previouslyEquipped = this.equipment[slotId];

    if (previouslyEquipped === itemId) {
      return { equipped: itemId, unequipped: null };
    }

    this.inventory.splice(index, 1);
    this.equipment[slotId] = itemId;

    if (previouslyEquipped) {
      this.inventory.push(previouslyEquipped);
    }

    return { equipped: itemId, unequipped: previouslyEquipped ?? null };
  }

  unequipItem(slotId) {
    this.#assertSlot(slotId);
    const equippedItem = this.equipment[slotId];

    if (!equippedItem) {
      return null;
    }

    this.inventory.push(equippedItem);
    this.equipment[slotId] = null;
    return equippedItem;
  }

  #getSlot(slotId) {
    return EQUIPMENT_SLOT_MAP[slotId] ?? null;
  }

  #getItem(itemId) {
    return ITEMS_BY_ID[itemId] ?? null;
  }

  #assertSlot(slotId) {
    if (!this.#getSlot(slotId)) {
      throw new Error(`Unknown equipment slot: ${slotId}`);
    }
  }

  #assertItem(itemId) {
    if (!this.#getItem(itemId)) {
      throw new Error(`Unknown item: ${itemId}`);
    }
  }
}
