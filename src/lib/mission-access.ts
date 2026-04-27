import type { PostgrestError } from "@supabase/supabase-js";
import type { Questao } from "@/data/content-types";
import { getPreviousSaoPauloDateStamp, getSaoPauloDateStamp } from "@/lib/date-utils";
import {
  calculateMissionScore,
  type MissionScoringConfig,
  type MissionScoreBreakdown,
} from "@/lib/mission-scoring";
import { supabase } from "@/integrations/supabase/client";

export interface MissionSubmissionPayload {
  alreadyRecorded: boolean;
  message: string;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  easyCorrect?: number;
  mediumCorrect?: number;
  hardCorrect?: number;
  basePoints?: number;
  fairPlayBonus?: number;
  streakBonus?: number;
  streakDaysAfter?: number;
}

type SubmitDailyMissionInput = {
  userId: string;
  turmaId: string;
  questionIds: string[];
  answers: Array<string | null>;
  questions: Questao[];
  antiCheatFlags: string[];
  timeSpentSeconds: number;
  scoringConfig: MissionScoringConfig;
};

function isMissingFunctionError(error: PostgrestError | null, functionName: string) {
  return Boolean(error?.message?.includes(`Could not find the function public.${functionName}`));
}

function toSubmissionPayload(
  scoreBreakdown: MissionScoreBreakdown,
  totalQuestions: number,
  streakDaysAfter: number,
): MissionSubmissionPayload {
  return {
    alreadyRecorded: false,
    message: "Pontuação registrada com sucesso no ranking.",
    score: scoreBreakdown.totalPoints,
    correctAnswers: scoreBreakdown.correctAnswers,
    totalQuestions,
    easyCorrect: scoreBreakdown.easyCorrect,
    mediumCorrect: scoreBreakdown.mediumCorrect,
    hardCorrect: scoreBreakdown.hardCorrect,
    basePoints: scoreBreakdown.basePoints,
    fairPlayBonus: scoreBreakdown.fairPlayBonus,
    streakBonus: scoreBreakdown.streakBonus,
    streakDaysAfter,
  };
}

export async function submitDailyMission(input: SubmitDailyMissionInput) {
  const answersPayload = input.answers.map((answer) => answer ?? "");
  const { data, error } = await supabase.rpc("submit_daily_mission", {
    p_turma_id: input.turmaId,
    p_question_ids: input.questionIds,
    p_answers: answersPayload,
    p_time_spent_seconds: input.timeSpentSeconds,
    p_anti_cheat_flags: { flags: input.antiCheatFlags },
  });

  if (!isMissingFunctionError(error, "submit_daily_mission")) {
    return {
      data: (data as MissionSubmissionPayload | null) ?? null,
      error,
    };
  }

  const today = getSaoPauloDateStamp();
  const previousDay = getPreviousSaoPauloDateStamp();

  const [{ data: existingAttempt }, { data: existingScore, error: scoreLoadError }] = await Promise.all([
    supabase
      .from("mission_attempts")
      .select("score, correct_answers, total_questions")
      .eq("user_id", input.userId)
      .eq("mission_date", today)
      .maybeSingle(),
    supabase
      .from("student_scores")
      .select("points, missions_completed, streak_days, last_mission_date")
      .eq("user_id", input.userId)
      .maybeSingle(),
  ]);

  if (scoreLoadError) {
    return { data: null, error: scoreLoadError };
  }

  if (existingAttempt) {
    return {
      data: {
        alreadyRecorded: true,
        message: "Sua missão de hoje já estava registrada. Os pontos não foram somados novamente.",
        score: existingAttempt.score ?? 0,
        correctAnswers: existingAttempt.correct_answers ?? 0,
        totalQuestions: existingAttempt.total_questions ?? input.questionIds.length,
        streakDaysAfter: existingScore?.streak_days ?? 0,
      },
      error: null,
    };
  }

  const lastMissionDate = existingScore?.last_mission_date ?? null;
  const validStreakDays =
    lastMissionDate === today || lastMissionDate === previousDay ? (existingScore?.streak_days ?? 0) : 0;
  const scoreBreakdown = calculateMissionScore(
    input.questions,
    input.answers,
    input.antiCheatFlags,
    input.scoringConfig,
    validStreakDays,
  );
  const nextStreakDays = lastMissionDate === previousDay ? (existingScore?.streak_days ?? 0) + 1 : 1;

  const attemptInsert = await supabase.from("mission_attempts").insert({
    user_id: input.userId,
    mission_date: today,
    turma_id: input.turmaId,
    score: scoreBreakdown.totalPoints,
    total_questions: input.questionIds.length,
    correct_answers: scoreBreakdown.correctAnswers,
    time_spent_seconds: Math.max(0, Math.min(input.timeSpentSeconds, 3600)),
    anti_cheat_flags: { flags: input.antiCheatFlags },
  });

  if (attemptInsert.error) {
    return { data: null, error: attemptInsert.error };
  }

  let scoreError: PostgrestError | null = null;

  if (existingScore) {
    const scoreUpdate = await supabase
      .from("student_scores")
      .update({
        points: (existingScore.points ?? 0) + scoreBreakdown.totalPoints,
        missions_completed: (existingScore.missions_completed ?? 0) + 1,
        streak_days: nextStreakDays,
        last_mission_date: today,
      })
      .eq("user_id", input.userId);

    scoreError = scoreUpdate.error;
  } else {
    const scoreInsert = await supabase.from("student_scores").insert({
      user_id: input.userId,
      turma_id: input.turmaId,
      points: scoreBreakdown.totalPoints,
      missions_completed: 1,
      streak_days: nextStreakDays,
      last_mission_date: today,
    });

    scoreError = scoreInsert.error;
  }

  if (scoreError) {
    return { data: null, error: scoreError };
  }

  return {
    data: toSubmissionPayload(scoreBreakdown, input.questionIds.length, nextStreakDays),
    error: null,
  };
}
