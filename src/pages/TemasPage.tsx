import { Link, Navigate, useParams } from "react-router-dom";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpen,
  ChevronRight,
  FileQuestion,
  GraduationCap,
  Layers3,
  Search,
  Sparkles,
  Target,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Layout from "@/components/Layout";
import Breadcrumbs from "@/components/Breadcrumbs";
import { useContentDisplayConfig } from "@/hooks/useContentDisplayConfig";
import { getTemasByDisciplinaFromList, useStudyContent } from "@/hooks/useStudyContent";
import { useAuth } from "@/hooks/useAuth";
import { canAccessTurma, getDisciplina, getTurma } from "@/data/catalog";
import { getDisciplineVisual } from "@/lib/discipline-visuals";

function formatCount(value: number, singular: string, plural: string) {
  return `${value} ${value === 1 ? singular : plural}`;
}

type TemaVariant = {
  icon: LucideIcon;
  frame: string;
  surface: string;
  chipTone: string;
};

const temaVariants: TemaVariant[] = [
  {
    icon: BookOpen,
    frame: "rounded-2xl",
    surface: "from-white/70 via-white/30 to-transparent",
    chipTone: "bg-white/70",
  },
  {
    icon: Layers3,
    frame: "rounded-[1.15rem]",
    surface: "from-white/55 via-white/20 to-transparent",
    chipTone: "bg-white/60",
  },
  {
    icon: Target,
    frame: "rounded-[1.4rem]",
    surface: "from-white/65 via-white/25 to-transparent",
    chipTone: "bg-white/75",
  },
];

export default function TemasPage() {
  const { turmaId, disciplinaId } = useParams<{ turmaId: string; disciplinaId: string }>();
  const { user, profile, role } = useAuth();
  const { temas, loading } = useStudyContent();
  const { config: contentDisplayConfig, loading: contentDisplayLoading } = useContentDisplayConfig();
  const turmaData = getTurma(turmaId || "");
  const discData = getDisciplina(disciplinaId || "");
  const allTemas = getTemasByDisciplinaFromList(temas, disciplinaId || "");
  const [search, setSearch] = useState("");
  const disciplineVisual = getDisciplineVisual(disciplinaId || "");
  const DisciplineIcon = disciplineVisual.icon;
  const userTurma = profile?.turma_id;
  const isAdmin = role === "admin";

  if (user && !isAdmin && userTurma && turmaId && !canAccessTurma(userTurma, turmaId)) {
    return <Navigate to="/app/turmas" replace />;
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return allTemas;
    const query = search.toLowerCase();

    return allTemas.filter(
      (tema) =>
        tema.titulo.toLowerCase().includes(query) ||
        tema.unidade?.toLowerCase().includes(query),
    );
  }, [allTemas, search]);

  if (loading || contentDisplayLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12 text-center text-muted-foreground">
          Carregando temas...
        </div>
      </Layout>
    );
  }

  if (!turmaData || !discData) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12 text-center text-muted-foreground">
          Não encontrado.
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Breadcrumbs
        items={[
          { label: "Turmas", href: "/app/turmas" },
          { label: turmaData.nome, href: `/app/turmas/${turmaId}` },
          { label: discData.nome },
        ]}
      />
      <section className="container mx-auto max-w-5xl px-4 py-12">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-5 inline-flex items-center gap-3 rounded-full border border-border bg-card/85 px-4 py-2 shadow-sm backdrop-blur">
            <span className={`inline-flex h-10 w-10 items-center justify-center rounded-full ${disciplineVisual.iconWrap}`}>
              <DisciplineIcon className="h-5 w-5" strokeWidth={2.2} />
            </span>
            <div>
              <p className="font-heading text-sm font-semibold text-foreground">{discData.nome}</p>
              <p className="font-body text-xs text-muted-foreground">Trilha com visual próprio para os temas</p>
            </div>
          </div>

          <h1 className="mb-2 font-heading text-3xl font-bold text-foreground">{discData.nome}</h1>
          <p className="mb-8 font-body text-muted-foreground">
            Selecione um tema para começar a estudar.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative mb-8"
        >
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar tema..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-2xl border border-border bg-card py-3.5 pl-11 pr-4 font-body text-sm text-foreground shadow-sm transition-all placeholder:text-muted-foreground focus:border-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </motion.div>

        <AnimatePresence mode="wait">
          {filtered.length === 0 ? (
            <motion.p
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-12 text-center font-body text-muted-foreground"
            >
              Nenhum tema encontrado.
            </motion.p>
          ) : (
            <motion.ul
              key="list"
              initial="hidden"
              animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07 } } }}
              className="grid grid-cols-1 gap-4 md:grid-cols-2"
            >
              {filtered.map((tema, index) => {
                const visibleExerciseCount = Math.min(
                  tema.exercicios.length,
                  contentDisplayConfig.maxExercisesPerTema,
                );
                const variant = temaVariants[index % temaVariants.length];
                const TemaIcon = variant.icon;

                return (
                  <motion.li
                    key={tema.id}
                    variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}
                    layout
                  >
                    <Link
                      to={`/app/turmas/${turmaId}/${disciplinaId}/${tema.id}`}
                      className={`card-glow group relative block overflow-hidden rounded-[1.6rem] border border-border bg-card p-5 shadow-card transition-all ${disciplineVisual.borderHover}`}
                    >
                      <div className={`absolute inset-0 bg-gradient-to-br ${disciplineVisual.surface} opacity-90`} />
                      <div className={`absolute inset-0 bg-gradient-to-tr ${variant.surface} opacity-90`} />
                      <div className="absolute inset-x-5 top-0 h-px overflow-hidden">
                        <div className={`h-full w-32 bg-gradient-to-r ${disciplineVisual.line}`} />
                      </div>

                      <div className="relative z-10 flex h-full flex-col">
                        <div className="mb-5 flex items-start justify-between gap-3">
                          <div className="flex items-start gap-4">
                            <div
                              className={`flex h-12 w-12 flex-shrink-0 items-center justify-center border border-white/50 bg-white/80 shadow-sm backdrop-blur ${variant.frame} ${disciplineVisual.iconWrap}`}
                            >
                              <TemaIcon className="h-5 w-5" strokeWidth={2.2} />
                            </div>
                            <div>
                              <h3 className="font-heading text-lg font-semibold text-foreground transition-colors group-hover:text-foreground">
                                {tema.titulo}
                              </h3>
                              {tema.unidade && (
                                <span
                                  className={`mt-2 inline-flex rounded-full px-3 py-1 text-[11px] font-heading font-semibold uppercase tracking-[0.15em] text-foreground/75 ${variant.chipTone}`}
                                >
                                  {tema.unidade}
                                </span>
                              )}
                            </div>
                          </div>

                          <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-heading font-semibold uppercase tracking-[0.15em] ${disciplineVisual.chip}`}>
                            <Sparkles className="h-3.5 w-3.5" />
                            Tema
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/55 bg-white/70 px-3 py-1.5 backdrop-blur">
                            <FileQuestion className="h-3.5 w-3.5" />
                            {formatCount(visibleExerciseCount, "exercício", "exercícios")}
                          </span>
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/55 bg-white/70 px-3 py-1.5 backdrop-blur">
                            <GraduationCap className="h-3.5 w-3.5" />
                            {formatCount(tema.simulado.length, "simulado", "simulados")}
                          </span>
                        </div>

                        <div className={`mt-5 flex items-center justify-between font-heading text-sm font-semibold ${disciplineVisual.accentText}`}>
                          <span>Explorar tema</span>
                          <span className="inline-flex items-center gap-1 transition-transform duration-300 group-hover:translate-x-1">
                            Começar
                            <ChevronRight className="h-4 w-4" />
                          </span>
                        </div>
                      </div>
                    </Link>
                  </motion.li>
                );
              })}
            </motion.ul>
          )}
        </AnimatePresence>
      </section>
    </Layout>
  );
}
