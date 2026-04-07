export type AvatarSlot = "skin" | "hair" | "eyes" | "outfit" | "boots" | "accessory" | "aura";
export type AvatarRarity = "starter" | "rare" | "epic" | "legendary";

export type AvatarItem = {
  id: string;
  slot: AvatarSlot;
  label: string;
  description: string;
  rarity: AvatarRarity;
  cost: number;
  source: "starter" | "shop" | "pass";
  passLevel?: number;
};

export type AvatarStyle = Record<AvatarSlot, string>;

export type AvatarGoal = {
  id: string;
  label: string;
  hint: string;
  current: number;
  target: number;
  reward: string;
};

export type BattlePassReward = {
  level: number;
  title: string;
  reward: string;
  itemId?: string;
};

const starterStyle: AvatarStyle = {
  skin: "skin-aurora",
  hair: "hair-neo",
  eyes: "eyes-spark",
  outfit: "outfit-campus",
  boots: "boots-dash",
  accessory: "accessory-pin",
  aura: "aura-none",
};

export const adminStyle: AvatarStyle = {
  skin: "skin-gold",
  hair: "hair-phoenix",
  eyes: "eyes-cosmic",
  outfit: "outfit-headmaster",
  boots: "boots-thunder",
  accessory: "accessory-crown",
  aura: "aura-solar",
};

export const avatarItems: AvatarItem[] = [
  { id: "skin-aurora", slot: "skin", label: "Tom Aurora", description: "Visual vibrante para come?ar sua jornada.", rarity: "starter", cost: 0, source: "starter" },
  { id: "skin-amber", slot: "skin", label: "Tom Amber", description: "Calor e energia de arena.", rarity: "rare", cost: 180, source: "shop" },
  { id: "skin-gold", slot: "skin", label: "Tom Dourado", description: "Aparência de campeão lendário.", rarity: "legendary", cost: 0, source: "pass", passLevel: 20 },

  { id: "hair-neo", slot: "hair", label: "Corte Neo", description: "Limpo, moderno e pronto para o desafio.", rarity: "starter", cost: 0, source: "starter" },
  { id: "hair-wave", slot: "hair", label: "Ondas Orbitais", description: "Um corte com atitude e movimento.", rarity: "rare", cost: 220, source: "shop" },
  { id: "hair-phoenix", slot: "hair", label: "F?nix Plasma", description: "O penteado de quem ja zerou o mapa.", rarity: "legendary", cost: 0, source: "pass", passLevel: 12 },

  { id: "eyes-spark", slot: "eyes", label: "Olhar Spark", description: "Brilho leve de explorador.", rarity: "starter", cost: 0, source: "starter" },
  { id: "eyes-focus", slot: "eyes", label: "Olhar Focus", description: "Concentração máxima antes da missão.", rarity: "rare", cost: 140, source: "shop" },
  { id: "eyes-cosmic", slot: "eyes", label: "Olhar Cósmico", description: "Energia de quem enxerga o próximo nível.", rarity: "epic", cost: 0, source: "pass", passLevel: 8 },

  { id: "outfit-campus", slot: "outfit", label: "Jaqueta Campus", description: "Uniforme premium de treino escolar.", rarity: "starter", cost: 0, source: "starter" },
  { id: "outfit-stellar", slot: "outfit", label: "Armadura Stellar", description: "Camadas met?licas com brilho futurista.", rarity: "epic", cost: 520, source: "shop" },
  { id: "outfit-headmaster", slot: "outfit", label: "Manto do Curador", description: "Traje máximo do admin com tudo liberado.", rarity: "legendary", cost: 0, source: "pass", passLevel: 24 },

  { id: "boots-dash", slot: "boots", label: "Dash One", description: "Passos firmes para o começo da temporada.", rarity: "starter", cost: 0, source: "starter" },
  { id: "boots-comet", slot: "boots", label: "Comet Run", description: "Botas com sola de impulso neon.", rarity: "rare", cost: 190, source: "shop" },
  { id: "boots-thunder", slot: "boots", label: "Thunder Mk II", description: "Pegada el?trica de maratona acad?mica.", rarity: "epic", cost: 0, source: "pass", passLevel: 16 },

  { id: "accessory-pin", slot: "accessory", label: "Pin da Arena", description: "O s?mbolo oficial dos desafiantes.", rarity: "starter", cost: 0, source: "starter" },
  { id: "accessory-visor", slot: "accessory", label: "Visor T?tico", description: "Interface de leitura r?pida e estilo.", rarity: "rare", cost: 260, source: "shop" },
  { id: "accessory-crown", slot: "accessory", label: "Coroa Prismática", description: "Reservada para figuras lendárias.", rarity: "legendary", cost: 0, source: "pass", passLevel: 28 },

  { id: "aura-none", slot: "aura", label: "Sem Aura", description: "Visual limpo e direto.", rarity: "starter", cost: 0, source: "starter" },
  { id: "aura-rift", slot: "aura", label: "Aura Rift", description: "Pulso de energia azul-violeta.", rarity: "epic", cost: 480, source: "shop" },
  { id: "aura-solar", slot: "aura", label: "Aura Solar", description: "Halo dourado com calor de trof?u.", rarity: "legendary", cost: 0, source: "pass", passLevel: 30 },
];

export const battlePassRewards: BattlePassReward[] = [
  { level: 2, title: "Passe N2", reward: "Olhar C?smico", itemId: "eyes-cosmic" },
  { level: 5, title: "Passe N5", reward: "Pacote de brilho premium" },
  { level: 8, title: "Passe N8", reward: "F?nix Plasma", itemId: "hair-phoenix" },
  { level: 12, title: "Passe N12", reward: "Banner de lenda" },
  { level: 16, title: "Passe N16", reward: "Thunder Mk II", itemId: "boots-thunder" },
  { level: 20, title: "Passe N20", reward: "Tom Dourado", itemId: "skin-gold" },
  { level: 24, title: "Passe N24", reward: "Manto do Curador", itemId: "outfit-headmaster" },
  { level: 28, title: "Passe N28", reward: "Coroa Prism?tica", itemId: "accessory-crown" },
  { level: 30, title: "Passe N30", reward: "Aura Solar", itemId: "aura-solar" },
];

const starterUnlocks = avatarItems.filter((item) => item.source === "starter").map((item) => item.id);
const allItemIds = avatarItems.map((item) => item.id);

export function getBaseAvatarStyle() {
  return starterStyle;
}

export function getAdminAvatarStyle() {
  return adminStyle;
}

export function getAllAvatarItemIds() {
  return allItemIds;
}

export function getAvatarItemById(itemId: string) {
  return avatarItems.find((item) => item.id === itemId) ?? null;
}

export function getShopItems() {
  return avatarItems.filter((item) => item.source === "shop");
}

export function getPassUnlockedItemIds(level: number) {
  return battlePassRewards
    .filter((reward) => reward.level <= level && reward.itemId)
    .map((reward) => reward.itemId as string);
}

export function getAvatarCoins(points: number, missionsCompleted: number, streakDays: number) {
  return points + missionsCompleted * 10 + streakDays * 3;
}

export function getBattlePassLevel(points: number) {
  const level = Math.floor(points / 180) + 1;
  return Math.max(1, Math.min(level, 30));
}

export function getBattlePassProgress(points: number) {
  const currentLevel = getBattlePassLevel(points);
  const currentLevelFloor = (currentLevel - 1) * 180;
  const nextLevelFloor = Math.min(currentLevel * 180, 30 * 180);
  const currentXp = points - currentLevelFloor;
  const neededXp = Math.max(nextLevelFloor - currentLevelFloor, 1);

  return {
    level: currentLevel,
    currentXp,
    neededXp,
    progressPct: currentLevel >= 30 ? 100 : Math.round((currentXp / neededXp) * 100),
  };
}

export function mergeAvatarState({
  role,
  points,
  missionsCompleted,
  streakDays,
  storedUnlocks,
  storedStyle,
  shopSpent,
}: {
  role: "admin" | "professor" | "aluno" | null;
  points: number;
  missionsCompleted: number;
  streakDays: number;
  storedUnlocks: string[];
  storedStyle: Partial<AvatarStyle> | null;
  shopSpent: number;
}) {
  const pass = getBattlePassProgress(points);
  const totalCoins = role === "admin" ? 999999 : getAvatarCoins(points, missionsCompleted, streakDays);
  const passUnlocks = getPassUnlockedItemIds(pass.level);
  const unlocked = Array.from(new Set([
    ...starterUnlocks,
    ...storedUnlocks,
    ...passUnlocks,
    ...(role === "admin" ? allItemIds : []),
  ]));

  const equipped: AvatarStyle = {
    ...(role === "admin" ? adminStyle : starterStyle),
    ...(storedStyle ?? {}),
  };

  for (const slot of Object.keys(equipped) as AvatarSlot[]) {
    const currentId = equipped[slot];
    if (!unlocked.includes(currentId)) {
      equipped[slot] = role === "admin" ? adminStyle[slot] : starterStyle[slot];
    }
  }

  return {
    pass,
    totalCoins,
    availableCoins: Math.max(totalCoins - shopSpent, 0),
    unlockedIds: unlocked,
    equipped,
  };
}

export function getAvatarGoals(points: number, missionsCompleted: number, streakDays: number): AvatarGoal[] {
  return [
    {
      id: "goal-missions-1",
      label: "Missão de rotina",
      hint: "Complete desafios para liberar o próximo bloco de itens.",
      current: missionsCompleted,
      target: 12,
      reward: "240 moedas + visual raro",
    },
    {
      id: "goal-streak-1",
      label: "Sequência de Fogo",
      hint: "Mantenha consistência por vários dias.",
      current: streakDays,
      target: 7,
      reward: "Aura exclusiva",
    },
    {
      id: "goal-points-1",
      label: "Academia Elite",
      hint: "Acumule pontos para subir no passe.",
      current: points,
      target: 1800,
      reward: "2 n?veis fortes do passe",
    },
  ];
}
