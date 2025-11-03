import { EQUIPMENT_SLOTS } from '../../data/equipment-slots.js';
import { ITEMS_BY_ID } from '../../data/items.js';

const createElement = (tag, options = {}) => {
  const element = document.createElement(tag);
  if (options.className) {
    element.className = options.className;
  }
  if (options.textContent) {
    element.textContent = options.textContent;
  }
  return element;
};

const describeItem = (itemId) => ITEMS_BY_ID[itemId]?.name ?? 'Unknown item';

export class EquipmentPanel {
  constructor(gameState) {
    this.gameState = gameState;
    this.element = null;
    this.slotSections = new Map();
  }

  mount(root) {
    if (this.element?.isConnected) {
      this.element.remove();
    }

    this.element = createElement('section', { className: 'equipment-panel' });
    const title = createElement('h2', { textContent: 'Equipment' });
    this.element.appendChild(title);

    const slotsContainer = createElement('div', { className: 'equipment-panel__slots' });
    this.element.appendChild(slotsContainer);

    this.slotSections.clear();
    for (const slot of EQUIPMENT_SLOTS) {
      const section = this.#createSlotSection(slot);
      this.slotSections.set(slot.id, section);
      slotsContainer.appendChild(section.container);
    }

    root.appendChild(this.element);
    this.refresh();
    return this.element;
  }

  unmount() {
    if (this.element?.isConnected) {
      this.element.remove();
    }
    this.element = null;
    this.slotSections.clear();
  }

  refresh() {
    for (const slot of EQUIPMENT_SLOTS) {
      const section = this.slotSections.get(slot.id);
      if (!section) {
        continue;
      }
      this.#renderSlot(section, slot.id);
    }
  }

  #createSlotSection(slot) {
    const container = createElement('div', {
      className: 'equipment-panel__slot',
    });

    const header = createElement('header', {
      className: 'equipment-panel__slot-header',
    });

    const title = createElement('span', {
      className: 'equipment-panel__slot-title',
      textContent: slot.label,
    });
    header.appendChild(title);

    const unequipButton = createElement('button', {
      className: 'equipment-panel__unequip',
      textContent: 'Unequip',
    });
    unequipButton.addEventListener('click', () => {
      this.gameState.unequipItem(slot.id);
      this.refresh();
    });
    header.appendChild(unequipButton);

    container.appendChild(header);

    const equippedLabel = createElement('div', {
      className: 'equipment-panel__equipped',
    });
    container.appendChild(equippedLabel);

    const inventoryList = createElement('div', {
      className: 'equipment-panel__options',
    });
    container.appendChild(inventoryList);

    return {
      container,
      equippedLabel,
      inventoryList,
      unequipButton,
    };
  }

  #renderSlot(section, slotId) {
    const equipped = this.gameState.getEquipped(slotId);
    section.equippedLabel.textContent = equipped
      ? `Equipped: ${describeItem(equipped)}`
      : 'Equipped: None';

    section.unequipButton.disabled = !equipped;

    section.inventoryList.replaceChildren();

    const inventory = this.gameState
      .getInventory()
      .filter((itemId) => this.gameState.canEquip(slotId, itemId));

    if (inventory.length === 0) {
      const emptyLabel = createElement('p', {
        className: 'equipment-panel__empty',
        textContent: 'No compatible items in inventory.',
      });
      section.inventoryList.appendChild(emptyLabel);
      return;
    }

    const counts = new Map();
    for (const itemId of inventory) {
      counts.set(itemId, (counts.get(itemId) ?? 0) + 1);
    }

    for (const [itemId, count] of counts.entries()) {
      const button = createElement('button', {
        className: 'equipment-panel__equip',
      });
      const label = describeItem(itemId);
      button.textContent = count > 1 ? `Equip ${label} (x${count})` : `Equip ${label}`;
      button.addEventListener('click', () => {
        try {
          this.gameState.equipItem(slotId, itemId);
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(error);
        }
        this.refresh();
      });
      section.inventoryList.appendChild(button);
    }
  }
}
