import type { EventType } from "./db";

interface EventTypeStyle {
  label: string;
  /** Tailwind gradient classes for featured card left panel. */
  featuredBg: string;
  /** Tailwind chip background + text for compact rows. */
  chip: string;
  /** Border color for the date/time area in the featured card. */
  accent: string;
}

const styles: Record<EventType, EventTypeStyle> = {
  seminar: {
    label: "Семинар",
    featuredBg: "from-purple-800 to-indigo-900",
    chip: "bg-purple-100 text-purple-700",
    accent: "border-purple-300/40",
  },
  training: {
    label: "Сургалт",
    featuredBg: "from-blue-600 to-blue-800",
    chip: "bg-blue-100 text-blue-700",
    accent: "border-blue-300/40",
  },
  meeting: {
    label: "Уулзалт",
    featuredBg: "from-orange-400 to-orange-600",
    chip: "bg-rose-100 text-rose-700",
    accent: "border-orange-200/40",
  },
  volunteer: {
    label: "Сайн дурын ажил",
    featuredBg: "from-emerald-500 to-emerald-700",
    chip: "bg-emerald-100 text-emerald-700",
    accent: "border-emerald-200/40",
  },
  webinar: {
    label: "Вебинар",
    featuredBg: "from-fuchsia-500 to-fuchsia-700",
    chip: "bg-violet-100 text-violet-700",
    accent: "border-fuchsia-200/40",
  },
  event: {
    label: "Үйл явдал",
    featuredBg: "from-pink-500 to-rose-600",
    chip: "bg-pink-100 text-pink-700",
    accent: "border-pink-200/40",
  },
};

export function styleFor(type: EventType): EventTypeStyle {
  return styles[type] ?? styles.event;
}

export function formatDate(unix: number): string {
  const d = new Date(unix * 1000);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
}

export function formatTime(unix: number): string {
  const d = new Date(unix * 1000);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
