import type { Json } from './database.types';

export interface ComputePointsInput {
  claimedPlace: number | null;
  claimedPoints: number | null;
  basePoints: number;
  multiplier: number;
  /** Flat bonus awarded to every player for the game day. */
  bonusAllPlayers?: number;
}

/**
 * Single source of truth for how a game-day result converts to points.
 * Mirrored by the admin validation default and the player's live estimate so
 * the two never disagree.
 *
 * - Direct points: claimed_points × multiplier
 * - Placement: (base − (place − 1) × 2) × multiplier, floored at 0
 * - Neither: just the flat bonus
 */
export function computeResultPoints(input: ComputePointsInput): number {
  const bonus = input.bonusAllPlayers ?? 0;

  if (input.claimedPoints != null && Number.isFinite(input.claimedPoints)) {
    return Math.round(input.claimedPoints * input.multiplier) + bonus;
  }

  if (input.claimedPlace != null && Number.isFinite(input.claimedPlace)) {
    return (
      Math.max(0, Math.round((input.basePoints - (input.claimedPlace - 1) * 2) * input.multiplier)) +
      bonus
    );
  }

  return bonus;
}

/** Reads the flat per-player bonus from a game day's `bonus_config` JSON. */
export function getAllPlayersBonus(bonusConfig: Json): number {
  if (typeof bonusConfig === 'object' && bonusConfig !== null && !Array.isArray(bonusConfig)) {
    const value = (bonusConfig as Record<string, unknown>).all_players_bonus;
    return typeof value === 'number' ? value : 0;
  }
  return 0;
}
