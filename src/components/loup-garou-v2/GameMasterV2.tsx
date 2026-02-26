import { useState, useCallback } from 'react';
import { Users } from 'lucide-react';
import { NIGHT_CHARACTERS, type Player, type Character } from './game-data';
import { GameSetupV2 } from './GameSetupV2';
import { CharacterCardV2 } from './CharacterCardV2';
import { PlayerRecapV2 } from './PlayerRecapV2';
import { VillageWakeV2 } from './VillageWakeV2';

type Phase = 'setup' | 'night' | 'wake';

interface GameMasterV2Props {
  onNewGame: () => void;
}

export function GameMasterV2({ onNewGame }: GameMasterV2Props) {
  const [phase, setPhase] = useState<Phase>('setup');
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [recapOpen, setRecapOpen] = useState(false);
  const [witchPotions, setWitchPotions] = useState({ life: true, death: true });

  const handleStart = useCallback((newPlayers: Player[]) => {
    setPlayers(newPlayers);
    setPhase('night');
    setCurrentStep(0);
  }, []);

  const handleAssignRole = useCallback((playerId: number, character: Character) => {
    setPlayers((prev) =>
      prev.map((p) => {
        if (p.id === playerId) {
          return { ...p, role: p.role?.id === character.id ? null : character };
        }
        return p;
      })
    );
  }, []);

  const handleNext = useCallback(() => {
    if (currentStep < NIGHT_CHARACTERS.length - 1) {
      setCurrentStep((s) => s + 1);
    }
  }, [currentStep]);

  const handleWakeVillage = useCallback(() => {
    setPhase('wake');
  }, []);

  const handleNewNight = useCallback(() => {
    setPhase('night');
    setCurrentStep(0);
  }, []);

  const handleRestart = useCallback(() => {
    onNewGame();
  }, [onNewGame]);

  return (
    <div className="relative min-h-screen bg-gray-950">
      {/* Top Bar */}
      {phase !== 'setup' && (
        <div className="fixed left-0 right-0 top-0 z-40 flex items-center justify-between border-b border-gray-800 bg-gray-900/90 px-4 py-3 backdrop-blur-md">
          <div className="flex items-center gap-3">
            {phase === 'night' && (
              <>
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-900/50 text-xs font-bold text-violet-400">
                  {currentStep + 1}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-100">
                    {NIGHT_CHARACTERS[currentStep]?.name}
                  </p>
                  <p className="text-xs text-gray-400">
                    Étape {currentStep + 1}/{NIGHT_CHARACTERS.length}
                  </p>
                </div>
              </>
            )}
            {phase === 'wake' && (
              <p className="text-sm font-semibold text-gray-100">Phase de jour</p>
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
              {players.length}
            </span>
          </button>
        </div>
      )}

      {/* Step Progress Bar */}
      {phase === 'night' && (
        <div className="fixed left-0 right-0 top-[57px] z-30 h-0.5 bg-gray-800">
          <div
            className="h-full bg-violet-600 transition-all duration-500"
            style={{
              width: `${((currentStep + 1) / NIGHT_CHARACTERS.length) * 100}%`,
            }}
          />
        </div>
      )}

      {/* Main Content */}
      <div className={phase !== 'setup' ? 'pt-[60px]' : ''}>
        {phase === 'setup' && <GameSetupV2 onStart={handleStart} />}

        {phase === 'night' && NIGHT_CHARACTERS[currentStep] && (
          <CharacterCardV2
            key={NIGHT_CHARACTERS[currentStep].id}
            character={NIGHT_CHARACTERS[currentStep]}
            players={players}
            isLast={currentStep === NIGHT_CHARACTERS.length - 1}
            onAssignRole={handleAssignRole}
            onNext={handleNext}
            onWakeVillage={handleWakeVillage}
            witchPotions={witchPotions}
          />
        )}

        {phase === 'wake' && (
          <VillageWakeV2
            players={players}
            onNewNight={handleNewNight}
            onRestart={handleRestart}
          />
        )}
      </div>

      {/* Recap Panel */}
      <PlayerRecapV2
        players={players}
        isOpen={recapOpen}
        onClose={() => setRecapOpen(false)}
      />
    </div>
  );
}
