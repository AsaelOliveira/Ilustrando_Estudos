import { Link, Navigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Layout from "@/components/Layout";
import Breadcrumbs from "@/components/Breadcrumbs";
import { canAccessTurma, getDisciplinasByTurma, getTurma } from "@/data/catalog";
import { getDisciplineVisual } from "@/lib/discipline-visuals";
import { useAuth } from "@/hooks/useAuth";

export default function Disciplinas() {
  const { turmaId } = useParams<{ turmaId: string }>();
  const { user, profile, role } = useAuth();
  const turmaData = getTurma(turmaId || "");
  const discs = getDisciplinasByTurma(turmaId || "");
  const metadataTurma =
    user?.user_metadata && typeof user.user_metadata.turma_id === "string"
      ? user.user_metadata.turma_id
      : null;
  const userTurma = profile?.turma_id ?? metadataTurma;
  const isAdmin = role === "admin";

  if (user && !isAdmin && userTurma && turmaId && !canAccessTurma(userTurma, turmaId)) {
    return <Navigate to="/app/turmas" replace />;
  }

  if (!turmaData) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12 text-center text-muted-foreground">
          Turma não encontrada.
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Breadcrumbs
        items={[
          { label: "Turmas", href: "/app/turmas" },
          { label: turmaData.nome },
        ]}
      />
      <section className="container mx-auto px-4 py-12">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="mb-2 font-heading text-3xl font-bold text-foreground">
            Disciplinas - {turmaData.nome}
          </h1>
          <p className="mb-10 font-body text-muted-foreground">
            Escolha a disciplina que deseja estudar.
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
          className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {discs.map((disciplina, index) => {
            const visual = getDisciplineVisual(disciplina.id);
            const Icon = visual.icon;

            return (
              <motion.div
                key={disciplina.id}
                variants={{
                  hidden: { opacity: 0, y: 20, scale: 0.95 },
                  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, delay: index * 0.02 } },
                }}
              >
                <Link
                  to={`/app/turmas/${turmaId}/${disciplina.id}`}
                  className={`card-flat card-glow group relative block p-6 sm:p-8 ${visual.borderHover}`}
                >
                  <div className="relative z-10">
                    <div className="mb-5 flex items-start justify-between gap-3">
                      <motion.div
                        whileHover={{ y: -4, rotate: -4 }}
                        transition={{ duration: 0.25 }}
                        className={`inline-flex h-16 w-16 items-center justify-center rounded-[1.35rem] ${visual.iconWrap}`}
                      >
                        <Icon className="h-7 w-7" strokeWidth={2.2} />
                      </motion.div>
                      <span className={`rounded-full px-3 py-1 text-[10px] font-heading font-semibold uppercase tracking-[0.18em] ${visual.chip}`}>
                        {visual.badge}
                      </span>
                    </div>

                    <h2 className="max-w-xs font-heading text-2xl font-bold text-foreground">
                      {disciplina.nome}
                    </h2>
                    <p className="mt-2 max-w-sm font-body text-sm leading-relaxed text-muted-foreground">
                      Acesse a trilha da matéria com identidade visual própria e foco na sua turma.
                    </p>

                    <div className="mt-6 flex items-center justify-between gap-4">
                      <span className={`rounded-full px-3 py-1 text-[11px] font-heading font-semibold uppercase tracking-[0.16em] ${visual.chip}`}>
                        Conteúdo organizado
                      </span>
                      <div className={`flex items-center gap-2 font-heading text-sm font-semibold ${visual.accentText}`}>
                        <span>Ver temas</span>
                        <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      </section>
    </Layout>
  );
}
