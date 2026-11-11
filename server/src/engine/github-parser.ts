/**
 * GitHub Repository → Dungeon Generator
 *
 * Converts a live GitHub repository (tree, issues, CI check runs) into a navigable MUD dungeon.
 * Uses native fetch without external dependencies.
 *
 * Automatically falls back to the deterministic mock dungeon when:
 *   - Offline / network error
 *   - Missing repo / 404
 *   - Rate limited (HTTP 403 / 429)
 */

import type { Room, Monster, Direction } from '@necro-mud/shared';

/** Configuration for live GitHub integration */
export interface GitHubRepoConfig {
  owner: string;
  repo: string;
  token?: string;   // GITHUB_TOKEN from env or config
  branch?: string;  // defaults to main/master or repo default_branch
}

/** Built-in deterministic mock dungeon fallback */
export function generateMockDungeon(): { rooms: Room[]; monsters: Monster[] } {
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
      snippet: 'TypeError: Cannot read properties of undefined (reading "render")\n    at Component.mount (index.js:42:15)',
      labels: ['bug', 'needs-repro'],
      sourceRef: 'https://github.com/fwesh001/necro-mud/issues/42',
      roomId: 'src-hall',
      alive: true,
      xpReward: 15,
      loot: ['scroll-hotfix'],
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
      snippet: 'ESLint Error: "@typescript-eslint/no-explicit-any" is forbidden in strict mode',
      labels: ['ci-check', 'lint'],
      sourceRef: 'https://github.com/fwesh001/necro-mud/actions/runs/lint-failure',
      roomId: 'components-crypt',
      alive: true,
      xpReward: 10,
      loot: ['scroll-rollback'],
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
      description: 'A towering monstrosity woven from tangled callback chains and deeply nested if-else pyramids.',
      snippet: 'Cyclomatic Complexity: 48 (Threshold: 10). Nested depth: 7 levels.',
      labels: ['refactor', 'tech-debt'],
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
      description: 'A flickering ghost that phases in and out of existence. "Cannot read properties of undefined" echoes through the void.',
      snippet: 'Uncaught TypeError: Cannot read property "id" of null at renderPlayer (player.ts:88)',
      labels: ['p1', 'crash'],
      sourceRef: 'https://github.com/fwesh001/necro-mud/issues/17',
      roomId: 'api-dungeon',
      alive: true,
      xpReward: 12,
      loot: ['scroll-hotfix'],
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
      description: 'A multi-headed serpent — each head represents an outdated npm dependency. Cut one, and two more appear from package-lock.',
      snippet: 'npm audit found 14 vulnerabilities (3 moderate, 8 high, 3 critical)',
      labels: ['security', 'dependencies'],
      sourceRef: 'package-lock.json',
      roomId: 'config-vault',
      alive: true,
      xpReward: 25,
      loot: ['key-lockfile', 'scroll-refactor'],
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
      description: 'The ancient overlord of all unresolved issues. Its carapace is inscribed with every "wontfix" label ever applied.',
      snippet: 'Issue #1 [CONFIRMED BLOCKER]: Memory leak in WebSocket heartbeat causes server OOM crash after 48 hours.',
      labels: ['blocker', 'wontfix', 'boss'],
      sourceRef: 'https://github.com/fwesh001/necro-mud/issues/1',
      roomId: 'boss-chamber',
      alive: true,
      xpReward: 100,
      loot: ['trophy-bug-lord', 'scroll-refactor'],
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
      description: 'Rows of sarcophagi contain deprecated UI components. JSX fragments float through the air like spectral butterflies. A CI status badge flickers red above the entrance.',
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

/** Helper to make authenticated/unauthenticated GitHub API calls */
async function fetchGithubJson(url: string, token?: string): Promise<any> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'necro-mud/0.1.0',
  };
  const authToken = token || process.env.GITHUB_TOKEN;
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`GitHub API HTTP ${res.status}: ${res.statusText} (${url})`);
  }
  return res.json();
}

/**
 * Generate dungeon rooms and monsters from a live repository.
 * Falls back to mock data if offline or rate-limited.
 */
export async function generateDungeonFromRepo(
  config?: GitHubRepoConfig,
): Promise<{ rooms: Room[]; monsters: Monster[] }> {
  if (!config || !config.owner || !config.repo) {
    return generateMockDungeon();
  }

  const { owner, repo, token } = config;

  try {
    // 1. Fetch Repository Details
    const repoInfo = await fetchGithubJson(
      `https://api.github.com/repos/${owner}/${repo}`,
      token,
    );
    const defaultBranch = config.branch || repoInfo.default_branch || 'main';

    // 2. Fetch Git Tree (recursive)
    let treeItems: Array<{ path: string; type: string; size?: number }> = [];
    try {
      const treeData = await fetchGithubJson(
        `https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`,
        token,
      );
      if (Array.isArray(treeData.tree)) {
        treeItems = treeData.tree;
      }
    } catch {
      treeItems = [];
    }

    // 3. Fetch Open Issues (exclude PRs)
    let rawIssues: any[] = [];
    try {
      const issuesData = await fetchGithubJson(
        `https://api.github.com/repos/${owner}/${repo}/issues?state=open&per_page=15`,
        token,
      );
      if (Array.isArray(issuesData)) {
        rawIssues = issuesData.filter((i: any) => !i.pull_request);
      }
    } catch {
      rawIssues = [];
    }

    // 4. Fetch Recent Workflow Runs
    let workflowRuns: any[] = [];
    try {
      const runsData = await fetchGithubJson(
        `https://api.github.com/repos/${owner}/${repo}/actions/runs?per_page=5`,
        token,
      );
      if (Array.isArray(runsData.workflow_runs)) {
        workflowRuns = runsData.workflow_runs;
      }
    } catch {
      workflowRuns = [];
    }

    // ── Build Rooms ──────────────────────────────────────────────────
    const directoryPaths = new Set<string>();
    for (const item of treeItems) {
      if (item.type === 'tree') {
        const parts = item.path.split('/');
        if (parts.length <= 2) {
          directoryPaths.add(item.path);
        }
      }
    }

    const topDirs = Array.from(directoryPaths).slice(0, 6);
    if (topDirs.length === 0) {
      topDirs.push('src', 'lib', 'config');
    }

    const rooms: Room[] = [];

    // Entrance
    const entranceRoom: Room = {
      id: 'entrance',
      name: `${owner}/${repo} - The Repository Gates`,
      description: `You stand before the grand iron archway of ${owner}/${repo}. The default branch [${defaultBranch}] hums with energy. Stars: ${repoInfo.stargazers_count ?? 0} | Open Issues: ${repoInfo.open_issues_count ?? 0}.`,
      filePath: '/',
      exits: [],
      monsterIds: [],
      playerIds: [],
      complexity: 5,
      discovered: true,
    };
    rooms.push(entranceRoom);

    // Intermediate rooms generated from directories
    const middleRooms: Room[] = topDirs.map((dir, idx) => {
      const slug = dir.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();
      const prettyName = dir
        .split('/')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');

      return {
        id: `room-${slug}`,
        name: `The ${prettyName} Chamber`,
        description: `Torches of glowing ASCII line the walls of ${dir}/. Code artifacts drift like dust motes in the cold subterranean draft.`,
        filePath: `${dir}/`,
        exits: [],
        monsterIds: [],
        playerIds: [],
        complexity: Math.min(90, 20 + idx * 12),
        discovered: false,
      };
    });
    rooms.push(...middleRooms);

    // Boss Chamber
    const bossRoom: Room = {
      id: 'boss-chamber',
      name: 'The Technical Debt Sanctum',
      description: `The deep core of ${owner}/${repo}. Jagged stacks of deprecated dependencies and unresolved blocker reports form an imposing obsidian throne.`,
      filePath: null,
      exits: [],
      monsterIds: [],
      playerIds: [],
      complexity: 100,
      discovered: false,
    };
    rooms.push(bossRoom);

    // Link rooms in a linear / connected chain with bidirectional exits
    for (let i = 0; i < rooms.length - 1; i++) {
      const current = rooms[i]!;
      const next = rooms[i + 1]!;
      const forwardDir: Direction = 'north';
      const backwardDir: Direction = 'south';

      current.exits.push({ direction: forwardDir, targetRoomId: next.id, locked: false });
      next.exits.push({ direction: backwardDir, targetRoomId: current.id, locked: false });
    }

    // ── Build Monsters ───────────────────────────────────────────────
    const monsters: Monster[] = [];
    const nonEntranceRooms = rooms.filter(r => r.id !== 'entrance');

    // 1. Issues -> Monsters
    rawIssues.forEach((issue, idx) => {
      const isBoss = idx === 0 && rawIssues.length >= 3;
      const targetRoom = isBoss ? bossRoom : nonEntranceRooms[idx % (nonEntranceRooms.length - 1)]!;

      const labelNames = (issue.labels || []).map((l: any) =>
        typeof l === 'string' ? l : l.name,
      );
      const isBug =
        labelNames.some((l: string) => /bug|fix|error|defect/i.test(l)) ||
        /bug|fix|error|crash/i.test(issue.title);

      const isElite =
        (issue.comments || 0) > 2 ||
        labelNames.some((l: string) => /critical|p0|blocker|high/i.test(l));

      const tier = isBoss ? 'boss' : isElite ? 'elite' : 'minion';
      const hp = isBoss ? 120 : isElite ? 55 : 30;

      const monster: Monster = {
        id: `monster-issue-${issue.number}`,
        name: isBoss
          ? `Arch-Issue #${issue.number}: ${issue.title.slice(0, 24)}`
          : `Bug #${issue.number}: ${issue.title.slice(0, 26)}`,
        origin: isBug ? 'bug' : 'issue',
        tier,
        hp,
        maxHp: hp,
        attack: isBoss ? 18 : isElite ? 12 : 7,
        defense: isBoss ? 10 : isElite ? 6 : 3,
        description: issue.body
          ? issue.body.replace(/\r?\n/g, ' ').slice(0, 140) + '...'
          : `An open GitHub issue (#${issue.number}) haunting this room.`,
        snippet: issue.body ? issue.body.slice(0, 300) : undefined,
        labels: labelNames,
        sourceRef: issue.html_url,
        roomId: targetRoom.id,
        alive: true,
        xpReward: isBoss ? 100 : isElite ? 35 : 15,
        loot: isBoss
          ? ['trophy-repo-conqueror', 'scroll-refactor']
          : isElite
          ? ['scroll-refactor']
          : ['scroll-hotfix'],
      };

      monsters.push(monster);
      targetRoom.monsterIds.push(monster.id);
    });

    // 2. CI Check Failures -> Monsters
    for (const run of workflowRuns) {
      if (run.conclusion === 'failure') {
        const targetRoom = nonEntranceRooms[monsters.length % (nonEntranceRooms.length - 1)]!;
        const monster: Monster = {
          id: `monster-ci-${run.id}`,
          name: `CI Wraith: ${String(run.name || 'Workflow').slice(0, 20)}`,
          origin: 'ci-failure',
          tier: 'elite',
          hp: 40,
          maxHp: 40,
          attack: 11,
          defense: 4,
          description: `A wailing wraith born from a failing CI check on branch ${run.head_branch || 'main'}.`,
          snippet: `Workflow run #${run.run_number} failed (conclusion: failure). Commit: ${run.head_sha?.slice(0, 7) || 'unknown'}`,
          labels: ['ci-failure', 'build-broken'],
          sourceRef: run.html_url,
          roomId: targetRoom.id,
          alive: true,
          xpReward: 25,
          loot: ['scroll-rollback'],
        };
        monsters.push(monster);
        targetRoom.monsterIds.push(monster.id);
      }
    }

    // 3. Fallback Boss if no issues were loaded
    if (bossRoom.monsterIds.length === 0) {
      const defaultBoss: Monster = {
        id: 'monster-legacy-golem',
        name: 'The Technical Debt Colossus',
        origin: 'complexity',
        tier: 'boss',
        hp: 110,
        maxHp: 110,
        attack: 18,
        defense: 10,
        description: `A colossal behemoth built from deprecated legacy code within ${owner}/${repo}.`,
        snippet: `Repository size: ${repoInfo.size} KB. Forks: ${repoInfo.forks_count}. Technical debt index: CRITICAL.`,
        labels: ['legacy', 'tech-debt', 'boss'],
        sourceRef: `https://github.com/${owner}/${repo}`,
        roomId: bossRoom.id,
        alive: true,
        xpReward: 90,
        loot: ['trophy-clean-repo', 'scroll-refactor'],
      };
      monsters.push(defaultBoss);
      bossRoom.monsterIds.push(defaultBoss.id);
    }

    return { rooms, monsters };
  } catch (err: any) {
    console.warn(`[GitHub Parser] Live API fetch failed for ${owner}/${repo} (${err?.message || err}). Falling back to mock dungeon.`);
    return generateMockDungeon();
  }
}
