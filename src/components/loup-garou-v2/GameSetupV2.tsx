import { useState, useEffect } from 'react';
import { Plus, Trash2, Moon, History } from 'lucide-react';
import type { Player } from './game-data';

interface GameSetupV2Props {
  onStart: (players: Player[]) => void;
  /** Pre-fill with these names (e.g. from "Rejouer" in game history) */
  initialPlayerNames?: string[] | null;
  /** When provided, show a "Parties précédentes" button that calls this */
  onOpenPreviousGames?: () => void;
}

export function GameSetupV2({ onStart, initialPlayerNames, onOpenPreviousGames }: GameSetupV2Props) {
  const [playerNames, setPlayerNames] = useState<string[]>(['', '', '', '', '', '']);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialPlayerNames != null && initialPlayerNames.length > 0) {
      const minSlots = 6;
      const padded =
        initialPlayerNames.length >= minSlots
          ? [...initialPlayerNames]
          : [...initialPlayerNames, ...Array(minSlots - initialPlayerNames.length).fill('')];
      setPlayerNames(padded);
      setError('');
    }
  }, [initialPlayerNames]);

  function addPlayer() {
    if (playerNames.length >= 18) return;
    setPlayerNames([...playerNames, '']);
  }

  function removePlayer(index: number) {
    if (playerNames.length <= 5) return;
    setPlayerNames(playerNames.filter((_, i) => i !== index));
  }

  function updateName(index: number, name: string) {
    const updated = [...playerNames];
    updated[index] = name;
    setPlayerNames(updated);
    setError('');
  }

  function handleStart() {
    const trimmed = playerNames.map((n) => n.trim());
    if (trimmed.some((n) => n === '')) {
      setError('Tous les joueurs doivent avoir un nom.');
      return;
    }
    const unique = new Set(trimmed);
    if (unique.size !== trimmed.length) {
      setError('Les noms doivent être uniques.');
      return;
    }
    const players: Player[] = trimmed.map((name, i) => ({
      id: i + 1,
      name,
      role: null,
      isAlive: true,
    }));
    onStart(players);
  }

  const filledPlayerCount = playerNames.filter((name) => name.trim() !== '').length;
  const hasMinimumPlayers = filledPlayerCount >= 6;

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gray-950 px-4 py-8">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-violet-900/30 ring-2 ring-violet-700/40">
            <Moon className="h-8 w-8 text-violet-400" />
          </div>
          <h1 className="text-balance text-center font-sans text-3xl font-bold tracking-tight text-gray-100">
            Loup-Garou
          </h1>
          <p className="text-center text-sm text-gray-400">
            Entrez les noms des joueurs pour commencer la partie.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          {playerNames.map((name, i) => (
            <div key={i} className="flex min-w-0 items-center gap-2">
              <span className="shrink-0 w-7 text-right text-xs text-gray-500">{i + 1}.</span>
              <input
                type="text"
                value={name}
                onChange={(e) => updateName(i, e.target.value)}
                placeholder={`Joueur ${i + 1}`}
                className="min-w-0 flex-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-600"
              />
              {playerNames.length > 5 && (
                <button
                  onClick={() => removePlayer(i)}
                  className="shrink-0 rounded-md p-1.5 text-gray-500 transition-colors hover:bg-red-900/20 hover:text-red-400"
                  aria-label={`Supprimer joueur ${i + 1}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        {playerNames.length < 18 && (
          <button
            onClick={addPlayer}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gray-700 bg-transparent py-2.5 text-sm text-gray-400 transition-colors hover:border-violet-700 hover:text-violet-400"
          >
            <Plus className="h-4 w-4" />
            Ajouter un joueur
          </button>
        )}

        {error && <p className="mt-3 text-center text-sm text-red-400">{error}</p>}

        <div className="mt-6 flex flex-col gap-2">
          {onOpenPreviousGames && (
            <button
              type="button"
              onClick={onOpenPreviousGames}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-700 bg-gray-800/80 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-700 hover:text-gray-100"
            >
              <History className="h-4 w-4" />
              Parties précédentes
            </button>
          )}
          <button
            onClick={handleStart}
            disabled={!hasMinimumPlayers}
            className={`w-full rounded-lg py-3 text-sm font-semibold transition-colors ${
              hasMinimumPlayers
                ? 'bg-violet-600 text-white hover:bg-violet-500 active:bg-violet-700'
                : 'bg-gray-800 text-gray-500 cursor-not-allowed'
            }`}
          >
            Commencer la nuit
          </button>
        </div>
      </div>
    </div>
  );
}
