import { Heart, ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import Breadcrumbs from "@/components/Breadcrumbs";
import MascotMark from "@/components/MascotMark";

export default function FavoritosPage() {
  return (
    <Layout>
      <Breadcrumbs items={[{ label: "Favoritos" }]} />
      <section className="container mx-auto max-w-3xl px-4 py-12">
        <div className="card-flat flex flex-col items-center p-6 text-center sm:p-10">
          <MascotMark sizeClassName="h-24 w-24 sm:h-28 sm:w-28" sizes="(min-width: 640px) 7rem, 6rem" />

          <span className="mt-5 inline-flex items-center gap-1.5 rounded-full border-2 border-border bg-brand-yellow/20 px-3 py-1 text-[11px] font-heading font-bold uppercase tracking-[0.16em] text-foreground">
            <Sparkles className="h-3.5 w-3.5 text-brand-orange" />
            Em breve
          </span>

          <h1 className="mt-4 font-heading text-3xl font-bold text-foreground">Favoritos</h1>
          <p className="mt-3 max-w-xl font-body text-muted-foreground">
            Esta área foi separada para reunir temas, aulas e simulados salvos pelo aluno. A estrutura da rota já
            está pronta e a página fica isolada dentro da área autenticada.
          </p>

          <div className="mt-8 w-full rounded-2xl border-2 border-dashed border-border bg-muted/40 p-6">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-pink/15">
              <Heart className="h-6 w-6 text-brand-pink" />
            </div>
            <p className="mt-4 font-heading text-lg font-semibold text-foreground">Nenhum favorito salvo ainda.</p>
            <p className="mt-2 font-body text-sm text-muted-foreground">
              Quando o recurso de favoritos for conectado aos cards de estudo, os itens aparecerão aqui.
            </p>
          </div>

          <Link
            to="/app/turmas"
            className="btn-3d btn-3d-green mt-8 inline-flex items-center gap-2 rounded-2xl px-6 py-3 font-heading text-sm font-bold"
          >
            Explorar conteúdos
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </Layout>
  );
}
