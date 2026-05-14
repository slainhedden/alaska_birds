import { ArrowRight, Check, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import type { Bird, Mastery } from "../types";
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

  function nextCard() {
    setIndex((current) => (current + 1) % deck.length);
    setRevealed(false);
  }

  return (
    <section className="learning-panel" data-testid="flashcard-panel">
      <div className="panel-heading">
        <span>
          Card {(index % deck.length) + 1} of {deck.length}
        </span>
        <span className={`tier tier-${bird.likelihood}`}>{bird.likelihood}</span>
      </div>
      <button className="flashcard" onClick={() => setRevealed((value) => !value)} type="button">
        <BirdGlyph bird={bird} />
        {revealed ? (
          <span className="flashcard-answer">
            <strong>{bird.commonName}</strong>
            <em>{bird.scientificName}</em>
            <span>{bird.quickHint}</span>
            <span className="sound-mnemonic">{bird.sound.mnemonic}</span>
          </span>
        ) : (
          <span className="flashcard-prompt">
            <strong>{bird.memoryHook}</strong>
            <span>{bird.fieldMarks.slice(0, 3).join(" · ")}</span>
            <span>{bird.sound.listenFor}</span>
          </span>
        )}
      </button>
      <div className="learning-actions">
        <button onClick={() => setRevealed(false)} type="button">
          <RotateCcw size={16} /> Hide
        </button>
        <button onClick={() => onMastery(bird.id, "known")} type="button">
          <Check size={16} /> Known
        </button>
        <button data-testid="flashcard-next" onClick={nextCard} type="button">
          <ArrowRight size={16} /> Next
        </button>
      </div>
    </section>
  );
}
