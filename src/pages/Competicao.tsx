import { useState, useEffect, useCallback, useRef } from "react";
import type { User } from "@supabase/supabase-js";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import Breadcrumbs from "@/components/Breadcrumbs";
import SimpleProfileAvatar from "@/components/SimpleProfileAvatar";
import { turmas } from "@/data/catalog";
import type { Questao } from "@/data/content-types";
import { useAuth } from "@/hooks/useAuth";
import { useStudyContent } from "@/hooks/useStudyContent";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { fetchLeaderboardSnapshot } from "@/lib/leaderboard";
import { pickRandomItems } from "@/lib/random";
import {
  calculateMissionScore,
  getStreakBonus,
  DEFAULT_MISSION_SCORING,
  loadMissionScoringConfig,
  type MissionScoreBreakdown,
  type MissionScoringConfig,
} from "@/lib/mission-scoring";
import { Clock, Trophy, Shield, Zap, Star, Medal, Target, CheckCircle, XCircle, AlertTriangle, Flame } from "lucide-react";
import Confetti from "@/components/Confetti";

type LeaderboardEntry = {
  user_id: string;
  nome: string;
  turma_id: string;
  points: number;
  missions_completed: number;
  streak_days: number;
  avatar_url: string | null;
};

type MissionTabProps = {
  user: User | null;
  todayDone: boolean;
  missionActive: boolean;
  missionComplete: boolean;
  missionQuestions: Questao[];
  currentQ: number;
  answers: Array<string | null>;
  timeLeft: number;
  score: number;
  scoreBreakdown: MissionScoreBreakdown | null;
  scoringConfig: MissionScoringConfig;
  antiCheatFlags: string[];
  missionSaving: boolean;
  missionNotice: string;
  currentStreak: number;
  onStart: () => void;
  onSelectAnswer: (answer: string) => void;
  onNext: () => void;
  onPrev: () => void;
  onFinish: () => void | Promise<void>;
  onReset: () => void;
  formatTime: (seconds: number) => string;
};

function getLocalDateStamp(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getPreviousLocalDateStamp() {
  const previousDate = new Date();
  previousDate.setDate(previousDate.getDate() - 1);
  return getLocalDateStamp(previousDate);
}

export default function Competicao() {
  const { user, profile } = useAuth();
  const { temas, loading: contentLoading } = useStudyContent();
  const [tab, setTab] = useState<"missao" | "turma" | "geral">("missao");
  const [turmaRanking, setTurmaRanking] = useState<LeaderboardEntry[]>([]);
  const [geralRanking, setGeralRanking] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayDone, setTodayDone] = useState(false);

  // Mission state
  const [missionActive, setMissionActive] = useState(false);
  const [missionQuestions, setMissionQuestions] = useState<Questao[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<(string | null)[]>([]);
  const [timeLeft, setTimeLeft] = useState(300);
  const [missionComplete, setMissionComplete] = useState(false);
  const [score, setScore] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [antiCheatFlags, setAntiCheatFlags] = useState<string[]>([]);
  const [missionSaving, setMissionSaving] = useState(false);
  const [missionNotice, setMissionNotice] = useState("");
  const [scoreBreakdown, setScoreBreakdown] = useState<MissionScoreBreakdown | null>(null);
  const [scoringConfig, setScoringConfig] = useState<MissionScoringConfig>(DEFAULT_MISSION_SCORING);
  const [currentStreak, setCurrentStreak] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const finishGuardRef = useRef(false);
  const missionQuestionsRef = useRef<Questao[]>([]);
  const answersRef = useRef<(string | null)[]>([]);
  const antiCheatFlagsRef = useRef<string[]>([]);
  const timeLeftRef = useRef(300);

  const userTurma = profile?.turma_id || "6ano";

  const fetchRankings = useCallback(async () => {
    setLoading(true);
    const snapshot = await fetchLeaderboardSnapshot({
      turmaId: userTurma,
      turmaLimit: 5,
      geralLimit: 10,
      includeStats: true,
      includeAvatar: true,
    });
    setTurmaRanking(snapshot.turma as LeaderboardEntry[]);
    setGeralRanking(snapshot.geral as LeaderboardEntry[]);

    // Check if today's mission is done + fetch current streak
    if (user) {
      const today = getLocalDateStamp();
      const [attemptRes, streakRes] = await Promise.all([
        supabase.from("mission_attempts").select("id").eq("user_id", user.id).eq("mission_date", today).maybeSingle(),
        supabase.from("student_scores").select("streak_days, last_mission_date").eq("user_id", user.id).maybeSingle(),
      ]);
      setTodayDone(!!attemptRes.data);
      if (streakRes.data) {
        // Se fez ontem ou hoje, streak é válido
        const last = streakRes.data.last_mission_date;
        const valid = last === today || last === getPreviousLocalDateStamp();
        setCurrentStreak(valid ? streakRes.data.streak_days : 0);
      }
    }
    setLoading(false);
  }, [user, userTurma]);

  useEffect(() => { fetchRankings(); }, [fetchRankings]);

  useEffect(() => {
    let active = true;

    loadMissionScoringConfig().then((config) => {
      if (active) setScoringConfig(config);
    });

    return () => {
      active = false;
    };
  }, []);

  // Realtime leaderboard
  useEffect(() => {
    const interval = window.setInterval(() => {
      void fetchRankings();
    }, 60000);

    return () => {
      window.clearInterval(interval);
    };
  }, [fetchRankings]);

  // Start mission
  const startMission = () => {
    if (contentLoading) {
      toast({
        title: "Conteudo ainda carregando",
        description: "Espere alguns segundos e tente iniciar a missao novamente.",
      });
      return;
    }

    if (todayDone || missionSaving) {
      toast({
        title: "Missao ja encerrada",
        description: "A missao diaria ja foi concluida hoje. Volte amanha para somar novos pontos.",
      });
      return;
    }

    // Get random 5 questions from user's turma
    const turmaQuestions = temas
      .filter(t => t.turmaId === userTurma)
      .flatMap(t => [...t.exercicios, ...t.simulado]);
    
    const shuffled = pickRandomItems(turmaQuestions, 5);
    if (shuffled.length === 0) {
      toast({
        title: "Sem questoes disponiveis",
        description: "Importe e salve temas para liberar a missao diaria da turma.",
        variant: "destructive",
      });
      return;
    }

    finishGuardRef.current = false;
    missionQuestionsRef.current = shuffled;
    setMissionQuestions(shuffled);
    const initialAnswers = new Array(shuffled.length).fill(null);
    answersRef.current = initialAnswers;
    setAnswers(initialAnswers);
    setCurrentQ(0);
    timeLeftRef.current = 300;
    setTimeLeft(300);
    setMissionActive(true);
    setMissionComplete(false);
    antiCheatFlagsRef.current = [];
    setAntiCheatFlags([]);
    setScore(0);
    setScoreBreakdown(null);
    setMissionSaving(false);
    setMissionNotice("");
  };

  // Timer
  const finishMission = useCallback(async () => {
    if (finishGuardRef.current) return;
    finishGuardRef.current = true;
    clearInterval(timerRef.current);
    setMissionComplete(true);
    setMissionSaving(true);

    const breakdown = calculateMissionScore(
      missionQuestionsRef.current,
      answersRef.current,
      antiCheatFlagsRef.current,
      scoringConfig,
      currentStreak,
    );
    const earnedPoints = breakdown.totalPoints;
    const correct = breakdown.correctAnswers;

    setScoreBreakdown(breakdown);
    setScore(earnedPoints);
    setMissionNotice("");

    if (correct >= 3) setShowConfetti(true);

    if (!user) {
      setMissionSaving(false);
      return;
    }

    const today = getLocalDateStamp();
    setTodayDone(true);

    const { error: attemptError } = await supabase.from("mission_attempts").insert({
      user_id: user.id,
      mission_date: today,
      turma_id: userTurma,
      score: earnedPoints,
      total_questions: missionQuestionsRef.current.length,
      correct_answers: correct,
      time_spent_seconds: 300 - timeLeftRef.current,
      anti_cheat_flags: { flags: antiCheatFlagsRef.current },
    });

    if (attemptError) {
      if (attemptError.code === "23505") {
        setMissionNotice("Sua missao de hoje ja estava registrada. Os pontos nao foram somados novamente.");
        toast({
          title: "Missao ja registrada",
          description: "Sua pontuacao de hoje nao foi duplicada.",
        });
      } else {
        setTodayDone(false);
        setMissionNotice("Nao foi possivel registrar a missao agora. Tente novamente em instantes.");
        toast({
          title: "Erro ao salvar a missao",
          description: "A tentativa nao foi registrada. Tente novamente.",
          variant: "destructive",
        });
      }

      setMissionSaving(false);
      fetchRankings();
      return;
    }

    const { data: existing } = await supabase
      .from("student_scores")
      .select("points, missions_completed, streak_days, last_mission_date")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      const lastDate = existing.last_mission_date;
      const isStreak = lastDate === getPreviousLocalDateStamp();

      const { error: updateError } = await supabase.from("student_scores").update({
        points: existing.points + earnedPoints,
        missions_completed: existing.missions_completed + 1,
        streak_days: isStreak ? existing.streak_days + 1 : 1,
        last_mission_date: today,
      }).eq("user_id", user.id);

      if (updateError) {
        setMissionNotice("A tentativa foi salva, mas o ranking nao atualizou agora.");
        toast({
          title: "Ranking pendente",
          description: "A missao foi registrada, mas houve erro ao atualizar os pontos.",
          variant: "destructive",
        });
      } else {
        setMissionNotice("Pontuacao registrada com sucesso no ranking.");
      }
    } else {
      const { error: insertScoreError } = await supabase.from("student_scores").insert({
        user_id: user.id,
        turma_id: userTurma,
        points: earnedPoints,
        missions_completed: 1,
        streak_days: 1,
        last_mission_date: today,
      });

      if (insertScoreError) {
        setMissionNotice("A tentativa foi salva, mas o ranking nao atualizou agora.");
        toast({
          title: "Ranking pendente",
          description: "A missao foi registrada, mas houve erro ao criar a pontuacao.",
          variant: "destructive",
        });
      } else {
        setMissionNotice("Pontuacao registrada com sucesso no ranking.");
      }
    }

    setMissionSaving(false);
    fetchRankings();
  }, [fetchRankings, scoringConfig, user, userTurma]);

  useEffect(() => {
    if (!missionActive || missionComplete) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          timeLeftRef.current = 0;
          finishMission();
          return 0;
        }
        const nextValue = prev - 1;
        timeLeftRef.current = nextValue;
        return nextValue;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [finishMission, missionActive, missionComplete]);

  // Anti-cheat: detect tab blur
  useEffect(() => {
    if (!missionActive || missionComplete) return;
    const handleBlur = () => {
      const nextFlags = [...antiCheatFlagsRef.current, `blur_${Date.now()}`];
      antiCheatFlagsRef.current = nextFlags;
      setAntiCheatFlags(nextFlags);
    };
    window.addEventListener("blur", handleBlur);
    return () => window.removeEventListener("blur", handleBlur);
  }, [missionActive, missionComplete]);

  const selectAnswer = (answer: string) => {
    const newAnswers = [...answers];
    newAnswers[currentQ] = answer;
    answersRef.current = newAnswers;
    setAnswers(newAnswers);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  const tabs = [
    { key: "missao" as const, label: "Missão", icon: "🎯" },
    { key: "turma" as const, label: "Minha Turma", icon: "🏫" },
    { key: "geral" as const, label: "Interclasse", icon: "🏆" },
  ];

  return (
    <Layout>
      {showConfetti && <Confetti show={showConfetti} />}
      <Breadcrumbs items={[{ label: "Competição" }]} />
      <section className="container mx-auto px-4 py-8 max-w-2xl">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-heading font-extrabold text-3xl md:text-4xl text-foreground mb-1">
            🏆 Arena
          </h1>
          <p className="text-muted-foreground font-body mb-8">Missões diárias e ranking. Mostre quem manda!</p>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-1 bg-secondary/50 p-1 rounded-2xl mb-8">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`btn-tap flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-heading font-semibold text-sm transition-all ${
                tab === t.key
                  ? "bg-card text-foreground shadow-card"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>{t.icon}</span>
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {tab === "missao" && (
              <MissaoTabAtualizada
                user={user}
                todayDone={todayDone}
                missionActive={missionActive}
                missionComplete={missionComplete}
                missionQuestions={missionQuestions}
                currentQ={currentQ}
                answers={answers}
                timeLeft={timeLeft}
                score={score}
                scoreBreakdown={scoreBreakdown}
                scoringConfig={scoringConfig}
                antiCheatFlags={antiCheatFlags}
                missionSaving={missionSaving}
                missionNotice={missionNotice}
                currentStreak={currentStreak}
                onStart={startMission}
                onSelectAnswer={selectAnswer}
                onNext={() => setCurrentQ(prev => Math.min(prev + 1, missionQuestions.length - 1))}
                onPrev={() => setCurrentQ(prev => Math.max(prev - 1, 0))}
                onFinish={finishMission}
                onReset={() => { setMissionActive(false); setMissionComplete(false); setShowConfetti(false); }}
                formatTime={formatTime}
              />
            )}
            {tab === "turma" && (
              <RankingTab
                title={`Top 5 — ${turmas.find(t => t.id === userTurma)?.nome || userTurma}`}
                entries={turmaRanking}
                loading={loading}
                currentUserId={user?.id}
                maxEntries={5}
              />
            )}
            {tab === "geral" && (
              <RankingTab
                title="Top 10 — Interclasse 🔥"
                entries={geralRanking}
                loading={loading}
                currentUserId={user?.id}
                maxEntries={10}
                showTurma
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Competition phases */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-10 glass-card rounded-2xl p-6"
        >
          <h2 className="font-heading font-bold text-lg text-foreground flex items-center gap-2 mb-4">
            <Shield className="h-5 w-5 text-primary" /> Etapas da Competição
          </h2>
          <div className="space-y-3">
            {[
              { n: 1, title: "Fase Online", desc: "Missões diárias. Acumule pontos!", color: "bg-primary/10 text-primary" },
              { n: 2, title: "Semifinal Interclasse", desc: "Os melhores de cada turma se enfrentam.", color: "bg-accent/10 text-accent" },
              { n: 3, title: "Final Presencial", desc: "Prova ao vivo na escola. Quem será o campeão?", color: "bg-success/10 text-success" },
            ].map((step) => (
              <div key={step.n} className="flex items-start gap-3">
                <div className={`h-8 w-8 rounded-xl ${step.color} flex items-center justify-center font-heading font-bold text-sm flex-shrink-0`}>
                  {step.n}
                </div>
                <div>
                  <p className="font-heading font-semibold text-foreground text-sm">{step.title}</p>
                  <p className="text-muted-foreground text-xs font-body">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </section>
    </Layout>
  );
}

// ============ Mission Tab ============
function MissaoTab({
  user, todayDone, missionActive, missionComplete, missionQuestions, currentQ, answers,
  timeLeft, score, antiCheatFlags, onStart, onSelectAnswer, onNext, onPrev, onFinish, onReset, formatTime,
}: MissionTabProps) {
  if (!user) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center">
        <Target className="h-12 w-12 text-primary mx-auto mb-4 opacity-50" />
        <h2 className="font-heading font-bold text-xl text-foreground mb-2">Faça login para jogar!</h2>
        <p className="text-muted-foreground font-body text-sm">Entre na sua conta para participar das missões diárias.</p>
      </div>
    );
  }

  if (missionComplete) {
    const correct = missionQuestions.filter((q: Questao, i: number) => answers[i] === q.respostaCorreta).length;
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card rounded-2xl p-8 text-center"
      >
        <div className="text-6xl mb-4">{correct >= 4 ? "🏆" : correct >= 3 ? "🎉" : correct >= 2 ? "👍" : "💪"}</div>
        <h2 className="font-heading font-extrabold text-2xl text-foreground mb-2">Missão Completa!</h2>
        <div className="flex items-center justify-center gap-6 my-6">
          <div className="text-center">
            <div className="font-heading font-extrabold text-3xl text-primary">{correct}/{missionQuestions.length}</div>
            <div className="text-xs text-muted-foreground font-body">Acertos</div>
          </div>
          <div className="h-12 w-px bg-border" />
          <div className="text-center">
            <div className="font-heading font-extrabold text-3xl text-accent">+{score}</div>
            <div className="text-xs text-muted-foreground font-body">Pontos</div>
          </div>
        </div>
        {antiCheatFlags.length > 0 && (
          <div className="flex items-center justify-center gap-2 text-accent text-xs font-body mb-4">
            <AlertTriangle className="h-3.5 w-3.5" />
            Detectamos saída da aba ({antiCheatFlags.length}x) — sem bônus de fair play
          </div>
        )}
        {/* Show answers */}
        <div className="space-y-2 mt-6 text-left">
          {missionQuestions.map((q: Questao, i: number) => {
            const isCorrect = answers[i] === q.respostaCorreta;
            return (
              <div key={q.id} className={`flex items-start gap-3 p-3 rounded-xl text-sm ${isCorrect ? "bg-success/10" : "bg-destructive/10"}`}>
                {isCorrect ? <CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" /> : <XCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />}
                <div className="min-w-0">
                  <p className="font-body text-foreground truncate">{q.enunciado}</p>
                  {!isCorrect && <p className="text-xs text-muted-foreground mt-0.5">Resposta: {q.respostaCorreta}</p>}
                </div>
              </div>
            );
          })}
        </div>
        <button onClick={onReset} className="btn-tap mt-6 bg-secondary text-foreground font-heading font-semibold px-6 py-3 rounded-xl hover:bg-secondary/80 transition-all text-sm">
          Voltar
        </button>
      </motion.div>
    );
  }

  if (missionActive) {
    const q = missionQuestions[currentQ];
    const isTimeWarning = timeLeft <= 60;
    return (
      <div className="space-y-4">
        {/* Progress bar */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex gap-1.5">
            {missionQuestions.map((_, i: number) => (
              <div
                key={i}
                className={`h-2 w-8 rounded-full transition-all ${
                  answers[i] !== null ? "bg-primary" : i === currentQ ? "bg-primary/40" : "bg-border"
                }`}
              />
            ))}
          </div>
          <div className={`flex items-center gap-1.5 font-heading font-bold text-sm ${isTimeWarning ? "text-destructive" : "text-foreground"}`}>
            <Clock className="h-4 w-4" />
            {formatTime(timeLeft)}
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-body text-muted-foreground">Questão {currentQ + 1} de {missionQuestions.length}</span>
            <span className={`text-[10px] font-body px-2 py-0.5 rounded-full ${
              q.dificuldade === "facil" ? "bg-success/10 text-success" : q.dificuldade === "medio" ? "bg-accent/10 text-accent" : "bg-destructive/10 text-destructive"
            }`}>
              {q.dificuldade}
            </span>
          </div>
          <h3 className="font-heading font-bold text-lg text-foreground mb-5">{q.enunciado}</h3>

          {q.tipo === "multipla_escolha" && q.alternativas ? (
            <div className="space-y-2">
              {q.alternativas.map((alt, i) => (
                <button
                  key={i}
                  onClick={() => onSelectAnswer(alt)}
                  className={`btn-tap w-full text-left px-4 py-3.5 rounded-xl border-2 font-body text-sm transition-all ${
                    answers[currentQ] === alt
                      ? "border-primary bg-primary/10 text-foreground font-medium"
                      : "border-border hover:border-primary/30 text-foreground/80 hover:bg-secondary"
                  }`}
                >
                  <span className="font-heading font-bold text-primary mr-2">{String.fromCharCode(65 + i)}.</span>
                  {alt}
                </button>
              ))}
            </div>
          ) : (
            <input
              type="text"
              value={answers[currentQ] || ""}
              onChange={(e) => onSelectAnswer(e.target.value)}
              placeholder="Digite sua resposta..."
              className="w-full px-4 py-3.5 rounded-xl border-2 border-border bg-background font-body text-sm focus:outline-none focus:border-primary transition-all"
            />
          )}
        </div>

        <div className="flex justify-between gap-3">
          <button
            onClick={onPrev}
            disabled={currentQ === 0}
            className="btn-tap px-5 py-3 rounded-xl border-2 border-border text-foreground font-heading font-semibold text-sm hover:bg-secondary transition-all disabled:opacity-40"
          >
            ← Anterior
          </button>
          {currentQ === missionQuestions.length - 1 ? (
            <button
              onClick={onFinish}
              className="btn-tap px-6 py-3 rounded-xl bg-primary text-primary-foreground font-heading font-bold text-sm hover:bg-primary/90 transition-all hover:shadow-glow"
            >
              Finalizar ✅
            </button>
          ) : (
            <button
              onClick={onNext}
              className="btn-tap px-5 py-3 rounded-xl bg-primary text-primary-foreground font-heading font-semibold text-sm hover:bg-primary/90 transition-all"
            >
              Próxima →
            </button>
          )}
        </div>
      </div>
    );
  }

  // Mission start screen
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-card rounded-2xl p-8 text-center"
    >
      <motion.div
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="text-6xl mb-4"
      >
        🎯
      </motion.div>
      <h2 className="font-heading font-extrabold text-2xl text-foreground mb-2">Missão Diária</h2>
      <p className="text-muted-foreground font-body text-sm mb-6">5 questões da sua turma • 5 minutos</p>

      <div className="flex items-center justify-center gap-4 mb-6 text-sm">
        <div className="flex items-center gap-1.5 text-primary font-body">
          <Zap className="h-4 w-4" /> +20 pts/acerto
        </div>
        <div className="flex items-center gap-1.5 text-success font-body">
          <Star className="h-4 w-4" /> +10 fair play
        </div>
      </div>

      {todayDone ? (
        <div className="bg-success/10 text-success font-body font-medium px-6 py-3 rounded-xl inline-flex items-center gap-2">
          <CheckCircle className="h-4 w-4" /> Missão de hoje concluída! Volte amanhã.
        </div>
      ) : (
        <button
          onClick={onStart}
          className="btn-tap bg-primary text-primary-foreground font-heading font-bold px-8 py-4 rounded-2xl hover:bg-primary/90 transition-all hover:shadow-glow text-base interactive-pulse"
        >
          🚀 Iniciar Missão
        </button>
      )}
    </motion.div>
  );
}

function MissaoTabAtualizada({
  user,
  todayDone,
  missionActive,
  missionComplete,
  missionQuestions,
  currentQ,
  answers,
  timeLeft,
  score,
  scoreBreakdown,
  scoringConfig,
  antiCheatFlags,
  missionSaving,
  missionNotice,
  currentStreak,
  onStart,
  onSelectAnswer,
  onNext,
  onPrev,
  onFinish,
  onReset,
  formatTime,
}: MissionTabProps) {
  if (!user) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center">
        <Target className="mx-auto mb-4 h-12 w-12 text-primary opacity-50" />
        <h2 className="mb-2 font-heading text-xl font-bold text-foreground">Faca login para jogar!</h2>
        <p className="font-body text-sm text-muted-foreground">
          Entre na sua conta para participar das missoes diarias.
        </p>
      </div>
    );
  }

  if (missionComplete) {
    const correct = missionQuestions.filter((q: Questao, i: number) => answers[i] === q.respostaCorreta).length;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card rounded-2xl p-8 text-center"
      >
        <div className="mb-4 text-6xl">{correct >= 4 ? "🏆" : correct >= 3 ? "🎉" : correct >= 2 ? "👍" : "💪"}</div>
        <h2 className="mb-2 font-heading text-2xl font-extrabold text-foreground">Missao completa!</h2>

        <div className="my-6 flex items-center justify-center gap-6">
          <div className="text-center">
            <div className="font-heading text-3xl font-extrabold text-primary">{correct}/{missionQuestions.length}</div>
            <div className="font-body text-xs text-muted-foreground">Acertos</div>
          </div>
          <div className="h-12 w-px bg-border" />
          <div className="text-center">
            <div className="font-heading text-3xl font-extrabold text-accent">+{score}</div>
            <div className="font-body text-xs text-muted-foreground">Pontos</div>
          </div>
        </div>

        {scoreBreakdown && (
          <div className="grid gap-2 rounded-2xl border border-border bg-background/70 p-4 text-left text-sm sm:grid-cols-2">
            <ScoreRuleCard
              label="Faceis"
              count={scoreBreakdown.easyCorrect}
              points={scoringConfig.easyPoints}
              total={scoreBreakdown.easyCorrect * scoringConfig.easyPoints}
            />
            <ScoreRuleCard
              label="Medias"
              count={scoreBreakdown.mediumCorrect}
              points={scoringConfig.mediumPoints}
              total={scoreBreakdown.mediumCorrect * scoringConfig.mediumPoints}
            />
            <ScoreRuleCard
              label="Dificeis"
              count={scoreBreakdown.hardCorrect}
              points={scoringConfig.hardPoints}
              total={scoreBreakdown.hardCorrect * scoringConfig.hardPoints}
            />
            <div className="rounded-xl bg-card px-4 py-3">
              <p className="font-heading text-xs uppercase tracking-[0.18em] text-muted-foreground">Fair play</p>
              <p className="mt-1 font-body text-foreground">+{scoreBreakdown.fairPlayBonus}</p>
            </div>
            {scoreBreakdown.streakBonus > 0 && (
              <div className="rounded-xl bg-destructive/10 px-4 py-3">
                <p className="font-heading text-xs uppercase tracking-[0.18em] text-destructive">Retorno diário</p>
                <p className="mt-1 font-body text-destructive font-semibold">+{scoreBreakdown.streakBonus}</p>
              </div>
            )}
          </div>
        )}

        {antiCheatFlags.length > 0 && (
          <div className="mb-4 mt-4 flex items-center justify-center gap-2 text-xs text-accent">
            <AlertTriangle className="h-3.5 w-3.5" />
            Detectamos saida da aba ({antiCheatFlags.length}x) - sem bonus de fair play
          </div>
        )}

        {missionNotice && (
          <div className="mt-4 rounded-2xl border border-border bg-background/70 px-4 py-3 text-sm text-muted-foreground">
            {missionNotice}
          </div>
        )}

        <div className="mt-6 space-y-2 text-left">
          {missionQuestions.map((q: Questao, i: number) => {
            const isCorrect = answers[i] === q.respostaCorreta;

            return (
              <div
                key={q.id}
                className={`flex items-start gap-3 rounded-xl p-3 text-sm ${isCorrect ? "bg-success/10" : "bg-destructive/10"}`}
              >
                {isCorrect ? (
                  <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-success" />
                ) : (
                  <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />
                )}
                <div className="min-w-0">
                  <p className="font-body text-foreground truncate">{q.enunciado}</p>
                  {!isCorrect && (
                    <p className="mt-0.5 text-xs text-muted-foreground">Resposta: {q.respostaCorreta}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={onReset}
          disabled={missionSaving}
          className="btn-tap mt-6 rounded-xl bg-secondary px-6 py-3 font-heading text-sm font-semibold text-foreground transition-all hover:bg-secondary/80 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {missionSaving ? "Registrando..." : "Voltar"}
        </button>
      </motion.div>
    );
  }

  if (missionActive) {
    const q = missionQuestions[currentQ];
    const isTimeWarning = timeLeft <= 60;

    return (
      <div className="space-y-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex gap-1.5">
            {missionQuestions.map((_, i: number) => (
              <div
                key={i}
                className={`h-2 w-8 rounded-full transition-all ${
                  answers[i] !== null ? "bg-primary" : i === currentQ ? "bg-primary/40" : "bg-border"
                }`}
              />
            ))}
          </div>
          <div className={`flex items-center gap-1.5 font-heading text-sm font-bold ${isTimeWarning ? "text-destructive" : "text-foreground"}`}>
            <Clock className="h-4 w-4" />
            {formatTime(timeLeft)}
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6">
          <div className="mb-1 flex items-center gap-2">
            <span className="font-body text-xs text-muted-foreground">
              Questao {currentQ + 1} de {missionQuestions.length}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-body ${
                q.dificuldade === "facil"
                  ? "bg-success/10 text-success"
                  : q.dificuldade === "medio"
                    ? "bg-accent/10 text-accent"
                    : "bg-destructive/10 text-destructive"
              }`}
            >
              {q.dificuldade}
            </span>
          </div>
          <h3 className="mb-5 font-heading text-lg font-bold text-foreground">{q.enunciado}</h3>

          {q.tipo === "multipla_escolha" && q.alternativas ? (
            <div className="space-y-2">
              {q.alternativas.map((alt, i) => (
                <button
                  key={i}
                  onClick={() => onSelectAnswer(alt)}
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
              onChange={(e) => onSelectAnswer(e.target.value)}
              placeholder="Digite sua resposta..."
              className="w-full rounded-xl border-2 border-border bg-background px-4 py-3.5 font-body text-sm transition-all focus:border-primary focus:outline-none"
            />
          )}
        </div>

        <div className="flex justify-between gap-3">
          <button
            onClick={onPrev}
            disabled={currentQ === 0}
            className="btn-tap rounded-xl border-2 border-border px-5 py-3 font-heading text-sm font-semibold text-foreground transition-all hover:bg-secondary disabled:opacity-40"
          >
            ← Anterior
          </button>
          {currentQ === missionQuestions.length - 1 ? (
            <button
              onClick={onFinish}
              className="btn-tap rounded-xl bg-primary px-6 py-3 font-heading text-sm font-bold text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-glow"
            >
              Finalizar ✓
            </button>
          ) : (
            <button
              onClick={onNext}
              className="btn-tap rounded-xl bg-primary px-5 py-3 font-heading text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90"
            >
              Proxima →
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-card rounded-2xl p-8 text-center"
    >
      <motion.div
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="mb-4 text-6xl"
      >
        🎯
      </motion.div>
      <h2 className="mb-2 font-heading text-2xl font-extrabold text-foreground">Missao diaria</h2>
      <p className="mb-6 font-body text-sm text-muted-foreground">5 questoes da sua turma - 5 minutos</p>

      <div className="mb-6 flex flex-wrap items-center justify-center gap-3 text-sm">
        <div className="flex items-center gap-1.5 font-body text-primary">
          <Zap className="h-4 w-4" /> Facil +{scoringConfig.easyPoints}
        </div>
        <div className="flex items-center gap-1.5 font-body text-accent">
          <Target className="h-4 w-4" /> Medio +{scoringConfig.mediumPoints}
        </div>
        <div className="flex items-center gap-1.5 font-body text-destructive">
          <AlertTriangle className="h-4 w-4" /> Dificil +{scoringConfig.hardPoints}
        </div>
        <div className="flex items-center gap-1.5 font-body text-success">
          <Star className="h-4 w-4" /> Fair play +{scoringConfig.fairPlayBonus}
        </div>
      </div>

      {/* Streak bonus info */}
      {currentStreak >= 3 && (
        <div className="mb-4 flex items-center justify-center gap-2 rounded-xl bg-destructive/10 px-4 py-2 text-sm">
          <Flame className="h-4 w-4 text-destructive" />
          <span className="font-body text-destructive font-medium">
            Sequência de {currentStreak} dias! Bônus: +{getStreakBonus(currentStreak).bonus} pts
          </span>
        </div>
      )}
      {currentStreak > 0 && currentStreak < 3 && (
        <p className="mb-4 font-body text-xs text-muted-foreground">
          Sequência: {currentStreak} dia(s) — continue voltando para ganhar bônus a partir de 3 dias!
        </p>
      )}

      {todayDone ? (
        <div className="inline-flex items-center gap-2 rounded-xl bg-success/10 px-6 py-3 font-body font-medium text-success">
          <CheckCircle className="h-4 w-4" /> Missao de hoje concluida! Volte amanha.
        </div>
      ) : (
        <button
          onClick={onStart}
          className="btn-tap interactive-pulse rounded-2xl bg-primary px-8 py-4 font-heading text-base font-bold text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-glow"
        >
          🚀 Iniciar missao
        </button>
      )}
    </motion.div>
  );
}

function ScoreRuleCard({ label, count, points, total }: { label: string; count: number; points: number; total: number }) {
  return (
    <div className="rounded-xl bg-card px-4 py-3">
      <p className="font-heading text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-1 font-body text-foreground">
        {count} x {points} = {total}
      </p>
    </div>
  );
}

// ============ Ranking Tab ============
function RankingTab({ title, entries, loading, currentUserId, maxEntries, showTurma }: {
  title: string;
  entries: LeaderboardEntry[];
  loading: boolean;
  currentUserId?: string;
  maxEntries: number;
  showTurma?: boolean;
}) {
  const getMedalEmoji = (pos: number) => {
    if (pos === 0) return "🥇";
    if (pos === 1) return "🥈";
    if (pos === 2) return "🥉";
    return null;
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 bg-secondary/50 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center">
        <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-30" />
        <h3 className="font-heading font-bold text-lg text-foreground mb-2">Nenhum jogador ainda</h3>
        <p className="text-muted-foreground font-body text-sm">Complete missões para aparecer no ranking!</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="font-heading font-bold text-lg text-foreground mb-4">{title}</h2>
      <div className="space-y-2">
        {entries.map((entry, i) => {
          const medal = getMedalEmoji(i);
          const isMe = entry.user_id === currentUserId;
          const turmaLabel = turmas.find(t => t.id === entry.turma_id)?.nome;
          return (
            <motion.div
              key={entry.user_id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 transition-all ${
                isMe
                  ? "border-primary/40 bg-primary/5"
                  : i < 3
                  ? "border-accent/20 bg-accent/5"
                  : "border-border bg-card"
              }`}
            >
              {/* Position */}
              <div className="w-10 flex-shrink-0 text-center">
                {medal ? (
                  <span className="text-2xl">{medal}</span>
                ) : (
                  <span className="font-heading font-bold text-lg text-muted-foreground">{i + 1}</span>
                )}
              </div>

              {/* Avatar */}
              <SimpleProfileAvatar size="md" src={entry.avatar_url} showBadge={false} />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`font-heading font-semibold text-sm truncate ${isMe ? "text-primary" : "text-foreground"}`}>
                    {entry.nome}
                    {isMe && <span className="text-xs ml-1">(você)</span>}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-body">
                  {showTurma && turmaLabel && <span>{turmaLabel}</span>}
                  <span>🔥 {entry.streak_days}d</span>
                  <span>📋 {entry.missions_completed}</span>
                </div>
              </div>

              {/* Points */}
              <div className="text-right flex-shrink-0">
                <div className="font-heading font-extrabold text-lg text-primary">{entry.points}</div>
                <div className="text-[10px] text-muted-foreground font-body">pts</div>
              </div>
              {!isMe ? (
                <Link
                  to={`/app/duelo?targetUserId=${entry.user_id}&targetName=${encodeURIComponent(entry.nome)}&targetTurma=${encodeURIComponent(entry.turma_id ?? "")}`}
                  className="btn-tap rounded-xl border border-primary/20 bg-primary/10 px-3 py-2 text-[11px] font-heading font-bold text-primary transition-all hover:bg-primary hover:text-primary-foreground"
                >
                  Desafiar
                </Link>
              ) : null}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
