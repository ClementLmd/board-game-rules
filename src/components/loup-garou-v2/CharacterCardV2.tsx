import { useState } from 'react';
import { UserPlus, ChevronRight, Sun, Eye, Crosshair, Shield } from 'lucide-react';
import type { Character, Player } from './game-data';

interface CharacterCardV2Props {
  character: Character;
  players: Player[];
  isLast: boolean;
  onAssignRole: (playerId: number, character: Character) => void;
  onNext: () => void;
  onWakeVillage: () => void;
  witchPotions: { life: boolean; death: boolean };
}

function TeamBadge({ team }: { team: Character['team'] }) {
  const config = {
    loups: { label: 'Loups-Garous', className: 'bg-red-900/30 text-red-400' },
    village: { label: 'Village', className: 'bg-violet-900/30 text-violet-400' },
    solo: { label: 'Solitaire', className: 'bg-gray-700 text-gray-400' },
  };
  const { label, className } = config[team];
  return (
    <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

export function CharacterCardV2({
  character,
  players,
  isLast,
  onAssignRole,
  onNext,
  onWakeVillage,
  witchPotions,
}: CharacterCardV2Props) {
  const [showAssign, setShowAssign] = useState(false);
  const availablePlayers = players.filter((p) => !p.role || p.role.id === character.id);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-8 bg-gray-950">
      <div className="w-full max-w-sm">
        {/* Character Image */}
        <div className="relative mb-4 overflow-hidden rounded-xl border border-gray-800">
          <img
            src={character.image}
            alt={character.name}
            className="aspect-[4/3] w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-transparent" />
          <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-100 drop-shadow-lg">{character.name}</h2>
              <TeamBadge team={character.team} />
            </div>
          </div>
        </div>

        {/* Night Action */}
        <div className="mb-3 rounded-lg border border-gray-800 bg-gray-900 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Eye className="h-4 w-4 text-violet-400" />
            <h3 className="text-sm font-semibold text-violet-400">Action de nuit</h3>
          </div>
          <p className="text-sm leading-relaxed text-gray-300">{character.nightAction}</p>
        </div>

        {/* Powers */}
        <div className="mb-3 rounded-lg border border-gray-800 bg-gray-900 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Shield className="h-4 w-4 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-400">Pouvoir</h3>
          </div>
          <p className="text-sm leading-relaxed text-gray-400">{character.powers}</p>
        </div>

        {/* Targets */}
        <div className="mb-4 rounded-lg border border-gray-800 bg-gray-900 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Crosshair className="h-4 w-4 text-red-400" />
            <h3 className="text-sm font-semibold text-red-400">Cibles possibles</h3>
          </div>
          <p className="text-sm leading-relaxed text-gray-300">
            {character.id === 'sorciere'
              ? `Potion de vie : ${witchPotions.life ? 'Disponible' : 'Utilisée'} | Potion de mort : ${witchPotions.death ? 'Disponible' : 'Utilisée'}`
              : character.targets}
          </p>
        </div>

        {/* Assign Role */}
        <button
          onClick={() => setShowAssign(!showAssign)}
          className="mb-3 flex w-full items-center justify-center gap-2 rounded-lg border border-gray-700 bg-gray-800 py-2.5 text-sm font-medium text-gray-100 transition-colors hover:bg-gray-700 active:bg-gray-700"
        >
          <UserPlus className="h-4 w-4" />
          Attribuer ce rôle
        </button>

        {showAssign && (
          <div className="mb-4 rounded-lg border border-gray-800 bg-gray-900 p-3">
            <div className="flex max-h-48 flex-col gap-1 overflow-y-auto">
              {availablePlayers.length === 0 ? (
                <p className="py-2 text-center text-sm text-gray-400">
                  Tous les joueurs ont déjà un rôle.
                </p>
              ) : (
                availablePlayers.map((player) => {
                  const alreadyAssigned = player.role?.id === character.id;
                  return (
                    <button
                      key={player.id}
                      onClick={() => onAssignRole(player.id, character)}
                      className={`flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors ${
                        alreadyAssigned
                          ? 'bg-violet-900/30 text-violet-400'
                          : 'text-gray-300 hover:bg-gray-800'
                      }`}
                    >
                      <span>{player.name}</span>
                      {alreadyAssigned && (
                        <span className="text-xs text-violet-400">Attribué</span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3">
          {!isLast ? (
            <button
              onClick={onNext}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-violet-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-500 active:bg-violet-700"
            >
              Personnage suivant
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={onWakeVillage}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-violet-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-500 active:bg-violet-700"
            >
              <Sun className="h-4 w-4" />
              Réveil du village
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
