export const STARTER_ITEMS = [
  {
    id: 'minor-healing-potion',
    name: 'Minor Healing Potion',
    description: 'A simple concoction that restores a small amount of health when consumed.',
    category: 'Consumables',
    stackLimit: 5,
    startingQuantity: 3,
  },
  {
    id: 'stamina-tonic',
    name: 'Stamina Tonic',
    description: 'An herbal mixture that refreshes tired muscles and restores stamina.',
    category: 'Consumables',
    stackLimit: 5,
    startingQuantity: 2,
  },
  {
    id: 'wooden-sword',
    name: 'Wooden Sword',
    description: 'A training blade that is better than bare hands, but only just.',
    category: 'Weapons',
    stackLimit: 1,
    startingQuantity: 1,
  },
  {
    id: 'leather-tunic',
    name: 'Leather Tunic',
    description: 'Well-worn armor offering minimal protection against the wilderness.',
    category: 'Armor',
    stackLimit: 1,
    startingQuantity: 1,
  },
  {
    id: 'camp-kit',
    name: 'Camp Kit',
    description: 'Bedroll, flint, and all the essentials for making camp on short notice.',
    category: 'Key Items',
    stackLimit: 1,
    startingQuantity: 1,
  },
];

export const ITEMS_BY_ID = new Map(STARTER_ITEMS.map((item) => [item.id, item]));

export function getStarterInventory() {
  return STARTER_ITEMS.filter((item) => item.startingQuantity > 0).map((item) => ({
    id: item.id,
    quantity: item.startingQuantity,
  }));
}
