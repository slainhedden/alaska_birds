import { Binoculars, BookOpen, Headphones, Layers, ListFilter } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { BirdCard } from "./components/BirdCard";
import { BirdDetail } from "./components/BirdDetail";
import { BirdFilters, type BirdFilterState } from "./components/BirdFilters";
import { Flashcards } from "./components/Flashcards";
import { ProgressSummary } from "./components/ProgressSummary";
import { Quiz } from "./components/Quiz";
import { SoundQuiz } from "./components/SoundQuiz";
import { birds } from "./data/birds";
import type { AppMode, Bird, HabitatTag, Mastery } from "./types";
import { habitatLabels, sortBirds } from "./utils/birds";
import { loadProgress, recordAnswer, resetProgress, saveProgress, updateMastery } from "./utils/progress";

const sortedBirds = sortBirds(birds);

const modeConfig: Array<{ mode: AppMode; label: string; icon: typeof Binoculars }> = [
  { mode: "browse", label: "Browse", icon: Binoculars },
  { mode: "flashcards", label: "Cards", icon: Layers },
  { mode: "quiz", label: "Quiz", icon: BookOpen },
  { mode: "sound", label: "Sound", icon: Headphones },
];

const defaultFilters: BirdFilterState = {
  search: "",
  likelihood: "all",
  habitat: "all",
};

export default function App() {
  const [mode, setMode] = useState<AppMode>("browse");
  const [filters, setFilters] = useState(defaultFilters);
  const [selectedId, setSelectedId] = useState(sortedBirds[0]?.id ?? "");
  const [progress, setProgress] = useState(() => loadProgress(sortedBirds));

  useEffect(() => {
    saveProgress(progress);
  }, [progress]);

  const habitats = useMemo(() => {
    const unique = new Set<HabitatTag>();
    sortedBirds.forEach((bird) => bird.habitats.forEach((habitat) => unique.add(habitat)));
    return [...unique].sort((left, right) => habitatLabels[left].localeCompare(habitatLabels[right]));
  }, []);

  const filteredBirds = useMemo(() => {
    const query = filters.search.trim().toLowerCase();
    return sortedBirds.filter((bird) => {
      const matchesSearch =
        query.length === 0 ||
        [
          bird.commonName,
          bird.scientificName,
          bird.habitat,
          bird.quickHint,
          bird.memoryHook,
          bird.sound.description,
          bird.sound.mnemonic,
          bird.fieldMarks.join(" "),
          bird.learningTags.join(" "),
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);
      const matchesLikelihood =
        filters.likelihood === "all" || bird.likelihood === filters.likelihood;
      const matchesHabitat = filters.habitat === "all" || bird.habitats.includes(filters.habitat);
      return matchesSearch && matchesLikelihood && matchesHabitat;
    });
  }, [filters]);

  const selectedBird = filteredBirds.find((bird) => bird.id === selectedId) ?? filteredBirds[0] ?? sortedBirds[0];

  function handleSelect(bird: Bird) {
    setSelectedId(bird.id);
    setMode("browse");
  }

  function handleMastery(birdId: string, mastery: Mastery) {
    setProgress((current) => updateMastery(current, birdId, mastery));
  }

  function handleAnswer(birdId: string, isCorrect: boolean) {
    setProgress((current) => recordAnswer(current, birdId, isCorrect));
  }

  function handleReset() {
    setProgress(resetProgress(sortedBirds));
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <span className="eyebrow">Southcentral Alaska · mid-June</span>
          <h1>Talkeetna Bird Learner</h1>
          <p>Indian River cabin woods, wetlands, lakes, rail corridor, and mountain edges.</p>
        </div>
        <nav className="mode-tabs" aria-label="Learning modes">
          {modeConfig.map((item) => {
            const Icon = item.icon;
            return (
              <button
                className={mode === item.mode ? "active" : ""}
                data-testid={`mode-${item.mode}`}
                key={item.mode}
                onClick={() => setMode(item.mode)}
                type="button"
              >
                <Icon size={18} /> {item.label}
              </button>
            );
          })}
        </nav>
      </header>

      <ProgressSummary birds={sortedBirds} onReset={handleReset} progress={progress} />

      <BirdFilters filters={filters} habitats={habitats} onChange={setFilters} />

      <section className="deck-status" aria-live="polite">
        <ListFilter size={16} />
        <span data-testid="result-count">
          {filteredBirds.length} of {sortedBirds.length} birds
        </span>
      </section>

      {mode === "browse" ? (
        <div className="browse-layout">
          <section className="bird-grid" aria-label="Bird deck">
            {filteredBirds.map((bird) => (
              <BirdCard
                bird={bird}
                isSelected={selectedBird.id === bird.id}
                key={bird.id}
                mastery={progress[bird.id]?.mastery ?? "new"}
                onSelect={handleSelect}
              />
            ))}
          </section>
          <BirdDetail
            bird={selectedBird}
            mastery={progress[selectedBird.id]?.mastery ?? "new"}
            onMastery={handleMastery}
          />
        </div>
      ) : null}

      {mode === "flashcards" ? (
        <Flashcards
          birds={filteredBirds.length > 0 ? filteredBirds : sortedBirds}
          getMastery={(birdId) => progress[birdId]?.mastery ?? "new"}
          onMastery={handleMastery}
        />
      ) : null}

      {mode === "quiz" ? (
        <Quiz birds={filteredBirds.length >= 4 ? filteredBirds : sortedBirds} onAnswer={handleAnswer} />
      ) : null}

      {mode === "sound" ? (
        <SoundQuiz birds={filteredBirds.length >= 4 ? filteredBirds : sortedBirds} onAnswer={handleAnswer} />
      ) : null}
    </main>
  );
}
