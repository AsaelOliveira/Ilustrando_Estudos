import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen, FileCheck, LayoutGrid } from "lucide-react";
import Layout from "@/components/Layout";
import MascotMark from "@/components/MascotMark";

const publicHighlights = [
  {
    title: "Estude por Turma",
    description: "Entre na sua série, veja só o que faz sentido para você e siga por disciplinas e temas.",
    icon: LayoutGrid,
    iconClass: "bg-brand-green/15 text-brand-green",
    borderClass: "hover:border-brand-green/50",
  },
  {
    title: "Resumos + Exercícios",
    description: "Cada tema combina revisão rápida, explicação clara e prática para fixar o conteúdo.",
    icon: BookOpen,
    iconClass: "bg-brand-blue/15 text-brand-blue",
    borderClass: "hover:border-brand-blue/50",
  },
  {
    title: "Modo Prova",
    description: "Quando quiser treinar com mais foco, entre no fluxo de simulados dentro da área privada.",
    icon: FileCheck,
    iconClass: "bg-brand-purple/15 text-brand-purple",
    borderClass: "hover:border-brand-purple/50",
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
              <MascotMark sizeClassName="h-20 w-20" className="mb-6 lg:hidden" />
              <div className="inline-flex items-center gap-2 rounded-full border-2 border-primary/30 bg-primary/10 px-4 py-2 font-heading text-sm font-bold text-primary">
                <div className="h-2 w-2 animate-pulse rounded-full bg-accent" />
                Plataforma de Estudos
              </div>
              <h1 className="mt-8 font-heading text-5xl font-black leading-[0.95] tracking-tighter text-foreground sm:text-6xl md:text-8xl">
                O futuro do seu <br />
                <span className="text-gradient">aprendizado.</span>
              </h1>
              <p className="mt-8 max-w-xl font-body text-lg font-medium leading-relaxed text-muted-foreground sm:text-xl">
                Resumos manuais, desafios épicos e uma comunidade focada. Comece sua jornada agora e transforme seu
                jeito de estudar.
              </p>

              <div className="mt-10 flex flex-wrap items-center gap-5">
                <Link
                  to="/login"
                  className="btn-3d btn-3d-green rounded-2xl px-8 py-4 font-heading text-lg font-black uppercase tracking-wider sm:px-10 sm:py-5 sm:text-xl"
                >
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
              <div className="card-flat relative flex aspect-square items-center justify-center overflow-hidden">
                <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-brand-yellow/20" />
                <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-brand-blue/20" />
                <MascotMark sizeClassName="h-64 w-64" className="animate-float drop-shadow-md" />
              </div>
            </motion.div>
          </div>

          {/* New Asymmetrical Bento Grid */}
          <div className="mt-20 md:mt-32">
            <h2 className="font-heading text-3xl font-black tracking-tight text-foreground sm:text-4xl md:text-5xl">Destaques</h2>
            <div className="mt-12 grid gap-6 md:grid-cols-4 md:grid-rows-2">
              {/* Feature 1 - Large */}
              <motion.div
                whileHover={{ y: -10 }}
                className={`bento-card flex min-h-[280px] flex-col justify-end md:col-span-2 md:row-span-2 md:min-h-[400px] ${publicHighlights[0].borderClass}`}
              >
                <div className={`mb-8 flex h-20 w-20 items-center justify-center rounded-3xl ${publicHighlights[0].iconClass}`}>
                  <LayoutGrid className="h-10 w-10" />
                </div>
                <h3 className="font-heading text-3xl font-black text-foreground sm:text-4xl">{publicHighlights[0].title}</h3>
                <p className="mt-4 font-body text-lg font-medium leading-relaxed text-muted-foreground">
                  {publicHighlights[0].description}
                </p>
              </motion.div>

              {/* Feature 2 - Wide */}
              <motion.div
                whileHover={{ y: -8 }}
                className={`bento-card flex items-center gap-6 md:col-span-2 ${publicHighlights[1].borderClass}`}
              >
                <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl ${publicHighlights[1].iconClass}`}>
                  <BookOpen className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="font-heading text-2xl font-black text-foreground">{publicHighlights[1].title}</h3>
                  <p className="mt-2 font-body text-base text-muted-foreground">{publicHighlights[1].description}</p>
                </div>
              </motion.div>

              {/* Feature 3 - Standard */}
              <motion.div whileHover={{ x: 10 }} className={`bento-card md:col-span-1 ${publicHighlights[2].borderClass}`}>
                <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${publicHighlights[2].iconClass}`}>
                  <FileCheck className="h-6 w-6" />
                </div>
                <h3 className="font-heading text-xl font-bold text-foreground">{publicHighlights[2].title}</h3>
              </motion.div>

              {/* Brand CTA */}
              <motion.div
                whileHover={{ scale: 0.98 }}
                className="bento-card flex items-center justify-center border-2 border-dashed border-primary/40 bg-transparent p-4 text-center"
              >
                <Link to="/login" className="flex min-h-11 flex-col items-center justify-center gap-2 font-heading text-lg font-bold text-primary">
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
