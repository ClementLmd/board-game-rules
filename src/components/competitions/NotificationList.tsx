import { useState, useEffect } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabase-browser";
import { dispatchNotificationsRead } from "../../lib/notifications";
import type { Notification } from "../../lib/database.types";

const notificationLabels: Record<string, string> = {
  join_request: "Demande pour rejoindre votre compétition",
  join_accepted: "Votre demande a été acceptée",
  join_rejected: "Votre demande a été refusée",
  member_removed: "Vous avez été retiré de la compétition",
  result_validated: "Résultat validé",
  result_submitted: "Nouveau résultat à valider",
  game_day_upcoming: "Partie à venir",
};

interface NotificationListProps {
  userId: string;
}

export default function NotificationList({ userId }: NotificationListProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = getSupabaseBrowserClient();

  useEffect(() => {
    loadNotifications();

    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev]);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  async function loadNotifications() {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30);
    setNotifications(data ?? []);
    setLoading(false);
  }

  async function markAllRead() {
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", userId)
      .eq("read", false);

    if (error) return;

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    dispatchNotificationsRead({ all: true });
  }

  async function markRead(id: string) {
    const { data, error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", id)
      .eq("user_id", userId)
      .eq("read", false)
      .select("id")
      .maybeSingle();

    if (error || !data) return;

    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    dispatchNotificationsRead();
  }

  if (loading) {
    return <div className="text-center py-8 text-gray-400">Chargement...</div>;
  }

  if (notifications.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <svg
          className="w-10 h-10 mx-auto mb-2 opacity-30"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        Aucune notification
      </div>
    );
  }

  const unread = notifications.filter((n) => !n.read);

  return (
    <div>
      {unread.length > 0 && (
        <div className="flex justify-end mb-3">
          <button
            onClick={markAllRead}
            className="text-xs text-violet-600 hover:underline"
          >
            Tout marquer comme lu
          </button>
        </div>
      )}
      <div className="space-y-2">
        {notifications.map((notif) => {
          const data = notif.data as Record<string, string>;
          const label = notificationLabels[notif.type] ?? notif.type;
          const link = data.competition_id
            ? notif.type === "result_submitted" || notif.type === "join_request"
              ? `/competitions/${data.competition_id}/manage/`
              : `/competitions/${data.competition_id}/`
            : undefined;

          return (
            <div
              key={notif.id}
              onMouseEnter={() => void markRead(notif.id)}
              className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${
                notif.read
                  ? "bg-white border-gray-100"
                  : "bg-violet-50 border-violet-100"
              }`}
            >
              <div
                className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${notif.read ? "bg-gray-200" : "bg-violet-500"}`}
              />
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm ${notif.read ? "text-gray-600" : "text-gray-900 font-medium"}`}
                >
                  {label}
                </p>
                {data.competition_name && (
                  <p className="text-xs text-gray-400 truncate">
                    {data.competition_name}
                  </p>
                )}
                {notif.type === "result_validated" && data.validated_points && (
                  <p className="text-xs text-green-600 font-medium">
                    +{data.validated_points} pts
                  </p>
                )}
                {notif.type === "result_submitted" && (
                  <p className="text-xs text-amber-600 font-medium">
                    {data.player_username ? `${data.player_username} · ` : ""}
                    {data.game_name}
                    {data.claimed_place != null &&
                      ` · place ${data.claimed_place}`}
                    {data.claimed_points != null &&
                      ` · ${data.claimed_points} pts`}
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(notif.created_at).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              {link && (
                <a
                  href={link}
                  onClick={async (e) => {
                    e.preventDefault();
                    await markRead(notif.id);
                    window.location.assign(link);
                  }}
                  className="text-xs text-violet-600 hover:underline shrink-0"
                >
                  Voir
                </a>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
