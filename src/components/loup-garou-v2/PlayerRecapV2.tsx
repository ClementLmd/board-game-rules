import { X, Heart } from 'lucide-react';
import { CHARACTERS, type Player } from './game-data';

interface PlayerRecapV2Props {
  players: Player[];
  lovers: [number, number] | null;
  roleAssignments: Record<string, number[]>;
  isOpen: boolean;
  onClose: () => void;
}

/** Build a map from player ID → role name using roleAssignments */
function buildPlayerRoleMap(roleAssignments: Record<string, number[]>): Map<number, string> {
  const map = new Map<number, string>();
  for (const [roleId, playerIds] of Object.entries(roleAssignments)) {
    const char = CHARACTERS.find((c) => c.id === roleId);
    if (!char) continue;
    for (const id of playerIds) map.set(id, char.name);
  }
  return map;
}

export function PlayerRecapV2({ players, lovers, roleAssignments, isOpen, onClose }: PlayerRecapV2Props) {
  const loverSet = new Set(lovers ?? []);
  const roleMap = buildPlayerRoleMap(roleAssignments);

  if (!isOpen) return null;

  const alive = players.filter((p) => p.isAlive);
  const dead = players.filter((p) => !p.isAlive);

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-gray-950/70 backdrop-blur-sm" onClick={onClose} />

      {/* Bottom sheet */}
      <div className="relative max-h-[65vh] flex flex-col rounded-t-2xl border-t border-gray-800 bg-gray-900">
        {/* Handle + header */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-gray-800/60">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-100">Joueurs vivants</span>
            <span className="rounded-full bg-violet-900/50 px-2 py-0.5 text-xs font-bold text-violet-400">
              {alive.length}/{players.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-800 hover:text-gray-100"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Player list */}
        <div className="flex-1 overflow-y-auto px-3 py-2">
          <div className="flex flex-col gap-1">
            {alive.map((p) => (
              <PlayerRow key={p.id} player={p} role={roleMap.get(p.id)} isLover={loverSet.has(p.id)} alive />
            ))}
            {dead.length > 0 && (
              <>
                <p className="mt-2 mb-1 px-1 text-[10px] font-semibold uppercase tracking-widest text-gray-600">
                  Éliminés
                </p>
                {dead.map((p) => (
                  <PlayerRow key={p.id} player={p} role={roleMap.get(p.id)} isLover={loverSet.has(p.id)} alive={false} />
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PlayerRow({
  player,
  role,
  isLover,
  alive,
}: {
  player: Player;
  role: string | undefined;
  isLover: boolean;
  alive: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-lg px-3 py-2 ${
        alive ? 'bg-gray-800/50' : 'opacity-40'
      }`}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-100">{player.name}</p>
        {role && (
          <p className="text-xs text-gray-500">{role}</p>
        )}
      </div>
      {isLover && <Heart className="h-3 w-3 shrink-0 text-pink-400" />}
      {!alive && <span className="text-[10px] font-medium text-red-400">Mort</span>}
    </div>
  );
}
