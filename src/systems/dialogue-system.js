/**
 * Dialogue System - Handles NPC conversations
 */

export class DialogueSystem {
  constructor() {
    this.active = false;
    this.currentNPC = null;
    this.currentDialogue = null;
    this.dialogueIndex = 0;
    this.onComplete = null;
  }

  // Start a dialogue with an NPC
  startDialogue(npc, onComplete = null) {
    this.active = true;
    this.currentNPC = npc;
    this.dialogueIndex = 0;
    this.onComplete = onComplete;

    if (Array.isArray(npc.dialogue)) {
      this.currentDialogue = npc.dialogue;
    } else {
      this.currentDialogue = [npc.dialogue || 'Hello!'];
    }
  }

  // Get current dialogue line
  getCurrentLine() {
    if (!this.active || !this.currentDialogue) return null;
    return this.currentDialogue[this.dialogueIndex];
  }

  // Advance to next line
  advance() {
    if (!this.active) return false;

    this.dialogueIndex++;

    if (this.dialogueIndex >= this.currentDialogue.length) {
      this.end();
      return false;
    }

    return true;
  }

  // End dialogue
  end() {
    const wasActive = this.active;
    this.active = false;
    this.currentNPC = null;
    this.currentDialogue = null;
    this.dialogueIndex = 0;

    if (wasActive && this.onComplete) {
      this.onComplete();
      this.onComplete = null;
    }
  }

  // Check if dialogue is active
  isActive() {
    return this.active;
  }

  // Get current NPC
  getNPC() {
    return this.currentNPC;
  }

  // Check if there are more lines
  hasMoreLines() {
    return this.active && this.dialogueIndex < this.currentDialogue.length - 1;
  }
}
