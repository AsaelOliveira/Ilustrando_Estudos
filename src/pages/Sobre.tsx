import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import Breadcrumbs from "@/components/Breadcrumbs";

export default function Sobre() {
  return (
    <Layout>
      <Breadcrumbs items={[{ label: "Sobre" }]} />
      <section className="container mx-auto max-w-[760px] px-4 py-12">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="mb-6 font-heading text-3xl font-bold text-foreground">Sobre o projeto</h1>

          <div className="space-y-6 font-body leading-relaxed text-foreground/85">
            <p>
              O <strong className="text-foreground">Ilustrando Estudos</strong> é um portal de estudos guiado
              desenvolvido para a escola Ilustrando o Aprender. A proposta é transformar conteúdos densos em
              uma jornada mais clara, organizada e leve para o aluno.
            </p>

            <p>
              A plataforma foi pensada para o Ensino Fundamental II, com foco inicial do{" "}
              <strong className="text-foreground">6º ao 9º ano</strong>, mantendo espaço para expansão
              futura conforme a escola crescer no projeto.
            </p>

            <h2 className="mt-8 font-heading text-xl font-semibold text-foreground">Como funciona</h2>
            <p>
              O conteúdo é organizado por{" "}
              <strong className="text-foreground">Turma → Disciplina → Tema</strong>. Cada tema reúne resumo,
              explicação detalhada, exemplos resolvidos, exercícios com gabarito comentado e mini simulados
              para reforço.
            </p>

            <h2 className="mt-8 font-heading text-xl font-semibold text-foreground">Competição e duelo</h2>
            <p>
              A plataforma combina rotina de estudo com elementos de engajamento. A{" "}
              <strong className="text-foreground">Competição</strong> trabalha com missões diárias, ranking por
              turma e progresso constante, enquanto o <strong className="text-foreground">Duelo</strong> ganha
              destaque como a arena de confronto entre colegas, com desafios públicos, privados e anônimos.
            </p>

            <p>
              O duelo foi pensado para trazer energia ao aprendizado sem tirar o foco do estudo: ele usa
              questões reais da plataforma, valoriza estratégia, tempo e precisão, e ajuda a manter os alunos
              mais envolvidos com os conteúdos.
            </p>

            <h2 className="mt-8 font-heading text-xl font-semibold text-foreground">Tecnologias</h2>
            <div className="rounded-2xl border border-border bg-card/70 p-5">
              <p className="mb-3">
                O projeto foi construído com uma base moderna para manter boa performance, manutenção simples e
                adaptação a diferentes telas.
              </p>
              <div className="flex flex-wrap gap-2 text-sm">
                {[
                  "React",
                  "Vite",
                  "TypeScript",
                  "Tailwind CSS",
                  "Framer Motion",
                  "Supabase",
                  "Cloudflare Pages",
                ].map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-primary/15 bg-primary/8 px-3 py-1 font-medium text-foreground"
                  >
                    {item}
                  </span>
                ))}
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Essa combinação permite um app rápido, responsivo, com deploy simples e custo controlado para o
                uso escolar.
              </p>
            </div>
          </div>
        </motion.div>
      </section>
    </Layout>
  );
}
