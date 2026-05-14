import { CheckCircle2, Circle, Ear, Volume2 } from "lucide-react";
import type { Bird, Mastery } from "../types";
import { habitatLabels, likelihoodLabels } from "../utils/birds";
import { hasAnyAudio } from "../utils/audio";
import { displayImageUrl, primaryImageForBird } from "../utils/images";
import { BirdGlyph } from "./BirdGlyph";

interface BirdCardProps {
  bird: Bird;
  mastery: Mastery;
  isSelected: boolean;
  onSelect: (bird: Bird) => void;
}

export function BirdCard({ bird, mastery, isSelected, onSelect }: BirdCardProps) {
  const MasteryIcon = mastery === "known" ? CheckCircle2 : mastery === "learning" ? Ear : Circle;
  const image = primaryImageForBird(bird);

  return (
    <button
      className={`bird-card ${isSelected ? "selected" : ""}`}
      data-testid="bird-card"
      onClick={() => onSelect(bird)}
      type="button"
    >
      {image ? (
        <img
          alt={`${bird.commonName} ${image.label}`}
          className="bird-card-image"
          data-testid="bird-card-image"
          loading="lazy"
          src={displayImageUrl(image)}
        />
      ) : (
        <BirdGlyph bird={bird} />
      )}
      <span className="bird-card-body">
        <span className="bird-card-topline">
          <span className={`tier tier-${bird.likelihood}`}>{likelihoodLabels[bird.likelihood]}</span>
          {hasAnyAudio(bird) ? (
            <span className="inline-icon" aria-label="Audio available" data-testid="audio-available">
              <Volume2 size={14} />
            </span>
          ) : null}
        </span>
        <span className="bird-card-name">{bird.commonName}</span>
        <span className="bird-card-science">{bird.scientificName}</span>
        <span className="bird-card-hint">{bird.quickHint}</span>
        <span className="habitat-strip">
          {bird.habitats.slice(0, 3).map((habitat) => (
            <span key={habitat}>{habitatLabels[habitat]}</span>
          ))}
        </span>
      </span>
      <span className={`mastery-dot mastery-${mastery}`}>
        <MasteryIcon size={16} />
      </span>
    </button>
  );
}
