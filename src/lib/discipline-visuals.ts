import type { LucideIcon } from "lucide-react";
import {
  BookText,
  BrainCircuit,
  Calculator,
  Dumbbell,
  Feather,
  FlaskConical,
  Globe2,
  Landmark,
  Languages,
  Library,
  Palette,
  PenSquare,
  Scale,
  Shapes,
} from "lucide-react";

type DisciplineVisual = {
  badge: string;
  icon: LucideIcon;
  surface: string;
  accentText: string;
  borderHover: string;
  iconWrap: string;
  chip: string;
  line: string;
};

const visuals: Record<string, DisciplineVisual> = {
  mat: {
    badge: "Numeros",
    icon: Calculator,
    surface: "from-emerald-500/18 via-emerald-300/8 to-transparent",
    accentText: "text-emerald-700",
    borderHover: "hover:border-emerald-500/30",
    iconWrap: "bg-emerald-500/10 text-emerald-700",
    chip: "bg-emerald-500/10 text-emerald-700",
    line: "from-emerald-500/70 via-emerald-300/40 to-transparent",
  },
  port: {
    badge: "Leitura",
    icon: BookText,
    surface: "from-sky-500/18 via-sky-300/8 to-transparent",
    accentText: "text-sky-700",
    borderHover: "hover:border-sky-500/30",
    iconWrap: "bg-sky-500/10 text-sky-700",
    chip: "bg-sky-500/10 text-sky-700",
    line: "from-sky-500/70 via-sky-300/40 to-transparent",
  },
  cien: {
    badge: "Experimentos",
    icon: FlaskConical,
    surface: "from-violet-500/18 via-violet-300/8 to-transparent",
    accentText: "text-violet-700",
    borderHover: "hover:border-violet-500/30",
    iconWrap: "bg-violet-500/10 text-violet-700",
    chip: "bg-violet-500/10 text-violet-700",
    line: "from-violet-500/70 via-violet-300/40 to-transparent",
  },
  hist: {
    badge: "Contexto",
    icon: Landmark,
    surface: "from-amber-500/18 via-amber-300/8 to-transparent",
    accentText: "text-amber-700",
    borderHover: "hover:border-amber-500/30",
    iconWrap: "bg-amber-500/10 text-amber-700",
    chip: "bg-amber-500/10 text-amber-700",
    line: "from-amber-500/70 via-amber-300/40 to-transparent",
  },
  geo: {
    badge: "Territorio",
    icon: Globe2,
    surface: "from-teal-500/18 via-teal-300/8 to-transparent",
    accentText: "text-teal-700",
    borderHover: "hover:border-teal-500/30",
    iconWrap: "bg-teal-500/10 text-teal-700",
    chip: "bg-teal-500/10 text-teal-700",
    line: "from-teal-500/70 via-teal-300/40 to-transparent",
  },
  edf: {
    badge: "Movimento",
    icon: Dumbbell,
    surface: "from-orange-500/18 via-orange-300/8 to-transparent",
    accentText: "text-orange-700",
    borderHover: "hover:border-orange-500/30",
    iconWrap: "bg-orange-500/10 text-orange-700",
    chip: "bg-orange-500/10 text-orange-700",
    line: "from-orange-500/70 via-orange-300/40 to-transparent",
  },
  ing: {
    badge: "Idioma",
    icon: Languages,
    surface: "from-indigo-500/18 via-indigo-300/8 to-transparent",
    accentText: "text-indigo-700",
    borderHover: "hover:border-indigo-500/30",
    iconWrap: "bg-indigo-500/10 text-indigo-700",
    chip: "bg-indigo-500/10 text-indigo-700",
    line: "from-indigo-500/70 via-indigo-300/40 to-transparent",
  },
  esp: {
    badge: "Idioma",
    icon: Languages,
    surface: "from-rose-500/18 via-rose-300/8 to-transparent",
    accentText: "text-rose-700",
    borderHover: "hover:border-rose-500/30",
    iconWrap: "bg-rose-500/10 text-rose-700",
    chip: "bg-rose-500/10 text-rose-700",
    line: "from-rose-500/70 via-rose-300/40 to-transparent",
  },
  lit: {
    badge: "Narrativa",
    icon: Library,
    surface: "from-fuchsia-500/18 via-fuchsia-300/8 to-transparent",
    accentText: "text-fuchsia-700",
    borderHover: "hover:border-fuchsia-500/30",
    iconWrap: "bg-fuchsia-500/10 text-fuchsia-700",
    chip: "bg-fuchsia-500/10 text-fuchsia-700",
    line: "from-fuchsia-500/70 via-fuchsia-300/40 to-transparent",
  },
  art: {
    badge: "Criacao",
    icon: Palette,
    surface: "from-pink-500/18 via-pink-300/8 to-transparent",
    accentText: "text-pink-700",
    borderHover: "hover:border-pink-500/30",
    iconWrap: "bg-pink-500/10 text-pink-700",
    chip: "bg-pink-500/10 text-pink-700",
    line: "from-pink-500/70 via-pink-300/40 to-transparent",
  },
  eti: {
    badge: "Valores",
    icon: Scale,
    surface: "from-stone-500/18 via-stone-300/8 to-transparent",
    accentText: "text-stone-700",
    borderHover: "hover:border-stone-500/30",
    iconWrap: "bg-stone-500/10 text-stone-700",
    chip: "bg-stone-500/10 text-stone-700",
    line: "from-stone-500/70 via-stone-300/40 to-transparent",
  },
  red: {
    badge: "Escrita",
    icon: PenSquare,
    surface: "from-cyan-500/18 via-cyan-300/8 to-transparent",
    accentText: "text-cyan-700",
    borderHover: "hover:border-cyan-500/30",
    iconWrap: "bg-cyan-500/10 text-cyan-700",
    chip: "bg-cyan-500/10 text-cyan-700",
    line: "from-cyan-500/70 via-cyan-300/40 to-transparent",
  },
  erl: {
    badge: "Raciocinio",
    icon: BrainCircuit,
    surface: "from-lime-500/18 via-lime-300/8 to-transparent",
    accentText: "text-lime-700",
    borderHover: "hover:border-lime-500/30",
    iconWrap: "bg-lime-500/10 text-lime-700",
    chip: "bg-lime-500/10 text-lime-700",
    line: "from-lime-500/70 via-lime-300/40 to-transparent",
  },
};

const fallbackVisuals: DisciplineVisual[] = [
  {
    badge: "Trilha",
    icon: Shapes,
    surface: "from-slate-500/16 via-slate-300/8 to-transparent",
    accentText: "text-slate-700",
    borderHover: "hover:border-slate-500/30",
    iconWrap: "bg-slate-500/10 text-slate-700",
    chip: "bg-slate-500/10 text-slate-700",
    line: "from-slate-500/70 via-slate-300/40 to-transparent",
  },
  {
    badge: "Tema",
    icon: Feather,
    surface: "from-zinc-500/16 via-zinc-300/8 to-transparent",
    accentText: "text-zinc-700",
    borderHover: "hover:border-zinc-500/30",
    iconWrap: "bg-zinc-500/10 text-zinc-700",
    chip: "bg-zinc-500/10 text-zinc-700",
    line: "from-zinc-500/70 via-zinc-300/40 to-transparent",
  },
];

export function getDisciplineVisual(disciplinaId: string) {
  const prefix = disciplinaId.replace(/\d+/g, "");
  return visuals[prefix] || fallbackVisuals[prefix.length % fallbackVisuals.length];
}
