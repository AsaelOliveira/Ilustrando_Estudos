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
  Swords,
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

const stepAccents = [
  {
    number: "btn-3d-blue",
    iconBox: "bg-brand-blue/10 text-brand-blue",
    badge: "text-brand-blue",
    hover: "hover:border-brand-blue/50 hover:bg-brand-blue/5",
  },
  {
    number: "btn-3d-green",
    iconBox: "bg-brand-green/10 text-brand-green",
    badge: "text-brand-green",
    hover: "hover:border-brand-green/50 hover:bg-brand-green/5",
  },
  {
    number: "btn-3d-purple",
    iconBox: "bg-brand-purple/10 text-brand-purple",
    badge: "text-brand-purple",
    hover: "hover:border-brand-purple/50 hover:bg-brand-purple/5",
  },
];

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
      tile: "btn-3d-green",
    },
    {
      title: "Progresso",
      description: "Ver acertos, ritmo e evolução.",
      to: "/app/progresso",
      icon: BarChart3,
      tile: "btn-3d-blue",
    },
    {
      title: "Favoritos",
      description: "Abrir conteúdos salvos.",
      to: "/app/favoritos",
      icon: Heart,
      tile: "btn-3d-yellow",
    },
    {
      title: "Modo Prova",
      description: "Treinar com foco de avaliação.",
      to: "/app/modo-prova",
      icon: FileCheck,
      tile: "btn-3d-purple",
    },
    competitionEnabled
      ? {
          title: "Competição",
          description: "Missão diária e ranking.",
          to: "/app/competicao",
          icon: Trophy,
          tile: "btn-3d-orange",
        }
      : null,
    {
      title: "Duelo",
      description: "",
      to: "/app/duelo",
      icon: Swords,
      tile: "btn-3d-pink",
    },
  ].filter(Boolean) as {
    title: string;
    description: string;
    to: string;
    icon: typeof BookOpen;
    tile: string;
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
      iconAccent: missionAvailable ? "btn-3d-orange" : "btn-3d-blue",
      badgeClass: missionAvailable
        ? "bg-brand-orange/10 text-brand-orange"
        : "bg-muted text-muted-foreground",
      ctaClass: missionAvailable ? "text-brand-orange" : "text-brand-blue",
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
      iconAccent: openDuelCount > 0 ? "btn-3d-pink" : "btn-3d-blue",
      badgeClass:
        openDuelCount > 0
          ? "bg-brand-pink/10 text-brand-pink"
          : "bg-brand-blue/10 text-brand-blue",
      ctaClass: openDuelCount > 0 ? "text-brand-pink" : "text-brand-blue",
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
          <div className="card-flat px-6 py-10 text-center">
            <p className="font-heading text-xl font-bold text-foreground">Carregando conteúdo...</p>
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
      <section className="container mx-auto max-w-6xl px-3 py-6 sm:px-4 sm:py-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid gap-4 sm:gap-6 lg:grid-cols-[0.95fr_1.05fr]"
        >
          <div className="card-flat min-w-0 p-5 sm:p-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-blue/10 px-3 py-1.5 text-[11px] font-heading font-black uppercase tracking-[0.18em] text-brand-blue sm:px-4 sm:text-xs">
              <Sparkles className="h-4 w-4" />
              Espaço do Aluno
            </div>
            <h1 className="mt-4 break-words font-heading text-3xl font-black leading-[1.05] text-foreground [overflow-wrap:anywhere] sm:mt-6 sm:text-5xl lg:text-6xl">
              Olá, {firstName}. <br />
              Sua trilha <span className="text-gradient">chama.</span>
            </h1>

            <div className="mt-6 grid grid-cols-3 gap-2 sm:mt-8 sm:gap-3">
              {focusItems.map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border-2 border-border bg-muted/40 px-3 py-3 sm:px-4"
                >
                  <p className="font-heading text-[9px] font-black uppercase tracking-[0.18em] text-muted-foreground sm:text-[11px]">
                    {item.label}
                  </p>
                  <p className="mt-1 break-words font-body text-xs font-black text-foreground [overflow-wrap:anywhere] sm:text-base">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="card-flat relative min-w-0 overflow-hidden border-brand-blue p-5 sm:p-8">
            <div className="pointer-events-none absolute -right-14 -top-14 h-44 w-44 rounded-full bg-brand-blue/10" />
            <span className="btn-3d btn-3d-blue pointer-events-none inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[11px] font-heading font-black uppercase tracking-[0.18em]">
              <Clock3 className="h-3.5 w-3.5" />
              Continuar estudando
            </span>
            <h2 className="mt-4 break-words font-heading text-2xl font-black leading-tight text-foreground [overflow-wrap:anywhere] sm:text-3xl">
              {continueTema?.titulo || "Escolha uma aula"}
            </h2>
            <p className="mt-2 font-body text-sm font-semibold text-muted-foreground sm:text-base">
              {continueDisciplina && continueTurma
                ? `${continueDisciplina.nome} • ${continueTurma.nome}`
                : "Sua trilha aguarda seu primeiro passo."}
            </p>

            <Link
              to={continueHref}
              className="btn-3d btn-3d-green mt-6 flex items-center justify-center gap-2 rounded-2xl px-6 py-4 font-heading text-base font-black uppercase tracking-wider sm:text-lg"
            >
              {continueTema ? "Estudar Agora" : "Começar Trilha"}
              <ArrowRight className="h-5 w-5" />
            </Link>

            {continueTema ? (
              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-xl border-2 border-border bg-muted/40 px-3 py-1.5 text-xs font-bold text-muted-foreground">
                  Resumo <span className="font-black text-foreground">{continueTema.resumo.length} pontos</span>
                </span>
                <span className="rounded-xl border-2 border-border bg-muted/40 px-3 py-1.5 text-xs font-bold text-muted-foreground">
                  <span className="font-black text-foreground">
                    {Math.min(continueTema.exercicios.length, contentDisplayConfig.maxExercisesPerTema)}
                  </span>{" "}
                  exercícios
                </span>
                <span className="rounded-xl border-2 border-border bg-muted/40 px-3 py-1.5 text-xs font-bold text-muted-foreground">
                  Simulado <span className="font-black text-foreground">{continueTema.simulado.length} questões</span>
                </span>
              </div>
            ) : null}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="mt-8 sm:mt-10"
        >
          <div className="flex items-center gap-3 px-1">
            <h2 className="font-heading text-lg font-black text-foreground sm:text-xl">Atalhos do app</h2>
            <div className="h-[3px] flex-1 rounded-full bg-border" />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 sm:gap-4 lg:grid-cols-6">
            {quickActions.map((action) => {
              const Icon = action.icon;

              return (
                <Link
                  key={action.title}
                  to={action.to}
                  className={`btn-3d ${action.tile} flex min-h-[96px] flex-col items-center justify-center gap-2 rounded-3xl px-2 py-4 text-center sm:min-h-[120px] sm:px-3`}
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[hsl(var(--btn-3d-fg)/0.22)] sm:h-12 sm:w-12">
                    <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                  </span>
                  <span className="font-heading text-xs font-black leading-tight sm:text-sm">
                    {action.title}
                  </span>
                  {action.description ? (
                    <span className="hidden text-[11px] font-semibold leading-snug opacity-80 lg:block">
                      {action.description}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="mt-8 grid gap-4 sm:mt-10 md:grid-cols-2 md:gap-6"
        >
          {spotlightCards.map((card, index) => {
            const Icon = card.icon;

            return (
              <Link
                key={card.title}
                to={card.to}
                className="card-flat card-glow group p-5 sm:p-7"
              >
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                  className="flex items-start gap-4 sm:gap-5"
                >
                  <div
                    className={`btn-3d ${card.iconAccent} flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl sm:h-16 sm:w-16`}
                  >
                    <Icon className="h-7 w-7 sm:h-8 sm:w-8" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span
                      className={`inline-block rounded-full px-3 py-1 text-[10px] font-heading font-black uppercase tracking-[0.18em] ${card.badgeClass}`}
                    >
                      {card.badge}
                    </span>
                    <h3 className="mt-3 font-heading text-xl font-black leading-tight text-foreground sm:text-2xl">
                      {card.title}
                    </h3>
                    <p className="mt-2 font-body text-sm font-medium leading-relaxed text-muted-foreground sm:text-base">
                      {card.description}
                    </p>
                    <div
                      className={`mt-5 flex items-center gap-2 text-xs font-heading font-black uppercase tracking-widest sm:text-sm ${card.ctaClass}`}
                    >
                      {card.cta}
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1 sm:h-5 sm:w-5" />
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
          transition={{ delay: 0.16 }}
          className="mt-8 sm:mt-10"
        >
          <div className="card-flat p-5 sm:p-7">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-heading text-lg font-black text-foreground sm:text-xl">Trilha do dia</p>
                <p className="mt-1 font-body text-sm text-muted-foreground">
                  Siga na ordem e finalize o essencial sem sobrecarga.
                </p>
              </div>
              <div className="rounded-full bg-brand-green/10 px-3 py-1.5 text-[10px] font-heading font-black uppercase tracking-widest text-brand-green sm:text-xs">
                Passo a passo
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:gap-4 lg:grid-cols-3">
              {trailOfTheDay.map((step, index) => {
                const Icon = step.icon;
                const accent = stepAccents[index % stepAccents.length];

                return (
                  <Link
                    key={step.title}
                    to={step.to}
                    className={`group flex items-start gap-4 rounded-3xl border-2 border-border bg-background p-4 transition-colors sm:p-5 ${accent.hover}`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <span
                        className={`btn-3d ${accent.number} flex h-8 w-8 items-center justify-center rounded-full font-heading text-sm font-black`}
                      >
                        {index + 1}
                      </span>
                      <div
                        className={`flex h-11 w-11 items-center justify-center rounded-2xl sm:h-12 sm:w-12 ${accent.iconBox}`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className={`text-xs font-body font-bold ${accent.badge}`}>{step.badge}</span>
                      <p className="mt-1.5 font-heading text-base font-black text-foreground sm:text-lg">
                        {step.title}
                      </p>
                      <p className="mt-1 font-body text-sm leading-relaxed text-muted-foreground">
                        {step.description}
                      </p>
                    </div>
                    <ArrowRight className="mt-1 h-5 w-5 flex-shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" />
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
