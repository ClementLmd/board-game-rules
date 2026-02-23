import { useCallback, useEffect, useRef, useReducer, useState } from 'react';
import type { GameState, Player, Role, RoleConfig } from './types';
import { ROLES, STORAGE_KEY } from './types';
import { SetupPhase } from './SetupPhase';
import { RoleSelection } from './RoleSelection';
import { GamePhase } from './GamePhase';

function getInitialState(): GameState {
  if (typeof window === 'undefined') {
    return { phase: 'setup', players: [], roleConfig: {}, night: 1, gamePhase: 'night', lovers: null, deathLog: [], stepTargets: {} };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as GameState;
      if (parsed.phase && Array.isArray(parsed.players)) {
        let roleConfig: RoleConfig = parsed.roleConfig && typeof parsed.roleConfig === 'object' ? parsed.roleConfig : {};
        if (Object.keys(roleConfig).length === 0 && parsed.phase === 'game' && parsed.players?.length) {
          const counts: RoleConfig = {};
          for (const p of parsed.players as Player[]) {
            if (p.role?.id) counts[p.role.id] = (counts[p.role.id] ?? 0) + 1;
          }
          if (Object.keys(counts).length > 0) roleConfig = counts;
        }
        return {
          ...parsed,
          roleConfig,
          gamePhase: parsed.gamePhase === 'day' ? 'day' : 'night',
          deathLog: Array.isArray(parsed.deathLog) ? parsed.deathLog : [],
          stepTargets: parsed.stepTargets && typeof parsed.stepTargets === 'object' ? parsed.stepTargets : {},
          lovers: Array.isArray(parsed.lovers) && parsed.lovers.length === 2
            ? (parsed.lovers as [string, string])
            : null,
        };
      }
    }
  } catch {
    // ignore
  }
  return { phase: 'setup', players: [], roleConfig: {}, night: 1, gamePhase: 'night', lovers: null, deathLog: [], stepTargets: {} };
}

type Action =
  | { type: 'add_player'; name: string }
  | { type: 'remove_player'; id: string }
  | { type: 'set_phase'; phase: GameState['phase'] }
  | { type: 'set_role_config'; config: RoleConfig }
  | { type: 'assign_role'; playerId: string; role: Role }
  | { type: 'clear_role'; playerId: string }
  | { type: 'assign_players_to_role'; roleId: string; playerIds: string[] }
  | { type: 'kill_player'; id: string }
  | { type: 'set_lovers'; pair: [string, string] }
  | { type: 'set_step_target'; key: string; playerIds: string[] }
  | { type: 'night_to_day' }
  | { type: 'day_to_night' }
  | { type: 'replace_state'; state: GameState }
  | { type: 'new_game' };

function gameReducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'add_player': {
      const name = action.name.trim();
      if (!name) return state;
      const id = `p-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      return {
        ...state,
        players: [...state.players, { id, name, role: null, alive: true }],
      };
    }
    case 'remove_player':
      return {
        ...state,
        players: state.players.filter((p) => p.id !== action.id),
      };
    case 'set_phase':
      return { ...state, phase: action.phase };
    case 'set_role_config':
      return { ...state, roleConfig: action.config };
    case 'assign_role': {
      return {
        ...state,
        players: state.players.map((p) =>
          p.id === action.playerId ? { ...p, role: action.role } : p
        ),
      };
    }
    case 'clear_role':
      return {
        ...state,
        players: state.players.map((p) =>
          p.id === action.playerId ? { ...p, role: null } : p
        ),
      };
    case 'assign_players_to_role': {
      const role = ROLES.find((r) => r.id === action.roleId);
      if (!role) return state;
      const idSet = new Set(action.playerIds);
      return {
        ...state,
        players: state.players.map((p) => {
          if (idSet.has(p.id)) return { ...p, role };
          if (p.role?.id === action.roleId) return { ...p, role: null };
          return p;
        }),
      };
    }
    case 'kill_player': {
      const killIds = new Set<string>([action.id]);
      if (state.lovers && (state.lovers[0] === action.id || state.lovers[1] === action.id)) {
        killIds.add(state.lovers[0]).add(state.lovers[1]);
      }
      const num = state.gamePhase === 'night' ? state.night : state.night;
      const deathLog = [...state.deathLog];
      for (const id of killIds) {
        deathLog.push({ phase: state.gamePhase, number: num, playerId: id });
      }
      return {
        ...state,
        players: state.players.map((p) =>
          killIds.has(p.id) ? { ...p, alive: false } : p
        ),
        deathLog,
      };
    }
    case 'set_lovers':
      return { ...state, lovers: action.pair };
    case 'set_step_target':
      return {
        ...state,
        stepTargets: { ...state.stepTargets, [action.key]: action.playerIds },
      };
    case 'night_to_day':
      return { ...state, gamePhase: 'day' };
    case 'day_to_night':
      return { ...state, gamePhase: 'night', night: state.night + 1 };
    case 'replace_state':
      return action.state;
    case 'new_game':
      return { phase: 'setup', players: [], roleConfig: {}, night: 1, gamePhase: 'night', lovers: null, deathLog: [], stepTargets: {} };
    default:
      return state;
  }
}

function useLocalStorageGame(): [GameState, React.Dispatch<Action>] {
  const [state, dispatch] = useReducer(gameReducer, null, getInitialState);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore
    }
  }, [state]);

  return [state, dispatch];
}

export function LoupGarouGame() {
  const [state, dispatch] = useLocalStorageGame();
  const undoHistoryRef = useRef<GameState[]>([]);
  const [undoCount, setUndoCount] = useState(0);

  const addPlayer = useCallback((name: string) => {
    dispatch({ type: 'add_player', name });
  }, []);

  const removePlayer = useCallback((id: string) => {
    dispatch({ type: 'remove_player', id });
  }, []);

  const goToRoles = useCallback(() => {
    dispatch({ type: 'set_phase', phase: 'roles' });
  }, []);

  const startGame = useCallback((config: RoleConfig) => {
    dispatch({ type: 'set_role_config', config });
    dispatch({ type: 'set_phase', phase: 'game' });
  }, []);

  const assignRole = useCallback((playerId: string, role: Role) => {
    dispatch({ type: 'assign_role', playerId, role });
  }, []);

  const clearRole = useCallback((playerId: string) => {
    dispatch({ type: 'clear_role', playerId });
  }, []);

  const assignPlayersToRole = useCallback((roleId: string, playerIds: string[]) => {
    dispatch({ type: 'assign_players_to_role', roleId, playerIds });
  }, []);

  const setLovers = useCallback((pair: [string, string]) => {
    dispatch({ type: 'set_lovers', pair });
  }, []);

  const setStepTarget = useCallback((key: string, playerIds: string[]) => {
    dispatch({ type: 'set_step_target', key, playerIds });
  }, []);

  const killPlayer = useCallback((id: string) => {
    undoHistoryRef.current.push(state);
    setUndoCount((c: number) => c + 1);
    dispatch({ type: 'kill_player', id });
  }, [state]);

  const nightToDay = useCallback(() => {
    undoHistoryRef.current.push(state);
    setUndoCount((c: number) => c + 1);
    dispatch({ type: 'night_to_day' });
  }, [state]);

  const dayToNight = useCallback(() => {
    undoHistoryRef.current.push(state);
    setUndoCount((c: number) => c + 1);
    dispatch({ type: 'day_to_night' });
  }, [state]);

  const undo = useCallback(() => {
    const prev = undoHistoryRef.current.pop();
    if (prev) {
      setUndoCount((c: number) => Math.max(0, c - 1));
      dispatch({ type: 'replace_state', state: prev });
    }
  }, []);

  const newGame = useCallback(() => {
    undoHistoryRef.current = [];
    setUndoCount(0);
    dispatch({ type: 'new_game' });
  }, []);

  const canUndo = undoCount > 0;

  return (
    <div className="mx-auto max-w-2xl space-y-5 p-4 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 sm:text-2xl">
          Maître du jeu — Loup-Garou
        </h1>
        <button
          type="button"
          onClick={newGame}
          className="min-h-[44px] rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm active:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:active:bg-gray-700"
        >
          Nouvelle partie
        </button>
      </div>

      {state.phase === 'setup' && (
        <SetupPhase
          players={state.players}
          onAddPlayer={addPlayer}
          onRemovePlayer={removePlayer}
          onContinue={goToRoles}
        />
      )}

      {state.phase === 'roles' && (
        <RoleSelection
          playerCount={state.players.length}
          onStartGame={startGame}
        />
      )}

      {state.phase === 'game' && (
        <GamePhase
          players={state.players}
          roleConfig={state.roleConfig}
          night={state.night}
          gamePhase={state.gamePhase}
          deathLog={state.deathLog}
          lovers={state.lovers}
          onAssignRole={assignRole}
          onClearRole={clearRole}
          onAssignPlayersToRole={assignPlayersToRole}
          onSetLovers={setLovers}
          onKill={killPlayer}
          onSetStepTarget={setStepTarget}
          stepTargets={state.stepTargets}
          onNightToDay={nightToDay}
          onDayToNight={dayToNight}
          onUndo={undo}
          canUndo={canUndo}
        />
      )}
    </div>
  );
}
