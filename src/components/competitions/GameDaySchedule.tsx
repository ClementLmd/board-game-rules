import { useState } from 'react';
import { getSupabaseBrowserClient } from '../../lib/supabase-browser';
import type { GameDay } from '../../lib/database.types';

interface GameDayScheduleProps {
  competitionId: string;
  initialGameDays: GameDay[];
}

export default function GameDaySchedule({ competitionId, initialGameDays }: GameDayScheduleProps) {
  const [gameDays, setGameDays] = useState<GameDay[]>(initialGameDays);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    scheduled_date: '',
    game_name: '',
    base_points: 10,
    multiplier: 1.0,
    bonus_all_players: false,
    bonus_amount: 5,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = getSupabaseBrowserClient();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const bonus_config = form.bonus_all_players
      ? { all_players_bonus: form.bonus_amount }
      : {};

    const { data, error } = await supabase
      .from('game_days')
      .insert({
        competition_id: competitionId,
        scheduled_date: form.scheduled_date,
        game_name: form.game_name.trim(),
        base_points: form.base_points,
        multiplier: form.multiplier,
        bonus_config,
        status: 'upcoming',
      })
      .select('*')
      .single();

    if (error) {
      setError(error.message);
    } else {
      setGameDays((prev) => [data, ...prev].sort(
        (a, b) => new Date(b.scheduled_date).getTime() - new Date(a.scheduled_date).getTime()
      ));
      setShowForm(false);
      setForm({ scheduled_date: '', game_name: '', base_points: 10, multiplier: 1.0, bonus_all_players: false, bonus_amount: 5 });
    }
    setLoading(false);
  };

  const handleStatusChange = async (dayId: string, status: GameDay['status']) => {
    await supabase.from('game_days').update({ status }).eq('id', dayId);
    setGameDays((prev) => prev.map((d) => (d.id === dayId ? { ...d, status } : d)));
  };

  const statusOptions: { value: GameDay['status']; label: string }[] = [
    { value: 'upcoming', label: 'À venir' },
    { value: 'open', label: 'Ouvert (joueurs peuvent soumettre)' },
    { value: 'closed', label: 'Fermé' },
    { value: 'validated', label: 'Validé' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-white">Journées de jeu</h3>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Planifier
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-gray-800 rounded-xl p-4 mb-4 space-y-3">
          <h4 className="text-sm font-medium text-gray-200">Nouvelle journée</h4>

          {error && (
            <div className="p-2 bg-red-900/30 border border-red-700 rounded-lg text-red-400 text-xs">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Date</label>
              <input
                type="date"
                value={form.scheduled_date}
                onChange={(e) => setForm((f) => ({ ...f, scheduled_date: e.target.value }))}
                required
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Jeu</label>
              <input
                type="text"
                value={form.game_name}
                onChange={(e) => setForm((f) => ({ ...f, game_name: e.target.value }))}
                required
                placeholder="Nom du jeu"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder-gray-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Points de base</label>
              <input
                type="number"
                min="1"
                value={form.base_points}
                onChange={(e) => setForm((f) => ({ ...f, base_points: parseInt(e.target.value) || 10 }))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Multiplicateur</label>
              <select
                value={form.multiplier}
                onChange={(e) => setForm((f) => ({ ...f, multiplier: parseFloat(e.target.value) }))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="1">x1 (normal)</option>
                <option value="1.5">x1.5</option>
                <option value="2">x2 (double)</option>
                <option value="3">x3 (triple)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="bonus-all"
              checked={form.bonus_all_players}
              onChange={(e) => setForm((f) => ({ ...f, bonus_all_players: e.target.checked }))}
              className="w-4 h-4 accent-violet-500"
            />
            <label htmlFor="bonus-all" className="text-xs text-gray-300">
              Bonus pour tous les joueurs
            </label>
            {form.bonus_all_players && (
              <input
                type="number"
                min="0"
                value={form.bonus_amount}
                onChange={(e) => setForm((f) => ({ ...f, bonus_amount: parseInt(e.target.value) || 0 }))}
                className="w-20 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white"
                placeholder="pts"
              />
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="flex-1 px-3 py-2 border border-gray-600 text-gray-300 rounded-lg text-sm hover:bg-gray-700 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-3 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Création...' : 'Créer'}
            </button>
          </div>
        </form>
      )}

      {gameDays.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-6">
          Aucune journée planifiée. Cliquez sur "Planifier" pour en créer une.
        </p>
      ) : (
        <div className="space-y-3">
          {gameDays.map((day) => (
            <div key={day.id} className="bg-gray-800 rounded-xl p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <p className="font-medium text-white text-sm">{day.game_name}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(day.scheduled_date).toLocaleDateString('fr-FR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })}
                    {' · '}{day.base_points} pts{day.multiplier > 1 ? ` × ${day.multiplier}` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-400">Statut :</label>
                <select
                  value={day.status}
                  onChange={(e) => handleStatusChange(day.id, e.target.value as GameDay['status'])}
                  className="flex-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-xs text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
                >
                  {statusOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
