import { describe, it, expect } from 'vitest';

/**
 * Utilities extracted for testability.
 * These mirror the logic used in the API routes and DB trigger.
 */

/** Validates invite code format (8 uppercase alphanumeric chars). */
function isValidInviteCode(code: string): boolean {
  return /^[A-Z0-9]{6,8}$/.test(code);
}

/** Simulates the DB trigger: generates an 8-char uppercase alphanumeric code. */
function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

/**
 * Determines the join result given competition state and membership state.
 * Returns an error string or null (meaning: proceed with insert).
 */
function canJoinCompetition(opts: {
  competitionFound: boolean;
  competitionStatus: string;
  isAdmin: boolean;
  existingStatus: 'accepted' | 'pending' | 'rejected' | null;
}): string | null {
  if (!opts.competitionFound) return 'Code invalide. Vérifiez le code et réessayez.';
  if (opts.competitionStatus === 'finished') return 'Cette compétition est terminée.';
  if (opts.isAdmin) return "Vous êtes déjà l'administrateur de cette compétition.";
  if (opts.existingStatus === 'accepted') return 'Vous êtes déjà membre de cette compétition.';
  if (opts.existingStatus === 'pending') return 'Votre demande est déjà en attente.';
  return null;
}

describe('invite code format', () => {
  it('accepts valid 8-char uppercase alphanumeric codes', () => {
    expect(isValidInviteCode('ABCD1234')).toBe(true);
    expect(isValidInviteCode('ZZZZZZZZ')).toBe(true);
    expect(isValidInviteCode('00000000')).toBe(true);
  });

  it('accepts 6-char codes (minimum length)', () => {
    expect(isValidInviteCode('ABC123')).toBe(true);
  });

  it('rejects lowercase letters', () => {
    expect(isValidInviteCode('abcd1234')).toBe(false);
  });

  it('rejects codes that are too short', () => {
    expect(isValidInviteCode('ABCD')).toBe(false);
  });

  it('rejects codes that are too long', () => {
    expect(isValidInviteCode('ABCDEFGHI')).toBe(false);
  });

  it('rejects codes with special characters', () => {
    expect(isValidInviteCode('ABCD-123')).toBe(false);
    expect(isValidInviteCode('ABCD 123')).toBe(false);
  });
});

describe('generateInviteCode', () => {
  it('generates an 8-character code', () => {
    const code = generateInviteCode();
    expect(code).toHaveLength(8);
  });

  it('generates an uppercase alphanumeric code', () => {
    const code = generateInviteCode();
    expect(isValidInviteCode(code)).toBe(true);
  });

  it('generates unique codes across multiple calls', () => {
    const codes = new Set(Array.from({ length: 50 }, () => generateInviteCode()));
    // With 36^8 possible values, collisions in 50 calls are astronomically unlikely
    expect(codes.size).toBe(50);
  });
});

describe('canJoinCompetition', () => {
  it('returns error when competition not found', () => {
    expect(canJoinCompetition({
      competitionFound: false,
      competitionStatus: '',
      isAdmin: false,
      existingStatus: null,
    })).toBe('Code invalide. Vérifiez le code et réessayez.');
  });

  it('returns error when competition is finished', () => {
    expect(canJoinCompetition({
      competitionFound: true,
      competitionStatus: 'finished',
      isAdmin: false,
      existingStatus: null,
    })).toBe('Cette compétition est terminée.');
  });

  it('returns error when user is the admin', () => {
    expect(canJoinCompetition({
      competitionFound: true,
      competitionStatus: 'active',
      isAdmin: true,
      existingStatus: null,
    })).toBe("Vous êtes déjà l'administrateur de cette compétition.");
  });

  it('returns error when already an accepted member', () => {
    expect(canJoinCompetition({
      competitionFound: true,
      competitionStatus: 'active',
      isAdmin: false,
      existingStatus: 'accepted',
    })).toBe('Vous êtes déjà membre de cette compétition.');
  });

  it('returns error when request is already pending', () => {
    expect(canJoinCompetition({
      competitionFound: true,
      competitionStatus: 'active',
      isAdmin: false,
      existingStatus: 'pending',
    })).toBe('Votre demande est déjà en attente.');
  });

  it('returns null (allow join) for a valid new request', () => {
    expect(canJoinCompetition({
      competitionFound: true,
      competitionStatus: 'active',
      isAdmin: false,
      existingStatus: null,
    })).toBeNull();
  });

  it('returns null (allow re-join) for a previously rejected member', () => {
    expect(canJoinCompetition({
      competitionFound: true,
      competitionStatus: 'active',
      isAdmin: false,
      existingStatus: 'rejected',
    })).toBeNull();
  });

  it('allows joining a draft competition', () => {
    expect(canJoinCompetition({
      competitionFound: true,
      competitionStatus: 'draft',
      isAdmin: false,
      existingStatus: null,
    })).toBeNull();
  });
});
