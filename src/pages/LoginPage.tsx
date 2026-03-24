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
      <section className="relative mx-auto flex min-h-[90vh] items-center justify-center px-4 py-20 mesh-gradient grid-pattern">
        {/* Decorative elements */}
        <div className="pointer-events-none absolute -left-20 top-1/2 h-80 w-80 rounded-full bg-primary/15 blur-[100px]" />
        <div className="pointer-events-none absolute -right-20 bottom-0 h-96 w-96 rounded-full bg-accent/10 blur-[120px]" />

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, type: "spring", damping: 20 }}
          className="relative w-full max-w-lg"
        >
          <div className="bento-card border-primary/20 bg-background/60 p-10 shadow-glow backdrop-blur-2xl sm:p-12">
            <div className="mb-10 text-center">
              <motion.div
                initial={{ rotate: -15, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                className="mb-6 inline-flex"
              >
                <div className="rounded-[2.5rem] bg-primary/10 p-5 shadow-inner">
                  <BrandMark sizeClassName="h-20 w-20" imageClassName="h-12 w-12" className="shadow-glow" />
                </div>
              </motion.div>
              <h1 className="font-heading text-4xl font-black tracking-tight text-foreground">
                Entrar na <span className="text-primary">Arena</span>
              </h1>
              <p className="mt-3 font-body text-base font-medium text-muted-foreground">
                Sua trilha de estudos está esperando. 🚀
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="block px-2 font-heading text-sm font-bold uppercase tracking-wider text-muted-foreground/80">
                  Email ou código de acesso
                </label>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  placeholder="joao@escola.com ou aluno_4821ab"
                  className="w-full rounded-2xl border border-border/60 bg-background/50 px-5 py-4 font-body text-sm transition-all focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="block px-2 font-heading text-sm font-bold uppercase tracking-wider text-muted-foreground/80">
                  Senha
                </label>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Sua senha secreta"
                    className="w-full rounded-2xl border border-border/60 bg-background/50 px-5 py-4 pr-14 font-body text-sm transition-all focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-muted-foreground transition-all hover:scale-110 hover:text-primary"
                  >
                    {showPass ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 px-5 py-4 font-body text-sm font-semibold text-destructive"
                >
                  <div className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
                  {error}
                </motion.div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-tap group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-2xl bg-primary py-5 font-heading text-lg font-black text-primary-foreground shadow-glow transition-all hover:scale-[1.02] disabled:opacity-60"
              >
                <div className="absolute inset-x-0 h-full w-1/3 animate-shine bg-white/20 blur-xl pointer-events-none" />
                {loading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    className="h-6 w-6 rounded-full border-3 border-primary-foreground/30 border-t-primary-foreground"
                  />
                ) : (
                  <>
                    <LogIn className="h-6 w-6 transition-transform group-hover:scale-110" />
                    Entrar Agora
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
