export type Difficulty = "easy" | "moderate" | "hard";
export type DayChoice = "today" | "saturday" | "sunday";
export type DistanceBand = "any" | "3-6" | "5-10" | "10+";
export type Surface = "likely dry" | "possibly damp" | "likely muddy";
export type BriefSource = "model" | "template";

export type Trail = {
  id: string;
  name: string;
  area: string;
  distanceMi: number;
  elevationFt: number;
  difficulty: Difficulty;
  trailhead: { lat: number; lng: number };
  peak: { lat: number; lng: number };
};

export type Conditions = {
  tempF: number;
  windMph: number;
  precipProb: number;
  precipLast48In: number;
  surface: Surface;
  sunrise: string;
  date: string;
};

export type LineString = {
  type: "LineString";
  coordinates: [number, number][];
};

export type TrailResult = {
  id: string;
  name: string;
  area: string;
  distanceMi: number;
  elevationFt: number;
  difficulty: Difficulty;
  trailhead: { lat: number; lng: number };
  geometry: LineString;
  distanceFromUserMi: number;
  conditions: Conditions;
  brief: string;
  briefSource: BriefSource;
  score: number;
};

export type TrailQuery = {
  lat: number;
  lng: number;
  day: DayChoice;
  radiusMi: number;
  distance: DistanceBand;
  difficulty: Difficulty | "any";
};
