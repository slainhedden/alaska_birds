import { Check, ExternalLink, GraduationCap, RotateCcw, Volume2 } from "lucide-react";
import type { Bird, Mastery } from "../types";
import { localTracksForBird, preferredAudioUrl } from "../utils/audio";
import { habitatLabels, likelihoodLabels } from "../utils/birds";
import { displayImageUrl, imagesForBird, primaryImageForBird } from "../utils/images";
import { BirdGlyph } from "./BirdGlyph";

interface BirdDetailProps {
  bird: Bird;
  mastery: Mastery;
  onMastery: (birdId: string, mastery: Mastery) => void;
}

export function BirdDetail({ bird, mastery, onMastery }: BirdDetailProps) {
  const localTracks = localTracksForBird(bird);
  const audioUrl = preferredAudioUrl(bird);
  const images = imagesForBird(bird);
  const primaryImage = primaryImageForBird(bird);

  return (
    <aside className="bird-detail" data-testid="bird-detail">
      <div className="detail-hero">
        {primaryImage ? (
          <img
            alt={`${bird.commonName} ${primaryImage.label}`}
            className="detail-primary-image"
            data-testid="detail-primary-image"
            src={displayImageUrl(primaryImage)}
          />
        ) : (
          <BirdGlyph bird={bird} />
        )}
        <div>
          <span className={`tier tier-${bird.likelihood}`}>{likelihoodLabels[bird.likelihood]}</span>
          <h2>{bird.commonName}</h2>
          <p className="scientific">{bird.scientificName}</p>
        </div>
      </div>

      <div className="detail-actions" aria-label="Mastery controls">
        <button
          className={mastery === "new" ? "active" : ""}
          onClick={() => onMastery(bird.id, "new")}
          type="button"
        >
          <RotateCcw size={16} /> New
        </button>
        <button
          className={mastery === "learning" ? "active" : ""}
          onClick={() => onMastery(bird.id, "learning")}
          type="button"
        >
          <GraduationCap size={16} /> Learning
        </button>
        <button
          className={mastery === "known" ? "active" : ""}
          onClick={() => onMastery(bird.id, "known")}
          type="button"
        >
          <Check size={16} /> Known
        </button>
      </div>

      <section>
        <h3>Image Gallery</h3>
        <div className="image-gallery" data-testid="image-gallery">
          {images.map((image) => (
            <a href={image.pageUrl} key={image.id} rel="noreferrer" target="_blank">
              <img
                alt={`${bird.commonName} ${image.label}`}
                src={displayImageUrl(image)}
              />
              <span>{image.label}</span>
              <small>
                {image.license} · {image.credit}
              </small>
            </a>
          ))}
        </div>
      </section>

      <section>
        <h3>Notice First</h3>
        <p>{bird.appearance}</p>
        <ul className="mark-list">
          {bird.fieldMarks.map((mark) => (
            <li key={mark}>{mark}</li>
          ))}
        </ul>
      </section>

      <section>
        <h3>Trip Habitat</h3>
        <p>{bird.habitat}</p>
        <div className="habitat-strip">
          {bird.habitats.map((habitat) => (
            <span key={habitat}>{habitatLabels[habitat]}</span>
          ))}
        </div>
      </section>

      <section className="sound-panel">
        <h3>Sound</h3>
        <p className="sound-mnemonic">{bird.sound.mnemonic}</p>
        <p>{bird.sound.description}</p>
        {audioUrl ? (
          <audio controls data-testid="detail-audio" src={audioUrl}>
            <track kind="captions" />
          </audio>
        ) : (
          <p className="media-note">No embedded recording for this bird.</p>
        )}
        {localTracks.length > 0 ? (
          <div className="local-audio-list" data-testid="local-audio-list">
            <strong>{localTracks.length} local training clip{localTracks.length === 1 ? "" : "s"}</strong>
            {localTracks.slice(0, 3).map((track) => (
              <a href={track.sourceUrl} key={track.id} rel="noreferrer" target="_blank">
                {track.dataset} · {track.credit || "unknown recordist"} · {track.license}
              </a>
            ))}
          </div>
        ) : null}
        <a href={bird.sound.source.sourceUrl} rel="noreferrer" target="_blank">
          <Volume2 size={16} /> Sound source <ExternalLink size={14} />
        </a>
      </section>

      <section>
        <h3>Recognition Hook</h3>
        <p>{bird.memoryHook}</p>
        <p className="confusion">{bird.confusion}</p>
      </section>

      <section>
        <h3>Media Notes</h3>
        <p>{bird.image.notes}</p>
        <a href={bird.image.sourceUrl} rel="noreferrer" target="_blank">
          Image candidates <ExternalLink size={14} />
        </a>
      </section>
    </aside>
  );
}
