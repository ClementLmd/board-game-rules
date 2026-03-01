import { useState, useCallback, useEffect } from 'react';
import type { Player, Role, RoleConfig } from './types';
import { getNightCallOrder, ROLES, type DeathLogEntry, type NightCallStep } from './types';

interface GamePhaseProps {
  players: Player[];
  roleConfig: RoleConfig;
  night: number;
  gamePhase: 'night' | 'day';
  deathLog: DeathLogEntry[];
  lovers: [string, string] | null;
  onAssignRole: (playerId: string, role: Role) => void;
  onClearRole: (playerId: string) => void;
  onAssignPlayersToRole: (roleId: string, playerIds: string[]) => void;
  onSetLovers: (pair: [string, string]) => void;
  onKill: (id: string) => void;
  onSetStepTarget: (key: string, playerIds: string[]) => void;
  stepTargets: Record<string, string[]>;
  onNightToDay: () => void;
  onDayToNight: () => void;
  onUndo: () => void;
  canUndo: boolean;
}

export function GamePhase({
  players,
  roleConfig,
  night,
  gamePhase,
  deathLog,
  lovers,
  onAssignRole,
  onClearRole,
  onAssignPlayersToRole,
  onSetLovers,
  onKill,
  onSetStepTarget,
  stepTargets,
  onNightToDay,
  onDayToNight,
  onUndo,
  canUndo,
}: GamePhaseProps) {
  const [assignRoleStepKey, setAssignRoleStepKey] = useState<string | null>(null);
  const [editPlayerRoleId, setEditPlayerRoleId] = useState<string | null>(null);
  const [checkedStepIndices, setCheckedStepIndices] = useState<Set<number>>(new Set());

  const alive = players.filter((p) => p.alive);
  const dead = players.filter((p) => !p.alive);
  const nightSteps = getNightCallOrder(players, night, lovers, roleConfig);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    setCheckedStepIndices(new Set());
  }, [night, gamePhase]);

  const toggleStepChecked = useCallback((index: number) => {
    setCheckedStepIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  const hasCupidonAssigned = alive.some((p) => p.role?.id === 'cupidon');
  const showCupidonButton = night === 1 && !lovers && hasCupidonAssigned;

  const handleLoversConfirm = useCallback(
    (pair: [string, string]) => {
      onSetLovers(pair);
    },
    [onSetLovers]
  );

  const nightDeaths = deathLog.filter((e) => e.phase === 'night' && e.number === night);
  const dayDeaths = deathLog.filter((e) => e.phase === 'day' && e.number === night);
  const playerById = new Map(players.map((p) => [p.id, p]));

  return (
    <section className="space-y-5">
      {/* Header: night or day */}
      <div className="sticky top-0 z-10 -mx-4 flex items-center justify-between gap-3 bg-warm-50/95 px-4 py-3 backdrop-blur dark:bg-gray-900/95 sm:static sm:mx-0 sm:rounded-xl sm:border sm:border-gray-200 sm:bg-white sm:dark:border-gray-700 sm:dark:bg-gray-800 sm:px-5 sm:py-4">
        <h2 className="text-xl font-bold text-gray-900 tabular-nums dark:text-gray-100">
          {gamePhase === 'night' ? `Nuit ${night}` : `Jour ${night}`}
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
            onClick={gamePhase === 'night' ? onNightToDay : onDayToNight}
            className="min-h-[44px] rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm active:bg-primary-700 dark:bg-red-600 dark:active:bg-red-700"
          >
            {gamePhase === 'night' ? 'Réveil du village' : 'Nuit suivante'}
          </button>
        </div>
      </div>

      {/* Day: show night deaths */}
      {gamePhase === 'day' && (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h3 className="border-b border-gray-100 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-600 dark:text-gray-400">
            {nightDeaths.length === 1 ? 'Mort' : 'Morts'} pendant la nuit {night}
          </h3>
          {nightDeaths.length > 0 ? (
            <ul className="divide-y divide-gray-100 dark:divide-gray-600">
              {nightDeaths.map((e) => (
                <li key={e.playerId} className="px-4 py-3">
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {playerById.get(e.playerId)?.name ?? '?'}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
              Personne n&apos;est mort pendant la nuit.
            </p>
          )}
        </div>
      )}

      {/* Night: call order */}
      {gamePhase === 'night' && (
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
                night={night}
                isChecked={checkedStepIndices.has(index)}
                onToggleChecked={() => toggleStepChecked(index)}
                onSetStepTarget={onSetStepTarget}
                stepTargets={stepTargets}
                isCupidonStep={step.key === 'cupidon'}
                showLoversButton={showCupidonButton}
                cupidonLoversProps={
                  showCupidonButton
                    ? { players: alive, onConfirm: handleLoversConfirm }
                    : undefined
                }
                onAssignPlayers={() => setAssignRoleStepKey(step.key)}
                alivePlayers={alive}
                players={players}
              />
            ))}
          </ol>
        )}
      </div>
      )}

      {/* Assign players to role modal */}
      {assignRoleStepKey && assignRoleStepKey !== 'amoureux' && (() => {
        const role = ROLES.find((r) => r.id === assignRoleStepKey);
        const step = nightSteps.find((s) => s.key === assignRoleStepKey);
        return role && step && (
        <RoleAssignModal
          roleId={assignRoleStepKey}
          role={role}
          expectedCount={step.expectedCount ?? 1}
          players={alive}
          onConfirm={(playerIds) => {
            onAssignPlayersToRole(assignRoleStepKey, playerIds);
            setAssignRoleStepKey(null);
          }}
          onCancel={() => setAssignRoleStepKey(null)}
        />
        );
      })()}

      {/* Edit player role modal */}
      {editPlayerRoleId && (() => {
        const player = alive.find((p) => p.id === editPlayerRoleId);
        return player && (
          <EditPlayerRoleModal
            player={player}
            roleConfig={roleConfig}
            allPlayers={players}
            onAssign={(role) => {
              onAssignRole(editPlayerRoleId, role);
              setEditPlayerRoleId(null);
            }}
            onClear={() => {
              onClearRole(editPlayerRoleId);
              setEditPlayerRoleId(null);
            }}
            onCancel={() => setEditPlayerRoleId(null)}
          />
        );
      })()}

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
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <span className="font-medium text-gray-900 dark:text-gray-100">{p.name}</span>
                {p.role && (
                  <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                    ({p.role.name})
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditPlayerRoleId(p.id)}
                  className="min-h-[44px] rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-600 active:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:active:bg-gray-600"
                  aria-label={`Modifier le rôle de ${p.name}`}
                >
                  {p.role ? 'Modifier' : 'Assigner'}
                </button>
                <button
                  type="button"
                  onClick={() => onKill(p.id)}
                  className="min-h-[44px] min-w-[44px] flex-shrink-0 rounded-xl bg-red-100 px-4 py-2.5 text-sm font-medium text-red-700 active:bg-red-200 dark:bg-red-900/50 dark:text-red-300 dark:active:bg-red-800"
                  aria-label={`Éliminer ${p.name}`}
                >
                  Éliminer
                </button>
              </div>
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

      {/* Recap of previous nights/days */}
      <NightRecap deathLog={deathLog} players={players} />
    </section>
  );
}

const ROLE_ACTION_LABELS: Record<string, string> = {
  voyante: 'Qui la voyante a-t-elle regardé ?',
  'loup-garou': 'Qui les loups ont-ils attaqué ?',
  sorciere: 'Qui la sorcière a-t-elle ciblé ? (guérison ou mort)',
  salvateur: 'Qui le salvateur protège-t-il ?',
  'loup-blanc': 'Quel loup le loup blanc a-t-il éliminé ?',
};

interface NightCallRowProps {
  step: NightCallStep;
  index: number;
  night: number;
  isChecked: boolean;
  onToggleChecked: () => void;
  onSetStepTarget: (key: string, playerIds: string[]) => void;
  stepTargets: Record<string, string[]>;
  isCupidonStep?: boolean;
  showLoversButton?: boolean;
  cupidonLoversProps?: {
    players: Player[];
    onConfirm: (pair: [string, string]) => void;
  };
  onAssignPlayers?: () => void;
  alivePlayers: Player[];
  players: Player[];
}

const STEP_TARGET_NONE = '__none__';
const STEP_TARGET_HEAL = '__heal__';

function getWitchPotionUsed(
  stepTargets: Record<string, string[]>,
  excludeNight?: number
): { heal: boolean; kill: boolean } {
  let heal = false;
  let kill = false;
  for (const [key, ids] of Object.entries(stepTargets)) {
    if (!key.endsWith('-sorciere')) continue;
    if (excludeNight != null && key.startsWith(`${excludeNight}-`)) continue;
    if (ids.includes(STEP_TARGET_HEAL)) heal = true;
    const killTarget = ids.find((id) => id !== STEP_TARGET_HEAL && id !== STEP_TARGET_NONE);
    if (killTarget) kill = true;
  }
  return { heal, kill };
}

interface WitchChoiceProps {
  wolfVictim: Player | null;
  alivePlayers: Player[];
  healUsed: boolean;
  killUsed: boolean;
  currentTargets: string[];
  onSetTarget: (ids: string[]) => void;
  onCancel: () => void;
}

function WitchChoice({
  wolfVictim,
  alivePlayers,
  healUsed,
  killUsed,
  currentTargets,
  onSetTarget,
  onCancel,
}: WitchChoiceProps) {
  const [localHeal, setLocalHeal] = useState(currentTargets.includes(STEP_TARGET_HEAL));
  const [localKill, setLocalKill] = useState<string | null>(
    currentTargets.find((id) => id !== STEP_TARGET_HEAL && id !== STEP_TARGET_NONE) ?? null
  );

  const canHeal = !healUsed && wolfVictim != null;
  const canKill = !killUsed;

  const handleValidate = useCallback(() => {
    const ids: string[] = [];
    if (canHeal && localHeal) ids.push(STEP_TARGET_HEAL);
    if (canKill && localKill) ids.push(localKill);
    onSetTarget(ids);
  }, [canHeal, canKill, localHeal, localKill, onSetTarget]);

  return (
    <div className="mb-6 space-y-4">
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Victime des loups : {wolfVictim ? wolfVictim.name : '—'}
      </p>
      <div className="space-y-3">
        <div>
          <button
            type="button"
            disabled={!canHeal}
            onClick={() => canHeal && setLocalHeal(!localHeal)}
            className={`min-h-[44px] w-full rounded-xl px-4 py-2.5 text-left text-sm font-medium ${
              canHeal
                ? localHeal
                  ? 'border-2 border-green-500 bg-green-100 text-green-800 dark:border-green-600 dark:bg-green-900/50 dark:text-green-200'
                  : 'border border-green-200 bg-green-50 text-green-800 active:bg-green-100 dark:border-green-800 dark:bg-green-900/30 dark:text-green-200 dark:active:bg-green-900/50'
                : 'cursor-not-allowed border border-gray-200 bg-gray-50 text-gray-400 dark:border-gray-600 dark:bg-gray-700/50 dark:text-gray-500'
            }`}
          >
            {healUsed ? 'Guérison déjà utilisée' : wolfVictim ? (localHeal ? '✓ Guérir la victime' : 'Guérir la victime') : 'Aucune victime à guérir'}
          </button>
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Potion de mort
          </label>
          <select
            value={localKill ?? ''}
            onChange={(e) => setLocalKill(e.target.value || null)}
            disabled={!canKill}
            className={`min-h-[44px] w-full rounded-xl border px-4 py-2.5 text-base ${
              canKill
                ? 'border-gray-200 bg-white text-gray-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:focus:border-red-500 dark:focus:ring-red-500/30'
                : 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400 dark:border-gray-600 dark:bg-gray-700/50 dark:text-gray-500'
            }`}
          >
            <option value="">{killUsed ? 'Déjà utilisée' : 'Ne tuer personne'}</option>
            {alivePlayers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => onSetTarget([])}
          className="min-h-[44px] rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 active:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:active:bg-gray-600"
        >
          Ne rien faire
        </button>
        <button
          type="button"
          onClick={handleValidate}
          className="min-h-[44px] rounded-xl bg-primary-100 px-4 py-2.5 text-sm font-medium text-primary-700 active:bg-primary-200 dark:bg-red-900/40 dark:text-red-300 dark:active:bg-red-900/60"
        >
          Valider
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="min-h-[44px] rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 active:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:active:bg-gray-600"
        >
          Fermer
        </button>
      </div>
    </div>
  );
}

function NightCallRow({
  step,
  index,
  night,
  isChecked,
  onToggleChecked,
  onSetStepTarget,
  stepTargets,
  isCupidonStep,
  showLoversButton,
  cupidonLoversProps,
  onAssignPlayers,
  alivePlayers,
  players,
}: NightCallRowProps) {
  const [showCard, setShowCard] = useState(false);
  const [showLoversFormInCard, setShowLoversFormInCard] = useState(false);

  useEffect(() => {
    if (!showCard) setShowLoversFormInCard(false);
  }, [showCard]);

  const num = index + 1;
  const stepKey = `${night}-${step.key}`;
  const targetIds = stepTargets[stepKey] ?? [];
  const targetNames = targetIds
    .filter((id) => id !== STEP_TARGET_NONE && id !== STEP_TARGET_HEAL)
    .map((id) => players.find((p) => p.id === id)?.name)
    .filter(Boolean) as string[];
  const witchPotionUsed = getWitchPotionUsed(stepTargets);
  const witchPotionUsedExcludingThisNight = getWitchPotionUsed(stepTargets, night);
  const wolfVictimIds = stepTargets[`${night}-loup-garou`] ?? [];
  const wolfVictimId = wolfVictimIds.find((id) => id !== STEP_TARGET_NONE);
  const wolfVictim = wolfVictimId ? (players.find((p) => p.id === wolfVictimId) ?? null) : null;
  const targetDisplay =
    step.key === 'sorciere'
      ? (() => {
          const healed = targetIds.includes(STEP_TARGET_HEAL);
          const killTarget = targetIds.find((id) => id !== STEP_TARGET_HEAL && id !== STEP_TARGET_NONE);
          const parts: string[] = [];
          if (healed) parts.push('Guérison');
          if (killTarget) parts.push(players.find((p) => p.id === killTarget)?.name ?? '?');
          return parts.length > 0 ? parts.join(' ; ') : targetIds.length > 0 ? 'Rien' : '';
        })()
      : targetIds.includes(STEP_TARGET_NONE)
        ? 'Aucun'
        : targetNames.join(', ');

  const actionLabel = ROLE_ACTION_LABELS[step.key];
  const targets =
    step.key === 'loup-blanc'
      ? alivePlayers.filter((p) => p.role?.id === 'loup-garou' || p.role?.id === 'loup-blanc')
      : alivePlayers;
  const hasTargets =
    actionLabel &&
    step.key !== 'sorciere' &&
    (targets.length > 0 || step.key === 'loup-blanc');
  const isWitchStep = step.key === 'sorciere';

  return (
    <>
      <li
        role="button"
        tabIndex={0}
        onClick={() => setShowCard(true)}
        onKeyDown={(e) => e.key === 'Enter' && setShowCard(true)}
        className="relative flex cursor-pointer flex-wrap items-center gap-3 px-4 py-4 sm:flex-nowrap active:bg-gray-50 dark:active:bg-gray-700/50"
        aria-label={`Voir les détails de « ${step.label} »`}
      >
        <span
          className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold ${
            isChecked
              ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
              : 'bg-primary-100 text-primary-700 dark:bg-red-900/50 dark:text-red-300'
          }`}
          aria-hidden
        >
          {num}
        </span>

        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-900 dark:text-gray-100">{step.label}</p>
          {step.playerNames.length > 0 ? (
            <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">
              {step.playerNames.join(', ')}
            </p>
          ) : step.expectedCount != null && step.expectedCount > 0 && (
            <p className="mt-0.5 text-sm text-amber-600 dark:text-amber-400">
              À assigner ({step.assignedCount ?? 0}/{step.expectedCount})
            </p>
          )}
        </div>

        <div className="flex flex-shrink-0 items-center gap-2">
          {targetDisplay && (
            <span className="text-right text-sm font-medium text-gray-600 dark:text-gray-400">
              → {targetDisplay}
            </span>
          )}
          {onAssignPlayers &&
            step.expectedCount != null &&
            (step.totalAssignedCount ?? 0) < step.expectedCount && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onAssignPlayers();
                }}
                className="min-h-[44px] flex-shrink-0 rounded-xl bg-primary-100 px-4 py-2.5 text-sm font-medium text-primary-700 active:bg-primary-200 dark:bg-red-900/40 dark:text-red-300 dark:active:bg-red-900/60"
              >
                Assigner
              </button>
            )}
        </div>
      </li>

      {showCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50"
            aria-hidden
            onClick={() => setShowCard(false)}
          />
          <div
            className="relative z-10 w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 shadow-xl dark:border-gray-600 dark:bg-gray-800"
            role="dialog"
            aria-labelledby="call-card-title"
            onClick={(e) => e.stopPropagation()}
          >
            {showLoversFormInCard && isCupidonStep && cupidonLoversProps ? (
              <CupidonChoice
                players={cupidonLoversProps.players}
                onConfirm={(pair) => {
                  cupidonLoversProps.onConfirm(pair);
                  setShowCard(false);
                }}
                onCancel={() => setShowLoversFormInCard(false)}
              />
            ) : (
              <>
                <h3 id="call-card-title" className="mb-3 text-lg font-bold text-gray-900 dark:text-gray-100">
                  {step.label}
                </h3>
                {step.playerNames.length > 0 && (
                  <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
                    {step.playerNames.join(', ')}
                  </p>
                )}
                <div className="mb-4 rounded-xl bg-gray-50 p-4 dark:bg-gray-700/50">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Actions à effectuer
                  </p>
                  <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                    {step.action}
                  </p>
                </div>
                {isWitchStep && (
                  <WitchChoice
                    wolfVictim={wolfVictim}
                    alivePlayers={alivePlayers}
                    healUsed={witchPotionUsedExcludingThisNight.heal}
                    killUsed={witchPotionUsedExcludingThisNight.kill}
                    currentTargets={targetIds}
                    onSetTarget={(ids) => {
                      onSetStepTarget(stepKey, ids);
                      onToggleChecked();
                      setShowCard(false);
                    }}
                    onCancel={() => setShowCard(false)}
                  />
                )}
                {hasTargets && (
                  <div className="mb-6">
                    <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      {actionLabel}
                    </p>
                    <ul className="flex flex-wrap gap-2">
                      {step.key === 'loup-blanc' && (
                        <li>
                          <button
                            type="button"
                            onClick={() => {
                              onSetStepTarget(stepKey, [STEP_TARGET_NONE]);
                              onToggleChecked();
                              setShowCard(false);
                            }}
                            className="min-h-[40px] rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                          >
                            Aucun
                          </button>
                        </li>
                      )}
                      {targets.map((p) => (
                        <li key={p.id}>
                          <button
                            type="button"
                            onClick={() => {
                              onSetStepTarget(stepKey, [p.id]);
                              onToggleChecked();
                              setShowCard(false);
                            }}
                            className="min-h-[40px] rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                          >
                            {p.name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {!hasTargets && !isWitchStep && (step.key === 'amoureux' || step.key === 'cupidon') && (
                  <div className="mb-6">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {step.key === 'amoureux'
                        ? 'Les amoureux se réveillent et se reconnaissent.'
                        : 'Cupidon désigne les deux amoureux.'}
                    </p>
                  </div>
                )}
                {!isWitchStep && (
                <div className="flex flex-wrap gap-3">
                  {isCupidonStep && showLoversButton && cupidonLoversProps && (
                    <button
                      type="button"
                      onClick={() => setShowLoversFormInCard(true)}
                      className="min-h-[44px] rounded-xl bg-primary-100 px-4 py-2.5 text-sm font-medium text-primary-700 active:bg-primary-200 dark:bg-red-900/40 dark:text-red-300 dark:active:bg-red-900/60"
                    >
                      Désigner les amoureux
                    </button>
                  )}
                  {onAssignPlayers &&
                    step.expectedCount != null &&
                    (step.totalAssignedCount ?? 0) < step.expectedCount && (
                      <button
                        type="button"
                        onClick={() => {
                          onAssignPlayers();
                          setShowCard(false);
                        }}
                        className="min-h-[44px] rounded-xl bg-primary-100 px-4 py-2.5 text-sm font-medium text-primary-700 active:bg-primary-200 dark:bg-red-900/40 dark:text-red-300 dark:active:bg-red-900/60"
                      >
                        Assigner
                      </button>
                    )}
                  <button
                    type="button"
                    onClick={() => setShowCard(false)}
                    className="min-h-[44px] rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 active:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:active:bg-gray-600"
                  >
                    Fermer
                  </button>
                </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

interface RoleAssignModalProps {
  roleId: string;
  role: Role;
  expectedCount: number;
  players: Player[];
  onConfirm: (playerIds: string[]) => void;
  onCancel: () => void;
}

function RoleAssignModal({
  roleId,
  role,
  expectedCount,
  players,
  onConfirm,
  onCancel,
}: RoleAssignModalProps) {
  const availablePlayers = players.filter((p) => !p.role);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = useCallback(
    (id: string) => {
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else if (expectedCount === 1) {
          return new Set([id]);
        } else if (prev.size < expectedCount) {
          next.add(id);
        }
        return next;
      });
    },
    [expectedCount]
  );

  const handleConfirm = useCallback(() => {
    if (selected.size === expectedCount) {
      onConfirm([...selected]);
    }
  }, [selected, expectedCount, onConfirm]);

  const canConfirm = selected.size === expectedCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/50"
        aria-hidden
        onClick={onCancel}
      />
      <div className="relative z-10 max-h-[90vh] w-full max-w-md overflow-auto rounded-2xl border border-gray-200 bg-white p-4 shadow-xl dark:border-gray-600 dark:bg-gray-800 sm:p-6">
        <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
          Assigner — {role.name}
        </h3>
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
          Sélectionnez exactement {expectedCount} joueur{expectedCount > 1 ? 's' : ''} sans rôle.
        </p>
        {availablePlayers.length === 0 && (
          <p className="mb-4 text-sm text-amber-600 dark:text-amber-400">
            Aucun joueur disponible (tous ont déjà un rôle).
          </p>
        )}
        <ul className="mb-6 max-h-60 space-y-2 overflow-auto">
          {availablePlayers.map((p) => (
            <li key={p.id}>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 dark:border-gray-600">
                <input
                  type="checkbox"
                  checked={selected.has(p.id)}
                  onChange={() => toggle(p.id)}
                  className="h-5 w-5 rounded border-gray-300 text-primary-600 dark:border-gray-500 dark:bg-gray-700 dark:text-red-500"
                />
                <span className="font-medium text-gray-900 dark:text-gray-100">{p.name}</span>
              </label>
            </li>
          ))}
        </ul>
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
          Sélectionnés : {selected.size} / {expectedCount}
        </p>
        <div className="flex gap-3">
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
            Valider
          </button>
        </div>
      </div>
    </div>
  );
}

interface EditPlayerRoleModalProps {
  player: Player;
  roleConfig: RoleConfig;
  allPlayers: Player[];
  onAssign: (role: Role) => void;
  onClear: () => void;
  onCancel: () => void;
}

function EditPlayerRoleModal({
  player,
  roleConfig,
  allPlayers,
  onAssign,
  onClear,
  onCancel,
}: EditPlayerRoleModalProps) {
  const assignedByRoleId = new Map<string, number>();
  for (const p of allPlayers) {
    if (p.role) assignedByRoleId.set(p.role.id, (assignedByRoleId.get(p.role.id) ?? 0) + 1);
  }
  const rolesInGame = ROLES.filter((r) => {
    const expected = roleConfig[r.id] ?? 0;
    if (expected <= 0) return false;
    const assigned = assignedByRoleId.get(r.id) ?? 0;
    const playerHasRole = player.role?.id === r.id;
    const available = expected - assigned + (playerHasRole ? 1 : 0);
    return available > 0;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/50"
        aria-hidden
        onClick={onCancel}
      />
      <div className="relative z-10 max-h-[90vh] w-full max-w-md overflow-auto rounded-2xl border border-gray-200 bg-white p-4 shadow-xl dark:border-gray-600 dark:bg-gray-800 sm:p-6">
        <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
          Rôle — {player.name}
        </h3>
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
          Sélectionnez un rôle pour ce joueur.
        </p>
        <div className="mb-6 flex flex-wrap gap-2">
          {rolesInGame.map((role) => (
            <button
              key={role.id}
              type="button"
              onClick={() => onAssign(role)}
              className="min-h-[44px] rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium active:bg-primary-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:active:bg-gray-600"
            >
              {role.name}
            </button>
          ))}
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClear}
            className="min-h-[48px] flex-1 rounded-xl border border-amber-200 bg-amber-50 py-3 text-base font-medium text-amber-800 active:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200 dark:active:bg-amber-900/50"
          >
            Retirer le rôle
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="min-h-[48px] flex-1 rounded-xl border border-gray-200 bg-white py-3 text-base font-medium text-gray-700 active:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:active:bg-gray-600"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}

interface NightRecapProps {
  deathLog: DeathLogEntry[];
  players: Player[];
}

function NightRecap({ deathLog, players }: NightRecapProps) {
  const playerById = new Map(players.map((p) => [p.id, p]));
  const byPhaseAndNum = new Map<string, string[]>();
  for (const e of deathLog) {
    const key = `${e.phase}-${e.number}`;
    if (!byPhaseAndNum.has(key)) byPhaseAndNum.set(key, []);
    byPhaseAndNum.get(key)!.push(playerById.get(e.playerId)?.name ?? '?');
  }
  const entries: { phase: 'night' | 'day'; number: number }[] = [];
  const seen = new Set<string>();
  for (const e of deathLog) {
    const key = `${e.phase}-${e.number}`;
    if (!seen.has(key)) {
      seen.add(key);
      entries.push({ phase: e.phase, number: e.number });
    }
  }
  entries.sort((a, b) => {
    if (a.number !== b.number) return a.number - b.number;
    return a.phase === 'night' ? -1 : 1;
  });
  const parts = entries.map(({ phase, number }) => {
    const names = byPhaseAndNum.get(`${phase}-${number}`) ?? [];
    const label = phase === 'night' ? `nuit ${number}` : `jour ${number}`;
    const namesStr = names.length > 1 ? names.slice(0, -1).join(', ') + ' et ' + names.at(-1) : names[0] ?? '';
    return `${label} : ${namesStr} ${names.length === 1 ? 'est mort' : 'sont morts'}`;
  });
  if (parts.length === 0) return null;
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-600 dark:bg-gray-800">
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        Récapitulatif
      </h3>
      <p className="text-sm text-gray-700 dark:text-gray-300">
        {parts.join(' ; ')}
      </p>
    </div>
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
