import { describe, it, expect } from 'vitest';
import type { Player, RoleConfigV2 } from './game-data';
import {
  getWolfIds,
  resolveNightOutcome,
  resolveDayOutcome,
  checkWin,
  type NightOutcome,
} from './game-rules';

function makePlayers(names: string[]): Player[] {
  return names.map((name, index) => ({
    id: index + 1,
    name,
    isAlive: true,
  }));
}

describe('game-rules', () => {
  describe('getWolfIds', () => {
    it('combines loup-garou and loup-blanc into allWolves', () => {
      const ids = getWolfIds({
        'loup-garou': [1, 2],
        'loup-blanc': [3],
      });
      expect(ids.wolves.has(1)).toBe(true);
      expect(ids.wolves.has(3)).toBe(false);
      expect(ids.whiteWolves.has(3)).toBe(true);
      expect(ids.allWolves.has(1)).toBe(true);
      expect(ids.allWolves.has(3)).toBe(true);
    });
  });

  describe('resolveNightOutcome', () => {
    it("ancien survives first wolf attack without village powers lost", () => {
      const players = makePlayers(['Ancien']);
      const outcome: NightOutcome = resolveNightOutcome({
        players,
        night: 1,
        stepSelections: { 'loup-garou': ['1'] },
        roleAssignments: { ancien: [1] },
        lovers: null,
        enfantModel: null,
        ancienLivesRemaining: 2,
      });

      expect(outcome.deaths).toEqual([]);
      expect(outcome.ancienLivesRemaining).toBe(1);
      expect(outcome.villagePowersLost).toBe(false);
    });

    it('ancien dies normally on second wolf attack', () => {
      const players = makePlayers(['Ancien']);
      const outcome = resolveNightOutcome({
        players,
        night: 2,
        stepSelections: { 'loup-garou': ['1'] },
        roleAssignments: { ancien: [1] },
        lovers: null,
        enfantModel: null,
        ancienLivesRemaining: 1,
      });

      expect(outcome.deaths).toEqual([{ playerId: 1, cause: 'loup-garou' }]);
      expect(outcome.ancienLivesRemaining).toBe(1);
    });

    it('lover chain death triggers correctly from wolf victim', () => {
      const players = makePlayers(['A', 'B', 'C']);
      const outcome = resolveNightOutcome({
        players,
        night: 1,
        stepSelections: { 'loup-garou': ['1'] },
        roleAssignments: {},
        lovers: [1, 2],
        enfantModel: null,
        ancienLivesRemaining: 2,
      });

      const ids = new Set(outcome.deaths.map((d) => d.playerId));
      expect(ids.has(1)).toBe(true);
      expect(ids.has(2)).toBe(true);
    });

    it('witch heal prevents wolf victim and lover chain', () => {
      const players = makePlayers(['A', 'B']);
      const outcome = resolveNightOutcome({
        players,
        night: 1,
        stepSelections: { 'loup-garou': ['1'], sorciere: ['__heal__'] },
        roleAssignments: {},
        lovers: [1, 2],
        enfantModel: null,
        ancienLivesRemaining: 2,
      });

      expect(outcome.deaths).toEqual([]);
    });

    it('loup-blanc-solo kill is recorded distinctly', () => {
      const players = makePlayers(['Wolf1', 'Wolf2', 'WB']);
      const outcome = resolveNightOutcome({
        players,
        night: 2,
        stepSelections: { 'loup-blanc-solo': ['1'] },
        roleAssignments: {},
        lovers: null,
        enfantModel: null,
        ancienLivesRemaining: 2,
      });

      expect(outcome.deaths).toEqual([{ playerId: 1, cause: 'loup-blanc' }]);
    });
  });

  describe('resolveDayOutcome', () => {
    it('eliminating ancien by vote removes village powers', () => {
      const players = makePlayers(['Ancien', 'Villager']);
      const outcome = resolveDayOutcome({
        players,
        roleAssignments: { ancien: [1] },
        lovers: null,
        enfantModel: null,
        votedPlayerId: 1,
      });

      expect(outcome.villagePowersLost).toBe(true);
      const ids = new Set(outcome.deaths.map((d) => d.playerId));
      expect(ids.has(1)).toBe(true);
    });

    it('lover chain from day vote kills both lovers', () => {
      const players = makePlayers(['A', 'B', 'C']);
      const outcome = resolveDayOutcome({
        players,
        roleAssignments: {},
        lovers: [1, 2],
        enfantModel: null,
        votedPlayerId: 1,
      });

      const ids = new Set(outcome.deaths.map((d) => d.playerId));
      expect(ids.has(1)).toBe(true);
      expect(ids.has(2)).toBe(true);
    });
  });

  describe('checkWin', () => {
    it('village wins when no wolves or white wolves alive', () => {
      const players = makePlayers(['A', 'B']);
      const result = checkWin(players, { 'loup-garou': [], 'loup-blanc': [] });
      expect(result).toBe('village');
    });

    it('wolves win when only wolves / white wolves remain', () => {
      const players: Player[] = [
        { id: 1, name: 'Wolf', isAlive: true },
        { id: 2, name: 'WB', isAlive: true },
      ];
      const result = checkWin(players, {
        'loup-garou': [1],
        'loup-blanc': [2],
      });
      expect(result).toBe('wolves');
    });

    it('white wolf solo win when only loup-blanc alive', () => {
      const players: Player[] = [
        { id: 1, name: 'WB', isAlive: true },
      ];
      const result = checkWin(players, {
        'loup-garou': [],
        'loup-blanc': [1],
      });
      expect(result).toBe('loup-blanc');
    });
  });
});

