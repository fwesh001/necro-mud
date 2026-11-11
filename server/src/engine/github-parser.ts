/**
 * Mock GitHub Repository → Dungeon Generator
 *
 * Converts a GitHub repository tree into a navigable MUD dungeon.
 * This scaffold uses hardcoded mock data. In Wave 3, this will be
 * replaced with live GitHub REST/Octokit API calls using GITHUB_TOKEN.
 *
 * Schema is designed to accommodate live data:
 *   - Room.filePath maps to the GitHub tree path
 *   - Monster.sourceRef maps to issue/check URLs
 *   - Monster.origin tracks the GitHub artifact type
 */

import type { Room, Monster } from '@necro-mud/shared';

/** Configuration for live GitHub integration (Wave 3) */
export interface GitHubRepoConfig {
  owner: string;
  repo: string;
  token?: string;   // GITHUB_TOKEN from env
  branch?: string;  // defaults to main/master
}

/**
 * Generate dungeon rooms and monsters from a repository.
 * Currently returns mock data; will accept GitHubRepoConfig in Wave 3.
 */
export function generateDungeonFromRepo(
  _config?: GitHubRepoConfig,
): { rooms: Room[]; monsters: Monster[] } {
  const monsters: Monster[] = [
    {
      id: 'monster-bug-42',
      name: 'Phantom Bug #42',
      origin: 'issue',
      tier: 'minion',
      hp: 30,
      maxHp: 30,
      attack: 8,
      defense: 3,
      description: 'A spectral bug report hovers in the air, its stack trace trailing behind it like ghostly chains.',
      sourceRef: 'https://github.com/fwesh001/necro-mud/issues/42',
      roomId: 'src-hall',
      alive: true,
      xpReward: 15,
      loot: [],
    },
    {
      id: 'monster-lint-wraith',
      name: 'Lint Wraith',
      origin: 'ci-failure',
      tier: 'minion',
      hp: 20,
      maxHp: 20,
      attack: 6,
      defense: 2,
      description: 'A shrieking wraith formed from failed ESLint checks. Red squiggles pulse beneath its translucent skin.',
      sourceRef: 'https://github.com/fwesh001/necro-mud/actions/runs/lint-failure',
      roomId: 'components-crypt',
      alive: true,
      xpReward: 10,
      loot: [],
    },
    {
      id: 'monster-spaghetti-golem',
      name: 'The Spaghetti Golem',
      origin: 'complexity',
      tier: 'elite',
      hp: 60,
      maxHp: 60,
      attack: 14,
      defense: 8,
      description: 'A towering monstrosity woven from tangled callback chains and deeply nested if-else pyramids. Its cyclomatic complexity is off the charts.',
      sourceRef: 'src/legacy/mega-component.tsx',
      roomId: 'utils-tomb',
      alive: true,
      xpReward: 30,
      loot: ['scroll-refactor'],
    },
    {
      id: 'monster-null-ref-specter',
      name: 'Null Reference Specter',
      origin: 'bug',
      tier: 'minion',
      hp: 25,
      maxHp: 25,
      attack: 10,
      defense: 2,
      description: 'A flickering ghost that phases in and out of existence. "Cannot read properties of undefined" echoes from its hollow form.',
      sourceRef: 'https://github.com/fwesh001/necro-mud/issues/17',
      roomId: 'api-dungeon',
      alive: true,
      xpReward: 12,
      loot: [],
    },
    {
      id: 'monster-dependency-hydra',
      name: 'Dependency Hydra',
      origin: 'complexity',
      tier: 'elite',
      hp: 50,
      maxHp: 50,
      attack: 12,
      defense: 6,
      description: 'A multi-headed serpent — each head represents an outdated npm dependency. Cut one, and two more appear from the package-lock.',
      sourceRef: 'package-lock.json',
      roomId: 'config-vault',
      alive: true,
      xpReward: 25,
      loot: ['key-lockfile'],
    },
    {
      id: 'monster-bug-lord',
      name: 'Xyloceph, The Bug Lord',
      origin: 'issue',
      tier: 'boss',
      hp: 120,
      maxHp: 120,
      attack: 20,
      defense: 12,
      description: 'The ancient overlord of all unresolved issues. Its carapace is inscribed with every "wontfix" and "deferred" label ever applied. It feeds on technical debt.',
      sourceRef: 'https://github.com/fwesh001/necro-mud/issues/1',
      roomId: 'boss-chamber',
      alive: true,
      xpReward: 100,
      loot: ['trophy-bug-lord'],
    },
  ];

  const rooms: Room[] = [
    {
      id: 'entrance',
      name: 'The Repository Gates',
      description: 'You stand before massive iron gates wrought in the shape of curly braces { }. The README.md is etched into a stone tablet beside the entrance. A cold wind carries the sound of failing tests from deep within.',
      filePath: '/',
      exits: [
        { direction: 'north', targetRoomId: 'src-hall', locked: false },
      ],
      monsterIds: [],
      playerIds: [],
      complexity: 5,
      discovered: true,
    },
    {
      id: 'src-hall',
      name: 'The Source Code Hall',
      description: 'A vast corridor lined with glowing file icons. Import statements cascade down the walls like waterfalls. The air hums with the vibration of transpiling code.',
      filePath: 'src/',
      exits: [
        { direction: 'south', targetRoomId: 'entrance', locked: false },
        { direction: 'east', targetRoomId: 'components-crypt', locked: false },
        { direction: 'west', targetRoomId: 'utils-tomb', locked: false },
        { direction: 'north', targetRoomId: 'api-dungeon', locked: false },
      ],
      monsterIds: ['monster-bug-42'],
      playerIds: [],
      complexity: 25,
      discovered: false,
    },
    {
      id: 'components-crypt',
      name: 'The Components Crypt',
      description: 'Rows of sarcophagi contain deprecated React components. JSX fragments float through the air like spectral butterflies. A CI status badge flickers red above the entrance.',
      filePath: 'src/components/',
      exits: [
        { direction: 'west', targetRoomId: 'src-hall', locked: false },
      ],
      monsterIds: ['monster-lint-wraith'],
      playerIds: [],
      complexity: 40,
      discovered: false,
    },
    {
      id: 'utils-tomb',
      name: 'The Utilities Tomb',
      description: 'A labyrinthine tomb of helper functions. Recursive calls echo endlessly through the chambers. The walls are covered in regular expressions that seem to shift and writhe.',
      filePath: 'src/utils/',
      exits: [
        { direction: 'east', targetRoomId: 'src-hall', locked: false },
      ],
      monsterIds: ['monster-spaghetti-golem'],
      playerIds: [],
      complexity: 75,
      discovered: false,
    },
    {
      id: 'api-dungeon',
      name: 'The API Dungeon',
      description: 'Deep beneath the source code, the API routes form a network of dark tunnels. HTTP status codes glow on the walls: 200 in green, 404 in amber, 500 in blood red.',
      filePath: 'src/api/',
      exits: [
        { direction: 'south', targetRoomId: 'src-hall', locked: false },
        { direction: 'east', targetRoomId: 'config-vault', locked: false },
        { direction: 'north', targetRoomId: 'boss-chamber', locked: false, description: 'A foreboding archway pulses with dark energy...' },
      ],
      monsterIds: ['monster-null-ref-specter'],
      playerIds: [],
      complexity: 55,
      discovered: false,
    },
    {
      id: 'config-vault',
      name: 'The Configuration Vault',
      description: 'A circular chamber lined with JSON and YAML scrolls. Environment variables drift through the air as glowing runes. The .env file is sealed behind a ward of secrets.',
      filePath: 'config/',
      exits: [
        { direction: 'west', targetRoomId: 'api-dungeon', locked: false },
      ],
      monsterIds: ['monster-dependency-hydra'],
      playerIds: [],
      complexity: 35,
      discovered: false,
    },
    {
      id: 'boss-chamber',
      name: "The Bug Lord's Chamber",
      description: 'The deepest chamber of the dungeon. The walls are covered in unresolved GitHub issues, their labels glowing like malevolent eyes. At the center, atop a throne of tangled merge conflicts, sits the Bug Lord.',
      filePath: null,
      exits: [
        { direction: 'south', targetRoomId: 'api-dungeon', locked: false },
      ],
      monsterIds: ['monster-bug-lord'],
      playerIds: [],
      complexity: 100,
      discovered: false,
    },
  ];

  return { rooms, monsters };
}

