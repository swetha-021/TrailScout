import { generateBriefs, briefContext } from "@/lib/brief";
import { targetDate } from "@/lib/dates";
import { findNearbyOsmTrails } from "@/lib/osmNearby";
import { scoreTrail } from "@/lib/rank";
import { distanceRange, filterTrails, haversineMi, trailGeometry } from "@/lib/trails";
import type {
  DayChoice,
  Difficulty,
  DistanceBand,
  LineString,
  Trail,
  TrailQuery,
  TrailResult,
} from "@/lib/types";
import { fetchConditions } from "@/lib/weather";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function num(value: string | null, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function parseQuery(req: NextRequest): TrailQuery {
  const url = req.nextUrl;
  const day = (url.searchParams.get("day") ?? "saturday") as DayChoice;
  const distance = (url.searchParams.get("distance") ?? "5-10") as DistanceBand;
  const difficulty = (url.searchParams.get("difficulty") ?? "moderate") as
    | Difficulty
    | "any";

  return {
    lat: num(url.searchParams.get("lat"), 37.5483),
    lng: num(url.searchParams.get("lng"), -121.9886),
    day: ["today", "saturday", "sunday"].includes(day) ? day : "saturday",
    radiusMi: num(url.searchParams.get("radius"), 30),
    distance: ["any", "3-6", "5-10", "10+"].includes(distance) ? distance : "5-10",
    difficulty: ["any", "easy", "moderate", "hard"].includes(difficulty)
      ? difficulty
      : "moderate",
  };
}

function matchesFilters(
  trail: Trail,
  query: TrailQuery,
): boolean {
  const { min, max } = distanceRange(query.distance);
  if (trail.distanceMi < min || trail.distanceMi > max) return false;
  if (query.difficulty !== "any" && trail.difficulty !== query.difficulty) {
    return false;
  }
  return true;
}

export async function GET(req: NextRequest) {
  try {
    const query = parseQuery(req);
    const date = targetDate(query.day);

    let matched: { trail: Trail; milesAway: number; geometry: LineString }[] = [];

    try {
      const nearby = await findNearbyOsmTrails(query.lat, query.lng, query.radiusMi);
      matched = nearby
        .filter((trail) => matchesFilters(trail, query))
        .map((trail) => ({
          trail,
          milesAway: haversineMi(query, trail.trailhead),
          geometry: trail.geometry,
        }));
    } catch {
      matched = [];
    }

    if (matched.length === 0) {
      matched = filterTrails(query).map((m) => ({
        ...m,
        geometry: trailGeometry(m.trail),
      }));
    }

    if (matched.length === 0) {
      return NextResponse.json({ date, source: "none", trails: [] as TrailResult[] });
    }

    const conditions = await fetchConditions(
      matched.map((m) => m.trail.trailhead),
      date,
    );

    const ranked = matched
      .map((m, i) => {
        const wx = conditions[i];
        if (!wx || Number.isNaN(wx.tempF)) {
          throw new Error("Weather data was incomplete for a trailhead");
        }
        return {
          ...m,
          conditions: wx,
          score: scoreTrail({
            distanceMi: m.trail.distanceMi,
            milesAway: m.milesAway,
            radiusMi: query.radiusMi,
            band: query.distance,
            conditions: wx,
          }),
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);

    const { briefs, source } = await generateBriefs(
      ranked.map((r) => briefContext(r.trail, r.conditions)),
    );

    const trails: TrailResult[] = ranked.map((r) => ({
      id: r.trail.id,
      name: r.trail.name,
      area: r.trail.area,
      distanceMi: r.trail.distanceMi,
      elevationFt: r.trail.elevationFt,
      difficulty: r.trail.difficulty,
      trailhead: r.trail.trailhead,
      geometry: r.geometry,
      distanceFromUserMi: Math.round(r.milesAway * 10) / 10,
      conditions: r.conditions,
      brief: briefs[r.trail.id] ?? "",
      briefSource: source,
      score: Math.round(r.score * 100) / 100,
    }));

    return NextResponse.json({ date, trails });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
