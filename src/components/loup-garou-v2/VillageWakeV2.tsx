import { Sun, Moon, RotateCcw } from 'lucide-react';
import type { Player } from './game-data';

interface VillageWakeV2Props {
  players: Player[];
  onNewNight: () => void;
  onRestart: () => void;
}

export function VillageWakeV2({ players, onNewNight, onRestart }: VillageWakeV2Props) {
  const assignedCount = players.filter((p) => p.role).length;
  const unassigned = players.filter((p) => !p.role);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-8 bg-gray-950">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-900/30 ring-2 ring-amber-700/40">
            <Sun className="h-8 w-8 text-amber-400" />
          </div>
          <h1 className="text-balance text-center font-sans text-2xl font-bold tracking-tight text-gray-100">
            Le village se réveille
          </h1>
          <p className="text-center text-sm text-gray-400">
            La nuit est terminée. Le village ouvre les yeux.
          </p>
        </div>

        <div className="mb-6 rounded-lg border border-gray-800 bg-gray-900 p-4">
          <h3 className="mb-3 text-sm font-semibold text-gray-100">Résumé de la nuit</h3>
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Rôles attribués</span>
              <span className="font-medium text-gray-100">
                {assignedCount}/{players.length}
              </span>
            </div>
            {unassigned.length > 0 && (
              <div className="mt-1 rounded-md bg-red-900/20 p-2">
                <p className="text-xs text-red-400">
                  Joueurs sans rôle : {unassigned.map((p) => p.name).join(', ')}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={onNewNight}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-500 active:bg-violet-700"
          >
            <Moon className="h-4 w-4" />
            Nouvelle nuit
          </button>
          <button
            onClick={onRestart}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-700 bg-gray-800 py-2.5 text-sm font-medium text-gray-100 transition-colors hover:bg-gray-700 active:bg-gray-700"
          >
            <RotateCcw className="h-4 w-4" />
            Nouvelle partie
          </button>
        </div>
      </div>
    </div>
  );
}
