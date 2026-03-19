import { Heart, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import Breadcrumbs from "@/components/Breadcrumbs";

export default function FavoritosPage() {
  return (
    <Layout>
      <Breadcrumbs items={[{ label: "Favoritos" }]} />
      <section className="container mx-auto max-w-3xl px-4 py-12">
        <div className="rounded-3xl border border-border bg-card p-8 shadow-card">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Heart className="h-7 w-7 text-primary" />
          </div>
          <h1 className="mt-6 font-heading text-3xl font-bold text-foreground">Favoritos</h1>
          <p className="mt-3 max-w-xl font-body text-muted-foreground">
            Esta area foi separada para reunir temas, aulas e simulados salvos pelo aluno. A estrutura da rota ja
            esta pronta e a pagina fica isolada dentro da area autenticada.
          </p>
          <div className="mt-8 rounded-2xl border border-dashed border-border bg-background/70 p-6">
            <p className="font-heading text-lg font-semibold text-foreground">Nenhum favorito salvo ainda.</p>
            <p className="mt-2 font-body text-sm text-muted-foreground">
              Quando o recurso de favoritos for conectado aos cards de estudo, os itens aparecerao aqui.
            </p>
          </div>
          <Link
            to="/app/turmas"
            className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 font-heading text-sm font-bold text-primary-foreground transition-all hover:bg-primary/90"
          >
            Explorar conteudos
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </Layout>
  );
}
