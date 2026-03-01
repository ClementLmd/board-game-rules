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
    id: 'loup-garou',
    name: 'Les Loups-Garous',
    image: '/images/loup-garou.jpg',
    team: 'loups',
    wakeUpOrder: 3,
    nightAction: 'Les Loups-Garous se réveillent, se reconnaissent et désignent ensemble une victime à éliminer.',
    maxTargets: 1,
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
    .filter((c) => c.wakeUpOrder > 0 && (config[c.id] ?? 0) > 0)
    .filter((c) => !c.night1Only || night === 1)
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
  voyante: {
    idle: 'border-violet-800 bg-violet-950/40 text-violet-300',
    selected: 'bg-violet-600 border-violet-600 text-white',
  },
  'loup-garou': {
    idle: 'border-red-800 bg-red-950/40 text-red-300',
    selected: 'bg-red-700 border-red-700 text-white',
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

  if (wolfVictimId && !healed) deaths.add(wolfVictimId);
  if (witchKillId) deaths.add(Number(witchKillId));

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
