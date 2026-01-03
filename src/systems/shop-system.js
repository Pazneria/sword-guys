/**
 * Shop System - Buy and sell items
 */

import { getItem } from '../data/items.js';

export const SHOP_MODES = {
  BUY: 'buy',
  SELL: 'sell'
};

export class ShopSystem {
  constructor(gameState) {
    this.gameState = gameState;
    this.active = false;
    this.mode = SHOP_MODES.BUY;
    this.currentShop = null;
    this.shopInventory = [];
    this.selectedIndex = 0;
  }

  // Open a shop
  openShop(npc) {
    if (!npc.hasShop()) {
      return { success: false, error: 'This NPC has no shop' };
    }

    this.active = true;
    this.currentShop = npc;
    this.mode = SHOP_MODES.BUY;
    this.selectedIndex = 0;

    // Load shop inventory
    this.shopInventory = npc.shopInventory
      .map(itemId => getItem(itemId))
      .filter(item => item !== null && item !== undefined);

    return { success: true };
  }

  // Close the shop
  closeShop() {
    this.active = false;
    this.currentShop = null;
    this.shopInventory = [];
    this.selectedIndex = 0;
  }

  // Switch between buy and sell modes
  setMode(mode) {
    if (mode === SHOP_MODES.BUY || mode === SHOP_MODES.SELL) {
      this.mode = mode;
      this.selectedIndex = 0;
      return true;
    }
    return false;
  }

  // Get current shop inventory (for buy mode) or player inventory (for sell mode)
  getCurrentInventory() {
    if (this.mode === SHOP_MODES.BUY) {
      return this.shopInventory;
    } else {
      return this.gameState.getInventory()
        .map(invItem => {
          const item = getItem(invItem.id);
          return item ? { ...item, quantity: invItem.quantity } : null;
        })
        .filter(item => item !== null && item.type !== 'key_item'); // Can't sell key items
    }
  }

  // Get selected item
  getSelectedItem() {
    const inventory = this.getCurrentInventory();
    return inventory[this.selectedIndex] || null;
  }

  // Move selection
  moveSelection(delta) {
    const inventory = this.getCurrentInventory();
    this.selectedIndex = Math.max(0, Math.min(inventory.length - 1, this.selectedIndex + delta));
  }

  // Buy an item
  buyItem(itemIndex = null) {
    if (this.mode !== SHOP_MODES.BUY) {
      return { success: false, error: 'Not in buy mode' };
    }

    const index = itemIndex !== null ? itemIndex : this.selectedIndex;
    const item = this.shopInventory[index];

    if (!item) {
      return { success: false, error: 'Item not found' };
    }

    const playerGold = this.gameState.getGold();

    if (playerGold < item.price) {
      return { success: false, error: 'Not enough gold' };
    }

    // Check inventory space (max 99 items)
    const currentInventory = this.gameState.getInventory();
    if (currentInventory.length >= 99) {
      return { success: false, error: 'Inventory full' };
    }

    // Deduct gold
    this.gameState.addGold(-item.price);

    // Add item to inventory
    this.gameState.addItem({ id: item.id, quantity: 1 });

    return { success: true, item: item.name, price: item.price };
  }

  // Sell an item
  sellItem(itemIndex = null) {
    if (this.mode !== SHOP_MODES.SELL) {
      return { success: false, error: 'Not in sell mode' };
    }

    const inventory = this.getCurrentInventory();
    const index = itemIndex !== null ? itemIndex : this.selectedIndex;
    const item = inventory[index];

    if (!item) {
      return { success: false, error: 'Item not found' };
    }

    if (item.type === 'key_item') {
      return { success: false, error: 'Cannot sell key items' };
    }

    // Add gold
    this.gameState.addGold(item.sellPrice || 0);

    // Remove item from inventory
    const playerInventory = this.gameState.getInventory();
    const invIndex = playerInventory.findIndex(invItem => invItem.id === item.id);

    if (invIndex !== -1) {
      this.gameState.removeItem(invIndex);
    }

    return { success: true, item: item.name, price: item.sellPrice };
  }

  // Check if shop is active
  isActive() {
    return this.active;
  }

  // Get current mode
  getMode() {
    return this.mode;
  }

  // Get player gold
  getPlayerGold() {
    return this.gameState.getGold();
  }
}
