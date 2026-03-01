import { RotateCcw } from 'lucide-react';

interface WinScreenV2Props {
  winner: 'wolves' | 'village';
  onRestart: () => void;
}

const CONFIG = {
  wolves: {
    image: '/images/loup-garou-win.png',
    bg: 'from-gray-950 to-gray-950',
    button: 'bg-red-700 hover:bg-red-600 active:bg-red-800',
  },
  village: {
    image: '/images/villageois-win.png',
    bg: 'from-gray-950 to-gray-950',
    button: 'bg-violet-600 hover:bg-violet-500 active:bg-violet-700',
  },
} as const;

export function WinScreenV2({ winner, onRestart }: WinScreenV2Props) {
  const c = CONFIG[winner];

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-950 px-4 py-10">
      {/* Image — constrained so it never fills the whole screen */}
      <img
        src={c.image}
        alt={winner === 'wolves' ? 'Victoire des Loups-Garous' : 'Victoire des Villageois'}
        className="mb-8 w-full max-w-xs rounded-2xl object-contain sm:max-w-sm"
      />

      {/* Button */}
      <div className="w-full max-w-xs sm:max-w-sm">
        <button
          type="button"
          onClick={onRestart}
          className={`flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold text-white shadow-lg transition-colors ${c.button}`}
        >
          <RotateCcw className="h-4 w-4" />
          Nouvelle partie
        </button>
      </div>
    </div>
  );
}
