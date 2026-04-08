import { useState } from 'react';
import { Crosshair, SkipForward } from 'lucide-react';
import type { Player } from './game-data';

interface HunterShotV2Props {
  hunterPlayer: Player;
  alivePlayers: Player[];
  onShoot: (targetId: number | null) => void;
}

export function HunterShotV2({ hunterPlayer, alivePlayers, onShoot }: HunterShotV2Props) {
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-950 px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-900/30 ring-2 ring-orange-700/40">
            <Crosshair className="h-8 w-8 text-orange-400" />
          </div>
          <h1 className="text-balance text-center font-sans text-2xl font-bold tracking-tight text-gray-100">
            Le Chasseur tire !
          </h1>
          <p className="text-center text-sm text-gray-400">
            <span className="font-semibold text-orange-300">{hunterPlayer.name}</span> est mort·e.
            Avant de rendre son dernier souffle, le Chasseur désigne une cible.
          </p>
        </div>

        <div className="mb-6 rounded-lg border border-gray-800 bg-gray-900 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-500">
            Cible du Chasseur
          </p>
          <div className="flex flex-wrap gap-2">
            {alivePlayers.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelected((prev) => (prev === p.id ? null : p.id))}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  selected === p.id
                    ? 'border-orange-600 bg-orange-600 text-white'
                    : 'border-gray-700 bg-gray-800 text-gray-200 hover:border-orange-700 hover:text-orange-300'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => onShoot(selected)}
            disabled={selected === null}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-500 active:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Crosshair className="h-4 w-4" />
            Confirmer le tir
          </button>
          <button
            type="button"
            onClick={() => onShoot(null)}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-700 bg-gray-800 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-700"
          >
            <SkipForward className="h-4 w-4" />
            Pas de tir (le Chasseur ne tire pas)
          </button>
        </div>
      </div>
    </div>
  );
}
