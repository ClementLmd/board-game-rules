import { useCallback, useMemo, useState } from "react";
import type { Player, RoleConfigV2 } from "./game-data";
import { CHARACTERS } from "./game-data";

interface ManualRoleAssignV2Props {
  players: Player[];
  roleConfig: RoleConfigV2;
  initialAssignments?: Record<string, number[]>;
  onDone: (assignments: Record<string, number[]>) => void;
  onBack: () => void;
}

export function ManualRoleAssignV2({
  players,
  roleConfig,
  initialAssignments,
  onDone,
  onBack,
}: ManualRoleAssignV2Props) {
  const [assignments, setAssignments] = useState<Record<string, number[]>>(
    initialAssignments ?? {},
  );

  const roles = useMemo(
    () =>
      Object.entries(roleConfig)
        .filter(([, count]) => count > 0)
        .map(([roleKey, count]) => {
          const character =
            CHARACTERS.find(
              (c) => c.id === roleKey || c.configKey === roleKey,
            ) ?? null;
          return {
            key: roleKey,
            count,
            character,
          };
        })
        .filter((r) => r.character != null),
    [roleConfig],
  );

  const takenPlayerIds = useMemo(() => {
    const set = new Set<number>();
    for (const [roleKey, ids] of Object.entries(assignments)) {
      const needed = roleConfig[roleKey] ?? 0;
      if (needed === 0) continue;
      for (const id of ids) set.add(id);
    }
    return set;
  }, [assignments, roleConfig]);

  const toggle = useCallback(
    (roleKey: string, requiredCount: number, playerId: number) => {
      setAssignments((prev) => {
        const current = prev[roleKey] ?? [];
        const alreadyHere = current.includes(playerId);
        // If already assigned to another role, ignore
        const assignedElsewhere = Object.entries(prev).some(
          ([otherKey, ids]) =>
            otherKey !== roleKey && ids.includes(playerId),
        );
        if (!alreadyHere && assignedElsewhere) {
          return prev;
        }
        if (alreadyHere) {
          return {
            ...prev,
            [roleKey]: current.filter((id) => id !== playerId),
          };
        }
        if (current.length >= requiredCount) {
          // For 1-per-role, replace; otherwise keep as is
          if (requiredCount === 1) {
            return {
              ...prev,
              [roleKey]: [playerId],
            };
          }
          return prev;
        }
        return {
          ...prev,
          [roleKey]: [...current, playerId],
        };
      });
    },
    [],
  );

  const allAssigned = useMemo(
    () =>
      roles.every((role) => {
        const current = assignments[role.key] ?? [];
        return current.length === role.count;
      }),
    [roles, assignments],
  );

  const handleStart = useCallback(() => {
    if (!allAssigned) return;
    onDone(assignments);
  }, [allAssigned, assignments, onDone]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-start bg-gray-950 px-4 pt-6 pb-8">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center">
          <button
            type="button"
            onClick={onBack}
            className="mb-4 flex w-full items-center justify-center gap-2 self-start rounded-lg border border-gray-700 bg-gray-800/80 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-700 hover:text-gray-100"
          >
            Modifier la composition
          </button>
          <div className="w-full text-center">
            <h2 className="text-xl font-bold text-gray-100">
              Attribution des rôles
            </h2>
            <p className="mt-1 text-sm text-gray-400">
              Choisissez quels joueurs auront chaque rôle avant la première
              nuit.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {roles.map((role) => {
            const assignedIds = assignments[role.key] ?? [];
            const required = role.count;
            const char = role.character!;
            return (
              <div
                key={role.key}
                className="rounded-xl border border-gray-800 bg-gray-900 px-4 py-3"
              >
                <div className="mb-3 flex items-center gap-3">
                  <img
                    src={char.image}
                    alt={char.name}
                    className="h-9 w-9 rounded-lg object-cover"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-100">
                      {char.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {assignedIds.length}/{required} joueurs
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {players.map((p) => {
                    const inRole = assignedIds.includes(p.id);
                    const taken =
                      !inRole && takenPlayerIds.has(p.id) && required > 0;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        disabled={taken}
                        onClick={() => toggle(role.key, required, p.id)}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                          inRole
                            ? "border-violet-500 bg-violet-600 text-white"
                            : taken
                              ? "cursor-not-allowed border-gray-800 bg-gray-900 text-gray-600 line-through"
                              : "border-gray-700 bg-gray-800 text-gray-200 hover:border-violet-500 hover:text-violet-200"
                        }`}
                      >
                        {p.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={handleStart}
          disabled={!allAssigned}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-500 active:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Commencer la première nuit
        </button>
      </div>
    </div>
  );
}

