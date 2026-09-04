"use client";

import type { TrailResult } from "@/lib/types";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";

type Props = {
  trails: TrailResult[];
  selectedId: string | null;
  origin: { lat: number; lng: number };
  onSelect: (id: string) => void;
};

function toLatLngs(trail: TrailResult): L.LatLngExpression[] {
  return trail.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
}

function waitForSize(el: HTMLElement): Promise<void> {
  if (el.clientWidth > 20 && el.clientHeight > 20) return Promise.resolve();

  return new Promise((resolve) => {
    const observer = new ResizeObserver(() => {
      if (el.clientWidth > 20 && el.clientHeight > 20) {
        observer.disconnect();
        resolve();
      }
    });
    observer.observe(el);
  });
}

function drawTrails(
  group: L.LayerGroup,
  trails: TrailResult[],
  selectedId: string | null,
  origin: { lat: number; lng: number },
  onSelect: (id: string) => void,
) {
  group.clearLayers();

  L.circleMarker([origin.lat, origin.lng], {
    radius: 6,
    color: "#E7D8A8",
    weight: 2,
    fillColor: "#4C7CBE",
    fillOpacity: 1,
  }).addTo(group);

  const others = trails.filter((trail) => trail.id !== selectedId);
  const selected = trails.find((trail) => trail.id === selectedId);

  for (const trail of others) {
    L.polyline(toLatLngs(trail), {
      color: "#91995E",
      weight: 3,
      opacity: 0.35,
    })
      .on("click", () => onSelect(trail.id))
      .addTo(group);

    L.circleMarker([trail.trailhead.lat, trail.trailhead.lng], {
      radius: 5,
      color: "#E7D8A8",
      weight: 1.5,
      fillColor: "#91995E",
      fillOpacity: 0.7,
    })
      .on("click", () => onSelect(trail.id))
      .addTo(group);
  }

  if (selected) {
    L.polyline(toLatLngs(selected), {
      color: "#E7D8A8",
      weight: 10,
      opacity: 0.9,
    }).addTo(group);

    L.polyline(toLatLngs(selected), {
      color: "#4C7CBE",
      weight: 6,
      opacity: 1,
    })
      .on("click", () => onSelect(selected.id))
      .addTo(group);

    L.circleMarker([selected.trailhead.lat, selected.trailhead.lng], {
      radius: 9,
      color: "#E7D8A8",
      weight: 3,
      fillColor: "#4C7CBE",
      fillOpacity: 1,
    })
      .on("click", () => onSelect(selected.id))
      .addTo(group);
  }
}

function focusTrail(map: L.Map, trail: TrailResult, animate: boolean) {
  const latlngs = toLatLngs(trail);
  if (latlngs.length === 0) return;
  const bounds = L.latLngBounds(latlngs);
  const options = { padding: [56, 56] as L.PointExpression, maxZoom: 15 };
  if (animate) {
    map.flyToBounds(bounds, { ...options, duration: 0.85 });
  } else {
    map.fitBounds(bounds, options);
  }
}

export default function TrailMap({ trails, selectedId, origin, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const groupRef = useRef<L.LayerGroup | null>(null);
  const onSelectRef = useRef(onSelect);
  const trailsRef = useRef(trails);
  const selectedRef = useRef(selectedId);
  const originRef = useRef(origin);
  const lastFocusRef = useRef<string | null>(null);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;

    waitForSize(el).then(() => {
      if (cancelled || mapRef.current || !containerRef.current) return;

      const map = L.map(containerRef.current, {
        zoomControl: true,
        attributionControl: true,
        scrollWheelZoom: true,
      }).setView([originRef.current.lat, originRef.current.lng], 11);

      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      const group = L.layerGroup().addTo(map);
      mapRef.current = map;
      groupRef.current = group;

      drawTrails(
        group,
        trailsRef.current,
        selectedRef.current,
        originRef.current,
        (id) => onSelectRef.current(id),
      );
      const first = trailsRef.current.find((t) => t.id === selectedRef.current);
      if (first) {
        focusTrail(map, first, false);
        lastFocusRef.current = first.id;
      }

      const resize = () => map.invalidateSize();
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(containerRef.current);
      requestAnimationFrame(resize);
    });

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      mapRef.current?.remove();
      mapRef.current = null;
      groupRef.current = null;
    };
  }, []);

  useEffect(() => {
    trailsRef.current = trails;
    selectedRef.current = selectedId;
    originRef.current = origin;
    const map = mapRef.current;
    const group = groupRef.current;
    if (!map || !group) return;
    drawTrails(group, trails, selectedId, origin, (id) => onSelectRef.current(id));
    const selected = trails.find((trail) => trail.id === selectedId);
    if (selected && lastFocusRef.current !== selected.id) {
      focusTrail(map, selected, true);
      lastFocusRef.current = selected.id;
    }
    map.invalidateSize();
  }, [trails, selectedId, origin]);

  return <div ref={containerRef} className="trail-map h-full w-full" />;
}
