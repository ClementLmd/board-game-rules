import { X } from 'lucide-react';

export interface DeathEntry {
  playerName: string;
  playerRole?: string;
  night: number;
  cause: 'loup-garou' | 'sorciere' | 'village' | 'amour' | 'loup-blanc' | 'chasseur';
}

const CAUSE_LABELS: Record<DeathEntry['cause'], string> = {
  'loup-garou': 'Loup-Garou',
  sorciere: 'Poison',
  village: 'Vote',
  amour: 'Chagrin d\'amour',
  'loup-blanc': 'Loup-Blanc',
  chasseur: 'Tir du Chasseur',
};

const CAUSE_COLORS: Record<DeathEntry['cause'], string> = {
  'loup-garou': 'bg-red-900/40 text-red-400',
  sorciere: 'bg-purple-900/40 text-purple-400',
  village: 'bg-yellow-900/40 text-yellow-400',
  amour: 'bg-pink-900/40 text-pink-400',
  'loup-blanc': 'bg-gray-700/40 text-gray-300',
  chasseur: 'bg-orange-900/40 text-orange-400',
};

interface DeathHistoryPanelProps {
  deaths: DeathEntry[];
  isOpen: boolean;
  onClose: () => void;
}

export function DeathHistoryPanel({ deaths, isOpen, onClose }: DeathHistoryPanelProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-gray-950/70 backdrop-blur-sm" onClick={onClose} />

      {/* Bottom sheet */}
      <div className="relative max-h-[65vh] flex flex-col rounded-t-2xl border-t border-gray-800 bg-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-gray-800/60">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-100">Historique des morts</span>
            {deaths.length > 0 && (
              <span className="rounded-full bg-red-900/50 px-2 py-0.5 text-xs font-bold text-red-400">
                {deaths.length}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-800 hover:text-gray-100"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-3 py-2">
          {deaths.length === 0 ? (
            <p className="py-2 text-sm text-gray-500">Personne n&apos;est mort pour l&apos;instant.</p>
          ) : (
            <div className="flex flex-col gap-1">
              {deaths.map((d, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-lg bg-gray-800/50 px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-100">{d.playerName}</p>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${CAUSE_COLORS[d.cause]}`}>
                        {CAUSE_LABELS[d.cause]}
                      </span>
                    </div>
                  </div>
                  <span className="shrink-0 text-xs text-gray-600">N{d.night}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
