import { useState, useCallback } from 'react';
import { Plus, Minus, ChevronRight, ArrowLeft } from 'lucide-react';
import { CHARACTERS, type RoleConfigV2, type Character } from './game-data';

function maxForRole(char: Character): number {
  if (char.unique) return 1;
  return Infinity; // loup-garou, villageois
}

const CONFIGURABLE_ROLES = CHARACTERS.filter((c) => c.id !== 'villageois' && !c.configKey);
const ROLE_GROUPS = [
  { label: 'Loups-Garous', ids: ['loup-garou', 'loup-blanc'], color: 'text-red-400' },
  {
    label: 'Village',
    ids: ['cupidon', 'voyante', 'enfant-sauvage', 'sorciere', 'renard', 'montreur-ours', 'ancien', 'chasseur', 'petite-fille', 'ange'],
    color: 'text-violet-400',
  },
];

interface RoleConfigV2Props {
  playerCount: number;
  onStart: (config: RoleConfigV2, assignRolesNow: boolean) => void;
  /** Return to player setup to modify the list of players */
  onBack?: () => void;
}

export function RoleConfigV2({ playerCount, onStart, onBack }: RoleConfigV2Props) {
  const [config, setConfig] = useState<RoleConfigV2>(() => ({
    'loup-garou': Math.max(2, Math.floor(playerCount / 4)),
    voyante: 1,
    sorciere: 1,
    cupidon: 0,
    'enfant-sauvage': 0,
    renard: 0,
    'montreur-ours': 0,
    ancien: 0,
    chasseur: 0,
    'petite-fille': 0,
    'loup-blanc': 0,
    ange: 0,
    villageois: 0,
  }));
  const [assignRolesNow, setAssignRolesNow] = useState(false);

  const total = Object.values(config).reduce((a, b) => a + b, 0);
  const villageois = playerCount - total;
  const isValid = villageois >= 0;

  const update = useCallback((roleId: string, delta: number) => {
    setConfig((prev) => {
      const char = CHARACTERS.find((c) => c.id === roleId);
      if (!char) return prev;
      const current = prev[roleId] ?? 0;
      const next = Math.max(0, Math.min(current + delta, maxForRole(char)));
      const otherTotal = Object.entries(prev)
        .filter(([k]) => k !== roleId && k !== 'villageois')
        .reduce((s, [, v]) => s + v, 0);
      if (delta > 0 && otherTotal + next > playerCount) return prev;
      return { ...prev, [roleId]: next };
    });
  }, [playerCount]);

  const handleStart = useCallback(() => {
    if (!isValid || villageois < 0) return;
    onStart({ ...config, villageois }, assignRolesNow);
  }, [config, isValid, villageois, assignRolesNow, onStart]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-start bg-gray-950 px-4 pt-6 pb-8">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="mb-4 flex w-full items-center justify-center gap-2 self-start rounded-lg border border-gray-700 bg-gray-800/80 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-700 hover:text-gray-100"
            >
              <ArrowLeft className="h-4 w-4" />
              Modifier les joueurs
            </button>
          )}
          <div className="w-full text-center">
            <h2 className="text-xl font-bold text-gray-100">Composition de la partie</h2>
            <p className="mt-1 text-sm text-gray-400">
              {playerCount} joueurs · {villageois >= 0 ? villageois : 0} villageois simples restants
            </p>
          </div>
        </div>

        <div className="space-y-5">
          {ROLE_GROUPS.map((group) => (
            <div key={group.label}>
              <p className={`mb-2 text-xs font-semibold uppercase tracking-widest ${group.color}`}>
                {group.label}
              </p>
              <div className="space-y-2">
                {group.ids.map((roleId) => {
                  const char = CONFIGURABLE_ROLES.find((c) => c.id === roleId);
                  if (!char) return null;
                  const count = config[roleId] ?? 0;
                  return (
                    <div
                      key={roleId}
                      className="flex items-center gap-3 rounded-xl border border-gray-800 bg-gray-900 px-4 py-3"
                    >
                      <img
                        src={char.image}
                        alt={char.name}
                        className="h-9 w-9 rounded-lg object-cover"
                      />
                      <span className="flex-1 text-sm font-medium text-gray-100">{char.name}</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => update(roleId, -1)}
                          disabled={count === 0}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-700 bg-gray-800 text-gray-300 disabled:opacity-30 active:bg-gray-700"
                          aria-label={`Retirer ${char.name}`}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-5 text-center text-sm font-bold text-gray-100">
                          {count}
                        </span>
                        <button
                          type="button"
                          onClick={() => update(roleId, 1)}
                          disabled={total >= playerCount || count >= maxForRole(char)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-700 bg-gray-800 text-gray-300 disabled:opacity-30 active:bg-gray-700"
                          aria-label={`Ajouter ${char.name}`}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Villageois (auto-filled) */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-500">
              Complément
            </p>
            <div className="flex items-center gap-3 rounded-xl border border-gray-800 bg-gray-900 px-4 py-3 opacity-60">
              <img
                src="/images/villageois.jpg"
                alt="Villageois"
                className="h-9 w-9 rounded-lg object-cover"
              />
              <span className="flex-1 text-sm font-medium text-gray-300">Villageois</span>
              <span className="text-sm font-bold text-gray-300">
                {villageois >= 0 ? villageois : 0}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3 rounded-lg border border-gray-800 bg-gray-900 px-4 py-3">
          <input
            id="assign-roles-now"
            type="checkbox"
            checked={assignRolesNow}
            onChange={(e) => setAssignRolesNow(e.target.checked)}
            className="h-4 w-4 rounded border-gray-700 bg-gray-900 text-violet-500 focus:ring-violet-500"
          />
          <label htmlFor="assign-roles-now" className="text-sm text-gray-200">
            Attribuer les rôles maintenant (avant la première nuit)
          </label>
        </div>

        {villageois < 0 && (
          <p className="mt-4 text-center text-sm text-red-400">
            Trop de rôles ({total}) pour {playerCount} joueurs.
          </p>
        )}

        <button
          type="button"
          onClick={handleStart}
          disabled={!isValid || villageois < 0}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-500 active:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Commencer la partie
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
