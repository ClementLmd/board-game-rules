import { useState, useCallback, useMemo } from 'react';
import { Users } from 'lucide-react';
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

type Phase = 'setup' | 'roleConfig' | 'night' | 'wake' | 'day';

interface GameMasterV2Props {
  onNewGame: () => void;
}

/** Returns true if the role should still appear in the night sequence. */
function isRoleActive(
  char: Character,
  roleAssignments: Record<string, number[]>,
  players: Player[]
): boolean {
  const assigned = roleAssignments[char.id] ?? [];
  if (assigned.length === 0) return true; // not yet assigned — keep it so GM can assign
  return assigned.some((id) => players.find((p) => p.id === id)?.isAlive);
}

export function GameMasterV2({ onNewGame }: GameMasterV2Props) {
  const [phase, setPhase] = useState<Phase>('setup');
  const [players, setPlayers] = useState<Player[]>([]);
  const [roleConfig, setRoleConfig] = useState<RoleConfigV2>({});
  const [night, setNight] = useState(1);
  const [currentStep, setCurrentStep] = useState(0);
  const [recapOpen, setRecapOpen] = useState(false);

  /** Target selections for the current night, keyed by character id */
  const [stepSelections, setStepSelections] = useState<Record<string, string[]>>({});
  /** Which player IDs are assigned to each role, persists across nights */
  const [roleAssignments, setRoleAssignments] = useState<Record<string, number[]>>({});
  /** Cupidon's lovers, set on night 1, persists for the whole game */
  const [lovers, setLovers] = useState<[number, number] | null>(null);
  /** Witch potion flags, persists */
  const [witchHealUsed, setWitchHealUsed] = useState(false);
  const [witchKillUsed, setWitchKillUsed] = useState(false);

  const alivePlayers = useMemo(() => players.filter((p) => p.isAlive), [players]);

  // Night characters: filtered by roleConfig, night1Only, and alive status
  const nightCharacters = useMemo(
    () =>
      getNightCharactersForConfig(roleConfig, night).filter((c) =>
        isRoleActive(c, roleAssignments, players)
      ),
    [roleConfig, night, roleAssignments, players]
  );

  const currentChar = nightCharacters[currentStep];
  const currentSelection = stepSelections[currentChar?.id ?? ''] ?? [];
  const currentAssigned = roleAssignments[currentChar?.id ?? ''] ?? [];

  // For wolves: exclude themselves from targets
  const targetPlayers = useMemo(() => {
    if (currentChar?.id === 'loup-garou') {
      const wolfIds = new Set(roleAssignments['loup-garou'] ?? []);
      return alivePlayers.filter((p) => !wolfIds.has(p.id));
    }
    return alivePlayers;
  }, [currentChar, alivePlayers, roleAssignments]);

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
      if (!currentChar) return;
      const required = roleConfig[currentChar.id] ?? 1;
      setRoleAssignments((prev) => {
        const current = prev[currentChar.id] ?? [];
        if (current.includes(playerId)) {
          return { ...prev, [currentChar.id]: current.filter((id) => id !== playerId) };
        }
        if (current.length >= required) {
          return required === 1
            ? { ...prev, [currentChar.id]: [playerId] }
            : prev;
        }
        return { ...prev, [currentChar.id]: [...current, playerId] };
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
    if (currentChar?.id === 'sorciere') commitWitchPotions();
    setCurrentStep((s) => s + 1);
  }, [currentChar, commitWitchPotions]);

  const handleWakeVillage = useCallback(() => {
    if (currentChar?.id === 'sorciere') commitWitchPotions();

    // Commit cupidon lovers from night 1
    if (!lovers) {
      const cupidonSel = stepSelections['cupidon'] ?? [];
      if (cupidonSel.length === 2) {
        setLovers([Number(cupidonSel[0]), Number(cupidonSel[1])]);
      }
    }

    // Apply night deaths to players
    const deathIds = computeNightDeaths(stepSelections, lovers);
    if (deathIds.size > 0) {
      setPlayers((prev) =>
        prev.map((p) => (deathIds.has(p.id) ? { ...p, isAlive: false } : p))
      );
    }

    setPhase('wake');
  }, [currentChar, commitWitchPotions, lovers, stepSelections]);

  // ── Day voting ────────────────────────────────────────────────────────────
  const handleDayPhase = useCallback(() => {
    setPhase('day');
  }, []);

  const handleDayElimination = useCallback(
    (playerId: number | null) => {
      if (playerId !== null) {
        // Apply day death + lover chain
        const directDeath = new Set([playerId]);
        if (lovers) {
          if (lovers[0] === playerId || lovers[1] === playerId) {
            directDeath.add(lovers[0]);
            directDeath.add(lovers[1]);
          }
        }
        setPlayers((prev) =>
          prev.map((p) => (directDeath.has(p.id) ? { ...p, isAlive: false } : p))
        );
      }
      setStepSelections({});
      setCurrentStep(0);
      setNight((n) => n + 1);
      setPhase('night');
    },
    [lovers]
  );

  // ── Derived ───────────────────────────────────────────────────────────────
  const wolfVictimId = useMemo(() => {
    const sel = stepSelections['loup-garou'] ?? [];
    return sel.length > 0 ? Number(sel[0]) : null;
  }, [stepSelections]);

  const isNightPhase = phase === 'night' || phase === 'wake' || phase === 'day';

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
          </div>
          <button
            onClick={() => setRecapOpen(true)}
            className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-100 transition-colors hover:bg-gray-700"
            aria-label="Voir les joueurs"
          >
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Joueurs</span>
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-violet-900/50 px-1 text-xs font-bold text-violet-400">
              {alivePlayers.length}
            </span>
          </button>
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

      {/* Main Content */}
      <div className={isNightPhase ? 'pt-[60px]' : ''}>
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
            requiredAssignCount={roleConfig[currentChar.id] ?? 1}
            onToggleAssignPlayer={handleToggleAssign}
            onNext={handleNext}
            onWakeVillage={handleWakeVillage}
            wolfVictimId={wolfVictimId}
            witchHealUsed={witchHealUsed}
            witchKillUsed={witchKillUsed}
            lovers={lovers}
          />
        )}

        {phase === 'wake' && (
          <VillageWakeV2
            players={players}
            stepSelections={stepSelections}
            lovers={lovers}
            onDayPhase={handleDayPhase}
            onRestart={onNewGame}
          />
        )}

        {phase === 'day' && (
          <DayPhaseV2
            alivePlayers={alivePlayers}
            onEliminate={handleDayElimination}
          />
        )}
      </div>

      {/* Recap Panel */}
      <PlayerRecapV2
        players={players}
        lovers={lovers}
        isOpen={recapOpen}
        onClose={() => setRecapOpen(false)}
      />
    </div>
  );
}
