"use client";

import ConditionsStats from "@/components/ConditionsStats";
import FilterBar from "@/components/FilterBar";
import { weekdayLabel } from "@/lib/dates";
import { DEFAULT_ORIGIN } from "@/lib/trails";
import type { DayChoice, Difficulty, DistanceBand, TrailResult } from "@/lib/types";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

const TrailMap = dynamic(() => import("@/components/TrailMap"), { ssr: false });

type Filters = {
  day: DayChoice;
  radiusMi: number;
  distance: DistanceBand;
  difficulty: Difficulty | "any";
};

const INITIAL: Filters = {
  day: "saturday",
  radiusMi: 30,
  distance: "5-10",
  difficulty: "moderate",
};

function difficultyClass(value: TrailResult["difficulty"]) {
  if (value === "easy") return "bg-mint text-forest";
  if (value === "hard") return "bg-sky text-cream";
  return "bg-olive text-cream";
}

function TrailMark() {
  return (
    <svg viewBox="0 0 32 32" className="h-9 w-9" aria-hidden>
      <rect width="32" height="32" rx="9" fill="#A4D6C6" />
      <path d="M6 22 L13 11 L18 17 L26 8" fill="none" stroke="#2C4C2A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="26" cy="8" r="2.1" fill="#829328" />
    </svg>
  );
}

function LoadingScreen({ place }: { place: string }) {
  return (
    <div
      className="fixed inset-0 z-[2000] flex flex-col items-center justify-center bg-forest text-cream"
      role="status"
      aria-live="polite"
    >
      <div className="absolute inset-0 bg-[url('/hero.jpg')] bg-cover bg-[center_28%] opacity-30" />
      <div className="absolute inset-0 bg-forest/70" />
      <div className="relative z-10 flex flex-col items-center px-6 text-center">
        <span className="h-12 w-12 animate-spin rounded-full border-2 border-mint/30 border-t-mint" />
        <p className="mt-6 font-serif text-3xl">Finding trails</p>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-mint">
          Searching named hiking routes near {place} and reading the trailhead
          forecast…
        </p>
      </div>
    </div>
  );
}

export default function TrailScout() {
  const [filters, setFilters] = useState<Filters>(INITIAL);
  const [origin, setOrigin] = useState(DEFAULT_ORIGIN);
  const [placeLabel, setPlaceLabel] = useState("Fremont, CA");
  const [trails, setTrails] = useState<TrailResult[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resultsRef = useRef<HTMLElement>(null);
  const searchingRef = useRef(false);

  const queryKey = `${origin.lat.toFixed(4)}|${origin.lng.toFixed(4)}|${filters.day}|${filters.radiusMi}|${filters.distance}|${filters.difficulty}`;
  const waiting = searching && loadedKey !== queryKey;

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setPlaceLabel("Your location");
      },
      () => undefined,
      { timeout: 4000, maximumAge: 10 * 60 * 1000 },
    );
  }, []);

  useEffect(() => {
    const requestedKey = queryKey;
    const params = new URLSearchParams({
      lat: String(origin.lat),
      lng: String(origin.lng),
      day: filters.day,
      radius: String(filters.radiusMi),
      distance: filters.distance,
      difficulty: filters.difficulty,
    });

    const controller = new AbortController();

    fetch(`/api/trails?${params}`, { signal: controller.signal })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Could not load trails");
        return json as { date: string; trails: TrailResult[] };
      })
      .then((json) => {
        setDate(json.date);
        setTrails(json.trails);
        setSelectedId(json.trails[0]?.id ?? null);
        setError(null);
        setLoadedKey(requestedKey);
        if (searchingRef.current) {
          searchingRef.current = false;
          setSearching(false);
          window.setTimeout(() => {
            resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            window.dispatchEvent(new Event("resize"));
          }, 50);
        }
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Could not load trails");
        setLoadedKey(requestedKey);
        searchingRef.current = false;
        setSearching(false);
      });

    return () => controller.abort();
  }, [filters, origin, queryKey]);

  const selected = useMemo(
    () => trails.find((t) => t.id === selectedId) ?? trails[0] ?? null,
    [trails, selectedId],
  );

  function searchTrails() {
    if (loadedKey === queryKey) {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      window.setTimeout(() => window.dispatchEvent(new Event("resize")), 450);
      return;
    }
    searchingRef.current = true;
    setSearching(true);
  }

  return (
    <div>
      {waiting && <LoadingScreen place={placeLabel} />}
      <header className="relative isolate flex h-dvh flex-col overflow-x-hidden overflow-y-auto text-cream">
        <div className="absolute inset-0 bg-forest" />
        <Image
          src="/hero.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-[center_28%] opacity-45"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-forest/35 via-forest/50 to-forest/80" />
        <div className="relative z-10 mx-auto flex min-h-full w-full max-w-5xl flex-col px-5 py-7 lg:px-8 lg:py-10">
          <div className="flex shrink-0 items-center gap-3">
            <TrailMark />
            <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-cream">
              TrailScout
            </p>
          </div>
          <div className="flex flex-1 flex-col justify-center py-8">
            <h1 className="max-w-3xl shrink-0 font-serif text-4xl font-medium leading-[1.12] tracking-tight md:text-6xl">
              Where should I go this weekend?
            </h1>
            <p className="mt-4 max-w-md shrink-0 text-base leading-relaxed text-cream/90">
              Named hiking routes near {placeLabel}, ranked by your filters and a
              live trailhead forecast{date ? ` for ${weekdayLabel(date)}` : ""}.
            </p>
            <div className="relative z-20 mt-8 shrink-0 overflow-visible rounded-[1.6rem] bg-card px-5 py-5 text-forest shadow-[0_16px_40px_rgba(20,40,18,0.22)]">
              <FilterBar
                filters={filters}
                onChange={setFilters}
                onSearch={searchTrails}
                placeLabel={placeLabel}
                onPlaceSelect={(place) => {
                  setPlaceLabel(place.label);
                  setOrigin({ lat: place.lat, lng: place.lng });
                }}
              />
            </div>
          </div>
        </div>
      </header>

      <section
        id="trails"
        ref={resultsRef}
        className="topo-grid flex h-dvh flex-col"
      >
      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(23rem,27rem)_1fr]">
        <section className="min-h-0 overflow-y-auto border-b border-line/80 lg:border-b-0 lg:border-r">
          {error && (
            <p className="m-5 rounded-xl border border-sky/30 bg-sky/10 px-3 py-2 text-sm text-forest">
              {error}
            </p>
          )}
          {loadedKey !== queryKey && trails.length === 0 && (
            <div className="space-y-3 p-5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-44 animate-pulse rounded-2xl bg-sage/20" />
              ))}
            </div>
          )}
          {loadedKey === queryKey && trails.length === 0 && !error && (
            <p className="p-6 text-sm leading-relaxed text-muted">
              No trails match those filters. Try a wider radius, Any length, or Any
              grade.
            </p>
          )}
          <ul className="flex flex-col gap-3 p-4 lg:p-5">
            {trails.map((trail, index) => {
              const active = trail.id === selected?.id;
              return (
                <li key={trail.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(trail.id)}
                    className={`w-full rounded-2xl border px-4 py-4 text-left transition-all ${
                      active
                        ? "border-olive bg-card shadow-[0_10px_28px_rgba(44,76,42,0.12)] ring-2 ring-olive/25"
                        : "border-transparent bg-card/70 hover:border-sage/50 hover:bg-card"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-serif text-sm text-olive">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <h2 className="font-serif text-xl leading-tight text-forest">
                            {trail.name}
                          </h2>
                        </div>
                        <p className="mt-1 text-xs text-muted">
                          {trail.area} · {trail.distanceFromUserMi} mi away
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${difficultyClass(trail.difficulty)}`}
                      >
                        {trail.difficulty}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-medium text-forest/85">
                      {trail.distanceMi} mi · {trail.elevationFt.toLocaleString()} ft gain
                    </p>

                    {active && (
                      <div className="mt-3">
                        <ConditionsStats conditions={trail.conditions} />
                        <div className="mt-3 rounded-xl bg-mint/35 px-3 py-3">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-olive">
                            Trip brief
                          </p>
                          <p className="mt-1.5 text-sm leading-relaxed text-forest/90">
                            {trail.brief}
                          </p>
                        </div>
                      </div>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="relative h-[60vh] min-h-[28rem] overflow-hidden bg-[#dce6d4] lg:h-full lg:min-h-[28rem]">
          <div className="absolute inset-0">
            <TrailMap
              trails={trails}
              selectedId={selected?.id ?? null}
              origin={origin}
              onSelect={setSelectedId}
            />
          </div>
          {selected && (
            <div className="pointer-events-none absolute bottom-4 left-4 right-4 z-[500] max-w-md rounded-2xl bg-forest/92 p-4 text-cream shadow-[0_16px_40px_rgba(20,40,18,0.28)] backdrop-blur-sm lg:right-auto">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-mint">
                On the map
              </p>
              <p className="mt-1 font-serif text-xl">{selected.name}</p>
              <p className="mt-1 text-sm text-mint/90">
                {selected.distanceMi} mi · {selected.elevationFt.toLocaleString()} ft ·{" "}
                {selected.conditions.tempF}°F · {selected.conditions.surface}
              </p>
            </div>
          )}
          {waiting && (
            <div className="pointer-events-none absolute right-4 top-4 rounded-full bg-card/95 px-3 py-1.5 text-xs font-medium text-muted shadow-sm">
              Reading the forecast…
            </div>
          )}
        </section>
      </div>

      <footer className="border-t border-forest/15 bg-card px-5 py-2.5 text-[11px] text-muted lg:px-7">
        Conditions from Open-Meteo for {date ? weekdayLabel(date) : "the selected day"}.
        Briefs only summarize that forecast — not a substitute for a trail report or
        your own judgment.
      </footer>
      </section>
    </div>
  );
}
