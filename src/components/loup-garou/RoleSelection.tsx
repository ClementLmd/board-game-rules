import { useState, useCallback } from 'react';
import type { RoleConfig } from './types';
import { ROLES } from './types';

interface RoleSelectionProps {
  playerCount: number;
  onStartGame: (config: RoleConfig) => void;
}

export function RoleSelection({
  playerCount,
  onStartGame,
}: RoleSelectionProps) {
  const [config, setConfig] = useState<RoleConfig>(() => {
    const base = {
      'loup-garou': 2,
      sorciere: 1,
      cupidon: 1,
      voyante: 1,
      'petite-fille': 1,
    };
    const baseTotal = 6;
    const villageois = Math.max(0, playerCount - baseTotal);
    return {
      ...base,
      villageois,
    };
  });

  const total = Object.values(config).reduce((a, b) => a + b, 0);
  const isValid = total === playerCount && total > 0;

  const updateCount = useCallback((roleId: string, delta: number) => {
    setConfig((prev) => {
      const currentTotal = Object.values(prev).reduce((a, b) => a + b, 0);
      const current = prev[roleId] ?? 0;
      let next = current + delta;
      if (delta > 0 && currentTotal + delta > playerCount) {
        next = current + Math.max(0, playerCount - currentTotal);
      }
      next = Math.max(0, Math.min(next, playerCount));
      const nextConfig = { ...prev };
      if (next === 0) delete nextConfig[roleId];
      else nextConfig[roleId] = next;
      return nextConfig;
    });
  }, [playerCount]);

  const handleContinue = useCallback(() => {
    if (isValid) {
      onStartGame(config);
    }
  }, [config, isValid, onStartGame]);

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-6">
      <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
        Rôles de la partie
      </h2>
      <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
        Choisissez quels rôles sont en jeu et combien de chaque. Les rôles seront attribués aux joueurs au fur et à mesure des appels de nuit.
      </p>

      <ul className="mb-6 space-y-3">
        {ROLES.map((role) => {
          const count = config[role.id] ?? 0;
          return (
            <li
              key={role.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-600 dark:bg-gray-700"
            >
              <div>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {role.name}
                </span>
                <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                  ({role.team})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => updateCount(role.id, -1)}
                  disabled={count <= 0}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-lg font-medium text-gray-600 disabled:opacity-40 dark:border-gray-600 dark:bg-gray-600 dark:text-gray-300"
                  aria-label={`Réduire ${role.name}`}
                >
                  −
                </button>
                <span className="min-w-[2rem] text-center font-semibold tabular-nums text-gray-900 dark:text-gray-100">
                  {count}
                </span>
                <button
                  type="button"
                  onClick={() => updateCount(role.id, 1)}
                  disabled={total >= playerCount}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-lg font-medium text-gray-600 disabled:opacity-40 dark:border-gray-600 dark:bg-gray-600 dark:text-gray-300 dark:active:bg-gray-500"
                  aria-label={`Augmenter ${role.name}`}
                >
                  +
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-600 dark:bg-gray-700">
        <p className="text-sm text-gray-700 dark:text-gray-300">
          Total : <strong>{total}</strong> / {playerCount} joueurs
          {total !== playerCount && (
            <span className="ml-2 text-amber-600 dark:text-amber-400">
              (ajustez pour atteindre {playerCount})
            </span>
          )}
        </p>
      </div>

      <button
        type="button"
        onClick={handleContinue}
        disabled={!isValid}
        className="min-h-[48px] w-full rounded-xl bg-primary-600 py-3 text-base font-medium text-white active:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-red-600 dark:active:bg-red-700"
      >
        Lancer la partie
      </button>
    </section>
  );
}
