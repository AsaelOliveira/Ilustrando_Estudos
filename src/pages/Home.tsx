import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen, FileCheck, LayoutGrid } from "lucide-react";
import Layout from "@/components/Layout";

const publicHighlights = [
  {
    title: "Estude por Turma",
    description: "Entre na sua série, veja só o que faz sentido para você e siga por disciplinas e temas.",
    icon: LayoutGrid,
    accent: "from-primary/20 via-primary/5 to-transparent",
  },
  {
    title: "Resumos + Exercícios",
    description: "Cada tema combina revisão rápida, explicação clara e prática para fixar o conteúdo.",
    icon: BookOpen,
    accent: "from-accent/20 via-accent/5 to-transparent",
  },
  {
    title: "Modo Prova",
    description: "Quando quiser treinar com mais foco, entre no fluxo de simulados dentro da área privada.",
    icon: FileCheck,
    accent: "from-emerald-500/20 via-emerald-500/5 to-transparent",
  },
];

export default function Home() {
  return (
    <Layout>
      <section className="relative min-h-[95vh] overflow-hidden mesh-gradient grid-pattern">
        {/* Floating background shapes */}
        <motion.div
          animate={{ x: [0, 50, 0], y: [0, 30, 0] }}
          transition={{ duration: 20, repeat: Infinity }}
          className="absolute -right-20 -top-20 h-[500px] w-[500px] rounded-full bg-primary/10 blur-[100px]"
        />

        <div className="container relative mx-auto px-4 pb-12 pt-20 md:pt-32">
          {/* Asymmetrical Hero Section */}
          <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="inline-flex items-center gap-2 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-2 font-heading text-sm font-bold text-primary shadow-sm">
                <div className="h-2 w-2 animate-pulse rounded-full bg-accent" />
                Plataforma de Estudos
              </div>
              <h1 className="mt-8 font-heading text-6xl font-black leading-[0.9] tracking-tighter text-foreground md:text-8xl">
                O futuro do seu <br />
                <span className="italic text-primary">aprendizado.</span>
              </h1>
              <p className="mt-8 max-w-xl font-body text-xl font-medium leading-relaxed text-muted-foreground/90">
                Resumos manuais, desafios épicos e uma comunidade focada. Comece sua jornada agora e transforme seu
                jeito de estudar.
              </p>

              <div className="mt-10 flex flex-wrap gap-5">
                <Link
                  to="/login"
                  className="btn-tap group relative overflow-hidden rounded-[2rem] bg-primary px-10 py-5 font-heading text-xl font-black text-primary-foreground shadow-glow"
                >
                  <div className="pointer-events-none absolute inset-x-0 h-full w-1/3 animate-shine bg-white/20 blur-xl" />
                  Acessar Arena
                </Link>
                <div className="flex -space-x-3 overflow-hidden p-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="inline-block h-12 w-12 rounded-full border-4 border-background bg-secondary shadow-sm" />
                  ))}
                  <div className="flex h-12 items-center justify-center rounded-full border-4 border-background bg-primary/10 px-4 font-heading text-xs font-bold text-primary">
                    +500 alunos
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9, rotate: 5 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ delay: 0.3, duration: 1 }}
              className="relative hidden lg:block"
            >
              <div className="relative aspect-square overflow-hidden rounded-[4rem] border-8 border-background bg-primary/5 shadow-card">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20" />
                <div className="flex h-full items-center justify-center p-12">
                  <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-4">
                    <div className="rounded-[3rem] bg-white shadow-soft animate-float" />
                    <div className="rounded-[3rem] bg-accent/90 shadow-soft animate-float-delayed" />
                    <div className="rounded-[3rem] bg-primary/80 shadow-soft animate-float-delayed" />
                    <div className="rounded-[3rem] border-4 border-dashed border-primary/20" />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* New Asymmetrical Bento Grid */}
          <div className="mt-32">
            <h2 className="font-heading text-4xl font-black tracking-tight text-foreground md:text-5xl">Destaques</h2>
            <div className="mt-12 grid gap-6 md:grid-cols-4 md:grid-rows-2">
              {/* Feature 1 - Large */}
              <motion.div
                whileHover={{ y: -10 }}
                className="bento-card md:col-span-2 md:row-span-2 flex min-h-[400px] flex-col justify-end border-primary/10 bg-primary/5"
              >
                <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-[2.5rem] bg-primary text-primary-foreground shadow-glow">
                  <LayoutGrid className="h-10 w-10" />
                </div>
                <h3 className="font-heading text-4xl font-black text-foreground">{publicHighlights[0].title}</h3>
                <p className="mt-4 font-body text-lg font-medium leading-relaxed text-muted-foreground">
                  {publicHighlights[0].description}
                </p>
              </motion.div>

              {/* Feature 2 - Wide */}
              <motion.div
                whileHover={{ y: -8 }}
                className="bento-card md:col-span-2 flex items-center gap-6 border-accent/10 bg-accent/5"
              >
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-accent text-accent-foreground shadow-glow">
                  <BookOpen className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="font-heading text-2xl font-black text-foreground">{publicHighlights[1].title}</h3>
                  <p className="mt-2 font-body text-base text-muted-foreground">{publicHighlights[1].description}</p>
                </div>
              </motion.div>

              {/* Feature 3 - Standard */}
              <motion.div whileHover={{ x: 10 }} className="bento-card md:col-span-1 border-border/60 bg-background/50">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-primary">
                  <FileCheck className="h-6 w-6" />
                </div>
                <h3 className="font-heading text-xl font-bold text-foreground">{publicHighlights[2].title}</h3>
              </motion.div>

              {/* Brand CTA */}
              <motion.div
                whileHover={{ scale: 0.98 }}
                className="bento-card md:col-span-1 flex items-center justify-center border-2 border-dashed bg-transparent p-4 text-center"
              >
                <Link to="/login" className="flex flex-col items-center gap-2 font-heading text-lg font-bold text-primary">
                  Ver tudo
                  <ArrowRight className="h-6 w-6" />
                </Link>
              </motion.div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
