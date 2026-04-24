import { Suspense, lazy } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Outlet, Route, Routes, useParams } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/hooks/useAuth";
import { StudyContentProvider } from "@/hooks/useStudyContent";
import RequireAuth from "@/components/RequireAuth";
import RequireRole from "@/components/RequireRole";

import Home from "./pages/Home";
import Sobre from "./pages/Sobre";
import LoginPage from "./pages/LoginPage";
import AppHomePage from "./pages/AppHomePage";
import NotFound from "./pages/NotFound";

const Turmas = lazy(() => import("./pages/Turmas"));
const Disciplinas = lazy(() => import("./pages/Disciplinas"));
const TemasPage = lazy(() => import("./pages/TemasPage"));
const AulaPage = lazy(() => import("./pages/AulaPage"));
const Competicao = lazy(() => import("./pages/Competicao"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const PerfilPage = lazy(() => import("./pages/PerfilPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const AcompanhamentoPage = lazy(() => import("./pages/AcompanhamentoPage"));
const FavoritosPage = lazy(() => import("./pages/FavoritosPage"));
const ModoProvaPage = lazy(() => import("./pages/ModoProvaPage"));
const DuelPage = lazy(() => import("./pages/DuelPage"));

const queryClient = new QueryClient();

function LegacyTurmasRedirect() {
  return <Navigate to="/app/turmas" replace />;
}

function LegacyTurmaRedirect() {
  const { turma } = useParams<{ turma: string }>();
  return <Navigate to={`/app/turmas/${turma ?? ""}`} replace />;
}

function LegacyDisciplinaRedirect() {
  const { turma, disciplina } = useParams<{ turma: string; disciplina: string }>();
  return <Navigate to={`/app/turmas/${turma ?? ""}/${disciplina ?? ""}`} replace />;
}

function LegacyTemaRedirect() {
  const { turma, disciplina, tema } = useParams<{ turma: string; disciplina: string; tema: string }>();
  return <Navigate to={`/app/turmas/${turma ?? ""}/${disciplina ?? ""}/${tema ?? ""}`} replace />;
}

function AuthSessionScope() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}

function StudyContentScope() {
  return (
    <StudyContentProvider>
      <Outlet />
    </StudyContentProvider>
  );
}

function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center">
        <p className="font-heading text-lg font-semibold text-foreground">Carregando pagina...</p>
        <p className="mt-2 text-sm text-muted-foreground">Baixando somente o necessario para esta etapa.</p>
      </div>
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" storageKey="vite-ui-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/sobre" element={<Sobre />} />
              <Route element={<AuthSessionScope />}>
                <Route path="/login" element={<LoginPage />} />
                <Route element={<RequireAuth />}>
                  <Route element={<StudyContentScope />}>
                    <Route path="/app" element={<AppHomePage />} />
                    <Route path="/app/turmas" element={<Turmas />} />
                    <Route path="/app/turmas/:turmaId" element={<Disciplinas />} />
                    <Route path="/app/turmas/:turmaId/:disciplinaId" element={<TemasPage />} />
                    <Route path="/app/turmas/:turmaId/:disciplinaId/:temaId" element={<AulaPage />} />
                    <Route path="/app/progresso" element={<DashboardPage />} />
                    <Route element={<RequireRole allowedRoles={["admin", "professor", "coordenadora"]} />}>
                      <Route path="/app/acompanhamento" element={<AcompanhamentoPage />} />
                    </Route>
                    <Route path="/app/favoritos" element={<FavoritosPage />} />
                    <Route path="/app/modo-prova" element={<ModoProvaPage />} />
                    <Route path="/app/configuracoes" element={<PerfilPage />} />
                    <Route path="/app/competicao" element={<Competicao />} />
                    <Route path="/app/duelo" element={<DuelPage />} />
                    <Route element={<RequireRole allowedRoles={["admin"]} />}>
                      <Route path="/app/admin" element={<AdminPage />} />
                    </Route>
                    <Route path="/app/*" element={<NotFound />} />
                    <Route path="/turmas" element={<LegacyTurmasRedirect />} />
                    <Route path="/turmas/:turma/disciplinas" element={<LegacyTurmaRedirect />} />
                    <Route path="/turmas/:turma/:disciplina/temas" element={<LegacyDisciplinaRedirect />} />
                    <Route path="/turmas/:turma/:disciplina/:tema" element={<LegacyTemaRedirect />} />
                    <Route path="/competicao" element={<Navigate to="/app/competicao" replace />} />
                    <Route path="/admin" element={<Navigate to="/app/admin" replace />} />
                    <Route path="/perfil" element={<Navigate to="/app/configuracoes" replace />} />
                    <Route path="/desempenho" element={<Navigate to="/app/progresso" replace />} />
                  </Route>
                </Route>
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
