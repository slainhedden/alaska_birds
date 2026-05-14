import { ArrowRight, CheckCircle2, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import type { Bird } from "../types";
import { optionSet, shuffledBirds } from "../utils/birds";
import { displayImageUrl, primaryImageForBird } from "../utils/images";
import { BirdGlyph } from "./BirdGlyph";

interface QuizProps {
  birds: Bird[];
  onAnswer: (birdId: string, isCorrect: boolean) => void;
}

interface QuizResult {
  pickedId: string;
  isCorrect: boolean;
}

export function Quiz({ birds, onAnswer }: QuizProps) {
  const [runSeed, setRunSeed] = useState(() => randomSeed());
  const [index, setIndex] = useState(0);
  const [result, setResult] = useState<QuizResult | null>(null);
  const sorted = useMemo(() => [...birds].sort((left, right) => left.priority - right.priority), [birds]);
  const deck = useMemo(() => shuffledBirds(sorted, runSeed), [sorted, runSeed]);

  if (sorted.length < 4) {
    return <section className="learning-panel">At least four birds are needed for quiz mode.</section>;
  }

  const answer = deck[index % deck.length];
  const options = optionSet(answer, sorted, `${runSeed}:${index}`);
  const questionType = index % 3;
  const prompt =
    questionType === 0
      ? answer.quickHint
      : questionType === 1
        ? answer.fieldMarks.slice(0, 3).join(" · ")
        : answer.habitat;
  const answerImage = primaryImageForBird(answer);

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

  return (
    <section className="learning-panel" data-testid="quiz-panel">
      <div className="quiz-shell">
        <aside className="quiz-stats">
          <strong>Question {(index % 10) + 1} of 10</strong>
          <div className="progress-track">
            <span style={{ width: `${(((index % 10) + 1) / 10) * 100}%` }} />
          </div>
          <span>Deck</span>
          <b>{sorted.length} birds</b>
        </aside>
        <div className="quiz-card">
          <div className="panel-heading">
            <span>
              <h2>What bird is this?</h2>
              <p>Choose the best answer.</p>
            </span>
            <span className={`tier tier-${answer.likelihood}`}>{answer.likelihood}</span>
          </div>
          <div className="quiz-main">
            <div className="quiz-image-wrap">
              {answerImage ? (
                <img
                  alt={`${answer.commonName} ${answerImage.label}`}
                  className="quiz-image"
                  src={displayImageUrl(answerImage)}
                />
              ) : (
                <BirdGlyph bird={answer} />
              )}
              <p className="quiz-clue">{prompt}</p>
            </div>
            <div className="choice-grid text-choice-grid">
              {options.map((bird) => {
                const isPicked = result?.pickedId === bird.id;
                const isAnswer = result && bird.id === answer.id;
                return (
                  <button
                    className={`${isPicked ? "picked" : ""} ${isAnswer ? "answer" : ""}`}
                    data-testid="quiz-choice"
                    disabled={Boolean(result)}
                    key={bird.id}
                    onClick={() => choose(bird)}
                    type="button"
                  >
                    <span className="choice-radio" />
                    <span>
                      <strong>{bird.commonName}</strong>
                      <em>{bird.scientificName}</em>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      {result ? (
        <div className={`result result-${result.isCorrect ? "correct" : "wrong"}`} data-testid="quiz-result">
          {result.isCorrect ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
          <span>
            {result.isCorrect ? "Correct" : `Answer: ${answer.commonName}`} · {answer.memoryHook}
          </span>
        </div>
      ) : null}
      <div className="learning-actions">
        <button className="primary-action" data-testid="quiz-next" disabled={!result} onClick={next} type="button">
          <ArrowRight size={16} /> Next
        </button>
      </div>
    </section>
  );
}

function randomSeed() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}:${Math.random()}`;
}
