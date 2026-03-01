import { useCallback, useState } from "react";
import { ChevronRight, Sun, Eye, UserCheck, ChevronDown } from "lucide-react";
import type { Character, Player } from "./game-data";
import { CHARACTER_COLORS } from "./game-data";

const HEAL_TOKEN = "__heal__";

interface CharacterCardV2Props {
  character: Character;
  allPlayers: Player[];
  alivePlayers: Player[];
  /** Filtered target list (e.g. wolves excluded for loup-garou card) */
  targetPlayers: Player[];
  isLast: boolean;
  // Target selection
  selection: string[];
  onSelectionChange: (ids: string[]) => void;
  // Role assignment
  assignedPlayerIds: number[];
  requiredAssignCount: number;
  /** Player IDs already assigned to another role */
  takenPlayerIds: Set<number>;
  onToggleAssignPlayer: (playerId: number) => void;
  /** Loup-blanc-solo: true when GM must first pick which pool player is the white wolf (night 2) */
  loupBlancSoloAssignMode?: boolean;
  /** Loups-Garous card: pool includes Loup-Blanc (who will be designated on night 2) */
  wolfPoolIncludesLoupBlanc?: boolean;
  // Navigation
  onNext: () => void;
  onWakeVillage: () => void;
  // Witch/Cupidon context
  wolfVictimId: number | null;
  witchHealUsed: boolean;
  witchKillUsed: boolean;
  lovers: [number, number] | null;
  /** When Renard has chosen 3 players: true = at least one wolf in group (GM hint) */
  renardWolfInGroup?: boolean;
}

function TeamBadge({ team }: { team: Character["team"] }) {
  const config = {
    loups: { label: "Loups-Garous", className: "bg-red-900/30 text-red-400" },
    village: {
      label: "Village",
      className: "bg-violet-900/30 text-violet-400",
    },
    solo: { label: "Solitaire", className: "bg-gray-700 text-gray-400" },
  };
  const { label, className } = config[team];
  return (
    <span
      className={`inline-block rounded-md px-2 py-0.5 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
}

/** Role assignment panel — collapses to a summary pill once complete */
function RoleAssignSection({
  character,
  allPlayers,
  assignedPlayerIds,
  requiredAssignCount,
  takenPlayerIds,
  onToggle,
}: {
  character: Character;
  allPlayers: Player[];
  assignedPlayerIds: number[];
  requiredAssignCount: number;
  /** IDs already assigned to a different role — cannot be picked here */
  takenPlayerIds: Set<number>;
  onToggle: (id: number) => void;
}) {
  const isComplete = assignedPlayerIds.length >= requiredAssignCount;
  const [open, setOpen] = useState(!isComplete);

  const assignedNames = assignedPlayerIds
    .map((id) => allPlayers.find((p) => p.id === id))
    .filter((p): p is Player => p != null && p.isAlive)
    .map((p) => p.name)
    .join(", ");

  return (
    <div className="mb-4 rounded-lg border border-gray-800 bg-gray-900 overflow-hidden">
      {/* Header — always visible, toggles open/closed */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <UserCheck
            className={`h-4 w-4 ${isComplete ? "text-emerald-400" : "text-amber-400"}`}
          />
          <span
            className={`text-sm font-semibold ${isComplete ? "text-emerald-400" : "text-amber-400"}`}
          >
            {isComplete ? assignedNames : "Attribution du rôle"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {!isComplete && (
            <span className="text-xs font-medium text-gray-500">
              {assignedPlayerIds.length}/{requiredAssignCount}
            </span>
          )}
          <ChevronDown
            className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {/* Expandable body */}
      {open && (
        <div className="border-t border-gray-800 px-4 pb-4 pt-3">
          <div className="flex flex-wrap gap-2">
            {allPlayers.map((p) => {
              const isAssigned = assignedPlayerIds.includes(p.id);
              const isTaken = !isAssigned && takenPlayerIds.has(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={isTaken}
                  onClick={() => {
                    onToggle(p.id);
                    // Auto-collapse once the last required slot is filled
                    if (
                      !isAssigned &&
                      assignedPlayerIds.length + 1 >= requiredAssignCount
                    ) {
                      setOpen(false);
                    }
                  }}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    isAssigned
                      ? "border-amber-600 bg-amber-600 text-white"
                      : isTaken
                        ? "cursor-not-allowed border-gray-800 bg-gray-900 text-gray-600 line-through"
                        : p.isAlive
                          ? "border-gray-700 bg-gray-800 text-gray-200 hover:border-amber-700 hover:text-amber-300"
                          : "border-gray-800 bg-gray-900 text-gray-600 line-through"
                  }`}
                >
                  {p.name}
                </button>
              );
            })}
          </div>
          {!isComplete && (
            <p className="mt-3 text-xs text-gray-500">
              Choisissez{" "}
              {requiredAssignCount === 1
                ? "le joueur qui a ce rôle"
                : `les ${requiredAssignCount} joueurs qui ont ce rôle`}{" "}
              avant de continuer.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function NightActionCollapsible({ nightAction }: { nightAction: string }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="mb-4 rounded-lg border border-gray-800 bg-gray-900 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-violet-400" />
          <span className="text-sm font-semibold text-violet-400">
            Action de nuit
          </span>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="border-t border-gray-800 px-4 pb-4 pt-3">
          <p className="text-sm leading-relaxed text-gray-300">{nightAction}</p>
        </div>
      )}
    </div>
  );
}

function TargetButtons({
  character,
  alivePlayers,
  selection,
  onSelectionChange,
}: {
  character: Character;
  alivePlayers: Player[];
  selection: string[];
  onSelectionChange: (ids: string[]) => void;
}) {
  const colors = CHARACTER_COLORS[character.id];
  const maxTargets = character.maxTargets;

  const toggle = useCallback(
    (id: string) => {
      const selected = new Set(selection);
      if (selected.has(id)) {
        selected.delete(id);
        return onSelectionChange([...selected]);
      }
      if (maxTargets === 1) return onSelectionChange([id]);
      if (selected.size < maxTargets) {
        selected.add(id);
        onSelectionChange([...selected]);
      }
    },
    [selection, maxTargets, onSelectionChange],
  );

  if (!colors || maxTargets === 0) return null;

  const label =
    maxTargets === 1
      ? "Choisir 1 joueur"
      : `Choisir ${maxTargets} joueurs (${selection.length}/${maxTargets})`;

  return (
    <div className="mb-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-500">
        {label}
      </p>
      <div className="flex flex-wrap gap-2">
        {alivePlayers.map((p) => {
          const isSelected = selection.includes(String(p.id));
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => toggle(String(p.id))}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                isSelected ? colors.selected : colors.idle
              }`}
            >
              {p.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function WitchTargets({
  allPlayers,
  alivePlayers,
  wolfVictimId,
  healUsed,
  killUsed,
  selection,
  onSelectionChange,
}: {
  allPlayers: Player[];
  alivePlayers: Player[];
  wolfVictimId: number | null;
  healUsed: boolean;
  killUsed: boolean;
  selection: string[];
  onSelectionChange: (ids: string[]) => void;
}) {
  const wolfVictim = allPlayers.find((p) => p.id === wolfVictimId) ?? null;
  const isHealed = selection.includes(HEAL_TOKEN);
  const killTarget = selection.find((id) => id !== HEAL_TOKEN) ?? null;

  const toggleHeal = () => {
    const next = selection.filter((id) => id !== HEAL_TOKEN);
    if (!isHealed) next.unshift(HEAL_TOKEN);
    onSelectionChange(next);
  };

  const toggleKill = (id: string) => {
    const healPart = isHealed ? [HEAL_TOKEN] : [];
    onSelectionChange(killTarget === id ? healPart : [...healPart, id]);
  };

  return (
    <div className="mb-4 space-y-4">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-500">
          Potion de guérison
        </p>
        {healUsed ? (
          <p className="text-sm text-gray-600">Déjà utilisée cette partie.</p>
        ) : wolfVictim ? (
          <button
            type="button"
            onClick={toggleHeal}
            className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
              isHealed
                ? "border-emerald-600 bg-emerald-600 text-white"
                : "border-emerald-800 bg-emerald-950/40 text-emerald-300"
            }`}
          >
            {isHealed ? "✓ " : ""}Guérir {wolfVictim.name}
          </button>
        ) : (
          <p className="text-sm text-gray-600">
            Aucune victime désignée par les loups.
          </p>
        )}
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-500">
          Potion de mort
        </p>
        {killUsed ? (
          <p className="text-sm text-gray-600">Déjà utilisée cette partie.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {alivePlayers.map((p) => {
              const isSelected = killTarget === String(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggleKill(String(p.id))}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    isSelected
                      ? "border-red-700 bg-red-700 text-white"
                      : "border-red-800 bg-red-950/40 text-red-300"
                  }`}
                >
                  {p.name}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function CharacterCardV2({
  character,
  allPlayers,
  alivePlayers,
  targetPlayers,
  isLast,
  selection,
  onSelectionChange,
  assignedPlayerIds,
  requiredAssignCount,
  takenPlayerIds,
  onToggleAssignPlayer,
  loupBlancSoloAssignMode,
  wolfPoolIncludesLoupBlanc,
  onNext,
  onWakeVillage,
  wolfVictimId,
  witchHealUsed,
  witchKillUsed,
  lovers,
  renardWolfInGroup,
}: CharacterCardV2Props) {
  const isAssigned = loupBlancSoloAssignMode
    ? selection.length === 1
    : assignedPlayerIds.length >= requiredAssignCount;

  // For cupidon on subsequent nights (lovers already set), show lovers info
  const loversAlreadySet = character.id === "cupidon" && lovers !== null;
  const loverNames = lovers
    ? lovers.map((id) => allPlayers.find((p) => p.id === id)?.name ?? "?")
    : [];

  return (
    <div className="flex flex-col items-center justify-start bg-gray-950 px-4 pt-20 pb-20">
      <div className="w-full max-w-sm">
        {/* Character Image */}
        <div className="relative mb-4 overflow-hidden rounded-xl border border-gray-800">
          <img
            src={character.image}
            alt={character.name}
            className="aspect-[4/3] w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-transparent" />
          <div className="absolute bottom-3 left-3 right-3">
            <h2 className="text-xl font-bold text-gray-100 drop-shadow-lg">
              {character.name}
            </h2>
            <TeamBadge team={character.team} />
          </div>
        </div>

        {/* Night Action — déroulant */}
        <NightActionCollapsible nightAction={character.nightAction} />

        {/* Role assignment (hidden for sub-step roles like loup-blanc-solo) */}
        {requiredAssignCount > 0 && (
          <>
            <RoleAssignSection
              character={character}
              allPlayers={allPlayers}
              assignedPlayerIds={assignedPlayerIds}
              requiredAssignCount={requiredAssignCount}
              takenPlayerIds={takenPlayerIds}
              onToggle={onToggleAssignPlayer}
            />
            {wolfPoolIncludesLoupBlanc && (
              <p className="mb-4 text-xs text-gray-500">
                Ce groupe inclut le Loup-Blanc.
              </p>
            )}
          </>
        )}

        {/* Target / action section — after role assigned, or loup-blanc-solo assign mode */}
        {(isAssigned ||
          (character.id === "loup-blanc-solo" && loupBlancSoloAssignMode)) && (
          <>
            {loversAlreadySet ? (
              <div className="mb-4 rounded-lg border border-pink-900/50 bg-pink-950/20 p-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-pink-400 mb-1">
                  Amoureux désignés (nuit 1)
                </p>
                <p className="text-sm text-pink-300">
                  {loverNames.join(" & ")}
                </p>
              </div>
            ) : character.id === "renard" &&
              selection.length === 3 &&
              renardWolfInGroup !== undefined ? (
              <div className="mb-4 space-y-4">
                <TargetButtons
                  character={character}
                  alivePlayers={targetPlayers}
                  selection={selection}
                  onSelectionChange={onSelectionChange}
                />
                <div className="rounded-lg border border-amber-800/50 bg-amber-950/30 px-3 py-2">
                  <p className="text-xs font-semibold uppercase tracking-widest text-amber-500/90">
                    Indication MDJ
                  </p>
                  <p className="text-sm text-amber-200">
                    Au moins un loup dans le groupe :{" "}
                    <strong>{renardWolfInGroup ? "Oui" : "Non"}</strong>
                    {!renardWolfInGroup && (
                      <span className="mt-1 block text-xs text-amber-400/80">
                        Le Renard perd son pouvoir.
                      </span>
                    )}
                  </p>
                </div>
              </div>
            ) : character.id === "loup-blanc-solo" &&
              loupBlancSoloAssignMode ? (
              <div className="mb-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-500">
                  Qui est le Loup-Blanc ?
                </p>
                <p className="mb-3 text-sm text-gray-400">
                  Choisissez le joueur qui sera le Loup-Blanc (il quitte le
                  groupe des Loups-Garous).
                </p>
                <TargetButtons
                  character={{ ...character, maxTargets: 1 }}
                  alivePlayers={targetPlayers}
                  selection={selection}
                  onSelectionChange={onSelectionChange}
                />
              </div>
            ) : character.id === "sorciere" ? (
              <WitchTargets
                allPlayers={allPlayers}
                alivePlayers={targetPlayers}
                wolfVictimId={wolfVictimId}
                healUsed={witchHealUsed}
                killUsed={witchKillUsed}
                selection={selection}
                onSelectionChange={onSelectionChange}
              />
            ) : (
              <TargetButtons
                character={character}
                alivePlayers={targetPlayers}
                selection={selection}
                onSelectionChange={onSelectionChange}
              />
            )}
          </>
        )}

        {/* Navigation */}
        {!isLast ? (
          <button
            type="button"
            onClick={onNext}
            disabled={!isAssigned}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-500 active:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Personnage suivant
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onWakeVillage}
            disabled={!isAssigned}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-500 active:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Sun className="h-4 w-4" />
            Réveil du village
          </button>
        )}
      </div>
    </div>
  );
}
