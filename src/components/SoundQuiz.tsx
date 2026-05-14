import { ArrowRight, CheckCircle2, ExternalLink, Volume2, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import type { Bird } from "../types";
import { preferredAudioUrl } from "../utils/audio";
import { optionSet, shuffledBirds } from "../utils/birds";
import { displayImageUrl, primaryImageForBird } from "../utils/images";
import { BirdGlyph } from "./BirdGlyph";

interface SoundQuizProps {
  birds: Bird[];
  onAnswer: (birdId: string, isCorrect: boolean) => void;
}

type SoundMode = "audio" | "clue";

interface SoundResult {
  pickedId: string;
  isCorrect: boolean;
}

export function SoundQuiz({ birds, onAnswer }: SoundQuizProps) {
  const [runSeed, setRunSeed] = useState(() => randomSeed());
  const [mode, setMode] = useState<SoundMode>("audio");
  const [index, setIndex] = useState(0);
  const [result, setResult] = useState<SoundResult | null>(null);
  const audioBirds = useMemo(
    () => shuffledBirds(birds.filter((bird) => preferredAudioUrl(bird)), `${runSeed}:audio`),
    [birds, runSeed],
  );
  const clueBirds = useMemo(
    () =>
      shuffledBirds([...birds], `${runSeed}:clue`).sort((left, right) => {
        const leftSound = left.learningTags.includes("sound-first") ? 0 : 1;
        const rightSound = right.learningTags.includes("sound-first") ? 0 : 1;
        return leftSound - rightSound;
      }),
    [birds, runSeed],
  );
  const deck = mode === "audio" && audioBirds.length > 0 ? audioBirds : clueBirds;
  const answer = deck[index % deck.length];
  const audioUrl = preferredAudioUrl(answer);
  const options = optionSet(answer, birds, `${runSeed}:${mode}:${index}`);

  function choose(bird: Bird) {
    if (result) {
      return;
    }

    const isCorrect = bird.id === answer.id;
    setResult({ pickedId: bird.id, isCorrect });
    onAnswer(answer.id, isCorrect);
  }

  function next() {
    setIndex((current) => {
      const nextIndex = current + 1;
      if (nextIndex % deck.length === 0) {
        setRunSeed(randomSeed());
      }
      return nextIndex;
    });
    setResult(null);
  }

  function switchMode(nextMode: SoundMode) {
    setMode(nextMode);
    setIndex(0);
    setResult(null);
    setRunSeed(randomSeed());
  }

  return (
    <section className="learning-panel" data-testid="sound-quiz-panel">
      <div className="quiz-shell sound-shell">
        <aside className="quiz-stats">
          <strong>Question {(index % 10) + 1} of 10</strong>
          <div className="progress-track">
            <span style={{ width: `${(((index % 10) + 1) / 10) * 100}%` }} />
          </div>
          <span>Mode</span>
          <b>{mode === "audio" ? "Audio" : "Call clues"}</b>
          <div className="segmented compact">
            <button
              className={mode === "audio" ? "active" : ""}
              data-testid="sound-audio-mode"
              onClick={() => switchMode("audio")}
              type="button"
            >
              Audio
            </button>
            <button
              className={mode === "clue" ? "active" : ""}
              data-testid="sound-clue-mode"
              onClick={() => switchMode("clue")}
              type="button"
            >
              Clues
            </button>
          </div>
        </aside>

        <div className="sound-practice-card">
          {audioUrl ? (
            <div className="audio-shell" data-testid="sound-audio">
              <button aria-label="Play call" className="play-button" type="button">
                <Volume2 size={20} />
              </button>
              <div className="waveform" aria-hidden="true">
                {Array.from({ length: 36 }, (_, barIndex) => (
                  <span key={barIndex} style={{ height: `${18 + ((barIndex * 13) % 34)}px` }} />
                ))}
              </div>
              <span>0:00 / 0:08</span>
              <audio controls src={audioUrl}>
                <track kind="captions" />
              </audio>
              <small>Embedded audio ready.</small>
            </div>
          ) : (
            <div className="no-audio" data-testid="sound-no-audio">
              <Volume2 size={18} />
              <span>No embedded audio. Use the call clue and source link.</span>
            </div>
          )}

          <h2>What bird is this?</h2>
          <p>Choose the best answer.</p>
          <div className="choice-grid sound-choices">
            {options.map((bird) => {
              const isPicked = result?.pickedId === bird.id;
              const isAnswer = result && bird.id === answer.id;
              const image = primaryImageForBird(bird);
              return (
                <button
                  className={`${isPicked ? "picked" : ""} ${isAnswer ? "answer" : ""}`}
                  data-testid="sound-choice"
                  disabled={Boolean(result)}
                  key={bird.id}
                  onClick={() => choose(bird)}
                  type="button"
                >
                  <span className="choice-radio" />
                  {image ? (
                    <img alt="" className="choice-thumb" src={displayImageUrl(image)} />
                  ) : (
                    <BirdGlyph bird={bird} />
                  )}
                  <span>
                    <strong>{bird.commonName}</strong>
                    <em>{bird.scientificName}</em>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <aside className="sound-about">
          <h3>About this call</h3>
          <p>{answer.sound.description}</p>
          <p>{answer.sound.listenFor}</p>
          <h3>Source</h3>
          <a className="source-link" href={answer.sound.source.sourceUrl} rel="noreferrer" target="_blank">
            {answer.sound.source.sourceName} <ExternalLink size={14} />
          </a>
          <h3>Memory</h3>
          <p className="sound-mnemonic">{answer.sound.mnemonic}</p>
        </aside>
      </div>

      {result ? (
        <div
          className={`result result-${result.isCorrect ? "correct" : "wrong"}`}
          data-testid="sound-result"
        >
          {result.isCorrect ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
          <span>
            {result.isCorrect ? "Correct" : `Answer: ${answer.commonName}`} ·{" "}
            {answer.sound.description}
          </span>
        </div>
      ) : null}

      <div className="learning-actions">
        <button className="primary-action" data-testid="sound-next" disabled={!result} onClick={next} type="button">
          <ArrowRight size={16} /> Next
        </button>
      </div>
    </section>
  );
}

function randomSeed() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}:${Math.random()}`;
}
