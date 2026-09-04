import type { Conditions, Surface } from "@/lib/types";
import type { ReactNode } from "react";

const surfaceClass: Record<Surface, string> = {
  "likely dry": "bg-mint text-forest",
  "possibly damp": "bg-sage/25 text-forest",
  "likely muddy": "bg-sky/15 text-sky",
};

function IconThermometer() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden>
      <path
        d="M7 2.5a1 1 0 0 1 2 0v6.2a2.25 2.25 0 1 1-2 0V2.5Z"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <circle cx="8" cy="12" r="1.1" fill="currentColor" />
    </svg>
  );
}

function IconWind() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden>
      <path
        d="M2 6.5h8.2a1.8 1.8 0 1 0-1.8-1.8M2 9.5h9.5A1.75 1.75 0 1 1 9.8 12"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconDrop() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden>
      <path
        d="M8 2.5s4 4.2 4 7a4 4 0 0 1-8 0c0-2.8 4-7 4-7Z"
        stroke="currentColor"
        strokeWidth="1.4"
      />
    </svg>
  );
}

function IconSun() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="2.4" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M8 2.2v1.4M8 12.4v1.4M2.2 8h1.4M12.4 8h1.4M3.9 3.9l1 1M11.1 11.1l1 1M12.1 3.9l-1 1M4.9 11.1l-1 1"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-xl bg-cream/70 px-2.5 py-2">
      <span className="text-sky">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-sage">
          {label}
        </p>
        <p className="truncate text-[13px] font-semibold text-forest">{value}</p>
      </div>
    </div>
  );
}

export default function ConditionsStats({ conditions }: { conditions: Conditions }) {
  return (
    <div className="grid grid-cols-2 gap-1.5">
      <Stat icon={<IconThermometer />} label="Trailhead" value={`${conditions.tempF}°F`} />
      <Stat icon={<IconWind />} label="Wind" value={`${conditions.windMph} mph`} />
      <Stat icon={<IconDrop />} label="Precip" value={`${conditions.precipProb}%`} />
      <Stat icon={<IconSun />} label="Sunrise" value={conditions.sunrise} />
      <div className="col-span-2 flex items-center justify-between rounded-xl bg-cream/70 px-2.5 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-sage">
          Surface
        </p>
        <span
          className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${surfaceClass[conditions.surface]}`}
        >
          {conditions.surface}
        </span>
      </div>
    </div>
  );
}
