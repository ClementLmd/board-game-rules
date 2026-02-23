export type Phase = 'setup' | 'roles' | 'game';

export type Team = 'village' | 'loup-garou' | 'neutre';

export interface Role {
  id: string;
  name: string;
  team: Team;
  description: string;
}

export interface Player {
  id: string;
  name: string;
  role: Role | null;
  alive: boolean;
}

/** Role configuration: roleId -> count. e.g. { "loup-garou": 2, "villageois": 4 } */
export type RoleConfig = Record<string, number>;

export type GamePhaseType = 'night' | 'day';

export interface DeathLogEntry {
  phase: GamePhaseType;
  number: number;
  playerId: string;
}

export interface GameState {
  phase: Phase;
  players: Player[];
  /** Which roles are in the game and how many of each. Set at start; roles revealed progressively during night. */
  roleConfig: RoleConfig;
  night: number;
  /** Current sub-phase: night (roles act) or day (village votes). */
  gamePhase: GamePhaseType;
  /** Cupidon: pair of player ids (amoureux). If one dies, the other dies too. */
  lovers: [string, string] | null;
  /** Log of deaths for recap: "night 1: X died; day 1: Y died" */
  deathLog: DeathLogEntry[];
  /** Selected targets per step: key = `${night}-${stepKey}`, value = player IDs or ["__none__"] for loup-blanc */
  stepTargets: Record<string, string[]>;
}

export const ROLES: Role[] = [
  // Camp des villageois
  {
    id: 'villageois',
    name: 'Simple villageois',
    team: 'village',
    description: 'Aucun pouvoir spécial, participe aux votes de jour',
  },
  {
    id: 'voyante',
    name: 'Voyante',
    team: 'village',
    description: 'Chaque nuit, peut regarder secrètement la carte d\'un joueur',
  },
  {
    id: 'sorciere',
    name: 'Sorcière',
    team: 'village',
    description: 'Possède 2 potions (1 de guérison, 1 de mort), utilisables une seule fois chacune',
  },
  {
    id: 'chasseur',
    name: 'Chasseur',
    team: 'village',
    description: 'Quand il est éliminé, il emporte un joueur de son choix avec lui',
  },
  {
    id: 'petite-fille',
    name: 'Petite fille',
    team: 'village',
    description: 'Peut essayer d\'espionner les loups-garous pendant la nuit (risqué !)',
  },
  {
    id: 'salvateur',
    name: 'Salvateur',
    team: 'village',
    description: 'Chaque nuit, protège un joueur contre l\'attaque des loups-garous. Ne peut pas protéger le même joueur deux nuits de suite',
  },
  {
    id: 'cupidon',
    name: 'Cupidon',
    team: 'neutre',
    description: 'La première nuit, désigne 2 joueurs qui deviennent amoureux (si l\'un meurt, l\'autre aussi)',
  },
  // Camp des loups-garous
  {
    id: 'loup-garou',
    name: 'Loup-garou',
    team: 'loup-garou',
    description: 'Chaque nuit, les loups-garous se concertent et dévorent un villageois',
  },
  {
    id: 'loup-blanc',
    name: 'Loup blanc',
    team: 'loup-garou',
    description: 'Loup-garou solitaire qui, une nuit sur deux, peut éliminer un autre loup-garou. Il gagne seul s\'il est le dernier survivant',
  },
];

export const MIN_PLAYERS = 6;
export const MAX_PLAYERS = 18;
export const MAX_PLAYER_NAME_LENGTH = 15;

export const STORAGE_KEY = 'loup-garou-game-state';

/** Order of night calls (rules: Cupidon → Amoureux → Voyante → Loups → Sorcière → Salvateur → Loup blanc) */
export const NIGHT_CALL_ORDER: {
  roleId: string;
  label: string;
  action: string;
  night1Only?: boolean;
  oddNightsOnly?: boolean;
}[] = [
  {
    roleId: 'cupidon',
    label: 'Cupidon',
    action: 'Cupidon ouvre les yeux et désigne les deux amoureux (deux joueurs). Le meneur les touche pour qu’ils sachent.',
    night1Only: true,
  },
  {
    roleId: 'amoureux',
    label: 'Les amoureux se réveillent',
    action: 'Les deux amoureux ouvrent les yeux et se reconnaissent.',
    night1Only: true,
  },
  {
    roleId: 'voyante',
    label: 'La voyante',
    action: 'La voyante ouvre les yeux et désigne un joueur dont elle veut connaître le rôle. Le meneur lui montre la carte de ce joueur.',
  },
  {
    roleId: 'loup-garou',
    label: 'Les loups-garous',
    action: 'Les loups-garous ouvrent les yeux, se reconnaissent, et se mettent d’accord (par signes) sur une victime à dévorer.',
  },
  {
    roleId: 'sorciere',
    label: 'La sorcière',
    action: 'La sorcière se réveille. Le meneur lui montre la victime des loups. Elle peut utiliser sa potion de guérison (sauver la victime) et/ou sa potion de mort (tuer un autre joueur). Chaque potion une seule fois dans la partie.',
  },
  {
    roleId: 'salvateur',
    label: 'Le salvateur',
    action: 'Le salvateur ouvre les yeux et désigne un joueur à protéger cette nuit. Si ce joueur est la cible des loups, il est sauvé. Il ne peut pas protéger le même joueur deux nuits de suite.',
  },
  {
    roleId: 'loup-blanc',
    label: 'Le loup blanc',
    action: 'Le loup blanc se réveille seul (les autres loups dorment). Il peut éliminer un loup-garou, ou ne rien faire. Pouvoir actif uniquement les nuits impaires (1, 3, 5…).',
    oddNightsOnly: true,
  },
];

export interface NightCallStep {
  key: string;
  label: string;
  playerNames: string[];
  action: string;
  /** How many players should have this role (from roleConfig). Only for non-amoureux steps. */
  expectedCount?: number;
  /** How many alive players are assigned to this role (for display). */
  assignedCount?: number;
  /** Total assigned (alive + dead). When equals expectedCount, role cannot be reassigned. */
  totalAssignedCount?: number;
}

/** Returns night call steps for the game master, in order, filtered by roleConfig and night number.
 * Steps are shown for roles in roleConfig; playerNames come from assigned players (may be empty if not yet assigned). */
export function getNightCallOrder(
  players: Player[],
  night: number,
  lovers: [string, string] | null,
  roleConfig: RoleConfig
): NightCallStep[] {
  const aliveByRoleId = new Map<string, Player[]>();
  const allByRoleId = new Map<string, Player[]>();
  const playerById = new Map(players.map((p) => [p.id, p]));
  for (const p of players) {
    if (!p.role) continue;
    const id = p.role.id;
    if (!allByRoleId.has(id)) allByRoleId.set(id, []);
    allByRoleId.get(id)!.push(p);
    if (p.alive) {
      if (!aliveByRoleId.has(id)) aliveByRoleId.set(id, []);
      aliveByRoleId.get(id)!.push(p);
    }
  }
  const steps: NightCallStep[] = [];
  const isNight1 = night === 1;
  const isOddNight = night % 2 === 1;

  for (const call of NIGHT_CALL_ORDER) {
    if (call.night1Only && !isNight1) continue;
    if (call.oddNightsOnly && !isOddNight) continue;
    if (call.roleId === 'amoureux') {
      const hasCupidon = (roleConfig['cupidon'] ?? 0) > 0;
      if (!hasCupidon) continue;
      const names = lovers
        ? lovers.map((id) => playerById.get(id)?.name).filter(Boolean) as string[]
        : [];
      steps.push({ key: 'amoureux', label: call.label, playerNames: names, action: call.action });
      continue;
    }
    const count = roleConfig[call.roleId] ?? 0;
    const rolePlayers = aliveByRoleId.get(call.roleId) ?? [];
    const totalAssigned = (allByRoleId.get(call.roleId) ?? []).length;
    const hasAlivePlayer = rolePlayers.length > 0;
    const canAssign = totalAssigned < count;
    if (count > 0 && (hasAlivePlayer || (canAssign && totalAssigned === 0))) {
      steps.push({
        key: call.roleId,
        label: call.label,
        playerNames: rolePlayers.map((p) => p.name),
        action: call.action,
        expectedCount: count,
        assignedCount: rolePlayers.length,
        totalAssignedCount: totalAssigned,
      });
    }
  }
  return steps;
}
