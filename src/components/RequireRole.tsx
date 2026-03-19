import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

type RequireRoleProps = {
  allowedRoles: Array<"admin" | "professor" | "aluno">;
  redirectTo?: string;
};

export default function RequireRole({
  allowedRoles,
  redirectTo = "/app",
}: RequireRoleProps) {
  const { role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="text-center">
          <p className="font-heading text-lg font-semibold text-foreground">Verificando permissao...</p>
          <p className="mt-2 text-sm text-muted-foreground">Aguarde enquanto o perfil e carregado.</p>
        </div>
      </div>
    );
  }

  if (!role || !allowedRoles.includes(role)) {
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
}
