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

const turmaColors: Record<string, string> = {
  "6ano": "from-primary/20 to-primary/5",
  "7ano": "from-accent/20 to-accent/5",
  "8ano": "from-success/20 to-success/5",
  "9ano": "from-primary-glow/20 to-primary-glow/5",
};

export default function Turmas() {
  const { user, profile, role } = useAuth();
  const userTurma = profile?.turma_id;
  const isAdmin = role === "admin";
  const unlockedTurmas = user && !isAdmin && userTurma
    ? getAccessibleTurmas(userTurma)
    : [];

  return (
    <Layout>
      <Breadcrumbs items={[{ label: "Turmas" }]} />
      <section className="container mx-auto px-4 py-12">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          {!user || isAdmin ? (
            <>
              <h1 className="mb-2 font-heading text-3xl font-extrabold text-foreground">
                Escolha sua turma
              </h1>
              <p className="mb-10 font-body text-muted-foreground">
                Selecione o ano para ver as disciplinas disponiveis.
              </p>
            </>
          ) : (
            <div className="mb-8" />
          )}
        </motion.div>

        {user && !isAdmin && userTurma && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 rounded-[1.75rem] border border-primary/15 bg-gradient-to-r from-primary/10 via-white to-primary/5 p-5 shadow-sm"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-[11px] font-heading font-semibold uppercase tracking-[0.16em] text-primary shadow-sm">
                  <Stars className="h-3.5 w-3.5" />
                  Trilha da sua jornada
                </p>
                <h2 className="mt-3 font-heading text-xl font-bold text-foreground">
                  Continue avancando serie por serie
                </h2>
                <p className="mt-1 max-w-2xl font-body text-sm text-muted-foreground">
                  Cada etapa mostra o que ja esta liberado e o que ainda vem pela frente na sua caminhada.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {turmas.map((turma, index) => {
                  const unlocked = canAccessTurma(userTurma, turma.id);
                  const current = userTurma === turma.id;

                  return (
                    <div key={turma.id} className="flex items-center gap-2">
                      <div
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-heading font-semibold ${
                          current
                            ? "border-primary/30 bg-primary/15 text-primary"
                            : unlocked
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-border bg-white/80 text-muted-foreground"
                        }`}
                      >
                        <span>{turma.icone}</span>
                        <span>{turma.nome}</span>
                        {!unlocked && <Lock className="h-3.5 w-3.5" />}
                      </div>
                      {index < turmas.length - 1 && (
                        <span className="text-muted-foreground/50">→</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
        >
          {turmas.map((turma) => {
            const isLocked = user && !isAdmin ? !userTurma || !canAccessTurma(userTurma, turma.id) : false;
            const gradient = turmaColors[turma.id] || "from-primary/20 to-primary/5";

            return (
              <motion.div key={turma.id} variants={item}>
                {isLocked ? (
                  <div className="group relative block overflow-hidden rounded-2xl border border-border/70 bg-card/85 p-8 shadow-card">
                    <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-40`} />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.65),_transparent_45%)]" />
                    <div className="absolute inset-0 z-20 flex items-center justify-center">
                      <div className="flex items-center gap-2 rounded-2xl border border-border bg-white/92 px-4 py-3 text-sm font-heading font-semibold text-foreground shadow-lg backdrop-blur">
                        <Lock className="h-4 w-4" />
                        Bloqueado por enquanto
                      </div>
                    </div>
                    <div className="relative z-10 blur-[2.5px] saturate-75">
                      <div className="mb-4 flex items-center gap-3">
                        <span className="text-3xl opacity-80">{turma.icone}</span>
                        <div className="font-heading text-5xl font-extrabold text-foreground/70">{turma.ano}o</div>
                      </div>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h2 className="font-heading text-xl font-bold text-foreground">{turma.nome}</h2>
                          <p className="mt-2 font-body text-sm text-muted-foreground">{turma.descricao}</p>
                        </div>
                        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-white/90 text-muted-foreground shadow-sm">
                          <Lock className="h-5 w-5" />
                        </span>
                      </div>

                      <div className="mt-5 rounded-2xl border border-dashed border-border bg-white/75 p-4 backdrop-blur">
                        <p className="inline-flex items-center gap-2 text-xs font-heading font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          <Sparkles className="h-3.5 w-3.5" />
                          Proxima etapa
                        </p>
                        <p className="mt-2 font-body text-sm leading-relaxed text-muted-foreground">
                          Continue sua jornada para desbloquear esta serie e descobrir novos desafios.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <Link
                    to={`/app/turmas/${turma.id}`}
                    className="card-glow group relative block overflow-hidden rounded-2xl border-2 border-border/50 bg-card p-8 shadow-card hover:border-primary/30"
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 transition-opacity duration-500 group-hover:opacity-100`} />
                    <div className="relative z-10">
                      <div className="mb-4 flex items-center gap-3">
                        <motion.span
                          className="text-3xl"
                          whileHover={{ scale: 1.2, rotate: 10 }}
                        >
                          {turma.icone}
                        </motion.span>
                        <div className="origin-left font-heading text-5xl font-extrabold text-gradient transition-transform duration-300 group-hover:scale-110">
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
