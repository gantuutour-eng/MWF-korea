import type { PortfolioTone } from "./db";

interface ToneClasses {
  /** Stat card bg + text */
  stat: string;
  /** Program icon circle bg + text */
  icon: string;
}

const map: Record<PortfolioTone, ToneClasses> = {
  orange: {
    stat: "bg-orange-50 text-orange-700",
    icon: "bg-orange-50 text-orange-500",
  },
  purple: {
    stat: "bg-purple-50 text-purple-700",
    icon: "bg-purple-50 text-purple-500",
  },
  rose: {
    stat: "bg-rose-50 text-rose-700",
    icon: "bg-rose-50 text-rose-500",
  },
  emerald: {
    stat: "bg-emerald-50 text-emerald-700",
    icon: "bg-emerald-50 text-emerald-500",
  },
  blue: {
    stat: "bg-blue-50 text-blue-700",
    icon: "bg-blue-50 text-blue-500",
  },
  amber: {
    stat: "bg-amber-50 text-amber-700",
    icon: "bg-amber-50 text-amber-600",
  },
};

export function toneClasses(tone: string): ToneClasses {
  return map[tone as PortfolioTone] ?? map.purple;
}
