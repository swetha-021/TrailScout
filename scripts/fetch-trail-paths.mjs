import { writeFileSync } from "node:fs";

const trails = [
  ["mission-peak-loop", 37.5125, -121.9085, 37.5124, -121.8805],
  ["mission-peak-ohlone", 37.5303, -121.9194, 37.5124, -121.8805],
  ["monument-peak", 37.4602, -121.8638, 37.4848, -121.8638],
  ["sunol-little-yosemite", 37.5117, -121.8336, 37.5265, -121.8122],
  ["pleasanton-ridge", 37.6158, -121.893, 37.5994, -121.9175],
  ["vargas-plateau", 37.5746, -121.917, 37.5618, -121.9004],
  ["garin-dry-creek", 37.6325, -122.024, 37.6408, -122.0385],
  ["lake-chabot", 37.7175, -122.1035, 37.7322, -122.094],
  ["palomares-ridge", 37.6762, -122.0128, 37.6684, -122.0286],
  ["alum-rock", 37.3975, -121.8008, 37.4048, -121.7852],
  ["sierra-vista", 37.425, -121.795, 37.4365, -121.7728],
  ["windy-hill", 37.3638, -122.2185, 37.3657, -122.2481],
  ["black-mountain", 37.3274, -122.1463, 37.3185, -122.1637],
  ["rancho-black-mountain", 37.333, -122.0869, 37.3185, -122.1637],
  ["las-trampas", 37.8164, -122.0493, 37.8322, -122.0441],
  ["briones", 37.9358, -122.1378, 37.9506, -122.1234],
  ["redwood-east-ridge", 37.8124, -122.166, 37.8128, -122.1485],
  ["grant-halls-valley", 37.3362, -121.7148, 37.3514, -121.6985],
  ["diablo-mitchell", 37.9208, -121.9413, 37.8816, -121.9144],
  ["sibley-volcanic", 37.8478, -122.1904, 37.8552, -122.1938],
  ["coyote-hills", 37.5542, -122.0784, 37.5448, -122.0912],
  ["russian-ridge", 37.3245, -122.2228, 37.3174, -122.2212],
];

async function route(points) {
  const coords = points.map(([lat, lng]) => `${lng},${lat}`).join(";");
  const url = `https://router.project-osrm.org/route/v1/foot/${coords}?overview=full&geometries=geojson`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`OSRM ${res.status}`);
  const json = await res.json();
  const line = json.routes?.[0]?.geometry?.coordinates;
  if (!Array.isArray(line) || line.length < 2) throw new Error("No geometry");
  return line;
}

function viaPoint(lat1, lng1, lat2, lng2) {
  const dx = lng2 - lng1;
  const dy = lat2 - lat1;
  return [lat1 + dy * 0.5 + dx * 0.28, lng1 + dx * 0.5 - dy * 0.28];
}

const paths = {};

for (const [id, lat1, lng1, lat2, lng2] of trails) {
  try {
    const [viaLat, viaLng] = viaPoint(lat1, lng1, lat2, lng2);
    let coords;
    try {
      coords = await route([
        [lat1, lng1],
        [lat2, lng2],
        [viaLat, viaLng],
        [lat1, lng1],
      ]);
    } catch {
      coords = await route([
        [lat1, lng1],
        [lat2, lng2],
      ]);
    }
    paths[id] = coords;
    console.log(id, coords.length, "pts");
  } catch (error) {
    console.error(id, error.message);
  }
  await new Promise((r) => setTimeout(r, 250));
}

writeFileSync(
  new URL("../data/trail-paths.json", import.meta.url),
  JSON.stringify(paths),
);
console.log("wrote", Object.keys(paths).length, "paths");
