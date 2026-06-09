import { useState } from 'react';
import type { Competition } from '../../lib/database.types';

interface CompetitionWithMeta extends Competition {
  member_count: number;
  user_status?: 'pending' | 'accepted' | 'rejected' | null;
  is_admin: boolean;
}

interface CompetitionListProps {
  competitions: CompetitionWithMeta[];
  userId?: string | null;
}

export default function CompetitionList({ competitions, userId }: CompetitionListProps) {
  const [search, setSearch] = useState('');

  const filtered = competitions.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.description ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="mb-6">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une compétition..."
            className="w-full pl-9 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
          {search ? 'Aucune compétition trouvée.' : 'Aucune compétition disponible pour le moment.'}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {filtered.map((comp) => (
            <CompetitionCard key={comp.id} competition={comp} userId={userId} />
          ))}
        </div>
      )}
    </div>
  );
}

function CompetitionCard({
  competition: c,
  userId,
}: {
  competition: CompetitionWithMeta;
  userId?: string | null;
}) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(c.user_status);

  const handleJoin = async () => {
    if (!userId) {
      window.location.href = `/auth/login?next=/competitions/`;
      return;
    }
    setLoading(true);
    const res = await fetch(`/api/competitions/${c.id}/join`, { method: 'POST' });
    if (res.ok) {
      setStatus('pending');
    }
    setLoading(false);
  };

  const statusBadge =
    c.status === 'active'
      ? { label: 'Active', cls: 'bg-green-900/50 text-green-400' }
      : c.status === 'draft'
      ? { label: 'Brouillon', cls: 'bg-gray-700 text-gray-400' }
      : { label: 'Terminée', cls: 'bg-gray-700 text-gray-400' };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex flex-col gap-3 hover:border-gray-700 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-white text-base leading-tight">{c.name}</h3>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${statusBadge.cls}`}>
          {statusBadge.label}
        </span>
      </div>

      {c.description && (
        <p className="text-sm text-gray-400 line-clamp-2">{c.description}</p>
      )}

      <div className="flex items-center gap-3 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {c.member_count} joueur{c.member_count > 1 ? 's' : ''}
        </span>
        <span>
          {new Date(c.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
      </div>

      <div className="flex gap-2 mt-auto pt-1">
        <a
          href={`/competitions/${c.id}/`}
          className="flex-1 px-3 py-2 bg-gray-800 text-gray-300 rounded-lg text-sm font-medium text-center hover:bg-gray-700 transition-colors"
        >
          Voir
        </a>
        {c.is_admin ? (
          <a
            href={`/competitions/${c.id}/manage/`}
            className="flex-1 px-3 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium text-center hover:bg-violet-700 transition-colors"
          >
            Gérer
          </a>
        ) : status === 'accepted' ? (
          <span className="flex-1 px-3 py-2 bg-green-900/30 text-green-400 border border-green-800 rounded-lg text-sm font-medium text-center">
            Membre ✓
          </span>
        ) : status === 'pending' ? (
          <span className="flex-1 px-3 py-2 bg-yellow-900/30 text-yellow-400 border border-yellow-800 rounded-lg text-sm font-medium text-center">
            En attente…
          </span>
        ) : (
          <button
            onClick={handleJoin}
            disabled={loading || c.status !== 'active'}
            className="flex-1 px-3 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors disabled:opacity-50"
          >
            {loading ? '...' : 'Rejoindre'}
          </button>
        )}
      </div>
    </div>
  );
}
