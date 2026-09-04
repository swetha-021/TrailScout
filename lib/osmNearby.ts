import { haversineMi } from "@/lib/trails";
import type { Difficulty, LineString, Trail } from "@/lib/types";

export type NearbyTrail = Trail & { geometry: LineString };

type OverpassElement = {
  id: number;
  type: string;
  tags?: Record<string, string>;
  center?: { lat: number; lon: number };
  members?: {
    type: string;
    geometry?: { lat: number; lon: number }[];
  }[];
};

const cache = new Map<string, { at: number; trails: NearbyTrail[] }>();
const CACHE_MS = 15 * 60 * 1000;

function downsample(coords: [number, number][], max = 400): [number, number][] {
  if (coords.length <= max) return coords;
  const step = Math.ceil(coords.length / max);
  const out = coords.filter((_, i) => i % step === 0);
  const last = coords[coords.length - 1];
  if (out[out.length - 1] !== last) out.push(last);
  return out;
}

function pathLengthMi(coords: [number, number][]): number {
  let miles = 0;
  for (let i = 1; i < coords.length; i++) {
    miles += haversineMi(
      { lat: coords[i - 1][1], lng: coords[i - 1][0] },
      { lat: coords[i][1], lng: coords[i][0] },
    );
  }
  return miles;
}

function inferDifficulty(distanceMi: number, elevationFt: number): Difficulty {
  if (distanceMi < 5 && elevationFt < 700) return "easy";
  if (distanceMi <= 10 && elevationFt <= 2200) return "moderate";
  return "hard";
}

function coordsFromRelation(el: OverpassElement): [number, number][] {
  const coords: [number, number][] = [];
  for (const member of el.members ?? []) {
    if (!member.geometry) continue;
    for (const point of member.geometry) {
      coords.push([point.lon, point.lat]);
    }
  }
  return downsample(coords);
}

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

const SKIP_NAME = /bay trail|ridge trail|pacific crest|john muir trail|\bpct\b/i;

async function overpass(query: string): Promise<OverpassElement[]> {
  let lastError: Error | null = null;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `data=${encodeURIComponent(query)}`,
        cache: "no-store",
        signal: AbortSignal.timeout(28000),
      });
      if (!res.ok) throw new Error(`Overpass returned ${res.status}`);
      const json = (await res.json()) as { elements?: OverpassElement[] };
      return json.elements ?? [];
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Overpass failed");
    }
  }
  throw lastError ?? new Error("Overpass failed");
}

function sampleCoords(coords: [number, number][]): [number, number][] {
  return [0, 0.2, 0.4, 0.6, 0.8, 1].map((t) => {
    const i = Math.min(coords.length - 1, Math.round(t * (coords.length - 1)));
    return coords[i];
  });
}

async function elevationGainsFt(paths: [number, number][][]): Promise<number[]> {
  const samples = paths.flatMap(sampleCoords);
  if (samples.length === 0) return paths.map(() => 0);
  const params = new URLSearchParams({
    latitude: samples.map((c) => c[1].toFixed(4)).join(","),
    longitude: samples.map((c) => c[0].toFixed(4)).join(","),
  });
  const res = await fetch(`https://api.open-meteo.com/v1/elevation?${params}`, {
    next: { revalidate: 86400 },
  });
  if (!res.ok) return paths.map(() => 0);
  const json = (await res.json()) as { elevation?: number[] };
  const elev = json.elevation ?? [];
  return paths.map((_, pathIndex) => {
    const slice = elev.slice(pathIndex * 6, pathIndex * 6 + 6);
    if (slice.length === 0) return 0;
    return Math.max(0, Math.round((Math.max(...slice) - Math.min(...slice)) * 3.28084));
  });
}

export async function findNearbyOsmTrails(
  lat: number,
  lng: number,
  radiusMi: number,
): Promise<NearbyTrail[]> {
  const key = `${lat.toFixed(2)}:${lng.toFixed(2)}:${radiusMi}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.trails;

  const radiusM = Math.round(Math.min(radiusMi, 50) * 1609.34);
  const listed = await overpass(`
[out:json][timeout:20];
relation["route"="hiking"]["name"](around:${radiusM},${lat},${lng});
out tags center;
`);

  const ranked = listed
    .filter((el) => el.tags?.name && el.center && !SKIP_NAME.test(el.tags.name))
    .map((el) => ({
      el,
      milesAway: haversineMi(
        { lat, lng },
        { lat: el.center!.lat, lng: el.center!.lon },
      ),
    }))
    .filter((item) => item.milesAway <= radiusMi)
    .sort((a, b) => a.milesAway - b.milesAway)
    .slice(0, 10);

  if (ranked.length === 0) {
    cache.set(key, { at: Date.now(), trails: [] });
    return [];
  }

  const ids = ranked.map((item) => item.el.id).join(",");
  const detailed = await overpass(`
[out:json][timeout:25];
relation(id:${ids});
out geom;
`);
  const byId = new Map(detailed.map((el) => [el.id, el]));

  const drafted: { item: (typeof ranked)[number]; coords: [number, number][]; distanceMi: number }[] =
    [];
  for (const item of ranked) {
    const full = byId.get(item.el.id) ?? item.el;
    const coords = coordsFromRelation(full);
    if (coords.length < 4) continue;
    const distanceMi = Math.round(pathLengthMi(coords) * 10) / 10;
    if (distanceMi < 0.8) continue;
    drafted.push({ item, coords, distanceMi });
  }

  const gains = await elevationGainsFt(drafted.map((d) => d.coords));
  const trails: NearbyTrail[] = drafted.map((draft, i) => {
    const elevationFt = gains[i] ?? 0;
    const name = draft.item.el.tags?.name ?? "Hiking route";
    const area =
      draft.item.el.tags?.operator ??
      draft.item.el.tags?.network ??
      draft.item.el.tags?.["is_in"] ??
      "OpenStreetMap";
    return {
      id: `osm-${draft.item.el.id}`,
      name,
      area,
      distanceMi: draft.distanceMi,
      elevationFt,
      difficulty: inferDifficulty(draft.distanceMi, elevationFt),
      trailhead: { lat: draft.coords[0][1], lng: draft.coords[0][0] },
      peak: {
        lat: draft.coords[Math.floor(draft.coords.length / 2)][1],
        lng: draft.coords[Math.floor(draft.coords.length / 2)][0],
      },
      geometry: { type: "LineString", coordinates: draft.coords },
    };
  });

  cache.set(key, { at: Date.now(), trails });
  return trails;
}
