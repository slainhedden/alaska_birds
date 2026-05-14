import { Filter, Search, Star } from "lucide-react";
import type { HabitatTag, Likelihood } from "../types";
import { habitatLabels, likelihoodLabels } from "../utils/birds";

export interface BirdFilterState {
  search: string;
  likelihood: "all" | Likelihood;
  habitat: "all" | HabitatTag;
  favoritesOnly: boolean;
}

interface BirdFiltersProps {
  filters: BirdFilterState;
  habitats: HabitatTag[];
  onChange: (filters: BirdFilterState) => void;
}

export function BirdFilters({ filters, habitats, onChange }: BirdFiltersProps) {
  return (
    <section className="filter-bar" aria-label="Bird filters">
      <label className="search-field">
        <Search size={18} />
        <input
          aria-label="Search birds"
          data-testid="bird-search"
          onChange={(event) => onChange({ ...filters, search: event.target.value })}
          placeholder="Search birds by name..."
          type="search"
          value={filters.search}
        />
      </label>
      <label className="select-field">
        <Filter size={16} />
        <select
          aria-label="Likelihood filter"
          data-testid="likelihood-filter"
          onChange={(event) =>
            onChange({ ...filters, likelihood: event.target.value as BirdFilterState["likelihood"] })
          }
          value={filters.likelihood}
        >
          <option value="all">All likelihoods</option>
          {(["common", "possible", "uncommon"] as const).map((tier) => (
            <option key={tier} value={tier}>
              {likelihoodLabels[tier]}
            </option>
          ))}
        </select>
      </label>
      <label className="select-field">
        <Filter size={16} />
        <select
          aria-label="Habitat filter"
          data-testid="habitat-filter"
          onChange={(event) =>
            onChange({ ...filters, habitat: event.target.value as BirdFilterState["habitat"] })
          }
          value={filters.habitat}
        >
          <option value="all">All habitats</option>
          {habitats.map((habitat) => (
            <option key={habitat} value={habitat}>
              {habitatLabels[habitat]}
            </option>
          ))}
        </select>
      </label>
      <button
        aria-pressed={filters.favoritesOnly}
        className={`favorite-filter ${filters.favoritesOnly ? "active" : ""}`}
        onClick={() => onChange({ ...filters, favoritesOnly: !filters.favoritesOnly })}
        type="button"
      >
        Show Only Favorites <Star size={17} />
      </button>
    </section>
  );
}
