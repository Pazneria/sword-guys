import { STARTER_ITEMS, getStarterInventory } from '../data/items.js';

const DEFAULT_CATEGORY = 'Miscellaneous';

export class GameState {
  constructor({ itemsCatalog = STARTER_ITEMS, starterInventory = null } = {}) {
    this.itemsCatalog = [...itemsCatalog];
    this.itemsById = new Map(itemsCatalog.map((item) => [item.id, item]));

    this.categoryOrder = [];
    const seenCategories = new Set();
    for (const item of this.itemsCatalog) {
      const category = item.category ?? DEFAULT_CATEGORY;
      if (!seenCategories.has(category)) {
        seenCategories.add(category);
        this.categoryOrder.push(category);
      }
    }

    this.inventory = new Map();
    this.inventoryListeners = new Set();

    const initialInventory =
      starterInventory ?? getStarterInventory();

    for (const entry of initialInventory) {
      const definition = this.itemsById.get(entry.id);
      if (!definition || !Number.isFinite(entry.quantity) || entry.quantity <= 0) {
        continue;
      }

      this.inventory.set(entry.id, Math.floor(entry.quantity));
    }
  }

  addInventoryListener(listener) {
    if (typeof listener !== 'function') {
      return () => {};
    }

    this.inventoryListeners.add(listener);
    listener(this.getInventorySnapshot());

    return () => {
      this.inventoryListeners.delete(listener);
    };
  }

  addItem(itemId, quantity = 1) {
    const definition = this.itemsById.get(itemId);
    if (!definition) {
      throw new Error(`Unknown item: ${itemId}`);
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      return this.getItemQuantity(itemId);
    }

    const current = this.inventory.get(itemId) ?? 0;
    const nextQuantity = current + Math.floor(quantity);
    this.inventory.set(itemId, nextQuantity);
    this.#emitInventoryChange();
    return nextQuantity;
  }

  useItem(itemId, quantity = 1) {
    const definition = this.itemsById.get(itemId);
    if (!definition) {
      throw new Error(`Unknown item: ${itemId}`);
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      return false;
    }

    const current = this.inventory.get(itemId) ?? 0;
    if (current <= 0) {
      return false;
    }

    const nextQuantity = Math.max(0, current - Math.floor(quantity));
    if (nextQuantity > 0) {
      this.inventory.set(itemId, nextQuantity);
    } else {
      this.inventory.delete(itemId);
    }

    this.#emitInventoryChange();
    return true;
  }

  getItemDefinition(itemId) {
    return this.itemsById.get(itemId) ?? null;
  }

  getItemQuantity(itemId) {
    return this.inventory.get(itemId) ?? 0;
  }

  getInventorySnapshot() {
    const snapshot = { categories: [] };
    const categories = snapshot.categories;
    const categoryMap = new Map();

    for (const categoryName of this.categoryOrder) {
      categoryMap.set(categoryName, []);
    }

    for (const item of this.itemsCatalog) {
      const quantity = this.inventory.get(item.id) ?? 0;
      if (quantity <= 0) {
        continue;
      }

      const category = item.category ?? DEFAULT_CATEGORY;
      if (!categoryMap.has(category)) {
        categoryMap.set(category, []);
        this.categoryOrder.push(category);
      }

      const bucket = categoryMap.get(category);
      bucket.push({
        id: item.id,
        definition: item,
        quantity,
        stacks: this.#splitStacks(quantity, item.stackLimit),
      });
    }

    for (const categoryName of this.categoryOrder) {
      const entries = categoryMap.get(categoryName) ?? [];
      if (!entries.length) {
        continue;
      }

      categories.push({
        category: categoryName,
        items: entries,
      });
    }

    return snapshot;
  }

  destroy() {
    this.inventoryListeners.clear();
  }

  #splitStacks(quantity, stackLimit) {
    const limit = Number.isFinite(stackLimit) && stackLimit > 0 ? stackLimit : quantity;
    const stacks = [];
    let remaining = quantity;
    while (remaining > 0) {
      const stackSize = Math.min(limit, remaining);
      stacks.push(stackSize);
      remaining -= stackSize;
    }
    return stacks;
  }

  #emitInventoryChange() {
    const payload = this.getInventorySnapshot();
    for (const listener of this.inventoryListeners) {
      listener(payload);
    }
  }
}
