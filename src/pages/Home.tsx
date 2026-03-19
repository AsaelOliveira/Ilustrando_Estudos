import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen, FileCheck, LayoutGrid, Zap } from "lucide-react";
import Layout from "@/components/Layout";

const publicHighlights = [
  {
    title: "Estude por Turma",
    description: "Entre na sua serie, veja so o que faz sentido para voce e siga por disciplinas e temas.",
    icon: LayoutGrid,
    accent: "from-primary/20 via-primary/5 to-transparent",
  },
  {
    title: "Resumos + Exercicios",
    description: "Cada tema combina revisao rapida, explicacao clara e pratica para fixar o conteudo.",
    icon: BookOpen,
    accent: "from-accent/20 via-accent/5 to-transparent",
  },
  {
    title: "Modo Prova",
    description: "Quando quiser treinar com mais foco, entre no fluxo de simulados dentro da area privada.",
    icon: FileCheck,
    accent: "from-emerald-500/20 via-emerald-500/5 to-transparent",
  },
];

export default function Home() {
  return (
    <Layout>
      <section className="relative overflow-hidden">
        <motion.div
          animate={{ y: [0, -14, 0] }}
          transition={{ duration: 4.2, repeat: Infinity }}
          className="pointer-events-none absolute left-[8%] top-20 hidden h-32 w-32 rounded-full bg-primary/12 blur-3xl sm:block"
        />
        <motion.div
          animate={{ y: [0, -16, 0] }}
          transition={{ duration: 5, repeat: Infinity, delay: 0.6 }}
          className="pointer-events-none absolute right-[8%] top-28 hidden h-40 w-40 rounded-full bg-accent/10 blur-3xl sm:block"
        />

        <div className="container mx-auto px-4 py-16 md:py-24">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="relative overflow-hidden rounded-[2rem] border border-border/60 bg-card px-6 py-10 shadow-card sm:px-10 lg:px-12 lg:py-14"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(110,193,147,0.22),transparent_33%),radial-gradient(circle_at_bottom_right,rgba(255,196,107,0.16),transparent_26%)]" />
            <div className="relative mx-auto max-w-4xl text-center">
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-5 py-2 font-body text-sm font-medium text-primary"
              >
                <Zap className="h-3.5 w-3.5" />
                Home publica, leve e pronta para o login
              </motion.div>

              <h1 className="mt-6 font-heading text-4xl font-extrabold leading-[1.05] tracking-tight text-foreground md:text-6xl lg:text-7xl">
                Um caminho claro para <span className="text-gradient">entrar, estudar e continuar.</span>
              </h1>
              <p className="mx-auto mt-6 max-w-2xl font-body text-lg leading-relaxed text-muted-foreground">
                A vitrine publica apresenta a plataforma sem carregar o conteudo de estudo. O acesso completo fica
                guardado para depois do login, com um fluxo mais rapido e organizado.
              </p>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-10"
              >
                <Link
                  to="/login"
                  className="btn-tap group inline-flex items-center gap-2 rounded-2xl bg-primary px-8 py-4 font-heading text-base font-bold text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-glow"
                >
                  Entrar
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45, duration: 0.8 }}
                className="mt-14 grid gap-5 text-left md:grid-cols-3"
              >
                {publicHighlights.map((highlight) => {
                  const Icon = highlight.icon;

                  return (
                    <motion.div
                      key={highlight.title}
                      whileHover={{ y: -6, scale: 1.01 }}
                      transition={{ type: "spring", stiffness: 280 }}
                      className="group relative overflow-hidden rounded-3xl border border-border/60 bg-background/85 p-6 shadow-soft"
                    >
                      <div
                        className={`absolute inset-0 bg-gradient-to-br ${highlight.accent} opacity-0 transition-opacity duration-300 group-hover:opacity-100`}
                      />
                      <div className="relative">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                          <Icon className="h-5 w-5" />
                        </div>
                        <p className="mt-5 font-heading text-xl font-bold text-foreground">{highlight.title}</p>
                        <p className="mt-2 font-body text-sm leading-relaxed text-muted-foreground">
                          {highlight.description}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
}
