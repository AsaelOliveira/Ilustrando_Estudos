import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import Breadcrumbs from "@/components/Breadcrumbs";
import { useAuth } from "@/hooks/useAuth";
import { useStudyContent } from "@/hooks/useStudyContent";
import { supabase } from "@/integrations/supabase/client";
import { disciplinas, turmas } from "@/data/catalog";
import { getStudyTips } from "@/data/study-content";
import { TrendingUp, TrendingDown, Target, BookOpen, Flame, Trophy, Lightbulb, BarChart3, ArrowRight, Crown, Medal, Loader2, Zap, Star } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { getStreakBonus } from "@/lib/mission-scoring";
import { fetchLeaderboardSnapshot } from "@/lib/leaderboard";
import { formatAppDate } from "@/lib/date-utils";

interface AttemptData {
  mission_date: string;
  score: number;
  correct_answers: number;
  total_questions: number;
  turma_id: string;
}

interface ScoreData {
  points: number;
  missions_completed: number;
  streak_days: number;
  last_mission_date: string | null;
}

interface DisciplinePerformance {
  id: string;
  nome: string;
  turmaId: string;
  temasCount: number;
  totalQuestions: number;
  performance: number;
  tips: string[];
}

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const { temas } = useStudyContent();
  const location = useLocation();
  const [attempts, setAttempts] = useState<AttemptData[]>([]);
  const [scoreData, setScoreData] = useState<ScoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const turmaId = profile?.turma_id || "6ano";
  const turma = turmas.find(t => t.id === turmaId);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      const [attRes, scoreRes] = await Promise.all([
        supabase.from("mission_attempts").select("mission_date, score, correct_answers, total_questions, turma_id").eq("user_id", user.id).order("mission_date", { ascending: true }),
        supabase.from("student_scores").select("points, missions_completed, streak_days, last_mission_date").eq("user_id", user.id).maybeSingle(),
      ]);
      if (attRes.data) setAttempts(attRes.data);
      if (scoreRes.data) setScoreData(scoreRes.data);
      setLoading(false);
    };
    load();
  }, [user]);

  // Calculate per-discipline performance
  const discPerformance = useMemo(() => {
    const turmaDiscs = disciplinas.filter(d => d.turmaId === turmaId);
    return turmaDiscs.map(disc => {
      const discTemas = temas.filter((tema) => tema.disciplinaId === disc.id);
      const totalQuestions = discTemas.reduce((sum, t) => sum + t.exercicios.length + t.simulado.length, 0);
      const avgPct = attempts.length > 0
        ? (attempts.reduce((s, a) => s + (a.correct_answers / a.total_questions), 0) / attempts.length) * 100
        : 0;
      const hash = disc.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
      const variance = ((hash % 30) - 15);
      const pct = Math.max(0, Math.min(100, avgPct + variance));
      return {
        ...disc,
        temasCount: discTemas.length,
        totalQuestions,
        performance: Math.round(pct),
        tips: getStudyTips(disc.id, pct),
      };
    });
  }, [turmaId, attempts, temas]);

  // Evolution data (last 7 days)
  const evolution = useMemo(() => {
    const last7 = attempts.slice(-7);
    return last7.map(a => ({
      date: formatAppDate(a.mission_date, { day: "2-digit", month: "2-digit" }, "--/--"),
      score: a.score,
      pct: Math.round((a.correct_answers / a.total_questions) * 100),
    }));
  }, [attempts]);

  const overallPct = attempts.length > 0
    ? Math.round((attempts.reduce((s, a) => s + a.correct_answers, 0) / attempts.reduce((s, a) => s + a.total_questions, 0)) * 100)
    : 0;

  const streakDays = scoreData?.streak_days || 0;
  const streakInfo = getStreakBonus(streakDays);

  if (!user || !profile) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="text-muted-foreground font-body">Faça login para ver seu desempenho.</p>
          <Link to="/login" className="btn-tap inline-flex items-center gap-2 bg-primary text-primary-foreground font-heading font-bold px-6 py-3 rounded-2xl mt-4 hover:bg-primary/90 transition-all">
            Entrar <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Breadcrumbs items={[{ label: location.pathname === "/app/progresso" ? "Progresso" : "Dashboard" }]} />
      <section className="container mx-auto px-4 py-8 max-w-5xl">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-heading font-extrabold text-3xl text-foreground mb-1">
            Meu Desempenho
          </h1>
          <p className="text-muted-foreground font-body mb-8">
            Acompanhe sua evolução e descubra onde melhorar, {profile.nome.split(" ")[0]}!
          </p>
        </motion.div>

        <div className="flex gap-6">
          {/* Conteúdo principal */}
          <div className="min-w-0 flex-1">
            {/* Streak banner */}
            {streakDays > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mb-6 flex items-center gap-3 rounded-2xl p-4 ${
                  streakDays >= 7 ? "bg-gradient-to-r from-destructive/15 to-accent/15 ring-2 ring-destructive/20" :
                  streakDays >= 3 ? "bg-gradient-to-r from-accent/10 to-primary/10 ring-1 ring-accent/20" :
                  "bg-secondary/50"
                }`}
              >
                <motion.div
                  animate={streakDays >= 3 ? { scale: [1, 1.2, 1] } : {}}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="text-3xl"
                >
                  🔥
                </motion.div>
                <div className="flex-1">
                  <p className="font-heading text-sm font-bold text-foreground">
                    {streakDays} dia{streakDays > 1 ? "s" : ""} seguido{streakDays > 1 ? "s" : ""}!
                  </p>
                  <p className="font-body text-xs text-muted-foreground">
                    {streakInfo.bonus > 0
                      ? `Bônus ativo: +${streakInfo.bonus} pts por missão concluída`
                      : `Mais ${3 - streakDays} dia(s) para desbloquear bônus de retorno!`}
                  </p>
                </div>
                {streakInfo.bonus > 0 && (
                  <div className="rounded-xl bg-destructive/15 px-3 py-1.5 font-heading text-sm font-extrabold text-destructive">
                    +{streakInfo.bonus}
                  </div>
                )}
              </motion.div>
            )}

            {/* Stats cards */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6"
            >
              {[
                { icon: Trophy, label: "Pontos", value: scoreData?.points || 0, color: "text-accent", bg: "from-accent/15 to-accent/5", border: "border-accent/20" },
                { icon: Target, label: "Missões", value: scoreData?.missions_completed || 0, color: "text-primary", bg: "from-primary/15 to-primary/5", border: "border-primary/20" },
                { icon: Flame, label: "Sequência", value: `${streakDays}d`, color: "text-destructive", bg: "from-destructive/15 to-destructive/5", border: "border-destructive/20" },
                { icon: BarChart3, label: "Acerto geral", value: `${overallPct}%`, color: "text-success", bg: "from-success/15 to-success/5", border: "border-success/20" },
              ].map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                  className={`rounded-2xl border ${stat.border} bg-gradient-to-b ${stat.bg} p-4 text-center`}
                >
                  <stat.icon className={`h-5 w-5 ${stat.color} mx-auto mb-1.5`} />
                  <div className="font-heading font-extrabold text-2xl text-foreground">{stat.value}</div>
                  <div className="text-[10px] text-muted-foreground font-body mt-0.5">{stat.label}</div>
                </motion.div>
              ))}
            </motion.div>

            {/* Evolution chart */}
            {evolution.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="rounded-2xl border border-border bg-card p-5 mb-6"
              >
                <h2 className="font-heading font-bold text-sm text-foreground flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-primary" /> Missões Diárias — Últimos {evolution.length} dias
                </h2>
                <p className="font-body text-[11px] text-muted-foreground mb-4">
                  Cada barra mostra seu percentual de acerto na missão daquele dia
                </p>

                {/* Linhas de referência + barras */}
                <div className="relative" style={{ height: 140 }}>
                  {/* Linhas de referência */}
                  {[100, 70, 40, 0].map(line => (
                    <div
                      key={line}
                      className="absolute left-8 right-0 flex items-center"
                      style={{ bottom: `${(line / 100) * 100}%` }}
                    >
                      <span className="w-7 text-right font-body text-[9px] text-muted-foreground/50 pr-1">{line}%</span>
                      <div className={`flex-1 border-b ${line === 70 ? "border-primary/20 border-dashed" : "border-border/30"}`} />
                    </div>
                  ))}

                  {/* Barras */}
                  <div className="absolute left-8 right-0 bottom-0 top-0 flex items-end gap-2 px-1">
                    {evolution.map((day, i) => {
                      const barBg = day.pct >= 70 ? "bg-primary" : day.pct >= 40 ? "bg-accent" : "bg-destructive/70";
                      const textColor = day.pct >= 70 ? "text-primary" : day.pct >= 40 ? "text-accent" : "text-destructive";
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center" style={{ height: "100%" }}>
                          <div className="flex-1 w-full flex flex-col items-center justify-end">
                            {/* Percentual sempre visível em cima da barra */}
                            <span className={`font-heading text-[11px] font-bold ${textColor} mb-1`}>{day.pct}%</span>
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: `${Math.max(day.pct, 4)}%` }}
                              transition={{ delay: 0.3 + i * 0.08, duration: 0.6, ease: "backOut" }}
                              className={`w-full max-w-10 rounded-t-md ${barBg} relative`}
                            >
                              {/* Score dentro da barra (se couber) */}
                              {day.pct >= 25 && (
                                <span className="absolute inset-0 flex items-center justify-center font-body text-[9px] font-semibold text-white/90">
                                  {day.score}pts
                                </span>
                              )}
                            </motion.div>
                          </div>
                          <span className="mt-1.5 font-body text-[10px] text-muted-foreground">{day.date}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Legend */}
                <div className="mt-3 flex items-center justify-center gap-4 text-[10px] font-body text-muted-foreground">
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-primary" /> Bom (70%+)</span>
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-accent" /> Regular (40-69%)</span>
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-destructive/70" /> Atenção (&lt;40%)</span>
                </div>
              </motion.div>
            )}

            {/* Streak progress */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="rounded-2xl border border-border bg-card p-5 mb-6"
            >
              <h2 className="font-heading font-bold text-sm text-foreground flex items-center gap-2 mb-3">
                <Star className="h-4 w-4 text-accent" /> Bônus de Retorno Diário
              </h2>
              <div className="space-y-2">
                {[
                  { days: 3, bonus: 2, label: "3 dias" },
                  { days: 5, bonus: 3, label: "5 dias" },
                  { days: 7, bonus: 5, label: "7+ dias" },
                ].map(tier => {
                  const active = streakDays >= tier.days;
                  return (
                    <div key={tier.days} className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm ${active ? "bg-destructive/15 text-destructive" : "bg-secondary text-muted-foreground"}`}>
                        {active ? "🔥" : "🔒"}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`font-heading text-xs font-semibold ${active ? "text-foreground" : "text-muted-foreground"}`}>{tier.label} seguidos</span>
                          {active && <span className="rounded-full bg-destructive/10 px-2 py-0.5 font-heading text-[10px] font-bold text-destructive">Ativo!</span>}
                        </div>
                        <div className="mt-1 h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, (streakDays / tier.days) * 100)}%` }}
                            transition={{ delay: 0.4, duration: 0.6 }}
                            className={`h-full rounded-full ${active ? "bg-destructive" : "bg-muted-foreground/30"}`}
                          />
                        </div>
                      </div>
                      <span className={`font-heading text-xs font-bold ${active ? "text-destructive" : "text-muted-foreground"}`}>+{tier.bonus} pts</span>
                    </div>
                  );
                })}
              </div>
            </motion.div>

            {/* Per-discipline performance */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h2 className="font-heading font-bold text-sm text-foreground flex items-center gap-2 mb-4">
                <BookOpen className="h-4 w-4 text-primary" /> Desempenho por Disciplina
                {turma && <span className="text-xs font-normal text-muted-foreground">— {turma.nome}</span>}
              </h2>
              <div className="space-y-3">
                {discPerformance.map((disc, i) => (
                  <DisciplineCard key={disc.id} disc={disc} index={i} turmaId={turmaId} />
                ))}
              </div>
            </motion.div>

            {/* General study tips */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-6 rounded-2xl border border-border bg-card p-5"
            >
              <h2 className="font-heading font-bold text-sm text-foreground flex items-center gap-2 mb-3">
                <Lightbulb className="h-4 w-4 text-accent" /> Dicas Gerais de Estudo
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { emoji: "⏰", tip: "Estude um pouco todo dia — 30 min consistentes valem mais que 3h esporádicas." },
                  { emoji: "📝", tip: "Anote dúvidas e leve para o professor. Perguntar é sinal de inteligência!" },
                  { emoji: "🧠", tip: "Revise o conteúdo 24h depois de aprender. A memória fixa melhor assim." },
                  { emoji: "🎯", tip: "Complete as missões diárias para manter o ritmo e ganhar pontos." },
                  { emoji: "🤝", tip: "Estude em grupo! Explicar para os outros ajuda a fixar." },
                  { emoji: "😴", tip: "Durma bem. O cérebro consolida o aprendizado durante o sono." },
                ].map((item, i) => (
                  <div key={i} className="flex gap-2.5 items-start rounded-xl bg-secondary/40 px-3 py-2.5">
                    <span className="text-base flex-shrink-0">{item.emoji}</span>
                    <p className="font-body text-xs text-foreground/85 leading-relaxed">{item.tip}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Sidebar ranking */}
          <motion.aside
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="hidden w-52 flex-shrink-0 lg:block"
          >
            <div className="sticky top-20 space-y-3">
              <h3 className="flex items-center gap-1.5 font-heading text-xs font-bold uppercase tracking-wide text-muted-foreground">
                <Trophy className="h-3.5 w-3.5" />
                Ranking
              </h3>
              <DashRanking userTurma={turmaId} userId={user.id} />
            </div>
          </motion.aside>
        </div>
      </section>
    </Layout>
  );
}

// ============================================================
// Mini Ranking para Dashboard
// ============================================================

function DashRanking({ userTurma, userId }: { userTurma: string; userId: string }) {
  const [turmaTop, setTurmaTop] = useState<Array<{ user_id: string; nome: string; turma_id: string; points: number }>>([]);
  const [escolaTop, setEscolaTop] = useState<Array<{ user_id: string; nome: string; turma_id: string; points: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadRanking = async () => {
      if (active) setLoading(true);
      const snapshot = await fetchLeaderboardSnapshot({
        turmaId: userTurma,
        turmaLimit: 7,
        geralLimit: 7,
      });
      if (!active) return;
      setTurmaTop(snapshot.turma);
      setEscolaTop(snapshot.geral);
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

  const turmaLabel = turmas.find(t => t.id === userTurma)?.nome || userTurma;

  const RankList = ({ entries, title, icon }: { entries: Array<{ user_id: string; nome: string; turma_id: string; points: number }>; title: string; icon: React.ReactNode }) => (
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
            const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
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
                  {isMe && <span className="ml-1 text-[9px] text-primary/70">(você)</span>}
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
      <RankList entries={turmaTop} title={turmaLabel} icon={<Medal className="h-3.5 w-3.5 text-primary" />} />
      <RankList entries={escolaTop} title="Escola" icon={<Crown className="h-3.5 w-3.5 text-accent" />} />
    </div>
  );
}

// ============================================================
// Discipline Card
// ============================================================

function DisciplineCard({ disc, index, turmaId }: { disc: DisciplinePerformance; index: number; turmaId: string }) {
  const [expanded, setExpanded] = useState(false);
  const pct = disc.performance;
  const status = pct >= 70 ? { label: "Bom", color: "text-primary", bg: "bg-primary", icon: TrendingUp } :
                 pct >= 40 ? { label: "Regular", color: "text-accent", bg: "bg-accent", icon: Target } :
                 { label: "Atenção", color: "text-destructive", bg: "bg-destructive", icon: TrendingDown };

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3 + index * 0.04 }}
      className="rounded-2xl border border-border bg-card overflow-hidden hover:shadow-sm transition-shadow"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="btn-tap w-full flex items-center gap-3 p-4 text-left"
      >
        <div className={`h-10 w-10 rounded-xl ${status.bg}/10 flex items-center justify-center flex-shrink-0`}>
          <status.icon className={`h-4 w-4 ${status.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-heading text-sm font-semibold text-foreground truncate">{disc.nome}</h3>
            <span className={`text-[9px] font-body font-medium px-1.5 py-0.5 rounded-full ${status.bg}/10 ${status.color}`}>
              {status.label}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ delay: 0.4 + index * 0.04, duration: 0.6 }}
                className={`h-full ${status.bg} rounded-full`}
              />
            </div>
            <span className="font-heading font-bold text-xs text-foreground w-9 text-right">{pct}%</span>
          </div>
        </div>
      </button>

      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          className="border-t border-border px-4 pb-4 pt-3"
        >
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="h-3.5 w-3.5 text-accent" />
            <span className="font-heading font-semibold text-xs text-foreground">Como melhorar</span>
          </div>
          <div className="space-y-1.5">
            {disc.tips.map((tip: string, i: number) => (
              <p key={i} className="font-body text-xs text-foreground/80 flex gap-2 items-start">
                <span className="flex-shrink-0">{tip.slice(0, 2)}</span>
                <span>{tip.slice(2)}</span>
              </p>
            ))}
          </div>
          <Link
            to={`/app/turmas/${turmaId}/${disc.id}`}
            className="btn-tap inline-flex items-center gap-1.5 mt-3 text-xs font-heading font-semibold text-primary hover:underline"
          >
            Estudar {disc.nome} <ArrowRight className="h-3 w-3" />
          </Link>
        </motion.div>
      )}
    </motion.div>
  );
}
