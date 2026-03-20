import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Layout from "@/components/Layout";
import Breadcrumbs from "@/components/Breadcrumbs";
import { turmas, disciplinas, importTemplate } from "@/data/catalog";
import type { Tema } from "@/data/content-types";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";
import { normalizeTemasInput, useStudyContent } from "@/hooks/useStudyContent";
import { toast } from "@/hooks/use-toast";
import {
  DEFAULT_CONTENT_DISPLAY,
  loadContentDisplayConfig,
  normalizeContentDisplayConfig,
  saveContentDisplayConfig,
  type ContentDisplayConfig,
} from "@/lib/content-display";
import {
  DEFAULT_MISSION_SCORING,
  loadMissionScoringConfig,
  normalizeMissionScoringConfig,
  saveMissionScoringConfig,
  type MissionScoringConfig,
} from "@/lib/mission-scoring";
import {
  assignManagedUserTurma,
  batchCreateManagedUsers,
  createManagedUser,
  deleteManagedUser,
  resetManagedUserPassword,
  resetManagedUserProgress,
  type ManagedCredential,
  type ManagedUser,
} from "@/lib/manage-users";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Trash2, Download, Upload, FileJson, Copy, Check, BookOpen,
  FileQuestion, Info, Users, UserPlus, ImageIcon, CheckCircle, XCircle,
  Search, Eye, EyeOff, KeyRound, Save, RefreshCcw, SlidersHorizontal, ChevronDown
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type AdminTab = "temas" | "questoes" | "modelo" | "alunos" | "fotos" | "pontuacao";
type AdminSensitiveAction = "delete" | "reset_progress";
type PhotoRequestWithProfile = Database["public"]["Tables"]["photo_change_requests"]["Row"] & {
  profiles: {
    nome: string;
    avatar_url: string | null;
  } | null;
};
type AdminListedUser = ManagedUser & {
  points: number;
  linkedTurmas?: string[];
  assignments?: Array<{ turma_id: string; disciplina_id: string }>;
};

const ADMIN_TAB_STYLES: Record<
  AdminTab,
  {
    surface: string;
    iconWrap: string;
    chip: string;
    border: string;
    line: string;
  }
> = {
  temas: {
    surface: "from-emerald-500/18 via-emerald-100/65 to-white",
    iconWrap: "bg-emerald-500/12 text-emerald-700",
    chip: "bg-emerald-500/10 text-emerald-700",
    border: "border-emerald-200/70",
    line: "from-emerald-500/70 via-emerald-300/30 to-transparent",
  },
  questoes: {
    surface: "from-sky-500/18 via-sky-100/65 to-white",
    iconWrap: "bg-sky-500/12 text-sky-700",
    chip: "bg-sky-500/10 text-sky-700",
    border: "border-sky-200/70",
    line: "from-sky-500/70 via-sky-300/30 to-transparent",
  },
  modelo: {
    surface: "from-amber-500/18 via-amber-100/65 to-white",
    iconWrap: "bg-amber-500/12 text-amber-700",
    chip: "bg-amber-500/10 text-amber-700",
    border: "border-amber-200/70",
    line: "from-amber-500/70 via-amber-300/30 to-transparent",
  },
  alunos: {
    surface: "from-violet-500/18 via-violet-100/65 to-white",
    iconWrap: "bg-violet-500/12 text-violet-700",
    chip: "bg-violet-500/10 text-violet-700",
    border: "border-violet-200/70",
    line: "from-violet-500/70 via-violet-300/30 to-transparent",
  },
  fotos: {
    surface: "from-rose-500/18 via-rose-100/65 to-white",
    iconWrap: "bg-rose-500/12 text-rose-700",
    chip: "bg-rose-500/10 text-rose-700",
    border: "border-rose-200/70",
    line: "from-rose-500/70 via-rose-300/30 to-transparent",
  },
  pontuacao: {
    surface: "from-cyan-500/18 via-cyan-100/65 to-white",
    iconWrap: "bg-cyan-500/12 text-cyan-700",
    chip: "bg-cyan-500/10 text-cyan-700",
    border: "border-cyan-200/70",
    line: "from-cyan-500/70 via-cyan-300/30 to-transparent",
  },
};

const ADMIN_TAB_DETAILS: Record<AdminTab, { title: string; description: string }> = {
  temas: {
    title: "Conteudo e temas",
    description: "Importe, filtre, exporte e limpe os temas publicados no app.",
  },
  questoes: {
    title: "Questoes",
    description: "Veja rapidamente as atividades importadas e a distribuicao por dificuldade.",
  },
  modelo: {
    title: "Modelo JSON",
    description: "Use esse formato como base para criar ou revisar os arquivos de importacao.",
  },
  alunos: {
    title: "Alunos e contas",
    description: "Cadastre contas, redefina senha, zere progresso e remova acessos com mais clareza.",
  },
  fotos: {
    title: "Solicitacoes de foto",
    description: "Revise as trocas de avatar pendentes e aprove ou recuse pelo painel.",
  },
  pontuacao: {
    title: "Pontuacao",
    description: "Configure como a missao diaria e a trilha pontuam no sistema.",
  },
};

export default function AdminPage() {
  const { role } = useAuth();
  const { temas: localTemas, loading: studyContentLoading, saving: studyContentSaving, saveTemas } = useStudyContent();
  const [tab, setTab] = useState<AdminTab>("temas");
  const [copied, setCopied] = useState(false);
  const [missionScoring, setMissionScoring] = useState<MissionScoringConfig>(DEFAULT_MISSION_SCORING);
  const [missionScoringLoading, setMissionScoringLoading] = useState(true);
  const [missionScoringSaving, setMissionScoringSaving] = useState(false);
  const [contentDisplay, setContentDisplay] = useState<ContentDisplayConfig>(DEFAULT_CONTENT_DISPLAY);
  const [contentDisplayLoading, setContentDisplayLoading] = useState(true);
  const [contentDisplaySaving, setContentDisplaySaving] = useState(false);

  useEffect(() => {
    let active = true;

    loadMissionScoringConfig().then((config) => {
      if (!active) return;
      setMissionScoring(config);
      setMissionScoringLoading(false);
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    loadContentDisplayConfig().then((config) => {
      if (!active) return;
      setContentDisplay(config);
      setContentDisplayLoading(false);
    });

    return () => {
      active = false;
    };
  }, []);

  if (role !== "admin") {
    return (
      <Layout>
        <Breadcrumbs items={[{ label: "Admin" }]} />
        <section className="container mx-auto max-w-3xl px-4 py-12">
          <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-6 text-center">
            <h1 className="font-heading text-2xl font-bold text-foreground">Acesso restrito</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Esta area exige uma conta administradora valida.
            </p>
          </div>
        </section>
      </Layout>
    );
  }

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(localTemas, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ilustrando-estudos-dados.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const mergeTemasById = (currentTemas: Tema[], importedTemas: Tema[]) => {
    const importedById = new Map(importedTemas.map((tema) => [tema.id, tema]));
    const mergedTemas = currentTemas.map((tema) => importedById.get(tema.id) ?? tema);
    const currentIds = new Set(currentTemas.map((tema) => tema.id));
    const newTemas = importedTemas.filter((tema) => !currentIds.has(tema.id));
    return [...mergedTemas, ...newTemas];
  };

  const readFileAsText = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => resolve(String(event.target?.result ?? ""));
      reader.onerror = () => reject(new Error(`Nao foi possivel ler o arquivo ${file.name}.`));
      reader.readAsText(file);
    });

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.multiple = true;
    input.onchange = async (e) => {
      const files = Array.from((e.target as HTMLInputElement).files ?? []);
      if (files.length === 0) return;

      let queueTemas = [...localTemas];
      let totalAdded = 0;
      let totalReplaced = 0;
      let successCount = 0;
      const failedFiles: string[] = [];

      for (const file of files) {
        try {
          const raw = await readFileAsText(file);
          const parsed = JSON.parse(raw);
          const importedTemas = normalizeTemasInput(Array.isArray(parsed) ? parsed : [parsed]);

          if (importedTemas.length === 0) {
            failedFiles.push(file.name);
            continue;
          }

          const existingIds = new Set(queueTemas.map((tema) => tema.id));
          const replacedCount = importedTemas.filter((tema) => existingIds.has(tema.id)).length;
          const addedCount = importedTemas.length - replacedCount;

          queueTemas = mergeTemasById(queueTemas, importedTemas);
          totalAdded += addedCount;
          totalReplaced += replacedCount;
          successCount += 1;
        } catch {
          failedFiles.push(file.name);
        }
      }

      if (successCount === 0) {
        toast({
          title: "Importacao interrompida",
          description: "Nenhum arquivo JSON valido foi importado.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await saveTemas(queueTemas);
      if (error) {
        toast({
          title: "Nao foi possivel salvar",
          description: error,
          variant: "destructive",
        });
        return;
      }

      const failedSuffix =
        failedFiles.length > 0 ? ` ${failedFiles.length} arquivo(s) foram ignorados.` : "";

      toast({
        title: "Importacao em lote concluida",
        description: `${successCount} arquivo(s) processado(s), ${totalAdded} tema(s) novo(s) e ${totalReplaced} atualizado(s) por ID.${failedSuffix}`,
      });
    };
    input.click();
  };

  const handleCopyTemplate = () => {
    navigator.clipboard.writeText(JSON.stringify([importTemplate], null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadTemplate = () => {
    const blob = new Blob([JSON.stringify([importTemplate], null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "modelo-importacao.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const templateJson = JSON.stringify([importTemplate], null, 2);

  const updateMissionScoringField = (field: keyof MissionScoringConfig, value: string) => {
    setMissionScoring((current) =>
      normalizeMissionScoringConfig({
        ...current,
        [field]: value,
      }),
    );
  };

  const handleResetMissionScoring = () => {
    setMissionScoring(DEFAULT_MISSION_SCORING);
  };

  const updateContentDisplayField = (value: string) => {
    setContentDisplay((current) =>
      normalizeContentDisplayConfig({
        ...current,
        maxExercisesPerTema: value,
      }),
    );
  };

  const handleSaveContentDisplay = async () => {
    setContentDisplaySaving(true);
    const normalizedConfig = normalizeContentDisplayConfig(contentDisplay);
    const { error } = await saveContentDisplayConfig(normalizedConfig);

    if (error) {
      toast({
        title: "Nao foi possivel salvar",
        description: "A configuracao de exibicao nao foi atualizada.",
        variant: "destructive",
      });
      setContentDisplaySaving(false);
      return;
    }

    setContentDisplay(normalizedConfig);
    setContentDisplaySaving(false);
    toast({
      title: "Exibicao atualizada",
      description: "A nova quantidade de exercicios ja vale para os alunos.",
    });
  };

  const handleSaveMissionScoring = async () => {
    setMissionScoringSaving(true);
    const normalizedConfig = normalizeMissionScoringConfig(missionScoring);
    const { error } = await saveMissionScoringConfig(normalizedConfig);

    if (error) {
      toast({
        title: "Nao foi possivel salvar",
        description: "A configuracao de pontuacao nao foi atualizada.",
        variant: "destructive",
      });
      setMissionScoringSaving(false);
      return;
    }

    setMissionScoring(normalizedConfig);
    setMissionScoringSaving(false);
    toast({
      title: "Pontuacao atualizada",
      description: "A regra da missao diaria ja esta valendo no sistema.",
    });
  };

  const handleDeleteTema = async (temaId: string) => {
    const tema = localTemas.find((entry) => entry.id === temaId);
    if (!tema) return;

    const shouldDelete = window.confirm(
      `Apagar o tema "${tema.titulo}"? Essa acao remove o conteudo salvo do sistema.`,
    );
    if (!shouldDelete) return;

    const nextTemas = localTemas.filter((entry) => entry.id !== temaId);
    const { error } = await saveTemas(nextTemas);

    if (error) {
      toast({
        title: "Nao foi possivel apagar",
        description: error,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Tema apagado",
      description: `"${tema.titulo}" foi removido do sistema.`,
    });
  };

  const handleDeleteAllTemas = async () => {
    if (localTemas.length === 0) return;

    const shouldDelete = window.confirm(
      `Apagar todos os ${localTemas.length} temas salvos? Essa acao nao pode ser desfeita pelo painel.`,
    );
    if (!shouldDelete) return;

    const { error } = await saveTemas([]);

    if (error) {
      toast({
        title: "Nao foi possivel apagar",
        description: error,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Conteudo removido",
      description: "Todos os temas foram apagados do sistema.",
    });
  };

  const tabs = [
    { key: "temas" as const, label: "Temas", icon: BookOpen },
    { key: "questoes" as const, label: "Questoes", icon: FileQuestion },
    { key: "modelo" as const, label: "Modelo", icon: FileJson },
    { key: "alunos" as const, label: "Alunos", icon: Users },
    { key: "fotos" as const, label: "Fotos", icon: ImageIcon },
  ];

  tabs.splice(4, 0, {
    key: "pontuacao" as const,
    label: "Pontuacao",
    icon: SlidersHorizontal,
  });

  const totalQuestions = localTemas.reduce(
    (sum, tema) => sum + tema.exercicios.length + tema.simulado.length,
    0,
  );
  const disciplinasComConteudo = new Set(localTemas.map((tema) => tema.disciplinaId)).size;
  const turmasComConteudo = new Set(localTemas.map((tema) => tema.turmaId)).size;
  const activeTabMeta = ADMIN_TAB_DETAILS[tab];
  const activeTabStyle = ADMIN_TAB_STYLES[tab];

  return (
    <Layout>
      <Breadcrumbs items={[{ label: "Admin" }]} />
      <section className="container mx-auto max-w-6xl px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative mb-8 overflow-hidden rounded-[2rem] border border-emerald-200/60 bg-gradient-to-br from-white via-emerald-50/70 to-sky-50/55 p-6 shadow-sm backdrop-blur"
        >
          <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-emerald-300/20 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-24 w-40 rounded-full bg-sky-300/20 blur-3xl" />

          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="relative z-10">
              <span className="inline-flex rounded-full bg-foreground px-3 py-1 text-[11px] font-heading font-semibold uppercase tracking-[0.18em] text-background">
                Centro de controle
              </span>
              <h1 className="mb-1 font-heading text-3xl font-bold text-foreground">Painel Admin</h1>
              <p className="max-w-2xl font-body text-sm text-muted-foreground">
                Organize conteudo, contas e configuracoes do sistema em um fluxo mais direto e com leitura mais clara.
              </p>
            </div>

            <div className="relative z-10 flex flex-wrap gap-2">
              <button
                onClick={() => setTab("modelo")}
                className="btn-tap flex items-center gap-2 rounded-xl border border-white/70 bg-white/80 px-4 py-2.5 font-body text-sm text-foreground shadow-sm transition-all hover:bg-white"
              >
                <FileJson className="h-3.5 w-3.5" />
                Modelo JSON
              </button>
              <button
                onClick={handleExport}
                disabled={studyContentLoading}
                className="btn-tap flex items-center gap-2 rounded-xl border border-white/70 bg-white/80 px-4 py-2.5 font-body text-sm text-foreground shadow-sm transition-all hover:bg-white disabled:opacity-60"
              >
                <Download className="h-3.5 w-3.5" />
                Exportar
              </button>
              <button
                onClick={handleImport}
                disabled={studyContentLoading || studyContentSaving}
                className="btn-tap flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 font-body text-sm text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20 disabled:opacity-60"
              >
                <Upload className="h-3.5 w-3.5" />
                {studyContentSaving ? "Salvando..." : "Importar"}
              </button>
            </div>
          </div>

          <div className="relative z-10 mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <AdminMetricCard label="Temas salvos" value={String(localTemas.length)} icon={BookOpen} tone="emerald" />
            <AdminMetricCard label="Questoes totais" value={String(totalQuestions)} icon={FileQuestion} tone="sky" />
            <AdminMetricCard label="Disciplinas ativas" value={String(disciplinasComConteudo)} icon={SlidersHorizontal} tone="amber" />
            <AdminMetricCard label="Turmas ativas" value={String(turmasComConteudo)} icon={Users} tone="violet" />
          </div>
        </motion.div>

        <div className="mb-6 rounded-[1.8rem] border border-border bg-card/80 p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="font-heading text-sm font-semibold text-foreground">Seções do painel</p>
              <p className="mt-1 font-body text-xs text-muted-foreground">
                Clique em uma aba para trocar a área administrativa.
              </p>
            </div>
            <span className="rounded-full bg-secondary px-3 py-1 text-[11px] font-heading font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Abas
            </span>
          </div>

          <div className="flex flex-wrap gap-2 rounded-2xl bg-secondary/55 p-2">
            {tabs.map((t) => {
              const TabIcon = t.icon;
              const tabStyle = ADMIN_TAB_STYLES[t.key];

              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`btn-tap relative min-w-0 basis-full rounded-2xl border px-4 py-3 text-left transition-all sm:min-w-[160px] sm:flex-1 sm:basis-auto ${
                    tab === t.key
                      ? `${tabStyle.border} bg-white shadow-sm`
                      : "border-transparent bg-transparent hover:border-border hover:bg-background/80"
                  }`}
                >
                  {tab === t.key && (
                    <div className="absolute inset-x-4 top-0 h-1 overflow-hidden rounded-b-full">
                      <div className={`h-full w-full bg-gradient-to-r ${tabStyle.line}`} />
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <div className={`inline-flex rounded-xl p-2 ${tab === t.key ? tabStyle.iconWrap : "bg-background text-muted-foreground"}`}>
                      <TabIcon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-heading text-sm font-semibold text-foreground">{t.label}</p>
                      <p className="truncate font-body text-xs text-muted-foreground">
                        {tab === t.key ? "Aba ativa" : ADMIN_TAB_DETAILS[t.key].title}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className={`relative overflow-hidden rounded-[2rem] border p-5 shadow-sm ${activeTabStyle.border} bg-gradient-to-br from-white via-white to-background`}>
          <div className="absolute -right-10 top-4 h-24 w-24 rounded-full bg-primary/5 blur-3xl" />
          <div className="relative z-10 mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="font-heading text-sm font-semibold text-foreground">Conteudo da aba</p>
              <p className="mt-1 font-body text-xs text-muted-foreground">
                Tudo abaixo pertence a secao selecionada no painel.
              </p>
            </div>
            <span className={`rounded-full px-3 py-1 text-[11px] font-heading font-semibold uppercase tracking-[0.16em] ${activeTabStyle.chip}`}>
              {tabs.find((entry) => entry.key === tab)?.label || "Aba"}
            </span>
          </div>

          <div className={`relative mb-6 overflow-hidden rounded-[1.8rem] border px-5 py-5 shadow-sm ${activeTabStyle.border} bg-gradient-to-br ${activeTabStyle.surface}`}>
            <div className="absolute inset-x-5 top-0 h-px overflow-hidden">
              <div className={`h-full w-32 bg-gradient-to-r ${activeTabStyle.line}`} />
            </div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-heading font-semibold uppercase tracking-[0.16em] ${activeTabStyle.chip}`}>
                  Area atual
                </span>
                <p className="mt-3 font-heading text-lg font-semibold text-foreground">{activeTabMeta.title}</p>
                <p className="mt-1 max-w-2xl font-body text-sm text-muted-foreground">{activeTabMeta.description}</p>
              </div>
              <div className={`hidden rounded-2xl p-3 lg:block ${activeTabStyle.iconWrap}`}>
                {(() => {
                  const ActiveIcon = tabs.find((entry) => entry.key === tab)?.icon || BookOpen;
                  return <ActiveIcon className="h-5 w-5" />;
                })()}
              </div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="relative z-10"
            >
              {tab === "temas" && (
                <TemasTab
                  localTemas={localTemas}
                  loading={studyContentLoading}
                  saving={studyContentSaving}
                  contentDisplay={contentDisplay}
                  contentDisplayLoading={contentDisplayLoading}
                  contentDisplaySaving={contentDisplaySaving}
                  onContentDisplayChange={updateContentDisplayField}
                  onContentDisplaySave={handleSaveContentDisplay}
                  onDeleteTema={handleDeleteTema}
                  onDeleteAllTemas={handleDeleteAllTemas}
                  onImport={handleImport}
                  onExport={handleExport}
                  onOpenModel={() => setTab("modelo")}
                />
              )}
              {tab === "questoes" && <QuestoesTab localTemas={localTemas} loading={studyContentLoading} />}
              {tab === "modelo" && (
                <ModeloTab
                  templateJson={templateJson}
                  copied={copied}
                  onCopy={handleCopyTemplate}
                  onDownload={handleDownloadTemplate}
                />
              )}
              {tab === "alunos" && <AlunosTab />}
              {tab === "pontuacao" && (
                <PontuacaoTab
                  missionScoring={missionScoring}
                  loading={missionScoringLoading}
                  saving={missionScoringSaving}
                  onChange={updateMissionScoringField}
                  onReset={handleResetMissionScoring}
                  onSave={handleSaveMissionScoring}
                />
              )}
              {tab === "fotos" && <FotosTab />}
            </motion.div>
          </AnimatePresence>
        </div>
      </section>
    </Layout>
  );
}

function AdminMetricCard({
  label,
  value,
  icon: Icon,
  tone = "emerald",
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: "emerald" | "sky" | "amber" | "violet" | "rose" | "cyan";
}) {
  const toneMap = {
    emerald: {
      surface: "bg-gradient-to-br from-emerald-50 to-white",
      border: "border-emerald-200/70",
      iconWrap: "bg-emerald-500/12 text-emerald-700",
      value: "text-emerald-950",
    },
    sky: {
      surface: "bg-gradient-to-br from-sky-50 to-white",
      border: "border-sky-200/70",
      iconWrap: "bg-sky-500/12 text-sky-700",
      value: "text-sky-950",
    },
    amber: {
      surface: "bg-gradient-to-br from-amber-50 to-white",
      border: "border-amber-200/70",
      iconWrap: "bg-amber-500/12 text-amber-700",
      value: "text-amber-950",
    },
    violet: {
      surface: "bg-gradient-to-br from-violet-50 to-white",
      border: "border-violet-200/70",
      iconWrap: "bg-violet-500/12 text-violet-700",
      value: "text-violet-950",
    },
    rose: {
      surface: "bg-gradient-to-br from-rose-50 to-white",
      border: "border-rose-200/70",
      iconWrap: "bg-rose-500/12 text-rose-700",
      value: "text-rose-950",
    },
    cyan: {
      surface: "bg-gradient-to-br from-cyan-50 to-white",
      border: "border-cyan-200/70",
      iconWrap: "bg-cyan-500/12 text-cyan-700",
      value: "text-cyan-950",
    },
  } as const;

  const style = toneMap[tone];

  return (
    <div className={`rounded-2xl border px-4 py-4 shadow-sm ${style.surface} ${style.border}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-body text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
          <p className={`mt-2 font-heading text-2xl font-semibold ${style.value}`}>{value}</p>
        </div>
        <div className={`rounded-xl p-2 ${style.iconWrap}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

function TemasTab({
  localTemas,
  loading,
  saving,
  contentDisplay,
  contentDisplayLoading,
  contentDisplaySaving,
  onContentDisplayChange,
  onContentDisplaySave,
  onDeleteTema,
  onDeleteAllTemas,
  onImport,
  onExport,
  onOpenModel,
}: {
  localTemas: Tema[];
  loading: boolean;
  saving: boolean;
  contentDisplay: ContentDisplayConfig;
  contentDisplayLoading: boolean;
  contentDisplaySaving: boolean;
  onContentDisplayChange: (value: string) => void;
  onContentDisplaySave: () => void;
  onDeleteTema: (temaId: string) => void;
  onDeleteAllTemas: () => void;
  onImport: () => void;
  onExport: () => void;
  onOpenModel: () => void;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [turmaFilter, setTurmaFilter] = useState("all");
  const [disciplinaFilter, setDisciplinaFilter] = useState("all");
  const [openDisciplineGroups, setOpenDisciplineGroups] = useState<Record<string, boolean>>({});

  const disciplinaOptions = useMemo(() => {
    return disciplinas.filter((disciplina) =>
      localTemas.some(
        (tema) =>
          tema.disciplinaId === disciplina.id &&
          (turmaFilter === "all" || tema.turmaId === turmaFilter),
      ),
    );
  }, [localTemas, turmaFilter]);

  const filteredTemas = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return localTemas.filter((tema) => {
      if (turmaFilter !== "all" && tema.turmaId !== turmaFilter) return false;
      if (disciplinaFilter !== "all" && tema.disciplinaId !== disciplinaFilter) return false;
      if (!query) return true;

      return [tema.titulo, tema.unidade, tema.id]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(query));
    });
  }, [disciplinaFilter, localTemas, searchTerm, turmaFilter]);

  const filteredExerciseCount = filteredTemas.reduce(
    (sum, tema) => sum + tema.exercicios.length,
    0,
  );
  const filteredSimuladoCount = filteredTemas.reduce(
    (sum, tema) => sum + tema.simulado.length,
    0,
  );
  const activeFilterChips = [
    turmaFilter !== "all" ? turmas.find((turma) => turma.id === turmaFilter)?.nome || turmaFilter : null,
    disciplinaFilter !== "all"
      ? disciplinas.find((disciplina) => disciplina.id === disciplinaFilter)?.nome || disciplinaFilter
      : null,
    searchTerm.trim() ? `Busca: ${searchTerm.trim()}` : null,
  ].filter(Boolean) as string[];

  const temaCardTones = [
    {
      surface: "from-emerald-500/10 via-emerald-100/40 to-white",
      rail: "bg-emerald-400",
      iconWrap: "bg-emerald-500/12 text-emerald-700",
      chip: "bg-emerald-500/10 text-emerald-700",
    },
    {
      surface: "from-sky-500/10 via-sky-100/40 to-white",
      rail: "bg-sky-400",
      iconWrap: "bg-sky-500/12 text-sky-700",
      chip: "bg-sky-500/10 text-sky-700",
    },
    {
      surface: "from-amber-500/10 via-amber-100/40 to-white",
      rail: "bg-amber-400",
      iconWrap: "bg-amber-500/12 text-amber-700",
      chip: "bg-amber-500/10 text-amber-700",
    },
  ] as const;

  const groupedTemas = useMemo(() => {
    return turmas
      .filter((turma) => filteredTemas.some((tema) => tema.turmaId === turma.id))
      .map((turma) => {
        const disciplineGroups = disciplinas
          .filter((disciplina) => disciplina.turmaId === turma.id)
          .map((disciplina) => {
            const temas = filteredTemas.filter(
              (tema) => tema.turmaId === turma.id && tema.disciplinaId === disciplina.id,
            );

            return {
              key: `${turma.id}:${disciplina.id}`,
              disciplina,
              temas,
              exercicios: temas.reduce((sum, tema) => sum + tema.exercicios.length, 0),
              simulados: temas.reduce((sum, tema) => sum + tema.simulado.length, 0),
            };
          })
          .filter((group) => group.temas.length > 0);

        return {
          turma,
          disciplineGroups,
          totalTemas: disciplineGroups.reduce((sum, group) => sum + group.temas.length, 0),
        };
      })
      .filter((group) => group.disciplineGroups.length > 0);
  }, [filteredTemas]);

  useEffect(() => {
    setOpenDisciplineGroups((current) => {
      const next = { ...current };
      const validKeys = new Set<string>();
      let changed = false;

      groupedTemas.forEach((turmaGroup) => {
        turmaGroup.disciplineGroups.forEach((disciplineGroup) => {
          validKeys.add(disciplineGroup.key);
          if (!(disciplineGroup.key in next)) {
            next[disciplineGroup.key] = true;
            changed = true;
          }
        });
      });

      Object.keys(next).forEach((key) => {
        if (!validKeys.has(key)) {
          delete next[key];
          changed = true;
        }
      });

      return changed ? next : current;
    });
  }, [groupedTemas]);

  const toggleDisciplineGroup = (key: string) => {
    setOpenDisciplineGroups((current) => ({
      ...current,
      [key]: !current[key],
    }));
  };

  const displayConfigCard = (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px_320px]">
      <div className="rounded-[1.7rem] border border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-white to-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-xl bg-emerald-500/12 p-2 text-emerald-700">
            <Upload className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <p className="font-heading text-lg font-semibold text-foreground">CRUD de temas</p>
            <p className="mt-1 font-body text-sm text-muted-foreground">
              Importe novos JSONs, exporte o conteudo atual e abra o modelo base sem sair da area de temas.
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={onImport}
            disabled={saving}
            className="btn-tap inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 font-heading text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-60"
          >
            <Upload className="h-4 w-4" />
            Importar JSON
          </button>
          <button
            onClick={onExport}
            disabled={saving}
            className="btn-tap inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 font-heading text-sm font-semibold text-foreground transition-all hover:bg-secondary disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            Exportar atual
          </button>
          <button
            onClick={onOpenModel}
            className="btn-tap inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 font-heading text-sm font-semibold text-foreground transition-all hover:bg-secondary"
          >
            <FileJson className="h-4 w-4" />
            Ver modelo
          </button>
        </div>
      </div>

      <div className="rounded-[1.7rem] border border-sky-200/70 bg-gradient-to-br from-sky-50 via-white to-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-heading text-lg font-semibold text-foreground">Exibicao dos exercicios</p>
            <p className="mt-1 font-body text-sm text-muted-foreground">
              Defina quantos exercicios cada tema mostra para o aluno.
            </p>
          </div>
          <div className="min-w-[220px] flex-1 sm:max-w-xs">
            {contentDisplayLoading ? (
              <div className="h-11 animate-pulse rounded-xl border border-border bg-background/70" />
            ) : (
              <div className="space-y-3">
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={contentDisplay.maxExercisesPerTema}
                  onChange={(event) => onContentDisplayChange(event.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 font-body text-sm text-foreground focus:border-primary focus:outline-none"
                />
                <button
                  onClick={onContentDisplaySave}
                  disabled={contentDisplaySaving}
                  className="btn-tap inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 font-heading text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  {contentDisplaySaving ? "Salvando..." : "Salvar exibicao"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-[1.7rem] border border-destructive/25 bg-gradient-to-br from-rose-50 via-white to-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-xl bg-destructive/10 p-2 text-destructive">
            <Trash2 className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <p className="font-heading text-lg font-semibold text-foreground">Limpar temas</p>
            <p className="mt-1 font-body text-sm text-muted-foreground">
              Remova um tema especifico pela lista abaixo ou apague todo o conteudo salvo de uma vez.
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-destructive/15 bg-background/70 px-4 py-3">
          <div>
            <p className="font-heading text-sm font-semibold text-foreground">
              {localTemas.length} tema(s) salvo(s)
            </p>
            <p className="font-body text-xs text-muted-foreground">
              Essa acao remove os temas do app e do painel.
            </p>
          </div>
          <button
            onClick={onDeleteAllTemas}
            disabled={saving || localTemas.length === 0}
            className="btn-tap inline-flex items-center gap-2 rounded-xl bg-destructive px-4 py-2.5 font-heading text-sm font-semibold text-destructive-foreground transition-all hover:bg-destructive/90 disabled:opacity-60"
          >
            <Trash2 className="h-4 w-4" />
            {saving ? "Apagando..." : "Apagar tudo"}
          </button>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-4">
        {displayConfigCard}
        <div className="h-48 animate-pulse rounded-3xl border border-border bg-card" />
      </div>
    );
  }

  if (localTemas.length === 0) {
    return (
      <div className="space-y-4">
        {displayConfigCard}
        <div className="rounded-2xl border border-dashed border-border bg-card/60 px-6 py-10 text-center">
          <p className="font-heading text-lg font-semibold text-foreground">Nenhum tema salvo</p>
          <p className="mt-2 font-body text-sm text-muted-foreground">
            Importe um arquivo JSON para publicar o conteudo no app.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard label="Temas filtrados" value={String(filteredTemas.length)} icon={BookOpen} tone="emerald" />
        <AdminMetricCard label="Exercicios" value={String(filteredExerciseCount)} icon={FileQuestion} tone="sky" />
        <AdminMetricCard label="Simulados" value={String(filteredSimuladoCount)} icon={CheckCircle} tone="amber" />
        <AdminMetricCard label="Limite por tema" value={String(contentDisplay.maxExercisesPerTema)} icon={Save} tone="violet" />
      </div>

      <div className="rounded-[1.8rem] border border-slate-200/80 bg-gradient-to-br from-slate-50/80 via-white to-white p-5 shadow-sm">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="font-heading text-lg font-semibold text-foreground">Temas organizados</p>
            <p className="mt-1 font-body text-sm text-muted-foreground">
              Agrupados por serie e disciplina para evitar excesso visual e facilitar a busca.
            </p>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-foreground px-3 py-1 text-[11px] font-heading font-semibold uppercase tracking-[0.16em] text-background">
            Filtros
          </span>
          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-body text-muted-foreground">
            Mostrando {filteredTemas.length} tema(s)
          </span>
          {activeFilterChips.map((chip) => (
            <span key={chip} className="rounded-full bg-primary/10 px-3 py-1 text-xs font-body text-primary">
              {chip}
            </span>
          ))}
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_220px_220px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar por titulo, unidade ou ID..."
              className="w-full rounded-xl border border-border bg-background py-3 pl-10 pr-4 font-body text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <select
            value={turmaFilter}
            onChange={(event) => {
              setTurmaFilter(event.target.value);
              setDisciplinaFilter("all");
            }}
            className="w-full rounded-xl border border-border bg-background px-4 py-3 font-body text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="all">Todas as turmas</option>
            {turmas
              .filter((turma) => localTemas.some((tema) => tema.turmaId === turma.id))
              .map((turma) => (
                <option key={turma.id} value={turma.id}>
                  {turma.nome}
                </option>
              ))}
          </select>

          <select
            value={disciplinaFilter}
            onChange={(event) => setDisciplinaFilter(event.target.value)}
            className="w-full rounded-xl border border-border bg-background px-4 py-3 font-body text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="all">Todas as disciplinas</option>
            {disciplinaOptions.map((disciplina) => (
              <option key={disciplina.id} value={disciplina.id}>
                {disciplina.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      {displayConfigCard}
      {filteredTemas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/60 px-6 py-10 text-center">
          <p className="font-heading text-lg font-semibold text-foreground">Nenhum tema encontrado</p>
          <p className="mt-2 font-body text-sm text-muted-foreground">
            Ajuste os filtros ou importe outro arquivo JSON para continuar.
          </p>
        </div>
      ) : (
        groupedTemas.map((turmaGroup) => (
          <div
            key={turmaGroup.turma.id}
            className="rounded-[1.8rem] border border-border bg-gradient-to-br from-white via-slate-50/45 to-white p-5 shadow-sm"
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-4">
              <div>
                <p className="font-heading text-xl font-semibold text-foreground">{turmaGroup.turma.nome}</p>
                <p className="mt-1 font-body text-sm text-muted-foreground">
                  {turmaGroup.totalTemas} tema(s) distribuidos em {turmaGroup.disciplineGroups.length} disciplina(s)
                </p>
              </div>
              <span className="rounded-full bg-secondary px-3 py-1 text-xs font-body text-muted-foreground">
                Serie agrupada
              </span>
            </div>

            <div className="space-y-4">
              {turmaGroup.disciplineGroups.map((disciplineGroup, groupIndex) => {
                const isOpen = openDisciplineGroups[disciplineGroup.key] ?? true;

                return (
                  <div
                    key={disciplineGroup.key}
                    className="rounded-[1.5rem] border border-border bg-card/70 p-4 shadow-sm"
                  >
                    <button
                      type="button"
                      onClick={() => toggleDisciplineGroup(disciplineGroup.key)}
                      className="btn-tap flex w-full items-center justify-between gap-4 rounded-2xl text-left"
                    >
                      <div>
                        <p className="font-heading text-base font-semibold text-foreground">
                          {disciplineGroup.disciplina.nome}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-body text-primary">
                            {disciplineGroup.temas.length} tema(s)
                          </span>
                          <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-body text-muted-foreground">
                            {disciplineGroup.exercicios} exercicios
                          </span>
                          <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-body text-muted-foreground">
                            {disciplineGroup.simulados} simulados
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="hidden rounded-full bg-secondary px-3 py-1 text-[11px] font-heading font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:inline-flex">
                          {isOpen ? "Ocultar" : "Expandir"}
                        </span>
                        <div className={`rounded-xl bg-secondary p-2 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}>
                          <ChevronDown className="h-4 w-4" />
                        </div>
                      </div>
                    </button>

                    {isOpen && (
                      <div className="mt-4 space-y-3 border-t border-border/70 pt-4">
                        {disciplineGroup.temas.map((tema, temaIndex) => {
                          const visibleExercises = Math.min(
                            tema.exercicios.length,
                            contentDisplay.maxExercisesPerTema,
                          );
                          const tone = temaCardTones[(groupIndex + temaIndex) % temaCardTones.length];

                          return (
                            <motion.div
                              key={tema.id}
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: temaIndex * 0.04 }}
                              className={`relative overflow-hidden rounded-[1.4rem] border border-border bg-gradient-to-br ${tone.surface} px-5 py-4 shadow-sm transition-shadow hover:shadow-md`}
                            >
                              <div className={`absolute left-0 top-5 h-16 w-1.5 rounded-r-full ${tone.rail}`} />
                              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                <div className="flex items-center gap-4">
                                  <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tone.iconWrap}`}>
                                    <BookOpen className="h-4 w-4" />
                                  </div>
                                  <div>
                                    <h3 className="font-heading font-semibold text-foreground">{tema.titulo}</h3>
                                    <div className="mt-1 flex flex-wrap items-center gap-2">
                                      <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-body text-muted-foreground">
                                        {turmaGroup.turma.nome}
                                      </span>
                                      <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-body text-muted-foreground">
                                        {disciplineGroup.disciplina.nome}
                                      </span>
                                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-body ${tone.chip}`}>
                                        {visibleExercises} exercicios visiveis
                                      </span>
                                      <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-body text-muted-foreground">
                                        {tema.simulado.length} simulados
                                      </span>
                                    </div>
                                    <p className="mt-2 font-mono text-xs text-muted-foreground">ID: {tema.id}</p>
                                  </div>
                                </div>

                                <button
                                  onClick={() => onDeleteTema(tema.id)}
                                  disabled={saving}
                                  className="btn-tap inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-xl border border-destructive/20 bg-white/85 px-3 py-2 text-sm font-body text-destructive shadow-sm transition-all hover:bg-destructive/5 disabled:opacity-60 md:self-center"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  {saving ? "Apagando..." : "Apagar tema"}
                                </button>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function QuestoesTab({ localTemas, loading }: { localTemas: Tema[]; loading: boolean }) {
  if (loading) {
    return <div className="h-48 animate-pulse rounded-3xl border border-border bg-card" />;
  }

  if (localTemas.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card/60 px-6 py-10 text-center">
        <p className="font-heading text-lg font-semibold text-foreground">Nenhuma questao salva</p>
        <p className="mt-2 font-body text-sm text-muted-foreground">
          As questoes vao aparecer aqui assim que o conteudo for importado.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {localTemas.flatMap((tema) =>
        tema.exercicios.map((q, i) => (
          <motion.div
            key={q.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03 }}
            className="flex items-center justify-between bg-card border border-border rounded-xl px-5 py-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-heading font-bold ${
                q.dificuldade === "facil" ? "bg-primary/10" : q.dificuldade === "medio" ? "bg-accent/10" : "bg-destructive/10"
              }`}>
                {q.dificuldade === "facil" ? "F" : q.dificuldade === "medio" ? "M" : "D"}
              </div>
              <div className="min-w-0">
                <p className="font-body text-sm text-foreground truncate">{q.enunciado}</p>
                <p className="text-xs text-muted-foreground font-body mt-0.5">
                  {tema.titulo} . {q.tipo === "multipla_escolha" ? "Multipla escolha" : "Resposta curta"} . {q.dificuldade}
                </p>
              </div>
            </div>
            <button className="btn-tap p-2.5 text-muted-foreground hover:text-destructive hover:bg-destructive/5 rounded-lg transition-all ml-2">
              <Trash2 className="h-4 w-4" />
            </button>
          </motion.div>
        ))
      )}
    </div>
  );
}

function ModeloTab({ templateJson, copied, onCopy, onDownload }: {
  templateJson: string; copied: boolean; onCopy: () => void; onDownload: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="bg-primary/5 border border-primary/15 rounded-xl p-5 flex gap-4">
        <Info className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-heading font-semibold text-foreground mb-1">Como importar conteudo</h3>
          <ol className="font-body text-sm text-muted-foreground space-y-1.5 list-decimal list-inside">
            <li>Copie ou baixe o modelo JSON abaixo</li>
            <li>Edite os campos com os dados do seu conteudo</li>
            <li>Para varios temas, adicione mais objetos ao array</li>
            <li>Use o botao <strong>"Importar"</strong> no topo para carregar o arquivo</li>
          </ol>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border bg-secondary/30">
          <h3 className="font-heading font-semibold text-foreground text-sm">Campos do modelo</h3>
        </div>
        <div className="divide-y divide-border">
          {[
            { campo: "id", desc: "Identificador unico do tema (sem espacos, minusculo)", exemplo: "\"fracoes\"" },
            { campo: "titulo", desc: "Titulo do tema exibido para o aluno", exemplo: "\"Fracoes\"" },
            { campo: "disciplinaId", desc: "ID da disciplina completa (ex: mat6, port6, cien7, hist8)", exemplo: "\"mat6\"" },
            { campo: "turmaId", desc: "ID da turma (ex: 6ano, 7ano, 8ano, 9ano)", exemplo: "\"6ano\"" },
            { campo: "unidade", desc: "Nome da unidade/capitulo (opcional)", exemplo: "\"Numeros e Operacoes\"" },
            { campo: "resumo", desc: "Lista de pontos-chave do tema", exemplo: "[\"Ponto 1\", \"Ponto 2\"]" },
            { campo: "explicacao", desc: "Blocos com subtitulo, texto e dica", exemplo: "Veja o modelo" },
            { campo: "exemplos", desc: "Exemplos resolvidos com enunciado, passos e resposta", exemplo: "Veja o modelo" },
            { campo: "exercicios", desc: "Questoes (multipla_escolha ou resposta_curta)", exemplo: "Veja o modelo" },
            { campo: "simulado", desc: "Questoes do mini simulado do tema", exemplo: "Veja o modelo" },
          ].map((item) => (
            <div key={item.campo} className="flex items-start gap-4 px-5 py-3">
              <code className="font-mono text-xs bg-secondary px-2 py-0.5 rounded text-primary flex-shrink-0 mt-0.5">
                {item.campo}
              </code>
              <div className="flex-1 min-w-0">
                <p className="font-body text-sm text-foreground">{item.desc}</p>
                <p className="font-mono text-xs text-muted-foreground mt-0.5">{item.exemplo}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <h4 className="font-heading font-semibold text-sm text-foreground mb-3">IDs de turmas</h4>
          <div className="space-y-1.5">
            {turmas.map((t) => (
              <div key={t.id} className="flex items-center gap-2">
                <code className="font-mono text-xs bg-secondary px-2 py-0.5 rounded text-primary">{t.id}</code>
                <span className="font-body text-sm text-muted-foreground">{t.nome}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <h4 className="font-heading font-semibold text-sm text-foreground mb-3">IDs de disciplinas (6o ano)</h4>
          <div className="space-y-1.5">
            {disciplinas.filter((d) => d.turmaId === "6ano").map((d) => (
              <div key={d.id} className="flex items-center gap-2">
                <code className="font-mono text-xs bg-secondary px-2 py-0.5 rounded text-primary">{d.id}</code>
                <span className="font-body text-sm text-muted-foreground">{d.nome}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-secondary/30 flex items-center justify-between">
          <h3 className="font-heading font-semibold text-foreground text-sm flex items-center gap-2">
            <FileJson className="h-4 w-4 text-primary" />
            Modelo JSON completo
          </h3>
          <div className="flex gap-2">
            <button onClick={onCopy} className="btn-tap flex items-center gap-1.5 text-xs font-body px-3 py-1.5 rounded-lg border border-border hover:bg-secondary transition-all">
              {copied ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
              {copied ? "Copiado!" : "Copiar"}
            </button>
            <button onClick={onDownload} className="btn-tap flex items-center gap-1.5 text-xs font-body px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all">
              <Download className="h-3 w-3" /> Baixar
            </button>
          </div>
        </div>
        <div className="p-5 overflow-x-auto">
          <pre className="font-mono text-xs text-foreground/80 leading-relaxed whitespace-pre">{templateJson}</pre>
        </div>
      </div>
    </div>
  );
}

function PontuacaoTab({
  missionScoring,
  loading,
  saving,
  onChange,
  onReset,
  onSave,
}: {
  missionScoring: MissionScoringConfig;
  loading: boolean;
  saving: boolean;
  onChange: (field: keyof MissionScoringConfig, value: string) => void;
  onReset: () => void;
  onSave: () => void;
}) {
  const scoringFields: Array<{
    key: keyof MissionScoringConfig;
    label: string;
    description: string;
  }> = [
    {
      key: "easyPoints",
      label: "Questao facil",
      description: "Pontuacao para cada acerto facil.",
    },
    {
      key: "mediumPoints",
      label: "Questao media",
      description: "Pontuacao para cada acerto medio.",
    },
    {
      key: "hardPoints",
      label: "Questao dificil",
      description: "Pontuacao para cada acerto dificil.",
    },
    {
      key: "fairPlayBonus",
      label: "Bonus fair play",
      description: "Bonus extra quando o aluno nao sai da aba durante a missao.",
    },
  ];

  if (loading) {
    return <div className="h-64 animate-pulse rounded-3xl border border-border bg-card" />;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <SlidersHorizontal className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-heading text-2xl font-bold text-foreground">Pontuacao da missao diaria</h3>
            <p className="mt-2 max-w-2xl font-body text-sm leading-relaxed text-muted-foreground">
              Inspirado em apps de estudo por XP: pontuacao por dificuldade, bonus por fair play e regra centralizada
              para o sistema inteiro.
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {scoringFields.map((field) => (
            <label key={field.key} className="rounded-2xl border border-border bg-background/70 p-4">
              <p className="font-heading text-base font-semibold text-foreground">{field.label}</p>
              <p className="mt-1 font-body text-sm text-muted-foreground">{field.description}</p>
              <input
                type="number"
                min="0"
                step="1"
                value={missionScoring[field.key]}
                onChange={(event) => onChange(field.key, event.target.value)}
                className="mt-4 w-full rounded-xl border border-border bg-card px-4 py-3 font-body text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </label>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={onSave}
            disabled={saving}
            className="btn-tap inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 font-heading text-sm font-bold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {saving ? "Salvando..." : "Salvar regra"}
          </button>
          <button
            onClick={onReset}
            disabled={saving}
            className="btn-tap inline-flex items-center gap-2 rounded-2xl border border-border px-5 py-3 font-heading text-sm font-semibold text-foreground transition-all hover:bg-secondary disabled:opacity-60"
          >
            <RefreshCcw className="h-4 w-4" />
            Restaurar padrao
          </button>
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
        <p className="font-heading text-lg font-bold text-foreground">Preview da regra</p>
        <p className="mt-2 font-body text-sm text-muted-foreground">
          Exemplo atual de pontuacao configurada no sistema.
        </p>

        <div className="mt-6 space-y-3">
          <PreviewRow
            label="Acerto facil"
            detail={`1 acerto facil soma ${missionScoring.easyPoints} ponto(s).`}
          />
          <PreviewRow
            label="Acerto medio"
            detail={`1 acerto medio soma ${missionScoring.mediumPoints} ponto(s).`}
          />
          <PreviewRow
            label="Acerto dificil"
            detail={`1 acerto dificil soma ${missionScoring.hardPoints} ponto(s).`}
          />
          <PreviewRow
            label="Fair play"
            detail={`Sem trocar de aba: +${missionScoring.fairPlayBonus} ponto(s).`}
          />
        </div>

        <div className="mt-6 rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <p className="font-heading text-sm font-semibold text-primary">Exemplo de missao</p>
          <p className="mt-2 font-body text-sm text-foreground">
            2 faceis + 1 media + 1 dificil + fair play =
            {" "}
            {missionScoring.easyPoints * 2 + missionScoring.mediumPoints + missionScoring.hardPoints + missionScoring.fairPlayBonus}
            {" "}
            pontos.
          </p>
        </div>
      </div>
    </div>
  );
}

function PreviewRow({ label, detail }: { label: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background/70 px-4 py-3">
      <p className="font-heading text-sm font-semibold text-foreground">{label}</p>
      <p className="mt-1 font-body text-sm text-muted-foreground">{detail}</p>
    </div>
  );
}

function CredentialDeliveryCard({
  credentials,
  title,
}: {
  credentials: ManagedCredential[];
  title: string;
}) {
  if (credentials.length === 0) return null;

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-heading text-sm font-semibold text-foreground">{title}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Anote e entregue estas senhas agora. Elas nao ficam salvas no painel.
          </p>
        </div>
        <CheckCircle className="h-4 w-4 flex-shrink-0 text-primary" />
      </div>

      <div className="mt-4 space-y-2">
        {credentials.map((credential) => (
          <div
            key={`${credential.user_id}-${credential.password}`}
            className="rounded-xl border border-border bg-background/80 px-4 py-3"
          >
            <p className="font-heading text-sm font-semibold text-foreground">{credential.nome}</p>
            <p className="mt-1 font-body text-xs text-muted-foreground">
              {credential.email} . {credential.turma_id || "Sem turma"}
            </p>
            {credential.login_identifier ? (
              <code className="mt-2 inline-block rounded-md border border-border bg-card px-2 py-1 font-mono text-xs text-foreground">
                Acesso: {credential.login_identifier}
              </code>
            ) : null}
            <code className="mt-2 inline-block rounded-md border border-border bg-card px-2 py-1 font-mono text-xs text-foreground">
              Senha: {credential.password}
            </code>
          </div>
        ))}
      </div>
    </div>
  );
}

function AlunosTab() {
  const [importMode, setImportMode] = useState(false);
  const [listMode, setListMode] = useState(false);
  const [csvData, setCsvData] = useState("");
  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState<{ success: number; errors: string[] } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [latestCredentials, setLatestCredentials] = useState<ManagedCredential[]>([]);
  const [usersList, setUsersList] = useState<AdminListedUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [turmaFilter, setTurmaFilter] = useState("todas");
  const [currentPage, setCurrentPage] = useState(1);
  const [adminError, setAdminError] = useState("");
  const [pendingPasswordResetUserId, setPendingPasswordResetUserId] = useState<string | null>(null);
  const [passwordResetValue, setPasswordResetValue] = useState("");
  const [autoGenerateResetPassword, setAutoGenerateResetPassword] = useState(true);
  const [pendingSensitiveAction, setPendingSensitiveAction] = useState<{
    type: AdminSensitiveAction;
    userId: string;
  } | null>(null);
  const [adminSecretInput, setAdminSecretInput] = useState("");
  const [submittingSensitiveAction, setSubmittingSensitiveAction] = useState(false);
  const [secretTapCount, setSecretTapCount] = useState(0);
  const [showSecretGrant, setShowSecretGrant] = useState(false);
  const [grantUserId, setGrantUserId] = useState("");
  const [grantAmount, setGrantAmount] = useState("30");
  const [grantingPoints, setGrantingPoints] = useState(false);
  const [turmaDrafts, setTurmaDrafts] = useState<Record<string, string>>({});
  const [savingTurmaUserId, setSavingTurmaUserId] = useState<string | null>(null);

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [turmaId, setTurmaId] = useState("6ano");
  const [selectedRole, setSelectedRole] = useState<"aluno" | "professor" | "coordenadora">("aluno");
  const [professorTurmas, setProfessorTurmas] = useState<string[]>(["6ano"]);
  const [professorAssignments, setProfessorAssignments] = useState<string[]>([]);
  const [senha, setSenha] = useState("");
  const getTurmaLabel = (turmaValue: string | null) =>
    turmas.find((turma) => turma.id === turmaValue)?.nome || turmaValue || "Sem turma";

  useEffect(() => {
    if (selectedRole !== "professor") return;

    const derivedTurmas = Array.from(
      new Set(
        professorAssignments
          .map((disciplinaId) => disciplinas.find((disciplina) => disciplina.id === disciplinaId)?.turmaId)
          .filter((turmaId): turmaId is string => Boolean(turmaId)),
      ),
    );

    if (derivedTurmas.length > 0) {
      setProfessorTurmas(derivedTurmas);
      setTurmaId((current) => (derivedTurmas.includes(current) ? current : derivedTurmas[0]));
    }
  }, [professorAssignments, selectedRole]);

  const createManagedAccount = async ({
    nome,
    email,
    password,
    turmaId,
    role,
    turmaIds,
    assignments,
  }: {
    nome: string;
    email: string;
    password: string;
    turmaId: string;
    role: "aluno" | "professor" | "coordenadora";
    turmaIds?: string[];
    assignments?: Array<{ turma_id: string; disciplina_id: string }>;
  }) => {
    return createManagedUser({
      nome,
      email: email.trim().toLowerCase(),
      password,
      turma_id: turmaId,
      role,
      turma_ids: turmaIds,
      assignments,
    });
  };

  const generatePassword = () => {
    const chars = "abcdefghijkmnpqrstuvwxyz23456789";
    const buffer = new Uint32Array(8);
    crypto.getRandomValues(buffer);
    let pw = "";
    for (let i = 0; i < 8; i++) pw += chars[buffer[i] % chars.length];
    setSenha(pw);
  };

  const generateManagedPassword = () => {
    const chars = "abcdefghijkmnpqrstuvwxyz23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
    const buffer = new Uint32Array(10);
    crypto.getRandomValues(buffer);
    let password = "";
    for (let i = 0; i < 10; i++) password += chars[buffer[i] % chars.length];
    return password;
  };

  const closePasswordResetDialog = () => {
    setPendingPasswordResetUserId(null);
    setPasswordResetValue("");
    setAutoGenerateResetPassword(true);
  };

  const closeSensitiveActionDialog = () => {
    setPendingSensitiveAction(null);
    setAdminSecretInput("");
    setSubmittingSensitiveAction(false);
  };

  const openResetPasswordDialog = (userId: string) => {
    setPendingPasswordResetUserId(userId);
    setAutoGenerateResetPassword(true);
    setPasswordResetValue(generateManagedPassword());
  };

  const openSensitiveActionDialog = (type: AdminSensitiveAction, userId: string) => {
    setPendingSensitiveAction({ type, userId });
    setAdminSecretInput("");
  };

  const handleAssignTurma = async (userId: string) => {
    const nextTurmaId = turmaDrafts[userId];
    if (!nextTurmaId) return;

    setSavingTurmaUserId(userId);
    setAdminError("");

    try {
      await assignManagedUserTurma(userId, nextTurmaId);

      setUsersList((prev) =>
        prev.map((userItem) =>
          userItem.user_id === userId ? { ...userItem, turma_id: nextTurmaId } : userItem,
        ),
      );
      await loadUsers();
    } catch (error) {
      setAdminError(error instanceof Error ? error.message : "Erro ao salvar turma.");
    } finally {
      setSavingTurmaUserId(null);
    }
  };

  const handleCreateSingle = async () => {
    if (!nome || !email || !senha) return;
    setCreating(true);
    setResult(null);
    setAdminError("");
    setLatestCredentials([]);
    try {
      const createdUser = await createManagedAccount({
        nome,
        email,
        password: senha,
        turmaId,
        role: selectedRole,
        turmaIds: selectedRole === "professor" ? Array.from(new Set(professorAssignments.map((disciplinaId) => disciplinas.find((item) => item.id === disciplinaId)?.turmaId).filter((value): value is string => Boolean(value)))) : undefined,
        assignments:
          selectedRole === "professor"
            ? professorAssignments.map((disciplinaId) => {
                const disciplina = disciplinas.find((item) => item.id === disciplinaId);
                return {
                  disciplina_id: disciplinaId,
                  turma_id: disciplina?.turmaId ?? turmaId,
                };
              })
            : undefined,
      });
      setResult({ success: 1, errors: [] });
      setLatestCredentials([createdUser.credential]);
      setNome("");
      setEmail("");
      setSenha("");
      setSelectedRole("aluno");
      setProfessorTurmas(["6ano"]);
      setProfessorAssignments([]);
    } catch (error) {
      setResult({ success: 0, errors: [error instanceof Error ? error.message : "Erro ao criar aluno."] });
    }
    setCreating(false);
  };

  const handleBatchImport = async () => {
    if (!csvData.trim()) return;
    setCreating(true);
    setResult(null);
    setAdminError("");
    setLatestCredentials([]);
    const lines = csvData.trim().split("\n").filter((l) => l.trim());
    const users = lines.map((line) => {
      const [pNome, pEmail, pTurma, pSenha] = line.split(",").map((s) => s.trim());
      return { nome: pNome, email: pEmail, turma_id: pTurma, password: pSenha || "" };
    });
    try {
      const resultData = await batchCreateManagedUsers(
        users.map((user) => ({
          nome: user.nome,
          email: user.email.trim().toLowerCase(),
          turma_id: user.turma_id || "6ano",
          password: user.password || undefined,
        }))
      );
      setResult(resultData);
      setLatestCredentials(resultData.credentials);
    } catch (error) {
      setResult({ success: 0, errors: [error instanceof Error ? error.message : "Erro ao importar alunos."] });
    }
    setCreating(false);
  };

  const loadUsers = async () => {
    setLoadingUsers(true);
    setAdminError("");
    try {
      const [
        { data: profilesData, error: profilesError },
        { data: rolesData, error: rolesError },
        { data: scoreData, error: scoreError },
        { data: linkedTurmasData },
        { data: assignmentsData },
        { data: activityResultsData },
        { data: attemptData },
      ] = await Promise.all([
      supabase
        .from("profiles")
        .select("user_id, nome, login_identifier, turma_id, avatar_url, created_at")
        .order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("student_scores").select("user_id, points, turma_id"),
      supabase.from("professor_turmas").select("user_id, turma_id"),
      supabase.from("professor_assignments").select("user_id, turma_id, disciplina_id"),
      supabase.from("activity_results").select("user_id, turma_id, created_at").order("created_at", { ascending: false }),
      supabase.from("mission_attempts").select("user_id, turma_id, created_at").order("created_at", { ascending: false }),
    ]);

      if (profilesError) throw profilesError;
      if (rolesError) throw rolesError;
      if (scoreError) throw scoreError;

      const roleMap = new Map(
        ((rolesData as Array<{ user_id: string; role: "admin" | "professor" | "coordenadora" | "aluno" }> | null) ?? []).map((entry) => [
          entry.user_id,
          entry.role,
        ]),
      );
      const scoreMap = new Map(
        ((scoreData as Array<{ user_id: string; points: number | null }> | null) ?? []).map((entry) => [
          entry.user_id,
          entry.points ?? 0,
        ]),
      );
      const scoreTurmaMap = new Map(
        ((scoreData as Array<{ user_id: string; turma_id: string | null }> | null) ?? []).map((entry) => [
          entry.user_id,
          entry.turma_id,
        ]),
      );
      const activityTurmaMap = new Map<string, string | null>();
      ((activityResultsData as Array<{ user_id: string; turma_id: string | null }> | null) ?? []).forEach((entry) => {
        if (!activityTurmaMap.has(entry.user_id) && entry.turma_id) {
          activityTurmaMap.set(entry.user_id, entry.turma_id);
        }
      });
      const attemptTurmaMap = new Map<string, string | null>();
      ((attemptData as Array<{ user_id: string; turma_id: string | null }> | null) ?? []).forEach((entry) => {
        if (!attemptTurmaMap.has(entry.user_id) && entry.turma_id) {
          attemptTurmaMap.set(entry.user_id, entry.turma_id);
        }
      });
      const linkedTurmaMap = new Map<string, string[]>();
      ((linkedTurmasData as Array<{ user_id: string; turma_id: string }> | null) ?? []).forEach((entry) => {
        const current = linkedTurmaMap.get(entry.user_id) ?? [];
        current.push(entry.turma_id);
        linkedTurmaMap.set(entry.user_id, current);
      });
      const assignmentsMap = new Map<string, Array<{ turma_id: string; disciplina_id: string }>>();
      ((assignmentsData as Array<{ user_id: string; turma_id: string; disciplina_id: string }> | null) ?? []).forEach((entry) => {
        const current = assignmentsMap.get(entry.user_id) ?? [];
        current.push({ turma_id: entry.turma_id, disciplina_id: entry.disciplina_id });
        assignmentsMap.set(entry.user_id, current);
      });

      const users: AdminListedUser[] = (
        (profilesData as Array<{
          user_id: string;
          nome: string;
          login_identifier?: string | null;
          turma_id: string | null;
          avatar_url: string | null;
          created_at: string;
        }> | null) ?? []
      ).map((profileItem) => ({
        user_id: profileItem.user_id,
        nome: profileItem.nome,
        email: "",
        turma_id:
          profileItem.turma_id ??
          scoreTurmaMap.get(profileItem.user_id) ??
          activityTurmaMap.get(profileItem.user_id) ??
          attemptTurmaMap.get(profileItem.user_id) ??
          null,
        login_identifier: profileItem.login_identifier ?? null,
        avatar_url: profileItem.avatar_url,
        created_at: profileItem.created_at,
        role: roleMap.get(profileItem.user_id) ?? "aluno",
        points: scoreMap.get(profileItem.user_id) ?? 0,
        linkedTurmas: linkedTurmaMap.get(profileItem.user_id) ?? [],
        assignments: assignmentsMap.get(profileItem.user_id) ?? [],
      }));

      setUsersList(users);
    } catch (error) {
      setAdminError(error instanceof Error ? error.message : "Erro ao carregar alunos.");
    }
    setLoadingUsers(false);
  };

  const handleResetPassword = async () => {
    if (!pendingPasswordResetUserId) return;
    setAdminError("");
    setLatestCredentials([]);
    try {
      const nextPassword = autoGenerateResetPassword ? undefined : passwordResetValue.trim();
      const resetResult = await resetManagedUserPassword(pendingPasswordResetUserId, nextPassword || undefined);
      const currentUser = usersList.find((userItem) => userItem.user_id === pendingPasswordResetUserId);
      if (currentUser) {
        setLatestCredentials([
          {
            user_id: currentUser.user_id,
            nome: currentUser.nome,
            email: currentUser.email,
            turma_id: currentUser.turma_id,
            login_identifier: currentUser.login_identifier ?? undefined,
            password: resetResult.password,
          },
        ]);
      }
      closePasswordResetDialog();
      await loadUsers();
    } catch (error) {
      setAdminError(error instanceof Error ? error.message : "Erro ao redefinir senha.");
    }
  };

  const handleSensitiveAction = async () => {
    if (!pendingSensitiveAction || !adminSecretInput.trim()) return;
    setAdminError("");
    setSubmittingSensitiveAction(true);
    try {
      if (pendingSensitiveAction.type === "delete") {
        await deleteManagedUser(pendingSensitiveAction.userId, adminSecretInput.trim());
        setUsersList((prev) => prev.filter((u) => u.user_id !== pendingSensitiveAction.userId));
      } else {
        const { error: resetError } = await supabase.rpc("admin_reset_student_progress", {
          p_user_id: pendingSensitiveAction.userId,
        });

        if (resetError) {
          await resetManagedUserProgress(
            pendingSensitiveAction.userId,
            adminSecretInput.trim(),
          );
        }
        toast({
          title: "Progresso zerado",
          description: "O histórico e a pontuação do aluno foram reiniciados.",
        });
        await loadUsers();
      }
      closeSensitiveActionDialog();
    } catch (error) {
      setAdminError(
        error instanceof Error
          ? error.message
          : pendingSensitiveAction.type === "delete"
            ? "Erro ao remover aluno."
            : "Erro ao zerar o progresso.",
      );
      setSubmittingSensitiveAction(false);
    }
  };

  const filteredUsers = usersList.filter((u) => {
    const matchesSearch =
      u.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.turma_id?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTurma = turmaFilter === "todas" || u.turma_id === turmaFilter;
    return matchesSearch && matchesTurma;
  });

  const usersPerPage = 8;
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / usersPerPage));
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * usersPerPage, currentPage * usersPerPage);

  const handleSecretGrant = async () => {
    if (!grantUserId || !grantAmount.trim()) return;
    const selectedUser = usersList.find((userItem) => userItem.user_id === grantUserId);
    const numericAmount = Number(grantAmount);

    if (!selectedUser || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      setAdminError("Informe um aluno e uma quantidade valida de Sinapses.");
      return;
    }

    setGrantingPoints(true);
    setAdminError("");

    const { data: existingScore, error: scoreLoadError } = await supabase
      .from("student_scores")
      .select("points, missions_completed, streak_days")
      .eq("user_id", selectedUser.user_id)
      .maybeSingle();

    if (scoreLoadError) {
      setGrantingPoints(false);
      setAdminError("Nao foi possivel carregar a pontuacao atual do aluno.");
      return;
    }

    const { error: grantError } = await supabase
      .from("student_scores")
      .upsert({
        user_id: selectedUser.user_id,
        turma_id: selectedUser.turma_id || "6ano",
        points: (existingScore?.points ?? 0) + Math.round(numericAmount),
        missions_completed: existingScore?.missions_completed ?? 0,
        streak_days: existingScore?.streak_days ?? 0,
      }, { onConflict: "user_id" });

    if (grantError) {
      setGrantingPoints(false);
      setAdminError("Nao foi possivel adicionar Sinapses ao aluno.");
      return;
    }

    toast({
      title: "Sinapses adicionadas",
      description: `${Math.round(numericAmount)} Sinapses enviadas para ${selectedUser.nome}.`,
    });
    setGrantingPoints(false);
    await loadUsers();
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground">
        Os alunos cadastrados aqui passam a usar conta real do sistema. Depois disso, o login funciona em guia anonima, outro navegador e outros dispositivos.
      </div>

      <CredentialDeliveryCard
        credentials={latestCredentials}
        title="Credenciais geradas nesta operacao"
      />

      {adminError && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {adminError}
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => { setImportMode(false); setListMode(false); setCurrentPage(1); }}
          className={`btn-tap px-4 py-2 rounded-xl font-body text-sm transition-all flex items-center gap-2 ${
            !importMode && !listMode ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          <UserPlus className="h-3.5 w-3.5" /> Cadastro Individual
        </button>
        <button
          onClick={() => { setImportMode(true); setListMode(false); setCurrentPage(1); }}
          className={`btn-tap px-4 py-2 rounded-xl font-body text-sm transition-all flex items-center gap-2 ${
            importMode && !listMode ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          <Upload className="h-3.5 w-3.5" /> Importacao em lote
        </button>
        <button
          onClick={() => { setListMode(true); setImportMode(false); setCurrentPage(1); loadUsers(); }}
          className={`btn-tap px-4 py-2 rounded-xl font-body text-sm transition-all flex items-center gap-2 ${
            listMode ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="h-3.5 w-3.5" /> Ver Alunos
        </button>
      </div>

      <AnimatePresence mode="wait">
        {listMode ? (
          <motion.div key="list" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <div className="bg-card border border-border rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3
                  className="font-heading font-semibold text-foreground flex items-center gap-2 cursor-pointer select-none"
                  onClick={() => {
                    const nextTapCount = secretTapCount + 1;
                    if (nextTapCount >= 5) {
                      setShowSecretGrant((prev) => !prev);
                      setSecretTapCount(0);
                    } else {
                      setSecretTapCount(nextTapCount);
                    }
                  }}
                >
                  Alunos cadastrados
                </h3>
                <button onClick={loadUsers} className="btn-tap text-xs font-body px-3 py-1.5 rounded-lg border border-border hover:bg-secondary transition-all">
                  Atualizar
                </button>
              </div>

              {showSecretGrant ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                    <div className="flex-1">
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Aluno secreto</label>
                      <select
                        value={grantUserId}
                        onChange={(e) => setGrantUserId(e.target.value)}
                        className="w-full rounded-xl border border-amber-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                      >
                        <option value="">Escolha um aluno</option>
                        {usersList.filter((userItem) => userItem.role !== "admin").map((userItem) => (
                          <option key={userItem.user_id} value={userItem.user_id}>
                            {userItem.nome} . {getTurmaLabel(userItem.turma_id)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="w-full lg:w-44">
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Sinapses</label>
                      <input
                        value={grantAmount}
                        onChange={(e) => setGrantAmount(e.target.value.replace(/[^0-9]/g, ""))}
                        className="w-full rounded-xl border border-amber-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                        inputMode="numeric"
                        placeholder="30"
                      />
                    </div>
                    <button
                      onClick={handleSecretGrant}
                      disabled={grantingPoints || !grantUserId || !grantAmount}
                      className="btn-tap rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-amber-600 disabled:opacity-50"
                    >
                      {grantingPoints ? "Enviando..." : "Dar Sinapses"}
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Buscar por nome, email ou turma..."
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-background font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={turmaFilter}
                  onChange={(e) => {
                    setTurmaFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="todas">Todas as turmas</option>
                  {turmas.map((turma) => (
                    <option key={turma.id} value={turma.id}>{turma.nome}</option>
                  ))}
                </select>
                <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">
                  {filteredUsers.length} aluno(s)
                </span>
              </div>

              {loadingUsers ? (
                <p className="text-center text-muted-foreground font-body py-8">Carregando...</p>
              ) : filteredUsers.length === 0 ? (
                <p className="text-center text-muted-foreground font-body py-8">Nenhum aluno encontrado.</p>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {paginatedUsers.map((u, i) => (
                    <motion.div
                      key={u.user_id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="flex items-center gap-3 bg-secondary/30 border border-border rounded-xl px-4 py-3"
                    >
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm flex-shrink-0">
                        {u.avatar_url ? (
                          <img src={u.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
                        ) : (
                          (u.nome || "A").trim().charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-heading font-semibold text-foreground text-sm truncate">{u.nome}</p>
                          {u.role === "admin" && <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-body">Admin</span>}
                          {u.role === "professor" && <span className="text-[10px] bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded-full font-body">Professor</span>}
                          {u.role === "coordenadora" && <span className="text-[10px] bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full font-body">Coordenadora</span>}
                        </div>
                        <p className="font-body text-xs text-muted-foreground truncate">
                          {u.email ? `${u.email} . ` : ""}
                          {getTurmaLabel(u.turma_id)}
                          {` . ${u.points} pts`}
                        </p>
                        {!u.turma_id ? (
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <select
                              value={turmaDrafts[u.user_id] ?? "7ano"}
                              onChange={(event) =>
                                setTurmaDrafts((prev) => ({
                                  ...prev,
                                  [u.user_id]: event.target.value,
                                }))
                              }
                              className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-900"
                            >
                              {turmas.map((turma) => (
                                <option key={turma.id} value={turma.id}>
                                  {turma.nome}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => void handleAssignTurma(u.user_id)}
                              disabled={savingTurmaUserId === u.user_id}
                              className="btn-tap rounded-lg border border-amber-300 bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-900 transition-all hover:bg-amber-200 disabled:opacity-60"
                            >
                              {savingTurmaUserId === u.user_id ? "Salvando..." : "Salvar turma"}
                            </button>
                          </div>
                        ) : null}
                        {u.role === "professor" && u.linkedTurmas && u.linkedTurmas.length > 0 ? (
                          <p className="mt-1 font-body text-xs text-muted-foreground">
                            Turmas vinculadas: {u.linkedTurmas.map((linkedTurmaId) => getTurmaLabel(linkedTurmaId)).join(", ")}
                          </p>
                        ) : null}
                        {u.role === "professor" && u.assignments && u.assignments.length > 0 ? (
                          <p className="mt-1 font-body text-xs text-muted-foreground">
                            Atribuicoes: {u.assignments.map((assignment) => {
                              const disciplina = disciplinas.find((item) => item.id === assignment.disciplina_id);
                              return `${disciplina?.nome ?? assignment.disciplina_id} - ${getTurmaLabel(assignment.turma_id)}`;
                            }).join(", ")}
                          </p>
                        ) : null}
                        <p className="mt-1 font-body text-xs text-muted-foreground">
                          Por seguranca, o painel nao armazena a senha atual. Se precisar, gere uma nova senha e entregue ao aluno.
                        </p>
                      </div>
                      <div className="flex flex-wrap justify-end gap-2 flex-shrink-0">
                        <button
                          onClick={() => openResetPasswordDialog(u.user_id)}
                          className="btn-tap inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-body text-muted-foreground transition-all hover:bg-primary/5 hover:text-primary"
                          title="Gerar nova senha"
                        >
                          <KeyRound className="h-3.5 w-3.5" />
                          <span>Nova senha</span>
                        </button>
                        {u.role !== "admin" && (
                          <>
                            <button
                              onClick={() => openSensitiveActionDialog("reset_progress", u.user_id)}
                              className="btn-tap inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 transition-all hover:bg-amber-100"
                              title="Zerar progresso"
                            >
                              <RefreshCcw className="h-3.5 w-3.5" />
                              <span>Zerar progresso</span>
                            </button>
                            <button
                              onClick={() => openSensitiveActionDialog("delete", u.user_id)}
                              className="btn-tap inline-flex items-center gap-2 rounded-lg border border-destructive/20 px-3 py-2 text-xs font-body text-destructive transition-all hover:bg-destructive/5"
                              title="Remover aluno"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>Remover</span>
                            </button>
                          </>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {filteredUsers.length > usersPerPage ? (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
                  <span className="text-xs text-muted-foreground">
                    Página {currentPage} de {totalPages}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                      disabled={currentPage === 1}
                      className="btn-tap rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-all hover:bg-secondary disabled:opacity-50"
                    >
                      Anterior
                    </button>
                    <button
                      onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                      disabled={currentPage === totalPages}
                      className="btn-tap rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-all hover:bg-secondary disabled:opacity-50"
                    >
                      Próxima
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </motion.div>
        ) : !importMode ? (
          <motion.div key="single" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <div className="bg-card border border-border rounded-xl p-6 space-y-4">
              <h3 className="font-heading font-semibold text-foreground flex items-center gap-2">
                Cadastrar conta
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-body text-sm text-muted-foreground mb-1 block">Nome completo</label>
                  <input
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Joao Silva"
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="font-body text-sm text-muted-foreground mb-1 block">Email</label>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="joao@escola.com"
                    type="email"
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="font-body text-sm text-muted-foreground mb-1 block">Perfil</label>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value as "aluno" | "professor" | "coordenadora")}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="aluno">Aluno</option>
                    <option value="professor">Professor</option>
                    <option value="coordenadora">Coordenadora</option>
                  </select>
                </div>
                {selectedRole !== "professor" ? (
                  <div>
                    <label className="font-body text-sm text-muted-foreground mb-1 block">Turma</label>
                    <select
                      value={turmaId}
                      onChange={(e) => setTurmaId(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-border bg-background font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      {turmas.map((t) => (
                        <option key={t.id} value={t.id}>{t.nome}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="font-body text-sm text-muted-foreground mb-1 block">Turmas atendidas</label>
                    <div className="min-h-[52px] rounded-xl border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
                      {professorTurmas.length > 0
                        ? professorTurmas.map((value) => getTurmaLabel(value)).join(", ")
                        : "Selecione as atribuicoes abaixo"}
                    </div>
                  </div>
                )}
                {selectedRole === "professor" ? (
                  <div className="sm:col-span-2">
                    <label className="font-body text-sm text-muted-foreground mb-2 block">Atribuicoes por disciplina</label>
                    <div className="space-y-3 rounded-xl border border-border bg-background p-4">
                      {turmas.map((turma) => {
                        const turmaDisciplinas = disciplinas.filter((disciplina) => disciplina.turmaId === turma.id);
                        return (
                          <div key={turma.id} className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                              {turma.nome}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {turmaDisciplinas.map((disciplina) => {
                                const active = professorAssignments.includes(disciplina.id);
                                return (
                                  <button
                                    key={disciplina.id}
                                    type="button"
                                    onClick={() =>
                                      setProfessorAssignments((current) =>
                                        current.includes(disciplina.id)
                                          ? current.filter((item) => item !== disciplina.id)
                                          : [...current, disciplina.id],
                                      )
                                    }
                                    className={`rounded-full border px-3 py-2 text-xs transition-all ${
                                      active
                                        ? "border-sky-300 bg-sky-50 text-sky-700"
                                        : "border-border bg-card text-muted-foreground"
                                    }`}
                                  >
                                    {disciplina.nome}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
                <div>
                  <label className="font-body text-sm text-muted-foreground mb-1 block">Senha</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        value={senha}
                        onChange={(e) => setSenha(e.target.value)}
                        type={showPassword ? "text" : "password"}
                        placeholder="Senha"
                        className="w-full px-4 py-3 rounded-xl border border-border bg-background font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 pr-10"
                      />
                      <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <button onClick={generatePassword} className="btn-tap px-3 py-2 rounded-xl border border-border text-xs font-body hover:bg-secondary transition-all whitespace-nowrap">
                      Gerar
                    </button>
                  </div>
                </div>
              </div>
              <button
                onClick={handleCreateSingle}
                disabled={
                  creating ||
                  !nome ||
                  !email ||
                  !senha ||
                  (selectedRole === "professor" && (professorTurmas.length === 0 || professorAssignments.length === 0))
                }
                className="btn-tap bg-primary text-primary-foreground font-heading font-semibold px-6 py-3 rounded-xl hover:bg-primary/90 transition-all text-sm disabled:opacity-50 flex items-center gap-2"
              >
                {creating ? "Criando..." : "Criar conta"}
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div key="batch" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <div className="bg-card border border-border rounded-xl p-6 space-y-4">
              <h3 className="font-heading font-semibold text-foreground flex items-center gap-2">
                Importacao em lote
              </h3>
              <div className="bg-primary/5 border border-primary/15 rounded-xl p-4">
                <p className="font-body text-sm text-muted-foreground">
                  Cole os dados no formato CSV: <code className="bg-secondary px-1.5 py-0.5 rounded text-primary font-mono text-xs">nome,email,turmaId,senha(opcional)</code>
                </p>
                <p className="font-body text-xs text-muted-foreground mt-1">
                  Exemplo: <code className="font-mono text-xs text-foreground/70">Joao Silva,joao@escola.com,6ano,minhasenha123</code>
                </p>
              </div>
              <textarea
                value={csvData}
                onChange={(e) => setCsvData(e.target.value)}
                placeholder={`Joao Silva,joao@escola.com,6ano,senha123\nMaria Santos,maria@escola.com,7ano,senha456`}
                rows={8}
                className="w-full px-4 py-3 rounded-xl border border-border bg-background font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
              <button
                onClick={handleBatchImport}
                disabled={creating || !csvData.trim()}
                className="btn-tap bg-primary text-primary-foreground font-heading font-semibold px-6 py-3 rounded-xl hover:bg-primary/90 transition-all text-sm disabled:opacity-50 flex items-center gap-2"
              >
                {creating ? "Importando..." : "Importar alunos"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {result && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-xl p-4 border ${
            result.errors.length === 0
              ? "bg-primary/5 border-primary/20"
              : "bg-accent/5 border-accent/20"
          }`}
        >
          <p className="font-body text-sm text-foreground flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-primary" />
            {result.success} aluno(s) criado(s) com sucesso!
          </p>
          {result.errors.length > 0 && (
            <div className="mt-2 space-y-1">
              {result.errors.map((err, i) => (
                <p key={i} className="font-body text-xs text-destructive flex items-center gap-1">
                  <XCircle className="h-3 w-3" /> {err}
                </p>
              ))}
            </div>
          )}
        </motion.div>
      )}

      <Dialog
        open={pendingPasswordResetUserId !== null}
        onOpenChange={(open) => {
          if (!open) closePasswordResetDialog();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerar nova senha</DialogTitle>
            <DialogDescription>
              Gere uma nova senha para o aluno e entregue a credencial em seguida. A senha não fica salva no painel.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={autoGenerateResetPassword}
                onChange={(event) => {
                  const checked = event.target.checked;
                  setAutoGenerateResetPassword(checked);
                  if (checked) setPasswordResetValue(generateManagedPassword());
                }}
              />
              Gerar senha automaticamente
            </label>

            <div>
              <label className="mb-1 block text-sm text-muted-foreground">
                {autoGenerateResetPassword ? "Senha gerada" : "Nova senha"}
              </label>
              <div className="flex gap-2">
                <input
                  value={passwordResetValue}
                  onChange={(event) => setPasswordResetValue(event.target.value)}
                  disabled={autoGenerateResetPassword}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-70"
                />
                <button
                  type="button"
                  onClick={() => setPasswordResetValue(generateManagedPassword())}
                  className="btn-tap rounded-xl border border-border px-3 py-2 text-xs hover:bg-secondary"
                >
                  Gerar
                </button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={closePasswordResetDialog}
              className="btn-tap rounded-xl border border-border px-4 py-2 text-sm hover:bg-secondary"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleResetPassword}
              disabled={!passwordResetValue.trim()}
              className="btn-tap rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              Confirmar
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={pendingSensitiveAction !== null}
        onOpenChange={(open) => {
          if (!open) closeSensitiveActionDialog();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pendingSensitiveAction?.type === "delete" ? "Remover aluno" : "Zerar progresso"}
            </DialogTitle>
            <DialogDescription>
              {pendingSensitiveAction?.type === "delete"
                ? "Essa ação remove a conta do aluno. Digite a chave administrativa para continuar."
                : "Essa ação apaga o progresso salvo do aluno. Digite a chave administrativa para continuar."}
            </DialogDescription>
          </DialogHeader>

          <div>
            <label className="mb-1 block text-sm text-muted-foreground">Chave administrativa</label>
            <input
              type="password"
              value={adminSecretInput}
              onChange={(event) => setAdminSecretInput(event.target.value)}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={closeSensitiveActionDialog}
              className="btn-tap rounded-xl border border-border px-4 py-2 text-sm hover:bg-secondary"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSensitiveAction}
              disabled={!adminSecretInput.trim() || submittingSensitiveAction}
              className="btn-tap rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {submittingSensitiveAction ? "Confirmando..." : "Confirmar"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FotosTab() {
  const [requests, setRequests] = useState<PhotoRequestWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("photo_change_requests")
        .select("*, profiles!photo_change_requests_user_id_fkey(nome, avatar_url)")
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      setRequests((data as PhotoRequestWithProfile[] | null) || []);
      setLoading(false);
    })();
  }, []);

  const handleApprove = async (req: PhotoRequestWithProfile) => {
    await supabase.from("profiles").update({ avatar_url: req.new_avatar_url }).eq("user_id", req.user_id);
    await supabase.from("photo_change_requests").update({ status: "approved", reviewed_at: new Date().toISOString() }).eq("id", req.id);
    setRequests((prev) => prev.filter((r) => r.id !== req.id));
  };

  const handleReject = async (req: PhotoRequestWithProfile) => {
    await supabase.from("photo_change_requests").update({ status: "rejected", reviewed_at: new Date().toISOString() }).eq("id", req.id);
    setRequests((prev) => prev.filter((r) => r.id !== req.id));
  };

  if (loading) {
    return (
      <div className="text-center py-12 text-muted-foreground font-body">
        Carregando solicitacoes...
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-12">
        <ImageIcon className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
        <p className="font-heading font-semibold text-foreground">Nenhuma solicitacao pendente</p>
        <p className="font-body text-sm text-muted-foreground mt-1">Todas as solicitacoes de troca de foto foram processadas.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((req, i) => (
        <motion.div
          key={req.id}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          className="flex items-center gap-4 bg-card border border-border rounded-xl px-5 py-4 shadow-sm"
        >
          <div className="flex gap-3 items-center">
            <div className="h-12 w-12 rounded-full overflow-hidden border-2 border-border">
              <img src={req.new_avatar_url} alt="Nova foto" className="h-full w-full object-cover" />
            </div>
            <div>
              <p className="font-heading font-semibold text-foreground text-sm">{req.profiles?.nome || "Aluno"}</p>
              <p className="font-body text-xs text-muted-foreground">Solicita troca de foto</p>
            </div>
          </div>
          <div className="ml-auto flex gap-2">
            <button
              onClick={() => handleApprove(req)}
              className="btn-tap flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/10 text-primary text-xs font-body hover:bg-primary/20 transition-all"
            >
              <CheckCircle className="h-3.5 w-3.5" /> Aprovar
            </button>
            <button
              onClick={() => handleReject(req)}
              className="btn-tap flex items-center gap-1.5 px-3 py-2 rounded-lg bg-destructive/10 text-destructive text-xs font-body hover:bg-destructive/20 transition-all"
            >
              <XCircle className="h-3.5 w-3.5" /> Rejeitar
            </button>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
