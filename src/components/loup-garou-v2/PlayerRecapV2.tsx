import { useState } from 'react';
import { X, User, Eye, EyeOff } from 'lucide-react';
import type { Player } from './game-data';

interface PlayerRecapV2Props {
  players: Player[];
  isOpen: boolean;
  onClose: () => void;
}

export function PlayerRecapV2({ players, isOpen, onClose }: PlayerRecapV2Props) {
  const [revealedRoles, setRevealedRoles] = useState<Set<number>>(new Set());

  function toggleReveal(playerId: number) {
    setRevealedRoles((prev) => {
      const next = new Set(prev);
      if (next.has(playerId)) next.delete(playerId);
      else next.add(playerId);
      return next;
    });
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="absolute inset-0 bg-gray-950/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative ml-auto flex h-full w-full max-w-sm flex-col border-l border-gray-800 bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-800 px-4 py-4">
          <h2 className="text-lg font-bold text-gray-100">Joueurs</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-800 hover:text-gray-100"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex flex-col gap-2">
            {players.map((player) => {
              const isRevealed = revealedRoles.has(player.id);
              const teamColor =
                player.role?.team === 'loups'
                  ? 'text-red-400'
                  : player.role?.team === 'village'
                  ? 'text-violet-400'
                  : 'text-gray-400';

              return (
                <div
                  key={player.id}
                  className={`flex items-center gap-3 rounded-lg border border-gray-800 bg-gray-800/50 px-3 py-3 ${
                    !player.isAlive ? 'opacity-40' : ''
                  }`}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-700">
                    <User className="h-4 w-4 text-gray-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-100">{player.name}</p>
                    {player.role && isRevealed ? (
                      <p className={`text-xs ${teamColor}`}>{player.role.name}</p>
                    ) : player.role ? (
                      <p className="text-xs text-gray-400">Rôle attribué</p>
                    ) : (
                      <p className="text-xs text-gray-600">Pas de rôle</p>
                    )}
                  </div>
                  {player.role && (
                    <button
                      onClick={() => toggleReveal(player.id)}
                      className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-700 hover:text-gray-100"
                      aria-label={isRevealed ? 'Cacher le rôle' : 'Voir le rôle'}
                    >
                      {isRevealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  )}
                  {!player.isAlive && (
                    <span className="text-xs font-medium text-red-400">Mort</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="border-t border-gray-800 px-4 py-3">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>{players.filter((p) => p.role).length}/{players.length} rôles attribués</span>
            <span>{players.filter((p) => p.isAlive).length} en vie</span>
          </div>
        </div>
      </div>
    </div>
  );
}
