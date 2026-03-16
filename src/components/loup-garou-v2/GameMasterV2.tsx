import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Users, Skull, Undo2, RefreshCw } from 'lucide-react';
import {
  getNightCharactersForConfig,
  loadGameHistory,
  saveGameToHistory,
  type Character,
  type Player,
  type RoleConfigV2,
} from './game-data';
import {
  resolveNightOutcome,
  resolveDayOutcome,
  checkWin,
} from './game-rules';
import { GameSetupV2 } from './GameSetupV2';
import { RoleConfigV2 as RoleConfigScreen } from './RoleConfigV2';
import { CharacterCardV2 } from './CharacterCardV2';
import { PlayerRecapV2 } from './PlayerRecapV2';
import { VillageWakeV2 } from './VillageWakeV2';
import { DayPhaseV2 } from './DayPhaseV2';
import { DayResultV2 } from './DayResultV2';
import { WinScreenV2 } from './WinScreenV2';
import { DeathHistoryPanel, type DeathEntry } from './DeathHistoryPanel';
import { GameHistoryPanel } from './GameHistoryPanel';
import { ManualRoleAssignV2 } from './ManualRoleAssignV2';

type Phase = 'setup' | 'roleConfig' | 'manualAssign' | 'night' | 'wake' | 'day' | 'dayResult' | 'win';
type Winner = 'wolves' | 'village' | 'loup-blanc' | 'ange';

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
  enfantModel: [number, number] | null;
  ancienLivesRemaining: number;
  villagePowersLost: boolean;
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
  roleConfig: RoleConfigV2,
  villagePowersLost: boolean
): boolean {
  if (villagePowersLost && char.team === 'village') return false;
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
  const [enfantModel, setEnfantModel] = useState<[number, number] | null>(saved.enfantModel ?? null);
  const [ancienLivesRemaining, setAncienLivesRemaining] = useState(saved.ancienLivesRemaining ?? 2);
  const [villagePowersLost, setVillagePowersLost] = useState(saved.villagePowersLost ?? false);
  const [witchHealUsed, setWitchHealUsed] = useState(saved.witchHealUsed ?? false);
  const [witchKillUsed, setWitchKillUsed] = useState(saved.witchKillUsed ?? false);
  const [renardPowerLost, setRenardPowerLost] = useState(saved.renardPowerLost ?? false);
  const [winner, setWinner] = useState<Winner | null>(saved.winner ?? null);
  const [deathLog, setDeathLog] = useState<DeathEntry[]>(saved.deathLog ?? []);
  const [recapOpen, setRecapOpen] = useState(false);
  const [deathHistoryOpen, setDeathHistoryOpen] = useState(false);
  /** Deaths from the last day vote — shown on dayResult screen */
  const [dayResultDeaths, setDayResultDeaths] = useState<DeathEntry[]>([]);
  const [historyPanelOpen, setHistoryPanelOpen] = useState(false);
  const [historyEntries, setHistoryEntries] = useState<ReturnType<typeof loadGameHistory>>([]);
  const [initialPlayerNames, setInitialPlayerNames] = useState<string[] | null>(null);
  const savedToHistoryRef = useRef(false);

  // ── Undo stack ─────────────────────────────────────────────────────────────
  const undoStack = useRef<V2SavedState[]>([]);
  const [undoCount, setUndoCount] = useState(0);

  const pushUndo = useCallback(() => {
    undoStack.current.push({
      phase, players, roleConfig, night, currentStep,
      stepSelections, roleAssignments, lovers, enfantModel,
      ancienLivesRemaining, villagePowersLost,
      witchHealUsed, witchKillUsed, renardPowerLost, winner, deathLog,
    });
    if (undoStack.current.length > 20) undoStack.current.shift();
    setUndoCount(undoStack.current.length);
  }, [phase, players, roleConfig, night, currentStep, stepSelections, roleAssignments, lovers, enfantModel, ancienLivesRemaining, villagePowersLost, witchHealUsed, witchKillUsed, renardPowerLost, winner, deathLog]);

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
    setEnfantModel(prev.enfantModel);
    setAncienLivesRemaining(prev.ancienLivesRemaining);
    setVillagePowersLost(prev.villagePowersLost);
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
    savedToHistoryRef.current = false;
    onNewGame();
  }, [onNewGame]);

  // Save to game history when the game is won (once per game)
  useEffect(() => {
    if (phase !== 'win' || !winner || players.length === 0 || savedToHistoryRef.current) return;
    saveGameToHistory({
      playerNames: players.map((p) => p.name),
      roleAssignments,
      winner,
    });
    savedToHistoryRef.current = true;
  }, [phase, winner, players, roleAssignments]);

  // Persist to localStorage whenever relevant state changes
  useEffect(() => {
    const state: V2SavedState = {
      phase, players, roleConfig, night, currentStep,
      stepSelections, roleAssignments, lovers, enfantModel,
      ancienLivesRemaining, villagePowersLost,
      witchHealUsed, witchKillUsed, renardPowerLost, winner, deathLog,
    };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* ignore */ }
  }, [phase, players, roleConfig, night, currentStep, stepSelections, roleAssignments, lovers, enfantModel, ancienLivesRemaining, villagePowersLost, witchHealUsed, witchKillUsed, renardPowerLost, winner, deathLog]);

  const alivePlayers = useMemo(() => players.filter((p) => p.isAlive), [players]);

  // Night characters: filtered by roleConfig, night1Only, and alive status
  const nightCharacters = useMemo(
    () =>
      getNightCharactersForConfig(roleConfig, night).filter((c) =>
        isRoleActive(c, roleAssignments, players, renardPowerLost, roleConfig, villagePowersLost)
      ),
    [roleConfig, night, roleAssignments, players, renardPowerLost, villagePowersLost]
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
    setInitialPlayerNames(null);
    setPlayers(newPlayers);
    setPhase('roleConfig');
  }, []);

  const handleOpenHistory = useCallback(() => {
    setHistoryEntries(loadGameHistory());
    setHistoryPanelOpen(true);
  }, []);

  const handleReplayWithPlayers = useCallback((playerNames: string[]) => {
    setInitialPlayerNames(playerNames);
    setHistoryPanelOpen(false);
  }, []);

  const handleBackFromRoleConfig = useCallback(() => {
    setInitialPlayerNames(players.map((p) => p.name));
    setPhase('setup');
  }, [players]);

  const handleBackFromManualAssign = useCallback(() => {
    setPhase('roleConfig');
  }, []);

  const handleRoleConfigDone = useCallback((config: RoleConfigV2, assignRolesNow: boolean) => {
    setRoleConfig(config);
    setStepSelections({});
    setCurrentStep(0);
    setNight(1);
    if (assignRolesNow) {
      setPhase('manualAssign');
    } else {
      setPhase('night');
    }
  }, []);

  const handleManualAssignDone = useCallback((assignments: Record<string, number[]>) => {
    setRoleAssignments(assignments);
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

    const nightOutcome = resolveNightOutcome({
      players,
      night,
      stepSelections,
      roleAssignments,
      lovers,
      enfantModel,
      ancienLivesRemaining,
    });

    if (!lovers && nightOutcome.lovers) setLovers(nightOutcome.lovers);
    if (!enfantModel && nightOutcome.enfantModel) setEnfantModel(nightOutcome.enfantModel);
    if (nightOutcome.ancienLivesRemaining !== ancienLivesRemaining) {
      setAncienLivesRemaining(nightOutcome.ancienLivesRemaining);
    }
    if (nightOutcome.villagePowersLost) {
      setVillagePowersLost(true);
    }

    const deathIdsSet = new Set(nightOutcome.deaths.map((d) => d.playerId));
    const nextPlayers = deathIdsSet.size > 0
      ? players.map((p) => (deathIdsSet.has(p.id) ? { ...p, isAlive: false } : p))
      : players;
    setPlayers(nextPlayers);

    // Enfant Sauvage becomes a wolf if his model died this night
    let nextRoleAssignments = roleAssignments;
    if (nightOutcome.enfantModel) {
      const [enfantId, modelId] = nightOutcome.enfantModel;
      const modelDied = deathIdsSet.has(modelId);
      const enfantAlive = nextPlayers.some((p) => p.id === enfantId && p.isAlive);
      if (modelDied && enfantAlive) {
        const currentWolves = new Set(roleAssignments['loup-garou'] ?? []);
        if (!currentWolves.has(enfantId)) {
          nextRoleAssignments = {
            ...roleAssignments,
            'enfant-sauvage': (roleAssignments['enfant-sauvage'] ?? []).filter((id) => id !== enfantId),
            'loup-garou': [...(roleAssignments['loup-garou'] ?? []), enfantId],
          };
          setRoleAssignments(nextRoleAssignments);
        }
      }
    }

    if (nightOutcome.deaths.length > 0) {
      const entries: DeathEntry[] = nightOutcome.deaths
        .map((d) => {
          const player = players.find((p) => p.id === d.playerId);
          if (!player) return null;
          return {
            playerName: player.name,
            night,
            cause: d.cause,
          } as DeathEntry;
        })
        .filter((e): e is DeathEntry => e != null);
      if (entries.length > 0) {
        setDeathLog((prev) => [...prev, ...entries]);
      }
    }

    const w = checkWin(nextPlayers, nextRoleAssignments);
    if (w) { setWinner(w); setPhase('win'); }
    else setPhase('wake');
  }, [pushUndo, currentChar, commitWitchPotions, lovers, stepSelections, players, roleAssignments, night, ancienLivesRemaining, enfantModel]);

  // ── Day voting ────────────────────────────────────────────────────────────
  const handleDayPhase = useCallback(() => {
    pushUndo();
    setPhase('day');
  }, [pushUndo]);

  const handleDayElimination = useCallback(
    (playerId: number | null) => {
      pushUndo();
      // L'Ange wins if eliminated by the village on the very first day vote
      const angeIds = new Set(roleAssignments['ange'] ?? []);
      if (playerId !== null && night === 1 && angeIds.has(playerId)) {
        setWinner('ange');
        setPhase('win');
        setStepSelections({});
        setCurrentStep(0);
        return;
      }

      const dayOutcome = resolveDayOutcome({
        players,
        roleAssignments,
        lovers,
        enfantModel,
        votedPlayerId: playerId,
      });

      if (dayOutcome.villagePowersLost) {
        setVillagePowersLost(true);
      }

      let nextPlayers = players;
      if (dayOutcome.deaths.length > 0) {
        const deathSet = new Set(dayOutcome.deaths.map((d) => d.playerId));
        nextPlayers = players.map((p) =>
          deathSet.has(p.id) ? { ...p, isAlive: false } : p
        );
        setPlayers(nextPlayers);

        if (enfantModel) {
          const [enfantId, modelId] = enfantModel;
          const modelDied = deathSet.has(modelId);
          const enfantAlive = nextPlayers.some(
            (p) => p.id === enfantId && p.isAlive
          );
          if (modelDied && enfantAlive) {
            setRoleAssignments((prev) => ({
              ...prev,
              'enfant-sauvage': (prev['enfant-sauvage'] ?? []).filter(
                (id) => id !== enfantId
              ),
              'loup-garou': [...(prev['loup-garou'] ?? []), enfantId],
            }));
          }
        }

        const entries: DeathEntry[] = dayOutcome.deaths
          .map((d) => {
            const player = players.find((p) => p.id === d.playerId);
            if (!player) return null;
            return {
              playerName: player.name,
              night,
              cause: d.cause,
            } as DeathEntry;
          })
          .filter((e): e is DeathEntry => e != null);
        if (entries.length > 0) {
          setDeathLog((prev) => [...prev, ...entries]);
          setDayResultDeaths(entries);
        } else {
          setDayResultDeaths([]);
        }
      } else {
        setDayResultDeaths([]);
      }

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
        {phase === 'setup' && (
          <GameSetupV2
            onStart={handleSetupDone}
            initialPlayerNames={initialPlayerNames}
            onOpenPreviousGames={handleOpenHistory}
          />
        )}

        {phase === 'roleConfig' && (
          <RoleConfigScreen
            playerCount={players.length}
            onStart={handleRoleConfigDone}
            onBack={handleBackFromRoleConfig}
          />
        )}

        {phase === 'manualAssign' && (
          <ManualRoleAssignV2
            players={players}
            roleConfig={roleConfig}
            initialAssignments={roleAssignments}
            onDone={handleManualAssignDone}
            onBack={handleBackFromManualAssign}
          />
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
            roleAssignments={roleAssignments}
          />
        )}

        {phase === 'wake' && (
          <VillageWakeV2
            players={players}
            nightOutcome={resolveNightOutcome({
              players,
              night,
              stepSelections,
              roleAssignments,
              lovers,
              enfantModel,
              ancienLivesRemaining,
            })}
            roleAssignments={roleAssignments}
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

      {/* Game history panel (previous games) */}
      <GameHistoryPanel
        entries={historyEntries}
        isOpen={historyPanelOpen}
        onClose={() => setHistoryPanelOpen(false)}
        onReplayWithPlayers={handleReplayWithPlayers}
      />
    </div>
  );
}
