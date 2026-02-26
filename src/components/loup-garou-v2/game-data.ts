export interface Character {
  id: string;
  name: string;
  image: string;
  team: 'loups' | 'village' | 'solo';
  powers: string;
  wakeUpOrder: number;
  nightAction: string;
  targets: string;
}

export const CHARACTERS: Character[] = [
  {
    id: 'cupidon',
    name: 'Cupidon',
    image: '/images/cupidon.jpg',
    team: 'village',
    powers: "Désigne 2 amoureux qui devront se protéger mutuellement. Si l'un meurt, l'autre aussi.",
    wakeUpOrder: 1,
    nightAction: 'Cupidon se réveille et désigne 2 joueurs qui seront amoureux pour toute la partie.',
    targets: '2 joueurs quelconques',
  },
  {
    id: 'voyante',
    name: 'La Voyante',
    image: '/images/voyante.jpg',
    team: 'village',
    powers: "Chaque nuit, elle peut regarder la carte d'un joueur de son choix.",
    wakeUpOrder: 2,
    nightAction:
      "La Voyante se réveille. Elle désigne un joueur dont elle veut voir la carte. Montrez-lui la carte silencieusement.",
    targets: '1 joueur vivant',
  },
  {
    id: 'loup-garou',
    name: 'Les Loups-Garous',
    image: '/images/loup-garou.jpg',
    team: 'loups',
    powers: 'Chaque nuit, ils se réveillent ensemble et choisissent une victime à dévorer.',
    wakeUpOrder: 3,
    nightAction:
      'Les Loups-Garous se réveillent, se reconnaissent et désignent ensemble une victime à éliminer.',
    targets: '1 joueur non-loup vivant',
  },
  {
    id: 'sorciere',
    name: 'La Sorcière',
    image: '/images/sorciere.jpg',
    team: 'village',
    powers: "Possède 2 potions utilisables une seule fois : une de guérison et une d'empoisonnement.",
    wakeUpOrder: 4,
    nightAction:
      "La Sorcière se réveille. Montrez-lui la victime des loups. Elle peut utiliser sa potion de guérison et/ou sa potion de mort.",
    targets: "Potion de vie : victime des loups | Potion de mort : 1 joueur vivant",
  },
  {
    id: 'petite-fille',
    name: 'La Petite Fille',
    image: '/images/petite-fille.jpg',
    team: 'village',
    powers: 'Peut espionner les Loups-Garous pendant leur réveil. Si elle se fait repérer, elle meurt.',
    wakeUpOrder: 0,
    nightAction:
      "La Petite Fille peut entrouvrir les yeux pendant le tour des Loups-Garous. Attention à ne pas se faire repérer !",
    targets: 'Aucune action directe — observe les loups',
  },
  {
    id: 'chasseur',
    name: 'Le Chasseur',
    image: '/images/chasseur.jpg',
    team: 'village',
    powers: "Quand il meurt, il emporte un joueur de son choix avec lui.",
    wakeUpOrder: 0,
    nightAction: "Le Chasseur n'a pas d'action de nuit. Son pouvoir se déclenche à sa mort.",
    targets: '1 joueur vivant (à sa mort uniquement)',
  },
  {
    id: 'villageois',
    name: 'Villageois',
    image: '/images/villageois.jpg',
    team: 'village',
    powers: "Aucun pouvoir spécial. Son arme : son vote et sa capacité à débattre.",
    wakeUpOrder: 0,
    nightAction: "Les Villageois n'ont pas d'action de nuit.",
    targets: 'Aucun',
  },
];

export const NIGHT_CHARACTERS = CHARACTERS.filter((c) => c.wakeUpOrder > 0).sort(
  (a, b) => a.wakeUpOrder - b.wakeUpOrder
);

export interface Player {
  id: number;
  name: string;
  role: Character | null;
  isAlive: boolean;
}
