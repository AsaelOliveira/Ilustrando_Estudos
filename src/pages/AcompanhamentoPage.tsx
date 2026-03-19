import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, BarChart3, BookOpen, Clock3, Flame, Shield, TrendingUp, Users } from "lucide-react";
import Layout from "@/components/Layout";
import Breadcrumbs from "@/components/Breadcrumbs";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { disciplinas, getDisciplina, turmas } from "@/data/catalog";
import SimpleProfileAvatar from "@/components/SimpleProfileAvatar";
import { formatAppDate, parseAppDate } from "@/lib/date-utils";
import type { AuthRole } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getTemaByIdFromList, useStudyContent } from "@/hooks/useStudyContent";
import { getDisciplineVisual } from "@/lib/discipline-visuals";

type StudentProfileRow = {
  user_id: string;
  nome: string;
  turma_id: string | null;
  avatar_url: string | null;
};

type StudentScoreRow = {
  user_id: string;
  turma_id: string;
  points: number;
  missions_completed: number;
  streak_days: number;
  last_mission_date: string | null;
};

type StudentAttemptRow = {
  user_id: string;
  turma_id: string;
  correct_answers: number;
  total_questions: number;
  completed_at: string;
};

type ActivityResultRow = {
  user_id: string;
  turma_id: string;
  disciplina_id: string;
  tema_id: string;
  tipo: "exercicio" | "simulado";
  acertos: number;
  total: number;
  created_at: string;
};

type ProfessorAssignmentRow = {
  turma_id: string;
  disciplina_id: string;
};

type StudentInsight = {
  user_id: string;
  nome: string;
  turma_id: string | null;
  avatar_url: string | null;
  points: number;
  missions_completed: number;
  streak_days: number;
  avgAccuracy: number;
  attemptCount: number;
  lastActive: string | null;
  status: "forte" | "atencao" | "risco";
};

function formatDate(date: string | null) {
  return formatAppDate(date, {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatus(avgAccuracy: number, streakDays: number, attemptCount: number): StudentInsight["status"] {
  if (attemptCount === 0 || avgAccuracy < 45) return "risco";
  if (avgAccuracy < 70 || streakDays <= 1) return "atencao";
  return "forte";
}

export default function AcompanhamentoPage() {
  const { profile, role } = useAuth();
  const { temas } = useStudyContent();
  const [loading, setLoading] = useState(true);
  const [selectedTurma, setSelectedTurma] = useState<string>(profile?.turma_id ?? "all");
  const [selectedDisciplina, setSelectedDisciplina] = useState<string>("all");
  const [students, setStudents] = useState<StudentInsight[]>([]);
  const [professorTurmas, setProfessorTurmas] = useState<string[]>([]);
  const [professorAssignments, setProfessorAssignments] = useState<ProfessorAssignmentRow[]>([]);
  const [attemptsMap, setAttemptsMap] = useState<Record<string, StudentAttemptRow[]>>({});
  const [activityMap, setActivityMap] = useState<Record<string, ActivityResultRow[]>>({});
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  useEffect(() => {
    if (role !== "professor") {
      setProfessorTurmas([]);
      setProfessorAssignments([]);
      return;
    }

    const loadProfessorScope = async () => {
      const [{ data: turmaData }, { data: assignmentData }] = await Promise.all([
        supabase.from("professor_turmas").select("turma_id"),
        supabase.from("professor_assignments").select("turma_id, disciplina_id"),
      ]);
      const turmaIds = ((turmaData as Array<{ turma_id: string }> | null) ?? []).map((entry) => entry.turma_id);
      const assignments = (assignmentData as ProfessorAssignmentRow[] | null) ?? [];
      setProfessorTurmas(turmaIds);
      setProfessorAssignments(assignments);
      if (turmaIds[0]) {
        setSelectedTurma((current) => (turmaIds.includes(current) ? current : turmaIds[0]));
      }
    };

    void loadProfessorScope();
  }, [role]);

  useEffect(() => {
    if (role !== "admin" && role !== "professor" && role !== "coordenadora") return;

    const load = async () => {
      setLoading(true);

      const allowedProfessorTurmas = role === "professor" ? professorTurmas : [];
      const allowedProfessorAssignments = role === "professor" ? professorAssignments : [];
      const turmaScope =
        role === "professor"
          ? selectedTurma === "all"
            ? null
            : selectedTurma || allowedProfessorTurmas[0] || null
          : selectedTurma === "all"
            ? null
            : selectedTurma;
      const disciplinaScope = selectedDisciplina === "all" ? null : selectedDisciplina;

      const profilesQuery = supabase.from("profiles").select("user_id, nome, turma_id, avatar_url");
      let scoresQuery = supabase.from("student_scores").select(
        "user_id, turma_id, points, missions_completed, streak_days, last_mission_date",
      );
      let attemptsQuery = supabase.from("mission_attempts").select(
        "user_id, turma_id, correct_answers, total_questions, completed_at",
      );
      let activityQuery = supabase.from("activity_results").select(
        "user_id, turma_id, disciplina_id, tema_id, tipo, acertos, total, created_at",
      );
      const rolesQuery = supabase.from("user_roles").select("user_id, role");

      if (turmaScope) {
        scoresQuery = scoresQuery.eq("turma_id", turmaScope);
        attemptsQuery = attemptsQuery.eq("turma_id", turmaScope);
        activityQuery = activityQuery.eq("turma_id", turmaScope);
      }

      if (disciplinaScope) {
        activityQuery = activityQuery.eq("disciplina_id", disciplinaScope);
      }

      const [
        { data: profilesData, error: profilesError },
        { data: scoresData, error: scoresError },
        { data: attemptsData, error: attemptsError },
        { data: activityData, error: activityError },
        { data: rolesData, error: rolesError },
      ] = await Promise.all([profilesQuery, scoresQuery, attemptsQuery, activityQuery, rolesQuery]);

      if (profilesError || scoresError || attemptsError || activityError || rolesError) {
        setStudents([]);
        setLoading(false);
        return;
      }

      const studentRoleIds = new Set(
        ((rolesData as Array<{ user_id: string; role: AuthRole }> | null) ?? [])
          .filter((entry) => entry.role === "aluno")
          .map((entry) => entry.user_id),
      );

      const scoresMap = new Map(
        ((scoresData as StudentScoreRow[] | null) ?? []).map((entry) => [entry.user_id, entry]),
      );

      const attemptsByUser = new Map<string, StudentAttemptRow[]>();
      ((attemptsData as StudentAttemptRow[] | null) ?? []).forEach((attempt) => {
        const current = attemptsByUser.get(attempt.user_id) ?? [];
        current.push(attempt);
        attemptsByUser.set(attempt.user_id, current);
      });

      const activityByUser = new Map<string, ActivityResultRow[]>();
      ((activityData as ActivityResultRow[] | null) ?? []).forEach((result) => {
        const current = activityByUser.get(result.user_id) ?? [];
        current.push(result);
        activityByUser.set(result.user_id, current);
      });

      const nextStudents = ((profilesData as StudentProfileRow[] | null) ?? [])
        .filter((entry) => studentRoleIds.has(entry.user_id))
        .map((entry) => {
          const score = scoresMap.get(entry.user_id);
          const attempts = attemptsByUser.get(entry.user_id) ?? [];
          const activities = activityByUser.get(entry.user_id) ?? [];
          const resolvedTurmaId =
            entry.turma_id ??
            score?.turma_id ??
            activities.find((activity) => activity.turma_id)?.turma_id ??
            attempts.find((attempt) => attempt.turma_id)?.turma_id ??
            null;
          const totalCorrect =
            activities.length > 0
              ? activities.reduce((sum, activity) => sum + activity.acertos, 0)
              : attempts.reduce((sum, attempt) => sum + attempt.correct_answers, 0);
          const totalQuestions =
            activities.length > 0
              ? activities.reduce((sum, activity) => sum + activity.total, 0)
              : attempts.reduce((sum, attempt) => sum + attempt.total_questions, 0);
          const avgAccuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
          const latestAttempt = (activities.length > 0
            ? activities.map((activity) => activity.created_at)
            : attempts.map((attempt) => attempt.completed_at))
            .sort((a, b) => (parseAppDate(b)?.getTime() ?? 0) - (parseAppDate(a)?.getTime() ?? 0))[0] ?? null;

          return {
            user_id: entry.user_id,
            nome: entry.nome,
            turma_id: resolvedTurmaId,
            avatar_url: entry.avatar_url,
            points: score?.points ?? 0,
            missions_completed: score?.missions_completed ?? 0,
            streak_days: score?.streak_days ?? 0,
            avgAccuracy,
            attemptCount: activities.length > 0 ? activities.length : attempts.length,
            lastActive: latestAttempt ?? score?.last_mission_date ?? null,
            status: getStatus(avgAccuracy, score?.streak_days ?? 0, activities.length > 0 ? activities.length : attempts.length),
          } satisfies StudentInsight;
        })
        .filter((student) =>
          role !== "professor" || allowedProfessorTurmas.length === 0
            ? true
            : student.turma_id
              ? allowedProfessorTurmas.includes(student.turma_id)
              : false,
        )
        .filter((student) =>
          role !== "professor" || allowedProfessorAssignments.length === 0 || !disciplinaScope
            ? true
            : allowedProfessorAssignments.some(
                (assignment) =>
                  assignment.turma_id === student.turma_id &&
                  assignment.disciplina_id === disciplinaScope,
              ),
        )
        .filter((student) => !turmaScope || student.turma_id === turmaScope)
        .sort((a, b) => b.points - a.points);

      setAttemptsMap(
        Object.fromEntries(
          Array.from(attemptsByUser.entries()).map(([userId, attempts]) => [userId, attempts]),
        ),
      );
      setActivityMap(
        Object.fromEntries(
          Array.from(activityByUser.entries()).map(([userId, activities]) => [userId, activities]),
        ),
      );
      setStudents(nextStudents);
      setLoading(false);
    };

    void load();
  }, [professorAssignments, professorTurmas, role, selectedDisciplina, selectedTurma]);

  const visibleTurmas = useMemo(() => {
    if (role === "professor") {
      return turmas.filter((turma) => professorTurmas.includes(turma.id));
    }
    return turmas;
  }, [professorTurmas, role]);

  const visibleDisciplinas = useMemo(() => {
    if (role === "professor") {
      const relevantAssignments = professorAssignments.filter(
        (assignment) => selectedTurma === "all" || assignment.turma_id === selectedTurma,
      );
      return disciplinas.filter((disciplina) =>
        relevantAssignments.some((assignment) => assignment.disciplina_id === disciplina.id),
      );
    }

    if (selectedTurma === "all") return [];
    return disciplinas.filter((disciplina) => disciplina.turmaId === selectedTurma);
  }, [professorAssignments, role, selectedTurma]);

  useEffect(() => {
    if (selectedDisciplina === "all") return;
    if (visibleDisciplinas.some((disciplina) => disciplina.id === selectedDisciplina)) return;
    setSelectedDisciplina("all");
  }, [selectedDisciplina, visibleDisciplinas]);

  const summary = useMemo(() => {
    const total = students.length;
    const avgAccuracy =
      total > 0 ? Math.round(students.reduce((sum, student) => sum + student.avgAccuracy, 0) / total) : 0;
    const atRisk = students.filter((student) => student.status === "risco").length;
    const engaged = students.filter((student) => student.streak_days >= 3).length;

    return { total, avgAccuracy, atRisk, engaged };
  }, [students]);

  const topStudents = students.slice(0, 5);
  const attentionStudents = students.filter((student) => student.status !== "forte").slice(0, 6);
  const selectedStudent = students.find((student) => student.user_id === selectedStudentId) ?? null;

  return (
    <Layout>
      <Breadcrumbs items={[{ label: "Acompanhamento" }]} />
      <section className="container mx-auto max-w-6xl px-4 py-10">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-[11px] font-heading font-semibold uppercase tracking-[0.16em] text-primary">
            {role === "admin" || role === "coordenadora" ? <Shield className="h-3.5 w-3.5" /> : <BookOpen className="h-3.5 w-3.5" />}
            Acompanhamento pedagógico
          </div>
          <h1 className="mt-3 font-heading text-3xl font-extrabold text-foreground">
            Visão de desempenho dos alunos
          </h1>
          <p className="mt-2 max-w-3xl font-body text-sm text-muted-foreground">
            Acompanhe evolução, regularidade e alunos que precisam de atenção. A visão de dificuldades aqui é geral por desempenho; se quiser detalhar por tema, o próximo passo é registrar erros por conteúdo.
          </p>
        </motion.div>

        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-[repeat(4,minmax(0,1fr))_18rem]">
          <div className="col-span-2 grid grid-cols-2 gap-3 lg:col-span-4 lg:grid-cols-4 xl:col-span-4">
            <SummaryCard label="Alunos" value={String(summary.total)} icon={Users} tone="emerald" />
            <SummaryCard label="Média de acerto" value={`${summary.avgAccuracy}%`} icon={BarChart3} tone="sky" />
            <SummaryCard label="Em atenção" value={String(summary.atRisk)} icon={AlertTriangle} tone="amber" />
            <SummaryCard label="Engajados" value={String(summary.engaged)} icon={Flame} tone="rose" />
          </div>

          <div className="col-span-2 w-full rounded-[1.5rem] border border-border bg-card p-4 shadow-card lg:col-span-4 xl:col-span-1">
            <div className="mb-3">
              <p className="text-[11px] font-heading font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Filtros
              </p>
              <p className="font-body text-sm text-muted-foreground">Refine a leitura por turma e disciplina.</p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-heading font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Turma
                </label>
                <select
                  value={selectedTurma}
                  onChange={(event) => setSelectedTurma(event.target.value)}
                  disabled={role === "professor" && visibleTurmas.length <= 1}
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground shadow-sm"
                >
                  {(role === "admin" || role === "coordenadora") && <option value="all">Todas as turmas</option>}
                  {visibleTurmas.map((turma) => (
                    <option key={turma.id} value={turma.id}>
                      {turma.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-heading font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Disciplina
                </label>
                <select
                  value={selectedDisciplina}
                  onChange={(event) => setSelectedDisciplina(event.target.value)}
                  disabled={visibleDisciplinas.length === 0}
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground shadow-sm"
                >
                  <option value="all">Todas</option>
                  {visibleDisciplinas.map((disciplina) => (
                    <option key={disciplina.id} value={disciplina.id}>
                      {disciplina.nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[1.8rem] border border-border bg-card p-5 shadow-card">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-heading text-xl font-bold text-foreground">Alunos da turma</h2>
                <p className="font-body text-sm text-muted-foreground">
                  Clique visualmente nos dados para identificar ritmo, acerto e constância.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {loading ? (
                <p className="py-12 text-center font-body text-sm text-muted-foreground">Carregando acompanhamento...</p>
              ) : students.length === 0 ? (
                <p className="py-12 text-center font-body text-sm text-muted-foreground">Nenhum aluno encontrado para este filtro.</p>
              ) : (
                students.map((student) => (
                  <StudentRow
                    key={student.user_id}
                    student={student}
                    onOpen={() => setSelectedStudentId(student.user_id)}
                  />
                ))
              )}
            </div>
          </div>

          <div className="space-y-6">
            <InsightPanel
              title="Destaques da turma"
              subtitle="Quem está puxando o ritmo"
              icon={TrendingUp}
              students={topStudents}
              emptyLabel="Sem destaques ainda."
            />

            <InsightPanel
              title="Precisam de atenção"
              subtitle="Baixa constância ou baixo acerto"
              icon={AlertTriangle}
              students={attentionStudents}
              emptyLabel="Nenhum aluno em atenção neste filtro."
            />
          </div>
        </div>
      </section>

      <StudentPerformanceDialog
        student={selectedStudent}
        attempts={selectedStudent ? attemptsMap[selectedStudent.user_id] ?? [] : []}
        activityResults={selectedStudent ? activityMap[selectedStudent.user_id] ?? [] : []}
        turmaAverage={selectedStudent
          ? Math.round(
              (
                students
                  .filter((student) => student.turma_id === selectedStudent.turma_id)
                  .reduce((sum, student) => sum + student.avgAccuracy, 0) /
                Math.max(
                  1,
                  students.filter((student) => student.turma_id === selectedStudent.turma_id).length,
                )
              ),
            )
          : 0}
        temas={temas}
        open={Boolean(selectedStudent)}
        onOpenChange={(open) => {
          if (!open) setSelectedStudentId(null);
        }}
      />
    </Layout>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: typeof Users;
  tone: "emerald" | "sky" | "amber" | "rose";
}) {
  const toneMap = {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    sky: "border-sky-200 bg-sky-50 text-sky-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    rose: "border-rose-200 bg-rose-50 text-rose-700",
  } as const;

  return (
    <div className={`rounded-2xl border px-4 py-4 shadow-sm ${toneMap[tone]}`}>
      <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/80">
        <Icon className="h-4 w-4" />
      </div>
      <p className="font-heading text-2xl font-bold">{value}</p>
      <p className="text-xs font-body opacity-80">{label}</p>
    </div>
  );
}

function StudentRow({ student, onOpen }: { student: StudentInsight; onOpen: () => void }) {
  const statusTone =
    student.status === "forte"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : student.status === "atencao"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-rose-200 bg-rose-50 text-rose-700";

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-2xl border border-border bg-background/70 p-4 text-left shadow-sm transition-all hover:border-primary/30 hover:bg-primary/5"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <SimpleProfileAvatar src={student.avatar_url} name={student.nome} size="md" showBadge={false} />
          <div className="min-w-0">
            <p className="truncate font-heading text-lg font-semibold text-foreground">{student.nome}</p>
            <p className="font-body text-xs text-muted-foreground">
              {turmas.find((turma) => turma.id === student.turma_id)?.nome ?? "Sem turma"} · Última atividade: {formatDate(student.lastActive)}
            </p>
          </div>
        </div>

        <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-heading font-semibold uppercase tracking-[0.14em] ${statusTone}`}>
          {student.status === "forte" ? "Forte" : student.status === "atencao" ? "Atenção" : "Risco"}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <MetricPill label="Sinapses" value={String(student.points)} />
        <MetricPill label="Missões" value={String(student.missions_completed)} />
        <MetricPill label="Sequência" value={`${student.streak_days}d`} />
        <MetricPill label="Acerto médio" value={`${student.avgAccuracy}%`} />
        <MetricPill label="Tentativas" value={String(student.attemptCount)} />
      </div>
    </button>
  );
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card px-3 py-3 text-center">
      <p className="font-heading text-base font-bold text-foreground">{value}</p>
      <p className="text-[11px] font-body text-muted-foreground">{label}</p>
    </div>
  );
}

function StudentDetailDialog({
  student,
  attempts,
  activityResults,
  turmaAverage,
  temas,
  open,
  onOpenChange,
}: {
  student: StudentInsight | null;
  attempts: StudentAttemptRow[];
  activityResults: ActivityResultRow[];
  turmaAverage: number;
  temas: Array<{ id: string; titulo: string }>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [selectedDisciplinaId, setSelectedDisciplinaId] = useState("all");
  const recentAttempts = [...attempts]
    .sort((a, b) => (parseAppDate(b.completed_at)?.getTime() ?? 0) - (parseAppDate(a.completed_at)?.getTime() ?? 0))
    .slice(0, 5);

  const disciplinaOptions = useMemo(
    () =>
      Array.from(new Set(activityResults.map((result) => result.disciplina_id)))
        .map((disciplinaId) => getDisciplina(disciplinaId))
        .filter((disciplina): disciplina is NonNullable<typeof disciplina> => Boolean(disciplina)),
    [activityResults],
  );

  useEffect(() => {
    if (selectedDisciplinaId === "all") return;
    if (disciplinaOptions.some((disciplina) => disciplina.id === selectedDisciplinaId)) return;
    setSelectedDisciplinaId("all");
  }, [disciplinaOptions, selectedDisciplinaId]);

  const filteredActivityResults = activityResults
    .filter((result) => selectedDisciplinaId === "all" || result.disciplina_id === selectedDisciplinaId)
    .sort((a, b) => (parseAppDate(b.created_at)?.getTime() ?? 0) - (parseAppDate(a.created_at)?.getTime() ?? 0));

  const recentActivityResults = filteredActivityResults.slice(0, 6);

  const recentAverage = recentAttempts.length
    ? Math.round(
        recentAttempts.reduce((sum, attempt) => sum + (attempt.correct_answers / Math.max(attempt.total_questions, 1)) * 100, 0) /
          recentAttempts.length,
      )
    : 0;

  const consistencyLabel =
    !student ? ""
    : student.streak_days >= 5
      ? "Constância excelente"
      : student.streak_days >= 2
        ? "Mantendo boa rotina"
        : "Precisa retomar o ritmo";

  const performanceLabel =
    !student ? ""
    : student.avgAccuracy >= 80
      ? "Acima da média"
      : student.avgAccuracy >= 60
        ? "Em desenvolvimento"
        : "Precisa de reforço";

  const recentDisciplineAverage = recentActivityResults.length
    ? Math.round(
        recentActivityResults.reduce((sum, result) => sum + (result.acertos / Math.max(result.total, 1)) * 100, 0) /
          recentActivityResults.length,
      )
    : recentAverage;

  const evolutionData = (recentActivityResults.length > 0
    ? [...recentActivityResults].slice(0, 6).reverse().map((result) => ({
        id: `${result.tema_id}-${result.created_at}`,
        label: getTemaByIdFromList(temas, result.tema_id)?.titulo ?? result.tema_id,
        subtitle: getDisciplina(result.disciplina_id)?.nome ?? result.disciplina_id,
        percent: Math.round((result.acertos / Math.max(result.total, 1)) * 100),
      }))
    : [...recentAttempts].slice(0, 6).reverse().map((attempt) => ({
        id: `${attempt.user_id}-${attempt.completed_at}`,
        label: formatAppDate(attempt.completed_at, { day: "2-digit", month: "2-digit" }),
        subtitle: "Missão",
        percent: Math.round((attempt.correct_answers / Math.max(attempt.total_questions, 1)) * 100),
      })));

  const disciplineHighlights = Array.from(
    filteredActivityResults.reduce(
      (map, result) => {
        const current = map.get(result.disciplina_id) ?? { disciplinaId: result.disciplina_id, total: 0, acertos: 0, count: 0 };
        current.total += result.total;
        current.acertos += result.acertos;
        current.count += 1;
        map.set(result.disciplina_id, current);
        return map;
      },
      new Map<string, { disciplinaId: string; total: number; acertos: number; count: number }>(),
    ).values(),
  )
    .map((item) => ({
      ...item,
      average: Math.round((item.acertos / Math.max(item.total, 1)) * 100),
      disciplina: getDisciplina(item.disciplinaId),
      visual: getDisciplineVisual(item.disciplinaId),
    }))
    .sort((a, b) => b.average - a.average)
    .slice(0, 3);

  const selectedDiscipline =
    selectedDisciplinaId === "all" ? null : disciplinaOptions.find((disciplina) => disciplina.id === selectedDisciplinaId) ?? null;

  const selectedDisciplineVisual = selectedDiscipline ? getDisciplineVisual(selectedDiscipline.id) : null;
  const turmaGap = student ? student.avgAccuracy - turmaAverage : 0;
  const performanceTone =
    !student ? "text-muted-foreground"
    : student.avgAccuracy >= 80 ? "text-emerald-600"
    : student.avgAccuracy >= 60 ? "text-sky-600"
    : "text-amber-600";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        {!student ? null : (
          <>
            <DialogHeader>
              <DialogTitle className="rounded-[1.8rem] border border-border bg-gradient-to-r from-primary/10 via-background to-sky-50 p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-3">
                    <SimpleProfileAvatar src={student.avatar_url} name={student.nome} size="md" showBadge={false} />
                    <div>
                      <p className="font-heading text-xl font-bold text-foreground">{student.nome}</p>
                      <p className="font-body text-xs font-normal text-muted-foreground">
                        {turmas.find((turma) => turma.id === student.turma_id)?.nome ?? "Sem turma"} · Última atividade: {formatDate(student.lastActive)}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-heading font-semibold ${student.status === "forte" ? "bg-emerald-100 text-emerald-700" : student.status === "atencao" ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"}`}>
                      {student.status === "forte" ? "Ritmo forte" : student.status === "atencao" ? "Em atenção" : "Precisa de apoio"}
                    </span>
                    <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-heading font-semibold text-white">
                      {selectedDiscipline ? selectedDiscipline.nome : "Visão geral"}
                    </span>
                  </div>
                </div>
              </DialogTitle>
              <DialogDescription className="space-y-3">
                <p>Ficha individual com leitura rápida de ritmo, acerto e atividade recente.</p>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-border bg-card/80 px-4 py-3">
                    <p className="text-[11px] font-heading font-semibold uppercase tracking-[0.16em] text-muted-foreground">Comparação com a turma</p>
                    <p className={`mt-2 font-heading text-lg font-bold ${performanceTone}`}>
                      {turmaGap >= 0 ? `+${turmaGap}%` : `${turmaGap}%`}
                    </p>
                    <p className="text-xs text-muted-foreground">Turma em média {turmaAverage}%</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-card/80 px-4 py-3">
                    <p className="text-[11px] font-heading font-semibold uppercase tracking-[0.16em] text-muted-foreground">Foco atual</p>
                    <p className="mt-2 font-heading text-lg font-bold text-foreground">{recentActivityResults.length ? `${recentDisciplineAverage}%` : `${recentAverage}%`}</p>
                    <p className="text-xs text-muted-foreground">
                      {recentActivityResults.length ? "Média nas atividades recentes" : "Média nas missões recentes"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border bg-card/80 px-4 py-3">
                    <p className="text-[11px] font-heading font-semibold uppercase tracking-[0.16em] text-muted-foreground">Constância</p>
                    <p className="mt-2 font-heading text-lg font-bold text-foreground">{student.streak_days} dia(s)</p>
                    <p className="text-xs text-muted-foreground">{consistencyLabel}</p>
                  </div>
                </div>
              </DialogDescription>
            </DialogHeader>

            {disciplineHighlights.length > 0 && (
              <div className="grid gap-3 md:grid-cols-3">
                {disciplineHighlights.map((item) => {
                  const DisciplineIcon = item.visual.icon;
                  return (
                    <div key={item.disciplinaId} className="rounded-2xl border border-border bg-card/80 p-4">
                      <div className="flex items-center gap-3">
                        <span className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${item.visual.iconWrap}`}>
                          <DisciplineIcon className="h-5 w-5" />
                        </span>
                        <div>
                          <p className="font-heading text-sm font-bold text-foreground">{item.disciplina?.nome ?? item.disciplinaId}</p>
                          <p className="text-xs text-muted-foreground">{item.count} atividade(s) registradas</p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-end justify-between">
                        <div>
                          <p className="text-[11px] font-heading font-semibold uppercase tracking-[0.14em] text-muted-foreground">Aproveitamento</p>
                          <p className="font-heading text-2xl font-bold text-foreground">{item.average}%</p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-[11px] font-heading font-semibold ${item.visual.chip}`}>
                          {item.average >= 80 ? "Destaque" : item.average >= 60 ? "Estável" : "Apoio"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <MetricPill label="Sinapses" value={String(student.points)} />
              <MetricPill label="Missões" value={String(student.missions_completed)} />
              <MetricPill label="Sequência" value={`${student.streak_days}d`} />
              <MetricPill label="Acerto médio" value={`${student.avgAccuracy}%`} />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <InsightBox
                title="Leitura geral"
                value={performanceLabel}
                detail={`Turma em média ${turmaAverage}% · aluno com ${student.avgAccuracy}%`}
              />
              <InsightBox
                title="Constância"
                value={consistencyLabel}
                detail={`${student.attemptCount} tentativa(s) registradas`}
              />
              <InsightBox
                title="Recente"
                value={recentAttempts.length ? `${recentAverage}%` : "Sem dados"}
                detail="Média nas últimas missões"
              />
            </div>

            <div className="rounded-2xl border border-border bg-background/70 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Clock3 className="h-4 w-4 text-primary" />
                <h3 className="font-heading text-base font-bold text-foreground">Últimas missões</h3>
              </div>

              {recentAttempts.length === 0 ? (
                <p className="py-6 text-center font-body text-sm text-muted-foreground">
                  Nenhuma missão registrada ainda.
                </p>
              ) : (
                <div className="space-y-2">
                  {recentAttempts.map((attempt) => {
                    const accuracy = Math.round((attempt.correct_answers / Math.max(attempt.total_questions, 1)) * 100);
                    return (
                      <div
                        key={`${attempt.user_id}-${attempt.completed_at}`}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-3 py-3"
                      >
                        <div>
                          <p className="font-heading text-sm font-semibold text-foreground">
                            {formatAppDate(attempt.completed_at, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                          </p>
                          <p className="text-[11px] font-body text-muted-foreground">
                            {attempt.correct_answers}/{attempt.total_questions} corretas
                          </p>
                        </div>
                        <div className="rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-foreground">
                          {accuracy}%
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function StudentPerformanceDialog({
  student,
  attempts,
  activityResults,
  turmaAverage,
  temas,
  open,
  onOpenChange,
}: {
  student: StudentInsight | null;
  attempts: StudentAttemptRow[];
  activityResults: ActivityResultRow[];
  turmaAverage: number;
  temas: Array<{ id: string; titulo: string }>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [selectedDisciplinaId, setSelectedDisciplinaId] = useState("all");

  const recentAttempts = [...attempts]
    .sort((a, b) => (parseAppDate(b.completed_at)?.getTime() ?? 0) - (parseAppDate(a.completed_at)?.getTime() ?? 0))
    .slice(0, 5);

  const disciplinaOptions = useMemo(
    () =>
      Array.from(new Set(activityResults.map((result) => result.disciplina_id)))
        .map((disciplinaId) => getDisciplina(disciplinaId))
        .filter((disciplina): disciplina is NonNullable<typeof disciplina> => Boolean(disciplina)),
    [activityResults],
  );

  useEffect(() => {
    setSelectedDisciplinaId("all");
  }, [open, student?.user_id]);

  useEffect(() => {
    if (selectedDisciplinaId === "all") return;
    if (disciplinaOptions.some((disciplina) => disciplina.id === selectedDisciplinaId)) return;
    setSelectedDisciplinaId("all");
  }, [disciplinaOptions, selectedDisciplinaId]);

  const filteredActivityResults = activityResults
    .filter((result) => selectedDisciplinaId === "all" || result.disciplina_id === selectedDisciplinaId)
    .sort((a, b) => (parseAppDate(b.created_at)?.getTime() ?? 0) - (parseAppDate(a.created_at)?.getTime() ?? 0));

  const recentActivityResults = filteredActivityResults.slice(0, 6);

  const recentAverage = recentAttempts.length
    ? Math.round(
        recentAttempts.reduce((sum, attempt) => sum + (attempt.correct_answers / Math.max(attempt.total_questions, 1)) * 100, 0) /
          recentAttempts.length,
      )
    : 0;

  const recentDisciplineAverage = recentActivityResults.length
    ? Math.round(
        recentActivityResults.reduce((sum, result) => sum + (result.acertos / Math.max(result.total, 1)) * 100, 0) /
          recentActivityResults.length,
      )
    : recentAverage;

  const consistencyLabel =
    !student ? ""
    : student.streak_days >= 5
      ? "Constância excelente"
      : student.streak_days >= 2
        ? "Mantendo boa rotina"
        : "Precisa retomar o ritmo";

  const performanceLabel =
    !student ? ""
    : student.avgAccuracy >= 80
      ? "Acima da média"
      : student.avgAccuracy >= 60
        ? "Em desenvolvimento"
        : "Precisa de reforço";

  const evolutionData = (recentActivityResults.length > 0
    ? [...recentActivityResults].slice(0, 6).reverse().map((result) => ({
        id: `${result.tema_id}-${result.created_at}`,
        label: getTemaByIdFromList(temas, result.tema_id)?.titulo ?? result.tema_id,
        subtitle: getDisciplina(result.disciplina_id)?.nome ?? result.disciplina_id,
        percent: Math.round((result.acertos / Math.max(result.total, 1)) * 100),
      }))
    : [...recentAttempts].slice(0, 6).reverse().map((attempt) => ({
        id: `${attempt.user_id}-${attempt.completed_at}`,
        label: formatAppDate(attempt.completed_at, { day: "2-digit", month: "2-digit" }),
        subtitle: "Missão",
        percent: Math.round((attempt.correct_answers / Math.max(attempt.total_questions, 1)) * 100),
      })));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        {!student ? null : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <SimpleProfileAvatar src={student.avatar_url} name={student.nome} size="md" showBadge={false} />
                <div>
                  <p className="font-heading text-xl font-bold text-foreground">{student.nome}</p>
                  <p className="font-body text-xs font-normal text-muted-foreground">
                    {turmas.find((turma) => turma.id === student.turma_id)?.nome ?? "Sem turma"} · Última atividade: {formatDate(student.lastActive)}
                  </p>
                </div>
              </DialogTitle>
              <DialogDescription>
                Ficha individual com leitura rápida de ritmo, acerto e atividade recente.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <MetricPill label="Sinapses" value={String(student.points)} />
              <MetricPill label="Missões" value={String(student.missions_completed)} />
              <MetricPill label="Sequência" value={`${student.streak_days}d`} />
              <MetricPill label="Acerto médio" value={`${student.avgAccuracy}%`} />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <InsightBox
                title="Leitura geral"
                value={performanceLabel}
                detail={`Turma em média ${turmaAverage}% · aluno com ${student.avgAccuracy}%`}
              />
              <InsightBox
                title="Constância"
                value={consistencyLabel}
                detail={`${student.attemptCount} tentativa(s) registradas`}
              />
              <InsightBox
                title="Recente"
                value={recentActivityResults.length ? `${recentDisciplineAverage}%` : recentAttempts.length ? `${recentAverage}%` : "Sem dados"}
                detail={recentActivityResults.length ? "Média nas últimas atividades" : "Média nas últimas missões"}
              />
            </div>

            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-heading font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Evolução
                  </p>
                  <h3 className="font-heading text-base font-bold text-foreground">Linha de progresso recente</h3>
                </div>
                <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-heading font-semibold text-primary">
                  {recentActivityResults.length > 0 ? "Baseado em atividades" : "Baseado em missões"}
                </div>
              </div>

              {evolutionData.length === 0 ? (
                <p className="py-4 text-center font-body text-sm text-muted-foreground">Ainda não há evolução para mostrar.</p>
              ) : (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
                  {evolutionData.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-border bg-background/70 p-3">
                      <div className="mb-3 flex h-28 items-end justify-center rounded-xl bg-secondary/40 px-2 py-3">
                        <div className="flex h-full items-end">
                          <div
                            className="w-10 rounded-t-xl bg-gradient-to-t from-primary via-primary to-primary/35 shadow-[0_10px_24px_rgba(16,185,129,0.18)]"
                            style={{ height: `${Math.max(item.percent, 10)}%` }}
                          />
                        </div>
                      </div>
                      <p className="font-heading text-sm font-bold text-foreground">{item.percent}%</p>
                      <p className="truncate text-[11px] font-body text-muted-foreground">{item.label}</p>
                      <p className="truncate text-[10px] font-body text-muted-foreground/80">{item.subtitle}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-border bg-background/70 p-4">
              <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-primary" />
                  <h3 className="font-heading text-base font-bold text-foreground">Atividades pedagógicas</h3>
                </div>

                <select
                  value={selectedDisciplinaId}
                  onChange={(event) => setSelectedDisciplinaId(event.target.value)}
                  disabled={disciplinaOptions.length === 0}
                  className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground shadow-sm"
                >
                  <option value="all">Todas as disciplinas</option>
                  {disciplinaOptions.map((disciplina) => (
                    <option key={disciplina.id} value={disciplina.id}>
                      {disciplina.nome}
                    </option>
                  ))}
                </select>
              </div>

              {recentActivityResults.length > 0 ? (
                <div className="space-y-2">
                  {recentActivityResults.map((result) => {
                    const accuracy = Math.round((result.acertos / Math.max(result.total, 1)) * 100);
                    const disciplina = getDisciplina(result.disciplina_id);
                    const tema = getTemaByIdFromList(temas, result.tema_id);
                    const disciplineVisual = getDisciplineVisual(result.disciplina_id);
                    const DisciplineIcon = disciplineVisual.icon;
                    return (
                      <div
                        key={`${result.user_id}-${result.tema_id}-${result.created_at}`}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-3 py-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${disciplineVisual.iconWrap}`}>
                            <DisciplineIcon className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-heading text-sm font-semibold text-foreground">
                                {tema?.titulo ?? result.tema_id}
                              </p>
                              <span className={`rounded-full px-2.5 py-1 text-[10px] font-heading font-semibold ${disciplineVisual.chip}`}>
                                {disciplina?.nome ?? result.disciplina_id}
                              </span>
                              <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-heading font-semibold text-white">
                                {result.tipo === "simulado" ? "Simulado" : "Exercícios"}
                              </span>
                            </div>
                            <p className="text-[11px] font-body text-muted-foreground">
                              {result.acertos}/{result.total} corretas · {formatAppDate(result.created_at, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                        </div>
                        <div className="rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-foreground">
                          {accuracy}%
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : recentAttempts.length === 0 ? (
                <p className="py-6 text-center font-body text-sm text-muted-foreground">
                  Nenhuma atividade registrada ainda.
                </p>
              ) : (
                <div className="space-y-2">
                  {recentAttempts.map((attempt) => {
                    const accuracy = Math.round((attempt.correct_answers / Math.max(attempt.total_questions, 1)) * 100);
                    return (
                      <div
                        key={`${attempt.user_id}-${attempt.completed_at}`}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-3 py-3"
                      >
                        <div>
                          <p className="font-heading text-sm font-semibold text-foreground">
                            {formatAppDate(attempt.completed_at, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                          </p>
                          <p className="text-[11px] font-body text-muted-foreground">
                            {attempt.correct_answers}/{attempt.total_questions} corretas
                          </p>
                        </div>
                        <div className="rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-foreground">
                          {accuracy}%
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function InsightBox({ title, value, detail }: { title: string; value: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-[11px] font-heading font-semibold uppercase tracking-[0.16em] text-muted-foreground">{title}</p>
      <p className="mt-2 font-heading text-lg font-bold text-foreground">{value}</p>
      <p className="mt-1 font-body text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

function InsightPanel({
  title,
  subtitle,
  icon: Icon,
  students,
  emptyLabel,
}: {
  title: string;
  subtitle: string;
  icon: typeof TrendingUp;
  students: StudentInsight[];
  emptyLabel: string;
}) {
  return (
    <div className="rounded-[1.8rem] border border-border bg-card p-5 shadow-card">
      <div className="mb-4 flex items-center gap-3">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <h2 className="font-heading text-lg font-bold text-foreground">{title}</h2>
          <p className="font-body text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>

      <div className="space-y-3">
        {students.length === 0 ? (
          <p className="py-8 text-center font-body text-sm text-muted-foreground">{emptyLabel}</p>
        ) : (
          students.map((student) => (
            <div key={student.user_id} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-background/70 px-3 py-3">
              <div className="flex items-center gap-3">
                <SimpleProfileAvatar src={student.avatar_url} name={student.nome} size="sm" showBadge={false} />
                <div>
                  <p className="font-heading text-sm font-semibold text-foreground">{student.nome}</p>
                  <p className="text-[11px] font-body text-muted-foreground">
                    {student.avgAccuracy}% de acerto · {student.streak_days}d de sequência
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-heading font-semibold text-primary">
                {student.points} pts
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
