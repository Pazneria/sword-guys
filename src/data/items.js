/**
 * Item and Equipment Database
 */

export const ITEM_TYPES = {
  CONSUMABLE: 'consumable',
  WEAPON: 'weapon',
  ARMOR: 'armor',
  ACCESSORY: 'accessory',
  KEY_ITEM: 'key_item'
};

export const ITEMS = {
  // Consumables
  potion: {
    id: 'potion',
    name: 'Potion',
    type: ITEM_TYPES.CONSUMABLE,
    description: 'Restores 50 HP',
    price: 50,
    sellPrice: 25,
    effect: {
      type: 'heal',
      value: 50
    },
    usableInBattle: true,
    usableInField: true
  },

  hiPotion: {
    id: 'hiPotion',
    name: 'Hi-Potion',
    type: ITEM_TYPES.CONSUMABLE,
    description: 'Restores 150 HP',
    price: 150,
    sellPrice: 75,
    effect: {
      type: 'heal',
      value: 150
    },
    usableInBattle: true,
    usableInField: true
  },

  ether: {
    id: 'ether',
    name: 'Ether',
    type: ITEM_TYPES.CONSUMABLE,
    description: 'Restores 30 MP',
    price: 80,
    sellPrice: 40,
    effect: {
      type: 'restoreMana',
      value: 30
    },
    usableInBattle: true,
    usableInField: true
  },

  antidote: {
    id: 'antidote',
    name: 'Antidote',
    type: ITEM_TYPES.CONSUMABLE,
    description: 'Cures poison',
    price: 30,
    sellPrice: 15,
    effect: {
      type: 'cureStatus',
      status: 'poison'
    },
    usableInBattle: true,
    usableInField: true
  },

  revive: {
    id: 'revive',
    name: 'Revive',
    type: ITEM_TYPES.CONSUMABLE,
    description: 'Revives a fallen ally with 50% HP',
    price: 200,
    sellPrice: 100,
    effect: {
      type: 'revive',
      value: 0.5
    },
    usableInBattle: true,
    usableInField: false
  },

  // Weapons
  woodenSword: {
    id: 'woodenSword',
    name: 'Wooden Sword',
    type: ITEM_TYPES.WEAPON,
    description: 'A basic training sword',
    price: 50,
    sellPrice: 25,
    stats: {
      attack: 5
    }
  },

  sword: {
    id: 'sword',
    name: 'Iron Sword',
    type: ITEM_TYPES.WEAPON,
    description: 'A sturdy iron sword',
    price: 200,
    sellPrice: 100,
    stats: {
      attack: 12
    }
  },

  steelSword: {
    id: 'steelSword',
    name: 'Steel Sword',
    type: ITEM_TYPES.WEAPON,
    description: 'A well-crafted steel blade',
    price: 500,
    sellPrice: 250,
    stats: {
      attack: 20
    }
  },

  excalibur: {
    id: 'excalibur',
    name: 'Excalibur',
    type: ITEM_TYPES.WEAPON,
    description: 'Legendary sword of heroes',
    price: 0, // Can't buy
    sellPrice: 5000,
    stats: {
      attack: 50,
      strength: 5
    }
  },

  staff: {
    id: 'staff',
    name: 'Wooden Staff',
    type: ITEM_TYPES.WEAPON,
    description: 'A simple mage staff',
    price: 100,
    sellPrice: 50,
    stats: {
      attack: 3,
      intelligence: 5
    }
  },

  // Armor
  clothArmor: {
    id: 'clothArmor',
    name: 'Cloth Armor',
    type: ITEM_TYPES.ARMOR,
    description: 'Basic cloth protection',
    price: 50,
    sellPrice: 25,
    stats: {
      defense: 3
    }
  },

  leatherArmor: {
    id: 'leatherArmor',
    name: 'Leather Armor',
    type: ITEM_TYPES.ARMOR,
    description: 'Light but protective',
    price: 150,
    sellPrice: 75,
    stats: {
      defense: 8,
      agility: 2
    }
  },

  shield: {
    id: 'shield',
    name: 'Iron Shield',
    type: ITEM_TYPES.ARMOR,
    description: 'A solid iron shield',
    price: 180,
    sellPrice: 90,
    stats: {
      defense: 10
    }
  },

  steelArmor: {
    id: 'steelArmor',
    name: 'Steel Armor',
    type: ITEM_TYPES.ARMOR,
    description: 'Heavy steel plate armor',
    price: 600,
    sellPrice: 300,
    stats: {
      defense: 18,
      agility: -2
    }
  },

  // Accessories
  powerRing: {
    id: 'powerRing',
    name: 'Power Ring',
    type: ITEM_TYPES.ACCESSORY,
    description: 'Increases strength',
    price: 300,
    sellPrice: 150,
    stats: {
      strength: 5
    }
  },

  speedBoots: {
    id: 'speedBoots',
    name: 'Speed Boots',
    type: ITEM_TYPES.ACCESSORY,
    description: 'Increases agility',
    price: 300,
    sellPrice: 150,
    stats: {
      agility: 5
    }
  },

  wisdomAmulet: {
    id: 'wisdomAmulet',
    name: 'Wisdom Amulet',
    type: ITEM_TYPES.ACCESSORY,
    description: 'Increases intelligence',
    price: 300,
    sellPrice: 150,
    stats: {
      intelligence: 5
    }
  },

  // Key Items
  townKey: {
    id: 'townKey',
    name: 'Town Key',
    type: ITEM_TYPES.KEY_ITEM,
    description: 'A key to the town gate',
    price: 0,
    sellPrice: 0
  }
};

// Get item by id
export function getItem(itemId) {
  return ITEMS[itemId];
}

// Get all items of a type
export function getItemsByType(type) {
  return Object.values(ITEMS).filter(item => item.type === type);
}

// Calculate total stats from equipped items
export function calculateEquipmentStats(equipment) {
  const stats = {
    attack: 0,
    defense: 0,
    strength: 0,
    agility: 0,
    intelligence: 0
  };

  Object.values(equipment).forEach(itemId => {
    if (itemId) {
      const item = getItem(itemId);
      if (item && item.stats) {
        Object.keys(item.stats).forEach(stat => {
          stats[stat] = (stats[stat] || 0) + item.stats[stat];
        });
      }
    }
  });

  return stats;
}
