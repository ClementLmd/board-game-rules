import type { Player, RoleConfigV2 } from './game-data';

export type WolfSideIds = {
  wolves: Set<number>;
  whiteWolves: Set<number>;
  allWolves: Set<number>;
};

export function getWolfIds(roleAssignments: Record<string, number[]>): WolfSideIds {
  const wolves = new Set(roleAssignments['loup-garou'] ?? []);
  const whiteWolves = new Set(roleAssignments['loup-blanc'] ?? []);
  const allWolves = new Set<number>([...wolves, ...whiteWolves]);
  return { wolves, whiteWolves, allWolves };
}

export type NightOutcomeCause = 'loup-garou' | 'sorciere' | 'amour' | 'loup-blanc';

export interface NightOutcomeEntry {
  playerId: number;
  cause: NightOutcomeCause;
}

export interface NightOutcome {
  deaths: NightOutcomeEntry[];
  ancienLivesRemaining: number;
  ancienSurvivedAttack: boolean;
  villagePowersLost: boolean;
  // resolved lovers / enfant model for subsequent phases
  lovers: [number, number] | null;
  enfantModel: [number, number] | null;
}

export function resolveNightOutcome(options: {
  players: Player[];
  night: number;
  stepSelections: Record<string, string[]>;
  roleAssignments: Record<string, number[]>;
  lovers: [number, number] | null;
  enfantModel: [number, number] | null;
  ancienLivesRemaining: number;
}): NightOutcome {
  const {
    players,
    stepSelections,
    roleAssignments,
    lovers,
    enfantModel,
    ancienLivesRemaining,
  } = options;

  const playerById = new Map(players.map((p) => [p.id, p]));

  // Resolve lovers for this night (cupidon)
  const cupidonSel = stepSelections['cupidon'] ?? [];
  const currentLovers: [number, number] | null =
    lovers ??
    (cupidonSel.length === 2
      ? [Number(cupidonSel[0]), Number(cupidonSel[1])]
      : null);

  // Resolve Enfant Sauvage model for this night
  const enfantIds = roleAssignments['enfant-sauvage'] ?? [];
  const enfantSel = stepSelections['enfant-sauvage'] ?? [];
  const currentEnfantModel: [number, number] | null =
    enfantModel ??
    (enfantIds.length === 1 && enfantSel.length === 1
      ? [enfantIds[0], Number(enfantSel[0])]
      : null);

  // Base night deaths from wolves / witch / loup-blanc-solo
  const wolfSel = stepSelections['loup-garou'] ?? [];
  const wolfVictimId = wolfSel[0] ? Number(wolfSel[0]) : null;

  const witchSel = stepSelections['sorciere'] ?? [];
  const healed = witchSel.includes('__heal__');
  const witchKillId = witchSel.find((id) => id !== '__heal__');

  const loupBlancSoloSel = stepSelections['loup-blanc-solo'] ?? [];
  const loupBlancSoloVictimId = loupBlancSoloSel[0]
    ? Number(loupBlancSoloSel[0])
    : null;

  const deaths = new Map<number, NightOutcomeCause>();

  if (wolfVictimId != null && !healed) {
    deaths.set(wolfVictimId, 'loup-garou');
  }
  if (witchKillId) {
    const idNum = Number(witchKillId);
    deaths.set(idNum, 'sorciere');
  }
  if (loupBlancSoloVictimId != null) {
    deaths.set(loupBlancSoloVictimId, 'loup-blanc');
  }

  // Lover chain deaths
  if (currentLovers) {
    const [a, b] = currentLovers;
    for (const id of Array.from(deaths.keys())) {
      if (id === a || id === b) {
        if (!deaths.has(a)) deaths.set(a, 'amour');
        if (!deaths.has(b)) deaths.set(b, 'amour');
        break;
      }
    }
  }

  // Ancien: two lives vs werewolves — first wolf attack he survives
  const ancienIds = new Set(roleAssignments['ancien'] ?? []);
  let nextAncienLives = ancienLivesRemaining;
  const ancienSurvivedAttack =
    wolfVictimId != null &&
    ancienIds.has(wolfVictimId) &&
    !healed &&
    ancienLivesRemaining === 2;
  if (ancienSurvivedAttack) {
    deaths.delete(wolfVictimId!);
    nextAncienLives = 1;
  }

  // Determine if village powers are lost this night:
  // Ancien killed by sorcière or love during the night.
  let villagePowersLost = false;
  for (const [id, cause] of deaths) {
    if (ancienIds.has(id) && (cause === 'sorciere' || cause === 'amour')) {
      villagePowersLost = true;
      break;
    }
  }

  // Filter to actually dead players (ignore any deaths on already-dead players)
  const aliveIds = new Set(players.filter((p) => p.isAlive).map((p) => p.id));
  const entries: NightOutcomeEntry[] = [];
  for (const [id, cause] of deaths) {
    if (!aliveIds.has(id)) continue;
    if (!playerById.get(id)) continue;
    entries.push({ playerId: id, cause });
  }

  return {
    deaths: entries,
    ancienLivesRemaining: nextAncienLives,
    ancienSurvivedAttack,
    villagePowersLost,
    lovers: currentLovers,
    enfantModel: currentEnfantModel,
  };
}

export type DayOutcomeCause = 'village' | 'amour';

export interface DayOutcomeEntry {
  playerId: number;
  cause: DayOutcomeCause;
}

export interface DayOutcome {
  deaths: DayOutcomeEntry[];
  villagePowersLost: boolean;
}

export function resolveDayOutcome(options: {
  players: Player[];
  roleAssignments: Record<string, number[]>;
  lovers: [number, number] | null;
  enfantModel: [number, number] | null;
  votedPlayerId: number | null;
}): DayOutcome {
  const { players, roleAssignments, lovers, votedPlayerId } = options;

  const deaths = new Map<number, DayOutcomeCause>();

  if (votedPlayerId != null) {
    deaths.set(votedPlayerId, 'village');
    if (lovers && (lovers[0] === votedPlayerId || lovers[1] === votedPlayerId)) {
      const [a, b] = lovers;
      if (!deaths.has(a)) deaths.set(a, 'amour');
      if (!deaths.has(b)) deaths.set(b, 'amour');
    }
  }

  const ancienIds = new Set(roleAssignments['ancien'] ?? []);
  let villagePowersLost = false;
  for (const [id, cause] of deaths) {
    if (ancienIds.has(id) && (cause === 'village' || cause === 'amour')) {
      villagePowersLost = true;
      break;
    }
  }

  const aliveIds = new Set(players.filter((p) => p.isAlive).map((p) => p.id));
  const entries: DayOutcomeEntry[] = [];
  for (const [id, cause] of deaths) {
    if (!aliveIds.has(id)) continue;
    entries.push({ playerId: id, cause });
  }

  return { deaths: entries, villagePowersLost };
}

export type Winner = 'wolves' | 'village' | 'loup-blanc' | 'ange';

export function checkWin(
  players: Player[],
  roleAssignments: Record<string, number[]>
): Winner | null {
  const { whiteWolves, allWolves } = getWolfIds(roleAssignments);
  const alive = players.filter((p) => p.isAlive);
  const aliveWolves = alive.filter((p) => allWolves.has(p.id));
  const aliveVillagers = alive.filter((p) => !allWolves.has(p.id));

  // Loup-Blanc solo win: only the white wolf is alive
  if (alive.length === 1 && whiteWolves.has(alive[0].id)) return 'loup-blanc';
  if (aliveWolves.length === 0) return 'village';
  // Wolves win when they equal or outnumber villagers — the village can no longer prevail
  if (aliveWolves.length >= aliveVillagers.length) return 'wolves';
  return null;
}

