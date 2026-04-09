import { useState } from 'react';
import { getSupabaseBrowserClient } from '../../lib/supabase-browser';

interface InviteCodeProps {
  competitionId: string;
  code: string | null;
}

export default function InviteCode({ competitionId, code: initialCode }: InviteCodeProps) {
  const [code] = useState(initialCode);
  const [copied, setCopied] = useState(false);
  const [inviteUsername, setInviteUsername] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const copyCode = async () => {
    if (!code) return;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteLoading(true);
    setInviteMsg(null);

    const username = inviteUsername.trim();
    if (!username) {
      setInviteMsg({ type: 'error', text: 'Entrez un pseudo.' });
      setInviteLoading(false);
      return;
    }

    const supabase = getSupabaseBrowserClient();

    // Find user by username
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, username')
      .eq('username', username)
      .maybeSingle();

    if (!profile || !('id' in profile)) {
      setInviteMsg({ type: 'error', text: `Utilisateur "${username}" introuvable.` });
      setInviteLoading(false);
      return;
    }

    const p = profile as { id: string; username: string };

    // Check if already a member
    const { data: existing } = await supabase
      .from('competition_members')
      .select('status')
      .eq('competition_id', competitionId)
      .eq('user_id', p.id)
      .maybeSingle();

    if (existing && 'status' in existing) {
      setInviteMsg({ type: 'error', text: `${username} est déjà dans la compétition.` });
      setInviteLoading(false);
      return;
    }

    // Add as accepted directly (admin-invited = auto-accepted)
    const { error } = await supabase.from('competition_members').insert({
      competition_id: competitionId,
      user_id: p.id,
      status: 'accepted',
    });

    if (error) {
      setInviteMsg({ type: 'error', text: error.message });
    } else {
      setInviteMsg({ type: 'success', text: `${username} a été ajouté à la compétition !` });
      setInviteUsername('');
    }

    setInviteLoading(false);
  };

  return (
    <div className="space-y-5">
      {/* Code display */}
      <div>
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Code d'invitation</p>
        <div className="flex items-center gap-3 p-4 bg-gray-800 rounded-xl border border-gray-700">
          <span className="flex-1 text-2xl font-mono font-bold text-white tracking-widest text-center">
            {code ?? '—'}
          </span>
          <button
            onClick={copyCode}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-700 text-white rounded-lg text-xs font-medium hover:bg-violet-600 transition-colors"
          >
            {copied ? (
              <>
                <svg className="w-3.5 h-3.5 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Copié !
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copier le code
              </>
            )}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-1.5">
          Partagez ce code à vos joueurs pour qu'ils rejoignent la compétition.
        </p>
      </div>

      {/* Invite by username */}
      <div>
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Inviter directement</p>

        {inviteMsg && (
          <div className={`mb-3 p-2.5 rounded-lg text-xs ${
            inviteMsg.type === 'success'
              ? 'bg-green-900/30 border border-green-700 text-green-400'
              : 'bg-red-900/30 border border-red-700 text-red-400'
          }`}>
            {inviteMsg.text}
          </div>
        )}

        <form onSubmit={handleInvite} className="flex gap-2">
          <input
            type="text"
            value={inviteUsername}
            onChange={(e) => setInviteUsername(e.target.value)}
            placeholder="Pseudo du joueur"
            className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          <button
            type="submit"
            disabled={inviteLoading || !inviteUsername.trim()}
            className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors disabled:opacity-50"
          >
            {inviteLoading ? '...' : 'Inviter'}
          </button>
        </form>
        <p className="text-xs text-gray-500 mt-1.5">
          Le joueur sera ajouté directement sans validation.
        </p>
      </div>
    </div>
  );
}
