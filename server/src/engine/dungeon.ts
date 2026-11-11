/**
 * Dungeon State Engine
 *
 * Central state manager for the MUD world — rooms, monsters, and players.
 * All mutations go through this class to maintain consistency.
 */

import type { Room, Monster, Player } from '@necro-mud/shared';

export class DungeonState {
  private rooms: Map<string, Room> = new Map();
  private monsters: Map<string, Monster> = new Map();
  private players: Map<string, Player> = new Map();

  constructor(rooms: Room[], monsters: Monster[]) {
    for (const room of rooms) {
      this.rooms.set(room.id, room);
    }
    for (const monster of monsters) {
      this.monsters.set(monster.id, monster);
    }
  }

  // ── Room Operations ──────────────────────────────────────────────

  getRoom(id: string): Room | undefined {
    return this.rooms.get(id);
  }

  getRoomCount(): number {
    return this.rooms.size;
  }

  getAllRooms(): Room[] {
    return Array.from(this.rooms.values());
  }

  /**
   * Hot-swap the entire dungeon with new rooms and monsters.
   * Teleports all active players safely to 'entrance' and resets their visited state.
   */
  loadDungeon(rooms: Room[], monsters: Monster[]): void {
    this.rooms.clear();
    this.monsters.clear();

    for (const room of rooms) {
      this.rooms.set(room.id, room);
    }
    for (const monster of monsters) {
      this.monsters.set(monster.id, monster);
    }

    const entrance = this.rooms.get('entrance');
    for (const player of this.players.values()) {
      player.currentRoomId = 'entrance';
      player.visitedRooms = ['entrance'];
      if (entrance && !entrance.playerIds.includes(player.id)) {
        entrance.playerIds.push(player.id);
      }
    }

    if (entrance) {
      entrance.discovered = true;
    }
  }

  // ── Monster Operations ───────────────────────────────────────────

  getMonster(id: string): Monster | undefined {
    return this.monsters.get(id);
  }

  getMonsterCount(): number {
    return this.monsters.size;
  }

  getRoomMonsters(roomId: string): Monster[] {
    const room = this.rooms.get(roomId);
    if (!room) return [];
    return room.monsterIds
      .map(id => this.monsters.get(id))
      .filter((m): m is Monster => m !== undefined && m.alive);
  }

  /**
   * Find a monster by partial name match within a room.
   * Case-insensitive, matches substring.
   */
  findMonsterInRoom(roomId: string, query: string): Monster | undefined {
    const monsters = this.getRoomMonsters(roomId);
    const q = query.toLowerCase();
    return monsters.find(m =>
      m.name.toLowerCase().includes(q) || m.id.toLowerCase() === q
    );
  }

  updateMonster(id: string, updates: Partial<Monster>): Monster | undefined {
    const monster = this.monsters.get(id);
    if (!monster) return undefined;
    Object.assign(monster, updates);
    return monster;
  }

  // ── Player Operations ────────────────────────────────────────────

  addPlayer(player: Player): Player {
    this.players.set(player.id, player);
    // Add player to their room
    const room = this.rooms.get(player.currentRoomId);
    if (room && !room.playerIds.includes(player.id)) {
      room.playerIds.push(player.id);
    }
    return player;
  }

  removePlayer(id: string): void {
    const player = this.players.get(id);
    if (player) {
      // Remove from current room
      const room = this.rooms.get(player.currentRoomId);
      if (room) {
        room.playerIds = room.playerIds.filter(pid => pid !== id);
      }
      this.players.delete(id);
    }
  }

  getPlayer(id: string): Player | undefined {
    return this.players.get(id);
  }

  getPlayerCount(): number {
    return this.players.size;
  }

  getRoomPlayers(roomId: string): Player[] {
    const room = this.rooms.get(roomId);
    if (!room) return [];
    return room.playerIds
      .map(id => this.players.get(id))
      .filter((p): p is Player => p !== undefined);
  }

  /**
   * Move a player to a new room.
   * Returns the new Room if successful, or undefined if the exit doesn't exist / is locked.
   */
  movePlayer(playerId: string, direction: string): { success: boolean; room?: Room; message?: string } {
    const player = this.players.get(playerId);
    if (!player) return { success: false, message: 'Player not found.' };

    const currentRoom = this.rooms.get(player.currentRoomId);
    if (!currentRoom) return { success: false, message: 'Current room not found.' };

    const exit = currentRoom.exits.find(e => e.direction === direction);
    if (!exit) {
      return { success: false, message: `There is no exit to the ${direction}.` };
    }

    if (exit.locked) {
      return { success: false, message: `The passage to the ${direction} is sealed. Perhaps a Pull Request could open it...` };
    }

    const targetRoom = this.rooms.get(exit.targetRoomId);
    if (!targetRoom) {
      return { success: false, message: 'The passage leads into the void...' };
    }

    // Remove from current room
    currentRoom.playerIds = currentRoom.playerIds.filter(id => id !== playerId);

    // Add to target room
    player.currentRoomId = targetRoom.id;
    if (!targetRoom.playerIds.includes(playerId)) {
      targetRoom.playerIds.push(playerId);
    }

    // Mark as visited
    if (!player.visitedRooms.includes(targetRoom.id)) {
      player.visitedRooms.push(targetRoom.id);
    }
    targetRoom.discovered = true;

    return { success: true, room: targetRoom };
  }

  /**
   * Teleport a player directly to a room by ID (used for respawn).
   */
  teleportPlayer(playerId: string, targetRoomId: string): { success: boolean; room?: Room; message?: string } {
    const player = this.players.get(playerId);
    if (!player) return { success: false, message: 'Player not found.' };

    const targetRoom = this.rooms.get(targetRoomId);
    if (!targetRoom) return { success: false, message: 'Target room not found.' };

    const currentRoom = this.rooms.get(player.currentRoomId);
    if (currentRoom) {
      currentRoom.playerIds = currentRoom.playerIds.filter(id => id !== playerId);
    }

    player.currentRoomId = targetRoom.id;
    if (!targetRoom.playerIds.includes(playerId)) {
      targetRoom.playerIds.push(playerId);
    }

    if (!player.visitedRooms.includes(targetRoom.id)) {
      player.visitedRooms.push(targetRoom.id);
    }
    targetRoom.discovered = true;

    return { success: true, room: targetRoom };
  }
}

