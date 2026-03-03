import { describe, it, expect } from 'vitest';
import {
  CHARACTERS,
  CHARACTER_COLORS,
  getNightCharactersForConfig,
  computeNightDeaths,
  type RoleConfigV2,
} from './game-data';

describe('game-data', () => {
  describe('CHARACTERS', () => {
    it('has unique ids', () => {
      const ids = CHARACTERS.map((c) => c.id);
      const unique = new Set(ids);
      expect(unique.size).toBe(ids.length);
    });

    it('all have valid wakeUpOrder for sortability', () => {
      const withOrder = CHARACTERS.filter((c) => c.wakeUpOrder > 0);
      const orders = withOrder.map((c) => c.wakeUpOrder);
      expect(orders.every((n) => typeof n === 'number' && !Number.isNaN(n))).toBe(true);
    });
  });

  describe('getNightCharactersForConfig', () => {
    it('returns only roles with count > 0', () => {
      const config: RoleConfigV2 = {
        'loup-garou': 2,
        voyante: 1,
        villageois: 3,
      };
      const night1 = getNightCharactersForConfig(config, 1);
      const roleIds = night1.map((c) => c.id);
      expect(roleIds).toContain('loup-garou');
      expect(roleIds).toContain('voyante');
      expect(roleIds).not.toContain('villageois');
    });

    it('filters out night1Only roles after night 1', () => {
      const config: RoleConfigV2 = { cupidon: 1, voyante: 1, 'loup-garou': 2 };
      const night1 = getNightCharactersForConfig(config, 1);
      const night2 = getNightCharactersForConfig(config, 2);
      expect(night1.map((c) => c.id)).toContain('cupidon');
      expect(night2.map((c) => c.id)).not.toContain('cupidon');
    });

    it('respects nightMin (e.g. loup-blanc-solo from night 2)', () => {
      const config: RoleConfigV2 = { 'loup-blanc': 1, 'loup-garou': 2 };
      const night1 = getNightCharactersForConfig(config, 1);
      const night2 = getNightCharactersForConfig(config, 2);
      expect(night1.map((c) => c.id)).not.toContain('loup-blanc-solo');
      expect(night2.map((c) => c.id)).toContain('loup-blanc-solo');
    });

    it('respects nightParity (loup-blanc-solo only on even nights)', () => {
      const config: RoleConfigV2 = { 'loup-blanc': 1, 'loup-garou': 2 };
      const night2 = getNightCharactersForConfig(config, 2);
      const night3 = getNightCharactersForConfig(config, 3);
      expect(night2.map((c) => c.id)).toContain('loup-blanc-solo');
      expect(night3.map((c) => c.id)).not.toContain('loup-blanc-solo');
    });

    it('sorts by wakeUpOrder', () => {
      const config: RoleConfigV2 = { cupidon: 1, 'enfant-sauvage': 1, voyante: 1, 'loup-garou': 2 };
      const night1 = getNightCharactersForConfig(config, 1);
      const orders = night1.map((c) => c.wakeUpOrder);
      for (let i = 1; i < orders.length; i++) {
        expect(orders[i]).toBeGreaterThanOrEqual(orders[i - 1]);
      }
    });

    it('returns empty array when no roles configured', () => {
      const night1 = getNightCharactersForConfig({}, 1);
      expect(night1).toEqual([]);
    });

    it('uses configKey for loup-blanc-solo (loup-blanc count)', () => {
      const config: RoleConfigV2 = { 'loup-blanc': 1, 'loup-garou': 2 };
      const night2 = getNightCharactersForConfig(config, 2);
      expect(night2.some((c) => c.id === 'loup-blanc-solo')).toBe(true);
    });
  });

  describe('computeNightDeaths', () => {
    it('returns empty set when no selections', () => {
      const deaths = computeNightDeaths({}, null);
      expect(deaths.size).toBe(0);
    });

    it('wolf victim dies when not healed', () => {
      const deaths = computeNightDeaths({ 'loup-garou': ['42'] }, null);
      expect(deaths.has(42)).toBe(true);
      expect(deaths.size).toBe(1);
    });

    it('wolf victim survives when healed by witch', () => {
      const deaths = computeNightDeaths(
        { 'loup-garou': ['42'], sorciere: ['__heal__'] },
        null
      );
      expect(deaths.has(42)).toBe(false);
      expect(deaths.size).toBe(0);
    });

    it('witch kill adds victim to deaths', () => {
      const deaths = computeNightDeaths({ sorciere: ['7'] }, null);
      expect(deaths.has(7)).toBe(true);
      expect(deaths.size).toBe(1);
    });

    it('loup-blanc-solo kill adds victim to deaths', () => {
      const deaths = computeNightDeaths({ 'loup-blanc-solo': ['10'] }, null);
      expect(deaths.has(10)).toBe(true);
      expect(deaths.size).toBe(1);
    });

    it('lover chain: if one lover dies, both die', () => {
      const deaths = computeNightDeaths(
        { 'loup-garou': ['1'] },
        [1, 2] as [number, number]
      );
      expect(deaths.has(1)).toBe(true);
      expect(deaths.has(2)).toBe(true);
      expect(deaths.size).toBe(2);
    });

    it('lover chain not triggered when wolf victim healed', () => {
      const deaths = computeNightDeaths(
        { 'loup-garou': ['1'], sorciere: ['__heal__'] },
        [1, 2] as [number, number]
      );
      expect(deaths.size).toBe(0);
    });

    it('deduplicates when same player has multiple death sources', () => {
      const deaths = computeNightDeaths(
        { 'loup-garou': ['5'], sorciere: ['5'] },
        null
      );
      expect(deaths.has(5)).toBe(true);
      expect(deaths.size).toBe(1);
    });

    it('witch can heal and kill in same night', () => {
      const deaths = computeNightDeaths(
        { 'loup-garou': ['1'], sorciere: ['__heal__', '2'] },
        null
      );
      expect(deaths.has(1)).toBe(false);
      expect(deaths.has(2)).toBe(true);
      expect(deaths.size).toBe(1);
    });
  });

  describe('CHARACTER_COLORS', () => {
    it('has entries for roles with normal target UI (maxTargets > 0)', () => {
      const withTargets = CHARACTERS.filter((c) => c.maxTargets > 0);
      for (const c of withTargets) {
        expect(CHARACTER_COLORS[c.id], `missing color for ${c.id}`).toBeDefined();
      }
    });
  });
});
