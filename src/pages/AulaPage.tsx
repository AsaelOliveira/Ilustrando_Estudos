import { Navigate, useParams } from "react-router-dom";
import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Layout from "@/components/Layout";
import Breadcrumbs from "@/components/Breadcrumbs";
import Confetti from "@/components/Confetti";
import MathBlock, { FractionDisplay } from "@/components/MathBlock";
import { useContentDisplayConfig } from "@/hooks/useContentDisplayConfig";
import { getTemaByIdFromList, useStudyContent } from "@/hooks/useStudyContent";
import { useAuth } from "@/hooks/useAuth";
import { canAccessTurma, getTurma, getDisciplina } from "@/data/catalog";
import type { BlocoExplicacao, Questao } from "@/data/content-types";
import { setRecentStudy } from "@/lib/recent-study";
import { pickRandomItems, shuffleItems } from "@/lib/random";
import { Check, X, RotateCcw, Clock, Lightbulb, ChevronDown, BookOpen, FileText, Beaker, PenTool, GraduationCap, Zap, Star, Target } from "lucide-react";
import { recordActivityResult, type ActivityResultType } from "@/lib/activity-results";

type ActivityContext = {
  userId: string;
  turmaId: string;
  disciplinaId: string;
  temaId: string;
  countsForPoints: boolean;
};

const TABS = ["Resumo", "Explicação", "Exemplos", "Exercícios", "Simulado"] as const;
type Tab = (typeof TABS)[number];

const tabConfig: Record<Tab, { icon: typeof BookOpen; emoji: string }> = {
  "Resumo": { icon: BookOpen, emoji: "📋" },
  "Explicação": { icon: FileText, emoji: "📖" },
  "Exemplos": { icon: Beaker, emoji: "🧪" },
  "Exercícios": { icon: PenTool, emoji: "✏️" },
  "Simulado": { icon: GraduationCap, emoji: "🎯" },
};

export default function AulaPage() {
  const { turmaId, disciplinaId, temaId } = useParams();
  const { user, profile, role } = useAuth();
  const { temas, loading } = useStudyContent();
  const { config: contentDisplayConfig, loading: contentDisplayLoading } = useContentDisplayConfig();
  const turmaData = getTurma(turmaId || "");
  const discData = getDisciplina(disciplinaId || "");
  const tema = getTemaByIdFromList(temas, temaId || "");
  const [tab, setTab] = useState<Tab>("Resumo");
  const [exerciseRound, setExerciseRound] = useState(0);
  const [simuladoRound, setSimuladoRound] = useState(0);
  const [visibleExercicios, setVisibleExercicios] = useState<Questao[]>([]);
  const [visibleSimulado, setVisibleSimulado] = useState<Questao[]>([]);
  const metadataTurma =
    user?.user_metadata && typeof user.user_metadata.turma_id === "string"
      ? user.user_metadata.turma_id
      : null;
  const userTurma = profile?.turma_id ?? metadataTurma;
  const isAdmin = role === "admin";
  const countsForPoints = Boolean(isAdmin || !userTurma || userTurma === tema?.turmaId);
  const activityContext: ActivityContext | null = user && tema
    ? {
        userId: user.id,
        turmaId: tema.turmaId,
        disciplinaId: tema.disciplinaId,
        temaId: tema.id,
        countsForPoints,
      }
    : null;

  useEffect(() => {
    if (!tema) {
      setVisibleExercicios([]);
      return;
    }

    setVisibleExercicios(
      pickRandomItems(tema.exercicios, contentDisplayConfig.maxExercisesPerTema),
    );
  }, [contentDisplayConfig.maxExercisesPerTema, exerciseRound, tema]);

  useEffect(() => {
    if (!tema) {
      setVisibleSimulado([]);
      return;
    }

    setVisibleSimulado(shuffleItems(tema.simulado));
  }, [simuladoRound, tema]);

  if (user && !isAdmin && userTurma && turmaId && !canAccessTurma(userTurma, turmaId)) {
    return <Navigate to="/app/turmas" replace />;
  }

  useEffect(() => {
    if (!turmaData || !discData || !tema || !turmaId || !disciplinaId || !temaId) return;

    setRecentStudy({
      turmaId,
      disciplinaId,
      temaId,
      visitedAt: new Date().toISOString(),
    });
  }, [discData, disciplinaId, tema, temaId, turmaData, turmaId]);

  if (loading || contentDisplayLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12 text-center text-muted-foreground font-body">Carregando aula...</div>
      </Layout>
    );
  }

  if (!turmaData || !discData || !tema) {
    return <Layout><div className="container mx-auto px-4 py-12 text-center text-muted-foreground font-body">Tema não encontrado.</div></Layout>;
  }

  return (
    <Layout>
      <Breadcrumbs items={[
        { label: "Turmas", href: "/app/turmas" },
        { label: turmaData.nome, href: `/app/turmas/${turmaId}` },
        { label: discData.nome, href: `/app/turmas/${turmaId}/${disciplinaId}` },
        { label: tema.titulo },
      ]} />

      <section className="container mx-auto px-4 py-8 max-w-[840px]">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            {tema.unidade && (
              <span className="text-xs bg-primary/10 text-primary font-body font-medium px-3 py-1 rounded-full flex items-center gap-1">
                📁 {tema.unidade}
              </span>
            )}
          </div>
          <h1 className="font-heading font-bold text-3xl text-foreground flex items-center gap-3">
            {tema.titulo}
          </h1>
          <p className="font-body text-sm text-muted-foreground mt-2">
            {visibleExercicios.length} exercícios • {tema.simulado.length} questões no simulado • {tema.explicacao.length} seções
          </p>
          {!countsForPoints && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-medium text-amber-800">
              <span>🔒</span>
              <span>Modo estudo: esta turma libera aprendizado, mas só sua turma conta pontos e Sinapses.</span>
            </div>
          )}
        </motion.div>

        {/* Tabs */}
        <div className="sticky top-[53px] z-20 bg-background/80 backdrop-blur-md -mx-4 px-4 border-b border-border mb-8">
          <div className="flex gap-0.5 overflow-x-auto pb-0">
            {TABS.map((t) => {
              const cfg = tabConfig[t];
              return (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`btn-tap relative font-heading text-sm font-medium px-4 py-3.5 transition-colors whitespace-nowrap flex items-center gap-2 ${
                    tab === t ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span className="text-base">{cfg.emoji}</span>
                  <span className="hidden sm:inline">{t}</span>
                  {tab === t && (
                    <motion.div
                      layoutId="tab-underline"
                      className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-primary rounded-full"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
          >
            {tab === "Resumo" && <ResumoTab resumo={tema.resumo} />}
            {tab === "Explicação" && <ExplicacaoTab explicacao={tema.explicacao} />}
            {tab === "Exemplos" && <ExemplosTab exemplos={tema.exemplos} isMath={tema.disciplinaId.startsWith("mat")} />}
            {tab === "Exercícios" && <ExerciciosTab exercicios={visibleExercicios} activityContext={activityContext} />}
            {tab === "Simulado" && <SimuladoTab questoes={tema.simulado} activityContext={activityContext} />}
          </motion.div>
        </AnimatePresence>
      </section>
    </Layout>
  );
}

async function saveActivityResult(
  activityContext: ActivityContext,
  tipo: ActivityResultType,
  acertos: number,
  total: number,
) {
  await recordActivityResult({
    userId: activityContext.userId,
    turmaId: activityContext.turmaId,
    disciplinaId: activityContext.disciplinaId,
    temaId: activityContext.temaId,
    tipo,
    acertos,
    total,
    countsForPoints: activityContext.countsForPoints,
  });
}

function ResumoTab({ resumo }: { resumo: string[] }) {
  const emojis = ["📌", "💡", "🔑", "📐", "🧮", "✨", "📊", "🎯"];
  return (
    <div className="space-y-4">
      <div className="bg-primary/5 border border-primary/10 rounded-xl p-5 mb-6">
        <p className="font-heading font-semibold text-primary text-sm mb-1">📋 Pontos-chave do tema</p>
        <p className="text-xs text-muted-foreground font-body">Revise os conceitos fundamentais antes de avançar.</p>
      </div>
      <ul className="space-y-3">
        {resumo.map((item, i) => (
          <motion.li
            key={i}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1, type: "spring", stiffness: 200 }}
            className="flex gap-3 items-start bg-card border border-border rounded-xl px-5 py-4 shadow-sm hover:shadow-md hover:border-primary/20 transition-all group"
          >
            <motion.span
              whileHover={{ scale: 1.2, rotate: 10 }}
              className="mt-0.5 h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 text-base group-hover:bg-primary/15 transition-colors"
            >
              {emojis[i % emojis.length]}
            </motion.span>
            <p className="font-body text-foreground leading-relaxed">{item}</p>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

function ExplicacaoTab({ explicacao }: { explicacao: BlocoExplicacao[] }) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const sectionEmojis = ["📘", "📗", "📙", "📕", "📓"];

  return (
    <div className="space-y-4">
      {explicacao.map((bloco, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="bg-card border border-border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
        >
          <button
            onClick={() => setExpandedIndex(expandedIndex === i ? null : i)}
            className="btn-tap w-full flex items-center justify-between px-6 py-5 text-left"
          >
            <div className="flex items-center gap-3">
              <motion.div
                whileHover={{ scale: 1.1 }}
                className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 text-xl"
              >
                {sectionEmojis[i % sectionEmojis.length]}
              </motion.div>
              <h2 className="font-heading font-semibold text-lg text-foreground">{bloco.subtitulo}</h2>
            </div>
            <motion.div
              animate={{ rotate: expandedIndex === i ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </motion.div>
          </button>
          
          <AnimatePresence>
            {expandedIndex === i && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="px-6 pb-5 space-y-4">
                  <p className="font-body text-foreground/90 leading-relaxed text-[15px]">{bloco.texto}</p>
                  {bloco.dica && (
                    <motion.div
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                      className="flex gap-3 bg-accent/5 border border-accent/15 rounded-xl px-5 py-4"
                    >
                      <span className="text-xl flex-shrink-0">💡</span>
                      <div>
                        <p className="font-heading text-xs font-semibold text-accent mb-1">Dica importante</p>
                        <p className="font-body text-sm text-foreground/80">{bloco.dica}</p>
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      ))}
    </div>
  );
}

function ExemplosTab({ exemplos, isMath }: { exemplos: { enunciado: string; passos: string[]; resposta: string }[]; isMath: boolean }) {
  return (
    <div className="space-y-6">
      {exemplos.map((ex, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.12, type: "spring" }}
          className="bg-card border border-border rounded-xl overflow-hidden shadow-card hover:shadow-glow transition-shadow"
        >
          <div className="bg-primary/5 px-6 py-4 border-b border-border">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base">🧪</span>
              <span className="text-xs font-heading font-semibold text-primary">Exemplo {i + 1}</span>
            </div>
            <p className="font-body font-medium text-foreground text-[15px]">{ex.enunciado}</p>
          </div>
          <div className="p-6 space-y-4">
            <div className="space-y-3">
              {ex.passos.map((p, j) => (
                <motion.div
                  key={j}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.12 + j * 0.08 }}
                  className="flex gap-3 items-start"
                >
                  <motion.span
                    whileHover={{ scale: 1.15 }}
                    className="h-7 w-7 rounded-full bg-secondary flex items-center justify-center flex-shrink-0"
                  >
                    <span className="text-primary font-heading font-bold text-xs">{j + 1}</span>
                  </motion.span>
                  <div className="flex-1">
                    {isMath && p.includes("=") ? (
                      <div className="space-y-1">
                        <p className="font-body text-sm text-foreground/80 leading-relaxed">{p}</p>
                        {/* Show vertical math for operations */}
                        {p.includes("×") && (
                          <MathBlock
                            lines={extractMathLines(p)}
                            highlight={j === ex.passos.length - 1}
                          />
                        )}
                      </div>
                    ) : (
                      <p className="font-body text-sm text-foreground/80 leading-relaxed">{p}</p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="bg-primary/5 border border-primary/10 rounded-xl px-5 py-4 flex items-center gap-3"
            >
              <motion.span
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="text-xl"
              >
                ✅
              </motion.span>
              <p className="font-heading font-semibold text-sm text-primary">{ex.resposta}</p>
            </motion.div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function extractMathLines(step: string): string[] {
  // Simple extraction of math-like content for vertical display
  const match = step.match(/(\d+)\s*[×x]\s*(\d+)\s*=\s*(\d+)/);
  if (match) {
    return [`  ${match[1]}`, `× ${match[2]}`, `  ${match[3]}`];
  }
  return [step];
}

function ExerciciosTab({
  exercicios,
  activityContext,
}: {
  exercicios: Questao[];
  activityContext: ActivityContext | null;
}) {
  const { temaId } = useParams();
  const { temas } = useStudyContent();
  const { config: displayConfig } = useContentDisplayConfig();
  const tema = getTemaByIdFromList(temas, temaId || "");
  const [questionSet, setQuestionSet] = useState<Questao[]>(exercicios);
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [showGabarito, setShowGabarito] = useState(false);
  const [savedResult, setSavedResult] = useState(false);

  const totalRespondidas = Object.keys(respostas).length;
  const totalAcertos = questionSet.filter((q) => respostas[q.id] === q.respostaCorreta).length;

  useEffect(() => {
    setQuestionSet(exercicios);
  }, [exercicios]);

  const handleReset = () => {
    const renewedQuestions = tema
      ? pickRandomItems(tema.exercicios, displayConfig.maxExercisesPerTema)
      : exercicios;
    setQuestionSet(renewedQuestions);
    setRespostas({});
    setShowGabarito(false);
    setSavedResult(false);
  };

  const handleShowGabarito = async () => {
    setShowGabarito(true);

    if (!activityContext || savedResult || totalRespondidas !== questionSet.length) return;

    await saveActivityResult(activityContext, "exercicio", totalAcertos, questionSet.length);
    setSavedResult(true);
  };

  return (
    <div>
      {/* Progress bar */}
      <div className="mb-6 bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="font-body text-sm text-muted-foreground flex items-center gap-2">
            <Target className="h-4 w-4" />
            Progresso: {totalRespondidas}/{questionSet.length} respondidas
          </span>
          {showGabarito && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="font-heading text-sm font-semibold text-primary flex items-center gap-1"
            >
              <Star className="h-4 w-4" />
              {totalAcertos}/{questionSet.length} acertos
            </motion.span>
          )}
        </div>
        <div className="h-3 bg-secondary rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-primary-glow rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${questionSet.length > 0 ? (totalRespondidas / questionSet.length) * 100 : 0}%` }}
            transition={{ duration: 0.4, type: "spring" }}
          />
        </div>
        {totalRespondidas === questionSet.length && !showGabarito && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs text-primary font-body mt-2 flex items-center gap-1"
          >
            🎉 Todas respondidas! Clique em "Mostrar gabarito" para ver o resultado.
          </motion.p>
        )}
      </div>

      <div className="space-y-5">
        {questionSet.map((q, i) => (
          <QuestaoCard
            key={q.id}
            questao={q}
            index={i}
            resposta={respostas[q.id] || ""}
            onResponder={(v) => setRespostas((r) => ({ ...r, [q.id]: v }))}
            showGabarito={showGabarito}
          />
        ))}
      </div>
      <div className="flex gap-3 mt-8">
        <button
          onClick={() => void handleShowGabarito()}
          disabled={totalRespondidas === 0}
          className="btn-tap bg-primary text-primary-foreground font-heading font-semibold px-6 py-3.5 rounded-xl hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/20 text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          📝 Mostrar gabarito comentado
        </button>
        <button
          onClick={handleReset}
          className="btn-tap border border-border text-foreground font-heading font-semibold px-6 py-3.5 rounded-xl hover:bg-secondary transition-colors text-sm flex items-center gap-2"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Refazer
        </button>
      </div>
    </div>
  );
}

function QuestaoCard({
  questao,
  index,
  resposta,
  onResponder,
  showGabarito,
}: {
  questao: Questao;
  index: number;
  resposta: string;
  onResponder: (v: string) => void;
  showGabarito: boolean;
}) {
  const isCorrect = resposta === questao.respostaCorreta;
  const diffConfig = {
    facil: { label: "Fácil", emoji: "🟢", style: "bg-primary/10 text-primary" },
    medio: { label: "Médio", emoji: "🟡", style: "bg-accent/10 text-accent" },
    dificil: { label: "Difícil", emoji: "🔴", style: "bg-destructive/10 text-destructive" },
  };
  const diff = diffConfig[questao.dificuldade];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, type: "spring", stiffness: 200 }}
      className={`bg-card border rounded-xl p-6 shadow-sm transition-all hover:shadow-md ${
        showGabarito && resposta
          ? isCorrect
            ? "border-primary/30 shadow-primary/10 bg-primary/[0.02]"
            : "border-destructive/30 shadow-destructive/10 bg-destructive/[0.02]"
          : "border-border hover:border-primary/20"
      }`}
    >
      <div className="flex items-center gap-3 mb-4">
        <motion.span
          whileHover={{ scale: 1.1, rotate: 5 }}
          className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center"
        >
          <span className="font-heading font-bold text-sm text-foreground">{index + 1}</span>
        </motion.span>
        <span className={`text-xs font-body font-medium px-3 py-1 rounded-full flex items-center gap-1.5 ${diff.style}`}>
          {diff.emoji} {diff.label}
        </span>
        {showGabarito && resposta && (
          <motion.span
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 300 }}
            className={`ml-auto flex items-center gap-1.5 text-xs font-heading font-semibold px-3 py-1 rounded-full ${
              isCorrect ? "text-primary bg-primary/10" : "text-destructive bg-destructive/10"
            }`}
          >
            {isCorrect ? "✅ Correto!" : "❌ Incorreto"}
          </motion.span>
        )}
      </div>
      <p className="font-body text-foreground mb-5 leading-relaxed text-[15px]">{questao.enunciado}</p>

      {questao.tipo === "multipla_escolha" && questao.alternativas ? (
        <div className="space-y-2.5">
          {questao.alternativas.map((alt, altIdx) => {
            const selected = resposta === alt;
            const isAnswer = alt === questao.respostaCorreta;
            const letters = ["A", "B", "C", "D"];
            let style = "border-border hover:border-primary/30 hover:bg-primary/[0.02]";
            if (showGabarito && isAnswer) style = "border-primary bg-primary/5 shadow-sm";
            else if (showGabarito && selected && !isAnswer) style = "border-destructive bg-destructive/5";
            else if (selected) style = "border-primary bg-primary/5 shadow-sm shadow-primary/10";

            return (
              <motion.button
                key={alt}
                onClick={() => !showGabarito && onResponder(alt)}
                disabled={showGabarito}
                whileHover={!showGabarito ? { scale: 1.01 } : undefined}
                whileTap={!showGabarito ? { scale: 0.99 } : undefined}
                className={`w-full text-left px-5 py-4 rounded-xl border font-body text-sm transition-all ${style}`}
              >
                <span className="flex items-center gap-3">
                  <span className={`h-7 w-7 rounded-lg flex items-center justify-center text-xs font-heading font-bold transition-all ${
                    selected ? "bg-primary text-primary-foreground shadow-sm" : "bg-secondary text-muted-foreground"
                  }`}>
                    {letters[altIdx]}
                  </span>
                  <span className="flex-1">{alt}</span>
                  {showGabarito && isAnswer && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}>✅</motion.span>}
                  {showGabarito && selected && !isAnswer && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}>❌</motion.span>}
                </span>
              </motion.button>
            );
          })}
        </div>
      ) : (
        <input
          type="text"
          value={resposta}
          onChange={(e) => onResponder(e.target.value)}
          disabled={showGabarito}
          placeholder="✍️ Digite sua resposta..."
          className="w-full px-5 py-4 rounded-xl border border-border bg-background font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all disabled:opacity-60"
        />
      )}

      <AnimatePresence>
        {showGabarito && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: "auto", marginTop: 16 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-secondary/80 rounded-xl px-5 py-4 space-y-2 border border-border/50">
              <p className="font-body text-sm text-foreground flex items-center gap-2">
                <span className="text-base">✅</span>
                <span className="font-heading font-semibold">Resposta:</span> {questao.respostaCorreta}
              </p>
              <p className="font-body text-sm text-muted-foreground leading-relaxed">
                💬 {questao.explicacao}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function SimuladoTab({
  questoes,
  activityContext,
}: {
  questoes: Questao[];
  activityContext: ActivityContext | null;
}) {
  const { temaId } = useParams();
  const { temas } = useStudyContent();
  const tema = getTemaByIdFromList(temas, temaId || "");
  const [questionSet, setQuestionSet] = useState<Questao[]>(questoes);
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [finalizado, setFinalizado] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [timeLeft, setTimeLeft] = useState(questoes.length * 60);
  const [started, setStarted] = useState(false);
  const [savedResult, setSavedResult] = useState(false);

  const acertos = questionSet.filter((q) => respostas[q.id] === q.respostaCorreta).length;

  useEffect(() => {
    setQuestionSet(questoes);
    setTimeLeft(questoes.length * 60);
  }, [questoes]);

  const handleFinalizar = useCallback(async () => {
    setFinalizado(true);
    if (acertos >= questionSet.length * 0.6) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 4000);
    }

    if (!activityContext || savedResult) return;

    await saveActivityResult(activityContext, "simulado", acertos, questionSet.length);
    setSavedResult(true);
  }, [acertos, activityContext, questionSet.length, savedResult]);

  useEffect(() => {
    if (!timerEnabled || !started || finalizado) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          void handleFinalizar();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerEnabled, started, finalizado, handleFinalizar]);

  if (!started) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-16"
      >
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ repeat: Infinity, duration: 3 }}
          className="inline-flex h-20 w-20 rounded-3xl bg-primary/10 items-center justify-center mb-6 text-4xl"
        >
          🎯
        </motion.div>
        <h2 className="font-heading font-bold text-2xl text-foreground mb-3">Mini Simulado</h2>
        <p className="font-body text-muted-foreground mb-8 max-w-md mx-auto">
          📝 {questionSet.length} questões sobre o tema. Teste seus conhecimentos!
        </p>
        <div className="flex items-center justify-center gap-3 mb-8">
          <button
            onClick={() => setTimerEnabled(!timerEnabled)}
            className={`btn-tap flex items-center gap-2 px-5 py-3 rounded-xl border text-sm font-body transition-all ${
              timerEnabled ? "border-primary bg-primary/5 text-primary shadow-sm" : "border-border text-muted-foreground hover:border-primary/30"
            }`}
          >
            <Clock className="h-4 w-4" />
            ⏱️ Timer {timerEnabled ? "ativado" : "desativado"}
          </button>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setStarted(true)}
          className="btn-tap bg-primary text-primary-foreground font-heading font-semibold px-10 py-4 rounded-xl hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/20 text-base"
        >
          🚀 Iniciar Simulado
        </motion.button>
      </motion.div>
    );
  }

  if (finalizado) {
    const pct = questionSet.length > 0 ? Math.round((acertos / questionSet.length) * 100) : 0;
    return (
      <div>
        <Confetti show={showConfetti} />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-8 mb-8"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
            className={`inline-flex h-28 w-28 rounded-3xl items-center justify-center mb-4 ${
              pct >= 80 ? "bg-primary/10" : pct >= 60 ? "bg-accent/10" : "bg-secondary"
            }`}
          >
            <div className="text-center">
              <span className="font-heading text-4xl font-bold text-primary">{pct}%</span>
              <div className="text-2xl mt-1">
                {pct >= 80 ? "🏆" : pct >= 60 ? "👍" : "📖"}
              </div>
            </div>
          </motion.div>
          <p className="font-body text-foreground text-lg">
            Você acertou <span className="font-heading font-bold text-primary">{acertos}</span> de {questionSet.length} questões.
          </p>
          {pct >= 80 && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="text-primary font-heading font-semibold mt-2">
              🎉🏆 Excelente trabalho! Você arrasou!
            </motion.p>
          )}
          {pct >= 60 && pct < 80 && (
            <p className="text-accent font-heading font-semibold mt-2">👍✨ Bom resultado! Continue praticando.</p>
          )}
          {pct < 60 && (
            <p className="text-muted-foreground font-heading font-semibold mt-2">📖💪 Revise o conteúdo e tente novamente!</p>
          )}
        </motion.div>

        <div className="space-y-5">
          {questionSet.map((q, i) => (
            <QuestaoCard
              key={q.id}
              questao={q}
              index={i}
              resposta={respostas[q.id] || ""}
              onResponder={() => {}}
              showGabarito={true}
            />
          ))}
        </div>

        <button
          onClick={() => {
            const renewedQuestions = tema ? shuffleItems(tema.simulado) : questoes;
            setQuestionSet(renewedQuestions);
            setRespostas({});
            setFinalizado(false);
            setStarted(false);
            setTimeLeft(renewedQuestions.length * 60);
            setSavedResult(false);
          }}
          className="btn-tap mt-8 border border-border text-foreground font-heading font-semibold px-6 py-3 rounded-xl hover:bg-secondary transition-colors text-sm flex items-center gap-2"
        >
          <RotateCcw className="h-3.5 w-3.5" /> 🔄 Refazer simulado
        </button>
      </div>
    );
  }

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const totalRespondidas = Object.keys(respostas).length;

  return (
    <div>
      <div className="sticky top-[96px] z-10 bg-background/80 backdrop-blur-md py-3 mb-6 flex items-center justify-between px-5 rounded-xl border border-border shadow-sm">
        <span className="font-body text-sm text-muted-foreground flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          {totalRespondidas}/{questionSet.length} respondidas
        </span>
        {timerEnabled && (
          <span className={`font-heading font-bold text-lg flex items-center gap-2 ${timeLeft < 60 ? "text-destructive animate-pulse" : "text-accent"}`}>
            ⏱️ {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
          </span>
        )}
      </div>

      <div className="space-y-5">
        {questionSet.map((q, i) => (
          <QuestaoCard
            key={q.id}
            questao={q}
            index={i}
            resposta={respostas[q.id] || ""}
            onResponder={(v) => setRespostas((r) => ({ ...r, [q.id]: v }))}
            showGabarito={false}
          />
        ))}
      </div>

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => void handleFinalizar()}
        className="btn-tap mt-8 bg-primary text-primary-foreground font-heading font-semibold px-8 py-4 rounded-xl hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/20 text-base"
      >
        🏁 Finalizar Simulado
      </motion.button>
    </div>
  );
}
