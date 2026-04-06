import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sword,
  Clock,
  Trophy,
  Plus,
  X,
  CheckCircle,
  XCircle,
  Loader2,
  Eye,
  EyeOff,
  Users,
  Zap,
  AlertTriangle,
  ShieldCheck,
  RotateCcw,
  Flame,
  Target,
  BookOpen,
  Shuffle,
  Timer,
  Shield,
  History,
  Search,
  Hash,
  Crown,
  Medal,
  Send,
} from "lucide-react";
import Layout from "@/components/Layout";
import Breadcrumbs from "@/components/Breadcrumbs";
import Confetti from "@/components/Confetti";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { turmas, disciplinas } from "@/data/catalog";
import type { Questao } from "@/data/content-types";
import { toast } from "@/hooks/use-toast";
import { fetchLeaderboardSnapshot } from "@/lib/leaderboard";
import {
  getQuestionsByIds as fetchQuestionsByIds,
  getQuestionsForMission,
  getReplacementQuestion as fetchReplacementQuestion,
  listAllThemeSummaries,
  type ContentQuestion,
  type ThemeSummary,
} from "@/lib/content-store";

// ============================================================
// Tipos
// ============================================================

type DuelMode = "aberto" | "anonimo";
type DuelStatus = "aberto" | "aguardando" | "em_batalha" | "concluido" | "expirado";

type Duel = {
  id: string;
  challenger_id: string;
  challenged_id: string | null;
  mode: DuelMode;
  visibility: string;
  status: DuelStatus;
  challenger_display_name: string;
  challenger_display_turma: string | null;
  question_ids: string[];
  turma_id: string;
  discipline_id: string | null;
  interclass: boolean;
  num_questions: number;
  time_limit: number;
  challenger_answers: string[] | null;
  challenger_score: number;
  challenger_time_seconds: number | null;
  challenger_anti_cheat: string[] | null;
  challenged_answers: string[] | null;
  challenged_score: number;
  challenged_time_seconds: number | null;
  challenged_anti_cheat: string[] | null;
  winner_id: string | null;
  created_at: string;
  challenger_finished_at: string | null;
  challenged_finished_at: string | null;
  expires_at: string;
};

type PageView =
  | { kind: "lobby" }
  | { kind: "config" }
  | { kind: "battle"; duelId: string; role: "challenger" | "challenged" }
  | { kind: "waiting"; duelId: string }
  | { kind: "results"; duel: Duel }
  | { kind: "history" };

type DuelConfig = {
  mode: DuelMode;
  disciplineId: string | null;
  numQuestions: number;
  timeLimit: number;
  interclass: boolean;
  targetType: "publico" | "privado";
  targetUserId: string | null;
  targetUserName: string | null;
};

type RankingEntry = {
  user_id: string;
  nome: string;
  turma_id: string;
  points: number;
  avatar_url: string | null;
};

// ============================================================
// Constantes
// ============================================================

const WINNER_PTS = 15;
const TIE_PTS = 7;
const TIME_OPTIONS = [
  { value: 120, label: "2 minutos" },
  { value: 180, label: "3 minutos" },
  { value: 300, label: "5 minutos" },
];
const QUESTION_OPTIONS = [3, 5, 7];
// ============================================================
// Utilidades
// ============================================================
function calcScore(questions: Questao[], answers: (string | null)[]): number {
  return questions.filter((q, i) => answers[i] === q.respostaCorreta).length;
}

function fmtTime(s: number) {
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}

function turmaLabel(id: string | null) {
  if (!id) return "";
  return turmas.find(t => t.id === id)?.nome || id;
}

function disciplineLabel(id: string | null) {
  if (!id) return "Todas as disciplinas";
  return disciplinas.find(d => d.id === id)?.nome || id;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora mesmo";
  if (mins < 60) return `${mins} min atrÃ¡s`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h atrÃ¡s`;
  return `${Math.floor(hrs / 24)}d atrÃ¡s`;
}

// ============================================================
// Mini Ranking â€” Sidebar compacta
// ============================================================

function MiniRanking({ userTurma, userId }: { userTurma: string; userId: string }) {
  const [turmaTop, setTurmaTop] = useState<RankingEntry[]>([]);
  const [escolaTop, setEscolaTop] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadRanking = async () => {
      if (active) setLoading(true);
      const snapshot = await fetchLeaderboardSnapshot({
        turmaId: userTurma,
        turmaLimit: 7,
        geralLimit: 7,
        includeAvatar: true,
      });
      if (!active) return;
      setTurmaTop(snapshot.turma as RankingEntry[]);
      setEscolaTop(snapshot.geral as RankingEntry[]);
      setLoading(false);
    };

    void loadRanking();
    const interval = window.setInterval(() => {
      void loadRanking();
    }, 120000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [userTurma]);

  const RankList = ({ entries, title, icon }: { entries: RankingEntry[]; title: string; icon: React.ReactNode }) => (
    <div className="rounded-xl border border-border bg-card/80 p-3">
      <h4 className="mb-2 flex items-center gap-1.5 font-heading text-xs font-bold text-foreground">
        {icon}
        {title}
      </h4>
      {loading ? (
        <div className="flex justify-center py-3"><Loader2 className="h-4 w-4 animate-spin text-primary" /></div>
      ) : entries.length === 0 ? (
        <p className="text-center font-body text-[10px] text-muted-foreground">Sem dados ainda</p>
      ) : (
        <div className="space-y-1">
          {entries.map((e, i) => {
            const isMe = e.user_id === userId;
            const medal = i === 0 ? "ðŸ¥‡" : i === 1 ? "ðŸ¥ˆ" : i === 2 ? "ðŸ¥‰" : `${i + 1}.`;
            return (
              <div
                key={e.user_id}
                className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-[11px] transition-colors ${
                  isMe ? "bg-primary/10 font-semibold" : "hover:bg-secondary/50"
                }`}
              >
                <span className="w-5 flex-shrink-0 text-center">{medal}</span>
                <span className={`min-w-0 flex-1 truncate font-body ${isMe ? "text-primary" : "text-foreground"}`}>
                  {e.nome.split(" ")[0]}
                  {isMe && <span className="ml-1 text-[9px] text-primary/70">(vocÃª)</span>}
                </span>
                <span className="flex-shrink-0 font-heading font-bold text-accent">{e.points}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-3">
      <RankList entries={turmaTop} title={turmaLabel(userTurma)} icon={<Medal className="h-3.5 w-3.5 text-primary" />} />
      <RankList entries={escolaTop} title="Escola" icon={<Crown className="h-3.5 w-3.5 text-accent" />} />
    </div>
  );
}

// ============================================================
// Hook anti-trapaÃ§a
// ============================================================

function useAntiCheat(active: boolean, onTabSwitch?: () => void) {
  const flagsRef = useRef<string[]>([]);
  const [flags, setFlags] = useState<string[]>([]);
  const onTabSwitchRef = useRef(onTabSwitch);
  onTabSwitchRef.current = onTabSwitch;

  useEffect(() => {
    if (!active) return;

    const addFlag = (type: string, triggerSwap: boolean) => {
      const f = `${type}_${Date.now()}`;
      flagsRef.current = [...flagsRef.current, f];
      setFlags([...flagsRef.current]);
      if (triggerSwap && onTabSwitchRef.current) onTabSwitchRef.current();
    };

    const onVisibility = () => {
      if (document.hidden) addFlag("tab_oculta", true);
    };
    const onBlur = () => addFlag("janela_perdeu_foco", true);
    const onContext = (e: MouseEvent) => {
      e.preventDefault();
      addFlag("menu_contexto", false);
    };
    const onCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      addFlag("tentou_copiar", false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && e.key === "I") ||
        (e.ctrlKey && e.key === "u")
      ) {
        e.preventDefault();
        addFlag("atalho_bloqueado", false);
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    document.addEventListener("contextmenu", onContext);
    document.addEventListener("copy", onCopy);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("contextmenu", onContext);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [active]);

  return { flags, flagsRef };
}

// ============================================================
// Componente principal
// ============================================================

export default function DuelPage() {
  const { user, profile, role } = useAuth();
  const [view, setView] = useState<PageView>({ kind: "lobby" });
  const [showConfetti, setShowConfetti] = useState(false);
  const [loading, setLoading] = useState(true);

  // Ao abrir, verificar se jÃ¡ hÃ¡ duelo ativo
  useEffect(() => {
    if (!user) { setLoading(false); return; }
    (async () => {
      const nowIso = new Date().toISOString();
      const [activeRes, battlingRes, waitingRes] = await Promise.all([
        supabase
          .from("duels")
          .select("id")
          .eq("challenger_id", user.id)
          .eq("status", "aberto")
          .maybeSingle(),
        supabase
          .from("duels")
          .select("id")
          .eq("challenged_id", user.id)
          .eq("status", "em_batalha")
          .maybeSingle(),
        supabase
          .from("duels")
          .select("id")
          .eq("challenger_id", user.id)
          .eq("status", "aguardando")
          .gt("expires_at", nowIso)
          .maybeSingle(),
      ]);
      const active = activeRes.data;
      if (active) {
        setView({ kind: "battle", duelId: active.id, role: "challenger" });
        setLoading(false);
        return;
      }
      const battling = battlingRes.data;
      if (battling) {
        setView({ kind: "battle", duelId: battling.id, role: "challenged" });
        setLoading(false);
        return;
      }
      const waiting = waitingRes.data;
      if (waiting) {
        setView({ kind: "waiting", duelId: waiting.id });
        setLoading(false);
        return;
      }
      setView({ kind: "lobby" });
      setLoading(false);
    })();
  }, [user]);

  if (loading) {
    return (
      <Layout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  const userTurma = profile?.turma_id || "6ano";
  const showSidebar = view.kind !== "battle"; // Esconder ranking durante batalha

  return (
    <Layout>
      {showConfetti && <Confetti show />}
      <Breadcrumbs items={[{ label: "Duelo" }]} />
      <section className="container mx-auto max-w-5xl px-4 py-8">
        {/* CabeÃ§alho animado */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ rotate: [0, -12, 12, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="text-4xl"
            >
              âš”ï¸
            </motion.div>
            <div>
              <h1 className="font-heading text-3xl font-extrabold text-foreground md:text-4xl">
                Arena de Duelos
              </h1>
              <p className="font-body text-sm text-muted-foreground">
                Desafie colegas, responda no seu tempo e conquiste o topo do ranking!
              </p>
            </div>
          </div>
        </motion.div>

        <div className={`flex gap-6 ${showSidebar ? "" : ""}`}>
          {/* ConteÃºdo principal */}
          <div className="min-w-0 flex-1">
            <AnimatePresence mode="wait">
              <motion.div
                key={view.kind}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
              >
                {view.kind === "lobby" && (
                  <LobbyView
                    user={user}
                    profile={profile}
                    adminRole={role}
                    onCreateDuel={() => setView({ kind: "config" })}
                    onBattle={(duelId, r) => setView({ kind: "battle", duelId, role: r })}
                    onResults={(duel) => setView({ kind: "results", duel })}
                    onHistory={() => setView({ kind: "history" })}
                  />
                )}
                {view.kind === "config" && (
                  <ConfigView
                    user={user}
                    profile={profile}
                    onCreated={(duelId) => setView({ kind: "battle", duelId, role: "challenger" })}
                    onCancel={() => setView({ kind: "lobby" })}
                  />
                )}
                {view.kind === "battle" && (
                  <BattleArena
                    duelId={view.duelId}
                    playerRole={view.role}
                    userId={user?.id ?? ""}
                    onDone={(duel) => {
                      if (view.role === "challenger") {
                        setView({ kind: "waiting", duelId: duel.id });
                      } else {
                        if (duel.winner_id === user?.id) setShowConfetti(true);
                        setView({ kind: "results", duel });
                      }
                    }}
                  />
                )}
                {view.kind === "waiting" && (
                  <WaitingView
                    duelId={view.duelId}
                    userId={user?.id ?? ""}
                    onResult={(duel) => {
                      if (duel.winner_id === user?.id) setShowConfetti(true);
                      setView({ kind: "results", duel });
                    }}
                    onBack={() => setView({ kind: "lobby" })}
                  />
                )}
                {view.kind === "results" && (
                  <ResultsView
                    duel={view.duel}
                    userId={user?.id ?? ""}
                    onBack={() => { setShowConfetti(false); setView({ kind: "lobby" }); }}
                  />
                )}
                {view.kind === "history" && (
                  <HistoryView
                    userId={user?.id ?? ""}
                    adminRole={role}
                    onBack={() => setView({ kind: "lobby" })}
                    onViewResult={(duel) => setView({ kind: "results", duel })}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Sidebar de ranking */}
          {showSidebar && user && (
            <motion.aside
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="hidden w-52 flex-shrink-0 lg:block"
            >
              <div className="sticky top-20">
                <h3 className="mb-3 flex items-center gap-1.5 font-heading text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  <Trophy className="h-3.5 w-3.5" />
                  Ranking
                </h3>
                <MiniRanking userTurma={userTurma} userId={user.id} />
              </div>
            </motion.aside>
          )}
        </div>
      </section>
    </Layout>
  );
}

// ============================================================
// LobbyView
// ============================================================

function LobbyView({
  user, profile, adminRole, onCreateDuel, onBattle, onResults, onHistory,
}: {
  user: { id: string } | null;
  profile: { nome: string; turma_id: string | null } | null;
  adminRole: string | null;
  onCreateDuel: () => void;
  onBattle: (id: string, role: "challenger" | "challenged") => void;
  onResults: (d: Duel) => void;
  onHistory: () => void;
}) {
  const [challenges, setChallenges] = useState<Duel[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    // Desafios pÃºblicos abertos + desafios privados dirigidos a mim
    const { data: publicDuels } = await supabase
      .from("duels")
      .select("*")
      .eq("status", "aguardando")
      .eq("visibility", "publico")
      .neq("challenger_id", user.id)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(30);
    const { data: privateDuels } = await supabase
      .from("duels")
      .select("*")
      .eq("status", "aguardando")
      .eq("visibility", "privado")
      .eq("challenged_id", user.id)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(10);
    const all = [...(privateDuels as Duel[] || []), ...(publicDuels as Duel[] || [])];
    setChallenges(all);
    setLoadingList(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // Realtime lobby
  useEffect(() => {
    const ch = supabase
      .channel("lobby")
      .on("postgres_changes", { event: "*", schema: "public", table: "duels" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const accept = async (duel: Duel) => {
    if (!user) return;
    setAccepting(duel.id);
    // Verificar disponibilidade
    const { data: fresh } = await supabase.from("duels").select("status").eq("id", duel.id).single();
    if (fresh?.status !== "aguardando") {
      toast({ title: "Desafio indisponÃ­vel", description: "Outro aluno jÃ¡ aceitou este desafio.", variant: "destructive" });
      setAccepting(null);
      load();
      return;
    }
    // Aceitar: marcar o desafiado e mudar status
    const { error } = await supabase.from("duels").update({
      challenged_id: user.id,
      status: "em_batalha",
    }).eq("id", duel.id);
    setAccepting(null);
    if (error) {
      toast({ title: "Erro", description: "NÃ£o foi possÃ­vel aceitar o desafio.", variant: "destructive" });
      return;
    }
    onBattle(duel.id, "challenged");
  };

  if (!user) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center">
        <Sword className="mx-auto mb-4 h-12 w-12 text-primary opacity-50" />
        <h2 className="mb-2 font-heading text-xl font-bold text-foreground">FaÃ§a login para duelar!</h2>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* AÃ§Ãµes */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={onCreateDuel}
          className="btn-tap flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-heading text-sm font-bold text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-glow"
        >
          <Plus className="h-4 w-4" />
          Criar Desafio
        </button>
        <button
          onClick={onHistory}
          className="btn-tap flex items-center gap-2 rounded-xl border-2 border-border px-4 py-2.5 font-heading text-sm font-semibold text-foreground hover:bg-secondary"
        >
          <History className="h-4 w-4" />
          HistÃ³rico
        </button>
      </div>

      {/* Lista de desafios */}
      <div>
        <h2 className="mb-3 flex items-center gap-2 font-heading text-lg font-bold text-foreground">
          <Flame className="h-5 w-5 text-accent" />
          Desafios Abertos
        </h2>

        {loadingList ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-20 animate-pulse rounded-2xl bg-secondary/50" />)}
          </div>
        ) : challenges.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card rounded-2xl p-10 text-center">
            <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 2, repeat: Infinity }} className="mb-3 text-5xl">âš”ï¸</motion.div>
            <h3 className="mb-1 font-heading text-lg font-bold text-foreground">Nenhum desafio por enquanto</h3>
            <p className="font-body text-sm text-muted-foreground">Seja o primeiro! Crie um desafio e aguarde um adversÃ¡rio.</p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {challenges.map((c, i) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                whileHover={{ scale: 1.01 }}
                className="group flex items-center gap-4 rounded-2xl border-2 border-border bg-card px-4 py-4 transition-all hover:border-primary/30 hover:shadow-md"
              >
                <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl text-2xl ${c.visibility === "privado" ? "bg-accent/15 ring-2 ring-accent/30" : c.mode === "anonimo" ? "bg-accent/10" : "bg-primary/10"}`}>
                  {c.visibility === "privado" ? "ðŸ“©" : c.mode === "anonimo" ? "ðŸŽ­" : "âš”ï¸"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-heading text-sm font-bold text-foreground">
                    {c.challenger_display_name}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 font-body text-xs text-muted-foreground">
                    {c.challenger_display_turma && <span>{turmaLabel(c.challenger_display_turma)}</span>}
                    <span>Â·</span>
                    <span>{c.num_questions} questÃµes</span>
                    <span>Â·</span>
                    <span>{Math.floor(c.time_limit / 60)} min</span>
                    {c.discipline_id && (
                      <>
                        <span>Â·</span>
                        <span className="text-primary">{disciplineLabel(c.discipline_id)}</span>
                      </>
                    )}
                    {c.interclass && <span className="rounded-full bg-accent/10 px-1.5 text-accent">Interclasse</span>}
                    {c.visibility === "privado" && <span className="rounded-full bg-accent/20 px-1.5 font-semibold text-accent">Para vocÃª!</span>}
                  </div>
                  <p className="mt-0.5 font-body text-[10px] text-muted-foreground/60">{timeAgo(c.created_at)}</p>
                </div>
                <button
                  onClick={() => accept(c)}
                  disabled={accepting === c.id}
                  className="btn-tap flex-shrink-0 rounded-xl bg-primary px-5 py-2.5 font-heading text-xs font-bold text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-glow disabled:opacity-60"
                >
                  {accepting === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Aceitar âš”ï¸"}
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* PontuaÃ§Ã£o */}
      <div className="glass-card rounded-2xl p-5">
        <h3 className="mb-3 flex items-center gap-2 font-heading text-sm font-bold text-foreground">
          <Zap className="h-4 w-4 text-primary" /> Como funciona
        </h3>
        <div className="grid gap-2 text-xs font-body text-muted-foreground sm:grid-cols-2">
          <div className="flex items-start gap-2 rounded-xl bg-secondary/50 p-3">
            <Trophy className="mt-0.5 h-3.5 w-3.5 text-accent flex-shrink-0" />
            <span>Vencedor: <strong className="text-accent">+{WINNER_PTS} pts</strong></span>
          </div>
          <div className="flex items-start gap-2 rounded-xl bg-secondary/50 p-3">
            <Users className="mt-0.5 h-3.5 w-3.5 text-primary flex-shrink-0" />
            <span>Empate: <strong className="text-primary">+{TIE_PTS} pts</strong> cada</span>
          </div>
          <div className="flex items-start gap-2 rounded-xl bg-secondary/50 p-3">
            <Timer className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
            <span>Responda no seu tempo: nÃ£o precisa estar online junto</span>
          </div>
          <div className="flex items-start gap-2 rounded-xl bg-secondary/50 p-3">
            <Shield className="mt-0.5 h-3.5 w-3.5 text-destructive flex-shrink-0" />
            <span>Anti-trapaÃ§a: sair da aba troca a pergunta por outra!</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// ConfigView â€” ConfiguraÃ§Ãµes do duelo
// ============================================================

function ConfigView({
  user, profile, onCreated, onCancel,
}: {
  user: { id: string } | null;
  profile: { nome: string; turma_id: string | null } | null;
  onCreated: (duelId: string) => void;
  onCancel: () => void;
}) {
  const userTurma = profile?.turma_id || "6ano";
  const [cfg, setCfg] = useState<DuelConfig>({
    mode: "aberto",
    disciplineId: null,
    numQuestions: 5,
    timeLimit: 180,
    interclass: false,
    targetType: "publico",
    targetUserId: null,
    targetUserName: null,
  });
  const [creating, setCreating] = useState(false);
  const [themeSummaries, setThemeSummaries] = useState<ThemeSummary[]>([]);

  // Busca de aluno para desafio direto
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ user_id: string; nome: string; turma_id: string | null }[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // CÃ³digo do duelo para convite
  const [inviteCode, setInviteCode] = useState("");

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const summaries = await listAllThemeSummaries();
        if (active) setThemeSummaries(summaries);
      } catch (error) {
        console.error(error);
        if (active) setThemeSummaries([]);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  // Busca debounced por nome
  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults([]); return; }
    clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(async () => {
      setSearching(true);
      const { data } = await supabase
        .from("profiles")
        .select("user_id, nome, turma_id")
        .neq("user_id", user?.id || "")
        .ilike("nome", `%${searchQuery}%`)
        .limit(8);
      setSearchResults(data || []);
      setSearching(false);
    }, 300);
    return () => clearTimeout(searchTimeoutRef.current);
  }, [searchQuery, user]);

  // Disciplinas disponÃ­veis para a turma do usuÃ¡rio
  const availableDisciplines = useMemo(() => {
    const turmaDiscs = disciplinas.filter(d => d.turmaId === userTurma);
    return turmaDiscs.filter(d => {
      const total = themeSummaries
        .filter(theme => theme.disciplinaId === d.id && (cfg.interclass || theme.turmaId === userTurma))
        .reduce((sum, theme) => sum + theme.exerciseCount + theme.simuladoCount, 0);
      return total >= cfg.numQuestions;
    });
  }, [userTurma, cfg.interclass, cfg.numQuestions, themeSummaries]);

  const totalAvailable = useMemo(() => {
    return themeSummaries
      .filter(theme => (cfg.interclass || theme.turmaId === userTurma))
      .filter(theme => (cfg.disciplineId ? theme.disciplinaId === cfg.disciplineId : true))
      .reduce((sum, theme) => sum + theme.exerciseCount + theme.simuladoCount, 0);
  }, [cfg, themeSummaries, userTurma]);

  const create = async () => {
    if (!user || !profile) return;
    setCreating(true);

    const questions = await getQuestionsForMission({
      turmaId: userTurma,
      disciplineId: cfg.disciplineId,
      interclass: cfg.interclass,
      limit: cfg.numQuestions,
    });

    if (questions.length < cfg.numQuestions) {
      toast({ title: "QuestÃµes insuficientes", description: `Encontramos apenas ${questions.length} questÃµes com esses filtros.`, variant: "destructive" });
      setCreating(false);
      return;
    }

    const displayName = cfg.mode === "anonimo" ? "AnÃ´nimo" : profile.nome;
    const displayTurma = cfg.mode === "anonimo" ? null : userTurma;

    const { data, error } = await supabase.from("duels").insert({
      challenger_id: user.id,
      challenged_id: cfg.targetType === "privado" ? cfg.targetUserId : null,
      mode: cfg.mode,
      visibility: cfg.targetType === "privado" ? "privado" : "publico",
      challenger_display_name: displayName,
      challenger_display_turma: displayTurma,
      question_ids: questions.map(q => q.id),
      turma_id: userTurma,
      discipline_id: cfg.disciplineId,
      interclass: cfg.interclass,
      num_questions: cfg.numQuestions,
      time_limit: cfg.timeLimit,
      status: "aberto",
    }).select("id").single();

    setCreating(false);
    if (error || !data) {
      toast({ title: "Erro ao criar desafio", description: error?.message, variant: "destructive" });
      return;
    }

    // Gerar cÃ³digo de convite a partir do ID (primeiros 6 caracteres)
    if (cfg.targetType === "privado") {
      const code = data.id.replace(/-/g, "").slice(0, 6).toUpperCase();
      toast({ title: "Convite criado!", description: `CÃ³digo: ${code} â€” compartilhe com seu colega!` });
    }

    onCreated(data.id);
  };

  // Aceitar por cÃ³digo de convite
  const joinByCode = async () => {
    if (!user || inviteCode.length < 4) return;
    setCreating(true);
    const normalized = inviteCode.trim().toUpperCase();

    // Buscar duelo cujo ID comeÃ§a com o cÃ³digo
    const { data: duels } = await supabase
      .from("duels")
      .select("id, status, challenger_id, challenged_id")
      .eq("status", "aguardando")
      .gt("expires_at", new Date().toISOString())
      .limit(50);

    const match = duels?.find(d =>
      d.id.replace(/-/g, "").slice(0, 6).toUpperCase() === normalized
      && d.challenger_id !== user.id
    );

    if (!match) {
      toast({ title: "CÃ³digo nÃ£o encontrado", description: "Verifique o cÃ³digo e tente novamente.", variant: "destructive" });
      setCreating(false);
      return;
    }

    if (match.challenged_id && match.challenged_id !== user.id) {
      toast({ title: "Desafio indisponÃ­vel", description: "Este desafio jÃ¡ foi aceito por outro aluno.", variant: "destructive" });
      setCreating(false);
      return;
    }

    const { error } = await supabase.from("duels").update({
      challenged_id: user.id,
      status: "em_batalha",
    }).eq("id", match.id);

    setCreating(false);
    if (error) {
      toast({ title: "Erro", description: "NÃ£o foi possÃ­vel aceitar o desafio.", variant: "destructive" });
      return;
    }
    onCreated(match.id);
  };

  return (
    <div className="space-y-5">
      <button onClick={onCancel} className="btn-tap flex items-center gap-1 font-body text-sm text-muted-foreground hover:text-foreground">
        â† Voltar ao lobby
      </button>

      {/* Entrar por cÃ³digo */}
      <div className="glass-card rounded-2xl p-4">
        <h3 className="mb-2 flex items-center gap-2 font-heading text-sm font-bold text-foreground">
          <Hash className="h-4 w-4 text-accent" />
          Tem um cÃ³digo de convite?
        </h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={inviteCode}
            onChange={e => setInviteCode(e.target.value.toUpperCase())}
            placeholder="Ex: A3F2B1"
            maxLength={6}
            className="flex-1 rounded-xl border-2 border-border bg-background px-4 py-2.5 font-heading text-sm uppercase tracking-widest focus:border-primary focus:outline-none"
          />
          <button
            onClick={joinByCode}
            disabled={creating || inviteCode.length < 4}
            className="btn-tap flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2.5 font-heading text-xs font-bold text-white transition-all hover:bg-accent/90 disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
            Entrar
          </button>
        </div>
      </div>

      <div className="glass-card rounded-2xl p-6">
        <h2 className="mb-1 font-heading text-xl font-bold text-foreground">Configurar Desafio</h2>
        <p className="mb-6 font-body text-xs text-muted-foreground">
          VocÃª responderÃ¡ primeiro. Depois, o desafio ficarÃ¡ disponÃ­vel para o adversÃ¡rio.
        </p>

        {/* Tipo de adversÃ¡rio */}
        <fieldset className="mb-5">
          <legend className="mb-2 font-heading text-sm font-semibold text-foreground">AdversÃ¡rio</legend>
          <div className="grid grid-cols-2 gap-3">
            {([
              ["publico", "PÃºblico", Users, "Qualquer um aceita"] as const,
              ["privado", "Desafiar alguÃ©m", Target, "Escolha o adversÃ¡rio"] as const,
            ]).map(([val, label, Icon, desc]) => (
              <button
                key={val}
                onClick={() => setCfg(p => ({ ...p, targetType: val, targetUserId: null, targetUserName: null }))}
                className={`btn-tap rounded-xl border-2 p-4 text-left transition-all ${cfg.targetType === val ? "border-accent bg-accent/5" : "border-border hover:border-accent/20"}`}
              >
                <Icon className={`mb-1 h-5 w-5 ${cfg.targetType === val ? "text-accent" : "text-muted-foreground"}`} />
                <p className="font-heading text-sm font-bold text-foreground">{label}</p>
                <p className="font-body text-[11px] text-muted-foreground">{desc}</p>
              </button>
            ))}
          </div>
        </fieldset>

        {/* Busca de aluno (desafio direto) */}
        {cfg.targetType === "privado" && (
          <div className="mb-5">
            {cfg.targetUserId ? (
              <div className="flex items-center gap-3 rounded-xl border-2 border-accent/30 bg-accent/5 px-4 py-3">
                <Target className="h-5 w-5 text-accent" />
                <div className="flex-1">
                  <p className="font-heading text-sm font-bold text-foreground">{cfg.targetUserName}</p>
                  <p className="font-body text-[10px] text-muted-foreground">AdversÃ¡rio selecionado</p>
                </div>
                <button
                  onClick={() => { setCfg(p => ({ ...p, targetUserId: null, targetUserName: null })); setSearchQuery(""); }}
                  className="rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Buscar pelo nome do colega..."
                    className="w-full rounded-xl border-2 border-border bg-background py-3 pl-10 pr-4 font-body text-sm focus:border-accent focus:outline-none"
                  />
                  {searching && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
                </div>
                {searchResults.length > 0 && (
                  <div className="mt-2 max-h-48 space-y-1 overflow-y-auto rounded-xl border border-border bg-card p-2">
                    {searchResults.map(r => (
                      <button
                        key={r.user_id}
                        onClick={() => {
                          setCfg(p => ({ ...p, targetUserId: r.user_id, targetUserName: r.nome }));
                          setSearchQuery("");
                          setSearchResults([]);
                        }}
                        className="btn-tap flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all hover:bg-secondary"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 font-heading text-xs font-bold text-primary">
                          {r.nome.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-heading text-sm font-semibold text-foreground">{r.nome}</p>
                          <p className="font-body text-[10px] text-muted-foreground">{turmaLabel(r.turma_id)}</p>
                        </div>
                        <Send className="h-3.5 w-3.5 text-accent" />
                      </button>
                    ))}
                  </div>
                )}
                {searchQuery.length >= 2 && searchResults.length === 0 && !searching && (
                  <p className="mt-2 text-center font-body text-xs text-muted-foreground">Nenhum aluno encontrado</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Modo */}
        <fieldset className="mb-5">
          <legend className="mb-2 font-heading text-sm font-semibold text-foreground">Identidade</legend>
          <div className="grid grid-cols-2 gap-3">
            {([["aberto", "Aberto", Eye, "Seu nome visÃ­vel"] as const, ["anonimo", "AnÃ´nimo", EyeOff, "Identidade oculta"] as const]).map(([val, label, Icon, desc]) => (
              <button
                key={val}
                onClick={() => setCfg(p => ({ ...p, mode: val }))}
                className={`btn-tap rounded-xl border-2 p-4 text-left transition-all ${cfg.mode === val ? "border-primary bg-primary/5" : "border-border hover:border-primary/20"}`}
              >
                <Icon className={`mb-1 h-5 w-5 ${cfg.mode === val ? "text-primary" : "text-muted-foreground"}`} />
                <p className="font-heading text-sm font-bold text-foreground">{label}</p>
                <p className="font-body text-[11px] text-muted-foreground">{desc}</p>
              </button>
            ))}
          </div>
        </fieldset>

        {/* Disciplina */}
        <fieldset className="mb-5">
          <legend className="mb-2 font-heading text-sm font-semibold text-foreground">Disciplina</legend>
          <select
            value={cfg.disciplineId || ""}
            onChange={e => setCfg(p => ({ ...p, disciplineId: e.target.value || null }))}
            className="w-full rounded-xl border-2 border-border bg-background px-4 py-3 font-body text-sm focus:border-primary focus:outline-none"
          >
            <option value="">Todas as disciplinas (aleatÃ³rio)</option>
            {availableDisciplines.map(d => (
              <option key={d.id} value={d.id}>{d.nome}</option>
            ))}
          </select>
        </fieldset>

        {/* QuestÃµes e Tempo */}
        <div className="mb-5 grid grid-cols-2 gap-4">
          <fieldset>
            <legend className="mb-2 font-heading text-sm font-semibold text-foreground">QuestÃµes</legend>
            <div className="flex gap-2">
              {QUESTION_OPTIONS.map(n => (
                <button
                  key={n}
                  onClick={() => setCfg(p => ({ ...p, numQuestions: n }))}
                  className={`btn-tap flex-1 rounded-xl border-2 py-2.5 font-heading text-sm font-bold transition-all ${cfg.numQuestions === n ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/20"}`}
                >
                  {n}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-2 font-heading text-sm font-semibold text-foreground">Tempo</legend>
            <select
              value={cfg.timeLimit}
              onChange={e => setCfg(p => ({ ...p, timeLimit: Number(e.target.value) }))}
              className="w-full rounded-xl border-2 border-border bg-background px-3 py-2.5 font-body text-sm focus:border-primary focus:outline-none"
            >
              {TIME_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </fieldset>
        </div>

        {/* Interclasse */}
        <label className="mb-5 flex cursor-pointer items-center gap-3 rounded-xl border-2 border-border p-4 transition-all hover:border-primary/20">
          <input
            type="checkbox"
            checked={cfg.interclass}
            onChange={e => setCfg(p => ({ ...p, interclass: e.target.checked }))}
            className="h-4 w-4 rounded border-border text-primary accent-primary"
          />
          <div>
            <p className="font-heading text-sm font-semibold text-foreground">Modo Interclasse</p>
            <p className="font-body text-[11px] text-muted-foreground">Inclui questÃµes de todas as turmas (mais difÃ­cil!)</p>
          </div>
        </label>

        {/* Nota admin */}
        {cfg.mode === "anonimo" && (
          <div className="mb-5 rounded-xl bg-secondary/50 p-3">
            <p className="flex items-start gap-2 font-body text-xs text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary" />
              Mesmo no modo anÃ´nimo, o administrador pode ver a identidade de todos os participantes.
            </p>
          </div>
        )}

        {/* Info */}
        <p className="mb-4 font-body text-xs text-muted-foreground">
          {totalAvailable} questÃµes disponÃ­veis com esses filtros
        </p>

        <button
          onClick={create}
          disabled={creating || totalAvailable < cfg.numQuestions || (cfg.targetType === "privado" && !cfg.targetUserId)}
          className="btn-tap w-full rounded-xl bg-primary py-3.5 font-heading text-sm font-bold text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-glow disabled:cursor-not-allowed disabled:opacity-50"
        >
          {creating ? (
            <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Criando...</span>
          ) : cfg.targetType === "privado" ? (
            `Desafiar ${cfg.targetUserName?.split(" ")[0] || "colega"} âš”ï¸`
          ) : (
            "Criar Desafio PÃºblico âš”ï¸"
          )}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// BattleArena â€” Tela de batalha com anti-trapaÃ§a
// ============================================================

function BattleArena({
  duelId, playerRole, userId, onDone,
}: {
  duelId: string;
  playerRole: "challenger" | "challenged";
  userId: string;
  onDone: (duel: Duel) => void;
}) {
  const [duel, setDuel] = useState<Duel | null>(null);
  const [questions, setQuestions] = useState<ContentQuestion[]>([]);
  const [answers, setAnswers] = useState<(string | null)[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [timeLeft, setTimeLeft] = useState(180);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showVS, setShowVS] = useState(true);
  const [swapFlash, setSwapFlash] = useState(false); // Flash visual ao trocar pergunta
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const submitGuard = useRef(false);
  const answersRef = useRef<(string | null)[]>([]);
  const questionsRef = useRef<ContentQuestion[]>([]);
  const startTimeRef = useRef(Date.now());

  // Callback chamado ao detectar troca de aba/foco
  const handleTabSwitch = useCallback(async () => {
    const qs = questionsRef.current;
    if (qs.length === 0 || submitGuard.current) return;

    const idx = currentQ;
    const currentQuestion = qs[idx];
    if (!currentQuestion) return;

    // IDs jÃ¡ usados no duelo (nÃ£o repetir)
    const usedIds = new Set(qs.map(q => q.id));
    const replacement = await fetchReplacementQuestion(currentQuestion, usedIds);

    if (replacement) {
      // Trocar a questÃ£o e limpar a resposta
      const newQs = [...qs];
      newQs[idx] = replacement;
      questionsRef.current = newQs;
      setQuestions(newQs);

      const newAnswers = [...answersRef.current];
      newAnswers[idx] = null;
      answersRef.current = newAnswers;
      setAnswers(newAnswers);

      // Flash visual
      setSwapFlash(true);
      setTimeout(() => setSwapFlash(false), 1200);

      toast({
        title: "Pergunta trocada!",
        description: "VocÃª saiu da aba. A pergunta foi substituÃ­da por outra.",
        variant: "destructive",
      });
    }
  }, [currentQ]);

  const { flags, flagsRef } = useAntiCheat(!submitted && !showVS, handleTabSwitch);

  // Carregar duelo
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("duels").select("*").eq("id", duelId).single();
      if (!data) return;
      const d = data as Duel;
      setDuel(d);
      const qs = await fetchQuestionsByIds(d.question_ids);
      setQuestions(qs);
      questionsRef.current = qs;
      answersRef.current = new Array(qs.length).fill(null);
      setAnswers(answersRef.current);
      setTimeLeft(d.time_limit);
      startTimeRef.current = Date.now();

      // Tela VS por 2.5 segundos
      setTimeout(() => setShowVS(false), 2500);
    })();
  }, [duelId]);

  // Timer
  useEffect(() => {
    if (!duel || showVS || submitted) return;
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const rem = Math.max(0, duel.time_limit - elapsed);
      setTimeLeft(rem);
      if (rem <= 0) {
        clearInterval(timerRef.current);
        doSubmit();
      }
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [duel, showVS, submitted]);

  const doSubmit = useCallback(async () => {
    if (submitGuard.current || !duel) return;
    submitGuard.current = true;
    setSubmitting(true);
    clearInterval(timerRef.current);

    // Usar questionsRef (pode ter sido trocada pelo anti-cheat)
    const qs = questionsRef.current;
    const score = calcScore(qs, answersRef.current);
    const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
    const antiCheat = flagsRef.current;

    const update: Record<string, unknown> = playerRole === "challenger"
      ? {
        challenger_answers: answersRef.current,
        challenger_score: score,
        challenger_time_seconds: elapsed,
        challenger_anti_cheat: antiCheat,
        challenger_finished_at: new Date().toISOString(),
        status: "aguardando",
      }
      : {
        challenged_answers: answersRef.current,
        challenged_score: score,
        challenged_time_seconds: elapsed,
        challenged_anti_cheat: antiCheat,
        challenged_finished_at: new Date().toISOString(),
      };

    await supabase.from("duels").update(update).eq("id", duel.id);

    // Se sou o desafiado, tentar finalizar o duelo
    if (playerRole === "challenged") {
      await supabase.rpc("finalize_duel", { p_duel_id: duel.id });
    }

    // Buscar duelo atualizado
    const { data: fresh } = await supabase.from("duels").select("*").eq("id", duel.id).single();
    setSubmitting(false);
    setSubmitted(true);
    if (fresh) onDone(fresh as Duel);
  }, [duel, playerRole, flagsRef, onDone]);

  // Tela VS
  if (showVS || !duel || questions.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex min-h-[50vh] flex-col items-center justify-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.3, 1] }}
          transition={{ duration: 0.8, ease: "backOut" }}
          className="mb-6 text-8xl"
        >
          âš”ï¸
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-2 font-heading text-3xl font-extrabold text-foreground"
        >
          Preparar...
        </motion.h2>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="flex items-center gap-3 text-sm font-body text-muted-foreground"
        >
          <Shield className="h-4 w-4 text-destructive" />
          Anti-trapaÃ§a ativado â€” nÃ£o saia desta aba!
        </motion.div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ delay: 1.5, duration: 1.5 }}
          className="mt-4 font-heading text-2xl font-extrabold text-primary"
        >
          LUTAR!
        </motion.p>
      </motion.div>
    );
  }

  const q = questions[currentQ];
  const isLowTime = timeLeft <= 30;
  const answered = answers.filter(a => a !== null).length;

  return (
    <div className="space-y-4">
      {/* Alerta de troca de pergunta */}
      <AnimatePresence>
        {swapFlash && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex items-center gap-2 rounded-xl bg-destructive/15 px-4 py-3 font-body text-xs text-destructive"
          >
            <Shuffle className="h-4 w-4 flex-shrink-0" />
            <span className="font-semibold">Pergunta trocada! VocÃª saiu da aba e a questÃ£o foi substituÃ­da.</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Anti-cheat warning */}
      {flags.length > 0 && !swapFlash && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 rounded-xl bg-accent/10 px-4 py-2 font-body text-xs text-accent"
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          {flags.length} troca(s) de pergunta â€” nÃ£o saia desta aba!
        </motion.div>
      )}

      {/* Header: progresso + timer */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5">
          {questions.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentQ(i)}
              className={`h-2.5 w-8 rounded-full transition-all ${
                answers[i] !== null ? "bg-primary" : i === currentQ ? "bg-primary/40" : "bg-border"
              }`}
            />
          ))}
        </div>
        <motion.div
          animate={isLowTime ? { scale: [1, 1.1, 1] } : {}}
          transition={isLowTime ? { duration: 0.5, repeat: Infinity } : {}}
          className={`flex items-center gap-1.5 font-heading text-sm font-bold ${isLowTime ? "text-destructive" : "text-foreground"}`}
        >
          <Clock className="h-4 w-4" />
          {fmtTime(timeLeft)}
        </motion.div>
      </div>

      {/* QuestÃ£o */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${currentQ}-${q.id}`}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.2 }}
          className={`glass-card rounded-2xl p-6 ${swapFlash ? "ring-2 ring-destructive/40" : ""}`}
        >
          <div className="mb-2 flex items-center gap-2">
            <span className="font-body text-xs text-muted-foreground">
              QuestÃ£o {currentQ + 1} de {questions.length}
            </span>
            <span className={`rounded-full px-2 py-0.5 font-body text-[10px] ${
              q.dificuldade === "facil" ? "bg-success/10 text-success"
              : q.dificuldade === "medio" ? "bg-accent/10 text-accent"
              : "bg-destructive/10 text-destructive"
            }`}>
              {q.dificuldade === "facil" ? "fÃ¡cil" : q.dificuldade === "medio" ? "mÃ©dio" : "difÃ­cil"}
            </span>
          </div>
          <h3 className="mb-5 font-heading text-base font-bold leading-relaxed text-foreground">{q.enunciado}</h3>

          {q.tipo === "multipla_escolha" && q.alternativas ? (
            <div className="space-y-2">
              {q.alternativas.map((alt, i) => (
                <button
                  key={i}
                  onClick={() => {
                    const upd = [...answers];
                    upd[currentQ] = alt;
                    answersRef.current = upd;
                    setAnswers(upd);
                  }}
                  className={`btn-tap w-full rounded-xl border-2 px-4 py-3.5 text-left font-body text-sm transition-all ${
                    answers[currentQ] === alt
                      ? "border-primary bg-primary/10 font-medium text-foreground"
                      : "border-border text-foreground/80 hover:border-primary/30 hover:bg-secondary"
                  }`}
                >
                  <span className="mr-2 font-heading font-bold text-primary">{String.fromCharCode(65 + i)}.</span>
                  {alt}
                </button>
              ))}
            </div>
          ) : (
            <input
              type="text"
              value={answers[currentQ] || ""}
              onChange={e => {
                const upd = [...answers];
                upd[currentQ] = e.target.value;
                answersRef.current = upd;
                setAnswers(upd);
              }}
              placeholder="Digite sua resposta..."
              className="w-full rounded-xl border-2 border-border bg-background px-4 py-3.5 font-body text-sm focus:border-primary focus:outline-none"
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* NavegaÃ§Ã£o */}
      <div className="flex justify-between gap-3">
        <button
          onClick={() => setCurrentQ(p => Math.max(0, p - 1))}
          disabled={currentQ === 0}
          className="btn-tap rounded-xl border-2 border-border px-5 py-3 font-heading text-sm font-semibold text-foreground hover:bg-secondary disabled:opacity-40"
        >
          â† Anterior
        </button>
        {currentQ === questions.length - 1 ? (
          <button
            onClick={doSubmit}
            disabled={submitting}
            className="btn-tap rounded-xl bg-primary px-6 py-3 font-heading text-sm font-bold text-primary-foreground hover:bg-primary/90 hover:shadow-glow disabled:opacity-60"
          >
            {submitting ? <Loader2 className="mx-2 h-4 w-4 animate-spin" /> : `Finalizar (${answered}/${questions.length}) âœ“`}
          </button>
        ) : (
          <button
            onClick={() => setCurrentQ(p => Math.min(questions.length - 1, p + 1))}
            className="btn-tap rounded-xl bg-primary px-5 py-3 font-heading text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            PrÃ³xima â†’
          </button>
        )}
      </div>

      {/* Atalho finalizar */}
      {answered === questions.length && currentQ < questions.length - 1 && (
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={doSubmit}
          disabled={submitting}
          className="btn-tap w-full rounded-xl border-2 border-success/30 bg-success/10 py-3 font-heading text-sm font-bold text-success hover:bg-success/20"
        >
          âœ… Todas respondidas â€” Finalizar agora
        </motion.button>
      )}
    </div>
  );
}

// ============================================================
// WaitingView â€” Aguardando adversÃ¡rio aceitar e responder
// ============================================================

function WaitingView({
  duelId, userId, onResult, onBack,
}: {
  duelId: string;
  userId: string;
  onResult: (duel: Duel) => void;
  onBack: () => void;
}) {
  const [canceling, setCanceling] = useState(false);

  // Polling + realtime
  const check = useCallback(async () => {
    const { data } = await supabase.from("duels").select("*").eq("id", duelId).single();
    if (!data) return;
    const d = data as Duel;
    if (d.status === "concluido") onResult(d);
  }, [duelId, onResult]);

  useEffect(() => {
    check();
    const interval = setInterval(check, 15000);
    const ch = supabase
      .channel(`wait_${duelId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "duels", filter: `id=eq.${duelId}` }, () => check())
      .subscribe();
    return () => { clearInterval(interval); supabase.removeChannel(ch); };
  }, [check, duelId]);

  const cancel = async () => {
    setCanceling(true);
    await supabase.from("duels").update({ status: "expirado" }).eq("id", duelId).eq("challenger_id", userId);
    onBack();
  };

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card rounded-2xl p-10 text-center">
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="mb-4 text-6xl"
      >
        ðŸŸï¸
      </motion.div>
      <h2 className="mb-2 font-heading text-2xl font-extrabold text-foreground">Desafio Enviado!</h2>
      <p className="mb-2 font-body text-sm text-muted-foreground">
        Suas respostas foram salvas. Agora Ã© sÃ³ esperar um adversÃ¡rio aceitar!
      </p>
      <p className="mb-6 font-body text-xs text-muted-foreground/70">
        O desafio fica aberto por atÃ© 7 dias. VocÃª serÃ¡ notificado quando alguÃ©m responder.
      </p>

      <div className="mb-6 flex items-center justify-center gap-2 text-sm font-body text-primary">
        <Loader2 className="h-4 w-4 animate-spin" />
        Aguardando adversÃ¡rio...
      </div>

      <div className="flex justify-center gap-3">
        <button onClick={onBack} className="btn-tap rounded-xl border-2 border-border px-5 py-2.5 font-heading text-sm font-semibold text-foreground hover:bg-secondary">
          Voltar ao Lobby
        </button>
        <button
          onClick={cancel}
          disabled={canceling}
          className="btn-tap rounded-xl border-2 border-destructive/30 px-5 py-2.5 font-heading text-sm font-semibold text-destructive hover:bg-destructive/5 disabled:opacity-60"
        >
          {canceling ? "Cancelando..." : "Cancelar Desafio"}
        </button>
      </div>
    </motion.div>
  );
}

// ============================================================
// ResultsView
// ============================================================

function ResultsView({
  duel, userId, onBack,
}: {
  duel: Duel;
  userId: string;
  onBack: () => void;
}) {
  const [names, setNames] = useState<Record<string, string>>({});
  const [questions, setQuestions] = useState<ContentQuestion[]>([]);

  useEffect(() => {
    const ids = [duel.challenger_id, duel.challenged_id].filter(Boolean) as string[];
    if (ids.length === 0) return;
    supabase.from("profiles").select("user_id, nome").in("user_id", ids).then(({ data }) => {
      if (data) {
        const m: Record<string, string> = {};
        data.forEach(p => { m[p.user_id] = p.nome; });
        setNames(m);
      }
    });
  }, [duel]);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const loadedQuestions = await fetchQuestionsByIds(duel.question_ids);
        if (active) setQuestions(loadedQuestions);
      } catch (error) {
        console.error(error);
        if (active) setQuestions([]);
      }
    })();

    return () => {
      active = false;
    };
  }, [duel.question_ids]);

  const iAmChallenger = duel.challenger_id === userId;
  const myScore = iAmChallenger ? duel.challenger_score : duel.challenged_score;
  const oppScore = iAmChallenger ? duel.challenged_score : duel.challenger_score;
  const myAnswers = iAmChallenger ? duel.challenger_answers : duel.challenged_answers;

  const iWon = duel.winner_id === userId;
  const iLost = duel.winner_id !== null && duel.winner_id !== userId;
  const tie = duel.winner_id === null && duel.status === "concluido";

  // Nomes com anonimato respeitado
  const myName = iAmChallenger
    ? names[duel.challenger_id] || "VocÃª"
    : names[duel.challenged_id || ""] || "VocÃª";
  const oppName = (() => {
    if (iAmChallenger) {
      return names[duel.challenged_id || ""] || "AdversÃ¡rio";
    }
    // Se sou desafiado e modo anÃ´nimo, nÃ£o revelar
    if (duel.mode === "anonimo") return "AnÃ´nimo";
    return names[duel.challenger_id] || "AdversÃ¡rio";
  })();

  const emoji = iWon ? "ðŸ†" : tie ? "ðŸ¤" : "ðŸ’ª";
  const headline = iWon ? "VocÃª venceu!" : tie ? "Empate!" : "Boa tentativa!";
  const pts = iWon ? `+${WINNER_PTS}` : tie ? `+${TIE_PTS}` : "+0";
  const ptsColor = iWon ? "text-accent" : tie ? "text-primary" : "text-muted-foreground";

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
      <div className="glass-card rounded-2xl p-8 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.4, 1] }}
          transition={{ duration: 0.6, ease: "backOut" }}
          className="mb-4 text-7xl"
        >
          {emoji}
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-1 font-heading text-2xl font-extrabold text-foreground"
        >
          {headline}
        </motion.h2>

        {/* Placar VS */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="my-6 flex items-center justify-center gap-6"
        >
          <div className="text-center">
            <div className="font-heading text-3xl font-extrabold text-primary">{myScore}/{questions.length}</div>
            <div className="font-body text-xs text-muted-foreground">{myName} (vocÃª)</div>
          </div>
          <div className="font-heading text-2xl font-black text-muted-foreground">vs</div>
          <div className="text-center">
            <div className="font-heading text-3xl font-extrabold text-accent">{oppScore}/{questions.length}</div>
            <div className="font-body text-xs text-muted-foreground">{oppName}</div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className={`inline-flex items-center gap-2 rounded-xl bg-secondary/50 px-5 py-2.5 font-heading text-lg font-extrabold ${ptsColor}`}
        >
          <Trophy className="h-5 w-5" />
          {pts} pontos de ranking
        </motion.div>
      </div>

      {/* Gabarito */}
      {myAnswers && questions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="glass-card rounded-2xl p-5"
        >
          <h3 className="mb-3 font-heading text-sm font-bold text-foreground">Seu desempenho</h3>
          <div className="space-y-2">
            {questions.map((q, i) => {
              const my = (myAnswers as string[])[i];
              const ok = my === q.respostaCorreta;
              return (
                <div key={q.id} className={`flex items-start gap-3 rounded-xl p-3 text-sm ${ok ? "bg-success/10" : "bg-destructive/10"}`}>
                  {ok ? <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-success" /> : <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />}
                  <div className="min-w-0 flex-1">
                    <p className="font-body text-foreground line-clamp-2">{q.enunciado}</p>
                    {!ok && <p className="mt-0.5 font-body text-xs text-muted-foreground">Correta: <strong>{q.respostaCorreta}</strong></p>}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      <button
        onClick={onBack}
        className="btn-tap w-full rounded-xl border-2 border-border py-3 font-heading text-sm font-semibold text-foreground hover:bg-secondary"
      >
        <RotateCcw className="mr-2 inline h-4 w-4" />
        Voltar ao Lobby
      </button>
    </motion.div>
  );
}

// ============================================================
// HistoryView â€” HistÃ³rico + Admin Log
// ============================================================

function HistoryView({
  userId, adminRole, onBack, onViewResult,
}: {
  userId: string;
  adminRole: string | null;
  onBack: () => void;
  onViewResult: (d: Duel) => void;
}) {
  const [duels, setDuels] = useState<Duel[]>([]);
  const [profiles, setProfiles] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"meus" | "admin">("meus");

  useEffect(() => {
    (async () => {
      let query = supabase.from("duels").select("*").order("created_at", { ascending: false }).limit(50);
      if (tab === "meus") {
        query = query.or(`challenger_id.eq.${userId},challenged_id.eq.${userId}`);
      }
      const { data } = await query;
      const list = (data as Duel[]) || [];
      setDuels(list);

      // Buscar nomes
      const ids = [...new Set(list.flatMap(d => [d.challenger_id, d.challenged_id].filter(Boolean) as string[]))];
      if (ids.length > 0) {
        const { data: p } = await supabase.from("profiles").select("user_id, nome").in("user_id", ids);
        setProfiles(new Map((p || []).map(x => [x.user_id, x.nome])));
      }
      setLoading(false);
    })();
  }, [userId, tab]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="btn-tap font-body text-sm text-muted-foreground hover:text-foreground">â† Voltar</button>
        {adminRole === "admin" && (
          <div className="flex gap-1 rounded-xl bg-secondary/50 p-1">
            {(["meus", "admin"] as const).map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); setLoading(true); }}
                className={`rounded-lg px-3 py-1.5 font-heading text-xs font-semibold transition-all ${tab === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
              >
                {t === "meus" ? "Meus Duelos" : "ðŸ” Todos (Admin)"}
              </button>
            ))}
          </div>
        )}
      </div>

      {tab === "admin" && adminRole === "admin" && (
        <div className="flex items-center gap-2 rounded-xl bg-primary/5 px-3 py-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <p className="font-body text-xs text-muted-foreground">
            Identidades reais visÃ­veis, incluindo duelos anÃ´nimos
          </p>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : duels.length === 0 ? (
        <div className="glass-card rounded-2xl p-10 text-center">
          <p className="font-body text-muted-foreground">Nenhum duelo registrado.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {duels.map(d => {
            const cName = profiles.get(d.challenger_id) || "â€”";
            const dName = d.challenged_id ? profiles.get(d.challenged_id) || "â€”" : "â€”";
            const winner = d.winner_id ? profiles.get(d.winner_id) : null;
            const date = new Date(d.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
            const isClickable = d.status === "concluido" && (d.challenger_id === userId || d.challenged_id === userId || adminRole === "admin");

            return (
              <motion.div
                key={d.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => isClickable && onViewResult(d)}
                className={`rounded-2xl border-2 border-border bg-card px-4 py-3 text-sm ${isClickable ? "cursor-pointer hover:border-primary/20 hover:shadow-sm transition-all" : ""}`}
              >
                <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{date}</span>
                  <div className="flex gap-1.5">
                    {d.mode === "anonimo" && <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] text-accent">AnÃ´nimo</span>}
                    <span className={`rounded-full px-2 py-0.5 text-[10px] ${
                      d.status === "concluido" ? "bg-success/10 text-success"
                      : d.status === "aguardando" ? "bg-primary/10 text-primary"
                      : d.status === "em_batalha" ? "bg-accent/10 text-accent"
                      : "bg-secondary text-muted-foreground"
                    }`}>
                      {d.status === "concluido" ? "ConcluÃ­do" : d.status === "aguardando" ? "Aguardando" : d.status === "em_batalha" ? "Em batalha" : d.status}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 text-right">
                    <p className="font-heading text-sm font-semibold">{cName}</p>
                    <p className="font-heading text-lg font-extrabold text-primary">{d.challenger_score}</p>
                  </div>
                  <div className="font-heading text-sm font-black text-muted-foreground">Ã—</div>
                  <div className="flex-1">
                    <p className="font-heading text-sm font-semibold">{dName}</p>
                    <p className="font-heading text-lg font-extrabold text-accent">{d.challenged_score}</p>
                  </div>
                </div>
                {d.status === "concluido" && (
                  <div className="mt-2 border-t border-border pt-2 text-center text-xs">
                    {winner ? (
                      <span className="text-success">ðŸ† {winner} +{WINNER_PTS} pts</span>
                    ) : (
                      <span className="text-primary">ðŸ¤ Empate +{TIE_PTS} pts cada</span>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

