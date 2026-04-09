import { useState } from 'react';
import { getSupabaseBrowserClient } from '../../lib/supabase-browser';

interface CompetitionFormProps {
  userId: string;
}

export default function CompetitionForm({ userId }: CompetitionFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = getSupabaseBrowserClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from('competitions')
      .insert({
        name: name.trim(),
        description: description.trim() || null,
        admin_id: userId,
        status: 'active',
      })
      .select('id')
      .single();

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      window.location.href = `/competitions/${data.id}/manage/`;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="p-3 bg-red-900/30 border border-red-700 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Nom de la compétition <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={80}
          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
          placeholder="Ex : Tournoi de printemps 2026"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Description <span className="text-gray-500">(optionnel)</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          maxLength={500}
          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
          placeholder="Décrivez les règles générales de votre compétition..."
        />
      </div>

      <div className="flex gap-3 pt-2">
        <a
          href="/competitions/"
          className="flex-1 px-4 py-3 border border-gray-700 text-gray-300 rounded-xl text-sm font-medium text-center hover:bg-gray-800 transition-colors"
        >
          Annuler
        </a>
        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="flex-1 px-4 py-3 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors disabled:opacity-50"
        >
          {loading ? 'Création...' : 'Créer la compétition →'}
        </button>
      </div>
    </form>
  );
}
