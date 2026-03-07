import { useState } from 'react';
import { X, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import type { GameHistoryEntry, HistoryWinner } from './game-data';
import { getPlayerRoles } from './game-data';

const WINNER_LABELS: Record<HistoryWinner, string> = {
  wolves: 'Loups-Garous',
  village: 'Village',
  'loup-blanc': 'Loup-Blanc',
  ange: "L'Ange",
};

const WINNER_STYLES: Record<HistoryWinner, string> = {
  wolves: 'bg-red-900/40 text-red-400',
  village: 'bg-violet-900/40 text-violet-400',
  'loup-blanc': 'bg-gray-700/40 text-gray-300',
  ange: 'bg-amber-900/40 text-amber-400',
};

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

interface GameHistoryPanelProps {
  entries: GameHistoryEntry[];
  isOpen: boolean;
  onClose: () => void;
  onReplayWithPlayers: (playerNames: string[]) => void;
}

export function GameHistoryPanel({
  entries,
  isOpen,
  onClose,
  onReplayWithPlayers,
}: GameHistoryPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-gray-950/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative max-h-[75vh] flex flex-col rounded-t-2xl border-t border-gray-800 bg-gray-900">
        <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-gray-800/60">
          <span className="text-sm font-semibold text-gray-100">Parties précédentes</span>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-800 hover:text-gray-100"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto overscroll-contain p-2">
          {entries.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">
              Aucune partie enregistrée. Terminez une partie pour la voir ici.
            </p>
          ) : (
            <ul className="flex flex-col gap-2 pb-4">
              {entries.map((entry) => {
                const isExpanded = expandedId === entry.id;
                const playerRoles = getPlayerRoles(entry.roleAssignments);
                return (
                  <li
                    key={entry.id}
                    className="rounded-xl border border-gray-800 bg-gray-800/50 overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                      className="flex w-full items-center justify-between gap-2 p-3 text-left transition-colors hover:bg-gray-700/30"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-gray-500">{formatDate(entry.date)}</p>
                        <p className="mt-0.5">
                          <span
                            className={`inline-block rounded-md px-2 py-0.5 text-xs font-medium ${WINNER_STYLES[entry.winner]}`}
                          >
                            Victoire : {WINNER_LABELS[entry.winner]}
                          </span>
                        </p>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 shrink-0 text-gray-500" />
                      ) : (
                        <ChevronDown className="h-4 w-4 shrink-0 text-gray-500" />
                      )}
                    </button>
                    {isExpanded && (
                      <div className="border-t border-gray-700/60 px-3 pb-3 pt-2">
                        <ul className="mb-3 space-y-1">
                          {entry.playerNames.map((name, i) => {
                            const playerId = i + 1;
                            const role = playerRoles.get(playerId);
                            return (
                              <li
                                key={playerId}
                                className="flex items-center gap-2 text-sm text-gray-300"
                              >
                                <span className="font-medium text-gray-100">{name}</span>
                                {role && (
                                  <span className="text-xs text-gray-500">— {role}</span>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                        <button
                          onClick={() => onReplayWithPlayers(entry.playerNames)}
                          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-violet-700/60 bg-violet-900/30 px-3 py-2 text-xs font-medium text-violet-300 transition-colors hover:bg-violet-800/40 hover:text-violet-200"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Rejouer avec ces joueurs
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
