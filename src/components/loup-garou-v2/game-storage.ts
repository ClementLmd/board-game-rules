import type { Player, RoleConfigV2 } from './game-data';
import type { DeathEntry } from './DeathHistoryPanel';
import { loadGameHistory as baseLoadGameHistory, saveGameToHistory as baseSaveGameToHistory } from './game-data';

export type Phase = 'setup' | 'roleConfig' | 'manualAssign' | 'night' | 'wake' | 'day' | 'dayResult' | 'win';

export type Winner = 'wolves' | 'village' | 'loup-blanc' | 'ange';

export interface V2SavedState {
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

const STORAGE_KEY = 'loup-garou-v2';

export function loadSavedState(): Partial<V2SavedState> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Partial<V2SavedState>;
  } catch {
    // ignore
  }
  return {};
}

export function persistState(state: V2SavedState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function clearSavedState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export const loadGameHistory = baseLoadGameHistory;
export const saveGameToHistory = baseSaveGameToHistory;

