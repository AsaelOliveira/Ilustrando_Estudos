import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Lock, Sparkles, Stars } from "lucide-react";
import Layout from "@/components/Layout";
import Breadcrumbs from "@/components/Breadcrumbs";
import { canAccessTurma, getAccessibleTurmas, turmas } from "@/data/catalog";
import { useAuth } from "@/hooks/useAuth";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 24, scale: 0.95 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: "easeOut" as const } },
};

const turmaVisuals: Record<string, { bubble: string; accent: string }> = {
  "6ano": { bubble: "btn-3d btn-3d-blue", accent: "text-brand-blue-dark" },
  "7ano": { bubble: "btn-3d btn-3d-green", accent: "text-brand-green-dark" },
  "8ano": { bubble: "btn-3d btn-3d-purple", accent: "text-brand-purple-dark" },
  "9ano": { bubble: "btn-3d btn-3d-orange", accent: "text-brand-orange-dark" },
};

const defaultTurmaVisual = { bubble: "btn-3d", accent: "text-primary" };

export default function Turmas() {
  const { user, profile, role } = useAuth();
  const metadataTurma =
    user?.user_metadata && typeof user.user_metadata.turma_id === "string" ? user.user_metadata.turma_id : null;
  const userTurma = profile?.turma_id ?? metadataTurma;
  const isAdmin = role === "admin";
  const unlockedTurmas = user && !isAdmin && userTurma ? getAccessibleTurmas(userTurma) : [];

  return (
    <Layout>
      <Breadcrumbs items={[{ label: "Turmas" }]} />
      <section className="container mx-auto px-4 py-12">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          {!user || isAdmin ? (
            <>
              <h1 className="mb-2 font-heading text-3xl font-extrabold text-foreground">Escolha sua turma</h1>
              <p className="mb-10 font-body text-muted-foreground">Selecione o ano para ver as disciplinas disponíveis.</p>
            </>
          ) : (
            <div className="mb-8" />
          )}
        </motion.div>

        {user && !isAdmin && userTurma && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="card-flat mb-8 p-5 sm:p-6"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-heading font-semibold uppercase tracking-[0.16em] text-primary">
                  <Stars className="h-3.5 w-3.5" />
                  Trilha da sua jornada
                </p>
                <h2 className="mt-3 font-heading text-xl font-bold text-foreground">Continue avançando série por série</h2>
                <p className="mt-1 max-w-2xl font-body text-sm text-muted-foreground">
                  Cada etapa mostra o que já está liberado e o que ainda vem pela frente na sua caminhada.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {turmas.map((turma, index) => {
                  const unlocked = canAccessTurma(userTurma, turma.id);
                  const current = userTurma === turma.id;

                  return (
                    <div key={turma.id} className="flex items-center gap-2">
                      <div
                        className={`inline-flex items-center gap-2 rounded-full border-2 px-3 py-2 text-xs font-heading font-semibold ${
                          current
                            ? "border-primary/40 bg-primary/10 text-primary"
                            : unlocked
                              ? "border-success/40 bg-success/10 text-success"
                              : "border-border bg-muted text-muted-foreground"
                        }`}
                      >
                        <span>{turma.icone}</span>
                        <span>{turma.nome}</span>
                        {!unlocked && <Lock className="h-3.5 w-3.5" />}
                      </div>
                      {index < turmas.length - 1 && <span className="text-muted-foreground/50">→</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {turmas.map((turma) => {
            const isLocked = user && !isAdmin ? !userTurma || !canAccessTurma(userTurma, turma.id) : false;
            const visual = turmaVisuals[turma.id] || defaultTurmaVisual;

            return (
              <motion.div key={turma.id} variants={item}>
                {isLocked ? (
                  <div className="card-flat group relative block overflow-hidden p-6 sm:p-8">
                    <div className="absolute inset-0 z-20 flex items-center justify-center">
                      <div className="card-flat flex items-center gap-2 px-4 py-3 text-sm font-heading font-semibold">
                        <Lock className="h-4 w-4" />
                        Bloqueado por enquanto
                      </div>
                    </div>
                    <div className="relative z-10 blur-[2.5px] saturate-75">
                      <div className="mb-4 flex items-center gap-3">
                        <span className={`flex h-14 w-14 items-center justify-center rounded-2xl text-2xl ${visual.bubble}`}>
                          {turma.icone}
                        </span>
                        <div className={`font-heading text-5xl font-extrabold ${visual.accent}`}>{turma.ano}o</div>
                      </div>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h2 className="font-heading text-xl font-bold text-foreground">{turma.nome}</h2>
                          <p className="mt-2 font-body text-sm text-muted-foreground">{turma.descricao}</p>
                        </div>
                        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-border bg-muted text-muted-foreground">
                          <Lock className="h-5 w-5" />
                        </span>
                      </div>

                      <div className="mt-5 rounded-2xl border border-dashed border-border bg-background-soft p-4">
                        <p className="inline-flex items-center gap-2 text-xs font-heading font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          <Sparkles className="h-3.5 w-3.5" />
                          Próxima etapa
                        </p>
                        <p className="mt-2 font-body text-sm leading-relaxed text-muted-foreground">
                          Continue sua jornada para desbloquear esta série e descobrir novos desafios.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <Link
                    to={`/app/turmas/${turma.id}`}
                    className="card-flat card-glow group relative block p-6 sm:p-8"
                  >
                    <div className="mb-4 flex items-center gap-4">
                      <motion.span
                        whileHover={{ scale: 1.08, rotate: 6 }}
                        className={`flex h-14 w-14 items-center justify-center rounded-2xl text-2xl ${visual.bubble}`}
                      >
                        {turma.icone}
                      </motion.span>
                      <div className={`origin-left font-heading text-5xl font-extrabold transition-transform duration-300 group-hover:scale-110 ${visual.accent}`}>
                        {turma.ano}o
                      </div>
                    </div>
                    <h2 className="font-heading text-xl font-bold text-foreground">{turma.nome}</h2>
                    <p className="mt-2 font-body text-sm text-muted-foreground">{turma.descricao}</p>

                    {userTurma === turma.id && (
                      <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-body font-medium text-primary">
                        Sua turma
                      </span>
                    )}

                    <div className="mt-4 flex translate-x-[-8px] items-center gap-1 text-primary opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100">
                      <span className="font-heading text-sm font-semibold">Ver disciplinas</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </div>
                  </Link>
                )}
              </motion.div>
            );
          })}
        </motion.div>
      </section>
    </Layout>
  );
}
