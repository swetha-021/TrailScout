import type { Conditions, DistanceBand } from "@/lib/types";
import { distanceRange } from "@/lib/trails";

function clamp(n: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, n));
}

export function scoreTrail(input: {
  distanceMi: number;
  milesAway: number;
  radiusMi: number;
  band: DistanceBand;
  conditions: Conditions;
}): number {
  const { min, max } = distanceRange(input.band);
  const mid = (min + max) / 2;
  const spread = Math.max(1, (max - min) / 2);
  const distanceFit =
    input.band === "any"
      ? 1
      : 1 - Math.min(1, Math.abs(input.distanceMi - mid) / spread);

  const proximity = 1 - Math.min(1, input.milesAway / Math.max(input.radiusMi, 1));

  let weather = 0.7;
  if (input.conditions.precipProb > 40) weather -= 0.35;
  else if (input.conditions.precipProb > 20) weather -= 0.15;
  if (input.conditions.windMph > 25) weather -= 0.25;
  else if (input.conditions.windMph > 18) weather -= 0.1;
  if (input.conditions.tempF < 40 || input.conditions.tempF > 90) weather -= 0.2;
  else if (input.conditions.tempF >= 50 && input.conditions.tempF <= 75) weather += 0.15;
  if (input.conditions.surface === "likely muddy") weather -= 0.3;
  else if (input.conditions.surface === "possibly damp") weather -= 0.1;
  else weather += 0.1;

  return (
    0.3 * distanceFit + 0.25 * proximity + 0.45 * clamp(weather)
  );
}
