import { ArrowRight, CheckCircle2, ExternalLink, Volume2, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import type { Bird } from "../types";
import { preferredAudioUrl } from "../utils/audio";
import { optionSet, shuffledBirds } from "../utils/birds";

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
      <div className="segmented">
        <button
          className={mode === "audio" ? "active" : ""}
          data-testid="sound-audio-mode"
          onClick={() => switchMode("audio")}
          type="button"
        >
          <Volume2 size={16} /> Audio-backed
        </button>
        <button
          className={mode === "clue" ? "active" : ""}
          data-testid="sound-clue-mode"
          onClick={() => switchMode("clue")}
          type="button"
        >
          Call clues
        </button>
      </div>

      <div className="panel-heading">
        <span>Sound {index + 1}</span>
        <span>{mode === "audio" ? `${audioBirds.length} embedded` : `${clueBirds.length} clues`}</span>
      </div>

      {audioUrl ? (
        <div className="audio-shell" data-testid="sound-audio">
          <Volume2 size={18} />
          <span>Embedded audio ready.</span>
          <audio controls src={audioUrl}>
            <track kind="captions" />
          </audio>
        </div>
      ) : (
        <div className="no-audio" data-testid="sound-no-audio">
          <Volume2 size={18} />
          <span>No embedded audio. Use the call clue and source link.</span>
        </div>
      )}

      <p className="sound-mnemonic">{answer.sound.mnemonic}</p>
      <p className="quiz-clue">{answer.sound.listenFor}</p>
      <a className="source-link" href={answer.sound.source.sourceUrl} rel="noreferrer" target="_blank">
        Source <ExternalLink size={14} />
      </a>

      <div className="choice-grid">
        {options.map((bird) => {
          const isPicked = result?.pickedId === bird.id;
          const isAnswer = result && bird.id === answer.id;
          return (
            <button
              className={`${isPicked ? "picked" : ""} ${isAnswer ? "answer" : ""}`}
              data-testid="sound-choice"
              disabled={Boolean(result)}
              key={bird.id}
              onClick={() => choose(bird)}
              type="button"
            >
              {bird.commonName}
            </button>
          );
        })}
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
        <button data-testid="sound-next" disabled={!result} onClick={next} type="button">
          <ArrowRight size={16} /> Next
        </button>
      </div>
    </section>
  );
}

function randomSeed() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}:${Math.random()}`;
}
