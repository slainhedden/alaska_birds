import { RotateCcw } from "lucide-react";
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
      <div>
        <h2>Trip: Late Spring - Summer</h2>
        <p>May - July</p>
      </div>
      <div className="progress-meter" aria-label={`${percent}% known`}>
        <span style={{ width: `${percent}%` }} />
      </div>
      <p>
        {score.known} known · {score.learning} learning · {score.correct}/{score.attempts} answers
      </p>
      <div className="trip-card-footer">
        <span>{birds.length} birds</span>
        <button className="link-button" onClick={onReset} type="button">
          <RotateCcw size={14} /> Reset
        </button>
      </div>
    </section>
  );
}
