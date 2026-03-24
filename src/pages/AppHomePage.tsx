import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Clock3,
  FileCheck,
  Heart,
  Sparkles,
  Target,
  Trophy,
  Zap,
} from "lucide-react";
import Layout from "@/components/Layout";
import Breadcrumbs from "@/components/Breadcrumbs";
import { useAppAlerts } from "@/hooks/useAppAlerts";
import { useContentDisplayConfig } from "@/hooks/useContentDisplayConfig";
import { useAuth } from "@/hooks/useAuth";
import {
  getTemaByIdFromList,
  getTemasByDisciplinaFromList,
  useStudyContent,
} from "@/hooks/useStudyContent";
import { getDisciplina, getDisciplinasByTurma, getTurma, turmas } from "@/data/catalog";
import { getRecentStudy } from "@/lib/recent-study";

const competitionEnabled = true;

function formatVisitedAt(visitedAt: string) {
  const parsedDate = new Date(visitedAt);
  if (Number.isNaN(parsedDate.getTime())) return "agora";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsedDate);
}

export default function AppHomePage() {
  const { user, profile, role } = useAuth();
  const { missionAvailable, openDuelCount } = useAppAlerts();
  const { temas, loading } = useStudyContent();
  const { config: contentDisplayConfig, loading: contentDisplayLoading } = useContentDisplayConfig();
  const recentStudy = getRecentStudy();
  const firstName = getDashboardName(profile?.nome, user?.email, role);
  const activeTurma =
    role === "admin"
      ? turmas[0]
      : getTurma(profile?.turma_id || recentStudy?.turmaId || "6ano") || turmas[0];
  const activeDisciplinas = getDisciplinasByTurma(activeTurma.id);
  const fallbackDisciplina = activeDisciplinas[0] || null;
  const fallbackTema = fallbackDisciplina ? getTemasByDisciplinaFromList(temas, fallbackDisciplina.id)[0] || null : null;
  const recentTema = recentStudy ? getTemaByIdFromList(temas, recentStudy.temaId) || null : null;
  const recentDisciplina = recentStudy ? getDisciplina(recentStudy.disciplinaId) : null;
  const recentTurma = recentStudy ? getTurma(recentStudy.turmaId) : null;
  const shouldUseRecentStudy = Boolean(recentTema && recentDisciplina && recentTurma);
  const continueTema = (shouldUseRecentStudy ? recentTema : null) || fallbackTema || null;
  const continueDisciplina =
    (shouldUseRecentStudy ? recentDisciplina : null) ||
    (continueTema && getDisciplina(continueTema.disciplinaId)) ||
    fallbackDisciplina;
  const continueTurma =
    (shouldUseRecentStudy ? recentTurma : null) ||
    (continueTema && getTurma(continueTema.turmaId)) ||
    activeTurma;
  const continueHref =
    continueTema && continueDisciplina && continueTurma
      ? `/app/turmas/${continueTurma.id}/${continueDisciplina.id}/${continueTema.id}`
      : "/app/turmas";

  const quickActions = [
    {
      title: "Estudar",
      description: "Turmas, disciplinas e temas.",
      to: "/app/turmas",
      icon: BookOpen,
      tone: "bg-primary/10 text-primary",
    },
    {
      title: "Progresso",
      description: "Ver acertos, ritmo e evolução.",
      to: "/app/progresso",
      icon: BarChart3,
      tone: "bg-accent/10 text-accent",
    },
    {
      title: "Favoritos",
      description: "Abrir conteúdos salvos.",
      to: "/app/favoritos",
      icon: Heart,
      tone: "bg-rose-500/10 text-rose-500",
    },
    {
      title: "Modo Prova",
      description: "Treinar com foco de avaliação.",
      to: "/app/modo-prova",
      icon: FileCheck,
      tone: "bg-emerald-500/10 text-emerald-600",
    },
    competitionEnabled
      ? {
          title: "Competição",
          description: "Missão diária e ranking.",
          to: "/app/competicao",
          icon: Trophy,
          tone: "bg-amber-500/10 text-amber-600",
        }
      : null,
  ].filter(Boolean) as {
    title: string;
    description: string;
    to: string;
    icon: typeof BookOpen;
    tone: string;
  }[];

  const spotlightCards = [
    {
      title: "Missão diária",
      description: missionAvailable
        ? "Sua missão já está liberada e pronta para render pontos e Sinapses."
        : "A missão de hoje já foi concluída. Volte amanhã para manter o ritmo.",
      to: "/app/competicao",
      icon: Trophy,
      badge: missionAvailable ? "Disponível agora" : "Concluída hoje",
      tone: missionAvailable
        ? "from-emerald-500/18 via-primary/10 to-background border-primary/20"
        : "from-slate-200/45 via-background to-background border-border/60",
      cta: missionAvailable ? "Abrir missão" : "Ver competição",
    },
    {
      title: "Arena de duelos",
      description:
        openDuelCount > 0
          ? `Você tem ${openDuelCount} desafio${openDuelCount > 1 ? "s" : ""} esperando resposta agora.`
          : "Entre na arena, veja quem está online e responda no seu tempo.",
      to: "/app/duelo",
      icon: Zap,
      badge: openDuelCount > 0 ? `${openDuelCount} pendente${openDuelCount > 1 ? "s" : ""}` : "Sem fila agora",
      tone: openDuelCount > 0
        ? "from-amber-500/18 via-orange-400/10 to-background border-amber-300/30"
        : "from-sky-500/15 via-cyan-400/10 to-background border-sky-200/30",
      cta: openDuelCount > 0 ? "Responder agora" : "Entrar na arena",
    },
  ];

  const trailOfTheDay = continueTema
    ? [
        {
          title: "Revisar resumo",
          description: `Passe pelos pontos-chave de ${continueTema.titulo}.`,
          icon: Sparkles,
          badge: `${continueTema.resumo.length} pontos`,
          to: continueHref,
        },
        {
          title: "Treinar exercícios",
          description: `Resolva as atividades principais deste tema.`,
          icon: Target,
          badge: `${Math.min(continueTema.exercicios.length, contentDisplayConfig.maxExercisesPerTema)} exercícios`,
          to: continueHref,
        },
        {
          title: "Fechar em modo prova",
          description: `Finalize com uma rodada curta em ritmo de avaliação.`,
          icon: Zap,
          badge: `${continueTema.simulado.length} questões`,
          to: "/app/modo-prova",
        },
      ]
    : [
        {
          title: "Escolher uma disciplina",
          description: "Entre na sua turma para abrir a trilha inicial de estudos.",
          icon: BookOpen,
          badge: activeTurma.nome,
          to: "/app/turmas",
        },
      ];

  const focusItems = [
    { label: "Turma", value: activeTurma.nome },
    {
      label: "Disciplina",
      value: continueDisciplina?.nome || "Escolha uma disciplina",
    },
    {
      label: "Último acesso",
      value: recentStudy?.visitedAt ? formatVisitedAt(recentStudy.visitedAt) : "Primeiro acesso",
    },
  ];

  if (loading || contentDisplayLoading) {
    return (
      <Layout>
        <Breadcrumbs items={[{ label: "Dashboard" }]} />
        <section className="container mx-auto max-w-6xl px-4 py-12">
          <div className="rounded-[2rem] border border-border bg-card px-6 py-10 text-center shadow-card">
            <p className="font-heading text-xl font-bold text-foreground">Carregando conteudo...</p>
            <p className="mt-2 font-body text-sm text-muted-foreground">
              Estamos buscando os temas salvos para montar sua trilha.
            </p>
          </div>
        </section>
      </Layout>
    );
  }

  return (
    <Layout>
      <Breadcrumbs items={[{ label: "Dashboard" }]} />
      <section className="container mx-auto max-w-6xl px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-[2.5rem] border border-border/60 bg-card px-8 py-10 shadow-card sm:px-10 mesh-gradient grid-pattern"
        >
          <div className="relative grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-2.5 font-heading text-[13px] font-black uppercase tracking-widest text-primary shadow-sm">
                <Sparkles className="h-4 w-4 animate-pulse" />
                Espaço do Aluno
              </div>
              <h1 className="mt-8 max-w-2xl break-words font-heading text-5xl font-black leading-[0.9] text-foreground [overflow-wrap:anywhere] md:text-7xl lg:text-8xl">
                Olá, {firstName}. <br />
                Sua trilha <span className="text-primary italic">chama.</span>
              </h1>

              <div className="mt-12 grid gap-4 sm:grid-cols-3">
                {focusItems.map((item) => (
                  <div
                    key={item.label}
                    className="group rounded-[2rem] border border-border/30 bg-background/20 p-6 backdrop-blur-md transition-all hover:bg-background/40 hover:border-primary/20"
                  >
                    <p className="font-heading text-[10px] font-black uppercase tracking-[0.25em] text-primary/60">
                      {item.label}
                    </p>
                    <p className="mt-3 break-words font-body text-lg font-black text-foreground [overflow-wrap:anywhere]">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="group relative rounded-[3rem] border border-border/40 bg-background/40 p-1 backdrop-blur-xl transition-all hover:shadow-glow">
               <div className="rounded-[2.75rem] bg-card p-8">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-glow">
                    <Clock3 className="h-7 w-7" />
                  </div>
                  <div>
                    <p className="font-heading text-xs font-black uppercase tracking-[0.25em] text-primary/60">
                      Última Parada
                    </p>
                    <p className="font-body text-sm font-medium text-muted-foreground">
                      Continue de onde parou
                    </p>
                  </div>
                </div>

                <div className="mt-10">
                  <h2 className="font-heading text-3xl font-black text-foreground leading-none">
                    {continueTema?.titulo || "Escolha uma aula"}
                  </h2>
                  <p className="mt-4 font-body text-base font-medium text-muted-foreground">
                    {continueDisciplina && continueTurma
                      ? `${continueDisciplina.nome} • ${continueTurma.nome}`
                      : "Sua trilha aguarda seu primeiro passo."}
                  </p>
                  <Link
                    to={continueHref}
                    className="btn-tap group relative mt-10 flex items-center justify-center gap-3 overflow-hidden rounded-[2rem] bg-primary px-8 py-5 font-heading text-lg font-black text-primary-foreground shadow-glow transition-all"
                  >
                    <div className="absolute inset-x-0 h-full w-1/4 animate-shine bg-white/20 blur-md pointer-events-none" />
                    {continueTema ? "Estudar Agora" : "Começar Trilha"}
                    <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-12 grid gap-6 md:grid-cols-2"
        >
          {spotlightCards.map((card, index) => {
            const Icon = card.icon;

            return (
              <Link
                key={card.title}
                to={card.to}
                className={`group relative overflow-hidden rounded-[2.5rem] border bg-gradient-to-br p-8 shadow-card transition-all hover:-translate-y-2 hover:shadow-2xl ${card.tone}`}
              >
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                  className="flex items-start gap-6"
                >
                  <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-3xl bg-background/90 text-primary shadow-glow">
                    <Icon className="h-8 w-8" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="rounded-full bg-background/90 px-4 py-1.5 text-[10px] font-heading font-black uppercase tracking-[0.2em] text-primary">
                      {card.badge}
                    </span>
                    <h3 className="mt-4 font-heading text-3xl font-black text-foreground leading-tight">{card.title}</h3>
                    <p className="mt-3 font-body text-base font-medium leading-relaxed text-muted-foreground">{card.description}</p>
                    <div className="mt-6 flex items-center gap-2 text-sm font-heading font-black uppercase tracking-widest text-primary">
                      {card.cta}
                      <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-2" />
                    </div>
                  </div>
                </motion.div>
              </Link>
            );
          })}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14 }}
          className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]"
        >
          <div className="rounded-[1.75rem] border border-border bg-card p-6 shadow-card">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-heading text-lg font-bold text-foreground">Trilha do dia</p>
                <p className="mt-1 font-body text-sm text-muted-foreground">
                  Siga na ordem e finalize o essencial sem sobrecarga.
                </p>
              </div>
              <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-heading font-semibold text-primary">
                Passo a passo
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {trailOfTheDay.map((step, index) => {
                const Icon = step.icon;

                return (
                  <Link
                    key={step.title}
                    to={step.to}
                    className="group flex items-start gap-4 rounded-3xl border border-border bg-background/70 p-5 transition-all hover:border-primary/30 hover:bg-primary/5"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary font-heading text-sm font-bold text-primary-foreground">
                        {index + 1}
                      </span>
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-body text-primary">{step.badge}</span>
                      </div>
                      <p className="mt-2 font-heading text-xl font-semibold text-foreground">{step.title}</p>
                      <p className="mt-1 font-body text-sm leading-relaxed text-muted-foreground">{step.description}</p>
                    </div>
                    <ArrowRight className="mt-1 h-5 w-5 flex-shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-border bg-card p-6 shadow-card">
            <p className="font-heading text-lg font-bold text-foreground">Atalhos do app</p>
            <p className="mt-1 font-body text-sm text-muted-foreground">
              Abra rapidamente a área que você quer usar agora.
            </p>

            <div className="mt-6 space-y-3">
              {quickActions.map((action) => {
                const Icon = action.icon;

                return (
                  <Link
                    key={action.title}
                    to={action.to}
                    className="group flex items-center gap-4 rounded-3xl border border-border bg-background/75 p-4 transition-all hover:border-primary/30 hover:bg-primary/5"
                  >
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${action.tone}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-heading text-base font-semibold text-foreground">{action.title}</p>
                      <p className="mt-1 font-body text-sm text-muted-foreground">{action.description}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                  </Link>
                );
              })}
            </div>
          </div>
        </motion.div>
      </section>
    </Layout>
  );
}

function getDashboardName(
  nome: string | undefined,
  email: string | undefined,
  role: "admin" | "professor" | "aluno" | null,
) {
  const fallback = getRoleHeadline(role);
  const normalizedName = (nome || "").trim();

  if (normalizedName && !looksLikeEmail(normalizedName)) {
    const firstPart = normalizedName.split(" ").filter(Boolean)[0] || normalizedName;
    return firstPart.length > 18 ? `${firstPart.slice(0, 18)}...` : firstPart;
  }

  const source = (email || normalizedName).split("@")[0]?.trim();
  if (!source) {
    return fallback;
  }

  const formatted = source
    .replace(/[._-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())[0];

  if (!formatted || formatted.length > 18) {
    return fallback;
  }

  return formatted;
}

function getRoleHeadline(role: "admin" | "professor" | "coordenadora" | "aluno" | null) {
  if (role === "admin") {
    return "Administrador";
  }

  if (role === "coordenadora") {
    return "Coordenadora";
  }

  if (role === "professor") {
    return "Professor";
  }

  return "Aluno";
}

function looksLikeEmail(value: string) {
  return value.includes("@");
}
