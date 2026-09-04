"use client";

import type { DayChoice, Difficulty, DistanceBand } from "@/lib/types";
import { useEffect, useState, type ReactNode } from "react";

type Filters = {
  day: DayChoice;
  radiusMi: number;
  distance: DistanceBand;
  difficulty: Difficulty | "any";
};

type Place = { label: string; lat: number; lng: number };

type Props = {
  filters: Filters;
  onChange: (next: Filters) => void;
  onSearch: () => void;
  placeLabel: string;
  onPlaceSelect: (place: Place) => void;
};

function Chip({
  active,
  children,
  onClick,
  disabled,
}: {
  active: boolean;
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 text-xs font-semibold tracking-wide shadow-sm transition-colors disabled:cursor-default ${
        active
          ? "bg-olive text-cream"
          : "bg-cream text-forest/80 hover:bg-white hover:text-forest"
      }`}
    >
      {children}
    </button>
  );
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <p className="px-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-sage">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

export default function FilterBar({
  filters,
  onChange,
  onSearch,
  placeLabel,
  onPlaceSelect,
}: Props) {
  const [query, setQuery] = useState(placeLabel);
  const [places, setPlaces] = useState<Place[]>([]);
  const q = query.trim();
  const suggestions = q.length >= 2 && q !== placeLabel ? places : [];

  useEffect(() => {
    const next = query.trim();
    if (next.length < 2 || next === placeLabel) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      fetch(`/api/geocode?q=${encodeURIComponent(next)}`, { signal: controller.signal })
        .then((res) => res.json())
        .then((json: { places?: Place[] }) => setPlaces(json.places ?? []))
        .catch(() => undefined);
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, placeLabel]);

  return (
    <div className="flex flex-col gap-4">
      <label className="relative z-20 block">
        <span className="px-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-sage">
          Near
        </span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="City, park, or trailhead"
          autoComplete="off"
          className="mt-1.5 w-full rounded-full border border-forest/10 bg-cream px-4 py-2.5 text-sm text-forest outline-none placeholder:text-forest/40 focus:border-olive"
        />
        {suggestions.length > 0 && (
          <ul className="absolute inset-x-0 bottom-full z-30 mb-1 max-h-44 overflow-y-auto rounded-2xl border border-forest/10 bg-cream shadow-[0_12px_28px_rgba(44,76,42,0.16)]">
            {suggestions.map((place) => (
              <li key={`${place.label}-${place.lat}`}>
                <button
                  type="button"
                  onClick={() => {
                    setQuery(place.label);
                    setPlaces([]);
                    onPlaceSelect(place);
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-forest hover:bg-white"
                >
                  {place.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </label>
      <div className="flex flex-wrap gap-x-6 gap-y-3">
      <Group label="Activity">
        <Chip active disabled>
          Hiking
        </Chip>
      </Group>
      <Group label="When">
        {(
          [
            ["today", "Today"],
            ["saturday", "Saturday"],
            ["sunday", "Sunday"],
          ] as const
        ).map(([value, label]) => (
          <Chip
            key={value}
            active={filters.day === value}
            onClick={() => onChange({ ...filters, day: value })}
          >
            {label}
          </Chip>
        ))}
      </Group>
      <Group label="Nearby">
        {[15, 30, 50].map((radius) => (
          <Chip
            key={radius}
            active={filters.radiusMi === radius}
            onClick={() => onChange({ ...filters, radiusMi: radius })}
          >
            {radius} mi
          </Chip>
        ))}
      </Group>
      <Group label="Length">
        {(
          [
            ["5-10", "5–10"],
            ["3-6", "3–6"],
            ["10+", "10+"],
            ["any", "Any"],
          ] as const
        ).map(([value, label]) => (
          <Chip
            key={value}
            active={filters.distance === value}
            onClick={() => onChange({ ...filters, distance: value })}
          >
            {label}
          </Chip>
        ))}
      </Group>
      <Group label="Grade">
        {(
          [
            ["moderate", "Moderate"],
            ["easy", "Easy"],
            ["hard", "Hard"],
            ["any", "Any"],
          ] as const
        ).map(([value, label]) => (
          <Chip
            key={value}
            active={filters.difficulty === value}
            onClick={() => onChange({ ...filters, difficulty: value })}
          >
            {label}
          </Chip>
        ))}
      </Group>
      </div>
      <button
        type="button"
        onClick={onSearch}
        className="w-full rounded-full bg-olive px-5 py-3 text-sm font-semibold tracking-wide text-cream shadow-sm transition-colors hover:bg-[#73821f]"
      >
        Search trails
      </button>
    </div>
  );
}
