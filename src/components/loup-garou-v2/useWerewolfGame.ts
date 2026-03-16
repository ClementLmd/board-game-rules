import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Character, Player, RoleConfigV2 } from './game-data';
import { getNightCharactersForConfig } from './game-data';
import { resolveNightOutcome, resolveDayOutcome, checkWin } from './game-rules';
import {
  clearSavedState,
  loadSavedState,
  loadGameHistory,
  persistState,
  saveGameToHistory,
  type Phase,
  type V2SavedState,
  type Winner,
} from './game-storage';
import type { DeathEntry } from './DeathHistoryPanel';

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
  if (char.id === 'loup-blanc-solo' && roleKey === 'loup-blanc') {
    const pool = roleAssignments['loup-garou'] ?? [];
    const wolfCount = roleConfig['loup-garou'] ?? 0;
    const needAssign =
      (roleConfig['loup-blanc'] ?? 0) > 0 &&
      assigned.length === 0 &&
      pool.length > wolfCount;
    if (needAssign)
      return pool.some((id) => players.find((p) => p.id === id)?.isAlive);
    if (assigned.length === 0) return false;
  }
  if (assigned.length === 0) return true;
  return assigned.some((id) => players.find((p) => p.id === id)?.isAlive);
}

export interface UseWerewolfGameResult {
  // state
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
  dayResultDeaths: DeathEntry[];
  historyEntries: ReturnType<typeof loadGameHistory>;
  initialPlayerNames: string[] | null;
  recapOpen: boolean;
  deathHistoryOpen: boolean;
  historyPanelOpen: boolean;
  undoCount: number;

  // derived
  alivePlayers: Player[];
  nightCharacters: Character[];
  currentChar: Character | undefined;
  currentSelection: string[];
  currentAssigned: number[];
  currentRequiredCount: number;
  takenPlayerIds: Set<number>;
  loupBlancSoloAssignMode: boolean;
  targetPlayers: Player[];
  wolfVictimId: number | null;
  renardWolfInGroup: boolean | undefined;
  isNightPhase: boolean;
  isWinPhase: boolean;

  // handlers
  handleSetupDone: (players: Player[]) => void;
  handleOpenHistory: () => void;
  handleReplayWithPlayers: (names: string[]) => void;
  handleBackFromRoleConfig: () => void;
  handleBackFromManualAssign: () => void;
  handleRoleConfigDone: (config: RoleConfigV2, assignRolesNow: boolean) => void;
  handleManualAssignDone: (assignments: Record<string, number[]>) => void;
  handleToggleAssign: (playerId: number) => void;
  handleSelectionChange: (ids: string[]) => void;
  handleNext: () => void;
  handleWakeVillage: () => void;
  handleDayPhase: () => void;
  handleDayElimination: (playerId: number | null) => void;
  handleNextNight: () => void;
  handleUndo: () => void;
  handleNewGame: () => void;
  setRecapOpen: (open: boolean) => void;
  setDeathHistoryOpen: (open: boolean) => void;
  setHistoryPanelOpen: (open: boolean) => void;
}

export function useWerewolfGame(onNewGame: () => void): UseWerewolfGameResult {
  const saved = loadSavedState();

  const [phase, setPhase] = useState<Phase>(saved.phase ?? 'setup');
  const [players, setPlayers] = useState<Player[]>(saved.players ?? []);
  const [roleConfig, setRoleConfig] = useState<RoleConfigV2>(saved.roleConfig ?? {});
  const [night, setNight] = useState(saved.night ?? 1);
  const [currentStep, setCurrentStep] = useState(saved.currentStep ?? 0);
  const [stepSelections, setStepSelections] = useState<Record<string, string[]>>(
    saved.stepSelections ?? {}
  );
  const [roleAssignments, setRoleAssignments] = useState<Record<string, number[]>>(
    saved.roleAssignments ?? {}
  );
  const [lovers, setLovers] = useState<[number, number] | null>(
    saved.lovers ?? null
  );
  const [enfantModel, setEnfantModel] = useState<[number, number] | null>(
    saved.enfantModel ?? null
  );
  const [ancienLivesRemaining, setAncienLivesRemaining] = useState(
    saved.ancienLivesRemaining ?? 2
  );
  const [villagePowersLost, setVillagePowersLost] = useState(
    saved.villagePowersLost ?? false
  );
  const [witchHealUsed, setWitchHealUsed] = useState(
    saved.witchHealUsed ?? false
  );
  const [witchKillUsed, setWitchKillUsed] = useState(
    saved.witchKillUsed ?? false
  );
  const [renardPowerLost, setRenardPowerLost] = useState(
    saved.renardPowerLost ?? false
  );
  const [winner, setWinner] = useState<Winner | null>(saved.winner ?? null);
  const [deathLog, setDeathLog] = useState<DeathEntry[]>(saved.deathLog ?? []);
  const [recapOpen, setRecapOpen] = useState(false);
  const [deathHistoryOpen, setDeathHistoryOpen] = useState(false);
  const [dayResultDeaths, setDayResultDeaths] = useState<DeathEntry[]>([]);
  const [historyPanelOpen, setHistoryPanelOpen] = useState(false);
  const [historyEntries, setHistoryEntries] = useState(
    loadGameHistory()
  );
  const [initialPlayerNames, setInitialPlayerNames] = useState<string[] | null>(null);
  const savedToHistoryRef = useRef(false);

  const undoStack = useRef<V2SavedState[]>([]);
  const [undoCount, setUndoCount] = useState(0);

  const pushUndo = useCallback(() => {
    const snapshot: V2SavedState = {
      phase,
      players,
      roleConfig,
      night,
      currentStep,
      stepSelections,
      roleAssignments,
      lovers,
      enfantModel,
      ancienLivesRemaining,
      villagePowersLost,
      witchHealUsed,
      witchKillUsed,
      renardPowerLost,
      winner,
      deathLog,
    };
    undoStack.current.push(snapshot);
    if (undoStack.current.length > 20) undoStack.current.shift();
    setUndoCount(undoStack.current.length);
  }, [
    phase,
    players,
    roleConfig,
    night,
    currentStep,
    stepSelections,
    roleAssignments,
    lovers,
    enfantModel,
    ancienLivesRemaining,
    villagePowersLost,
    witchHealUsed,
    witchKillUsed,
    renardPowerLost,
    winner,
    deathLog,
  ]);

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
    clearSavedState();
    undoStack.current = [];
    setUndoCount(0);
    savedToHistoryRef.current = false;
    onNewGame();
  }, [onNewGame]);

  useEffect(() => {
    if (
      phase !== 'win' ||
      !winner ||
      players.length === 0 ||
      savedToHistoryRef.current
    )
      return;
    saveGameToHistory({
      playerNames: players.map((p) => p.name),
      roleAssignments,
      winner,
    });
    savedToHistoryRef.current = true;
  }, [phase, winner, players, roleAssignments]);

  useEffect(() => {
    const state: V2SavedState = {
      phase,
      players,
      roleConfig,
      night,
      currentStep,
      stepSelections,
      roleAssignments,
      lovers,
      enfantModel,
      ancienLivesRemaining,
      villagePowersLost,
      witchHealUsed,
      witchKillUsed,
      renardPowerLost,
      winner,
      deathLog,
    };
    persistState(state);
  }, [
    phase,
    players,
    roleConfig,
    night,
    currentStep,
    stepSelections,
    roleAssignments,
    lovers,
    enfantModel,
    ancienLivesRemaining,
    villagePowersLost,
    witchHealUsed,
    witchKillUsed,
    renardPowerLost,
    winner,
    deathLog,
  ]);

  const alivePlayers = useMemo(
    () => players.filter((p) => p.isAlive),
    [players]
  );

  const nightCharacters = useMemo(
    () =>
      getNightCharactersForConfig(roleConfig, night).filter((c) =>
        isRoleActive(
          c,
          roleAssignments,
          players,
          renardPowerLost,
          roleConfig,
          villagePowersLost
        )
      ),
    [roleConfig, night, roleAssignments, players, renardPowerLost, villagePowersLost]
  );

  const currentChar = nightCharacters[currentStep];
  const currentSelection = stepSelections[currentChar?.id ?? ''] ?? [];
  const currentRoleKey = currentChar?.configKey ?? currentChar?.id ?? '';
  const currentAssigned = roleAssignments[currentRoleKey] ?? [];
  const currentRequiredCount =
    currentChar?.id === 'loup-garou'
      ? (roleConfig['loup-garou'] ?? 0) + (roleConfig['loup-blanc'] ?? 0)
      : currentChar?.configKey
      ? 0
      : roleConfig[currentChar?.id ?? ''] ?? 1;

  const takenPlayerIds = useMemo(() => {
    const taken = new Set<number>();
    for (const [roleId, ids] of Object.entries(roleAssignments)) {
      if (roleId !== currentChar?.id) {
        for (const id of ids) taken.add(id);
      }
    }
    return taken;
  }, [roleAssignments, currentChar]);

  const loupBlancSoloAssignMode = useMemo(() => {
    if (currentChar?.id !== 'loup-blanc-solo') return false;
    const pool = roleAssignments['loup-garou'] ?? [];
    const wolfCount = roleConfig['loup-garou'] ?? 0;
    return (
      (roleConfig['loup-blanc'] ?? 0) > 0 &&
      (roleAssignments['loup-blanc'] ?? []).length === 0 &&
      pool.length > wolfCount
    );
  }, [currentChar?.id, roleConfig, roleAssignments]);

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
      return alivePlayers.filter(
        (p) => pool.includes(p.id) && !whiteWolfIds.has(p.id)
      );
    }
    if (selfIds.size === 0) return alivePlayers;
    return alivePlayers.filter((p) => !selfIds.has(p.id));
  }, [currentChar, alivePlayers, roleAssignments, roleConfig]);

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

  const handleRoleConfigDone = useCallback(
    (config: RoleConfigV2, assignRolesNow: boolean) => {
      setRoleConfig(config);
      setStepSelections({});
      setCurrentStep(0);
      setNight(1);
      if (assignRolesNow) {
        setPhase('manualAssign');
      } else {
        setPhase('night');
      }
    },
    []
  );

  const handleManualAssignDone = useCallback(
    (assignments: Record<string, number[]>) => {
      setRoleAssignments(assignments);
      setStepSelections({});
      setCurrentStep(0);
      setNight(1);
      setPhase('night');
    },
    []
  );

  const handleToggleAssign = useCallback(
    (playerId: number) => {
      if (!currentChar || currentChar.configKey) return;
      const roleId = currentChar.id;
      const required =
        roleId === 'loup-garou'
          ? (roleConfig['loup-garou'] ?? 0) + (roleConfig['loup-blanc'] ?? 0)
          : roleConfig[roleId] ?? 1;
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

  const handleSelectionChange = useCallback(
    (ids: string[]) => {
      if (!currentChar) return;
      setStepSelections((prev) => ({ ...prev, [currentChar.id]: ids }));
    },
    [currentChar]
  );

  const commitWitchPotions = useCallback(() => {
    const sel = stepSelections['sorciere'] ?? [];
    if (sel.includes('__heal__')) setWitchHealUsed(true);
    if (sel.some((id) => id !== '__heal__')) setWitchKillUsed(true);
  }, [stepSelections]);

  const handleNext = useCallback(() => {
    pushUndo();
    if (currentChar?.id === 'sorciere') commitWitchPotions();
    if (currentChar?.id === 'renard') {
      const sel = stepSelections['renard'] ?? [];
      if (sel.length === 3) {
        const wolfIds = new Set(roleAssignments['loup-garou'] ?? []);
        const hasWolf = sel.some((id) => wolfIds.has(Number(id)));
        if (!hasWolf) setRenardPowerLost(true);
      }
    }
    if (currentChar?.id === 'loup-blanc-solo') {
      const pool = roleAssignments['loup-garou'] ?? [];
      const wolfCount = roleConfig['loup-garou'] ?? 0;
      const needAssign =
        (roleConfig['loup-blanc'] ?? 0) > 0 &&
        (roleAssignments['loup-blanc'] ?? []).length === 0 &&
        pool.length > wolfCount;
      if (needAssign) {
        const sel = stepSelections['loup-blanc-solo'] ?? [];
        if (sel.length === 1) {
          const whiteWolfId = Number(sel[0]);
          setRoleAssignments((prev) => ({
            ...prev,
            'loup-blanc': [whiteWolfId],
            'loup-garou': (prev['loup-garou'] ?? []).filter(
              (id) => id !== whiteWolfId
            ),
          }));
          setStepSelections((prev) => ({ ...prev, 'loup-blanc-solo': [] }));
          return;
        }
      }
    }
    setCurrentStep((s) => s + 1);
  }, [
    pushUndo,
    currentChar,
    commitWitchPotions,
    stepSelections,
    roleAssignments,
    roleConfig,
  ]);

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
    if (!enfantModel && nightOutcome.enfantModel)
      setEnfantModel(nightOutcome.enfantModel);
    if (nightOutcome.ancienLivesRemaining !== ancienLivesRemaining) {
      setAncienLivesRemaining(nightOutcome.ancienLivesRemaining);
    }
    if (nightOutcome.villagePowersLost) {
      setVillagePowersLost(true);
    }

    const deathIdsSet = new Set(nightOutcome.deaths.map((d) => d.playerId));
    const nextPlayers =
      deathIdsSet.size > 0
        ? players.map((p) =>
            deathIdsSet.has(p.id) ? { ...p, isAlive: false } : p
          )
        : players;
    setPlayers(nextPlayers);

    let nextRoleAssignments = roleAssignments;
    if (nightOutcome.enfantModel) {
      const [enfantId, modelId] = nightOutcome.enfantModel;
      const modelDied = deathIdsSet.has(modelId);
      const enfantAlive = nextPlayers.some(
        (p) => p.id === enfantId && p.isAlive
      );
      if (modelDied && enfantAlive) {
        const currentWolves = new Set(roleAssignments['loup-garou'] ?? []);
        if (!currentWolves.has(enfantId)) {
          nextRoleAssignments = {
            ...roleAssignments,
            'enfant-sauvage': (roleAssignments['enfant-sauvage'] ?? []).filter(
              (id) => id !== enfantId
            ),
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
    if (w) {
      setWinner(w);
      setPhase('win');
    } else {
      setPhase('wake');
    }
  }, [
    pushUndo,
    currentChar,
    commitWitchPotions,
    players,
    night,
    stepSelections,
    roleAssignments,
    lovers,
    enfantModel,
    ancienLivesRemaining,
  ]);

  const handleDayPhase = useCallback(() => {
    pushUndo();
    setPhase('day');
  }, [pushUndo]);

  const handleDayElimination = useCallback(
    (playerId: number | null) => {
      pushUndo();
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
      if (w) {
        setWinner(w);
        setPhase('win');
      } else {
        setPhase('dayResult');
      }
    },
    [pushUndo, players, lovers, roleAssignments, night, enfantModel]
  );

  const handleNextNight = useCallback(() => {
    setNight((n) => n + 1);
    setPhase('night');
  }, []);

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

  const isNightPhase =
    phase === 'night' ||
    phase === 'wake' ||
    phase === 'day' ||
    phase === 'dayResult';
  const isWinPhase = phase === 'win';

  return {
    // state
    phase,
    players,
    roleConfig,
    night,
    currentStep,
    stepSelections,
    roleAssignments,
    lovers,
    enfantModel,
    ancienLivesRemaining,
    villagePowersLost,
    witchHealUsed,
    witchKillUsed,
    renardPowerLost,
    winner,
    deathLog,
    dayResultDeaths,
    historyEntries,
    initialPlayerNames,
    recapOpen,
    deathHistoryOpen,
    historyPanelOpen,
    undoCount,

    // derived
    alivePlayers,
    nightCharacters,
    currentChar,
    currentSelection,
    currentAssigned,
    currentRequiredCount,
    takenPlayerIds,
    loupBlancSoloAssignMode,
    targetPlayers,
    wolfVictimId,
    renardWolfInGroup,
    isNightPhase,
    isWinPhase,

    // handlers
    handleSetupDone,
    handleOpenHistory,
    handleReplayWithPlayers,
    handleBackFromRoleConfig,
    handleBackFromManualAssign,
    handleRoleConfigDone,
    handleManualAssignDone,
    handleToggleAssign,
    handleSelectionChange,
    handleNext,
    handleWakeVillage,
    handleDayPhase,
    handleDayElimination,
    handleNextNight,
    handleUndo,
    handleNewGame,
    setRecapOpen,
    setDeathHistoryOpen,
    setHistoryPanelOpen,
  };
}

