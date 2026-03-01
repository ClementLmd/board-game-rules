import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Users, Skull, Undo2, RefreshCw } from 'lucide-react';
import {
  getNightCharactersForConfig,
  computeNightDeaths,
  type Character,
  type Player,
  type RoleConfigV2,
} from './game-data';
import { GameSetupV2 } from './GameSetupV2';
import { RoleConfigV2 as RoleConfigScreen } from './RoleConfigV2';
import { CharacterCardV2 } from './CharacterCardV2';
import { PlayerRecapV2 } from './PlayerRecapV2';
import { VillageWakeV2 } from './VillageWakeV2';
import { DayPhaseV2 } from './DayPhaseV2';
import { DayResultV2 } from './DayResultV2';
import { WinScreenV2 } from './WinScreenV2';
import { DeathHistoryPanel, type DeathEntry } from './DeathHistoryPanel';

type Phase = 'setup' | 'roleConfig' | 'night' | 'wake' | 'day' | 'dayResult' | 'win';
type Winner = 'wolves' | 'village' | 'loup-blanc';

const STORAGE_KEY = 'loup-garou-v2';

interface V2SavedState {
  phase: Phase;
  players: Player[];
  roleConfig: RoleConfigV2;
  night: number;
  currentStep: number;
  stepSelections: Record<string, string[]>;
  roleAssignments: Record<string, number[]>;
  lovers: [number, number] | null;
  witchHealUsed: boolean;
  witchKillUsed: boolean;
  renardPowerLost: boolean;
  winner: Winner | null;
  deathLog: DeathEntry[];
}

function loadSaved(): Partial<V2SavedState> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Partial<V2SavedState>;
  } catch { /* ignore */ }
  return {};
}

function clearSaved() {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}

interface GameMasterV2Props {
  onNewGame: () => void;
}

/** Returns true if the role should still appear in the night sequence. */
function isRoleActive(
  char: Character,
  roleAssignments: Record<string, number[]>,
  players: Player[],
  renardPowerLost: boolean,
  roleConfig: RoleConfigV2
): boolean {
  if (char.id === 'renard' && renardPowerLost) return false;
  const roleKey = char.configKey ?? char.id;
  const assigned = roleAssignments[roleKey] ?? [];
  // Loup-blanc-solo: show when white wolf is assigned and alive, OR when pool is not yet split (night 2 assign)
  if (char.id === 'loup-blanc-solo' && roleKey === 'loup-blanc') {
    const pool = roleAssignments['loup-garou'] ?? [];
    const wolfCount = roleConfig['loup-garou'] ?? 0;
    const needAssign = (roleConfig['loup-blanc'] ?? 0) > 0 && assigned.length === 0 && pool.length > wolfCount;
    if (needAssign) return pool.some((id) => players.find((p) => p.id === id)?.isAlive);
    if (assigned.length === 0) return false;
  }
  if (assigned.length === 0) return true; // not yet assigned — keep it so GM can assign
  return assigned.some((id) => players.find((p) => p.id === id)?.isAlive);
}

/**
 * Returns the winner if a win condition is met, or null to continue.
 * Village wins when no wolves are alive; wolves win when no non-wolves are alive.
 * Loup-Blanc wins when he is the only survivor.
 */
function checkWin(
  players: Player[],
  roleAssignments: Record<string, number[]>
): Winner | null {
  const wolfIds = new Set(roleAssignments['loup-garou'] ?? []);
  const whiteWolfIds = new Set(roleAssignments['loup-blanc'] ?? []);
  const alive = players.filter((p) => p.isAlive);
  const aliveWolves = alive.filter((p) => wolfIds.has(p.id));
  const aliveVillagers = alive.filter((p) => !wolfIds.has(p.id));
  // Loup-Blanc solo win: only the white wolf is alive
  if (alive.length === 1 && whiteWolfIds.has(alive[0].id)) return 'loup-blanc';
  if (aliveWolves.length === 0) return 'village';
  if (aliveVillagers.length === 0) return 'wolves';
  return null;
}

export function GameMasterV2({ onNewGame }: GameMasterV2Props) {
  const [saved] = useState(loadSaved);

  const [phase, setPhase] = useState<Phase>(saved.phase ?? 'setup');
  const [players, setPlayers] = useState<Player[]>(saved.players ?? []);
  const [roleConfig, setRoleConfig] = useState<RoleConfigV2>(saved.roleConfig ?? {});
  const [night, setNight] = useState(saved.night ?? 1);
  const [currentStep, setCurrentStep] = useState(saved.currentStep ?? 0);
  const [stepSelections, setStepSelections] = useState<Record<string, string[]>>(saved.stepSelections ?? {});
  const [roleAssignments, setRoleAssignments] = useState<Record<string, number[]>>(saved.roleAssignments ?? {});
  const [lovers, setLovers] = useState<[number, number] | null>(saved.lovers ?? null);
  const [witchHealUsed, setWitchHealUsed] = useState(saved.witchHealUsed ?? false);
  const [witchKillUsed, setWitchKillUsed] = useState(saved.witchKillUsed ?? false);
  const [renardPowerLost, setRenardPowerLost] = useState(saved.renardPowerLost ?? false);
  const [winner, setWinner] = useState<Winner | null>(saved.winner ?? null);
  const [deathLog, setDeathLog] = useState<DeathEntry[]>(saved.deathLog ?? []);
  const [recapOpen, setRecapOpen] = useState(false);
  const [deathHistoryOpen, setDeathHistoryOpen] = useState(false);
  /** Deaths from the last day vote — shown on dayResult screen */
  const [dayResultDeaths, setDayResultDeaths] = useState<DeathEntry[]>([]);

  // ── Undo stack ─────────────────────────────────────────────────────────────
  const undoStack = useRef<V2SavedState[]>([]);
  const [undoCount, setUndoCount] = useState(0);

  const pushUndo = useCallback(() => {
    undoStack.current.push({
      phase, players, roleConfig, night, currentStep,
      stepSelections, roleAssignments, lovers,
      witchHealUsed, witchKillUsed, renardPowerLost, winner, deathLog,
    });
    if (undoStack.current.length > 20) undoStack.current.shift();
    setUndoCount(undoStack.current.length);
  }, [phase, players, roleConfig, night, currentStep, stepSelections, roleAssignments, lovers, witchHealUsed, witchKillUsed, renardPowerLost, winner, deathLog]);

  const handleUndo = useCallback(() => {
    const prev = undoStack.current.pop();
    if (!prev) return;
    setPhase(prev.phase);
    setPlayers(prev.players);
    setRoleConfig(prev.roleConfig);
    setNight(prev.night);
    setCurrentStep(prev.currentStep);
    setStepSelections(prev.stepSelections);
    setRoleAssignments(prev.roleAssignments);
    setLovers(prev.lovers);
    setWitchHealUsed(prev.witchHealUsed);
    setWitchKillUsed(prev.witchKillUsed);
    setRenardPowerLost(prev.renardPowerLost);
    setWinner(prev.winner);
    setDeathLog(prev.deathLog);
    setUndoCount(undoStack.current.length);
  }, []);

  const handleNewGame = useCallback(() => {
    clearSaved();
    undoStack.current = [];
    setUndoCount(0);
    onNewGame();
  }, [onNewGame]);

  // Persist to localStorage whenever relevant state changes
  useEffect(() => {
    const state: V2SavedState = {
      phase, players, roleConfig, night, currentStep,
      stepSelections, roleAssignments, lovers,
      witchHealUsed, witchKillUsed, renardPowerLost, winner, deathLog,
    };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* ignore */ }
  }, [phase, players, roleConfig, night, currentStep, stepSelections, roleAssignments, lovers, witchHealUsed, witchKillUsed, renardPowerLost, winner, deathLog]);

  const alivePlayers = useMemo(() => players.filter((p) => p.isAlive), [players]);

  // Night characters: filtered by roleConfig, night1Only, and alive status
  const nightCharacters = useMemo(
    () =>
      getNightCharactersForConfig(roleConfig, night).filter((c) =>
        isRoleActive(c, roleAssignments, players, renardPowerLost, roleConfig)
      ),
    [roleConfig, night, roleAssignments, players, renardPowerLost]
  );

  const currentChar = nightCharacters[currentStep];
  const currentSelection = stepSelections[currentChar?.id ?? ''] ?? [];
  const currentRoleKey = currentChar?.configKey ?? currentChar?.id ?? '';
  const currentAssigned = roleAssignments[currentRoleKey] ?? [];
  // Loups-Garous: when loup-blanc is in config, assign one pool (wolves + blanc) in a single block
  const currentRequiredCount =
    currentChar?.id === 'loup-garou'
      ? (roleConfig['loup-garou'] ?? 0) + (roleConfig['loup-blanc'] ?? 0)
      : currentChar?.configKey
        ? 0
        : (roleConfig[currentChar?.id ?? ''] ?? 1);

  // Players already assigned to a different role — cannot be re-assigned
  const takenPlayerIds = useMemo(() => {
    const taken = new Set<number>();
    for (const [roleId, ids] of Object.entries(roleAssignments)) {
      if (roleId !== currentChar?.id) {
        for (const id of ids) taken.add(id);
      }
    }
    return taken;
  }, [roleAssignments, currentChar]);

  // Loup-blanc-solo: "assign who is white wolf" mode (night 2) before kill action
  const loupBlancSoloAssignMode = useMemo(() => {
    if (currentChar?.id !== 'loup-blanc-solo') return false;
    const pool = roleAssignments['loup-garou'] ?? [];
    const wolfCount = roleConfig['loup-garou'] ?? 0;
    return (roleConfig['loup-blanc'] ?? 0) > 0 && (roleAssignments['loup-blanc'] ?? []).length === 0 && pool.length > wolfCount;
  }, [currentChar?.id, roleConfig, roleAssignments]);

  // Exclude role-players from their own target list (wolves can't kill themselves,
  // voyante can't look at herself, etc.) — except Cupidon who can bind himself.
  // Loup-blanc-solo can only target alive wolves (excluding himself).
  const targetPlayers = useMemo(() => {
    if (!currentChar || currentChar.id === 'cupidon') return alivePlayers;
    const roleKey = currentChar.configKey ?? currentChar.id;
    const selfIds = new Set(roleAssignments[roleKey] ?? []);
    if (currentChar.id === 'loup-blanc-solo') {
      const pool = roleAssignments['loup-garou'] ?? [];
      const whiteWolfIds = new Set(roleAssignments['loup-blanc'] ?? []);
      const wolfCount = roleConfig['loup-garou'] ?? 0;
      const assignMode = whiteWolfIds.size === 0 && pool.length > wolfCount;
      if (assignMode) return alivePlayers.filter((p) => pool.includes(p.id));
      return alivePlayers.filter((p) => pool.includes(p.id) && !whiteWolfIds.has(p.id));
    }
    if (selfIds.size === 0) return alivePlayers;
    return alivePlayers.filter((p) => !selfIds.has(p.id));
  }, [currentChar, alivePlayers, roleAssignments, roleConfig]);

  // ── Setup ────────────────────────────────────────────────────────────────
  const handleSetupDone = useCallback((newPlayers: Player[]) => {
    setPlayers(newPlayers);
    setPhase('roleConfig');
  }, []);

  const handleRoleConfigDone = useCallback((config: RoleConfigV2) => {
    setRoleConfig(config);
    setStepSelections({});
    setCurrentStep(0);
    setNight(1);
    setPhase('night');
  }, []);

  // ── Role assignment ───────────────────────────────────────────────────────
  const handleToggleAssign = useCallback(
    (playerId: number) => {
      if (!currentChar || currentChar.configKey) return; // sub-step roles don't assign
      const roleId = currentChar.id;
      const required =
        roleId === 'loup-garou'
          ? (roleConfig['loup-garou'] ?? 0) + (roleConfig['loup-blanc'] ?? 0)
          : (roleConfig[roleId] ?? 1);
      setRoleAssignments((prev) => {
        const current = prev[roleId] ?? [];
        if (current.includes(playerId)) {
          return { ...prev, [roleId]: current.filter((id) => id !== playerId) };
        }
        if (current.length >= required) {
          return required === 1 ? { ...prev, [roleId]: [playerId] } : prev;
        }
        return { ...prev, [roleId]: [...current, playerId] };
      });
    },
    [currentChar, roleConfig]
  );

  // ── Target selection ──────────────────────────────────────────────────────
  const handleSelectionChange = useCallback(
    (ids: string[]) => {
      if (!currentChar) return;
      setStepSelections((prev) => ({ ...prev, [currentChar.id]: ids }));
    },
    [currentChar]
  );

  // ── Night navigation ──────────────────────────────────────────────────────
  const commitWitchPotions = useCallback(() => {
    const sel = stepSelections['sorciere'] ?? [];
    if (sel.includes('__heal__')) setWitchHealUsed(true);
    if (sel.some((id) => id !== '__heal__')) setWitchKillUsed(true);
  }, [stepSelections]);

  const handleNext = useCallback(() => {
    pushUndo();
    if (currentChar?.id === 'sorciere') commitWitchPotions();
    // Fox: if he picked 3 players and none is a wolf, he loses his power
    if (currentChar?.id === 'renard') {
      const sel = stepSelections['renard'] ?? [];
      if (sel.length === 3) {
        const wolfIds = new Set(roleAssignments['loup-garou'] ?? []);
        const hasWolf = sel.some((id) => wolfIds.has(Number(id)));
        if (!hasWolf) setRenardPowerLost(true);
      }
    }
    // Loup-blanc-solo: first time (night 2) — commit "who is the white wolf" then stay on same step
    if (currentChar?.id === 'loup-blanc-solo') {
      const pool = roleAssignments['loup-garou'] ?? [];
      const wolfCount = roleConfig['loup-garou'] ?? 0;
      const needAssign = (roleConfig['loup-blanc'] ?? 0) > 0 && (roleAssignments['loup-blanc'] ?? []).length === 0 && pool.length > wolfCount;
      if (needAssign) {
        const sel = stepSelections['loup-blanc-solo'] ?? [];
        if (sel.length === 1) {
          const whiteWolfId = Number(sel[0]);
          setRoleAssignments((prev) => ({
            ...prev,
            'loup-blanc': [whiteWolfId],
            'loup-garou': (prev['loup-garou'] ?? []).filter((id) => id !== whiteWolfId),
          }));
          setStepSelections((prev) => ({ ...prev, 'loup-blanc-solo': [] }));
          return;
        }
      }
    }
    setCurrentStep((s) => s + 1);
  }, [pushUndo, currentChar, commitWitchPotions, stepSelections, roleAssignments, roleConfig]);

  const handleWakeVillage = useCallback(() => {
    pushUndo();
    if (currentChar?.id === 'sorciere') commitWitchPotions();

    // Resolve cupidon lovers — compute the value synchronously so it's available
    // for death calculations in the same tick (setLovers is async)
    const cupidonSel = stepSelections['cupidon'] ?? [];
    const currentLovers: [number, number] | null =
      lovers ?? (cupidonSel.length === 2
        ? [Number(cupidonSel[0]), Number(cupidonSel[1])]
        : null);
    if (!lovers && currentLovers) setLovers(currentLovers);

    // Apply night deaths using the resolved lovers value
    const deathIds = computeNightDeaths(stepSelections, currentLovers);
    const nextPlayers = deathIds.size > 0
      ? players.map((p) => (deathIds.has(p.id) ? { ...p, isAlive: false } : p))
      : players;
    setPlayers(nextPlayers);

    if (deathIds.size > 0) {
      const wolfVictimId = (stepSelections['loup-garou'] ?? [])[0];
      const witchSel = stepSelections['sorciere'] ?? [];
      const witchKillId = witchSel.find((id) => id !== '__heal__');
      const loverIds = new Set(currentLovers ?? []);

      const entries: DeathEntry[] = [];
      const loupBlancSoloId = (stepSelections['loup-blanc-solo'] ?? [])[0] ? Number((stepSelections['loup-blanc-solo'] ?? [])[0]) : null;
      for (const id of deathIds) {
        const player = players.find((p) => p.id === id);
        if (!player) continue;
        let cause: DeathEntry['cause'] = 'loup-garou';
        if (witchKillId && Number(witchKillId) === id) cause = 'sorciere';
        else if (loupBlancSoloId === id) cause = 'loup-blanc';
        else if (loverIds.has(id) && wolfVictimId !== String(id) && witchKillId !== String(id)) cause = 'amour';
        entries.push({ playerName: player.name, night, cause });
      }
      setDeathLog((prev) => [...prev, ...entries]);
    }

    const w = checkWin(nextPlayers, roleAssignments);
    if (w) { setWinner(w); setPhase('win'); }
    else setPhase('wake');
  }, [pushUndo, currentChar, commitWitchPotions, lovers, stepSelections, players, roleAssignments, night]);

  // ── Day voting ────────────────────────────────────────────────────────────
  const handleDayPhase = useCallback(() => {
    pushUndo();
    setPhase('day');
  }, [pushUndo]);

  const handleDayElimination = useCallback(
    (playerId: number | null) => {
      pushUndo();
      let nextPlayers = players;
      const entries: DeathEntry[] = [];
      if (playerId !== null) {
        const deathSet = new Set([playerId]);
        if (lovers && (lovers[0] === playerId || lovers[1] === playerId)) {
          deathSet.add(lovers[0]);
          deathSet.add(lovers[1]);
        }
        nextPlayers = players.map((p) => (deathSet.has(p.id) ? { ...p, isAlive: false } : p));
        setPlayers(nextPlayers);
        for (const id of deathSet) {
          const player = players.find((p) => p.id === id);
          if (!player) continue;
          const cause: DeathEntry['cause'] = id === playerId ? 'village' : 'amour';
          entries.push({ playerName: player.name, night, cause });
        }
        setDeathLog((prev) => [...prev, ...entries]);
      }
      setDayResultDeaths(entries);

      setStepSelections({});
      setCurrentStep(0);

      const w = checkWin(nextPlayers, roleAssignments);
      if (w) { setWinner(w); setPhase('win'); }
      else setPhase('dayResult');
    },
    [pushUndo, players, lovers, roleAssignments, night]
  );

  const handleNextNight = useCallback(() => {
    setNight((n) => n + 1);
    setPhase('night');
  }, []);

  // ── Derived ───────────────────────────────────────────────────────────────
  const wolfVictimId = useMemo(() => {
    const sel = stepSelections['loup-garou'] ?? [];
    return sel.length > 0 ? Number(sel[0]) : null;
  }, [stepSelections]);

  const renardWolfInGroup = useMemo(() => {
    if (currentChar?.id !== 'renard') return undefined;
    const sel = stepSelections['renard'] ?? [];
    if (sel.length !== 3) return undefined;
    const wolfIds = new Set(roleAssignments['loup-garou'] ?? []);
    return sel.some((id) => wolfIds.has(Number(id)));
  }, [currentChar?.id, stepSelections, roleAssignments]);

  const isNightPhase = phase === 'night' || phase === 'wake' || phase === 'day' || phase === 'dayResult';
  const isWinPhase = phase === 'win';

  return (
    <div className="relative min-h-screen bg-gray-950">
      {/* Top Bar */}
      {isNightPhase && (
        <div className="fixed left-0 right-0 top-0 z-40 flex items-center justify-between border-b border-gray-800 bg-gray-900/90 px-4 py-3 backdrop-blur-md">
          <div className="flex items-center gap-3">
            {phase === 'night' && currentChar && (
              <>
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-900/50 text-xs font-bold text-violet-400">
                  {currentStep + 1}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-100">{currentChar.name}</p>
                  <p className="text-xs text-gray-400">
                    Nuit {night} · Étape {currentStep + 1}/{nightCharacters.length}
                  </p>
                </div>
              </>
            )}
            {phase === 'wake' && (
              <p className="text-sm font-semibold text-gray-100">
                Réveil du village — Nuit {night}
              </p>
            )}
            {phase === 'day' && (
              <p className="text-sm font-semibold text-gray-100">
                Phase de jour — Nuit {night}
              </p>
            )}
            {phase === 'dayResult' && (
              <p className="text-sm font-semibold text-gray-100">
                Fin du jour — Nuit {night}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDeathHistoryOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-100 transition-colors hover:bg-gray-700"
              aria-label="Historique des morts"
            >
              <Skull className="h-4 w-4 text-red-400" />
              <span className="hidden sm:inline">Morts</span>
              {deathLog.length > 0 && (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-900/50 px-1 text-xs font-bold text-red-400">
                  {deathLog.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setRecapOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-100 transition-colors hover:bg-gray-700"
              aria-label="Voir les joueurs vivants"
            >
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Vivants</span>
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-violet-900/50 px-1 text-xs font-bold text-violet-400">
                {alivePlayers.length}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Step Progress Bar */}
      {phase === 'night' && nightCharacters.length > 0 && (
        <div className="fixed left-0 right-0 top-[57px] z-30 h-0.5 bg-gray-800">
          <div
            className="h-full bg-violet-600 transition-all duration-500"
            style={{ width: `${((currentStep + 1) / nightCharacters.length) * 100}%` }}
          />
        </div>
      )}

      {/* Main Content — pb-16 leaves room for the fixed bottom bar */}
      <div className={isNightPhase ? 'pb-16' : ''}>
        {phase === 'setup' && <GameSetupV2 onStart={handleSetupDone} />}

        {phase === 'roleConfig' && (
          <RoleConfigScreen playerCount={players.length} onStart={handleRoleConfigDone} />
        )}

        {phase === 'night' && currentChar && (
          <CharacterCardV2
            key={`night${night}-${currentChar.id}`}
            character={currentChar}
            allPlayers={players}
            alivePlayers={alivePlayers}
            targetPlayers={targetPlayers}
            isLast={currentStep === nightCharacters.length - 1}
            selection={currentSelection}
            onSelectionChange={handleSelectionChange}
            assignedPlayerIds={currentAssigned}
            requiredAssignCount={currentRequiredCount}
            takenPlayerIds={takenPlayerIds}
            onToggleAssignPlayer={handleToggleAssign}
            loupBlancSoloAssignMode={loupBlancSoloAssignMode}
            wolfPoolIncludesLoupBlanc={currentChar?.id === 'loup-garou' && (roleConfig['loup-blanc'] ?? 0) > 0}
            onNext={handleNext}
            onWakeVillage={handleWakeVillage}
            wolfVictimId={wolfVictimId}
            witchHealUsed={witchHealUsed}
            witchKillUsed={witchKillUsed}
            lovers={lovers}
            renardWolfInGroup={renardWolfInGroup}
          />
        )}

        {phase === 'wake' && (
          <VillageWakeV2
            players={players}
            stepSelections={stepSelections}
            lovers={lovers}
            onDayPhase={handleDayPhase}
          />
        )}

        {phase === 'day' && (
          <DayPhaseV2
            alivePlayers={alivePlayers}
            onEliminate={handleDayElimination}
          />
        )}

        {phase === 'dayResult' && (
          <DayResultV2
            night={night}
            dayDeaths={dayResultDeaths}
            onNextNight={handleNextNight}
          />
        )}
      </div>

      {/* Fixed bottom bar — undo + new game */}
      {isNightPhase && (
        <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between gap-2 border-t border-gray-800 bg-gray-900/95 px-4 py-2 backdrop-blur-md">
          <button
            onClick={handleUndo}
            disabled={undoCount === 0}
            className="flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-xs font-medium text-gray-300 transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <Undo2 className="h-3.5 w-3.5" />
            Annuler
          </button>
          <button
            onClick={handleNewGame}
            className="flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-xs font-medium text-gray-300 transition-colors hover:bg-gray-700"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Nouvelle partie
          </button>
        </div>
      )}

      {/* Win screen — rendered outside the padded container, full screen */}
      {isWinPhase && winner && (
        <WinScreenV2 winner={winner} onRestart={handleNewGame} />
      )}

      {/* Alive players panel */}
      <PlayerRecapV2
        players={players}
        lovers={lovers}
        roleAssignments={roleAssignments}
        isOpen={recapOpen}
        onClose={() => setRecapOpen(false)}
      />

      {/* Death history panel */}
      <DeathHistoryPanel
        deaths={deathLog}
        isOpen={deathHistoryOpen}
        onClose={() => setDeathHistoryOpen(false)}
      />
    </div>
  );
}
