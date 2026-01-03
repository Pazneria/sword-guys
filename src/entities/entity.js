/**
 * Base Entity class for all game entities (Player, NPCs, etc.)
 */

export class Entity {
  constructor(x, y, options = {}) {
    this.x = x;
    this.y = y;
    this.width = options.width || 1; // In tiles
    this.height = options.height || 1;
    this.direction = options.direction || 'down'; // up, down, left, right
    this.sprite = options.sprite || null;
    this.name = options.name || 'Entity';
    this.id = options.id || null;
  }

  // Update entity (override in subclasses)
  update(deltaTime) {
    // Base entities don't update
  }

  // Render entity (override in subclasses)
  render(ctx, x, y, size) {
    // Draw a simple colored square as default
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(x, y, size, size);
  }

  // Move to a new position
  moveTo(x, y) {
    this.x = x;
    this.y = y;
  }

  // Set direction
  setDirection(direction) {
    this.direction = direction;
  }

  // Get tile position
  getPosition() {
    return { x: this.x, y: this.y };
  }
}

/**
 * Player Entity
 */
export class Player extends Entity {
  constructor(x, y, gameState) {
    super(x, y, { name: 'Player', sprite: 'player' });
    this.gameState = gameState;
    this.moving = false;
    this.moveProgress = 0;
    this.targetX = x;
    this.targetY = y;
    this.moveSpeed = 4; // Tiles per second
  }

  // Start moving to a new tile
  startMove(targetX, targetY) {
    this.targetX = targetX;
    this.targetY = targetY;
    this.moving = true;
    this.moveProgress = 0;
  }

  // Update player movement
  update(deltaTime) {
    if (this.moving) {
      this.moveProgress += deltaTime * this.moveSpeed;

      if (this.moveProgress >= 1) {
        // Movement complete
        this.x = this.targetX;
        this.y = this.targetY;
        this.moving = false;
        this.moveProgress = 0;
      }
    }
  }

  // Get interpolated position for smooth movement
  getDisplayPosition() {
    if (!this.moving) {
      return { x: this.x, y: this.y };
    }

    const progress = Math.min(this.moveProgress, 1);
    return {
      x: this.x + (this.targetX - this.x) * progress,
      y: this.y + (this.targetY - this.y) * progress
    };
  }

  render(ctx, x, y, size) {
    // Use interpolated position for smooth movement
    const displayPos = this.getDisplayPosition();
    const offsetX = (displayPos.x - this.x) * size;
    const offsetY = (displayPos.y - this.y) * size;

    // Draw player sprite (simple for now)
    ctx.save();

    // Body
    ctx.fillStyle = '#3498db';
    ctx.fillRect(x + offsetX + size * 0.25, y + offsetY + size * 0.4, size * 0.5, size * 0.5);

    // Head
    ctx.fillStyle = '#f39c12';
    ctx.beginPath();
    ctx.arc(x + offsetX + size * 0.5, y + offsetY + size * 0.3, size * 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Simple direction indicator
    ctx.fillStyle = '#2c3e50';
    switch(this.direction) {
      case 'up':
        ctx.fillRect(x + offsetX + size * 0.45, y + offsetY + size * 0.15, size * 0.1, size * 0.1);
        break;
      case 'down':
        ctx.fillRect(x + offsetX + size * 0.45, y + offsetY + size * 0.45, size * 0.1, size * 0.1);
        break;
      case 'left':
        ctx.fillRect(x + offsetX + size * 0.15, y + offsetY + size * 0.3, size * 0.1, size * 0.1);
        break;
      case 'right':
        ctx.fillRect(x + offsetX + size * 0.75, y + offsetY + size * 0.3, size * 0.1, size * 0.1);
        break;
    }

    ctx.restore();
  }

  isMoving() {
    return this.moving;
  }
}

/**
 * NPC Entity
 */
export class NPC extends Entity {
  constructor(x, y, data) {
    super(x, y, {
      name: data.name || 'NPC',
      sprite: data.sprite || 'npc',
      id: data.id
    });

    this.dialogue = data.dialogue || [];
    this.currentDialogueIndex = 0;
    this.shop = data.shop || false;
    this.shopInventory = data.shopInventory || [];
    this.questGiver = data.questGiver || false;
  }

  // Get next dialogue line
  getDialogue() {
    if (this.dialogue.length === 0) return null;

    const line = this.dialogue[this.currentDialogueIndex];
    this.currentDialogueIndex = (this.currentDialogueIndex + 1) % this.dialogue.length;
    return line;
  }

  // Reset dialogue to beginning
  resetDialogue() {
    this.currentDialogueIndex = 0;
  }

  render(ctx, x, y, size) {
    // Draw NPC sprite (simple for now)
    ctx.save();

    // Body
    ctx.fillStyle = '#9b59b6';
    ctx.fillRect(x + size * 0.25, y + size * 0.4, size * 0.5, size * 0.5);

    // Head
    ctx.fillStyle = '#ecf0f1';
    ctx.beginPath();
    ctx.arc(x + size * 0.5, y + size * 0.3, size * 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Shop indicator
    if (this.shop) {
      ctx.fillStyle = '#f39c12';
      ctx.font = `${size * 0.3}px "Press Start 2P", monospace`;
      ctx.textAlign = 'center';
      ctx.fillText('$', x + size * 0.5, y + size * 0.15);
    }

    ctx.restore();
  }

  // Check if this NPC has a shop
  hasShop() {
    return this.shop && this.shopInventory.length > 0;
  }
}
