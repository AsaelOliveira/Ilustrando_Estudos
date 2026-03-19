import { useState } from "react";
import { motion } from "framer-motion";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff, LogIn } from "lucide-react";
import BrandMark from "@/components/BrandMark";
import Layout from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";

export default function LoginPage() {
  const { user, loading: authLoading, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const state = location.state as { from?: string | { pathname?: string } } | null;
  const redirectTo = typeof state?.from === "string" ? state.from : state?.from?.pathname || "/app";

  if (!authLoading && user) {
    return <Navigate to={redirectTo} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await signIn(identifier, password);
    setLoading(false);

    if (error) {
      setError("Acesso ou senha incorretos.");
      return;
    }

    navigate(redirectTo, { replace: true });
  };

  return (
    <Layout>
      <section className="container mx-auto flex min-h-[70vh] items-center justify-center px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="glass-card rounded-3xl p-8 shadow-card">
            <div className="mb-8 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                className="mb-4 inline-flex"
              >
                <BrandMark sizeClassName="h-16 w-16" imageClassName="h-10 w-10" className="shadow-glow" />
              </motion.div>
              <h1 className="font-heading text-2xl font-extrabold text-foreground">Entrar na Arena</h1>
              <p className="mt-1 font-body text-sm text-muted-foreground">Use seu email ou codigo de acesso para entrar.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block font-body text-sm font-medium text-foreground">Email ou codigo de acesso</label>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  placeholder="joao@escola.com ou aluno_4821ab"
                  className="w-full rounded-2xl border-2 border-border bg-background px-4 py-3.5 font-body text-sm transition-all focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block font-body text-sm font-medium text-foreground">Senha</label>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Digite sua senha"
                    className="w-full rounded-2xl border-2 border-border bg-background px-4 py-3.5 pr-12 font-body text-sm transition-all focus:border-primary focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 rounded-2xl border-2 border-destructive/20 bg-destructive/10 px-4 py-3 font-body text-sm text-destructive"
                >
                  {error}
                </motion.div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-tap flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-heading text-base font-bold text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-glow disabled:opacity-60"
              >
                {loading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1 }}
                    className="h-5 w-5 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground"
                  />
                ) : (
                  <>
                    <LogIn className="h-5 w-5" />
                    Entrar
                  </>
                )}
              </button>
            </form>
          </div>
        </motion.div>
      </section>
    </Layout>
  );
}
