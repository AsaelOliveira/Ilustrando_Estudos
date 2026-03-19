import { supabase } from "@/integrations/supabase/client";

export interface AvatarCatalogVisibilityConfig {
  hiddenStyles: string[];
  hiddenChoices: string[];
  hiddenItems: string[];
}

export const DEFAULT_AVATAR_CATALOG_VISIBILITY: AvatarCatalogVisibilityConfig = {
  hiddenStyles: [],
  hiddenChoices: [],
  hiddenItems: [],
};

export function normalizeAvatarCatalogVisibilityConfig(value: unknown): AvatarCatalogVisibilityConfig {
  const source = value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  const normalizeList = (entry: unknown) =>
    Array.isArray(entry)
      ? Array.from(new Set(entry.filter((item): item is string => typeof item === "string" && item.trim().length > 0)))
      : [];

  return {
    hiddenStyles: normalizeList(source.hiddenStyles),
    hiddenChoices: normalizeList(source.hiddenChoices),
    hiddenItems: normalizeList(source.hiddenItems),
  };
}

export async function loadAvatarCatalogVisibilityConfig() {
  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "avatar_catalog_visibility")
    .maybeSingle();

  if (error || !data) return DEFAULT_AVATAR_CATALOG_VISIBILITY;
  return normalizeAvatarCatalogVisibilityConfig(data.value);
}

export async function saveAvatarCatalogVisibilityConfig(config: AvatarCatalogVisibilityConfig) {
  return supabase.from("app_settings").upsert(
    {
      key: "avatar_catalog_visibility",
      description: "Controle de visibilidade de avatares e itens da loja",
      value: normalizeAvatarCatalogVisibilityConfig(config),
    },
    { onConflict: "key" },
  );
}
