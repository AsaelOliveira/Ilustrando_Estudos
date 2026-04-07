import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  Brain,
  BookOpen,
  Lock,
  Mail,
  Upload,
  X,
  Shield,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";
import Breadcrumbs from "@/components/Breadcrumbs";
import Layout from "@/components/Layout";
import SimpleProfileAvatar from "@/components/SimpleProfileAvatar";
import { turmas } from "@/data/catalog";
import { getAvatarCoins } from "@/lib/avatar-system";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_AVATAR_CATALOG_VISIBILITY,
  loadAvatarCatalogVisibilityConfig,
  saveAvatarCatalogVisibilityConfig,
  type AvatarCatalogVisibilityConfig,
} from "@/lib/avatar-catalog-visibility";
import {
  DEFAULT_CUSTOM_AVATAR_CATALOG,
  loadCustomAvatarCatalogConfig,
  saveCustomAvatarCatalogConfig,
  type CustomCatalogCollection,
  type CustomCatalogItem,
  type CustomAvatarCatalogConfig,
} from "@/lib/avatar-custom-catalog";
import {
  buildDiceBearAvatarUrl,
  avatarEffectItems,
  getAvatarChoiceUnlockId,
  getAvatarSeedBase,
  getAvatarShopItemsBySlot,
  getProfileAvatarChoices,
  isAvatarChoiceUnlocked,
  isAvatarShopStyle,
  isShopItemUnlocked,
  normalizeAvatarUnlocks,
  normalizeStoredAvatarState,
  profileAvatarStyles,
  type AvatarShopItem,
  type AvatarEffect,
  type AvataaarsConfig,
  type ProfileAvatarStyle,
} from "@/lib/profile-avatar-options";
import { getStoredDuelStatus, setStoredDuelStatus, type DuelPresenceStatus } from "@/lib/duel-status";

type ScoreSnapshot = {
  points: number;
  missions_completed: number;
  streak_days: number;
  turma_id: string | null;
};

const avatarShopSlots = [
  { key: "accessories", label: "Óculos e acessórios" },
  { key: "top", label: "Cabelo e topo" },
  { key: "clothing", label: "Roupa" },
] as const;

type ShopTabKey = "avatars" | "effects" | "accessories" | "top" | "clothing" | "catalogs";

export default function PerfilPage() {
  const { user, profile, role, refreshProfile } = useAuth();
  const [duelStatus, setDuelStatus] = useState<DuelPresenceStatus>("accepting");
  const [selectedStyle, setSelectedStyle] = useState<ProfileAvatarStyle>("thumbs");
  const [selectedSeed, setSelectedSeed] = useState("aluno-sol");
  const [selectedConfig, setSelectedConfig] = useState<AvataaarsConfig>({
    accessories: null,
    top: "shortFlat",
    clothing: "hoodie",
  });
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [buyingItemId, setBuyingItemId] = useState<string | null>(null);
  const [buyingChoiceId, setBuyingChoiceId] = useState<string | null>(null);
  const [catalogVisibility, setCatalogVisibility] = useState<AvatarCatalogVisibilityConfig>(DEFAULT_AVATAR_CATALOG_VISIBILITY);
  const [updatingCatalogId, setUpdatingCatalogId] = useState<string | null>(null);
  const [customCatalog, setCustomCatalog] = useState<CustomAvatarCatalogConfig>(DEFAULT_CUSTOM_AVATAR_CATALOG);
  const [savingCustomCatalog, setSavingCustomCatalog] = useState(false);
  const [uploadingCatalog, setUploadingCatalog] = useState(false);  const [selectedCustomCollectionId, setSelectedCustomCollectionId] = useState<string | null>(null);
  const [selectedCustomItemId, setSelectedCustomItemId] = useState<string | null>(null);
  const [selectedShopTab, setSelectedShopTab] = useState<ShopTabKey>("avatars");
  const [selectedEffect, setSelectedEffect] = useState<AvatarEffect>("none");
  const [previewedEffect, setPreviewedEffect] = useState<AvatarEffect>("none");
  const [previewAvatarUrl, setPreviewAvatarUrl] = useState<string | null>(null);
  const uploadCatalogInputRef = useRef<HTMLInputElement | null>(null);
  const [scoreData, setScoreData] = useState<ScoreSnapshot>({
    points: 0,
    missions_completed: 0,
    streak_days: 0,
    turma_id: null,
  });

  useEffect(() => {
    setDuelStatus(getStoredDuelStatus());
  }, []);

  const turmaNome =
    role === "admin"
      ? "Todas as turmas"
      : role === "coordenadora"
        ? "Todas as turmas"
      : role === "professor"
        ? turmas.find((turma) => turma.id === (profile?.turma_id ?? scoreData.turma_id ?? null))?.nome ?? "Turmas vinculadas"
        : turmas.find((turma) => turma.id === (profile?.turma_id ?? scoreData.turma_id ?? null))?.nome ?? "Sem turma";
  const roleLabel = getRoleLabel(role);
  const displayName = getDisplayName(profile?.nome ?? "", user?.email, roleLabel);
  const emailLabel = getEmailLabel(profile?.nome ?? "", user?.email);
  const baseSeed = getAvatarSeedBase(profile?.nome ?? "", user?.email);
  const storedAvatar = useMemo(
    () => normalizeStoredAvatarState(profile?.avatar_style, baseSeed, profile?.avatar_url),
    [baseSeed, profile?.avatar_style, profile?.avatar_url],
  );
  const unlockedItems = normalizeAvatarUnlocks(profile?.avatar_unlocks);
  const spentCoins = profile?.avatar_shop_spent ?? 0;
  const totalCoins = role === "admin"
    ? 999999
    : getAvatarCoins(scoreData.points, scoreData.missions_completed, scoreData.streak_days);
  const availableCoins = Math.max(totalCoins - spentCoins, 0);
  const allCustomCollections = useMemo(
    () => [...customCatalog.collections].sort((a, b) => a.order - b.order),
    [customCatalog.collections],
  );
  const visibleCustomCollections = useMemo(
    () =>
      allCustomCollections
        .filter((collection) => role === "admin" || !collection.hidden)
        .map((collection) => ({
          ...collection,
          items: collection.items
            .filter((item) => role === "admin" || !item.hidden)
            .sort((a, b) => a.order - b.order),
        }))
        .filter((collection) => collection.items.length > 0),
    [allCustomCollections, role],
  );
  const storedCustomCatalogItemId = useMemo(() => {
    if (!profile?.avatar_style || typeof profile.avatar_style !== "object" || Array.isArray(profile.avatar_style)) {
      return null;
    }

    const source = profile.avatar_style as Record<string, unknown>;
    return typeof source.customCatalogItemId === "string" && source.customCatalogItemId.trim()
      ? source.customCatalogItemId.trim()
      : null;
  }, [profile?.avatar_style]);
  const storedCustomItem = useMemo(
    () =>
      allCustomCollections
        .flatMap((collection) => collection.items.map((item) => ({ collection, item })))
        .find((entry) => entry.item.id === storedCustomCatalogItemId) ?? null,
    [allCustomCollections, storedCustomCatalogItemId],
  );
  const allAvatarChoices = useMemo(
    () => getProfileAvatarChoices(selectedStyle, baseSeed, selectedStyle === "avataaars" ? selectedConfig : null),
    [baseSeed, selectedConfig, selectedStyle],
  );
  const visibleStyles = useMemo(
    () => role === "admin"
      ? profileAvatarStyles
      : profileAvatarStyles.filter((style) => !catalogVisibility.hiddenStyles.includes(style.id)),
    [catalogVisibility.hiddenStyles, role],
  );
  const orderedVisibleStyles = useMemo(() => {
    const avatarClassico = visibleStyles.find((style) => style.id === "avataaars");
    const otherStyles = visibleStyles.filter((style) => style.id !== "avataaars");
    return avatarClassico ? [...otherStyles, avatarClassico] : otherStyles;
  }, [visibleStyles]);
  const avatarChoices = useMemo(
    () => role === "admin"
      ? allAvatarChoices
      : allAvatarChoices.filter((choice) => !catalogVisibility.hiddenChoices.includes(getAvatarChoiceUnlockId(selectedStyle, choice.seed))),
    [allAvatarChoices, catalogVisibility.hiddenChoices, role, selectedStyle],
  );
  const selectedStyleMeta = profileAvatarStyles.find((style) => style.id === selectedStyle);
  const shopTabs = useMemo(
    () => [
      { key: "avatars" as const, label: "Avatares", locked: false },
      { key: "effects" as const, label: "Efeitos", locked: true },
      { key: "accessories" as const, label: "Óculos", locked: true },
      { key: "top" as const, label: "Cabelo", locked: true },
      { key: "clothing" as const, label: "Roupa", locked: true },
      ...(role === "admin" ? [{ key: "catalogs" as const, label: "Catálogos", locked: true }] : []),
    ],
    [role],
  );
  const visibleShopTabs = useMemo(
    () =>
      role === "admin"
        ? shopTabs
        : shopTabs.filter((tab) => !catalogVisibility.hiddenTabs.includes(tab.key)),
    [catalogVisibility.hiddenTabs, role, shopTabs],
  );
  const selectedCustomCollection = useMemo(
    () => visibleCustomCollections.find((collection) => collection.id === selectedCustomCollectionId) ?? null,
    [selectedCustomCollectionId, visibleCustomCollections],
  );
  const selectedCustomPreviewItem = useMemo(() => {
    if (!selectedCustomCollection) return null;
    return selectedCustomCollection.items.find((item) => item.id === selectedCustomItemId) ?? selectedCustomCollection.items[0] ?? null;
  }, [selectedCustomCollection, selectedCustomItemId]);
  const selectedCatalogLabel = selectedCustomCollection?.name ?? selectedStyleMeta?.label ?? "Avatar";
  const persistedStyleMeta = profileAvatarStyles.find((style) => style.id === storedAvatar.style);
  const persistedCatalogLabel = storedCustomItem?.collection.name ?? persistedStyleMeta?.label ?? "Avatar";
  const persistedOptionLabel = storedCustomItem?.item.name ?? storedAvatar.seed.split("-").pop() ?? "sol";
  const persistedEffect: AvatarEffect =
    storedAvatar.effect === "none" || unlockedItems.includes(`effect:${storedAvatar.effect}`)
      ? storedAvatar.effect
      : "none";
  const previewEffect = previewedEffect;
  const previewingDifferentEffect = previewEffect !== persistedEffect;
  const effectiveSelectedEffect: AvatarEffect =
    selectedEffect === "none" || unlockedItems.includes(`effect:${selectedEffect}`)
      ? selectedEffect
      : "none";
  const selectedAvatarUrl = useMemo(
    () =>
      selectedCustomPreviewItem?.imageUrl ??
      (storedCustomCatalogItemId ? profile.avatar_url : null) ??
      buildDiceBearAvatarUrl(selectedStyle, selectedSeed, selectedStyle === "avataaars" ? selectedConfig : null),
    [profile.avatar_url, selectedConfig, selectedCustomPreviewItem?.imageUrl, selectedSeed, selectedStyle, storedCustomCatalogItemId],
  );
  const activePreviewAvatarUrl = selectedShopTab === "effects"
    ? previewAvatarUrl ?? selectedAvatarUrl
    : selectedAvatarUrl;

  useEffect(() => {
    setSelectedStyle(storedAvatar.style);
    setSelectedSeed(storedAvatar.seed);
    setSelectedConfig(storedAvatar.config);
    setSelectedEffect(storedAvatar.effect);
    setPreviewedEffect(storedAvatar.effect);
  }, [
    storedAvatar.config.accessories,
    storedAvatar.config.clothing,
    storedAvatar.effect,
    storedAvatar.config.top,
    storedAvatar.seed,
    storedAvatar.style,
  ]);

  useEffect(() => {
    if (selectedShopTab !== "effects") {
      setPreviewAvatarUrl(selectedAvatarUrl);
    }
  }, [selectedAvatarUrl, selectedShopTab]);

  useEffect(() => {
    if (!visibleShopTabs.some((tab) => tab.key === selectedShopTab)) {
      setSelectedShopTab("avatars");
    }
  }, [selectedShopTab, visibleShopTabs]);

  useEffect(() => {
    if (storedCustomItem) {
      setSelectedCustomCollectionId(storedCustomItem.collection.id);
      setSelectedCustomItemId(storedCustomItem.item.id);
      return;
    }

    setSelectedCustomCollectionId(null);
    setSelectedCustomItemId(null);
  }, [storedCustomItem]);

  useEffect(() => {
    const firstUnlockedChoice = avatarChoices.find((choice) =>
      isAvatarChoiceUnlocked(unlockedItems, selectedStyle, choice.seed),
    );

    if (
      !avatarChoices.some((choice) => choice.seed === selectedSeed) ||
      !isAvatarChoiceUnlocked(unlockedItems, selectedStyle, selectedSeed)
    ) {
      setSelectedSeed(firstUnlockedChoice?.seed ?? avatarChoices[0]?.seed ?? `${baseSeed}-sol`);
    }
  }, [avatarChoices, baseSeed, selectedSeed, selectedStyle, unlockedItems]);

  useEffect(() => {
    if (!user) return;

    supabase
      .from("student_scores")
      .select("points, missions_completed, streak_days, turma_id")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setScoreData({
          points: data.points ?? 0,
          missions_completed: data.missions_completed ?? 0,
          streak_days: data.streak_days ?? 0,
          turma_id: data.turma_id ?? null,
        });
      });
  }, [user]);

  useEffect(() => {
    loadAvatarCatalogVisibilityConfig().then(setCatalogVisibility);
    loadCustomAvatarCatalogConfig().then(setCustomCatalog);
  }, []);

  useEffect(() => {
    if (role === "admin") return;
    if (!visibleStyles.some((style) => style.id === selectedStyle)) {
      setSelectedStyle(visibleStyles[0]?.id ?? "thumbs");
    }
  }, [role, selectedStyle, visibleStyles]);

  useEffect(() => {
    if (!selectedCustomCollectionId) return;
    if (!visibleCustomCollections.some((collection) => collection.id === selectedCustomCollectionId)) {
      setSelectedCustomCollectionId(null);
      setSelectedCustomItemId(null);
    }
  }, [selectedCustomCollectionId, visibleCustomCollections]);

  if (!user || !profile) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="font-body text-muted-foreground">Faça login para abrir sua loja.</p>
          <Link
            to="/login"
            className="btn-tap mt-4 inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-3 font-heading text-sm font-bold text-primary-foreground transition-all hover:bg-primary/90"
          >
            Entrar agora
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </Layout>
    );
  }

  const avatarLocked = profile.avatar_locked;
  const isAdmin = role === "admin";

  const saveAvatarSelection = async (
    nextStyle: ProfileAvatarStyle,
    nextSeed: string,
    nextConfig: AvataaarsConfig | null,
    nextEffect: AvatarEffect,
    successDescription: string,
  ) => {
    setSavingAvatar(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        avatar_url: buildDiceBearAvatarUrl(nextStyle, nextSeed, nextStyle === "avataaars" ? nextConfig : null),
        avatar_style: {
          style: nextStyle,
          seed: nextSeed,
          config: nextStyle === "avataaars" ? nextConfig : null,
          effect:
            nextEffect === "none" || unlockedItems.includes(`effect:${nextEffect}`)
              ? nextEffect
              : "none",
        },
      })
      .eq("user_id", user.id);

    if (error) {
      toast({
        title: "Não foi possível salvar",
        description: "O avatar não foi atualizado no perfil.",
        variant: "destructive",
      });
      setSavingAvatar(false);
      return;
    }

    await refreshProfile();
    setSavingAvatar(false);
    toast({
      title: "Avatar atualizado",
      description: successDescription,
    });
  };

  const equipShopItem = async (item: AvatarShopItem) => {
    if (avatarLocked) return;

    setSelectedStyle("avataaars");
    const nextConfig = {
      ...selectedConfig,
      [item.slot]: item.value,
    };

    setSelectedConfig(nextConfig);
    await saveAvatarSelection(
      "avataaars",
      selectedSeed,
      nextConfig,
      effectiveSelectedEffect,
      `${item.label} foi aplicado ao Avatar Clássico.`,
    );
  };

  const selectAvatarChoice = async (choiceSeed: string) => {
    if (avatarLocked) return;

    setSelectedCustomCollectionId(null);
    setSelectedCustomItemId(null);
    setSelectedSeed(choiceSeed);
    await saveAvatarSelection(
      selectedStyle,
      choiceSeed,
      selectedStyle === "avataaars" ? selectedConfig : null,
      effectiveSelectedEffect,
      "O novo avatar já está valendo no perfil.",
    );
  };

  const previewShopConfig = (item: AvatarShopItem) => ({
      ...selectedConfig,
      [item.slot]: item.value,
    });

  const handleBuyShopItem = async (item: AvatarShopItem) => {
    if (avatarLocked) return;

    if (isShopItemUnlocked(unlockedItems, item.id)) {
      await equipShopItem(item);
      return;
    }

    if (availableCoins < item.cost) {
      toast({
        title: "Sinapses insuficientes",
        description: `Você precisa de mais ${item.cost - availableCoins} Sinapses para comprar ${item.label}.`,
        variant: "destructive",
      });
      return;
    }

    setBuyingItemId(item.id);
    const nextUnlocks = Array.from(new Set([...unlockedItems, item.id]));
    const nextSpent = spentCoins + item.cost;
    const nextConfig = previewShopConfig(item);

    const { error } = await supabase
      .from("profiles")
      .update({
        avatar_unlocks: nextUnlocks,
        avatar_shop_spent: nextSpent,
        avatar_style: {
          style: "avataaars",
          seed: selectedSeed,
          config: nextConfig,
          effect: effectiveSelectedEffect,
        },
        avatar_url: buildDiceBearAvatarUrl("avataaars", selectedSeed, nextConfig),
      })
      .eq("user_id", user.id);

    if (error) {
      toast({
        title: "Não foi possível comprar",
        description: "O item não foi desbloqueado no perfil.",
        variant: "destructive",
      });
      setBuyingItemId(null);
      return;
    }

    await refreshProfile();
    setSelectedStyle("avataaars");
    setSelectedConfig(nextConfig);
    setBuyingItemId(null);
    toast({
      title: "Item liberado",
      description: `${item.label} foi comprado e equipado.`,
    });
  };

  const handleUnlockStyle = async (style: ProfileAvatarStyle) => {
    if (avatarLocked || !profile) return;

    const styleMeta = profileAvatarStyles.find((entry) => entry.id === style);
    if (!styleMeta) return;
    if (isAvatarStyleUnlocked(unlockedItems, style)) {
      setSelectedStyle(style);
      return;
    }

    if (availableCoins < styleMeta.cost) {
      toast({
        title: "Sinapses insuficientes",
        description: `Você precisa de mais ${styleMeta.cost - availableCoins} Sinapses para liberar ${styleMeta.label}.`,
        variant: "destructive",
      });
      return;
    }

    const nextUnlocks = Array.from(new Set([...unlockedItems, getAvatarStyleUnlockId(style)]));
    const nextSpent = spentCoins + styleMeta.cost;

    const { error } = await supabase
      .from("profiles")
      .update({
        avatar_unlocks: nextUnlocks,
        avatar_shop_spent: nextSpent,
      })
      .eq("user_id", user.id);

    if (error) {
      toast({
        title: "Não foi possível liberar",
        description: "O estilo não foi adicionado ao perfil.",
        variant: "destructive",
      });
      return;
    }

    await refreshProfile();
    setSelectedStyle(style);
    toast({
      title: "Estilo liberado",
      description: `${styleMeta.label} agora faz parte da sua coleção.`,
    });
  };

  const handleUnlockChoice = async (choiceSeed: string, choiceCost: number) => {
    if (avatarLocked || !profile) return;

    if (isAvatarChoiceUnlocked(unlockedItems, selectedStyle, choiceSeed)) {
      await selectAvatarChoice(choiceSeed);
      return;
    }

    if (availableCoins < choiceCost) {
      toast({
        title: "Sinapses insuficientes",
        description: `Você precisa de mais ${choiceCost - availableCoins} Sinapses para liberar essa variação.`,
        variant: "destructive",
      });
      return;
    }

    setBuyingChoiceId(choiceSeed);

    const nextUnlocks = Array.from(new Set([
      ...unlockedItems,
      getAvatarChoiceUnlockId(selectedStyle, choiceSeed),
    ]));
    const nextSpent = spentCoins + choiceCost;

    const { error } = await supabase
      .from("profiles")
      .update({
        avatar_unlocks: nextUnlocks,
        avatar_shop_spent: nextSpent,
      })
      .eq("user_id", user.id);

    if (error) {
      setBuyingChoiceId(null);
      toast({
        title: "Não foi possível liberar",
        description: "A variação não foi adicionada ao seu perfil.",
        variant: "destructive",
      });
      return;
    }

    await refreshProfile();
    setBuyingChoiceId(null);
    setSelectedSeed(choiceSeed);
    toast({
      title: "Variação liberada",
      description: "Nova opção comprada. Agora você já pode usar esse avatar.",
    });
  };

  const getShopPreviewUrl = (item: AvatarShopItem) =>
    buildDiceBearAvatarUrl("avataaars", selectedSeed, {
      ...previewShopConfig(item),
    });

  const toggleCatalogVisibility = async (type: "hiddenTabs" | "hiddenStyles" | "hiddenChoices" | "hiddenItems", id: string) => {
    if (!isAdmin) return;

    setUpdatingCatalogId(id);
    const nextConfig: AvatarCatalogVisibilityConfig = {
      ...catalogVisibility,
      [type]: catalogVisibility[type].includes(id)
        ? catalogVisibility[type].filter((entry) => entry !== id)
        : [...catalogVisibility[type], id],
    };

    const { error } = await saveAvatarCatalogVisibilityConfig(nextConfig);
    if (error) {
      toast({
        title: "Não foi possível atualizar",
        description: "A visibilidade da loja não foi salva.",
        variant: "destructive",
      });
      setUpdatingCatalogId(null);
      return;
    }

    setCatalogVisibility(nextConfig);
    setUpdatingCatalogId(null);
  };

  const persistCustomCatalog = async (nextConfig: CustomAvatarCatalogConfig) => {
    setSavingCustomCatalog(true);
    const { error } = await saveCustomAvatarCatalogConfig(nextConfig);

    if (error) {
      toast({
        title: "Não foi possível salvar",
        description: "O catálogo enviado não foi salvo.",
        variant: "destructive",
      });
      setSavingCustomCatalog(false);
      return false;
    }

    setCustomCatalog(nextConfig);
    setSavingCustomCatalog(false);
    return true;
  };

  const handleUploadCatalog = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []).filter((file) => file.name.toLowerCase().endsWith(".svg"));
    if (!user || files.length === 0) return;

    setUploadingCatalog(true);

    const collectionId = `colecao-${Date.now()}`;
    const collectionName = `Coleção ${customCatalog.collections.length + 1}`;
    const uploadedItems: CustomAvatarCatalogConfig["collections"][number]["items"] = [];

    for (const [index, file] of files.entries()) {
      const safeFileName = file.name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9._-]+/g, "-")
        .toLowerCase();
      const path = `${user.id}/catalog/${collectionId}/${Date.now()}-${index}-${safeFileName}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, {
          contentType: "image/svg+xml",
          upsert: false,
        });

      if (uploadError) {
        toast({
          title: "Não foi possível enviar",
          description: `Falha ao enviar ${file.name}.`,
          variant: "destructive",
        });
        setUploadingCatalog(false);
        event.target.value = "";
        return;
      }

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      uploadedItems.push({
        id: `${collectionId}-item-${index + 1}`,
        name: file.name.replace(/\.svg$/i, ""),
        price: 200,
        imageUrl: data.publicUrl,
        hidden: false,
        order: index,
      });
    }

    const nextConfig: CustomAvatarCatalogConfig = {
      collections: [
        ...customCatalog.collections,
        {
          id: collectionId,
          name: collectionName,
          hidden: false,
          order: customCatalog.collections.length,
          items: uploadedItems,
        },
      ],
    };

    const saved = await persistCustomCatalog(nextConfig);
    setUploadingCatalog(false);
    event.target.value = "";

    if (saved) {
      toast({
        title: "Catalogo enviado",
        description: `${uploadedItems.length} avatar(es) adicionados em ${collectionName}.`,
      });
    }
  };

  const updateCollectionField = (collectionId: string, field: "name" | "hidden", value: string | boolean) => {
    setCustomCatalog((current) => ({
      collections: current.collections.map((collection) =>
        collection.id === collectionId ? { ...collection, [field]: value } : collection),
    }));
  };

  const updateCollectionItem = (
    collectionId: string,
    itemId: string,
    field: "name" | "price" | "hidden",
    value: string | number | boolean,
  ) => {
    setCustomCatalog((current) => ({
      collections: current.collections.map((collection) =>
        collection.id === collectionId
          ? {
              ...collection,
              items: collection.items.map((item) =>
                item.id === itemId ? { ...item, [field]: value } : item),
            }
          : collection),
    }));
  };

  const handleSaveCustomCatalog = async () => {
    await persistCustomCatalog(customCatalog);
    toast({
      title: "Catalogo salvo",
      description: "As alteracoes da sua vitrine foram gravadas.",
    });
  };

  const handleDuelStatusChange = (nextStatus: DuelPresenceStatus) => {
    setDuelStatus(nextStatus);
    setStoredDuelStatus(nextStatus);
    toast({
      title: nextStatus === "accepting" ? "Pronto para duelos" : "Modo estudo ativado",
      description:
        nextStatus === "accepting"
          ? "Seu perfil vai aparecer como aceitando desafios na arena."
          : "Seu perfil vai aparecer como focado nos estudos na arena.",
    });
  };

  const getCustomCatalogUnlockId = (itemId: string) => `custom-choice:${itemId}`;
  const isCustomCatalogItemUnlocked = (itemId: string, price: number) =>
    price === 0 || unlockedItems.includes(getCustomCatalogUnlockId(itemId));
  const isAvatarEffectUnlocked = (effectId: string, price: number) =>
    price === 0 || unlockedItems.includes(effectId);

  const equipAvatarEffect = async (effect: AvatarEffect) => {
    if (avatarLocked) return;

    setSelectedEffect(effect);
    setPreviewedEffect(effect);
    await saveAvatarSelection(
      selectedStyle,
      selectedSeed,
      selectedStyle === "avataaars" ? selectedConfig : null,
      effect,
      "O efeito já está ativo no seu perfil.",
    );
  };

  const handleUnlockAvatarEffect = async (effectId: string, effect: AvatarEffect, cost: number, label: string) => {
    if (avatarLocked || !profile) return;

    if (isAvatarEffectUnlocked(effectId, cost)) {
      await equipAvatarEffect(effect);
      return;
    }

    if (availableCoins < cost) {
      toast({
        title: "Sinapses insuficientes",
        description: `Você precisa de mais ${cost - availableCoins} Sinapses para liberar ${label}.`,
        variant: "destructive",
      });
      return;
    }

    setBuyingItemId(effectId);
    const nextUnlocks = Array.from(new Set([...unlockedItems, effectId]));
    const nextSpent = spentCoins + cost;

    const { error } = await supabase
      .from("profiles")
      .update({
        avatar_unlocks: nextUnlocks,
        avatar_shop_spent: nextSpent,
        avatar_style: {
          style: selectedStyle,
          seed: selectedSeed,
          config: selectedStyle === "avataaars" ? selectedConfig : null,
          effect,
          customCatalogItemId: storedCustomCatalogItemId,
        },
      })
      .eq("user_id", user.id);

    if (error) {
      setBuyingItemId(null);
      toast({
        title: "Não foi possível liberar",
        description: "O efeito não foi adicionado ao seu perfil.",
        variant: "destructive",
      });
      return;
    }

    await refreshProfile();
    setBuyingItemId(null);
    setSelectedEffect(effect);
    setPreviewedEffect(effect);
    toast({
      title: "Efeito liberado",
      description: `${label} agora faz parte da sua coleção.`,
    });
  };

  const selectCustomCatalogItem = async (collection: CustomCatalogCollection, item: CustomCatalogItem) => {
    if (avatarLocked) return;

    setSelectedCustomCollectionId(collection.id);
    setSelectedCustomItemId(item.id);
    setSavingAvatar(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        avatar_url: item.imageUrl,
        avatar_style: {
          style: selectedStyle,
          seed: selectedSeed,
          config: selectedStyle === "avataaars" ? selectedConfig : null,
          effect: effectiveSelectedEffect,
          customCatalogItemId: item.id,
        },
      })
      .eq("user_id", user.id);

    if (error) {
      toast({
        title: "Não foi possível usar",
        description: "Esse avatar não foi aplicado ao perfil.",
        variant: "destructive",
      });
      setSavingAvatar(false);
      return;
    }

    await refreshProfile();
    setSavingAvatar(false);
    toast({
      title: "Avatar atualizado",
      description: `${item.name} agora está ativo no seu perfil.`,
    });
  };

  const handleUnlockCustomCatalogItem = async (collection: CustomCatalogCollection, item: CustomCatalogItem) => {
    if (avatarLocked || !profile) return;

    if (isCustomCatalogItemUnlocked(item.id, item.price)) {
      await selectCustomCatalogItem(collection, item);
      return;
    }

    if (availableCoins < item.price) {
      toast({
        title: "Sinapses insuficientes",
        description: `Você precisa de mais ${item.price - availableCoins} Sinapses para liberar ${item.name}.`,
        variant: "destructive",
      });
      return;
    }

    setBuyingChoiceId(item.id);
    const nextUnlocks = Array.from(new Set([...unlockedItems, getCustomCatalogUnlockId(item.id)]));
    const nextSpent = spentCoins + item.price;

    const { error } = await supabase
      .from("profiles")
      .update({
        avatar_unlocks: nextUnlocks,
        avatar_shop_spent: nextSpent,
      })
      .eq("user_id", user.id);

    if (error) {
      setBuyingChoiceId(null);
      toast({
        title: "Não foi possível liberar",
        description: "Esse avatar não foi adicionado à sua coleção.",
        variant: "destructive",
      });
      return;
    }

    await refreshProfile();
    setBuyingChoiceId(null);
    setSelectedCustomCollectionId(collection.id);
    setSelectedCustomItemId(item.id);
    toast({
      title: "Avatar liberado",
      description: "Agora você já pode usar essa opção na sua coleção.",
    });
  };

  return (
    <Layout>
      <Breadcrumbs items={[{ label: "Loja" }]} />
      <section className="container mx-auto max-w-7xl px-3 py-6 sm:px-4 sm:py-8">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-[32px] border border-emerald-100 bg-[linear-gradient(180deg,#ffffff_0%,#f6fbf8_100%)] shadow-[0_20px_70px_rgba(15,23,42,0.08)]"
        >
          <div className="grid gap-5 px-4 py-4 sm:px-6 sm:py-6 lg:grid-cols-[320px_minmax(0,1fr)] lg:px-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.05 }}
              className="rounded-[28px] border border-emerald-100 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.10),_transparent_55%),linear-gradient(180deg,#ffffff_0%,#f5fbf7_100%)] p-6 lg:sticky lg:top-24"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary/60">Preview</p>
                {previewingDifferentEffect ? (
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary">
                    Prévia do efeito
                  </span>
                ) : (
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold text-emerald-700">
                    Efeito em uso
                  </span>
                )}
              </div>
              <div className="mt-6 flex justify-center">
                <div className="relative flex h-44 w-44 items-center justify-center">
                  {previewEffect !== "none" ? (
                    <>
                      <motion.div
                        className="absolute inset-4 rounded-full bg-[radial-gradient(circle,rgba(16,185,129,0.18)_0%,rgba(16,185,129,0.02)_62%,transparent_78%)] blur-xl"
                        animate={{ scale: [0.96, 1.06, 0.96], opacity: [0.55, 0.9, 0.55] }}
                        transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
                      />
                      {previewEffect === "orbit" ? (
                        <>
                          <motion.div
                            className="absolute inset-2 rounded-full border border-emerald-300/50"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
                          />
                          <motion.div
                            className="absolute inset-0 rounded-full border border-dashed border-sky-200/70"
                            animate={{ rotate: -360, scale: [0.98, 1, 0.98] }}
                            transition={{ rotate: { duration: 24, repeat: Infinity, ease: "linear" }, scale: { duration: 4.2, repeat: Infinity, ease: "easeInOut" } }}
                          />
                        </>
                      ) : null}
                      {previewEffect === "sparkles" ? [
                        { className: "left-3 top-8 bg-amber-300", delay: 0 },
                        { className: "right-6 top-5 bg-sky-300", delay: 0.8 },
                        { className: "right-3 bottom-9 bg-emerald-300", delay: 1.4 },
                        { className: "left-7 bottom-6 bg-fuchsia-300", delay: 1.9 },
                      ].map((particle) => (
                        <motion.span
                          key={particle.className}
                          className={`absolute h-3 w-3 rounded-full shadow-sm ${particle.className}`}
                          animate={{ y: [0, -10, 0], x: [0, 3, 0], opacity: [0.45, 1, 0.45] }}
                          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut", delay: particle.delay }}
                        />
                      )) : null}
                      {previewEffect === "mirror" ? (
                        <motion.div
                          className="absolute inset-y-5 left-0 w-[22%] rounded-full bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.88)_50%,transparent_100%)] blur-[1px]"
                          animate={{ x: ["-170%", "210%"] }}
                          transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
                        />
                      ) : null}
                    </>
                  ) : null}
                  <motion.div
                    animate={
                      previewEffect === "spin"
                        ? { rotate: [0, 10, -10, 0], scale: [1, 1.03, 1] }
                        : previewEffect === "mirror"
                          ? { x: [0, 4, -4, 0] }
                          : previewEffect === "none"
                            ? undefined
                            : { y: [0, -4, 0], scale: [1, 1.02, 1] }
                    }
                    transition={
                      previewEffect === "spin"
                        ? { duration: 3.8, repeat: Infinity, ease: "easeInOut" }
                        : previewEffect === "mirror"
                          ? { duration: 2.8, repeat: Infinity, ease: "easeInOut" }
                          : previewEffect === "none"
                            ? undefined
                            : { duration: 3.1, repeat: Infinity, ease: "easeInOut" }
                    }
                    className="relative z-10"
                  >
                    <SimpleProfileAvatar size="xl" src={activePreviewAvatarUrl} effect={previewEffect} showBadge={false} />
                  </motion.div>
                </div>
              </div>
              <div className="mt-6 min-w-0 text-center">
                <h2 className="break-words font-heading text-[clamp(1.6rem,2.4vw,2.1rem)] font-black leading-tight text-foreground">
                  {displayName}
                </h2>
                <p className="mt-2 text-sm font-medium text-muted-foreground">{roleLabel}</p>
              </div>
              <div className="mt-6 space-y-3">
                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                  <div className="rounded-[18px] border border-white/80 bg-white/70 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/60">Conta</p>
                    <p className="mt-2 break-all text-sm font-medium text-foreground">{emailLabel || "Não informado"}</p>
                  </div>
                  <div className="rounded-[18px] border border-white/80 bg-white/70 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/60">Turma</p>
                    <p className="mt-2 text-sm font-medium text-foreground">{turmaNome}</p>
                  </div>
                  <div className="rounded-[18px] border border-white/80 bg-white/70 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/60">Acesso</p>
                    <p className="mt-2 text-sm font-medium text-foreground">{roleLabel}</p>
                  </div>
                </div>
                <div className="rounded-[22px] border border-white/80 bg-white/75 px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/60">Status na arena</p>
                      <p className="mt-1 text-xs text-muted-foreground">Defina como seu avatar aparece no lobby dos duelos.</p>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => handleDuelStatusChange("accepting")}
                      className={`rounded-[18px] border px-4 py-3 text-left transition-all ${
                        duelStatus === "accepting"
                          ? "border-primary/30 bg-primary/10 shadow-sm"
                          : "border-border bg-background/70 hover:border-primary/20"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-primary" />
                        <span className="font-heading text-sm font-bold text-foreground">Cavaleiro</span>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">Aparece disponível para aceitar desafios.</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDuelStatusChange("studying")}
                      className={`rounded-[18px] border px-4 py-3 text-left transition-all ${
                        duelStatus === "studying"
                          ? "border-amber-300 bg-amber-50 shadow-sm"
                          : "border-border bg-background/70 hover:border-amber-200"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-amber-600" />
                        <span className="font-heading text-sm font-bold text-foreground">Só estudando</span>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">Mostra que está online, mas focado nos estudos.</p>
                    </button>
                  </div>
                </div>
                <div className="rounded-[22px] border border-white/80 bg-background/80 px-4 py-4 text-sm leading-6 text-muted-foreground">
                  Estilo atual: <span className="font-semibold text-foreground">{persistedCatalogLabel}</span>
                  <br />
                  Opção: <span className="font-medium text-foreground/80">{persistedOptionLabel}</span>
                </div>
              </div>
            </motion.div>

            <div className="space-y-5">
              <div className="rounded-[24px] border border-emerald-100 bg-white/85 p-2.5 shadow-[0_10px_24px_rgba(16,24,40,0.05)] sm:p-3">
                <div className="-mx-1 overflow-x-auto px-1 pb-1">
                  <div className="flex min-w-max gap-2">
                  {visibleShopTabs.map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setSelectedShopTab(tab.key)}
                      className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                        selectedShopTab === tab.key
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "border border-border bg-background text-muted-foreground hover:border-primary/20 hover:text-foreground"
                      }`}
                    >
                      <span className="inline-flex items-center gap-2">
                        {tab.label}
                        {tab.locked ? <Lock className="h-3.5 w-3.5 opacity-70" /> : null}
                      </span>
                      {isAdmin && tab.key !== "avatars" ? (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            void toggleCatalogVisibility("hiddenTabs", tab.key);
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              event.stopPropagation();
                              void toggleCatalogVisibility("hiddenTabs", tab.key);
                            }
                          }}
                          className={`ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] shadow-sm ${
                            catalogVisibility.hiddenTabs.includes(tab.key) ? "bg-destructive text-white" : "bg-slate-900 text-white"
                          }`}
                          title={catalogVisibility.hiddenTabs.includes(tab.key) ? "Mostrar para alunos" : "Ocultar dos alunos"}
                        >
                          {updatingCatalogId === tab.key ? "..." : <X className="h-3 w-3" />}
                        </span>
                      ) : null}
                    </button>
                  ))}
                  </div>
                </div>
              </div>

              {selectedShopTab === "avatars" && (
              <div className="rounded-[28px] border border-emerald-100 bg-white/90 p-5 shadow-[0_10px_30px_rgba(16,24,40,0.06)]">
                <div className="flex flex-col gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700">Loja</span><span className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white"><Brain className="h-3.5 w-3.5" />Sinapses {availableCoins}</span></div>
                    <h3 className="mt-3 font-heading text-2xl font-black text-foreground">Escolha seu estilo</h3>
                    <p className="mt-2 text-sm leading-7 text-muted-foreground">
                      Sol, Trilha e Nuvem do Thumbs são grátis. Cada avatar das outras opções é liberado individualmente com Sinapses.
                    </p>
                  </div>
                </div>

                {avatarLocked ? (
                  <div className="mt-4 rounded-[18px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    Este perfil está com personalização bloqueada no momento.
                  </div>
                ) : null}

                <div className="mt-6 rounded-[24px] border border-border bg-secondary/20 p-3">
                  <div className="flex flex-wrap gap-3">
                  {orderedVisibleStyles.map((style) => {
                    const active = !selectedCustomCollectionId && selectedStyle === style.id;
                    const previewUrl = buildDiceBearAvatarUrl(
                      style.id,
                      `${baseSeed}-preview`,
                      style.id === "avataaars" ? selectedConfig : null,
                    );
                    const styleHidden = catalogVisibility.hiddenStyles.includes(style.id);

                    return (
                      <button
                        key={style.id}
                        type="button"
                        onClick={() => {
                          setSelectedCustomCollectionId(null);
                          setSelectedCustomItemId(null);
                          setSelectedStyle(style.id);
                        }}
                        className={[
                          "btn-tap relative flex h-[72px] w-[72px] items-center justify-center rounded-[20px] border p-3 transition-all",
                          active
                            ? "border-primary/40 bg-primary/10 shadow-sm ring-2 ring-primary/10"
                            : styleHidden
                              ? "border-destructive/30 bg-destructive/5 opacity-70"
                              : "border-border bg-background hover:border-primary/20 hover:bg-background",
                        ].join(" ")}
                        aria-label={style.label}
                        title={style.label}
                      >
                        <SimpleProfileAvatar size="md" src={previewUrl} showBadge={false} />
                        {isAdmin ? (
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              void toggleCatalogVisibility("hiddenStyles", style.id);
                            }}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                event.stopPropagation();
                                void toggleCatalogVisibility("hiddenStyles", style.id);
                              }
                            }}
                            className={`absolute -left-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] shadow-sm ${
                              styleHidden ? "bg-destructive text-white" : "bg-slate-900 text-white"
                            }`}
                            title={styleHidden ? "Mostrar para alunos" : "Ocultar dos alunos"}
                          >
                            {updatingCatalogId === style.id ? "..." : <X className="h-3 w-3" />}
                          </span>
                        ) : null}
                        {style.id === "avataaars" ? (
                          <>
                            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-[10px] text-amber-950 shadow-sm">
                              <Sparkles className="h-3 w-3" />
                            </span>
                            <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-amber-500 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-white shadow-sm">
                              Itens
                            </span>
                          </>
                        ) : null}
                      </button>
                    );
                  })}
                  {visibleCustomCollections.map((collection) => {
                    const previewItem = collection.items[0];
                    const active = selectedCustomCollectionId === collection.id;

                    return (
                      <button
                        key={collection.id}
                        type="button"
                        onClick={() => {
                          setSelectedCustomCollectionId(collection.id);
                          setSelectedCustomItemId((current) =>
                            collection.items.some((item) => item.id === current) ? current : (collection.items[0]?.id ?? null),
                          );
                        }}
                        className={[
                          "btn-tap relative flex h-[72px] w-[72px] items-center justify-center rounded-[20px] border p-3 transition-all",
                          active
                            ? "border-primary/40 bg-primary/10 shadow-sm ring-2 ring-primary/10"
                            : collection.hidden
                              ? "border-destructive/30 bg-destructive/5 opacity-70"
                              : "border-border bg-background hover:border-primary/20 hover:bg-background",
                        ].join(" ")}
                        aria-label={collection.name}
                        title={collection.name}
                      >
                        <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-white shadow-sm">
                          <img src={previewItem.imageUrl} alt={collection.name} className="h-9 w-9 object-contain" />
                        </div>
                        {isAdmin ? (
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              updateCollectionField(collection.id, "hidden", !collection.hidden);
                            }}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                event.stopPropagation();
                                updateCollectionField(collection.id, "hidden", !collection.hidden);
                              }
                            }}
                            className={`absolute -left-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] shadow-sm ${
                              collection.hidden ? "bg-destructive text-white" : "bg-slate-900 text-white"
                            }`}
                            title={collection.hidden ? "Mostrar para alunos" : "Ocultar dos alunos"}
                          >
                            <X className="h-3 w-3" />
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                  </div>
                </div>

                <div className="mt-8 flex flex-wrap items-center gap-2 text-sm">
                  <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
                    {selectedCatalogLabel}
                  </span>
                  {selectedCustomCollection ? (
                    <span className="rounded-full bg-sky-50 px-3 py-1 font-medium text-sky-700">
                      Coleção enviada por você, no mesmo catálogo da loja
                    </span>
                  ) : selectedStyle === "thumbs" ? (
                    <span className="rounded-full bg-sky-50 px-3 py-1 font-medium text-sky-700">
                      Thumbs usa variações prontas, sem troca de cor por enquanto
                    </span>
                  ) : null}
                </div>

                <div className="mt-6">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary/60">Variações</p>
                  <h4 className="mt-2 font-heading text-lg font-bold text-foreground">
                    {selectedCustomCollection ? `Escolha um avatar de ${selectedCustomCollection.name}` : "Escolha a variação do personagem"}
                  </h4>
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
                    {selectedCustomCollection ? selectedCustomCollection.items.map((item) => {
                      const active = storedCustomCatalogItemId === item.id;
                      const unlocked = isCustomCatalogItemUnlocked(item.id, item.price);
                      const isBuying = buyingChoiceId === item.id;
                      const previewing = selectedCustomItemId === item.id && !active;

                      return (
                        <div
                          key={item.id}
                          onClick={() => setSelectedCustomItemId(item.id)}
                          className={[
                            "relative rounded-[22px] border p-4 text-center transition-all cursor-pointer",
                            active
                              ? "border-primary bg-primary/10 shadow-[0_0_0_3px_rgba(16,185,129,0.18)]"
                              : previewing
                                ? "border-primary/40 bg-primary/5 shadow-sm"
                                : "border-border bg-card hover:border-primary/20 hover:bg-secondary/20",
                          ].join(" ")}
                          title={item.name}
                        >
                          <div className="flex justify-end">
                            {unlocked ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold text-emerald-800">
                                <Brain className="h-3.5 w-3.5" />
                                {item.price === 0 ? "Grátis" : "Seu avatar"}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold text-white shadow-sm">
                                <Brain className="h-3.5 w-3.5" />
                                {item.price} Sinapses
                              </span>
                            )}
                          </div>
                          <div className="mt-3 flex min-h-[96px] items-center justify-center rounded-[18px] bg-secondary/25 p-3">
                            <img src={item.imageUrl} alt={item.name} className="h-20 w-20 object-contain" />
                          </div>
                          <p className="mt-3 font-heading text-sm font-semibold text-foreground">
                            {item.name}
                          </p>
                          <div className="mt-4">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                if (unlocked) {
                                  void selectCustomCatalogItem(selectedCustomCollection, item);
                                  return;
                                }
                                void handleUnlockCustomCatalogItem(selectedCustomCollection, item);
                              }}
                              disabled={savingAvatar || isBuying || active}
                              className={`block w-full rounded-xl px-3 py-2.5 text-center text-xs font-semibold transition-all disabled:opacity-60 ${
                                unlocked
                                  ? "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                  : "bg-primary text-primary-foreground hover:bg-primary/90"
                              }`}
                            >
                              {unlocked ? (active ? "Usando" : (savingAvatar ? "Aplicando..." : "Usar")) : (isBuying ? "Comprando..." : "Comprar")}
                            </button>
                          </div>
                        </div>
                      );
                    }) : avatarChoices.map((choice) => {
                      const active = storedAvatar.style === selectedStyle && storedAvatar.seed === choice.seed;
                      const unlocked = isAvatarChoiceUnlocked(unlockedItems, selectedStyle, choice.seed);
                      const isBuying = buyingChoiceId === choice.seed;
                      const choiceId = getAvatarChoiceUnlockId(selectedStyle, choice.seed);
                      const choiceHidden = catalogVisibility.hiddenChoices.includes(choiceId);
                      const previewing = selectedStyle === storedAvatar.style
                        ? selectedSeed === choice.seed && !active
                        : selectedSeed === choice.seed;

                      return (
                        <div
                          key={choice.id}
                          onClick={() => setSelectedSeed(choice.seed)}
                          className={[
                            "relative rounded-[22px] border p-4 text-center transition-all cursor-pointer",
                            active
                              ? "border-primary bg-primary/10 shadow-[0_0_0_3px_rgba(16,185,129,0.18)]"
                              : choiceHidden
                                ? "border-destructive/30 bg-destructive/5 opacity-70"
                              : previewing
                                ? "border-primary/40 bg-primary/5 shadow-sm"
                              : "border-border bg-card hover:border-primary/20 hover:bg-secondary/20",
                          ].join(" ")}
                          title={`Opção ${choice.label}`}
                        >
                          <div className="flex justify-end">
                            {isAdmin ? (
                              <span
                                role="button"
                                tabIndex={0}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void toggleCatalogVisibility("hiddenChoices", choiceId);
                                }}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter" || event.key === " ") {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    void toggleCatalogVisibility("hiddenChoices", choiceId);
                                  }
                                }}
                                className={`absolute left-3 top-3 flex h-5 w-5 items-center justify-center rounded-full text-[10px] shadow-sm ${
                                  choiceHidden ? "bg-destructive text-white" : "bg-slate-900 text-white"
                                }`}
                                title={choiceHidden ? "Mostrar para alunos" : "Ocultar dos alunos"}
                              >
                                {updatingCatalogId === choiceId ? "..." : <X className="h-3 w-3" />}
                              </span>
                            ) : null}
                            {unlocked ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold text-emerald-800">
                                <Brain className="h-3.5 w-3.5" />
                                {choice.cost === 0 ? "Grátis" : "Seu avatar"}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold text-white shadow-sm">
                                <Brain className="h-3.5 w-3.5" />
                                {choice.cost} Sinapses
                              </span>
                            )}
                          </div>
                          <SimpleProfileAvatar size="lg" src={choice.url} showBadge={false} className="mx-auto" />
                          <p className="mt-3 font-heading text-sm font-semibold text-foreground">
                            Opção {choice.label}
                          </p>
                          <div className="mt-4">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                if (unlocked) {
                                  void selectAvatarChoice(choice.seed);
                                  return;
                                }
                                void handleUnlockChoice(choice.seed, choice.cost);
                              }}
                              disabled={savingAvatar || isBuying || active}
                              className={`block w-full rounded-xl px-3 py-2.5 text-center text-xs font-semibold transition-all disabled:opacity-60 ${
                                unlocked
                                  ? "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                  : "bg-primary text-primary-foreground hover:bg-primary/90"
                              }`}
                            >
                              {unlocked ? (active ? "Usando" : (savingAvatar ? "Aplicando..." : "Usar")) : (isBuying ? "Comprando..." : "Comprar")}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              )}

              {selectedShopTab === "effects" && (
              <div className="rounded-[28px] border border-emerald-100 bg-white/90 p-5 shadow-[0_10px_30px_rgba(16,24,40,0.06)]">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary/60">Efeitos</p>
                    <h3 className="mt-2 font-heading text-2xl font-black text-foreground">Animações do perfil</h3>
                    <p className="mt-2 text-sm leading-7 text-muted-foreground">
                      Libere efeitos leves para deixar seu avatar mais raro, brilhante e com cara de jogo.
                    </p>
                  </div>

                  <div className="rounded-[20px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-foreground">
                    <p className="inline-flex items-center gap-2 font-heading text-sm font-semibold">
                      <Brain className="h-4 w-4 text-emerald-600" />
                      Sinapses disponíveis
                    </p>
                    <p className="mt-1 text-2xl font-black text-primary">{availableCoins}</p>
                  </div>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {avatarEffectItems.map((item) => {
                    const unlocked = isAvatarEffectUnlocked(item.id, item.cost);
                    const active = persistedEffect === item.value;
                    const previewing = previewEffect === item.value && !active;
                    const isBuying = buyingItemId === item.id;

                    return (
                      <div
                        key={item.id}
                        onClick={() => setPreviewedEffect(item.value)}
                        className={[
                          "cursor-pointer rounded-[22px] border p-4 text-center transition-all",
                          active
                            ? "border-primary bg-primary/10 shadow-[0_0_0_3px_rgba(16,185,129,0.18)]"
                            : previewing
                              ? "border-primary/40 bg-primary/5 shadow-sm"
                              : "border-border bg-card hover:border-primary/20 hover:bg-secondary/20",
                        ].join(" ")}
                      >
                        <div className="flex justify-end">
                          {unlocked ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold text-emerald-800">
                              <Brain className="h-3.5 w-3.5" />
                              {active ? "Seu efeito" : previewing ? "Prévia" : item.cost === 0 ? "Grátis" : "Liberado"}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold text-white shadow-sm">
                              <Brain className="h-3.5 w-3.5" />
                              {item.cost} Sinapses
                            </span>
                          )}
                        </div>
                        <div className="mt-3 flex min-h-[110px] items-center justify-center rounded-[18px] bg-secondary/25 p-4">
                          <SimpleProfileAvatar size="lg" src={activePreviewAvatarUrl} effect="none" showBadge={false} />
                        </div>
                        <p className="mt-3 font-heading text-sm font-semibold text-foreground">{item.label}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
                        <div className="mt-4">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              void handleUnlockAvatarEffect(item.id, item.value, item.cost, item.label);
                            }}
                            disabled={savingAvatar || isBuying || active}
                            className={`block w-full rounded-xl px-3 py-2.5 text-center text-xs font-semibold transition-all disabled:opacity-60 ${
                              unlocked
                                ? "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                : "bg-primary text-primary-foreground hover:bg-primary/90"
                            }`}
                          >
                            {unlocked ? (active ? "Usando" : (savingAvatar ? "Aplicando..." : previewing ? "Usar este" : "Usar")) : (isBuying ? "Comprando..." : "Comprar")}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              )}

              {(selectedShopTab === "accessories" || selectedShopTab === "top" || selectedShopTab === "clothing") && (
              <div className="rounded-[28px] border border-emerald-100 bg-white/90 p-5 shadow-[0_10px_30px_rgba(16,24,40,0.06)]">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary/60">Itens</p>
                    <h3 className="mt-2 font-heading text-2xl font-black text-foreground">Itens do Avatar Clássico</h3>
                    <p className="mt-2 text-sm leading-7 text-muted-foreground">
                      Use suas Sinapses para liberar óculos, cabelo e roupa do Avatar Clássico.
                    </p>
                  </div>

                  <div className="rounded-[20px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-foreground">
                    <p className="inline-flex items-center gap-2 font-heading text-sm font-semibold">
                      <Brain className="h-4 w-4 text-emerald-600" />
                      Sinapses disponíveis
                    </p>
                    <p className="mt-1 text-2xl font-black text-primary">{availableCoins}</p>
                  </div>
                </div>

                {selectedCustomCollection || !isAvatarShopStyle(selectedStyle) ? (
                  <div className="mt-5 rounded-[20px] border border-dashed border-border bg-secondary/25 px-5 py-6 text-sm text-muted-foreground">
                    Troque para <strong>Avatar Clássico</strong> para editar óculos, cabelo e roupa.
                  </div>
                ) : (
                  <div className="mt-6 space-y-5">
                    {avatarShopSlots
                      .filter((slotGroup) => slotGroup.key === selectedShopTab)
                      .map((slotGroup) => (
                      <div key={slotGroup.key} className="rounded-[22px] border border-border bg-card/60 p-4">
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <div>
                            <p className="font-heading text-lg font-semibold text-foreground">{slotGroup.label}</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              Itens comprados ficam desbloqueados para equipar quando quiser.
                            </p>
                          </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                          {(isAdmin
                            ? getAvatarShopItemsBySlot(slotGroup.key)
                            : getAvatarShopItemsBySlot(slotGroup.key).filter((item) => !catalogVisibility.hiddenItems.includes(item.id))
                          ).map((item) => {
                            const unlocked = isShopItemUnlocked(unlockedItems, item.id);
                            const equipped =
                              storedAvatar.style === "avataaars" && storedAvatar.config[item.slot] === item.value;
                            const itemHidden = catalogVisibility.hiddenItems.includes(item.id);

                            return (
                              <AvatarShopCard
                                key={item.id}
                                item={item}
                                unlocked={unlocked}
                                equipped={equipped}
                                canAfford={availableCoins >= item.cost}
                                buying={buyingItemId === item.id || savingAvatar}
                                previewUrl={getShopPreviewUrl(item)}
                                onUse={() => void equipShopItem(item)}
                                onBuy={() => handleBuyShopItem(item)}
                                hidden={itemHidden}
                                isAdmin={isAdmin}
                                updating={updatingCatalogId === item.id}
                                onToggleHidden={() => void toggleCatalogVisibility("hiddenItems", item.id)}
                              />
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              )}

              {isAdmin && selectedShopTab === "catalogs" ? (
                <div className="rounded-[28px] border border-emerald-100 bg-white/90 p-5 shadow-[0_10px_30px_rgba(16,24,40,0.06)]">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-700">Admin</p>
                      <h4 className="mt-2 font-heading text-lg font-black text-foreground">Upar catalogo</h4>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Envie varios SVGs de uma vez e edite nome, valor e visibilidade na sua loja.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <input
                        ref={uploadCatalogInputRef}
                        type="file"
                        accept=".svg,image/svg+xml"
                        multiple
                        className="hidden"
                        onChange={handleUploadCatalog}
                      />
                      <button
                        type="button"
                        onClick={() => uploadCatalogInputRef.current?.click()}
                        disabled={uploadingCatalog}
                        className="btn-tap inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
                      >
                        <Upload className="h-4 w-4" />
                        {uploadingCatalog ? "Enviando..." : "Upar catalogo"}
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveCustomCatalog}
                        disabled={savingCustomCatalog}
                        className="btn-tap rounded-2xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground"
                      >
                        {savingCustomCatalog ? "Salvando..." : "Salvar catalogo"}
                      </button>
                    </div>
                  </div>

                  {customCatalog.collections.length > 0 ? (
                    <div className="mt-4 space-y-4">
                      {customCatalog.collections.map((collection) => (
                        <div
                          key={collection.id}
                          className={`rounded-[24px] border p-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)] ${
                            collection.hidden
                              ? "border-destructive/30 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(254,242,242,0.94)_100%)]"
                              : "border-emerald-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(245,251,247,0.95)_100%)]"
                          }`}
                        >
                          <div className="space-y-3">
                            <div className="flex flex-col gap-3 sm:flex-row">
                              <input
                                value={collection.name}
                                onChange={(event) => updateCollectionField(collection.id, "name", event.target.value)}
                                className="flex-1 rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold shadow-sm"
                                placeholder="Nome da colecao"
                              />
                              <button
                                type="button"
                                onClick={() => updateCollectionField(collection.id, "hidden", !collection.hidden)}
                                className={`rounded-2xl px-4 py-2.5 text-sm font-semibold ${
                                  collection.hidden ? "bg-destructive text-white" : "border border-border bg-white text-foreground shadow-sm"
                                }`}
                              >
                                {collection.hidden ? "Oculta" : "Visivel"}
                              </button>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                              {collection.items.map((item) => (
                                <div
                                  key={item.id}
                                  className={`overflow-hidden rounded-[20px] border shadow-sm transition-all ${
                                    item.hidden
                                      ? "border-destructive/30 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(254,242,242,0.9)_100%)]"
                                      : "border-emerald-100 bg-[linear-gradient(180deg,rgba(255,255,255,1)_0%,rgba(248,252,249,0.98)_100%)]"
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-3 px-3 pt-3">
                                    <span className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold text-white">
                                      {item.price} Sinapses
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => updateCollectionItem(collection.id, item.id, "hidden", !item.hidden)}
                                      className={`flex h-8 w-8 items-center justify-center rounded-full shadow-sm ${
                                        item.hidden ? "bg-destructive text-white" : "bg-slate-900 text-white"
                                      }`}
                                      title={item.hidden ? "Mostrar para alunos" : "Ocultar dos alunos"}
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                  <div className="px-3 pb-3 pt-2">
                                    <div className="flex min-h-[108px] items-center justify-center rounded-[18px] border border-emerald-100 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.08),transparent_55%),linear-gradient(180deg,#ffffff_0%,#f5fbf7_100%)] p-3">
                                      <img src={item.imageUrl} alt={item.name} className="h-20 w-20 object-contain" />
                                    </div>
                                  </div>
                                  <div className="grid gap-2 border-t border-border/60 bg-white/80 px-3 py-3">
                                    <input
                                      value={item.name}
                                      onChange={(event) => updateCollectionItem(collection.id, item.id, "name", event.target.value)}
                                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-semibold"
                                      placeholder="Nome do avatar"
                                    />
                                    <div className="flex items-center gap-2">
                                      <span className="rounded-lg bg-secondary px-2 py-2 text-[11px] font-semibold text-muted-foreground">
                                        Valor
                                      </span>
                                      <input
                                        value={item.price}
                                        onChange={(event) => updateCollectionItem(collection.id, item.id, "price", Math.max(0, Number(event.target.value) || 0))}
                                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                                        type="number"
                                        min={0}
                                        step={10}
                                        placeholder="Sinapses"
                                      />
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-4 rounded-2xl border border-dashed border-emerald-200 bg-white/80 px-4 py-5 text-sm text-muted-foreground">
                      Nenhuma colecao enviada ainda. Use o botao <strong>Upar catalogo</strong> para mandar seus SVGs em lote.
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </motion.div>
      </section>
    </Layout>
  );
}

function AvatarShopCard({
  item,
  unlocked,
  equipped,
  canAfford,
  buying,
  previewUrl,
  onUse,
  onBuy,
  hidden,
  isAdmin,
  updating,
  onToggleHidden,
}: {
  item: AvatarShopItem;
  unlocked: boolean;
  equipped: boolean;
  canAfford: boolean;
  buying: boolean;
  previewUrl: string;
  onUse: () => void;
  onBuy: () => void;
  hidden: boolean;
  isAdmin: boolean;
  updating: boolean;
  onToggleHidden: () => void;
}) {
  return (
    <div
      className={[
        "rounded-[20px] border bg-background p-4 shadow-sm transition-all",
        equipped
          ? "border-primary bg-primary/5 shadow-[0_0_0_3px_rgba(16,185,129,0.16)]"
          : hidden
            ? "border-destructive/30 bg-destructive/5 opacity-70"
            : "border-border",
      ].join(" ")}
    >
      <div className="flex justify-end">
        {isAdmin ? (
          <button
            type="button"
            onClick={onToggleHidden}
            className={`mr-auto flex h-5 w-5 items-center justify-center rounded-full text-[10px] shadow-sm ${
              hidden ? "bg-destructive text-white" : "bg-slate-900 text-white"
            }`}
            title={hidden ? "Mostrar para alunos" : "Ocultar dos alunos"}
          >
            {updating ? "..." : <X className="h-3 w-3" />}
          </button>
        ) : null}
        {equipped ? (
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-heading font-semibold uppercase tracking-[0.14em] text-primary">
            Usando
          </span>
        ) : unlocked ? (
          <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-heading font-semibold uppercase tracking-[0.14em] text-emerald-700">
            Liberado
          </span>
        ) : (
          <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-heading font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Loja
          </span>
        )}
      </div>

      <div className="mt-3 flex min-h-[120px] items-center justify-center rounded-[18px] bg-secondary/25">
        <SimpleProfileAvatar size="lg" src={previewUrl} showBadge={false} />
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="rounded-full bg-secondary px-3 py-1 text-sm font-semibold text-foreground">
          {item.cost === 0 ? "Grátis" : `${item.cost} Sinapses`}
        </div>

        {unlocked ? (
          <button
            type="button"
            onClick={onUse}
            disabled={equipped || buying}
            className="btn-tap rounded-xl border border-border px-3 py-2 text-sm font-medium text-foreground transition-all hover:bg-secondary disabled:opacity-60"
          >
            {equipped ? "Usando" : buying ? "Aplicando..." : "Usar"}
          </button>
        ) : (
          <button
            type="button"
            onClick={onBuy}
            disabled={!canAfford || buying}
            className="btn-tap rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-60"
          >
            {buying ? "Comprando..." : canAfford ? "Comprar" : "Sem Sinapses"}
          </button>
        )}
      </div>
    </div>
  );
}

function InfoCard({
  icon: Icon,
  eyebrow,
  title,
  description,
  detail,
}: {
  icon: typeof Mail;
  eyebrow: string;
  title: string;
  description: string;
  detail?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-w-0 rounded-[24px] border border-border bg-background p-5 shadow-sm"
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.28em] text-primary/60">{eyebrow}</p>
      <h3 className="mt-2 break-words font-heading text-xl font-black leading-tight text-foreground">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
      {detail ? (
        <div className="mt-4 rounded-[18px] border border-border bg-secondary/30 px-3 py-2.5 text-sm text-foreground/80">
          <p className="break-all">{detail}</p>
        </div>
      ) : null}
    </motion.div>
  );
}

function StatusChip({
  label,
  value,
  active = false,
}: {
  label: string;
  value: string;
  active?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-full border px-3 py-2 text-xs",
        active ? "border-primary/20 bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground",
      ].join(" ")}
    >
      <span className="mr-2 text-muted-foreground">{label}</span>
      <span className="font-semibold text-foreground">{value}</span>
    </div>
  );
}

function getRoleLabel(role: "admin" | "professor" | "coordenadora" | "aluno" | null) {
  if (role === "admin") return "Administrador";
  if (role === "coordenadora") return "Coordenadora";
  if (role === "professor") return "Professor";
  return "Aluno";
}

function getRoleDescription(role: "admin" | "professor" | "coordenadora" | "aluno" | null) {
  if (role === "admin") return "Acesso completo ao painel, usuários e ajustes internos.";
  if (role === "coordenadora") return "Visão geral pedagógica, sem acesso às áreas administrativas.";
  if (role === "professor") return "Permissões voltadas ao acompanhamento pedagógico.";
  return "Perfil voltado para estudo, progresso e atividades do aluno.";
}

function getDisplayName(nome: string, email: string | undefined, fallback: string) {
  const normalizedName = nome.trim();

  if (normalizedName && !looksLikeEmail(normalizedName)) {
    return normalizedName;
  }

  const source = (email || normalizedName).split("@")[0]?.trim();
  if (!source) {
    return fallback;
  }

  return source
    .replace(/[._-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function getEmailLabel(nome: string, email: string | undefined) {
  if (email?.trim()) return email.trim();
  if (looksLikeEmail(nome)) return nome.trim();
  return "";
}

function looksLikeEmail(value: string) {
  return value.includes("@");
}




