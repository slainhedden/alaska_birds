import type { Bird } from "../types";

const habitatColors: Record<string, string> = {
  woods: "#3f7d58",
  river: "#3b82a0",
  wetland: "#6f8f44",
  lake: "#4f8fb8",
  alpine: "#8a6f55",
  edge: "#c17f3c",
  town: "#7b7087",
  "train-window": "#b4533e",
};

export function BirdGlyph({ bird }: { bird: Bird }) {
  const primary = habitatColors[bird.habitats[0]] ?? "#3f7d58";
  const secondary = habitatColors[bird.habitats[1] ?? bird.habitats[0]] ?? "#6f8f44";

  return (
    <div
      className="bird-glyph"
      aria-label={`${bird.commonName} visual cue`}
      style={{
        background: `linear-gradient(135deg, ${primary}, ${secondary})`,
      }}
    >
      <span className="glyph-wing" />
      <span className="glyph-head" />
      <span className="glyph-tail" />
    </div>
  );
}
