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

const temaIcons: LucideIcon[] = [BookOpen, Layers3, Target];

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
  const metadataTurma =
    user?.user_metadata && typeof user.user_metadata.turma_id === "string"
      ? user.user_metadata.turma_id
      : null;
  const userTurma = profile?.turma_id ?? metadataTurma;
  const isAdmin = role === "admin";

  const filtered = useMemo(() => {
    if (!search.trim()) return allTemas;
    const query = search.toLowerCase();

    return allTemas.filter(
      (tema) =>
        tema.titulo.toLowerCase().includes(query) ||
        tema.unidade?.toLowerCase().includes(query),
    );
  }, [allTemas, search]);

  if (user && !isAdmin && userTurma && turmaId && !canAccessTurma(userTurma, turmaId)) {
    return <Navigate to="/app/turmas" replace />;
  }

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
      <section className="container mx-auto max-w-3xl px-4 py-12">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="card-flat mb-5 inline-flex items-center gap-3 rounded-full px-4 py-2">
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
            className="w-full rounded-2xl border-2 border-border bg-card py-3.5 pl-11 pr-4 font-body text-sm text-foreground shadow-card transition-all placeholder:text-muted-foreground focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
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
              className="flex flex-col"
            >
              {filtered.map((tema, index) => {
                const visibleExerciseCount = Math.min(
                  tema.exercicios.length,
                  contentDisplayConfig.maxExercisesPerTema,
                );
                const TemaIcon = temaIcons[index % temaIcons.length];
                const isLast = index === filtered.length - 1;

                return (
                  <motion.li
                    key={tema.id}
                    variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}
                    layout
                    className="relative pb-6 pl-16 last:pb-0 sm:pl-20"
                  >
                    {!isLast && (
                      <span
                        aria-hidden
                        className="absolute bottom-0 left-6 top-14 border-l-2 border-dashed border-border sm:left-7 sm:top-16"
                      />
                    )}
                    <span
                      className={`absolute left-0 top-1 flex h-12 w-12 items-center justify-center rounded-full font-heading text-base font-extrabold sm:h-14 sm:w-14 sm:text-lg ${disciplineVisual.iconWrap}`}
                    >
                      {index + 1}
                    </span>

                    <Link
                      to={`/app/turmas/${turmaId}/${disciplinaId}/${tema.id}`}
                      className={`card-flat card-glow group block p-5 ${disciplineVisual.borderHover}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                            <TemaIcon className="h-5 w-5" strokeWidth={2.2} />
                          </span>
                          <div>
                            <h3 className="font-heading text-lg font-bold text-foreground">
                              {tema.titulo}
                            </h3>
                            {tema.unidade && (
                              <span className="mt-2 inline-flex rounded-full bg-secondary px-3 py-1 text-[11px] font-heading font-semibold uppercase tracking-[0.15em] text-secondary-foreground">
                                {tema.unidade}
                              </span>
                            )}
                          </div>
                        </div>

                        <span className={`hidden items-center gap-1 rounded-full px-3 py-1 text-[11px] font-heading font-semibold uppercase tracking-[0.15em] sm:inline-flex ${disciplineVisual.chip}`}>
                          <Sparkles className="h-3.5 w-3.5" />
                          Tema
                        </span>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background-soft px-3 py-1.5">
                          <FileQuestion className="h-3.5 w-3.5" />
                          {formatCount(visibleExerciseCount, "exercício", "exercícios")}
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background-soft px-3 py-1.5">
                          <GraduationCap className="h-3.5 w-3.5" />
                          {formatCount(tema.simulado.length, "simulado", "simulados")}
                        </span>
                      </div>

                      <div className={`mt-4 flex items-center justify-between font-heading text-sm font-semibold ${disciplineVisual.accentText}`}>
                        <span>Explorar tema</span>
                        <span className="inline-flex items-center gap-1 transition-transform duration-300 group-hover:translate-x-1">
                          Começar
                          <ChevronRight className="h-4 w-4" />
                        </span>
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
