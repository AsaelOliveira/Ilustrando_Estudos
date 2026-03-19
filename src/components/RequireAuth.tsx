import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import SessionNotifications from "@/components/SessionNotifications";

export default function RequireAuth() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="text-center">
          <p className="font-heading text-lg font-semibold text-foreground">Verificando acesso...</p>
          <p className="mt-2 text-sm text-muted-foreground">Aguarde enquanto sua sessão é carregada.</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return (
    <>
      <SessionNotifications />
      <Outlet />
    </>
  );
}
