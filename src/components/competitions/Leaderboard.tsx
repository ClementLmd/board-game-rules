import { useState, useEffect } from 'react';
import { getSupabaseBrowserClient } from '../../lib/supabase-browser';

interface LeaderboardEntry {
  user_id: string;
  total_points: number;
  status: string;
  profiles: {
    username: string | null;
    avatar_url: string | null;
  } | null;
}

interface LeaderboardProps {
  competitionId: string;
  initialData: LeaderboardEntry[];
  currentUserId?: string | null;
}

const medals = ['🥇', '🥈', '🥉'];

export default function Leaderboard({ competitionId, initialData, currentUserId }: LeaderboardProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>(initialData);
  const supabase = getSupabaseBrowserClient();

  useEffect(() => {
    const channel = supabase
      .channel(`leaderboard-${competitionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'competition_members',
          filter: `competition_id=eq.${competitionId}`,
        },
        () => {
          // Reload leaderboard on any update
          loadLeaderboard();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [competitionId]);

  async function loadLeaderboard() {
    const { data } = await supabase
      .from('competition_members')
      .select('user_id, total_points, status, profiles(username, avatar_url)')
      .eq('competition_id', competitionId)
      .eq('status', 'accepted')
      .order('total_points', { ascending: false });
    if (data) setEntries(data as unknown as LeaderboardEntry[]);
  }

  const accepted = entries.filter((e) => e.status === 'accepted');

  if (accepted.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm">
        Aucun membre accepté pour l'instant.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {accepted.map((entry, index) => {
        const username = entry.profiles?.username ?? 'Joueur';
        const avatar = entry.profiles?.avatar_url;
        const initials = username.slice(0, 2).toUpperCase();
        const isMe = entry.user_id === currentUserId;
        const rank = index + 1;

        return (
          <div
            key={entry.user_id}
            className={`flex items-center gap-4 p-3 rounded-xl transition-colors ${
              isMe
                ? 'bg-violet-900/30 border border-violet-700'
                : 'bg-gray-800/50 border border-transparent'
            }`}
          >
            <div className="w-8 text-center">
              {rank <= 3 ? (
                <span className="text-lg">{medals[rank - 1]}</span>
              ) : (
                <span className="text-sm font-bold text-gray-500">#{rank}</span>
              )}
            </div>

            {avatar ? (
              <img
                src={avatar}
                alt={username}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-violet-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {initials}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium truncate ${isMe ? 'text-violet-300' : 'text-white'}`}>
                {username}
                {isMe && <span className="ml-1 text-xs text-violet-400">(moi)</span>}
              </p>
            </div>

            <div className="text-right">
              <p className="text-base font-bold text-white">{entry.total_points}</p>
              <p className="text-xs text-gray-500">pts</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
