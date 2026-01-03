/**
 * DialogueScene - Shows NPC dialogue in a text box
 */

export class DialogueScene {
  #container;
  #dialogueSystem;
  #onComplete;
  #keyHandler;

  constructor(dialogueSystem, onComplete) {
    this.#dialogueSystem = dialogueSystem;
    this.#onComplete = onComplete;
    this.#container = null;
  }

  mount(parentElement) {
    this.#container = document.createElement('div');
    this.#container.className = 'dialogue-scene';

    const npc = this.#dialogueSystem.getNPC();
    const line = this.#dialogueSystem.getCurrentLine();

    this.#container.innerHTML = `
      <div class="dialogue-box">
        <div class="dialogue-npc-name">${npc ? npc.name : 'Unknown'}</div>
        <div class="dialogue-text">${line || ''}</div>
        <div class="dialogue-prompt">▼ Press SPACE to continue</div>
      </div>
    `;

    parentElement.appendChild(this.#container);

    // Keyboard controls
    this.#keyHandler = (e) => {
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'z') {
        e.preventDefault();
        this.#advance();
      }
    };
    document.addEventListener('keydown', this.#keyHandler);
  }

  #advance() {
    const hasMore = this.#dialogueSystem.advance();

    if (!hasMore) {
      this.close();
    } else {
      this.#updateText();
    }
  }

  #updateText() {
    const line = this.#dialogueSystem.getCurrentLine();
    const textEl = this.#container.querySelector('.dialogue-text');
    if (textEl && line) {
      textEl.textContent = line;
    }
  }

  close() {
    this.unmount();
    if (this.#onComplete) {
      this.#onComplete();
    }
  }

  unmount() {
    if (this.#keyHandler) {
      document.removeEventListener('keydown', this.#keyHandler);
      this.#keyHandler = null;
    }

    if (this.#container && this.#container.parentElement) {
      this.#container.parentElement.removeChild(this.#container);
    }
    this.#container = null;
  }
}
