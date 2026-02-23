import { useState, useCallback } from 'react';
import type { Player, Role } from './types';
import { ROLES } from './types';

interface RoleAssignmentProps {
  players: Player[];
  onAssignRole: (playerId: string, role: Role) => void;
  onAssignRoles: (assignments: { playerId: string; role: Role }[]) => void;
  onContinue: () => void;
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Build a balanced role set for N players: ~1 loup per 4–5 players, rest village + optional specials */
function buildRoleSet(count: number): Role[] {
  const numWolves = Math.max(1, Math.floor(count / 4));
  const villageRoles = ROLES.filter((r) => r.team === 'village');
  const wolfRoles = ROLES.filter((r) => r.team === 'loup-garou');
  const neutreRoles = ROLES.filter((r) => r.team === 'neutre');

  const roles: Role[] = [];
  for (let i = 0; i < numWolves; i++) {
    roles.push(wolfRoles[i % wolfRoles.length]);
  }
  const rest = count - roles.length;
  if (rest > 0) {
    const specials = villageRoles.filter(
      (r) =>
        r.id !== 'villageois' &&
        ['voyante', 'sorciere', 'chasseur', 'petite-fille', 'salvateur'].includes(r.id)
    );
    const numSpecials = Math.min(Math.floor(rest / 3), specials.length);
    for (let i = 0; i < numSpecials; i++) {
      roles.push(specials[i]);
    }
    const villageois = ROLES.find((r) => r.id === 'villageois')!;
    for (let i = roles.length; i < count; i++) {
      roles.push(villageois);
    }
  }
  return shuffle(roles);
}

export function RoleAssignment({
  players,
  onAssignRole,
  onAssignRoles,
  onContinue,
}: RoleAssignmentProps) {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  const allAssigned = players.every((p) => p.role !== null);

  const handleRandomAssign = useCallback(() => {
    const roleSet = buildRoleSet(players.length);
    const shuffledPlayers = shuffle(players);
    const assignments = shuffledPlayers.map((p, i) => ({
      playerId: p.id,
      role: roleSet[i],
    }));
    onAssignRoles(assignments);
  }, [players, onAssignRoles]);

  const handleAssignRole = useCallback(
    (playerId: string, role: Role) => {
      onAssignRole(playerId, role);
      setSelectedPlayerId(null);
    },
    [onAssignRole]
  );

  const toggleReveal = useCallback((playerId: string) => {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(playerId)) next.delete(playerId);
      else next.add(playerId);
      return next;
    });
  }, []);

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
          Attribution des rôles
        </h2>
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
          Répartissez les rôles au hasard ou attribuez-les manuellement. Chaque joueur peut voir sa carte individuellement.
        </p>
        <button
          type="button"
          onClick={handleRandomAssign}
          className="mb-6 min-h-[44px] w-full rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-medium text-white active:bg-primary-700 dark:bg-red-600 dark:active:bg-red-700 sm:w-auto"
        >
          Répartir au hasard
        </button>

        <ul className="space-y-3">
          {players.map((player) => (
            <li
              key={player.id}
              className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-700"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-gray-900 dark:text-gray-100">{player.name}</span>
                <div className="flex flex-wrap items-center gap-2">
                  {player.role ? (
                    <>
                      <button
                        type="button"
                        onClick={() => toggleReveal(player.id)}
                        className="min-h-[44px] rounded-xl bg-primary-100 px-3 py-2.5 text-sm font-medium text-primary-700 active:bg-primary-200 dark:bg-red-900/40 dark:text-red-300 dark:active:bg-red-900/60"
                      >
                        {revealed.has(player.id) ? 'Masquer' : 'Voir la carte'}
                      </button>
                      {selectedPlayerId === player.id ? (
                        <button
                          type="button"
                          onClick={() => setSelectedPlayerId(null)}
                          className="min-h-[44px] rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-600 active:bg-gray-50 dark:border-gray-600 dark:bg-gray-600 dark:text-gray-300 dark:active:bg-gray-500"
                        >
                          Annuler
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setSelectedPlayerId(player.id)}
                          className="min-h-[44px] rounded-xl px-3 py-2.5 text-sm font-medium text-primary-600 active:bg-primary-100 dark:text-red-400 dark:active:bg-red-900/50"
                        >
                          Changer
                        </button>
                      )}
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setSelectedPlayerId(player.id)}
                      className="min-h-[44px] rounded-xl bg-gray-200 px-3 py-2.5 text-sm font-medium text-gray-700 active:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:active:bg-gray-500"
                    >
                      Attribuer un rôle
                    </button>
                  )}
                </div>
              </div>

              {revealed.has(player.id) && player.role && (
                <div
                  className="mt-3 rounded-xl border-2 border-primary-200 bg-white p-4 dark:border-red-800 dark:bg-gray-800"
                  role="region"
                  aria-label={`Carte de ${player.name}`}
                >
                  <p className="font-semibold text-primary-800 dark:text-red-300">
                    {player.role.name}
                  </p>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    {player.role.description}
                  </p>
                </div>
              )}

              {selectedPlayerId === player.id && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {ROLES.map((role) => (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => handleAssignRole(player.id, role)}
                      className="min-h-[44px] rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-left text-sm font-medium active:bg-primary-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:active:bg-gray-600"
                    >
                      {role.name}
                    </button>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={onContinue}
          disabled={!allAssigned}
          className="mt-6 min-h-[48px] w-full rounded-xl bg-primary-600 py-3 text-base font-medium text-white active:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-red-600 dark:active:bg-red-700"
        >
          Lancer la partie
        </button>
      </div>
    </section>
  );
}
