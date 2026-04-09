import { useState } from 'react';

interface AdminComp {
  id: string;
  name: string;
  status: string;
  invite_code: string | null;
  member_count: number;
}

interface MemberComp {
  id: string;
  name: string;
  status: string;
  member_status: string;
  total_points: number;
}

interface MyCompetitionsProps {
  userId: string;
  adminCompetitions: AdminComp[];
  memberCompetitions: MemberComp[];
  prefillCode?: string;
}

export default function MyCompetitions({
  userId,
  adminCompetitions: initialAdmin,
  memberCompetitions: initialMember,
  prefillCode = '',
}: MyCompetitionsProps) {
  const [adminComps] = useState(initialAdmin);
  const [memberComps, setMemberComps] = useState(initialMember);
  const [code, setCode] = useState(prefillCode.toUpperCase());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const res = await fetch('/api/competitions/join-by-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code.trim().toUpperCase() }),
    });

    const json = await res.json();

    if (!res.ok) {
      setError(json.error ?? 'Une erreur est survenue.');
    } else if (json.status === 'accepted') {
      setSuccess(`Vous avez rejoint "${json.competition_name}" !`);
      setMemberComps((prev) => [
        ...prev,
        {
          id: json.competition_id,
          name: json.competition_name,
          status: 'active',
          member_status: 'accepted',
          total_points: 0,
        },
      ]);
      setCode('');
    } else {
      setSuccess(`Demande envoyée pour "${json.competition_name}". En attente de validation.`);
      setCode('');
    }

    setLoading(false);
  };

  const isEmpty = adminComps.length === 0 && memberComps.length === 0;

  const statusBadge = (status: string) =>
    status === 'active'
      ? 'bg-green-900/50 text-green-400'
      : status === 'draft'
      ? 'bg-gray-700 text-gray-400'
      : 'bg-gray-700 text-gray-400';

  const memberStatusBadge = (s: string) =>
    s === 'accepted'
      ? 'bg-green-900/40 text-green-400 border border-green-800'
      : 'bg-yellow-900/40 text-yellow-400 border border-yellow-800';

  return (
    <div className="space-y-8">
      {/* Join by code */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <h2 className="text-base font-semibold text-white mb-1">Rejoindre une compétition</h2>
        <p className="text-sm text-gray-400 mb-4">Entrez le code partagé par l'organisateur.</p>

        {error && (
          <div className="mb-3 p-3 bg-red-900/30 border border-red-700 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-3 p-3 bg-green-900/30 border border-green-700 rounded-xl text-green-400 text-sm">
            {success}
          </div>
        )}

        <form onSubmit={handleJoinByCode} className="flex gap-3">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={8}
            placeholder="EX: A3F9B2C1"
            className="flex-1 px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white font-mono placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 tracking-widest uppercase"
          />
          <button
            type="submit"
            disabled={loading || code.length < 6}
            className="px-5 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors disabled:opacity-50"
          >
            {loading ? '...' : 'Rejoindre'}
          </button>
        </form>
      </div>

      {/* My competitions */}
      {isEmpty ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-5xl mb-3">🏆</div>
          <p className="text-sm">Vous n'avez pas encore de compétitions.</p>
          <p className="text-sm mt-1">
            Entrez un code ci-dessus ou{' '}
            <a href="/competitions/create/" className="text-violet-400 hover:underline">
              créez la vôtre
            </a>
            .
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {adminComps.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">
                Mes compétitions (admin)
              </h2>
              <div className="space-y-3">
                {adminComps.map((c) => (
                  <div
                    key={c.id}
                    className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex items-center gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-white truncate">{c.name}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge(c.status)}`}>
                          {c.status === 'active' ? 'Active' : c.status === 'draft' ? 'Brouillon' : 'Terminée'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">{c.member_count} membre{c.member_count > 1 ? 's' : ''}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={`/competitions/${c.id}/`}
                        className="px-3 py-1.5 bg-gray-800 text-gray-300 rounded-lg text-xs font-medium hover:bg-gray-700 transition-colors"
                      >
                        Voir
                      </a>
                      <a
                        href={`/competitions/${c.id}/manage/`}
                        className="px-3 py-1.5 bg-violet-600 text-white rounded-lg text-xs font-medium hover:bg-violet-700 transition-colors"
                      >
                        Gérer
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {memberComps.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">
                Compétitions rejointes
              </h2>
              <div className="space-y-3">
                {memberComps.map((c) => (
                  <div
                    key={c.id}
                    className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex items-center gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-white truncate">{c.name}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${memberStatusBadge(c.member_status)}`}>
                          {c.member_status === 'accepted' ? 'Membre' : 'En attente'}
                        </span>
                      </div>
                      {c.member_status === 'accepted' && (
                        <p className="text-xs text-violet-400 font-medium">{c.total_points} pts</p>
                      )}
                    </div>
                    {c.member_status === 'accepted' && (
                      <a
                        href={`/competitions/${c.id}/`}
                        className="px-3 py-1.5 bg-gray-800 text-gray-300 rounded-lg text-xs font-medium hover:bg-gray-700 transition-colors"
                      >
                        Voir
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
