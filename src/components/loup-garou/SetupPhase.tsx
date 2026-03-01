import { useState, useCallback, type FormEvent } from 'react';
import type { Player } from './types';
import { MIN_PLAYERS, MAX_PLAYERS, MAX_PLAYER_NAME_LENGTH } from './types';

/** Valid: letters, spaces, numbers, dash. No accents or special chars. */
const VALID_NAME_REGEX = /^[a-zA-Z0-9\s\-]*$/;

function isValidName(name: string): boolean {
  return name.length > 0 && name.length <= MAX_PLAYER_NAME_LENGTH && VALID_NAME_REGEX.test(name);
}

interface SetupPhaseProps {
  players: Player[];
  onAddPlayer: (name: string) => void;
  onRemovePlayer: (id: string) => void;
  onContinue: () => void;
}

export function SetupPhase({
  players,
  onAddPlayer,
  onRemovePlayer,
  onContinue,
}: SetupPhaseProps) {
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const filtered = raw.replace(/[^a-zA-Z0-9\s\-]/g, '').slice(0, MAX_PLAYER_NAME_LENGTH);
    setInput(filtered);
    setError(null);
  }, []);

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      const name = input.trim();
      if (!name) return;
      if (!isValidName(name)) {
        setError('Nom invalide (lettres, chiffres, tiret, max 15 caractères)');
        return;
      }
      setError(null);
      onAddPlayer(name);
      setInput('');
    },
    [input, onAddPlayer]
  );

  const canContinue = players.length >= MIN_PLAYERS && players.length <= MAX_PLAYERS;
  const tooFew = players.length > 0 && players.length < MIN_PLAYERS;
  const tooMany = players.length > MAX_PLAYERS;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-6">
      <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
        Joueurs ({players.length} / {MIN_PLAYERS}–{MAX_PLAYERS})
      </h2>

      <form onSubmit={handleSubmit} className="mb-5 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={handleChange}
          placeholder="Nom (max 15 car., lettres et tiret)"
          maxLength={MAX_PLAYER_NAME_LENGTH}
          className="min-h-[44px] flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-base text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-red-500 dark:focus:ring-red-500/30"
          aria-label="Nom du joueur"
          aria-invalid={!!error}
        />
        <button
          type="submit"
          className="min-h-[44px] flex-shrink-0 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-medium text-white active:bg-primary-700 dark:bg-red-600 dark:active:bg-red-700"
        >
          Ajouter
        </button>
      </form>

      {error && (
        <p className="mb-4 text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      )}

      {tooFew && (
        <p className="mb-4 text-sm text-amber-700 dark:text-amber-400">
          Il faut au moins {MIN_PLAYERS} joueurs pour une partie.
        </p>
      )}
      {tooMany && (
        <p className="mb-4 text-sm text-red-700 dark:text-red-400">
          Maximum {MAX_PLAYERS} joueurs.
        </p>
      )}

      <ul className="mb-6 space-y-2">
        {players.map((p, i) => (
          <li
            key={p.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-600 dark:bg-gray-700"
          >
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {i + 1}. {p.name}
            </span>
            <button
              type="button"
              onClick={() => onRemovePlayer(p.id)}
              className="min-h-[44px] min-w-[44px] rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 active:bg-red-100 dark:text-red-400 dark:active:bg-red-900/50"
              aria-label={`Retirer ${p.name}`}
            >
              Retirer
            </button>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onContinue}
        disabled={!canContinue}
        className="min-h-[48px] w-full rounded-xl bg-primary-600 py-3 text-base font-medium text-white active:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-red-600 dark:active:bg-red-700"
      >
        Choisir les rôles
      </button>
    </section>
  );
}
