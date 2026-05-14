import { ArrowRight, Check, RotateCcw, Shuffle } from "lucide-react";
import { useMemo, useState } from "react";
import type { Bird, Mastery } from "../types";
import { displayImageUrl, primaryImageForBird } from "../utils/images";
import { BirdGlyph } from "./BirdGlyph";

interface FlashcardsProps {
  birds: Bird[];
  getMastery: (birdId: string) => Mastery;
  onMastery: (birdId: string, mastery: Mastery) => void;
}

export function Flashcards({ birds, getMastery, onMastery }: FlashcardsProps) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const deck = useMemo(
    () =>
      [...birds].sort((left, right) => {
        const leftKnown = getMastery(left.id) === "known" ? 1 : 0;
        const rightKnown = getMastery(right.id) === "known" ? 1 : 0;
        return leftKnown - rightKnown || left.priority - right.priority;
      }),
    [birds, getMastery],
  );

  if (deck.length === 0) {
    return <section className="learning-panel">No cards match the current deck.</section>;
  }

  const bird = deck[index % deck.length];
  const image = primaryImageForBird(bird);
  const progress = Math.round((((index % deck.length) + 1) / deck.length) * 100);

  function nextCard() {
    setIndex((current) => (current + 1) % deck.length);
    setRevealed(false);
  }

  return (
    <section className="learning-panel" data-testid="flashcard-panel">
      <div className="study-toolbar">
        <div className="study-progress">
          <span>Progress</span>
          <strong>
            Card {(index % deck.length) + 1} of {deck.length}
          </strong>
          <div className="progress-track">
            <span style={{ width: `${progress}%` }} />
          </div>
        </div>
        <button className="shuffle-button" type="button">
          <Shuffle size={16} /> Shuffle
        </button>
      </div>
      <button className="flashcard" onClick={() => setRevealed((value) => !value)} type="button">
        {image ? (
          <img
            alt={`${bird.commonName} ${image.label}`}
            className="flashcard-image"
            src={displayImageUrl(image)}
          />
        ) : (
          <BirdGlyph bird={bird} />
        )}
        {revealed ? (
          <span className="flashcard-answer">
            <span className={`tier tier-${bird.likelihood}`}>{bird.likelihood}</span>
            <strong>{bird.commonName}</strong>
            <em>{bird.scientificName}</em>
            <span className="detail-line">
              <b>Habitat</b> {bird.habitat}
            </span>
            <span className="detail-line">
              <b>Field Marks</b> {bird.fieldMarks.slice(0, 3).join(", ")}
            </span>
            <span className="detail-line">
              <b>Memory Hook</b> {bird.memoryHook}
            </span>
          </span>
        ) : (
          <span className="flashcard-prompt">
            <strong>{bird.memoryHook}</strong>
            <span>{bird.fieldMarks.slice(0, 3).join(", ")}</span>
            <span className="sound-mnemonic">{bird.sound.mnemonic}</span>
          </span>
        )}
      </button>
      <div className="learning-actions">
        <button className="again" onClick={() => setRevealed(false)} type="button">
          <RotateCcw size={16} /> Again
        </button>
        <button className="hard" onClick={() => onMastery(bird.id, "learning")} type="button">
          Hard
        </button>
        <button className="good" onClick={() => onMastery(bird.id, "known")} type="button">
          <Check size={16} /> Good
        </button>
        <button className="easy" data-testid="flashcard-next" onClick={nextCard} type="button">
          <ArrowRight size={16} /> Easy
        </button>
      </div>
    </section>
  );
}
