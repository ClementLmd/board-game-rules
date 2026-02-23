import { useCallback, useEffect, useRef, useReducer, useState } from 'react';
import type { GameState, Player, Role } from './types';
import { STORAGE_KEY } from './types';
import { SetupPhase } from './SetupPhase';
import { RoleAssignment } from './RoleAssignment';
import { GamePhase } from './GamePhase';

function getInitialState(): GameState {
  if (typeof window === 'undefined') {
    return { phase: 'setup', players: [], night: 1, lovers: null };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as GameState;
      if (parsed.phase && Array.isArray(parsed.players)) {
        return {
          ...parsed,
          lovers: Array.isArray(parsed.lovers) && parsed.lovers.length === 2
            ? (parsed.lovers as [string, string])
            : null,
        };
      }
    }
  } catch {
    // ignore
  }
  return { phase: 'setup', players: [], night: 1, lovers: null };
}

type Action =
  | { type: 'add_player'; name: string }
  | { type: 'remove_player'; id: string }
  | { type: 'set_phase'; phase: GameState['phase'] }
  | { type: 'assign_role'; playerId: string; role: Role }
  | { type: 'assign_roles'; assignments: { playerId: string; role: Role }[] }
  | { type: 'kill_player'; id: string }
  | { type: 'set_lovers'; pair: [string, string] }
  | { type: 'next_night' }
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
    case 'assign_role': {
      return {
        ...state,
        players: state.players.map((p) =>
          p.id === action.playerId ? { ...p, role: action.role } : p
        ),
      };
    }
    case 'assign_roles': {
      const byId = new Map(action.assignments.map((a) => [a.playerId, a.role]));
      return {
        ...state,
        players: state.players.map((p) => ({
          ...p,
          role: byId.get(p.id) ?? p.role,
        })),
      };
    }
    case 'kill_player': {
      const killIds = new Set<string>([action.id]);
      if (state.lovers && (state.lovers[0] === action.id || state.lovers[1] === action.id)) {
        killIds.add(state.lovers[0]).add(state.lovers[1]);
      }
      return {
        ...state,
        players: state.players.map((p) =>
          killIds.has(p.id) ? { ...p, alive: false } : p
        ),
      };
    }
    case 'set_lovers':
      return { ...state, lovers: action.pair };
    case 'next_night':
      return { ...state, night: state.night + 1 };
    case 'replace_state':
      return action.state;
    case 'new_game':
      return { phase: 'setup', players: [], night: 1, lovers: null };
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

  const assignRole = useCallback((playerId: string, role: Role) => {
    dispatch({ type: 'assign_role', playerId, role });
  }, []);

  const assignRoles = useCallback(
    (assignments: { playerId: string; role: Role }[]) => {
      dispatch({ type: 'assign_roles', assignments });
    },
    []
  );

  const goToGame = useCallback(() => {
    dispatch({ type: 'set_phase', phase: 'game' });
  }, []);

  const setLovers = useCallback((pair: [string, string]) => {
    dispatch({ type: 'set_lovers', pair });
  }, []);

  const killPlayer = useCallback((id: string) => {
    undoHistoryRef.current.push(state);
    setUndoCount((c: number) => c + 1);
    dispatch({ type: 'kill_player', id });
  }, [state]);

  const nextNight = useCallback(() => {
    undoHistoryRef.current.push(state);
    setUndoCount((c: number) => c + 1);
    dispatch({ type: 'next_night' });
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
    <div className="mx-auto min-h-screen max-w-2xl space-y-5 p-4 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
          Maître du jeu — Loup-Garou
        </h1>
        <button
          type="button"
          onClick={newGame}
          className="min-h-[44px] rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm active:bg-gray-50"
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
        <RoleAssignment
          players={state.players}
          onAssignRole={assignRole}
          onAssignRoles={assignRoles}
          onContinue={goToGame}
        />
      )}

      {state.phase === 'game' && (
        <GamePhase
          players={state.players}
          night={state.night}
          lovers={state.lovers}
          onSetLovers={setLovers}
          onKill={killPlayer}
          onNextNight={nextNight}
          onUndo={undo}
          canUndo={canUndo}
        />
      )}
    </div>
  );
}
