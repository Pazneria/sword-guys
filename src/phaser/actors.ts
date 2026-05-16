import { NPCDefinition, TILE_SIZE } from '../game/types';

export const ACTOR_DEPTH = 9500;
export const PLAYER_OVERWORLD_SCALE = 0.5;
export const PLAYER_OVERWORLD_DISPLAY_SIZE = { width: TILE_SIZE, height: TILE_SIZE } as const;
export const NPC_OVERWORLD_DISPLAY_SIZE = { width: TILE_SIZE, height: TILE_SIZE } as const;

export interface NpcOverworldRenderSpec {
  x: number;
  y: number;
  originX: number;
  originY: number;
  displayWidth: number;
  displayHeight: number;
  depth: number;
}

export const npcOverworldRenderSpec = (npc: NPCDefinition): NpcOverworldRenderSpec => {
  const footY = npc.y * TILE_SIZE + TILE_SIZE;
  return {
    x: npc.x * TILE_SIZE + TILE_SIZE / 2,
    y: footY,
    originX: 0.5,
    originY: 1,
    displayWidth: NPC_OVERWORLD_DISPLAY_SIZE.width,
    displayHeight: NPC_OVERWORLD_DISPLAY_SIZE.height,
    depth: ACTOR_DEPTH + footY / 1000
  };
};
