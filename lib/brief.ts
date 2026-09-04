import type { BriefSource, Conditions, Trail } from "@/lib/types";
import { weekdayLabel } from "@/lib/dates";

export type BriefInput = {
  id: string;
  name: string;
  distanceMi: number;
  elevationFt: number;
  conditions: Conditions;
};

export function templateBrief(trail: BriefInput): string {
  const day = weekdayLabel(trail.conditions.date).split(",")[0];
  const { tempF, windMph, precipProb, surface, sunrise } = trail.conditions;

  let opener: string;
  if (surface === "likely muddy") {
    opener = `${day} looks messy underfoot after recent rain.`;
  } else if (precipProb >= 40) {
    opener = `${day} carries a real chance of rain — pack a shell.`;
  } else if (windMph >= 25) {
    opener = `Usable ${day} if you're comfortable with strong wind.`;
  } else {
    opener = `A good option for ${day} morning.`;
  }

  const weather = `Expect ${tempF}°F at the trailhead with ${windMph} mph wind and ${precipProb}% precipitation. The trail is ${surface}.`;

  let closer: string;
  if (trail.elevationFt >= 1500) {
    closer = `The ${trail.elevationFt.toLocaleString()} ft of gain favors an early start after ${sunrise} sunrise.`;
  } else if (tempF >= 78) {
    closer = `Temperatures trend warm; an early start after ${sunrise} sunrise will be more comfortable.`;
  } else {
    closer = `Sunrise is ${sunrise}.`;
  }

  return `${opener} ${weather} ${closer}`;
}

type ModelResponse = {
  briefs?: { id: string; brief: string }[];
};

export async function generateBriefs(
  trails: BriefInput[],
): Promise<{ briefs: Record<string, string>; source: BriefSource }> {
  const fallback = Object.fromEntries(
    trails.map((t) => [t.id, templateBrief(t)]),
  );
  const key = process.env.OPENAI_API_KEY;
  if (!key || trails.length === 0) {
    return { briefs: fallback, source: "template" };
  }

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.4,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You write short trail trip briefs for hikers. Only restate the provided measurements. Never invent weather, crowds, wildlife, permits, closures, or hazards that are not in the input. 3-4 sentences per trail. Return JSON {\"briefs\":[{\"id\":\"...\",\"brief\":\"...\"}]}. If elevationFt is 1500 or more you may mention an early start. If the trail is likely muddy, say so.",
          },
          {
            role: "user",
            content: JSON.stringify(
              trails.map((t) => ({
                id: t.id,
                name: t.name,
                distanceMi: t.distanceMi,
                elevationFt: t.elevationFt,
                date: weekdayLabel(t.conditions.date),
                tempF: t.conditions.tempF,
                windMph: t.conditions.windMph,
                precipProb: t.conditions.precipProb,
                surface: t.conditions.surface,
                sunrise: t.conditions.sunrise,
              })),
            ),
          },
        ],
      }),
    });

    if (!res.ok) return { briefs: fallback, source: "template" };

    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const parsed = JSON.parse(json.choices?.[0]?.message?.content ?? "{}") as ModelResponse;
    const fromModel: Record<string, string> = { ...fallback };
    for (const item of parsed.briefs ?? []) {
      if (item.id && item.brief) fromModel[item.id] = item.brief.trim();
    }
    return { briefs: fromModel, source: "model" };
  } catch {
    return { briefs: fallback, source: "template" };
  }
}

export function briefContext(trail: Trail, conditions: Conditions): BriefInput {
  return {
    id: trail.id,
    name: trail.name,
    distanceMi: trail.distanceMi,
    elevationFt: trail.elevationFt,
    conditions,
  };
}
