import { useCallback, useEffect, useState } from "react";

/**
 * Cor de destaque do app, escolhida pelo aluno.
 * Preferencia local por aparelho (localStorage) — zero escrita no Supabase.
 * Aplica `data-accent` no <html>; os blocos `[data-accent="..."]` em index.css
 * sobrescrevem os tokens --primary/--ring derivados.
 */

export const ACCENT_OPTIONS = [
  { id: "verde", label: "Verde", swatch: "#58cc02" },
  { id: "azul", label: "Azul", swatch: "#1cb0f6" },
  { id: "roxo", label: "Roxo", swatch: "#a560e8" },
  { id: "rosa", label: "Rosa", swatch: "#ff4b8b" },
  { id: "laranja", label: "Laranja", swatch: "#ff9600" },
] as const;

export type AccentId = (typeof ACCENT_OPTIONS)[number]["id"];

const STORAGE_KEY = "ilustrando-accent";
const DEFAULT_ACCENT: AccentId = "verde";

function isAccentId(value: string | null): value is AccentId {
  return ACCENT_OPTIONS.some((option) => option.id === value);
}

function readStoredAccent(): AccentId {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isAccentId(stored) ? stored : DEFAULT_ACCENT;
  } catch {
    return DEFAULT_ACCENT;
  }
}

function applyAccent(accent: AccentId) {
  if (accent === DEFAULT_ACCENT) {
    delete document.documentElement.dataset.accent;
  } else {
    document.documentElement.dataset.accent = accent;
  }
}

/** Aplica imediatamente a cor salva (usado no boot, antes do React montar). */
export function applyStoredAccent() {
  applyAccent(readStoredAccent());
}

export function useAccentTheme() {
  const [accent, setAccentState] = useState<AccentId>(() => readStoredAccent());

  useEffect(() => {
    applyAccent(accent);
  }, [accent]);

  const setAccent = useCallback((next: AccentId) => {
    setAccentState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // localStorage indisponivel (modo privado) — mantem so em memoria
    }
  }, []);

  return { accent, setAccent, options: ACCENT_OPTIONS };
}
