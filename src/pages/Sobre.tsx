import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import Breadcrumbs from "@/components/Breadcrumbs";
import MascotMark from "@/components/MascotMark";

const techChipStyles = [
  "border-brand-green/40 bg-brand-green/10",
  "border-brand-blue/40 bg-brand-blue/10",
  "border-brand-yellow/50 bg-brand-yellow/15",
  "border-brand-purple/40 bg-brand-purple/10",
  "border-brand-pink/40 bg-brand-pink/10",
  "border-brand-orange/40 bg-brand-orange/10",
  "border-primary/30 bg-primary/10",
];

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-8 flex items-center gap-3 font-heading text-xl font-black text-foreground">
      {children}
      <span className="h-1 flex-1 rounded-full bg-border" />
    </h2>
  );
}

export default function Sobre() {
  return (
    <Layout>
      <Breadcrumbs items={[{ label: "Sobre" }]} />
      <section className="container mx-auto max-w-[760px] px-4 py-12">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card-flat p-6 sm:p-10">
          <div className="mb-6 flex items-center gap-4">
            <MascotMark sizeClassName="h-14 w-14 shrink-0" />
            <h1 className="font-heading text-3xl font-black text-foreground">Sobre o projeto</h1>
          </div>

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

            <SectionTitle>Como funciona</SectionTitle>
            <p>
              O conteúdo é organizado por{" "}
              <strong className="text-foreground">Turma → Disciplina → Tema</strong>. Cada tema reúne resumo,
              explicação detalhada, exemplos resolvidos, exercícios com gabarito comentado e mini simulados
              para reforço.
            </p>

            <SectionTitle>Competição e duelo</SectionTitle>
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

            <SectionTitle>Tecnologias</SectionTitle>
            <div className="mt-4 rounded-2xl border-2 border-border bg-muted/50 p-5">
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
                ].map((item, index) => (
                  <span
                    key={item}
                    className={`rounded-full border-2 px-3 py-1 font-bold text-foreground ${techChipStyles[index % techChipStyles.length]}`}
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
