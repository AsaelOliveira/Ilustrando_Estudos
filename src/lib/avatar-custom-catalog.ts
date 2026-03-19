import { supabase } from "@/integrations/supabase/client";

export interface CustomCatalogItem {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  hidden: boolean;
  order: number;
}

export interface CustomCatalogCollection {
  id: string;
  name: string;
  hidden: boolean;
  order: number;
  items: CustomCatalogItem[];
}

export interface CustomAvatarCatalogConfig {
  collections: CustomCatalogCollection[];
}

export const DEFAULT_CUSTOM_AVATAR_CATALOG: CustomAvatarCatalogConfig = {
  collections: [],
};

export function normalizeCustomAvatarCatalogConfig(value: unknown): CustomAvatarCatalogConfig {
  const source = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const collections = Array.isArray(source.collections) ? source.collections : [];

  return {
    collections: collections
      .map((collection, collectionIndex) => {
        const normalizedCollection = collection && typeof collection === "object"
          ? (collection as Record<string, unknown>)
          : {};
        const items = Array.isArray(normalizedCollection.items) ? normalizedCollection.items : [];

        return {
          id: typeof normalizedCollection.id === "string" && normalizedCollection.id.trim()
            ? normalizedCollection.id
            : `collection-${collectionIndex + 1}`,
          name: typeof normalizedCollection.name === "string" && normalizedCollection.name.trim()
            ? normalizedCollection.name
            : `Colecao ${collectionIndex + 1}`,
          hidden: Boolean(normalizedCollection.hidden),
          order: Number.isFinite(Number(normalizedCollection.order)) ? Number(normalizedCollection.order) : collectionIndex,
          items: items
            .map((item, itemIndex) => {
              const normalizedItem = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
              return {
                id: typeof normalizedItem.id === "string" && normalizedItem.id.trim()
                  ? normalizedItem.id
                  : `item-${collectionIndex + 1}-${itemIndex + 1}`,
                name: typeof normalizedItem.name === "string" && normalizedItem.name.trim()
                  ? normalizedItem.name
                  : `Avatar ${itemIndex + 1}`,
                price: Math.max(0, Math.round(Number(normalizedItem.price) || 0)),
                imageUrl: typeof normalizedItem.imageUrl === "string" ? normalizedItem.imageUrl : "",
                hidden: Boolean(normalizedItem.hidden),
                order: Number.isFinite(Number(normalizedItem.order)) ? Number(normalizedItem.order) : itemIndex,
              };
            })
            .filter((item) => item.imageUrl),
        };
      })
      .sort((a, b) => a.order - b.order),
  };
}

export async function loadCustomAvatarCatalogConfig() {
  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "custom_avatar_catalog")
    .maybeSingle();

  if (error || !data) return DEFAULT_CUSTOM_AVATAR_CATALOG;
  return normalizeCustomAvatarCatalogConfig(data.value);
}

export async function saveCustomAvatarCatalogConfig(config: CustomAvatarCatalogConfig) {
  return supabase.from("app_settings").upsert(
    {
      key: "custom_avatar_catalog",
      description: "Catalogo personalizado de avatares enviados pelo admin",
      value: normalizeCustomAvatarCatalogConfig(config),
    },
    { onConflict: "key" },
  );
}
