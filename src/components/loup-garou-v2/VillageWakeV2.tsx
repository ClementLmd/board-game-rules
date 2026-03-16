import { Sun, Vote } from 'lucide-react';
import type { Player } from './game-data';
import type { NightOutcome } from './game-rules';

interface VillageWakeV2Props {
  players: Player[];
  nightOutcome: NightOutcome;
  roleAssignments: Record<string, number[]>;
  onDayPhase: () => void;
}

export function VillageWakeV2({
  players,
  nightOutcome,
  roleAssignments,
  onDayPhase,
}: VillageWakeV2Props) {
  const playerById = new Map(players.map((p) => [String(p.id), p]));
  const montreurIds = roleAssignments['montreur-ours'] ?? [];
  const montreurAlive = players.find((p) => montreurIds.includes(p.id) && p.isAlive);

  const wolfVictimEntry = nightOutcome.deaths.find((d) => d.cause === 'loup-garou');
  const witchKillEntry = nightOutcome.deaths.find((d) => d.cause === 'sorciere');
  const loverChainEntries = nightOutcome.deaths.filter((d) => d.cause === 'amour');

  const wolfVictim = wolfVictimEntry
    ? playerById.get(String(wolfVictimEntry.playerId)) ?? null
    : null;
  const witchKillTarget = witchKillEntry
    ? playerById.get(String(witchKillEntry.playerId)) ?? null
    : null;

  const deaths = nightOutcome.deaths
    .map((d) => playerById.get(String(d.playerId)) ?? null)
    .filter((p): p is Player => p != null);

  const loverChainDeaths = loverChainEntries
    .map((d) => playerById.get(String(d.playerId)) ?? null)
    .filter((p): p is Player => p != null);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-950 px-4 py-8">
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

        {/* Night summary */}
        <div className="mb-6 rounded-lg border border-gray-800 bg-gray-900 p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-100">Résumé de la nuit</h3>

          {wolfVictim && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Victime des loups</span>
              <span className={wolfDied ? 'font-medium text-red-400' : 'font-medium text-emerald-400'}>
                {wolfVictim.name} {witchHealed ? '(sauvé·e)' : '💀'}
              </span>
            </div>
          )}

          {witchKillTarget && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Poison de la sorcière</span>
              <span className="font-medium text-red-400">{witchKillTarget.name} 💀</span>
            </div>
          )}

          {loverChainDeaths.length > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Chagrin d&apos;amour</span>
              <span className="font-medium text-pink-400">
                {loverChainDeaths.map((p) => p.name).join(', ')} 💔
              </span>
            </div>
          )}

          {deaths.length === 0 && (
            <p className="text-sm text-gray-500">Personne n&apos;est mort cette nuit.</p>
          )}

          {deaths.length > 0 && (
            <div className="mt-1 rounded-md bg-red-900/20 px-3 py-2">
              <p className="text-xs text-red-400">
                Mort(s) : {deaths.map((d) => d.name).join(', ')}
              </p>
            </div>
          )}
        </div>

        {montreurAlive && (
          <div className="mb-6 rounded-lg border border-amber-800/50 bg-amber-950/20 p-4">
            <p className="text-sm font-semibold text-amber-400">Montreur d&apos;Ours — {montreurAlive.name}</p>
            <p className="mt-1 text-xs text-amber-200/90">
              Vérifiez l&apos;ordre d&apos;assise : si un Loup-Garou est à côté de lui, l&apos;ours grogne (faites le bruit).
            </p>
          </div>
        )}

        <button
          onClick={onDayPhase}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-500 active:bg-violet-700"
        >
          <Vote className="h-4 w-4" />
          Phase de jour — vote du village
        </button>
      </div>
    </div>
  );
}
