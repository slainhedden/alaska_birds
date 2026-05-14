import {
  Binoculars,
  BookOpen,
  CircleHelp,
  Headphones,
  Layers,
  Settings,
  Sun,
  UserCircle,
  X,
} from "lucide-react";
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
const favoriteStorageKey = "talkeetna-bird-favorites-v1";

const modeConfig: Array<{ mode: AppMode; label: string; icon: typeof Binoculars }> = [
  { mode: "browse", label: "Browse", icon: Binoculars },
  { mode: "flashcards", label: "Cards", icon: Layers },
  { mode: "quiz", label: "Quiz", icon: BookOpen },
  { mode: "sound", label: "Sounds", icon: Headphones },
];

const defaultFilters: BirdFilterState = {
  search: "",
  likelihood: "all",
  habitat: "all",
  favoritesOnly: false,
};

const pageCopy: Record<AppMode, { title: string; description: string }> = {
  browse: {
    title: "Birds",
    description: "Explore birds you're most likely to see or hear on your trip.",
  },
  flashcards: {
    title: "Flashcards",
    description: "Learn birds with spaced repetition flashcards.",
  },
  quiz: {
    title: "Quiz",
    description: "Test your knowledge by identifying birds.",
  },
  sound: {
    title: "Sound Quiz",
    description: "Listen to the audio and identify the bird.",
  },
};

const likelihoodSections: Array<Bird["likelihood"]> = ["common", "possible", "uncommon"];

export default function App() {
  const [mode, setMode] = useState<AppMode>("browse");
  const [filters, setFilters] = useState(defaultFilters);
  const [selectedId, setSelectedId] = useState(sortedBirds[0]?.id ?? "");
  const [isCompactViewport, setIsCompactViewport] = useState(false);
  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false);
  const [isDesktopDetailOpen, setIsDesktopDetailOpen] = useState(false);
  const [progress, setProgress] = useState(() => loadProgress(sortedBirds));
  const [favorites, setFavorites] = useState<Set<string>>(() => loadFavorites());

  useEffect(() => {
    saveProgress(progress);
  }, [progress]);

  useEffect(() => {
    window.localStorage.setItem(favoriteStorageKey, JSON.stringify([...favorites]));
  }, [favorites]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 980px)");

    function updateViewportState() {
      setIsCompactViewport(media.matches);
      if (!media.matches) {
        setIsMobileDetailOpen(false);
      } else {
        setIsDesktopDetailOpen(false);
      }
    }

    updateViewportState();
    media.addEventListener("change", updateViewportState);
    return () => media.removeEventListener("change", updateViewportState);
  }, []);

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
      const matchesFavorite = !filters.favoritesOnly || favorites.has(bird.id);
      return matchesSearch && matchesLikelihood && matchesHabitat && matchesFavorite;
    });
  }, [favorites, filters]);

  const selectedBird = filteredBirds.find((bird) => bird.id === selectedId) ?? filteredBirds[0] ?? sortedBirds[0];
  const currentPage = pageCopy[mode];
  const groupedBirds = likelihoodSections
    .map((likelihood) => ({
      likelihood,
      birds: filteredBirds.filter((bird) => bird.likelihood === likelihood),
    }))
    .filter((section) => section.birds.length > 0);

  function handleSelect(bird: Bird) {
    setSelectedId(bird.id);
    setMode("browse");
    if (isCompactViewport) {
      setIsMobileDetailOpen(true);
    } else {
      setIsDesktopDetailOpen(true);
    }
  }

  function handleMode(nextMode: AppMode) {
    setMode(nextMode);
    if (nextMode !== "browse") {
      setIsMobileDetailOpen(false);
      setIsDesktopDetailOpen(false);
    }
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

  function handleToggleFavorite(birdId: string) {
    setFavorites((current) => {
      const next = new Set(current);
      if (next.has(birdId)) {
        next.delete(birdId);
      } else {
        next.add(birdId);
      }
      return next;
    });
  }

  return (
    <main className="app-shell">
      <div className="app-frame">
        <header className="topbar">
          <a className="brand-lockup" href={import.meta.env.BASE_URL} aria-label="Alaska Bird Guide home">
            <img src={`${import.meta.env.BASE_URL}logo.png`} alt="" />
          </a>
          <div className="trip-context">
            <strong>Southcentral Alaska</strong>
            <span>Talkeetna Mountains / Indian River Area</span>
          </div>
          <nav className="mode-tabs" aria-label="Learning modes">
            {modeConfig.map((item) => {
              return (
                <button
                  className={mode === item.mode ? "active" : ""}
                  data-testid={`mode-${item.mode}`}
                  key={item.mode}
                  onClick={() => handleMode(item.mode)}
                  type="button"
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
          <div className="topbar-actions" aria-label="Display controls">
            <button aria-label="Settings" type="button">
              <Settings size={18} />
            </button>
            <button aria-label="Account" type="button">
              <UserCircle size={18} />
            </button>
            <button aria-label="Theme" type="button">
              <Sun size={18} />
            </button>
          </div>
        </header>

        <div className="app-body">
          <aside className="side-rail" aria-label="App sections">
            <nav className="side-nav">
              {modeConfig.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    className={mode === item.mode ? "active" : ""}
                    key={item.mode}
                    onClick={() => handleMode(item.mode)}
                    type="button"
                  >
                    <Icon size={18} /> {item.mode === "browse" ? "Birds" : item.label}
                  </button>
                );
              })}
              <button type="button">
                <CircleHelp size={18} /> About
              </button>
            </nav>
            <ProgressSummary birds={sortedBirds} onReset={handleReset} progress={progress} />
          </aside>

          <section className="content-panel">
            <div className="view-header">
              <div>
                <h1>{currentPage.title}</h1>
                <p>{currentPage.description}</p>
              </div>
              {mode !== "browse" ? (
                <button className="icon-button" aria-label="Learning settings" type="button">
                  <Settings size={18} />
                </button>
              ) : null}
            </div>

            {mode === "browse" ? (
              <>
                <BirdFilters filters={filters} habitats={habitats} onChange={setFilters} />

                <section className="deck-status" aria-live="polite">
                  <span data-testid="result-count">
                    {filteredBirds.length} of {sortedBirds.length} birds
                  </span>
                  <button className="sort-button" type="button">
                    Sort: Likelihood
                  </button>
                </section>

                <section className="bird-sections" aria-label="Bird deck">
                  {groupedBirds.map((section) => (
                    <div className="likelihood-section" key={section.likelihood}>
                      <div className="section-heading">
                        <span className={`section-dot section-dot-${section.likelihood}`} />
                        <div>
                          <h2>{section.likelihood === "common" ? "Very Likely" : section.likelihood === "possible" ? "Likely" : "Uncommon"}</h2>
                          <p>
                            {section.likelihood === "common"
                              ? "Birds you're most likely to see or hear."
                              : section.likelihood === "possible"
                                ? "You have a good chance of seeing or hearing these."
                                : "Worth knowing for the right habitat or timing."}
                          </p>
                        </div>
                      </div>
                      <div className="bird-list">
                        {section.birds.map((bird) => (
                          <BirdCard
                            bird={bird}
                            isFavorite={favorites.has(bird.id)}
                            isSelected={selectedBird.id === bird.id}
                            key={bird.id}
                            mastery={progress[bird.id]?.mastery ?? "new"}
                            onSelect={handleSelect}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </section>
              </>
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
          </section>
        </div>
      </div>

      {mode === "browse" && isCompactViewport && isMobileDetailOpen ? (
        <div
          className="mobile-detail-backdrop"
          data-testid="mobile-detail-sheet"
          onClick={() => setIsMobileDetailOpen(false)}
        >
          <div
            className="mobile-detail-sheet"
            role="dialog"
            aria-label={`${selectedBird.commonName} details`}
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mobile-detail-bar">
              <span>Bird Details</span>
              <button
                aria-label="Close bird details"
                data-testid="close-mobile-detail"
                onClick={() => setIsMobileDetailOpen(false)}
                type="button"
              >
                <X size={18} />
              </button>
            </div>
            <BirdDetail
              bird={selectedBird}
              isFavorite={favorites.has(selectedBird.id)}
              mastery={progress[selectedBird.id]?.mastery ?? "new"}
              onMastery={handleMastery}
              onToggleFavorite={handleToggleFavorite}
            />
          </div>
        </div>
      ) : null}

      {mode === "browse" && !isCompactViewport && isDesktopDetailOpen ? (
        <div className="desktop-detail-backdrop" onClick={() => setIsDesktopDetailOpen(false)}>
          <div
            className="desktop-detail-drawer"
            role="dialog"
            aria-label={`${selectedBird.commonName} details`}
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mobile-detail-bar">
              <span>Bird Details</span>
              <button
                aria-label="Close bird details"
                onClick={() => setIsDesktopDetailOpen(false)}
                type="button"
              >
                <X size={18} />
              </button>
            </div>
            <BirdDetail
              bird={selectedBird}
              isFavorite={favorites.has(selectedBird.id)}
              mastery={progress[selectedBird.id]?.mastery ?? "new"}
              onMastery={handleMastery}
              onToggleFavorite={handleToggleFavorite}
            />
          </div>
        </div>
      ) : null}
    </main>
  );
}

function loadFavorites() {
  try {
    const raw = window.localStorage.getItem(favoriteStorageKey);
    if (!raw) {
      return new Set<string>();
    }

    const ids = JSON.parse(raw);
    if (!Array.isArray(ids)) {
      return new Set<string>();
    }

    return new Set(ids.filter((id): id is string => typeof id === "string"));
  } catch {
    return new Set<string>();
  }
}
