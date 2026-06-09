import { useState } from 'react';
import { getSupabaseBrowserClient } from '../../lib/supabase-browser';

interface Member {
  id: string;
  user_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  total_points: number;
  profiles: {
    username: string | null;
    avatar_url: string | null;
  } | null;
}

interface MemberManagerProps {
  competitionId: string;
  initialMembers: Member[];
}

export default function MemberManager({ competitionId, initialMembers }: MemberManagerProps) {
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [loading, setLoading] = useState<string | null>(null);
  const supabase = getSupabaseBrowserClient();

  const updateStatus = async (memberId: string, status: 'accepted' | 'rejected') => {
    setLoading(memberId);
    const { error } = await supabase
      .from('competition_members')
      .update({ status })
      .eq('id', memberId);

    if (!error) {
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, status } : m))
      );
    }
    setLoading(null);
  };

  const pending = members.filter((m) => m.status === 'pending');
  const accepted = members.filter((m) => m.status === 'accepted');
  const rejected = members.filter((m) => m.status === 'rejected');

  const renderAvatar = (member: Member) => {
    const name = member.profiles?.username ?? 'Joueur';
    const initials = name.slice(0, 2).toUpperCase();
    return member.profiles?.avatar_url ? (
      <img src={member.profiles.avatar_url} alt={name} className="w-8 h-8 rounded-full object-cover" />
    ) : (
      <div className="w-8 h-8 rounded-full bg-violet-700 flex items-center justify-center text-white text-xs font-bold">
        {initials}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {pending.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-amber-400 uppercase tracking-wider mb-2">
            En attente ({pending.length})
          </h4>
          <div className="space-y-2">
            {pending.map((m) => (
              <div key={m.id} className="flex items-center gap-3 p-3 bg-amber-900/10 border border-amber-800/40 rounded-xl">
                {renderAvatar(m)}
                <span className="flex-1 text-sm text-white font-medium truncate">
                  {m.profiles?.username ?? 'Joueur'}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => updateStatus(m.id, 'rejected')}
                    disabled={loading === m.id}
                    className="px-3 py-1.5 border border-red-700 text-red-400 rounded-lg text-xs font-medium hover:bg-red-900/30 transition-colors disabled:opacity-50"
                  >
                    Refuser
                  </button>
                  <button
                    onClick={() => updateStatus(m.id, 'accepted')}
                    disabled={loading === m.id}
                    className="px-3 py-1.5 bg-green-700 text-white rounded-lg text-xs font-medium hover:bg-green-600 transition-colors disabled:opacity-50"
                  >
                    {loading === m.id ? '...' : 'Accepter'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {accepted.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-green-400 uppercase tracking-wider mb-2">
            Membres ({accepted.length})
          </h4>
          <div className="space-y-2">
            {accepted
              .sort((a, b) => b.total_points - a.total_points)
              .map((m) => (
                <div key={m.id} className="flex items-center gap-3 p-3 bg-gray-800 rounded-xl">
                  {renderAvatar(m)}
                  <span className="flex-1 text-sm text-white truncate">
                    {m.profiles?.username ?? 'Joueur'}
                  </span>
                  <span className="text-sm font-bold text-violet-400">{m.total_points} pts</span>
                  <button
                    onClick={() => updateStatus(m.id, 'rejected')}
                    disabled={loading === m.id}
                    className="ml-2 text-xs text-gray-500 hover:text-red-400 transition-colors disabled:opacity-50"
                    title="Retirer de la compétition"
                    aria-label={`Retirer ${m.profiles?.username ?? 'ce joueur'} de la compétition`}
                  >
                    ✕
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}

      {rejected.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
            Refusés ({rejected.length})
          </h4>
          <div className="space-y-2">
            {rejected.map((m) => (
              <div key={m.id} className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-xl opacity-60">
                {renderAvatar(m)}
                <span className="flex-1 text-sm text-gray-400 truncate">
                  {m.profiles?.username ?? 'Joueur'}
                </span>
                <button
                  onClick={() => updateStatus(m.id, 'accepted')}
                  className="text-xs text-violet-400 hover:underline"
                >
                  Accepter quand même
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {members.length === 0 && (
        <p className="text-gray-500 text-sm text-center py-4">
          Aucun joueur n'a encore demandé à rejoindre cette compétition.
        </p>
      )}
    </div>
  );
}
