import { Vote, Moon } from 'lucide-react';
import type { DeathEntry } from './DeathHistoryPanel';

interface DayResultV2Props {
  night: number;
  dayDeaths: DeathEntry[];
  onNextNight: () => void;
}

export function DayResultV2({ night, dayDeaths, onNextNight }: DayResultV2Props) {
  const villageDeath = dayDeaths.find((d) => d.cause === 'village');
  const loverDeaths = dayDeaths.filter((d) => d.cause === 'amour');

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-950 px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-yellow-900/30 ring-2 ring-yellow-700/40">
            <Vote className="h-8 w-8 text-yellow-400" />
          </div>
          <h1 className="text-balance text-center font-sans text-2xl font-bold tracking-tight text-gray-100">
            Fin du jour
          </h1>
          <p className="text-center text-sm text-gray-400">
            Le village a rendu son verdict.
          </p>
        </div>

        {/* Day summary */}
        <div className="mb-6 rounded-lg border border-gray-800 bg-gray-900 p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-100">Résumé du jour</h3>

          {dayDeaths.length === 0 ? (
            <p className="text-sm text-gray-500">Personne n&apos;est éliminé ce jour.</p>
          ) : (
            <>
              {villageDeath && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Vote du village</span>
                  <span className="font-medium text-yellow-400">{villageDeath.playerName} 💀</span>
                </div>
              )}
              {loverDeaths.length > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Chagrin d&apos;amour</span>
                  <span className="font-medium text-pink-400">
                    {loverDeaths.map((d) => d.playerName).join(', ')} 💔
                  </span>
                </div>
              )}
              <div className="mt-1 rounded-md bg-red-900/20 px-3 py-2">
                <p className="text-xs text-red-400">
                  Mort(s) : {dayDeaths.map((d) => d.playerName).join(', ')}
                </p>
              </div>
            </>
          )}
        </div>

        <button
          onClick={onNextNight}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-500 active:bg-violet-700"
        >
          <Moon className="h-4 w-4" />
          Nouvelle nuit
        </button>
      </div>
    </div>
  );
}
