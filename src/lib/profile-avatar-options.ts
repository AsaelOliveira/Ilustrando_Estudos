export type ProfileAvatarStyle =
  | "adventurer"
  | "adventurer-neutral"
  | "avataaars"
  | "avataaars-neutral"
  | "big-ears"
  | "big-ears-neutral"
  | "big-smile"
  | "bottts"
  | "bottts-neutral"
  | "croodles"
  | "croodles-neutral"
  | "dylan"
  | "fun-emoji"
  | "glass"
  | "icons"
  | "identicon"
  | "initials"
  | "lorelei"
  | "lorelei-neutral"
  | "micah"
  | "miniavs"
  | "notionists"
  | "notionists-neutral"
  | "open-peeps"
  | "personas"
  | "pixel-art"
  | "pixel-art-neutral"
  | "rings"
  | "shapes"
  | "thumbs"
  | "toon-head";

export type ProfileAvatarStyleOption = {
  id: ProfileAvatarStyle;
  label: string;
  description: string;
  cost: number;
  editable?: boolean;
  starter?: boolean;
};

export type AvatarShopSlot = "accessories" | "top" | "clothing";

export type AvataaarsConfig = {
  accessories: string | null;
  top: string;
  clothing: string;
};

export type AvatarEffect = "none" | "glow" | "orbit" | "sparkles" | "spin" | "mirror";

export type StoredProfileAvatar = {
  style: ProfileAvatarStyle;
  seed: string;
  config: AvataaarsConfig;
  effect: AvatarEffect;
};

export type AvatarShopItem = {
  id: string;
  slot: AvatarShopSlot;
  value: string | null;
  label: string;
  description: string;
  cost: number;
};

export type AvatarEffectItem = {
  id: string;
  value: AvatarEffect;
  label: string;
  description: string;
  cost: number;
};

export type ProfileAvatarChoice = {
  id: string;
  seed: string;
  label: string;
  url: string;
  cost: number;
};

export const profileAvatarStyles: ProfileAvatarStyleOption[] = [
  { id: "thumbs", label: "Thumbs", description: "Comeco leve e simpatico para todo aluno.", cost: 0, starter: true },
  { id: "icons", label: "Icons", description: "Formas limpas e diretas.", cost: 120 },
  { id: "shapes", label: "Shapes", description: "Visual abstrato e colorido.", cost: 140 },
  { id: "rings", label: "Rings", description: "Composicao geometrica moderna.", cost: 150 },
  { id: "identicon", label: "Identicon", description: "Padrao digital com cara de tecnologia.", cost: 160 },
  { id: "initials", label: "Iniciais", description: "Avatar simples com letras.", cost: 170 },
  { id: "big-smile", label: "Sorriso", description: "Colorido, simples e cheio de energia.", cost: 180 },
  { id: "fun-emoji", label: "Emoji", description: "Expressivo e facil de reconhecer.", cost: 220 },
  { id: "glass", label: "Glass", description: "Visual translucido e diferente.", cost: 230 },
  { id: "pixel-art", label: "Pixel Art", description: "Clima retro com jeito de jogo.", cost: 260 },
  { id: "pixel-art-neutral", label: "Pixel Art N", description: "Versao neutra do retro.", cost: 270 },
  { id: "croodles", label: "Croqui", description: "Rabiscado, divertido e diferente.", cost: 280 },
  { id: "croodles-neutral", label: "Croqui N", description: "Versao neutra rabiscada.", cost: 290 },
  { id: "bottts", label: "Robo", description: "Visual tecnologico e mais brincalhao.", cost: 320 },
  { id: "bottts-neutral", label: "Robo N", description: "Versao neutra dos robos.", cost: 330 },
  { id: "big-ears", label: "Big Ears", description: "Personagens com traco marcante.", cost: 340 },
  { id: "big-ears-neutral", label: "Big Ears N", description: "Versao neutra dos Big Ears.", cost: 350 },
  { id: "adventurer", label: "Aventureiro", description: "Cartoon expressivo com cara de heroi.", cost: 360 },
  { id: "adventurer-neutral", label: "Aventureiro N", description: "Versao neutra do aventureiro.", cost: 370 },
  { id: "personas", label: "Personas", description: "Limpo, moderno e elegante.", cost: 420 },
  { id: "micah", label: "Mascote", description: "Colorido, leve e com cara de mascote escolar.", cost: 440 },
  { id: "miniavs", label: "Miniavs", description: "Pequenos personagens com estilo leve.", cost: 460 },
  { id: "dylan", label: "Dylan", description: "Estilo ilustrado com bastante personalidade.", cost: 500 },
  { id: "lorelei", label: "Lorelei", description: "Ilustrado, suave e caprichado.", cost: 520 },
  { id: "lorelei-neutral", label: "Lorelei N", description: "Versao neutra do estilo Lorelei.", cost: 530 },
  { id: "notionists", label: "Notionists", description: "Personagens cheios de personalidade.", cost: 560 },
  { id: "notionists-neutral", label: "Notionists N", description: "Versao neutra da colecao.", cost: 570 },
  { id: "open-peeps", label: "Open Peeps", description: "Bonecos mais soltos e ilustrados.", cost: 620 },
  { id: "toon-head", label: "Toon Head", description: "Retratos cartoon mais detalhados.", cost: 640 },
  { id: "avataaars", label: "Avatar Classico", description: "Estilo premium com editor de acessorios.", cost: 680, editable: true },
  { id: "avataaars-neutral", label: "Avatar N", description: "Versao neutra do avatar classico.", cost: 690 },
];

const avatarSeedLabels: Record<string, string> = {
  sol: "Sol",
  trilha: "Trilha",
  pulso: "Pulso",
  nuvem: "Nuvem",
  foco: "Foco",
  arena: "Arena",
  brisa: "Brisa",
  ritmo: "Ritmo",
  brilho: "Brilho",
  turbo: "Turbo",
};

const GLOBAL_AVATAR_SEED_BASE = "catalogo";

const defaultSeedSuffixes = ["sol", "trilha", "pulso", "nuvem", "foco", "arena", "brisa", "ritmo", "brilho", "turbo"];

const avatarSeedSuffixesByStyle: Record<ProfileAvatarStyle, string[]> = {
  adventurer: defaultSeedSuffixes,
  "adventurer-neutral": defaultSeedSuffixes,
  avataaars: defaultSeedSuffixes,
  "avataaars-neutral": defaultSeedSuffixes,
  "big-ears": defaultSeedSuffixes,
  "big-ears-neutral": defaultSeedSuffixes,
  "big-smile": defaultSeedSuffixes,
  bottts: defaultSeedSuffixes,
  "bottts-neutral": defaultSeedSuffixes,
  croodles: defaultSeedSuffixes,
  "croodles-neutral": defaultSeedSuffixes,
  dylan: defaultSeedSuffixes,
  "fun-emoji": defaultSeedSuffixes,
  glass: defaultSeedSuffixes,
  icons: defaultSeedSuffixes,
  identicon: defaultSeedSuffixes,
  initials: defaultSeedSuffixes,
  lorelei: defaultSeedSuffixes,
  "lorelei-neutral": defaultSeedSuffixes,
  micah: ["trilha", "nuvem", "foco"],
  miniavs: defaultSeedSuffixes,
  notionists: defaultSeedSuffixes,
  "notionists-neutral": defaultSeedSuffixes,
  "open-peeps": ["sol", "trilha", "pulso", "nuvem", "foco"],
  personas: defaultSeedSuffixes,
  "pixel-art": defaultSeedSuffixes,
  "pixel-art-neutral": defaultSeedSuffixes,
  rings: defaultSeedSuffixes,
  shapes: defaultSeedSuffixes,
  thumbs: defaultSeedSuffixes,
  "toon-head": defaultSeedSuffixes,
};

const avatarChoiceCostsByStyle: Partial<Record<ProfileAvatarStyle, Record<string, number>>> = {
  thumbs: {
    sol: 0,
    trilha: 0,
    nuvem: 0,
    pulso: 130,
    foco: 150,
    arena: 170,
    brisa: 190,
    ritmo: 210,
    brilho: 230,
    turbo: 250,
  },
};

export const defaultAvataaarsConfig: AvataaarsConfig = {
  accessories: null,
  top: "shortFlat",
  clothing: "hoodie",
};

export const avatarEffectItems: AvatarEffectItem[] = [
  { id: "effect:none", value: "none", label: "Sem efeito", description: "Visual limpo e direto.", cost: 0 },
  { id: "effect:glow", value: "glow", label: "Aura", description: "Brilho suave em volta do avatar.", cost: 140 },
  { id: "effect:orbit", value: "orbit", label: "Órbita", description: "Anel animado com cara de item raro.", cost: 190 },
  { id: "effect:sparkles", value: "sparkles", label: "Faíscas", description: "Partículas leves ao redor do perfil.", cost: 230 },
  { id: "effect:spin", value: "spin", label: "Giro", description: "O avatar balança e gira com mais presença.", cost: 260 },
  { id: "effect:mirror", value: "mirror", label: "Espelho", description: "Brilho deslizante com reflexo lateral.", cost: 290 },
];

const validAvataaarsAccessories = new Set([
  "round",
  "prescription01",
  "prescription02",
  "sunglasses",
  "wayfarers",
]);

const validAvataaarsTops = new Set([
  "shortFlat",
  "shortRound",
  "curly",
  "longButNotTooLong",
  "hat",
]);

const validAvataaarsClothing = new Set([
  "hoodie",
  "graphicShirt",
  "overall",
  "blazerAndShirt",
]);

const starterUnlocks = [
  "accessories:none",
  "top:shortFlat",
  "clothing:hoodie",
  "effect:none",
  "style:thumbs",
  "choice:thumbs:sol",
  "choice:thumbs:trilha",
  "choice:thumbs:nuvem",
];

export const avatarShopItems: AvatarShopItem[] = [
  {
    id: "accessories:none",
    slot: "accessories",
    value: null,
    label: "Sem acessÃ³rio",
    description: "Visual limpo e direto.",
    cost: 0,
  },
  {
    id: "accessories:round",
    slot: "accessories",
    value: "round",
    label: "Ã“culos redondos",
    description: "Leitura elegante e mais estudiosa.",
    cost: 120,
  },
  {
    id: "accessories:prescription01",
    slot: "accessories",
    value: "prescription01",
    label: "Ã“culos leitura 1",
    description: "Estilo clÃ¡ssico para sala de aula.",
    cost: 140,
  },
  {
    id: "accessories:prescription02",
    slot: "accessories",
    value: "prescription02",
    label: "Ã“culos leitura 2",
    description: "Visual mais marcado e moderno.",
    cost: 150,
  },
  {
    id: "accessories:sunglasses",
    slot: "accessories",
    value: "sunglasses",
    label: "Ã“culos escuros",
    description: "Mais atitude no perfil.",
    cost: 180,
  },
  {
    id: "accessories:wayfarers",
    slot: "accessories",
    value: "wayfarers",
    label: "Wayfarer",
    description: "Modelo conhecido e estiloso.",
    cost: 220,
  },
  {
    id: "top:shortFlat",
    slot: "top",
    value: "shortFlat",
    label: "Corte liso",
    description: "Base inicial do avatar clÃ¡ssico.",
    cost: 0,
  },
  {
    id: "top:shortRound",
    slot: "top",
    value: "shortRound",
    label: "Corte redondo",
    description: "Visual mais jovem e leve.",
    cost: 160,
  },
  {
    id: "top:curly",
    slot: "top",
    value: "curly",
    label: "Cacheado",
    description: "Mais volume e personalidade.",
    cost: 220,
  },
  {
    id: "top:longButNotTooLong",
    slot: "top",
    value: "longButNotTooLong",
    label: "Longo mÃ©dio",
    description: "Caimento suave para variar o visual.",
    cost: 240,
  },
  {
    id: "top:hat",
    slot: "top",
    value: "hat",
    label: "ChapÃ©u",
    description: "Toque extra para sair do comum.",
    cost: 260,
  },
  {
    id: "clothing:hoodie",
    slot: "clothing",
    value: "hoodie",
    label: "Moletom",
    description: "OpÃ§Ã£o inicial mais casual.",
    cost: 0,
  },
  {
    id: "clothing:graphicShirt",
    slot: "clothing",
    value: "graphicShirt",
    label: "Camiseta grÃ¡fica",
    description: "Visual descontraÃ­do e jovem.",
    cost: 180,
  },
  {
    id: "clothing:overall",
    slot: "clothing",
    value: "overall",
    label: "Jardineira",
    description: "Destaque rÃ¡pido no avatar.",
    cost: 230,
  },
  {
    id: "clothing:blazerShirt",
    slot: "clothing",
    value: "blazerAndShirt",
    label: "Blazer e camisa",
    description: "Mais arrumado e elegante.",
    cost: 260,
  },
];

export function buildDiceBearAvatarUrl(
  style: ProfileAvatarStyle,
  seed: string,
  config?: Partial<AvataaarsConfig> | null,
) {
  const params = new URLSearchParams({
    seed,
    radius: "50",
    backgroundColor: "b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf",
  });

  if (style === "avataaars") {
    const normalized = normalizeAvataaarsConfig(config);
    params.set("top", normalized.top);
    params.set("clothing", normalized.clothing);

    if (normalized.accessories) {
      params.set("accessories", normalized.accessories);
      params.set("accessoriesProbability", "100");
    } else {
      params.set("accessoriesProbability", "0");
    }
  }

  return `https://api.dicebear.com/9.x/${style}/svg?${params.toString()}`;
}

export function parseDiceBearAvatarUrl(value: string | null | undefined) {
  if (!value) return null;

  try {
    const url = new URL(value);
    if (!url.hostname.includes("dicebear.com")) return null;

    const match = url.pathname.match(/\/9\.x\/([^/]+)\/svg/);
    const style = match?.[1] as ProfileAvatarStyle | undefined;
    const seed = url.searchParams.get("seed");

    if (!style || !seed) return null;
    if (!profileAvatarStyles.some((option) => option.id === style)) return null;

    return {
      style,
      seed,
      config: style === "avataaars"
        ? normalizeAvataaarsConfig({
            accessories: url.searchParams.get("accessories"),
            top: url.searchParams.get("top"),
            clothing: url.searchParams.get("clothing"),
          })
        : defaultAvataaarsConfig,
    };
  } catch {
    return null;
  }
}

export function normalizeStoredAvatarState(
  value: unknown,
  fallbackSeed: string,
  fallbackUrl?: string | null,
): StoredProfileAvatar {
  const parsedUrl = parseDiceBearAvatarUrl(fallbackUrl);
  const parsedSeedSuffix = parsedUrl ? getAvatarSeedSuffix(parsedUrl.seed) : "sol";
  const base: StoredProfileAvatar = {
    style: parsedUrl?.style ?? "thumbs",
    seed: `${fallbackSeed}-${parsedSeedSuffix}`,
    config: parsedUrl?.config ?? defaultAvataaarsConfig,
    effect: "none",
  };

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return base;
  }

  const source = value as Record<string, unknown>;
  const style =
    typeof source.style === "string" &&
    profileAvatarStyles.some((option) => option.id === source.style)
      ? (source.style as ProfileAvatarStyle)
      : base.style;
  const seed = typeof source.seed === "string" && source.seed.trim() ? source.seed.trim() : base.seed;
  const normalizedSeedSuffix = getAvatarSeedSuffix(seed);

  return {
    style,
    seed: `${fallbackSeed}-${normalizedSeedSuffix}`,
    config: style === "avataaars"
      ? normalizeAvataaarsConfig(source.config)
      : defaultAvataaarsConfig,
    effect:
      source.effect === "glow" ||
      source.effect === "orbit" ||
      source.effect === "sparkles" ||
      source.effect === "spin" ||
      source.effect === "mirror"
        ? source.effect
        : "none",
  };
}

export function normalizeAvatarUnlocks(value: unknown) {
  const unlocks = Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string" && !!entry.trim())
    : [];

  return Array.from(new Set([...starterUnlocks, ...unlocks]));
}

export function normalizeAvataaarsConfig(value: unknown): AvataaarsConfig {
  const source = value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
  const accessories = typeof source.accessories === "string" && source.accessories.trim()
    ? source.accessories.trim()
    : null;
  const top = typeof source.top === "string" && source.top.trim()
    ? source.top.trim()
    : defaultAvataaarsConfig.top;
  const clothing = typeof source.clothing === "string" && source.clothing.trim()
    ? source.clothing.trim()
    : defaultAvataaarsConfig.clothing;

  return {
    accessories: accessories && validAvataaarsAccessories.has(accessories) ? accessories : null,
    top: validAvataaarsTops.has(top) ? top : defaultAvataaarsConfig.top,
    clothing: validAvataaarsClothing.has(clothing) ? clothing : defaultAvataaarsConfig.clothing,
  };
}

export function getAvatarSeedBase(_nome: string, _email?: string) {
  return GLOBAL_AVATAR_SEED_BASE;
}

export function getProfileAvatarChoices(
  style: ProfileAvatarStyle,
  baseSeed: string,
  config?: Partial<AvataaarsConfig> | null,
): ProfileAvatarChoice[] {
  const suffixes = avatarSeedSuffixesByStyle[style] ?? defaultSeedSuffixes;

  return suffixes.map((suffix) => {
    const seed = `${baseSeed}-${suffix}`;

    return {
      id: `${style}:${seed}`,
      seed,
      label: avatarSeedLabels[suffix] ?? suffix,
      url: buildDiceBearAvatarUrl(style, seed, config),
      cost: getAvatarChoiceCost(style, seed),
    };
  });
}

export function getAvatarStyleUnlockId(style: ProfileAvatarStyle) {
  return `style:${style}`;
}

export function getAvatarChoiceUnlockId(style: ProfileAvatarStyle, seed: string) {
  const suffix = getAvatarSeedSuffix(seed);
  return `choice:${style}:${suffix}`;
}

export function getAvatarChoiceCost(style: ProfileAvatarStyle, seed: string) {
  const suffix = getAvatarSeedSuffix(seed);
  const explicitCost = avatarChoiceCostsByStyle[style]?.[suffix];
  if (typeof explicitCost === "number") return explicitCost;

  const styleCost = profileAvatarStyles.find((entry) => entry.id === style)?.cost ?? 0;
  return styleCost;
}

export function isAvatarStyleUnlocked(unlocks: string[], style: ProfileAvatarStyle) {
  return unlocks.includes(getAvatarStyleUnlockId(style));
}

export function isAvatarChoiceUnlocked(unlocks: string[], style: ProfileAvatarStyle, seed: string) {
  return getAvatarChoiceCost(style, seed) === 0 || unlocks.includes(getAvatarChoiceUnlockId(style, seed));
}

export function getAvatarShopItemsBySlot(slot: AvatarShopSlot) {
  return avatarShopItems.filter((item) => item.slot === slot);
}

export function isAvatarShopStyle(style: ProfileAvatarStyle) {
  return style === "avataaars";
}

export function isShopItemUnlocked(unlocks: string[], itemId: string) {
  return unlocks.includes(itemId);
}

function getAvatarSeedSuffix(seed: string) {
  const suffix = seed.split("-").pop()?.toLowerCase() ?? "sol";
  return avatarSeedLabels[suffix] ? suffix : "sol";
}

