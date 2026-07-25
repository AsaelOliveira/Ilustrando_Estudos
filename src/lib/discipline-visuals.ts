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

type BrandColor = "green" | "blue" | "yellow" | "purple" | "pink" | "orange";

/**
 * Classes por cor da paleta da maquete (tokens brand-*).
 * Sempre literais para o JIT do Tailwind enxergar — nunca montar dinamicamente.
 */
const brandTokens: Record<BrandColor, Omit<DisciplineVisual, "badge" | "icon">> = {
  green: {
    surface: "from-brand-green/15 via-brand-green/5 to-transparent",
    accentText: "text-brand-green-dark",
    borderHover: "hover:border-brand-green/50",
    iconWrap: "btn-3d btn-3d-green",
    chip: "bg-brand-green/15 text-brand-green-dark",
    line: "from-brand-green/70 via-brand-green/30 to-transparent",
  },
  blue: {
    surface: "from-brand-blue/15 via-brand-blue/5 to-transparent",
    accentText: "text-brand-blue-dark",
    borderHover: "hover:border-brand-blue/50",
    iconWrap: "btn-3d btn-3d-blue",
    chip: "bg-brand-blue/15 text-brand-blue-dark",
    line: "from-brand-blue/70 via-brand-blue/30 to-transparent",
  },
  yellow: {
    surface: "from-brand-yellow/15 via-brand-yellow/5 to-transparent",
    accentText: "text-brand-yellow-dark",
    borderHover: "hover:border-brand-yellow/50",
    iconWrap: "btn-3d btn-3d-yellow",
    chip: "bg-brand-yellow/15 text-brand-yellow-dark",
    line: "from-brand-yellow/70 via-brand-yellow/30 to-transparent",
  },
  purple: {
    surface: "from-brand-purple/15 via-brand-purple/5 to-transparent",
    accentText: "text-brand-purple-dark",
    borderHover: "hover:border-brand-purple/50",
    iconWrap: "btn-3d btn-3d-purple",
    chip: "bg-brand-purple/15 text-brand-purple-dark",
    line: "from-brand-purple/70 via-brand-purple/30 to-transparent",
  },
  pink: {
    surface: "from-brand-pink/15 via-brand-pink/5 to-transparent",
    accentText: "text-brand-pink-dark",
    borderHover: "hover:border-brand-pink/50",
    iconWrap: "btn-3d btn-3d-pink",
    chip: "bg-brand-pink/15 text-brand-pink-dark",
    line: "from-brand-pink/70 via-brand-pink/30 to-transparent",
  },
  orange: {
    surface: "from-brand-orange/15 via-brand-orange/5 to-transparent",
    accentText: "text-brand-orange-dark",
    borderHover: "hover:border-brand-orange/50",
    iconWrap: "btn-3d btn-3d-orange",
    chip: "bg-brand-orange/15 text-brand-orange-dark",
    line: "from-brand-orange/70 via-brand-orange/30 to-transparent",
  },
};

function brand(badge: string, icon: LucideIcon, color: BrandColor): DisciplineVisual {
  return { badge, icon, ...brandTokens[color] };
}

const visuals: Record<string, DisciplineVisual> = {
  mat: brand("Numeros", Calculator, "purple"),
  port: brand("Leitura", BookText, "pink"),
  cien: brand("Experimentos", FlaskConical, "green"),
  hist: brand("Contexto", Landmark, "orange"),
  geo: brand("Territorio", Globe2, "blue"),
  edf: brand("Movimento", Dumbbell, "orange"),
  ing: brand("Idioma", Languages, "yellow"),
  esp: brand("Idioma", Languages, "yellow"),
  lit: brand("Narrativa", Library, "purple"),
  art: brand("Criacao", Palette, "pink"),
  eti: brand("Valores", Scale, "blue"),
  red: brand("Escrita", PenSquare, "green"),
  erl: brand("Raciocinio", BrainCircuit, "blue"),
};

const neutralTokens: Omit<DisciplineVisual, "badge" | "icon"> = {
  surface: "from-muted/60 via-muted/20 to-transparent",
  accentText: "text-muted-foreground",
  borderHover: "hover:border-muted-foreground/30",
  iconWrap:
    "btn-3d [--btn-3d-bg:var(--muted)] [--btn-3d-fg:var(--muted-foreground)] [--btn-3d-shadow:var(--border)]",
  chip: "bg-muted text-muted-foreground",
  line: "from-muted-foreground/40 via-muted-foreground/15 to-transparent",
};

const fallbackVisuals: DisciplineVisual[] = [
  {
    badge: "Trilha",
    icon: Shapes,
    ...neutralTokens,
  },
  {
    badge: "Tema",
    icon: Feather,
    ...neutralTokens,
  },
];

export function getDisciplineVisual(disciplinaId: string) {
  const prefix = disciplinaId.replace(/\d+/g, "");
  return visuals[prefix] || fallbackVisuals[prefix.length % fallbackVisuals.length];
}
