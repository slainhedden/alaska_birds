import { RotateCcw, Trophy } from "lucide-react";
import type { Bird, ProgressMap } from "../types";
import { progressScore } from "../utils/birds";

interface ProgressSummaryProps {
  birds: Bird[];
  progress: ProgressMap;
  onReset: () => void;
}

export function ProgressSummary({ birds, progress, onReset }: ProgressSummaryProps) {
  const score = progressScore(progress);
  const percent = birds.length === 0 ? 0 : Math.round((score.known / birds.length) * 100);

  return (
    <section className="progress-summary" aria-label="Progress summary">
      <div className="progress-ring" aria-label={`${percent}% known`}>
        <span>{percent}%</span>
      </div>
      <div>
        <h2>Talkeetna Deck</h2>
        <p>
          {birds.length} birds · {score.known} known · {score.learning} learning · {score.correct}/
          {score.attempts} quiz answers
        </p>
      </div>
      <button className="ghost-button" onClick={onReset} type="button">
        <RotateCcw size={16} /> Reset
      </button>
      <Trophy className="summary-icon" size={22} />
    </section>
  );
}
