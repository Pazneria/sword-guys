# Sword Guys

Welcome to **Sword Guys**, a 2D pixel art RPG currently under active development. This repository starts with a lightweight HTML entry point that renders the game's title screen and includes an opinionated project layout to support future gameplay systems.

## Getting started

Open `index.html` in a modern browser to view the interactive title screen.

## Project structure

```
.
├── assets
│   ├── audio          # Placeholder for music, sound effects, and ambiance
│   ├── fonts          # Custom or bitmap fonts for UI and dialogue
│   └── images         # Concept art, spritesheets, backgrounds
├── docs               # Game design documents, lore, and planning notes
├── scripts            # Tooling scripts (build, packaging, automation)
├── src
│   ├── config         # Configuration data (game settings, tuning tables)
│   ├── core           # Engine bootstrap code and global services
│   ├── entities       # Entity definitions (players, NPCs, enemies)
│   ├── scenes         # Scene controllers such as title screen, overworld, battles
│   ├── systems        # Gameplay systems (combat, quests, inventory)
│   ├── ui
│   │   ├── components # Reusable UI widgets (menus, HUD elements)
│   │   └── styles     # Stylesheets for UI and scene presentation
│   └── utils          # Shared helpers (math, pathfinding, state management)
└── tests              # Automated tests for engine systems and scenes
```

Each empty directory currently contains a `.gitkeep` placeholder so the structure remains under version control until populated.

## Next steps

As development progresses we can begin fleshing out the engine, gameplay systems, and assets within this scaffold.
