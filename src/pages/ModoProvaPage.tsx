import { FileCheck, ArrowRight, Timer, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import Breadcrumbs from "@/components/Breadcrumbs";

export default function ModoProvaPage() {
  return (
    <Layout>
      <Breadcrumbs items={[{ label: "Modo Prova" }]} />
      <section className="container mx-auto max-w-4xl px-4 py-12">
        <div className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
          <div className="rounded-3xl border border-border bg-card p-8 shadow-card">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <FileCheck className="h-7 w-7 text-primary" />
            </div>
            <h1 className="mt-6 font-heading text-3xl font-bold text-foreground">Modo prova</h1>
            <p className="mt-3 max-w-2xl font-body text-muted-foreground">
              Esta rota privada concentra a experiencia de treino focada em simulados. A arquitetura ja esta separada
              do restante da area publica e pronta para receber regras mais rigidas de tempo, bloqueio e tentativa.
            </p>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-border bg-background/70 p-5">
                <Timer className="h-5 w-5 text-accent" />
                <p className="mt-3 font-heading text-lg font-semibold text-foreground">Tempo controlado</p>
                <p className="mt-2 font-body text-sm text-muted-foreground">
                  Espaco reservado para provas com cronometro e encerramento automatico.
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-background/70 p-5">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <p className="mt-3 font-heading text-lg font-semibold text-foreground">Fluxo autenticado</p>
                <p className="mt-2 font-body text-sm text-muted-foreground">
                  O acesso depende de login e fica isolado da vitrine publica do projeto.
                </p>
              </div>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/app/turmas"
                className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 font-heading text-sm font-bold text-primary-foreground transition-all hover:bg-primary/90"
              >
                Abrir area de estudo
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/app/competicao"
                className="inline-flex items-center gap-2 rounded-2xl border border-border px-5 py-3 font-heading text-sm font-semibold text-foreground transition-all hover:bg-secondary"
              >
                Ir para competicao
              </Link>
            </div>
          </div>
          <div className="rounded-3xl border border-border bg-card p-8 shadow-card">
            <p className="font-heading text-lg font-semibold text-foreground">Proximos blocos</p>
            <ul className="mt-5 space-y-3 font-body text-sm text-muted-foreground">
              <li className="rounded-2xl border border-border bg-background/70 px-4 py-3">Lista de provas por turma</li>
              <li className="rounded-2xl border border-border bg-background/70 px-4 py-3">Historico de tentativas</li>
              <li className="rounded-2xl border border-border bg-background/70 px-4 py-3">Regras de liberacao por janela</li>
            </ul>
          </div>
        </div>
      </section>
    </Layout>
  );
}
