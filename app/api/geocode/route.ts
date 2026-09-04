import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ places: [] });

  const params = new URLSearchParams({
    name: q,
    count: "5",
    language: "en",
    format: "json",
  });
  const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params}`, {
    next: { revalidate: 3600 },
  });
  if (!res.ok) {
    return NextResponse.json({ error: "Geocoding failed" }, { status: 502 });
  }

  const json = (await res.json()) as {
    results?: {
      name: string;
      admin1?: string;
      country?: string;
      latitude: number;
      longitude: number;
    }[];
  };

  const places = (json.results ?? []).map((place) => ({
    name: place.name,
    label: [place.name, place.admin1, place.country].filter(Boolean).join(", "),
    lat: place.latitude,
    lng: place.longitude,
  }));

  return NextResponse.json({ places });
}
