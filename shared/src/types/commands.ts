/**
 * CommandPacket — Messages sent from client → server.
 * Each packet represents a single player command.
 */

/** All recognised MUD commands */
export type CommandType =
  | 'HELP'     // Show available commands
  | 'LOOK'     // Inspect current room
  | 'MAP'      // Show discovered dungeon map
  | 'STATUS'   // Show player stats
  | 'ATTACK'   // Attack a monster (args[0] = target name/id)
  | 'MOVE'     // Move to an adjacent room (args[0] = direction)
  | 'SCAN'     // Analyse a monster's origin (args[0] = target)
  | 'PATCH'    // Attempt to "fix" a monster (args[0] = target)
  | 'CAST'     // Cast a spell / use a commit scroll (args[0] = spell)
  | 'REPO'     // Load a GitHub repository into the dungeon (args[0] = owner/repo)
  | 'TOP'      // Display the XP leaderboard and developer rankings
  | 'SAY';     // Send a chat message to the room (args = message words)

export interface CommandPacket {
  /** Packet discriminator — always "command" for client→server */
  type: 'command';
  /** The command verb */
  command: CommandType;
  /** Positional arguments following the verb (e.g. ["north"] for MOVE) */
  args: string[];
  /** ID of the player issuing the command */
  playerId: string;
  /** Unix timestamp (ms) when the command was sent */
  timestamp: number;
}

