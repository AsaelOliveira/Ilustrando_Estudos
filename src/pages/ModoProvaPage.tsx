import { FileCheck, ArrowRight, Timer, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import Breadcrumbs from "@/components/Breadcrumbs";
import MascotMark from "@/components/MascotMark";

export default function ModoProvaPage() {
  return (
    <Layout>
      <Breadcrumbs items={[{ label: "Modo Prova" }]} />
      <section className="container mx-auto max-w-4xl px-4 py-12">
        <div className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
          <div className="card-flat p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-blue/15">
                <FileCheck className="h-7 w-7 text-brand-blue" />
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-border bg-brand-yellow/20 px-3 py-1 text-[11px] font-heading font-bold uppercase tracking-[0.16em] text-foreground">
                <Sparkles className="h-3.5 w-3.5 text-brand-orange" />
                Em breve
              </span>
            </div>

            <h1 className="mt-6 font-heading text-3xl font-bold text-foreground">Modo prova</h1>
            <p className="mt-3 max-w-2xl font-body text-muted-foreground">
              Esta rota privada concentra a experiencia de treino focada em simulados. A arquitetura ja esta separada
              do restante da area publica e pronta para receber regras mais rigidas de tempo, bloqueio e tentativa.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border-2 border-border bg-muted/40 p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-orange/15">
                  <Timer className="h-5 w-5 text-brand-orange" />
                </div>
                <p className="mt-3 font-heading text-lg font-semibold text-foreground">Tempo controlado</p>
                <p className="mt-2 font-body text-sm text-muted-foreground">
                  Espaco reservado para provas com cronometro e encerramento automatico.
                </p>
              </div>
              <div className="rounded-2xl border-2 border-border bg-muted/40 p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-green/15">
                  <ShieldCheck className="h-5 w-5 text-brand-green" />
                </div>
                <p className="mt-3 font-heading text-lg font-semibold text-foreground">Fluxo autenticado</p>
                <p className="mt-2 font-body text-sm text-muted-foreground">
                  O acesso depende de login e fica isolado da vitrine publica do projeto.
                </p>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/app/turmas"
                className="btn-3d btn-3d-blue inline-flex items-center gap-2 rounded-2xl px-6 py-3 font-heading text-sm font-bold"
              >
                Abrir area de estudo
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/app/competicao"
                className="btn-tap inline-flex items-center gap-2 rounded-2xl border-2 border-border bg-card px-6 py-3 font-heading text-sm font-bold text-foreground shadow-card transition-all hover:bg-muted/60"
              >
                Ir para competicao
              </Link>
            </div>
          </div>

          <div className="card-flat flex flex-col p-6 sm:p-8">
            <div className="flex flex-col items-center text-center">
              <MascotMark sizeClassName="h-20 w-20" />
              <p className="mt-4 font-heading text-lg font-semibold text-foreground">Proximos blocos</p>
            </div>
            <ul className="mt-5 space-y-3 font-body text-sm text-muted-foreground">
              <li className="rounded-2xl border-2 border-border bg-muted/40 px-4 py-3">Lista de provas por turma</li>
              <li className="rounded-2xl border-2 border-border bg-muted/40 px-4 py-3">Historico de tentativas</li>
              <li className="rounded-2xl border-2 border-border bg-muted/40 px-4 py-3">Regras de liberacao por janela</li>
            </ul>
          </div>
        </div>
      </section>
    </Layout>
  );
}
