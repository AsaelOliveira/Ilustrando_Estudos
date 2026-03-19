import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import Breadcrumbs from "@/components/Breadcrumbs";

export default function Sobre() {
  return (
    <Layout>
      <Breadcrumbs items={[{ label: "Sobre" }]} />
      <section className="container mx-auto px-4 py-12 max-w-[700px]">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-heading font-bold text-3xl text-foreground mb-6">Sobre o projeto</h1>
          <div className="space-y-6 font-body text-foreground/85 leading-relaxed">
            <p>
              O <strong className="text-foreground">Ilustrando Estudos</strong> é um portal de estudos guiado
              desenvolvido para a escola Ilustrando o Aprender. Nosso objetivo é oferecer um caminho claro e
              focado para o aprendizado, transformando conteúdo denso em etapas gerenciáveis.
            </p>
            <p>
              A plataforma é voltada inicialmente para alunos do Ensino Fundamental II (6º ao 9º ano),
              mas foi projetada para expandir para outras turmas e níveis.
            </p>

            <h2 className="font-heading font-semibold text-xl text-foreground mt-8">Como funciona</h2>
            <p>
              O conteúdo é organizado por <strong className="text-foreground">Turma → Disciplina → Tema</strong>.
              Cada tema contém resumo, explicação detalhada, exemplos resolvidos, exercícios com gabarito
              comentado e um mini simulado.
            </p>

            <h2 className="font-heading font-semibold text-xl text-foreground mt-8">Competição</h2>
            <p>
              O módulo de competição oferece missões diárias com timer, ranking por turma e interclasse,
              e etapas classificatórias para finais presenciais. É um recurso ativável que incentiva
              o engajamento sem poluir a experiência de estudo.
            </p>

            <h2 className="font-heading font-semibold text-xl text-foreground mt-8">Tecnologias</h2>
            <p>
              React + Vite + Tailwind CSS + TypeScript + Framer Motion. Projetado para ser rápido,
              responsivo e fácil de manter.
            </p>

            <h2 className="font-heading font-semibold text-xl text-foreground mt-8">Como rodar localmente</h2>
            <div className="bg-card border border-border rounded-xl p-5 font-mono text-sm">
              <p className="text-muted-foreground"># Clonar e instalar</p>
              <p>git clone [repositório]</p>
              <p>cd ilustrando-estudos</p>
              <p>npm install</p>
              <p className="mt-2 text-muted-foreground"># Rodar em desenvolvimento</p>
              <p>npm run dev</p>
              <p className="mt-2 text-muted-foreground"># Build para produção</p>
              <p>npm run build</p>
            </div>

            <h2 className="font-heading font-semibold text-xl text-foreground mt-8">Importar/Exportar conteúdo</h2>
            <p>
              No painel Admin, use os botões "Exportar" e "Importar" para salvar e restaurar
              todo o conteúdo em formato JSON. Útil para backups e migração de dados.
            </p>
          </div>
        </motion.div>
      </section>
    </Layout>
  );
}
