# TrailScout

Where should I go this weekend?

A small trail discovery app for the Bay Area. You pick **hiking**, a **day**, a **radius**, **distance**, and **difficulty**. TrailScout ranks matching trails using a live trailhead forecast and writes a short trip brief that only restates those numbers.

This is a portfolio project aimed at outdoor recreation software: maps, real-world conditions, and AI used as a summary layer — not as the source of truth.

## What it does

1. Filters a curated set of East & South Bay hikes (not a live AllTrails scrape).
2. Pulls Saturday/Sunday/today weather from [Open-Meteo](https://open-meteo.com/) at each trailhead: temperature, wind, precipitation chance, sunrise, and the last 48 hours of rain.
3. Derives surface condition from recent precip (`likely dry` / `possibly damp` / `likely muddy`).
4. Ranks trails by how well they fit the query **and** how usable the forecast looks.
5. Writes a 3–4 sentence brief. If `OPENAI_API_KEY` is set, that brief comes from gpt-4o-mini with the forecast JSON as the only input. Otherwise it uses a deterministic template from the same fields.

The model is not allowed to invent hazards, crowds, or weather.

## Stack

- Next.js (App Router) + TypeScript
- MapLibre GL + OpenFreeMap
- Open-Meteo Forecast API
- Optional OpenAI for briefs

## Run it

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Location uses the browser if you allow it, otherwise Fremont so Mission Peak still appears.

```bash
cp .env.example .env.local
# add OPENAI_API_KEY if you want model-written briefs
```

## Data notes

Trail geometries are simplified loops from trailhead to high point so the map has something honest to draw. Mileage, elevation, and difficulty are curated, not computed from a DEM.

Briefs summarize Open-Meteo. They are not a substitute for a park report, a ranger, or (in winter) an avalanche forecast.
