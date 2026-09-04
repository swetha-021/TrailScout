import { formatClock } from "@/lib/dates";
import type { Conditions, Surface } from "@/lib/types";

type OpenMeteoLocation = {
  hourly: {
    time: string[];
    temperature_2m: number[];
    precipitation_probability: number[];
    wind_speed_10m: number[];
  };
  daily: {
    time: string[];
    sunrise: string[];
    precipitation_sum: number[];
  };
};

function surfaceFromPrecip(inches: number): Surface {
  if (inches > 0.5) return "likely muddy";
  if (inches > 0.1) return "possibly damp";
  return "likely dry";
}

function pickHourIndex(times: string[], date: string): number {
  const hour8 = times.findIndex((t) => t.startsWith(`${date}T08:`));
  if (hour8 >= 0) return hour8;
  const hour9 = times.findIndex((t) => t.startsWith(`${date}T09:`));
  if (hour9 >= 0) return hour9;
  return times.findIndex((t) => t.startsWith(`${date}T`));
}

function parseLocation(data: OpenMeteoLocation, date: string): Conditions {
  const hourIdx = pickHourIndex(data.hourly.time, date);
  const dayIdx = data.daily.time.indexOf(date);

  const tempF = hourIdx >= 0 ? data.hourly.temperature_2m[hourIdx] : NaN;
  const windMph = hourIdx >= 0 ? data.hourly.wind_speed_10m[hourIdx] : NaN;
  const precipProb =
    hourIdx >= 0 ? data.hourly.precipitation_probability[hourIdx] : NaN;

  const prev1 = dayIdx >= 1 ? data.daily.precipitation_sum[dayIdx - 1] : 0;
  const prev2 = dayIdx >= 2 ? data.daily.precipitation_sum[dayIdx - 2] : 0;
  const precipLast48In = (prev1 ?? 0) + (prev2 ?? 0);

  const sunriseIso = dayIdx >= 0 ? data.daily.sunrise[dayIdx] : "";

  return {
    tempF: Math.round(tempF),
    windMph: Math.round(windMph),
    precipProb: Math.round(precipProb),
    precipLast48In: Math.round(precipLast48In * 100) / 100,
    surface: surfaceFromPrecip(precipLast48In),
    sunrise: sunriseIso ? formatClock(sunriseIso) : "—",
    date,
  };
}

export async function fetchConditions(
  points: { lat: number; lng: number }[],
  date: string,
): Promise<Conditions[]> {
  if (points.length === 0) return [];

  const params = new URLSearchParams({
    latitude: points.map((p) => p.lat.toFixed(4)).join(","),
    longitude: points.map((p) => p.lng.toFixed(4)).join(","),
    hourly: "temperature_2m,precipitation_probability,wind_speed_10m",
    daily: "sunrise,precipitation_sum",
    past_days: "3",
    forecast_days: "8",
    timezone: "auto",
    temperature_unit: "fahrenheit",
    wind_speed_unit: "mph",
    precipitation_unit: "inch",
  });

  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, {
    next: { revalidate: 1200 },
  });

  if (!res.ok) {
    throw new Error(`Open-Meteo returned ${res.status}`);
  }

  const json: OpenMeteoLocation | OpenMeteoLocation[] = await res.json();
  const locations = Array.isArray(json) ? json : [json];
  return locations.map((loc) => parseLocation(loc, date));
}
