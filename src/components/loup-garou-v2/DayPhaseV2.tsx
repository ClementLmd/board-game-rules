import { useState } from 'react';
import { Vote, SkipForward, Moon } from 'lucide-react';
import type { Player } from './game-data';

interface DayPhaseV2Props {
  alivePlayers: Player[];
  onEliminate: (playerId: number | null) => void;
}

export function DayPhaseV2({ alivePlayers, onEliminate }: DayPhaseV2Props) {
  const [selected, setSelected] = useState<number | null>(null);

  const toggle = (id: number) => setSelected((prev) => (prev === id ? null : id));

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-950 px-4 py-8">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-yellow-900/30 ring-2 ring-yellow-700/40">
            <Vote className="h-8 w-8 text-yellow-400" />
          </div>
          <h1 className="text-balance text-center font-sans text-2xl font-bold tracking-tight text-gray-100">
            Le village délibère
          </h1>
          <p className="text-center text-sm text-gray-400">
            Le village vote pour éliminer un joueur suspect.
          </p>
        </div>

        {/* Player selection */}
        <div className="mb-6 rounded-lg border border-gray-800 bg-gray-900 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-500">
            Joueur éliminé par le village
          </p>
          <div className="flex flex-wrap gap-2">
            {alivePlayers.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => toggle(p.id)}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  selected === p.id
                    ? 'border-yellow-600 bg-yellow-600 text-white'
                    : 'border-gray-700 bg-gray-800 text-gray-200 hover:border-yellow-700 hover:text-yellow-300'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => onEliminate(selected)}
            disabled={selected === null}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-yellow-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-yellow-500 active:bg-yellow-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Moon className="h-4 w-4" />
            Confirmer et passer à la nuit
          </button>
          <button
            type="button"
            onClick={() => onEliminate(null)}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-700 bg-gray-800 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-700"
          >
            <SkipForward className="h-4 w-4" />
            Personne n&apos;est éliminé
          </button>
        </div>
      </div>
    </div>
  );
}
