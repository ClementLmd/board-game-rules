import { useState, useCallback, useEffect } from 'react';
import type { Player } from './types';
import { getNightCallOrder, type NightCallStep } from './types';

interface GamePhaseProps {
  players: Player[];
  night: number;
  lovers: [string, string] | null;
  onSetLovers: (pair: [string, string]) => void;
  onKill: (id: string) => void;
  onNextNight: () => void;
  onUndo: () => void;
  canUndo: boolean;
}

export function GamePhase({
  players,
  night,
  lovers,
  onSetLovers,
  onKill,
  onNextNight,
  onUndo,
  canUndo,
}: GamePhaseProps) {
  const [showLoversForm, setShowLoversForm] = useState(false);
  const [checkedStepIndices, setCheckedStepIndices] = useState<Set<number>>(new Set());

  const alive = players.filter((p) => p.alive);
  const dead = players.filter((p) => !p.alive);
  const nightSteps = getNightCallOrder(players, night, lovers);

  useEffect(() => {
    setCheckedStepIndices(new Set());
  }, [night]);

  const toggleStepChecked = useCallback((index: number) => {
    setCheckedStepIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  const hasCupidonAlive = alive.some((p) => p.role?.id === 'cupidon');
  const showCupidonButton = night === 1 && !lovers && hasCupidonAlive;

  const handleLoversConfirm = useCallback(
    (pair: [string, string]) => {
      onSetLovers(pair);
      setShowLoversForm(false);
    },
    [onSetLovers]
  );

  const handleLoversCancel = useCallback(() => {
    setShowLoversForm(false);
  }, []);

  return (
    <section className="space-y-5">
      {/* Night header: sticky on mobile for context */}
      <div className="sticky top-0 z-10 -mx-4 flex items-center justify-between gap-3 bg-warm-50/95 px-4 py-3 backdrop-blur dark:bg-gray-900/95 sm:static sm:mx-0 sm:rounded-xl sm:border sm:border-gray-200 sm:bg-white sm:dark:border-gray-700 sm:dark:bg-gray-800 sm:px-5 sm:py-4">
        <h2 className="text-xl font-bold text-gray-900 tabular-nums dark:text-gray-100">
          Nuit {night}
        </h2>
        <div className="flex items-center gap-2">
          {canUndo && (
            <button
              type="button"
              onClick={onUndo}
              className="min-h-[44px] min-w-[44px] rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm active:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:active:bg-gray-600"
              aria-label="Annuler la dernière action"
            >
              Annuler
            </button>
          )}
          <button
            type="button"
            onClick={onNextNight}
            className="min-h-[44px] rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm active:bg-primary-700 dark:bg-red-600 dark:active:bg-red-700"
          >
            Nuit suivante
          </button>
        </div>
      </div>

      {/* Night call order: main feature, mobile-first list */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <h3 className="border-b border-gray-100 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-600 dark:text-gray-400">
          Ordre des appels
        </h3>
        {nightSteps.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
            Aucun rôle à appeler cette nuit.
          </p>
        ) : (
          <ol className="divide-y divide-gray-100 dark:divide-gray-600">
            {nightSteps.map((step, index) => (
              <NightCallRow
                key={`${step.key}-${index}`}
                step={step}
                index={index}
                isChecked={checkedStepIndices.has(index)}
                onToggleChecked={() => toggleStepChecked(index)}
                isCupidonStep={step.key === 'cupidon'}
                showLoversButton={showCupidonButton}
                onOpenLoversForm={() => setShowLoversForm(true)}
              />
            ))}
          </ol>
        )}
      </div>

      {/* Cupidon: set lovers form (opened via button next to Cupidon in night order) */}
      {showLoversForm && (
        <CupidonChoice
          players={alive}
          onConfirm={handleLoversConfirm}
          onCancel={handleLoversCancel}
        />
      )}

      {/* Count */}
      <p className="text-center text-sm text-gray-600 dark:text-gray-400">
        En vie : <strong className="dark:text-gray-200">{alive.length}</strong> — Éliminés : <strong className="dark:text-gray-200">{dead.length}</strong>
      </p>

      {/* Amoureux reminder */}
      {lovers && lovers.length === 2 && (
        <div className="rounded-xl border border-primary-200 bg-primary-50/50 px-4 py-3 dark:border-red-800 dark:bg-red-950/40">
          <p className="text-sm font-medium text-primary-800 dark:text-red-300">
            Amoureux : {lovers.map((id) => players.find((p) => p.id === id)?.name ?? '?').join(' & ')}
          </p>
          <p className="mt-0.5 text-xs text-primary-600 dark:text-red-400/80">
            Si l&apos;un est éliminé, l&apos;autre meurt aussi.
          </p>
        </div>
      )}

      {/* Alive: eliminate */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <h3 className="border-b border-gray-100 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-600 dark:text-gray-400">
          En vie
        </h3>
        <ul className="divide-y divide-gray-100 dark:divide-gray-600">
          {alive.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between gap-3 px-4 py-3"
            >
              <span className="font-medium text-gray-900 dark:text-gray-100">{p.name}</span>
              <button
                type="button"
                onClick={() => onKill(p.id)}
                className="min-h-[44px] min-w-[44px] flex-shrink-0 rounded-xl bg-red-100 px-4 py-2.5 text-sm font-medium text-red-700 active:bg-red-200 dark:bg-red-900/50 dark:text-red-300 dark:active:bg-red-800"
                aria-label={`Éliminer ${p.name}`}
              >
                Éliminer
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Dead list */}
      {dead.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h3 className="border-b border-gray-100 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-600 dark:text-gray-400">
            Éliminés
          </h3>
          <ul className="divide-y divide-gray-100 dark:divide-gray-600">
            {dead.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-3 px-4 py-3 opacity-80"
              >
                <span className="font-medium text-gray-600 line-through dark:text-gray-500">
                  {p.name}
                </span>
                {p.role && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">{p.role.name}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

interface NightCallRowProps {
  step: NightCallStep;
  index: number;
  isChecked: boolean;
  onToggleChecked: () => void;
  isCupidonStep?: boolean;
  showLoversButton?: boolean;
  onOpenLoversForm?: () => void;
}

function NightCallRow({
  step,
  index,
  isChecked,
  onToggleChecked,
  isCupidonStep,
  showLoversButton,
  onOpenLoversForm,
}: NightCallRowProps) {
  const [showInfo, setShowInfo] = useState(false);
  const num = index + 1;

  return (
    <li className="relative flex flex-wrap items-center gap-3 px-4 py-4 sm:flex-nowrap">
      <span
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700 dark:bg-red-900/50 dark:text-red-300"
        aria-hidden
      >
        {num}
      </span>

      <label className="flex min-h-[44px] flex-shrink-0 cursor-pointer items-center">
        <input
          type="checkbox"
          checked={isChecked}
          onChange={onToggleChecked}
          className="h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-500 dark:bg-gray-700 dark:text-red-500 dark:focus:ring-red-500"
          aria-label={`Marquer « ${step.label} » comme fait`}
        />
      </label>

      <div className="min-w-0 flex-1">
        <p className="font-semibold text-gray-900 dark:text-gray-100">{step.label}</p>
        {step.playerNames.length > 0 && (
          <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">
            {step.playerNames.join(', ')}
          </p>
        )}
      </div>

      <div className="flex flex-shrink-0 items-center gap-2">
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowInfo((v) => !v)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-600 active:bg-gray-200 dark:bg-gray-600 dark:text-gray-300 dark:active:bg-gray-500"
            aria-label="Voir les actions de ce rôle"
            aria-expanded={showInfo}
          >
            <span className="text-sm font-bold">i</span>
          </button>
          {showInfo && (
            <>
              <div
                className="fixed inset-0 z-20"
                aria-hidden
                onClick={() => setShowInfo(false)}
              />
              <div
                className="absolute right-0 top-full z-30 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-gray-200 bg-white p-4 shadow-lg dark:border-gray-600 dark:bg-gray-800"
                role="tooltip"
              >
                <p className="text-sm text-gray-700 dark:text-gray-300">{step.action}</p>
                <button
                  type="button"
                  onClick={() => setShowInfo(false)}
                  className="mt-3 text-sm font-medium text-primary-600 dark:text-red-400"
                >
                  Fermer
                </button>
              </div>
            </>
          )}
        </div>

        {isCupidonStep && showLoversButton && onOpenLoversForm && (
          <button
            type="button"
            onClick={onOpenLoversForm}
            className="min-h-[44px] flex-shrink-0 rounded-xl bg-primary-100 px-4 py-2.5 text-sm font-medium text-primary-700 active:bg-primary-200 dark:bg-red-900/40 dark:text-red-300 dark:active:bg-red-900/60"
          >
            Désigner les amoureux
          </button>
        )}
      </div>
    </li>
  );
}

interface CupidonChoiceProps {
  players: Player[];
  onConfirm: (pair: [string, string]) => void;
  onCancel: () => void;
}

function CupidonChoice({ players, onConfirm, onCancel }: CupidonChoiceProps) {
  const [lover1, setLover1] = useState<string | null>(null);
  const [lover2, setLover2] = useState<string | null>(null);

  const handleConfirm = useCallback(() => {
    if (lover1 && lover2 && lover1 !== lover2) {
      onConfirm([lover1, lover2]);
    }
  }, [lover1, lover2, onConfirm]);

  const canConfirm = lover1 != null && lover2 != null && lover1 !== lover2;

  return (
    <div className="rounded-2xl border border-primary-200 bg-primary-50/30 p-4 shadow-sm dark:border-red-800 dark:bg-red-950/40 sm:p-6">
      <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
        Cupidon — Désigner les amoureux
      </h3>
      <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
        Choisissez les deux joueurs qui seront liés. Si l&apos;un meurt, l&apos;autre meurt aussi.
      </p>

      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Premier amoureux
          </label>
          <select
            value={lover1 ?? ''}
            onChange={(e) => setLover1(e.target.value || null)}
            className="min-h-[44px] w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-base text-gray-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:focus:border-red-500 dark:focus:ring-red-500/30"
            aria-label="Premier amoureux"
          >
            <option value="">Choisir…</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Deuxième amoureux
          </label>
          <select
            value={lover2 ?? ''}
            onChange={(e) => setLover2(e.target.value || null)}
            className="min-h-[44px] w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-base text-gray-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:focus:border-red-500 dark:focus:ring-red-500/30"
            aria-label="Deuxième amoureux"
          >
            <option value="">Choisir…</option>
            {players.map((p) => (
              <option key={p.id} value={p.id} disabled={p.id === lover1}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-[48px] flex-1 rounded-xl border border-gray-200 bg-white py-3 text-base font-medium text-gray-700 active:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:active:bg-gray-600"
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!canConfirm}
          className="min-h-[48px] flex-1 rounded-xl bg-primary-600 py-3 text-base font-medium text-white active:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-red-600 dark:active:bg-red-700"
        >
          Valider les amoureux
        </button>
      </div>
    </div>
  );
}
