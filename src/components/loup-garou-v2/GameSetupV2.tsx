import { useState } from 'react';
import { Plus, Trash2, Moon } from 'lucide-react';
import type { Player } from './game-data';

interface GameSetupV2Props {
  onStart: (players: Player[]) => void;
}

export function GameSetupV2({ onStart }: GameSetupV2Props) {
  const [playerNames, setPlayerNames] = useState<string[]>(['', '', '', '', '', '']);
  const [error, setError] = useState('');

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

  return (
    <div className="flex min-h-screen flex-col items-center justify-start px-4 pt-8 pb-8 bg-gray-950">
      <div className="w-full max-w-md">
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
            <div key={i} className="flex items-center gap-2">
              <span className="w-7 text-right text-xs text-gray-500">{i + 1}.</span>
              <input
                type="text"
                value={name}
                onChange={(e) => updateName(i, e.target.value)}
                placeholder={`Joueur ${i + 1}`}
                className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-600"
              />
              {playerNames.length > 5 && (
                <button
                  onClick={() => removePlayer(i)}
                  className="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-red-900/20 hover:text-red-400"
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

        <button
          onClick={handleStart}
          className="mt-6 w-full rounded-lg bg-violet-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-500 active:bg-violet-700"
        >
          Commencer la nuit
        </button>
      </div>
    </div>
  );
}
