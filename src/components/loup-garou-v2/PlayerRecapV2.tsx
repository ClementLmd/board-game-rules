import { X, User, Heart } from 'lucide-react';
import type { Player } from './game-data';

interface PlayerRecapV2Props {
  players: Player[];
  lovers: [number, number] | null;
  isOpen: boolean;
  onClose: () => void;
}

export function PlayerRecapV2({ players, lovers, isOpen, onClose }: PlayerRecapV2Props) {
  const loverSet = new Set(lovers ?? []);
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
            {players.map((player) => (
              <div
                key={player.id}
                className={`flex items-center gap-3 rounded-lg border border-gray-800 bg-gray-800/50 px-3 py-3 ${
                  !player.isAlive ? 'opacity-40' : ''
                }`}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-700">
                  <User className="h-4 w-4 text-gray-400" />
                </div>
                <p className="min-w-0 flex-1 truncate text-sm font-medium text-gray-100">
                  {player.name}
                </p>
                {loverSet.has(player.id) && (
                  <Heart className="h-3.5 w-3.5 text-pink-400 shrink-0" />
                )}
                {!player.isAlive && (
                  <span className="text-xs font-medium text-red-400">Mort</span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-800 px-4 py-3">
          <p className="text-xs text-gray-400">
            {players.filter((p) => p.isAlive).length} joueurs en vie · {players.length} total
          </p>
        </div>
      </div>
    </div>
  );
}
