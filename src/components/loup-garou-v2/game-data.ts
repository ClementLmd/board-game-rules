export interface Character {
  id: string;
  name: string;
  image: string;
  team: 'loups' | 'village' | 'solo';
  wakeUpOrder: number;
  nightAction: string;
  /** max selectable targets; 0 = none; -1 = special (sorcière) */
  maxTargets: number;
  /** only shown on night 1 */
  night1Only?: boolean;
  /** at most 1 of this role in the game */
  unique?: boolean;
  /** only shown from this night (e.g. 2 = Nuit 2+) */
  nightMin?: number;
  /** only on even (2,4,6...) or odd (1,3,5...) nights */
  nightParity?: 'even' | 'odd';
  /** use another role's config count (for sub-steps like loup-blanc-solo) */
  configKey?: string;
}

export const CHARACTERS: Character[] = [
  {
    id: 'cupidon',
    name: 'Cupidon',
    image: '/images/cupidon.jpg',
    team: 'village',
    wakeUpOrder: 1,
    nightAction: 'Cupidon se réveille et désigne 2 joueurs qui seront amoureux pour toute la partie.',
    maxTargets: 2,
    night1Only: true,
    unique: true,
  },
  {
    id: 'voyante',
    name: 'La Voyante',
    image: '/images/voyante.jpg',
    team: 'village',
    wakeUpOrder: 2,
    nightAction: "La Voyante se réveille. Elle désigne un joueur dont elle veut voir la carte. Montrez-lui la carte silencieusement.",
    maxTargets: 1,
    unique: true,
  },
  {
    id: 'enfant-sauvage',
    name: "L'Enfant Sauvage",
    image: '/images/enfant-sauvage.png',
    team: 'village',
    wakeUpOrder: 1.5,
    nightAction: "L'Enfant Sauvage se réveille et désigne un joueur modèle. Si ce modèle meurt, l'Enfant Sauvage rejoint les Loups-Garous.",
    maxTargets: 1,
    night1Only: true,
    unique: true,
  },
  {
    id: 'loup-garou',
    name: 'Les Loups-Garous',
    image: '/images/loup-garou.jpg',
    team: 'loups',
    wakeUpOrder: 3,
    nightAction: 'Les Loups-Garous se réveillent, se reconnaissent et désignent ensemble une victime à éliminer.',
    maxTargets: 1,
  },
  {
    id: 'loup-blanc',
    name: 'Le Loup-Blanc',
    image: '/images/loup-blanc.png',
    team: 'solo',
    wakeUpOrder: 0,
    nightAction: "Se réveille avec les Loups-Garous. Une nuit sur deux (nuits 2, 4, 6...), il peut se réveiller seul pour tuer un Loup-Garou. Il veut être le seul survivant.",
    maxTargets: 0,
    unique: true,
  },
  {
    id: 'loup-blanc-solo',
    name: 'Le Loup-Blanc',
    image: '/images/loup-blanc.png',
    team: 'solo',
    wakeUpOrder: 3.5,
    nightAction: "Se réveille avec les Loups-Garous la nuit. Une nuit sur deux (nuits 2, 4, 6...), il peut se réveiller seul pour désigner un Loup-Garou à éliminer. Il veut être le seul survivant.",
    maxTargets: 1,
    nightMin: 2,
    nightParity: 'even',
    configKey: 'loup-blanc',
  },
  {
    id: 'sorciere',
    name: 'La Sorcière',
    image: '/images/sorciere.jpg',
    team: 'village',
    wakeUpOrder: 4,
    nightAction: "La Sorcière se réveille. Montrez-lui la victime des loups. Elle peut utiliser sa potion de guérison (une fois) et/ou sa potion de mort (une fois).",
    maxTargets: -1,
    unique: true,
  },
  {
    id: 'renard',
    name: 'Le Renard',
    image: '/images/fox.png',
    team: 'village',
    wakeUpOrder: 5,
    nightAction: "Désigne un groupe de 3 joueurs. Le MDJ lui dit si au moins un loup est présent dans ce groupe. S'il n'y a pas de loup, le Renard perd son pouvoir pour le reste de la partie. (Nuit 2+)",
    maxTargets: 3,
    unique: true,
    nightMin: 2,
  },
  {
    id: 'petite-fille',
    name: 'La Petite Fille',
    image: '/images/petite-fille.jpg',
    team: 'village',
    wakeUpOrder: 0,
    nightAction: "La Petite Fille peut entrouvrir les yeux pendant le tour des Loups-Garous.",
    maxTargets: 0,
    unique: true,
  },
  {
    id: 'chasseur',
    name: 'Le Chasseur',
    image: '/images/chasseur.jpg',
    team: 'village',
    wakeUpOrder: 0,
    nightAction: "Le Chasseur n'a pas d'action de nuit. Son pouvoir se déclenche à sa mort.",
    maxTargets: 0,
    unique: true,
  },
  {
    id: 'ange',
    name: "L'Ange",
    image: '/images/ange.png',
    team: 'solo',
    wakeUpOrder: 6,
    nightAction: "L'Ange n'a pas d'action de nuit. Il gagne la partie s'il est éliminé par le village lors du tout premier vote de jour.",
    maxTargets: 0,
    unique: true,
    night1Only: true,
  },
  {
    id: 'montreur-ours',
    name: "Montreur d'Ours",
    image: '/images/montreur-ours.png',
    team: 'village',
    wakeUpOrder: 7,
    nightAction: "Au réveil du village : si un Loup-Garou est assis à côté du Montreur d'Ours, l'ours grogne (le MDJ fait un bruit).",
    maxTargets: 0,
    unique: true,
    night1Only: true,
  },
  {
    id: 'ancien',
    name: "L'Ancien",
    image: '/images/ancien.png',
    team: 'village',
    wakeUpOrder: 8,
    nightAction: "L'Ancien possède deux vies contre la nuit. La première fois qu'il est attaqué par les Loups-Garous, il survit (il dévoile sa carte au réveil). La seconde fois, il meurt. S'il est éliminé par le vote ou le pouvoir des villageois, il meurt et tous les rôles villageois perdent leurs pouvoirs.",
    maxTargets: 0,
    unique: true,
    night1Only: true,
  },
  {
    id: 'villageois',
    name: 'Villageois',
    image: '/images/villageois.jpg',
    team: 'village',
    wakeUpOrder: 0,
    nightAction: "Les Villageois n'ont pas d'action de nuit.",
    maxTargets: 0,
  },
];

export type RoleConfigV2 = Record<string, number>;

export function getNightCharactersForConfig(config: RoleConfigV2, night = 1): Character[] {
  return CHARACTERS
    .filter((c) => {
      const count = (config[c.configKey ?? c.id] ?? 0) > 0;
      return c.wakeUpOrder > 0 && count;
    })
    .filter((c) => !c.night1Only || night === 1)
    .filter((c) => c.nightMin == null || night >= c.nightMin)
    .filter((c) => {
      if (c.nightParity == null) return true;
      if (c.nightParity === 'even') return night % 2 === 0;
      return night % 2 === 1;
    })
    .sort((a, b) => a.wakeUpOrder - b.wakeUpOrder);
}

export interface Player {
  id: number;
  name: string;
  isAlive: boolean;
}

export const CHARACTER_COLORS: Record<string, { idle: string; selected: string }> = {
  cupidon: {
    idle: 'border-pink-800 bg-pink-950/40 text-pink-300',
    selected: 'bg-pink-600 border-pink-600 text-white',
  },
  'enfant-sauvage': {
    idle: 'border-teal-800 bg-teal-950/40 text-teal-300',
    selected: 'bg-teal-600 border-teal-600 text-white',
  },
  voyante: {
    idle: 'border-violet-800 bg-violet-950/40 text-violet-300',
    selected: 'bg-violet-600 border-violet-600 text-white',
  },
  'loup-garou': {
    idle: 'border-red-800 bg-red-950/40 text-red-300',
    selected: 'bg-red-700 border-red-700 text-white',
  },
  'loup-blanc': {
    idle: 'border-gray-400 bg-gray-800/40 text-gray-300',
    selected: 'bg-gray-500 border-gray-500 text-white',
  },
  'loup-blanc-solo': {
    idle: 'border-gray-400 bg-gray-800/40 text-gray-300',
    selected: 'bg-gray-500 border-gray-500 text-white',
  },
  renard: {
    idle: 'border-amber-700 bg-amber-950/40 text-amber-300',
    selected: 'bg-amber-600 border-amber-600 text-white',
  },
  'montreur-ours': {
    idle: 'border-amber-800 bg-amber-950/40 text-amber-300',
    selected: 'bg-amber-600 border-amber-600 text-white',
  },
  ancien: {
    idle: 'border-stone-600 bg-stone-800/40 text-stone-300',
    selected: 'bg-stone-600 border-stone-600 text-white',
  },
};

/** Computes the set of player IDs who die this night. */
export function computeNightDeaths(
  stepSelections: Record<string, string[]>,
  lovers: [number, number] | null
): Set<number> {
  const deaths = new Set<number>();

  const wolfSel = stepSelections['loup-garou'] ?? [];
  const wolfVictimId = wolfSel[0] ? Number(wolfSel[0]) : null;

  const witchSel = stepSelections['sorciere'] ?? [];
  const healed = witchSel.includes('__heal__');
  const witchKillId = witchSel.find((id) => id !== '__heal__');

  const loupBlancSoloSel = stepSelections['loup-blanc-solo'] ?? [];
  const loupBlancSoloVictimId = loupBlancSoloSel[0] ? Number(loupBlancSoloSel[0]) : null;

  if (wolfVictimId && !healed) deaths.add(wolfVictimId);
  if (witchKillId) deaths.add(Number(witchKillId));
  if (loupBlancSoloVictimId) deaths.add(loupBlancSoloVictimId);

  // Lover chain
  if (lovers) {
    for (const id of deaths) {
      if (id === lovers[0] || id === lovers[1]) {
        deaths.add(lovers[0]);
        deaths.add(lovers[1]);
        break;
      }
    }
  }

  return deaths;
}

// ── Game history ───────────────────────────────────────────────────────────

export type HistoryWinner = 'wolves' | 'village' | 'loup-blanc' | 'ange';

export interface GameHistoryEntry {
  id: string;
  date: string;
  playerNames: string[];
  roleAssignments: Record<string, number[]>;
  winner: HistoryWinner;
}

const HISTORY_STORAGE_KEY = 'loup-garou-v2-history';
const MAX_HISTORY = 50;

export function getRoleDisplayName(roleKey: string): string {
  const char = CHARACTERS.find((c) => c.id === roleKey || c.configKey === roleKey);
  return char?.name ?? roleKey;
}

/** Get each player's role for display: playerId (1-based) -> role display name */
export function getPlayerRoles(
  roleAssignments: Record<string, number[]>
): Map<number, string> {
  const map = new Map<number, string>();
  for (const [roleKey, playerIds] of Object.entries(roleAssignments)) {
    const name = getRoleDisplayName(roleKey);
    for (const id of playerIds) map.set(id, name);
  }
  return map;
}

export function loadGameHistory(): GameHistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as GameHistoryEntry[];
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch {
    /* ignore */
  }
  return [];
}

export function saveGameToHistory(entry: Omit<GameHistoryEntry, 'id' | 'date'>): void {
  try {
    const full: GameHistoryEntry = {
      ...entry,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      date: new Date().toISOString(),
    };
    const list = loadGameHistory();
    list.unshift(full);
    const trimmed = list.slice(0, MAX_HISTORY);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    /* ignore */
  }
}
