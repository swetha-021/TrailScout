import { TRAILS } from "@/data/trails";
import trailPaths from "@/data/trail-paths.json";
import type { DistanceBand, LineString, Trail, TrailQuery } from "@/lib/types";

const OSM_PATHS = trailPaths as unknown as Record<string, [number, number][]>;

export const DEFAULT_ORIGIN = { lat: 37.5483, lng: -121.9886 }; // Fremont, CA

const EARTH_MI = 3958.8;

export function haversineMi(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return 2 * EARTH_MI * Math.asin(Math.min(1, Math.sqrt(h)));
}

function downsample(coords: [number, number][], max = 400): [number, number][] {
  if (coords.length <= max) return coords;
  const step = Math.ceil(coords.length / max);
  const out = coords.filter((_, i) => i % step === 0);
  const last = coords[coords.length - 1];
  if (out[out.length - 1] !== last) out.push(last);
  return out;
}

/** OSM walking path from trailhead toward the high point (OSRM on OpenStreetMap). */
export function trailGeometry(trail: Trail): LineString {
  const osm = OSM_PATHS[trail.id];
  if (osm?.length >= 2) {
    return { type: "LineString", coordinates: downsample(osm) };
  }

  const lng1 = trail.trailhead.lng;
  const lat1 = trail.trailhead.lat;
  const lng2 = trail.peak.lng;
  const lat2 = trail.peak.lat;
  const dx = lng2 - lng1;
  const dy = lat2 - lat1;
  return {
    type: "LineString",
    coordinates: [
      [lng1, lat1],
      [lng1 + dx * 0.32 - dy * 0.16, lat1 + dy * 0.32 + dx * 0.16],
      [lng2, lat2],
      [lng1 + dx * 0.58 + dy * 0.18, lat1 + dy * 0.58 - dx * 0.18],
      [lng1 + dx * 0.18 + dy * 0.08, lat1 + dy * 0.18 - dx * 0.08],
      [lng1, lat1],
    ],
  };
}

export function distanceRange(band: DistanceBand): { min: number; max: number } {
  switch (band) {
    case "3-6":
      return { min: 3, max: 6 };
    case "5-10":
      return { min: 5, max: 10 };
    case "10+":
      return { min: 10, max: 100 };
    default:
      return { min: 0, max: 100 };
  }
}

export function filterTrails(query: TrailQuery): { trail: Trail; milesAway: number }[] {
  const { min, max } = distanceRange(query.distance);
  return TRAILS.flatMap((trail) => {
    const milesAway = haversineMi(query, trail.trailhead);
    if (milesAway > query.radiusMi) return [];
    if (trail.distanceMi < min || trail.distanceMi > max) return [];
    if (query.difficulty !== "any" && trail.difficulty !== query.difficulty) {
      return [];
    }
    return [{ trail, milesAway }];
  });
}
