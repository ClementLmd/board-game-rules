import { useState } from 'react';
import { getSupabaseBrowserClient } from '../../lib/supabase-browser';
import { computeResultPoints } from '../../lib/scoring';

interface ExistingResult {
  claimed_place: number | null;
  claimed_points: number | null;
  status: string;
}

interface GameDayResultsProps {
  gameDayId: string;
  userId: string;
  basePoints: number;
  multiplier: number;
  existingResult: ExistingResult | null;
}

export default function GameDayResults({
  gameDayId,
  userId,
  basePoints,
  multiplier,
  existingResult,
}: GameDayResultsProps) {
  const [place, setPlace] = useState<string>(
    existingResult?.claimed_place?.toString() ?? ''
  );
  const [points, setPoints] = useState<string>(
    existingResult?.claimed_points?.toString() ?? ''
  );
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = getSupabaseBrowserClient();
  const isValidated = existingResult?.status === 'validated';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSaved(false);

    const payload = {
      game_day_id: gameDayId,
      player_id: userId,
      claimed_place: place ? parseInt(place, 10) : null,
      claimed_points: points ? parseInt(points, 10) : null,
      status: 'pending' as const,
    };

    const { error } = existingResult
      ? await supabase
          .from('game_results')
          .update({ claimed_place: payload.claimed_place, claimed_points: payload.claimed_points })
          .eq('game_day_id', gameDayId)
          .eq('player_id', userId)
      : await supabase.from('game_results').insert(payload);

    if (error) {
      setError(error.message);
    } else {
      setSaved(true);
    }
    setLoading(false);
  };

  if (isValidated) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-400">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        Résultat validé : <span className="font-bold">{existingResult?.claimed_points ?? '—'} pts</span>
      </div>
    );
  }

  const estimatedPoints =
    place || points
      ? computeResultPoints({
          claimedPlace: place ? parseInt(place, 10) : null,
          claimedPoints: points ? parseInt(points, 10) : null,
          basePoints,
          multiplier,
        })
      : null;

  return (
    <div>
      <p className="text-sm font-medium text-gray-300 mb-3">
        {existingResult ? 'Modifier votre résultat' : 'Soumettre votre résultat'}
      </p>

      {error && (
        <div className="mb-3 p-2 bg-red-900/30 border border-red-700 rounded-lg text-red-400 text-xs">
          {error}
        </div>
      )}
      {saved && (
        <div className="mb-3 p-2 bg-green-900/30 border border-green-700 rounded-lg text-green-400 text-xs">
          Résultat soumis ! En attente de validation par l'admin.
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Votre place</label>
          <input
            type="number"
            min="1"
            value={place}
            onChange={(e) => setPlace(e.target.value)}
            className="w-24 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            placeholder="1er, 2e…"
          />
        </div>
        <div className="text-gray-600 text-sm pb-2">ou</div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Points directs</label>
          <input
            type="number"
            min="0"
            value={points}
            onChange={(e) => setPoints(e.target.value)}
            className="w-28 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            placeholder="Ex: 15"
          />
        </div>
        {estimatedPoints !== null && (
          <div className="text-xs text-violet-400 pb-2">
            ≈ {estimatedPoints} pts{multiplier > 1 ? ` (x${multiplier})` : ''}
          </div>
        )}
        <button
          type="submit"
          disabled={loading || (!place && !points)}
          className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors disabled:opacity-50"
        >
          {loading ? '...' : existingResult ? 'Mettre à jour' : 'Soumettre'}
        </button>
      </form>
    </div>
  );
}
