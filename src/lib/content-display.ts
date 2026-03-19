import { supabase } from "@/integrations/supabase/client";

export interface ContentDisplayConfig {
  maxExercisesPerTema: number;
}

export const DEFAULT_CONTENT_DISPLAY: ContentDisplayConfig = {
  maxExercisesPerTema: 8,
};

function normalizeMaxExercises(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_CONTENT_DISPLAY.maxExercisesPerTema;
  return Math.max(1, Math.min(50, Math.round(parsed)));
}

export function normalizeContentDisplayConfig(value: unknown): ContentDisplayConfig {
  const source = value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  return {
    maxExercisesPerTema: normalizeMaxExercises(source.maxExercisesPerTema),
  };
}

export async function loadContentDisplayConfig() {
  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "content_display")
    .maybeSingle();

  if (error || !data) return DEFAULT_CONTENT_DISPLAY;
  return normalizeContentDisplayConfig(data.value);
}

export async function saveContentDisplayConfig(config: ContentDisplayConfig) {
  return supabase.from("app_settings").upsert(
    {
      key: "content_display",
      description: "Configuracao de exibicao de conteudo para alunos",
      value: normalizeContentDisplayConfig(config),
    },
    { onConflict: "key" },
  );
}
