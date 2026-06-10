import { useState } from 'react';
import { getSupabaseBrowserClient } from '../../lib/supabase-browser';
import type { Json } from '../../lib/database.types';
import { computeResultPoints, getAllPlayersBonus } from '../../lib/scoring';

export interface ResultEntry {
  id: string;
  player_id: string;
  claimed_place: number | null;
  claimed_points: number | null;
  validated_points: number | null;
  status: 'pending' | 'validated' | 'rejected';
  profiles: {
    username: string | null;
    avatar_url: string | null;
  } | null;
}

export interface GameDayWithResults {
  id: string;
  game_name: string;
  scheduled_date: string;
  base_points: number;
  multiplier: number;
  bonus_config: Json;
  status: string;
  results: ResultEntry[];
}

interface ResultsValidatorProps {
  competitionId: string;
  initialGameDays: GameDayWithResults[];
}

export default function ResultsValidator({ initialGameDays }: ResultsValidatorProps) {
  const [gameDays, setGameDays] = useState<GameDayWithResults[]>(initialGameDays);
  const [editingPoints, setEditingPoints] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<string | null>(null);

  const supabase = getSupabaseBrowserClient();

  const getDefaultPoints = (result: ResultEntry, day: GameDayWithResults): number =>
    computeResultPoints({
      claimedPlace: result.claimed_place,
      claimedPoints: result.claimed_points,
      basePoints: day.base_points,
      multiplier: day.multiplier,
      bonusAllPlayers: getAllPlayersBonus(day.bonus_config),
    });

  const handleValidate = async (result: ResultEntry, day: GameDayWithResults) => {
    setLoading(result.id);
    const pointsStr = editingPoints[result.id];
    const parsed = pointsStr !== undefined ? parseInt(pointsStr, 10) : NaN;
    const validatedPoints = Number.isFinite(parsed) ? parsed : getDefaultPoints(result, day);

    const { error } = await supabase
      .from('game_results')
      .update({ validated_points: validatedPoints, status: 'validated' })
      .eq('id', result.id);

    if (!error) {
      setGameDays((prev) =>
        prev.map((d) =>
          d.id === day.id
            ? {
                ...d,
                results: d.results.map((r) =>
                  r.id === result.id
                    ? { ...r, validated_points: validatedPoints, status: 'validated' }
                    : r
                ),
              }
            : d
        )
      );
    }
    setLoading(null);
  };

  const handleReject = async (resultId: string, dayId: string) => {
    setLoading(resultId);
    await supabase.from('game_results').update({ status: 'rejected' }).eq('id', resultId);
    setGameDays((prev) =>
      prev.map((d) =>
        d.id === dayId
          ? {
              ...d,
              results: d.results.map((r) =>
                r.id === resultId ? { ...r, status: 'rejected' } : r
              ),
            }
          : d
      )
    );
    setLoading(null);
  };

  const activeDays = gameDays.filter((d) => d.status === 'open' || d.status === 'closed');

  if (activeDays.length === 0) {
    return (
      <p className="text-gray-500 text-sm text-center py-4">
        Aucune journée ouverte ou fermée avec des résultats à valider.
        Passez le statut d'une journée à "Ouvert" pour commencer à recevoir des soumissions.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {activeDays.map((day) => {
        const pending = day.results.filter((r) => r.status === 'pending');
        const validated = day.results.filter((r) => r.status === 'validated');

        return (
          <div key={day.id} className="bg-gray-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
              <div>
                <p className="font-medium text-white text-sm">{day.game_name}</p>
                <p className="text-xs text-gray-400">
                  {new Date(day.scheduled_date).toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })}
                  {day.multiplier > 1 && <span className="ml-1 text-amber-400">×{day.multiplier}</span>}
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                {pending.length > 0 && (
                  <span className="px-2 py-0.5 bg-amber-900/40 text-amber-400 border border-amber-700 rounded-full">
                    {pending.length} en attente
                  </span>
                )}
                {validated.length > 0 && (
                  <span className="px-2 py-0.5 bg-green-900/40 text-green-400 border border-green-700 rounded-full">
                    {validated.length} validé{validated.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>

            {day.results.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">
                Aucun résultat soumis.
              </p>
            ) : (
              <div className="divide-y divide-gray-700">
                {day.results.map((result) => {
                  const name = result.profiles?.username ?? 'Joueur';
                  const avatar = result.profiles?.avatar_url;
                  const initials = name.slice(0, 2).toUpperCase();
                  const defaultPts = getDefaultPoints(result, day);
                  const editPts = editingPoints[result.id] ?? String(defaultPts);

                  return (
                    <div key={result.id} className="flex items-center gap-3 px-4 py-3">
                      {avatar ? (
                        <img src={avatar} alt={name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-violet-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {initials}
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white font-medium truncate">{name}</p>
                        <p className="text-xs text-gray-400">
                          {result.claimed_place != null && `Place : ${result.claimed_place}`}
                          {result.claimed_place != null && result.claimed_points != null && ' · '}
                          {result.claimed_points != null && `Points : ${result.claimed_points}`}
                        </p>
                      </div>

                      {result.status === 'validated' ? (
                        <span className="text-sm font-bold text-green-400">
                          +{result.validated_points} pts ✓
                        </span>
                      ) : result.status === 'rejected' ? (
                        <span className="text-xs text-red-400">Refusé</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div>
                            <label className="block text-xs text-gray-500 mb-0.5">Pts validés</label>
                            <input
                              type="number"
                              min="0"
                              value={editPts}
                              onChange={(e) =>
                                setEditingPoints((prev) => ({ ...prev, [result.id]: e.target.value }))
                              }
                              className="w-20 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
                            />
                          </div>
                          <div className="flex flex-col gap-2">
                            <button
                              onClick={() => handleValidate(result, day)}
                              disabled={loading === result.id}
                              aria-label={`Valider le résultat de ${name}`}
                              className="inline-flex items-center justify-center gap-1.5 min-w-[6.5rem] px-4 py-2.5 bg-green-700 text-white rounded-lg text-sm font-semibold hover:bg-green-600 transition-colors disabled:opacity-50"
                            >
                              {loading === result.id ? (
                                '...'
                              ) : (
                                <>
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  Valider
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => handleReject(result.id, day.id)}
                              disabled={loading === result.id}
                              aria-label={`Refuser le résultat de ${name}`}
                              className="px-3 py-1.5 border border-red-700 text-red-400 rounded-lg text-xs hover:bg-red-900/30 transition-colors disabled:opacity-50"
                            >
                              Refuser
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
