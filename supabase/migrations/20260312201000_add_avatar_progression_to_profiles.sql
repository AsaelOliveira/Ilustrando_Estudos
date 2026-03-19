ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_style JSONB NOT NULL DEFAULT '{
    "skin": "skin-aurora",
    "hair": "hair-neo",
    "eyes": "eyes-spark",
    "outfit": "outfit-campus",
    "boots": "boots-dash",
    "accessory": "accessory-pin",
    "aura": "aura-none"
  }'::jsonb,
  ADD COLUMN IF NOT EXISTS avatar_unlocks JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS avatar_shop_spent INTEGER NOT NULL DEFAULT 0;
