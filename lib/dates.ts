import type { DayChoice } from "@/lib/types";

const TZ = "America/Los_Angeles";

function ymdInZone(date: Date): { y: number; m: number; d: number; weekday: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return {
    y: Number(get("year")),
    m: Number(get("month")),
    d: Number(get("day")),
    weekday: weekdayMap[get("weekday")] ?? 0,
  };
}

function shiftDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function isoDate(parts: { y: number; m: number; d: number }): string {
  return `${parts.y}-${String(parts.m).padStart(2, "0")}-${String(parts.d).padStart(2, "0")}`;
}

export function targetDate(day: DayChoice, from = new Date()): string {
  if (day === "today") return isoDate(ymdInZone(from));

  const want = day === "saturday" ? 6 : 0;
  for (let i = 0; i < 8; i++) {
    const candidate = shiftDays(from, i);
    const parts = ymdInZone(candidate);
    if (parts.weekday === want) return isoDate(parts);
  }
  return isoDate(ymdInZone(from));
}

export function weekdayLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 18));
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function formatClock(isoDateTime: string): string {
  const match = isoDateTime.match(/T(\d{2}):(\d{2})/);
  if (!match) return isoDateTime;
  let hour = Number(match[1]);
  const minute = match[2];
  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  return `${hour}:${minute} ${ampm}`;
}
