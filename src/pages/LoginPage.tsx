import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff, LogIn, Search, UserPlus } from "lucide-react";
import BrandMark from "@/components/BrandMark";
import Layout from "@/components/Layout";
import { turmas } from "@/data/catalog";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

type SelfRegisterResponse = {
  success: true;
  turma_id: string;
  email?: string;
};

function getSignupFunctionErrorMessage(rawMessage?: string | null) {
  if (!rawMessage) return "Não foi possível concluir o cadastro. Confira seu nome com o admin.";

  if (
    rawMessage.includes("Failed to send a request to the Edge Function") ||
    rawMessage.includes("Edge Function returned a non-2xx status code")
  ) {
    return "O autocadastro ainda não está disponível neste ambiente. Falta publicar a function de cadastro.";
  }

  return rawMessage;
}

export default function LoginPage() {
  const { user, loading: authLoading, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [signupNome, setSignupNome] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupPasswordConfirm, setSignupPasswordConfirm] = useState("");
  const [showSignupPass, setShowSignupPass] = useState(false);
  const [signupResolvedTurma, setSignupResolvedTurma] = useState<string | null>(null);
  const [signupPreviewAccess, setSignupPreviewAccess] = useState<string | null>(null);
  const [signupNameConflict, setSignupNameConflict] = useState(false);
  const [signupChecking, setSignupChecking] = useState(false);
  const [signupLookupDone, setSignupLookupDone] = useState(false);
  const [createdAccess, setCreatedAccess] = useState<{ login: string; password: string; turmaId: string } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const state = location.state as { from?: string | { pathname?: string } } | null;
  const redirectTo = typeof state?.from === "string" ? state.from : state?.from?.pathname || "/app";

  const resolvedTurmaLabel = turmas.find((turma) => turma.id === signupResolvedTurma)?.nome ?? signupResolvedTurma;

  const resetSignupFeedback = () => {
    setCreatedAccess(null);
    setSignupNameConflict(false);
    setSignupResolvedTurma(null);
    setSignupPreviewAccess(null);
    setSignupLookupDone(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await signIn(identifier, password);
    setLoading(false);

    if (result.error) {
      setError("Acesso ou senha incorretos.");
      return;
    }

    navigate(redirectTo, { replace: true });
  };

  const handleSelfSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setCreatedAccess(null);

    if (!signupNome.trim()) {
      setError("Digite o nome completo.");
      return;
    }

    if (!signupLookupDone || !signupResolvedTurma) {
      setError(signupNameConflict ? "Existe mais de um cadastro com esse nome. Procure o admin." : "Esse nome não foi encontrado na lista autorizada.");
      return;
    }

    if (signupPassword.length < 6) {
      setError("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    if (signupPassword !== signupPasswordConfirm) {
      setError("As senhas não conferem.");
      return;
    }

    setLoading(true);
    try {
      const { data, error: signupError } = await supabase.functions.invoke<SelfRegisterResponse>("self-register", {
        body: {
          nome: signupNome,
          password: signupPassword,
        },
      });

      if (signupError || data?.success !== true) {
        setLoading(false);
        const nextError =
          getSignupFunctionErrorMessage(signupError?.message) ||
          (typeof data === "object" && data && "error" in data && typeof (data as { error?: unknown }).error === "string"
            ? (data as { error: string }).error
            : null) ||
          "Não foi possível concluir o cadastro. Confira seu nome com o admin.";
        setError(nextError);
        return;
      }

      setLoading(false);
      setCreatedAccess({
        login: data.email ?? "",
        password: signupPassword,
        turmaId: data.turma_id,
      });
      setIdentifier(data.email ?? "");
      setPassword(signupPassword);
      setMode("signin");
      setSignupPassword("");
      setSignupPasswordConfirm("");
    } catch (invokeError) {
      setLoading(false);
      setError(getSignupFunctionErrorMessage(invokeError instanceof Error ? invokeError.message : null));
    }
  };

  const handleUseCreatedAccess = async () => {
    if (!createdAccess) return;
    setError("");
    setLoading(true);
    const result = await signIn(createdAccess.login, createdAccess.password);
    setLoading(false);

    if (result.error) {
      setError("Não foi possível entrar automaticamente com o acesso criado.");
      return;
    }

    navigate(redirectTo, { replace: true });
  };

  const handleCheckSignupName = async () => {
    const trimmedName = signupNome.trim();
    setError("");
    setCreatedAccess(null);
    setSignupLookupDone(false);

    if (!trimmedName) {
      setSignupResolvedTurma(null);
      setSignupPreviewAccess(null);
      setSignupNameConflict(false);
      setError("Digite o nome completo antes de conferir.");
      return;
    }

    setSignupChecking(true);
    try {
      const { data, error: previewError } = await supabase.functions.invoke<SelfRegisterResponse>("self-register", {
        body: {
          mode: "preview",
          nome: trimmedName,
        },
      });

      if (previewError || data?.success !== true || !data?.turma_id) {
        setSignupResolvedTurma(null);
        setSignupPreviewAccess(null);
        setSignupNameConflict(Boolean(previewError?.message?.includes("mais de um cadastro")));
        setSignupLookupDone(false);
        setSignupChecking(false);
        setError(
          getSignupFunctionErrorMessage(previewError?.message) ||
            (previewError?.message?.includes("mais de um cadastro")
              ? "Existe mais de um cadastro com esse nome. Procure o admin."
              : "Esse nome não foi encontrado na lista autorizada."),
        );
        return;
      }

      setSignupResolvedTurma(data.turma_id);
      setSignupPreviewAccess(data.email ?? null);
      setSignupNameConflict(false);
      setSignupLookupDone(true);
      setSignupChecking(false);
    } catch (invokeError) {
      setSignupResolvedTurma(null);
      setSignupPreviewAccess(null);
      setSignupNameConflict(false);
      setSignupLookupDone(false);
      setSignupChecking(false);
      setError(getSignupFunctionErrorMessage(invokeError instanceof Error ? invokeError.message : null));
    }
  };

  useEffect(() => {
    if (mode !== "signup") return;
    setSignupLookupDone(false);
    setSignupResolvedTurma(null);
    setSignupPreviewAccess(null);
    setSignupNameConflict(false);
  }, [signupNome, mode]);

  if (!authLoading && user) {
    return <Navigate to={redirectTo} replace />;
  }

  return (
    <Layout>
      <section className="mesh-gradient grid-pattern relative mx-auto flex min-h-[90vh] items-center justify-center px-4 py-20">
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
              <p className="mt-3 font-body text-base font-medium text-muted-foreground">Sua trilha de estudos está esperando.</p>
            </div>

            <div className="mb-6 grid grid-cols-2 gap-2 rounded-2xl border border-border/60 bg-background/50 p-2">
              <button
                type="button"
                onClick={() => {
                  setMode("signin");
                  setError("");
                  resetSignupFeedback();
                }}
                className={`rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                  mode === "signin" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setError("");
                  setCreatedAccess(null);
                }}
                className={`rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                  mode === "signup" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Quero me cadastrar
              </button>
            </div>

            {createdAccess ? (
              <div className="mb-6 rounded-2xl border border-emerald-300/60 bg-gradient-to-r from-emerald-100 via-emerald-50 to-background px-4 py-4 shadow-sm">
                <p className="font-heading text-xs font-bold uppercase tracking-[0.22em] text-emerald-700">Cadastro concluído</p>
                <div className="mt-3 space-y-2 text-sm text-emerald-950">
                  <p>
                    <span className="font-semibold">Acesso:</span> <code className="rounded bg-white/80 px-2 py-1 font-mono">{createdAccess.login}</code>
                  </p>
                  <p>
                    <span className="font-semibold">Senha:</span> <code className="rounded bg-white/80 px-2 py-1 font-mono">{createdAccess.password}</code>
                  </p>
                  <p>
                    <span className="font-semibold">Turma:</span> {turmas.find((turma) => turma.id === createdAccess.turmaId)?.nome ?? createdAccess.turmaId}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleUseCreatedAccess}
                  className="btn-tap mt-4 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-emerald-700"
                >
                  Entrar com esse acesso
                </button>
              </div>
            ) : null}

            {mode === "signup" ? (
              <div className="mb-6 rounded-2xl border border-amber-300/60 bg-gradient-to-r from-amber-100 via-orange-50 to-background px-4 py-3 shadow-sm">
                <p className="font-heading text-xs font-bold uppercase tracking-[0.22em] text-amber-700">Novo fluxo de cadastro</p>
                <p className="mt-1 text-sm font-medium text-amber-900">Escreva seu nome completo e clique na lupa.</p>
              </div>
            ) : null}

            <form onSubmit={mode === "signin" ? handleSubmit : handleSelfSignup} className="space-y-6">
              {mode === "signin" ? (
                <>
                  <div className="space-y-2">
                    <label className="block px-2 font-heading text-sm font-bold uppercase tracking-wider text-muted-foreground/80">
                      Email ou código de acesso
                    </label>
                    <input
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      required
                      placeholder="seuemail@escola.com ou aluno_4821ab"
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
                        placeholder="Sua senha"
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
                </>
              ) : (
                <>
                  <div className="rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
                    Escreva seu nome completo e clique na lupa.
                  </div>

                  <div className="space-y-2">
                    <label className="block px-2 font-heading text-sm font-bold uppercase tracking-wider text-muted-foreground/80">
                      Nome completo
                    </label>
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <input
                        type="text"
                        value={signupNome}
                        onChange={(e) => {
                          const nextValue = e.target.value;
                          setSignupNome(nextValue);
                          setError("");
                          setCreatedAccess(null);
                        }}
                        required
                        placeholder="Digite seu nome completo"
                        className="min-w-0 flex-1 rounded-2xl border border-border/60 bg-background/50 px-5 py-4 font-body text-sm transition-all focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleCheckSignupName}
                        disabled={signupChecking}
                        className="btn-tap inline-flex h-14 w-full shrink-0 items-center justify-center rounded-2xl border border-emerald-400/70 bg-emerald-500 px-4 py-4 text-white shadow-[0_0_0_8px_rgba(16,185,129,0.12)] transition-all hover:scale-[1.03] hover:bg-emerald-600 hover:shadow-[0_0_0_10px_rgba(16,185,129,0.16)] disabled:opacity-60 sm:h-auto sm:w-auto sm:min-w-16"
                        aria-label="Conferir nome"
                      >
                        <span className="relative flex items-center justify-center">
                          {!signupChecking ? (
                            <>
                              <span className="absolute inline-flex h-9 w-9 animate-ping rounded-full bg-white/25" />
                              <span className="absolute inline-flex h-11 w-11 rounded-full border border-white/20" />
                            </>
                          ) : null}
                          <Search className="relative h-5 w-5" />
                        </span>
                      </button>
                    </div>
                  </div>

                  <div
                    className={`rounded-2xl border px-4 py-3 text-sm ${
                      signupChecking
                        ? "border-primary/20 bg-primary/5 text-primary"
                        : signupLookupDone && signupResolvedTurma
                          ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                          : signupNameConflict
                            ? "border-amber-200 bg-amber-50 text-amber-900"
                            : "border-border/60 bg-background/40 text-muted-foreground"
                    }`}
                  >
                    {signupChecking ? (
                      "Conferindo seu nome na lista autorizada..."
                    ) : signupLookupDone && signupResolvedTurma ? (
                      <>
                        <span className="font-semibold">Cadastro autorizado:</span> {resolvedTurmaLabel}
                      </>
                    ) : signupNameConflict ? (
                      "Existe mais de um cadastro com esse nome. Procure o admin."
                    ) : (
                      "Escreva seu nome completo e clique na lupa."
                    )}
                  </div>

                  {signupLookupDone && signupResolvedTurma ? (
                    <>
                      <div className="rounded-3xl border border-primary/20 bg-gradient-to-r from-primary/10 via-emerald-50 to-background px-5 py-4 shadow-sm">
                        <p className="font-heading text-xs font-bold uppercase tracking-[0.22em] text-primary/80">
                          Seu acesso para entrar
                        </p>
                        <p className="mt-2 text-sm text-muted-foreground">
                          Guarde este e-mail. Ele será usado junto com a senha que você criar abaixo.
                        </p>
                        <div className="mt-3 flex flex-col gap-3 rounded-2xl border border-primary/15 bg-white/80 px-4 py-3 sm:flex-row sm:items-center">
                          <span className="font-heading text-sm font-bold text-primary">Email de acesso</span>
                          <code className="max-w-full break-all rounded-xl bg-secondary px-3 py-2 font-mono text-sm font-semibold text-foreground sm:text-base">
                            {signupPreviewAccess ?? "email@escola.com"}
                          </code>
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <label className="block px-2 font-heading text-sm font-bold uppercase tracking-wider text-muted-foreground/80">
                            Criar senha
                          </label>
                          <div className="relative">
                            <input
                              type={showSignupPass ? "text" : "password"}
                              value={signupPassword}
                              onChange={(e) => setSignupPassword(e.target.value)}
                              required
                              placeholder="Mínimo de 6 caracteres"
                              className="w-full rounded-2xl border border-border/60 bg-background/50 px-5 py-4 pr-14 font-body text-sm transition-all focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => setShowSignupPass(!showSignupPass)}
                              className="absolute right-5 top-1/2 -translate-y-1/2 text-muted-foreground transition-all hover:scale-110 hover:text-primary"
                            >
                              {showSignupPass ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="block px-2 font-heading text-sm font-bold uppercase tracking-wider text-muted-foreground/80">
                            Confirmar senha
                          </label>
                          <input
                            type={showSignupPass ? "text" : "password"}
                            value={signupPasswordConfirm}
                            onChange={(e) => setSignupPasswordConfirm(e.target.value)}
                            required
                            placeholder="Repita a senha"
                            className="w-full rounded-2xl border border-border/60 bg-background/50 px-5 py-4 font-body text-sm transition-all focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none"
                          />
                        </div>
                      </div>
                    </>
                  ) : null}
                </>
              )}

              {error && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 px-5 py-4 font-body text-sm font-semibold text-destructive"
                >
                  <div className="h-2 w-2 animate-pulse rounded-full bg-destructive" />
                  {error}
                </motion.div>
              )}

              {mode === "signin" || (signupLookupDone && signupResolvedTurma) ? (
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-tap group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-2xl bg-primary py-5 font-heading text-lg font-black text-primary-foreground shadow-glow transition-all hover:scale-[1.02] disabled:opacity-60"
                >
                  <div className="pointer-events-none absolute inset-x-0 h-full w-1/3 animate-shine bg-white/20 blur-xl" />
                  {loading ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                      className="h-6 w-6 rounded-full border-3 border-primary-foreground/30 border-t-primary-foreground"
                    />
                  ) : mode === "signin" ? (
                    <>
                      <LogIn className="h-6 w-6 transition-transform group-hover:scale-110" />
                      Entrar agora
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-6 w-6 transition-transform group-hover:scale-110" />
                      Criar minha conta
                    </>
                  )}
                </button>
              ) : null}
            </form>
          </div>
        </motion.div>
      </section>
    </Layout>
  );
}
