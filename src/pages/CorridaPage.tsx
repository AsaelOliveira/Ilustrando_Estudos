import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { Flag, Play, Plus, LogIn, Users, Home, RotateCcw, Trophy, Crown, Copy, Check, ChevronDown } from "lucide-react";
import Layout from "@/components/Layout";
import SimpleProfileAvatar from "@/components/SimpleProfileAvatar";
import Confetti from "@/components/Confetti";
import { useAuth } from "@/hooks/useAuth";
import { useStudyContent } from "@/hooks/useStudyContent";
import { supabase } from "@/integrations/supabase/client";
import { disciplinas } from "@/data/catalog";
import type { Questao } from "@/data/content-types";
import { pickRandomItems } from "@/lib/random";
import { toast } from "sonner";

// ============================================================
// Corrida de Sinapses — minijogo em tempo real com os avatares
// Schema: supabase/migrations/20260725130000_add_races.sql
// TODO(pontos): decidir com o dono se a corrida concede pontos/Sinapses.
// ============================================================

type Race = {
  id: string;
  code: string;
  host_id: string;
  turma_id: string;
  status: "waiting" | "racing" | "finished";
  questions: unknown;
  started_at: string | null;
};

type RacePlayer = {
  race_id: string;
  user_id: string;
  nome: string;
  progress: number;
  answers: number;
  finished_at: string | null;
};

type RaceConfig = {
  disciplinaId: string | null; // null = todas
  dificuldade: "todas" | "facil" | "medio" | "dificil";
  numQuestoes: number;
};

const LETTERS = ["A", "B", "C", "D"];
// Sempre literais para o JIT do Tailwind enxergar (nunca montar dinamicamente)
const LANE_BG = [
  "bg-brand-green/10",
  "bg-brand-blue/10",
  "bg-brand-yellow/10",
  "bg-brand-purple/10",
  "bg-brand-pink/10",
  "bg-brand-orange/10",
] as const;
const DIFICULDADE_LABEL: Record<RaceConfig["dificuldade"], string> = {
  todas: "Todas",
  facil: "Fácil",
  medio: "Médio",
  dificil: "Difícil",
};

function makeCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

const CHECKER = {
  backgroundImage:
    "repeating-conic-gradient(hsl(var(--foreground) / 0.28) 0% 25%, transparent 0% 50%)",
  backgroundSize: "10px 10px",
};

export default function CorridaPage() {
  const { user, profile } = useAuth();
  const { temas, loading: temasLoading } = useStudyContent();

  const [race, setRace] = useState<Race | null>(null);
  const [players, setPlayers] = useState<RacePlayer[]>([]);
  const [avatars, setAvatars] = useState<Record<string, string | null>>({});
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [cfg, setCfg] = useState<RaceConfig>({ disciplinaId: null, dificuldade: "todas", numQuestoes: 5 });

  // estado da partida local
  const [questionIndex, setQuestionIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [myProgress, setMyProgress] = useState(0);
  const [myAnswers, setMyAnswers] = useState(0);
  const [combo, setCombo] = useState(0);
  const advanceTimeout = useRef<ReturnType<typeof setTimeout>>();

  const questions = useMemo(() => (race?.questions as Questao[] | undefined) ?? [], [race]);
  const totalQuestions = questions.length || cfg.numQuestoes;
  const isHost = race?.host_id === user?.id;
  const iFinished = myAnswers >= totalQuestions && race != null;

  const turmaId = profile?.turma_id || "6ano";
  const disciplinasDaTurma = useMemo(() => disciplinas.filter((d) => d.turmaId === turmaId), [turmaId]);

  const loadPlayers = useCallback(async (raceId: string) => {
    const { data } = await supabase.from("race_players").select("*").eq("race_id", raceId);
    const list = (data ?? []) as RacePlayer[];
    setPlayers(list);
    const ids = list.map((p) => p.user_id);
    if (ids.length > 0) {
      const { data: profs } = await supabase.from("profiles").select("user_id, avatar_url").in("user_id", ids);
      if (profs) {
        const map: Record<string, string | null> = {};
        profs.forEach((p) => { map[p.user_id] = p.avatar_url; });
        setAvatars(map);
      }
    }
  }, []);

  useEffect(() => {
    if (!race) return;
    const channel = supabase
      .channel(`race:${race.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "races", filter: `id=eq.${race.id}` }, (payload) => {
        setRace(payload.new as Race);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "race_players", filter: `race_id=eq.${race.id}` }, () => {
        void loadPlayers(race.id);
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [race, loadPlayers]);

  useEffect(() => () => clearTimeout(advanceTimeout.current), []);

  const createRace = async () => {
    if (!user || !profile) return;
    let pool = temas
      .filter((t) => t.turmaId === turmaId)
      .filter((t) => !cfg.disciplinaId || t.disciplinaId === cfg.disciplinaId)
      .flatMap((t) => [...t.exercicios, ...t.simulado])
      .filter((q) => q.tipo === "multipla_escolha" && q.alternativas && q.alternativas.length >= 2)
      .filter((q) => cfg.dificuldade === "todas" || q.dificuldade === cfg.dificuldade);
    if (pool.length < 3) {
      toast.error("Poucas questões com esses filtros. Tenta outra combinação!");
      return;
    }
    const pickedQuestions = pickRandomItems(pool, Math.min(cfg.numQuestoes, pool.length));
    setBusy(true);
    const { data: newRace, error } = await supabase
      .from("races")
      .insert({ code: makeCode(), host_id: user.id, turma_id: turmaId, questions: pickedQuestions as never })
      .select()
      .single();
    if (error || !newRace) {
      setBusy(false);
      toast.error("Não consegui criar a corrida. Tente de novo!");
      return;
    }
    await supabase.from("race_players").insert({ race_id: newRace.id, user_id: user.id, nome: profile.nome?.split(" ")[0] || "Aluno" });
    setBusy(false);
    setRace(newRace as Race);
    void loadPlayers(newRace.id);
    toast.success("Corrida criada! Chame a turma com o código.");
  };

  const joinRace = async () => {
    if (!user || !profile || joinCode.trim().length < 4) return;
    setBusy(true);
    const { data: found } = await supabase.from("races").select("*").eq("code", joinCode.trim().toUpperCase()).maybeSingle();
    if (!found) {
      setBusy(false);
      toast.error("Código não encontrado. Confere com quem criou!");
      return;
    }
    if (found.status !== "waiting") {
      setBusy(false);
      toast.error("Essa corrida já começou. Pede o código da próxima!");
      return;
    }
    await supabase.from("race_players").upsert({ race_id: found.id, user_id: user.id, nome: profile.nome?.split(" ")[0] || "Aluno" });
    setBusy(false);
    setRace(found as Race);
    void loadPlayers(found.id);
  };

  const startRace = async () => {
    if (!race || !isHost) return;
    await supabase.from("races").update({ status: "racing", started_at: new Date().toISOString() }).eq("id", race.id);
  };

  const endRace = async () => {
    if (!race || !isHost) return;
    await supabase.from("races").update({ status: "finished" }).eq("id", race.id);
  };

  const answer = async (alt: string) => {
    if (!race || !user || picked !== null || race.status !== "racing") return;
    const q = questions[questionIndex];
    const correct = alt === q.respostaCorreta;
    const nextAnswers = myAnswers + 1;
    const nextProgress = myProgress + (correct ? 1 : 0);
    setPicked(alt);
    setMyAnswers(nextAnswers);
    setMyProgress(nextProgress);
    setCombo((c) => (correct ? c + 1 : 0));
    const done = nextAnswers >= totalQuestions;
    await supabase
      .from("race_players")
      .update({ answers: nextAnswers, progress: nextProgress, finished_at: done ? new Date().toISOString() : null })
      .eq("race_id", race.id)
      .eq("user_id", user.id);
    if (done) {
      toast.success("Você cruzou a linha de chegada! 🏁");
    } else {
      advanceTimeout.current = setTimeout(() => {
        setQuestionIndex((i) => i + 1);
        setPicked(null);
      }, 750);
    }
  };

  const copyCode = async () => {
    if (!race) return;
    try {
      await navigator.clipboard.writeText(race.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Não consegui copiar — anota aí: " + race.code);
    }
  };

  const resetToLobby = () => {
    setRace(null);
    setPlayers([]);
    setAvatars({});
    setQuestionIndex(0);
    setPicked(null);
    setMyProgress(0);
    setMyAnswers(0);
    setCombo(0);
    setJoinCode("");
  };

  const podium = useMemo(
    () =>
      [...players].sort((a, b) => {
        if (a.finished_at && b.finished_at) return a.finished_at.localeCompare(b.finished_at);
        if (a.finished_at) return -1;
        if (b.finished_at) return 1;
        return b.progress - a.progress;
      }),
    [players],
  );

  const leaderProgress = Math.max(0, ...players.map((p) => p.progress));
  const allFinished = players.length > 0 && players.every((p) => p.finished_at);
  const showPodium = race?.status === "finished" || allFinished;
  const iWon = showPodium && podium[0]?.user_id === user?.id && players.length > 1;

  // ---------------- Telas ----------------

  const selectClass = "w-full appearance-none rounded-xl border-2 border-frame bg-card px-4 py-3 pr-10 font-body text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

  const renderLobby = () => (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="card-flat relative overflow-hidden p-6 text-center sm:p-8">
        <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-brand-pink/15" />
        <div className="absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-brand-blue/10" />
        <motion.div
          animate={{ rotate: [0, -8, 8, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-brand-pink/15 text-brand-pink"
        >
          <Flag className="h-10 w-10" />
        </motion.div>
        <h1 className="font-heading text-3xl font-black text-foreground">
          Corrida de <span className="text-gradient">Sinapses</span>
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
          Todo mundo responde ao mesmo tempo — a cada acerto, seu avatar dispara na pista. Quem cruzar primeiro, vence!
        </p>
      </div>

      <div className="card-flat p-5">
        <h2 className="font-heading text-base font-extrabold text-foreground">Criar uma corrida</h2>
        <p className="mt-1 text-xs text-muted-foreground">Você vira o host, escolhe as regras e recebe um código para chamar a turma.</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">Matéria</span>
            <div className="relative">
              <select value={cfg.disciplinaId ?? ""} onChange={(e) => setCfg((c) => ({ ...c, disciplinaId: e.target.value || null }))} className={selectClass}>
                <option value="">Todas</option>
                {disciplinasDaTurma.map((d) => (
                  <option key={d.id} value={d.id}>{d.nome}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">Dificuldade</span>
            <div className="relative">
              <select value={cfg.dificuldade} onChange={(e) => setCfg((c) => ({ ...c, dificuldade: e.target.value as RaceConfig["dificuldade"] }))} className={selectClass}>
                {(Object.keys(DIFICULDADE_LABEL) as RaceConfig["dificuldade"][]).map((d) => (
                  <option key={d} value={d}>{DIFICULDADE_LABEL[d]}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">Perguntas</span>
            <div className="relative">
              <select value={cfg.numQuestoes} onChange={(e) => setCfg((c) => ({ ...c, numQuestoes: Number(e.target.value) }))} className={selectClass}>
                {[3, 5, 8, 10].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          </label>
        </div>

        <button onClick={createRace} disabled={busy || temasLoading} className="btn-3d btn-3d-green mt-4 flex w-full items-center justify-center gap-2 py-3.5 font-heading text-base">
          <Plus className="h-5 w-5" />
          {temasLoading ? "Carregando questões..." : "Criar corrida"}
        </button>
      </div>

      <div className="card-flat p-5">
        <h2 className="font-heading text-base font-extrabold text-foreground">Entrar com código</h2>
        <div className="mt-3 flex gap-2">
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            maxLength={6}
            placeholder="ABC123"
            className="w-full flex-1 rounded-xl border-2 border-frame bg-background px-4 py-3 text-center font-heading text-lg font-extrabold uppercase tracking-[0.3em] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button onClick={joinRace} disabled={busy || joinCode.trim().length < 4} className="btn-3d btn-3d-blue flex items-center gap-2 px-5 py-3 font-heading text-sm">
            <LogIn className="h-4 w-4" />
            Entrar
          </button>
        </div>
      </div>
    </div>
  );

  const renderWaiting = () => (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="card-flat relative overflow-hidden p-6 text-center">
        <div className="absolute inset-x-0 top-0 h-2" style={CHECKER} />
        <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Código da corrida</p>
        <button onClick={copyCode} className="btn-tap mx-auto mt-2 flex items-center gap-3 rounded-2xl bg-primary/10 px-6 py-3">
          <span className="font-heading text-4xl font-black tracking-[0.3em] text-primary">{race?.code}</span>
          {copied ? <Check className="h-5 w-5 text-success" /> : <Copy className="h-5 w-5 text-primary/60" />}
        </button>
        <p className="mt-2 text-xs text-muted-foreground">Toca para copiar e manda no grupo da turma!</p>
      </div>

      <div className="card-flat p-5">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-brand-blue" />
          <h2 className="font-heading text-sm font-bold text-foreground">Corredores na pista ({players.length})</h2>
          <motion.span
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.4, repeat: Infinity }}
            className="ml-auto h-2.5 w-2.5 rounded-full bg-brand-green"
          />
        </div>
        <div className="mt-3 space-y-2">
          <AnimatePresence>
            {players.map((p, idx) => (
              <motion.div
                key={p.user_id}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                className={`flex items-center gap-3 rounded-2xl border-2 border-frame px-3 py-2.5 ${LANE_BG[idx % LANE_BG.length]}`}
              >
                <SimpleProfileAvatar size="sm" src={avatars[p.user_id] ?? null} showBadge={false} />
                <span className="font-heading text-sm font-bold text-foreground">{p.nome}</span>
                {p.user_id === race?.host_id && <span className="ml-auto rounded-full bg-brand-yellow/20 px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-brand-orange">Host</span>}
                {p.user_id === user?.id && <span className="ml-auto rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-primary">Você</span>}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {isHost ? (
        <button onClick={startRace} className="btn-3d btn-3d-green flex w-full items-center justify-center gap-2 py-4 font-heading text-lg">
          <Play className="h-5 w-5" />
          Iniciar corrida{players.length === 1 ? " (só você por enquanto)" : ` com ${players.length} corredores`}
        </button>
      ) : (
        <div className="card-flat p-4 text-center text-sm font-semibold text-muted-foreground">
          <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1.4, repeat: Infinity }}>
            Esperando o host iniciar... aquece os dedos! 🏁
          </motion.span>
        </div>
      )}
      <button onClick={resetToLobby} className="btn-tap w-full py-2 text-center text-sm font-semibold text-muted-foreground hover:text-foreground">
        Sair da corrida
      </button>
    </div>
  );

  const renderTrack = () => (
    <div className="card-flat overflow-hidden p-4">
      <div className="space-y-2.5">
        {podium.map((p, idx) => {
          const pct = Math.min(100, (p.progress / totalQuestions) * 100);
          const isMe = p.user_id === user?.id;
          const isLeader = players.length > 1 && p.progress === leaderProgress && p.progress > 0;
          const laneBg = LANE_BG[idx % LANE_BG.length];
          return (
            <div key={p.user_id} className="flex items-center gap-2">
              <span className={`w-14 truncate text-right text-[11px] font-bold ${isMe ? "text-primary" : "text-muted-foreground"}`}>
                {isMe ? "Você" : p.nome}
              </span>
              <div className={`relative h-11 flex-1 rounded-full border-2 border-frame ${laneBg}`}>
                <div className="absolute inset-y-1 right-1 w-4 rounded-full" style={CHECKER} />
                <motion.div
                  className="absolute top-1/2 -translate-y-1/2"
                  animate={{ left: `calc(${pct}% - ${(pct / 100) * 44}px)` }}
                  transition={{ type: "spring", stiffness: 180, damping: 20 }}
                >
                  <motion.div
                    key={p.progress}
                    animate={{ y: [0, -10, 0], rotate: [0, -8, 0] }}
                    transition={{ duration: 0.45 }}
                    className="relative"
                  >
                    {isLeader && (
                      <Crown className="absolute -top-4 left-1/2 h-4 w-4 -translate-x-1/2 medal-gold" />
                    )}
                    <SimpleProfileAvatar size="md" src={avatars[p.user_id] ?? null} showBadge={false} />
                  </motion.div>
                </motion.div>
              </div>
              <span className={`w-9 text-xs font-extrabold ${isMe ? "text-primary" : "text-foreground"}`}>{p.progress}/{totalQuestions}</span>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderRacing = () => {
    const q = questions[questionIndex];
    return (
      <div className="mx-auto max-w-xl space-y-4">
        {renderTrack()}
        {combo >= 2 && (
          <motion.div
            key={combo}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mx-auto w-fit rounded-full bg-brand-orange/15 px-4 py-1.5 font-heading text-sm font-extrabold text-brand-orange"
          >
            🔥 {combo} seguidos!
          </motion.div>
        )}
        {q ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={questionIndex}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.25 }}
              className="card-flat p-5"
            >
              <div className="mb-3 flex items-center gap-2">
                <div className="flex gap-1">
                  {questions.map((_, i) => (
                    <span
                      key={i}
                      className={`h-2.5 w-2.5 rounded-full ${i < questionIndex ? "bg-primary" : i === questionIndex ? "bg-brand-yellow" : "bg-muted"}`}
                    />
                  ))}
                </div>
                <span className="ml-auto text-xs font-extrabold text-primary">Você: {myProgress} acertos</span>
              </div>
              <p className="mb-5 font-body text-[15px] leading-relaxed text-foreground">{q.enunciado}</p>
              <div className="space-y-2.5">
                {q.alternativas?.map((alt, i) => {
                  const isPicked = picked === alt;
                  const isAnswer = alt === q.respostaCorreta;
                  let style = "btn-3d border-2 border-frame [--btn-3d-bg:var(--card)] [--btn-3d-fg:var(--foreground)] [--btn-3d-shadow:var(--frame)]";
                  if (picked && isAnswer) style = "btn-3d btn-3d-green";
                  else if (picked && isPicked && !isAnswer) style = "btn-3d [--btn-3d-bg:var(--destructive)] [--btn-3d-fg:var(--destructive-foreground)] [--btn-3d-shadow:var(--destructive)]";
                  return (
                    <button
                      key={alt}
                      onClick={() => answer(alt)}
                      disabled={picked !== null}
                      className={`w-full px-5 py-4 text-left font-body text-sm font-semibold disabled:opacity-100 ${style}`}
                    >
                      <span className="flex items-center gap-3">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-xs font-heading font-bold text-foreground">{LETTERS[i]}</span>
                        <span className="flex-1">{alt}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </AnimatePresence>
        ) : null}
      </div>
    );
  };

  const renderFinished = () => {
    const top3 = podium.slice(0, 3);
    const podiumSlots = [
      { p: top3[1], place: 2, h: "h-16" },
      { p: top3[0], place: 1, h: "h-24" },
      { p: top3[2], place: 3, h: "h-12" },
    ].filter((slot) => slot.p);
    const rest = podium.slice(3);
    return (
      <div className="mx-auto max-w-xl space-y-4">
        {iWon && <Confetti />}
        <div className="card-flat relative overflow-hidden p-6 text-center sm:p-8">
          <div className="absolute inset-x-0 top-0 h-2" style={CHECKER} />
          <Trophy className="mx-auto mt-2 h-10 w-10 medal-gold" />
          <h2 className="mt-2 font-heading text-2xl font-extrabold text-foreground">
            {players.length <= 1 ? "Corrida concluída!" : iWon ? "Você venceu a corrida!" : "Corrida encerrada!"}
          </h2>

          {/* Pódio físico */}
          <div className="mt-6 flex items-end justify-center gap-3">
            {podiumSlots.map(({ p, place, h }) => (
              <div key={p.user_id} className="flex w-24 flex-col items-center gap-2">
                {place === 1 && <Crown className="h-5 w-5 medal-gold" />}
                <SimpleProfileAvatar size={place === 1 ? "lg" : "md"} src={avatars[p.user_id] ?? null} showBadge={false} />
                <span className="max-w-[6rem] truncate font-heading text-xs font-bold text-foreground">{p.user_id === user?.id ? "Você" : p.nome}</span>
                <div className={`flex w-full items-start justify-center rounded-t-xl border-2 border-b-0 border-frame pt-1.5 font-heading text-lg font-black ${h} ${place === 1 ? "medal-gold bg-brand-yellow/20" : place === 2 ? "medal-silver bg-muted" : "medal-bronze bg-muted/60"}`}>
                  {place}º
                </div>
              </div>
            ))}
          </div>

          {rest.length > 0 && (
            <div className="mt-4 space-y-2">
              {rest.map((p, i) => (
                <div key={p.user_id} className="flex items-center gap-3 rounded-2xl border-2 border-frame bg-background px-4 py-2.5">
                  <span className="font-heading text-sm font-black text-muted-foreground">{i + 4}º</span>
                  <SimpleProfileAvatar size="sm" src={avatars[p.user_id] ?? null} showBadge={false} />
                  <span className="font-heading text-sm font-bold text-foreground">{p.user_id === user?.id ? "Você" : p.nome}</span>
                  <span className="ml-auto text-sm font-extrabold text-sinapses">{p.progress} acertos</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {isHost && race?.status !== "finished" && (
          <button onClick={endRace} className="btn-3d btn-3d-orange w-full py-3 font-heading text-sm">Encerrar corrida</button>
        )}
        <div className="flex gap-2">
          <button onClick={resetToLobby} className="btn-3d btn-3d-blue flex flex-1 items-center justify-center gap-2 py-3 font-heading text-sm">
            <RotateCcw className="h-4 w-4" />
            Nova corrida
          </button>
          <Link to="/app" className="btn-3d flex flex-1 items-center justify-center gap-2 border-2 border-frame py-3 font-heading text-sm [--btn-3d-bg:var(--card)] [--btn-3d-fg:var(--foreground)] [--btn-3d-shadow:var(--frame)]">
            <Home className="h-4 w-4" />
            Início
          </Link>
        </div>
      </div>
    );
  };

  return (
    <Layout>
      <section className="container mx-auto px-4 py-6">
        {!race ? renderLobby() : race.status === "waiting" ? renderWaiting() : showPodium || iFinished ? renderFinished() : renderRacing()}
      </section>
    </Layout>
  );
}
