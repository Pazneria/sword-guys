/**
 * Battle System - Turn-based combat
 */

import { getEnemySkill, chooseEnemyAction, processDrops } from '../data/enemies.js';
import { getItem, calculateEquipmentStats } from '../data/items.js';

export const BATTLE_STATES = {
  INTRO: 'intro',
  PLAYER_TURN: 'player_turn',
  ENEMY_TURN: 'enemy_turn',
  VICTORY: 'victory',
  DEFEAT: 'defeat',
  FLEE: 'flee'
};

export class BattleSystem {
  constructor(gameState, enemy) {
    this.gameState = gameState;
    this.enemy = enemy;
    this.state = BATTLE_STATES.INTRO;
    this.turnCount = 0;
    this.battleLog = [];
    this.rewards = {
      exp: 0,
      gold: 0,
      items: []
    };

    this.selectedAction = null;
    this.selectedTarget = null;

    this.#logMessage(`A wild ${enemy.name} appeared!`);
  }

  // Calculate player's total stats including equipment
  #getPlayerTotalStats() {
    const baseStats = this.gameState.getPlayerStats();
    const equipStats = calculateEquipmentStats(this.gameState.getEquipment());

    return {
      hp: baseStats.health,
      maxHp: baseStats.maxHealth,
      mp: baseStats.mana,
      maxMp: baseStats.maxMana,
      attack: baseStats.strength + equipStats.attack + equipStats.strength,
      defense: baseStats.defense + equipStats.defense,
      agility: baseStats.agility + equipStats.agility,
      intelligence: baseStats.intelligence + equipStats.intelligence
    };
  }

  #logMessage(message) {
    this.battleLog.push({
      message,
      timestamp: Date.now()
    });

    // Keep only last 10 messages
    if (this.battleLog.length > 10) {
      this.battleLog.shift();
    }
  }

  // Player chooses an action
  playerAction(action) {
    if (this.state !== BATTLE_STATES.PLAYER_TURN) {
      return { success: false, error: 'Not player turn' };
    }

    switch(action.type) {
      case 'attack':
        return this.#playerAttack();
      case 'skill':
        return this.#playerSkill(action.skillId);
      case 'item':
        return this.#playerUseItem(action.itemId);
      case 'flee':
        return this.#attemptFlee();
      default:
        return { success: false, error: 'Unknown action' };
    }
  }

  #playerAttack() {
    const playerStats = this.#getPlayerTotalStats();

    // Calculate damage
    const baseDamage = playerStats.attack;
    const variance = 0.1; // ±10% damage variance
    const damage = Math.floor(
      baseDamage * (1 + (Math.random() - 0.5) * variance * 2) - this.enemy.stats.defense / 2
    );

    const finalDamage = Math.max(1, damage);

    this.enemy.stats.hp -= finalDamage;
    this.#logMessage(`You attack for ${finalDamage} damage!`);

    if (this.enemy.stats.hp <= 0) {
      this.#victory();
    } else {
      this.state = BATTLE_STATES.ENEMY_TURN;
      // Auto-execute enemy turn after a delay
      setTimeout(() => this.#enemyTurn(), 500);
    }

    return { success: true, damage: finalDamage };
  }

  #playerSkill(skillId) {
    // TODO: Implement player skills
    return { success: false, error: 'Skills not yet implemented' };
  }

  #playerUseItem(itemId) {
    const item = getItem(itemId);
    if (!item) {
      return { success: false, error: 'Item not found' };
    }

    if (!item.usableInBattle) {
      return { success: false, error: 'Cannot use this item in battle' };
    }

    // Check if player has the item
    const inventory = this.gameState.getInventory();
    const itemIndex = inventory.findIndex(invItem => invItem.id === itemId);

    if (itemIndex === -1) {
      return { success: false, error: 'You don\'t have this item' };
    }

    // Use the item
    const result = this.#applyItemEffect(item);

    if (result.success) {
      // Remove item from inventory
      this.gameState.removeItem(itemIndex);

      this.state = BATTLE_STATES.ENEMY_TURN;
      setTimeout(() => this.#enemyTurn(), 500);
    }

    return result;
  }

  #applyItemEffect(item) {
    const effect = item.effect;
    const playerState = this.gameState.getPlayerState();

    switch(effect.type) {
      case 'heal':
        const healAmount = Math.min(effect.value, playerState.maxHealth - playerState.health);
        this.gameState.updatePlayerStats({
          health: playerState.health + healAmount
        });
        this.#logMessage(`You used ${item.name} and recovered ${healAmount} HP!`);
        return { success: true, value: healAmount };

      case 'restoreMana':
        const manaAmount = Math.min(effect.value, playerState.maxMana - playerState.mana);
        this.gameState.updatePlayerStats({
          mana: playerState.mana + manaAmount
        });
        this.#logMessage(`You used ${item.name} and recovered ${manaAmount} MP!`);
        return { success: true, value: manaAmount };

      case 'cureStatus':
        // TODO: Implement status effects
        this.#logMessage(`You used ${item.name}!`);
        return { success: true };

      default:
        return { success: false, error: 'Unknown item effect' };
    }
  }

  #attemptFlee() {
    const playerStats = this.#getPlayerTotalStats();
    const fleeChance = Math.min(0.9, playerStats.agility / (this.enemy.stats.agility + playerStats.agility));

    if (Math.random() < fleeChance) {
      this.state = BATTLE_STATES.FLEE;
      this.#logMessage('You fled from battle!');
      return { success: true };
    } else {
      this.#logMessage('Failed to flee!');
      this.state = BATTLE_STATES.ENEMY_TURN;
      setTimeout(() => this.#enemyTurn(), 500);
      return { success: false };
    }
  }

  #enemyTurn() {
    if (this.state !== BATTLE_STATES.ENEMY_TURN) return;

    const action = chooseEnemyAction(this.enemy);
    const skill = getEnemySkill(action.skillId);

    if (!skill) {
      this.#logMessage(`${this.enemy.name} is confused!`);
      this.state = BATTLE_STATES.PLAYER_TURN;
      return;
    }

    // Calculate damage
    const baseDamage = this.enemy.stats.attack * skill.power;
    const playerStats = this.#getPlayerTotalStats();
    const variance = 0.1;
    const damage = Math.floor(
      baseDamage * (1 + (Math.random() - 0.5) * variance * 2) - playerStats.defense / 2
    );

    const finalDamage = Math.max(1, damage);

    // Apply damage to player
    const newHealth = Math.max(0, playerStats.hp - finalDamage);
    this.gameState.updatePlayerStats({ health: newHealth });

    this.#logMessage(`${this.enemy.name} used ${skill.name} for ${finalDamage} damage!`);

    // Check for player defeat
    if (newHealth <= 0) {
      this.#defeat();
    } else {
      this.state = BATTLE_STATES.PLAYER_TURN;
    }
  }

  #victory() {
    this.state = BATTLE_STATES.VICTORY;

    // Calculate rewards
    this.rewards.exp = this.enemy.exp;
    this.rewards.gold = this.enemy.gold;
    this.rewards.items = processDrops(this.enemy);

    this.#logMessage(`Victory! You gained ${this.rewards.exp} EXP and ${this.rewards.gold} gold!`);

    if (this.rewards.items.length > 0) {
      this.rewards.items.forEach(itemId => {
        const item = getItem(itemId);
        if (item) {
          this.#logMessage(`Found: ${item.name}!`);
        }
      });
    }

    // Apply rewards
    const playerState = this.gameState.getPlayerState();
    this.gameState.addGold(this.rewards.gold);

    // Add items to inventory
    this.rewards.items.forEach(itemId => {
      this.gameState.addItem({ id: itemId, quantity: 1 });
    });

    // Add experience
    const newExp = playerState.experience + this.rewards.exp;
    const expForNextLevel = this.#getExpForLevel(playerState.level + 1);

    if (newExp >= expForNextLevel) {
      this.#levelUp(newExp);
    } else {
      this.gameState.updatePlayerStats({ experience: newExp });
    }
  }

  #defeat() {
    this.state = BATTLE_STATES.DEFEAT;
    this.#logMessage('You were defeated...');
  }

  #levelUp(exp) {
    const playerState = this.gameState.getPlayerState();
    const newLevel = playerState.level + 1;

    this.#logMessage(`Level Up! You are now level ${newLevel}!`);

    // Increase stats
    const statGains = {
      level: newLevel,
      experience: exp,
      maxHealth: playerState.maxHealth + 10,
      maxMana: playerState.maxMana + 5,
      strength: playerState.strength + 2,
      defense: playerState.defense + 1,
      agility: playerState.agility + 1,
      intelligence: playerState.intelligence + 1
    };

    // Fully heal on level up
    statGains.health = statGains.maxHealth;
    statGains.mana = statGains.maxMana;

    this.gameState.updatePlayerStats(statGains);
  }

  #getExpForLevel(level) {
    // Simple exp curve: 100 * level^1.5
    return Math.floor(100 * Math.pow(level, 1.5));
  }

  // Start the battle (transition from intro to player turn)
  start() {
    this.state = BATTLE_STATES.PLAYER_TURN;
    this.#logMessage('Choose your action!');
  }

  // Get current battle state
  getState() {
    return this.state;
  }

  // Get battle log
  getLog() {
    return this.battleLog;
  }

  // Get enemy info
  getEnemy() {
    return this.enemy;
  }

  // Get rewards (only valid after victory)
  getRewards() {
    return this.rewards;
  }
}
