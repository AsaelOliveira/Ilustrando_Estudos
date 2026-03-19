import type { Questao } from "@/data/content-types";
import { supabase } from "@/integrations/supabase/client";

export interface MissionScoringConfig {
  easyPoints: number;
  mediumPoints: number;
  hardPoints: number;
  fairPlayBonus: number;
}

export interface MissionScoreBreakdown {
  correctAnswers: number;
  easyCorrect: number;
  mediumCorrect: number;
  hardCorrect: number;
  basePoints: number;
  fairPlayBonus: number;
  streakBonus: number;
  totalPoints: number;
}

/** Calcula bônus de sequência (streak) */
export function getStreakBonus(streakDays: number): { bonus: number; label: string } {
  if (streakDays >= 7) return { bonus: 5, label: "7+ dias: +5 pts" };
  if (streakDays >= 5) return { bonus: 3, label: "5+ dias: +3 pts" };
  if (streakDays >= 3) return { bonus: 2, label: "3+ dias: +2 pts" };
  return { bonus: 0, label: "" };
}

export const DEFAULT_MISSION_SCORING: MissionScoringConfig = {
  easyPoints: 1,
  mediumPoints: 2,
  hardPoints: 3,
  fairPlayBonus: 1,
};

function normalizePoints(value: unknown, fallback: number) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return fallback;
  return Math.max(0, Math.round(numericValue));
}

export function normalizeMissionScoringConfig(value: unknown): MissionScoringConfig {
  const source = value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  return {
    easyPoints: normalizePoints(source.easyPoints, DEFAULT_MISSION_SCORING.easyPoints),
    mediumPoints: normalizePoints(source.mediumPoints, DEFAULT_MISSION_SCORING.mediumPoints),
    hardPoints: normalizePoints(source.hardPoints, DEFAULT_MISSION_SCORING.hardPoints),
    fairPlayBonus: normalizePoints(source.fairPlayBonus, DEFAULT_MISSION_SCORING.fairPlayBonus),
  };
}

export function calculateMissionScore(
  questions: Questao[],
  answers: Array<string | null>,
  antiCheatFlags: string[],
  config: MissionScoringConfig,
  streakDays: number = 0,
): MissionScoreBreakdown {
  let easyCorrect = 0;
  let mediumCorrect = 0;
  let hardCorrect = 0;

  questions.forEach((question, index) => {
    if (answers[index] !== question.respostaCorreta) return;

    if (question.dificuldade === "facil") easyCorrect += 1;
    if (question.dificuldade === "medio") mediumCorrect += 1;
    if (question.dificuldade === "dificil") hardCorrect += 1;
  });

  const basePoints =
    easyCorrect * config.easyPoints +
    mediumCorrect * config.mediumPoints +
    hardCorrect * config.hardPoints;
  const fairPlayBonus = antiCheatFlags.length === 0 ? config.fairPlayBonus : 0;
  const { bonus: streakBonus } = getStreakBonus(streakDays);

  return {
    correctAnswers: easyCorrect + mediumCorrect + hardCorrect,
    easyCorrect,
    mediumCorrect,
    hardCorrect,
    basePoints,
    fairPlayBonus,
    streakBonus,
    totalPoints: basePoints + fairPlayBonus + streakBonus,
  };
}

export async function loadMissionScoringConfig() {
  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "mission_scoring")
    .maybeSingle();

  if (error || !data) return DEFAULT_MISSION_SCORING;
  return normalizeMissionScoringConfig(data.value);
}

export async function saveMissionScoringConfig(config: MissionScoringConfig) {
  return supabase.from("app_settings").upsert(
    {
      key: "mission_scoring",
      description: "Configuracao de pontuacao da missao diaria",
      value: config,
    },
    { onConflict: "key" },
  );
}
