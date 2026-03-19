import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Lock } from "lucide-react";
import Layout from "@/components/Layout";
import Breadcrumbs from "@/components/Breadcrumbs";
import { turmas } from "@/data/catalog";
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
  const visibleTurmas = user && !isAdmin && userTurma
    ? turmas.filter((turma) => turma.id === userTurma)
    : turmas;

  return (
    <Layout>
      <Breadcrumbs items={[{ label: "Turmas" }]} />
      <section className="container mx-auto px-4 py-12">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="mb-2 font-heading text-3xl font-extrabold text-foreground">
            {user ? "Sua Turma" : "Escolha sua turma"}
          </h1>
          <p className="mb-10 font-body text-muted-foreground">
            {user && !isAdmin
              ? "Acesse as disciplinas e conteudos da sua turma."
              : "Selecione o ano para ver as disciplinas disponiveis."}
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
        >
          {visibleTurmas.map((turma) => {
            const isLocked = user && !isAdmin && userTurma && turma.id !== userTurma;
            const gradient = turmaColors[turma.id] || "from-primary/20 to-primary/5";

            return (
              <motion.div key={turma.id} variants={item}>
                {isLocked ? (
                  <div className="group relative block cursor-not-allowed overflow-hidden rounded-2xl border border-border/50 bg-card/50 p-8 opacity-50 shadow-card">
                    <div className="absolute inset-0 z-20 flex items-center justify-center">
                      <div className="flex items-center gap-2 rounded-xl bg-card/90 px-4 py-2 text-sm font-body text-muted-foreground shadow-lg backdrop-blur-sm">
                        <Lock className="h-4 w-4" /> Turma bloqueada
                      </div>
                    </div>
                    <div className="relative z-10 blur-[2px]">
                      <div className="mb-4 flex items-center gap-3">
                        <span className="text-3xl">{turma.icone}</span>
                        <div className="font-heading text-5xl font-extrabold text-primary/40">{turma.ano}o</div>
                      </div>
                      <h2 className="font-heading text-xl font-bold text-foreground">{turma.nome}</h2>
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
