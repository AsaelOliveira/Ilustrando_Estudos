import type { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type DuelRow = Database["public"]["Tables"]["duels"]["Row"];
type DuelMutationResult = Promise<{ data: DuelRow | null; error: PostgrestError | null }>;

type CreateDuelInput = {
  challengerId: string;
  challengedId: string | null;
  mode: "anonimo" | "aberto";
  visibility: "privado" | "publico";
  challengerDisplayName: string;
  challengerDisplayTurma: string | null;
  questionIds: string[];
  turmaId: string;
  disciplineId: string | null;
  interclass: boolean;
  numQuestions: number;
  timeLimit: number;
};

type SubmitDuelAttemptInput = {
  duelId: string;
  playerRole: "challenger" | "challenged";
  userId: string;
  answers: Array<string | null>;
  questions: Array<{ respostaCorreta: string }>;
  timeSpentSeconds: number;
  antiCheatFlags: string[];
};

function isMissingFunctionError(error: PostgrestError | null, functionName: string) {
  return Boolean(error?.message?.includes(`Could not find the function public.${functionName}`));
}

function toAnswerPayload(answers: Array<string | null>) {
  return answers.map((answer) => answer ?? "");
}

function calculateScore(
  questions: Array<{ respostaCorreta: string }>,
  answers: string[],
) {
  return questions.reduce((total, question, index) => {
    return total + (answers[index] === question.respostaCorreta ? 1 : 0);
  }, 0);
}

export async function createDuel(input: CreateDuelInput) {
  const normalizedQuestionIds = input.questionIds
    .map((questionId) => questionId.trim())
    .filter(Boolean);

  if (normalizedQuestionIds.length !== input.numQuestions) {
    throw new Error("O duelo precisa ser criado com a quantidade correta de questoes.");
  }

  return supabase
    .from("duels")
    .insert({
      challenger_id: input.challengerId,
      challenged_id: input.challengedId,
      mode: input.mode,
      visibility: input.visibility,
      challenger_display_name: input.challengerDisplayName.trim(),
      challenger_display_turma: input.challengerDisplayTurma,
      question_ids: normalizedQuestionIds,
      turma_id: input.turmaId,
      discipline_id: input.disciplineId,
      interclass: input.interclass,
      num_questions: input.numQuestions,
      time_limit: input.timeLimit,
      status: "aberto",
    })
    .select("id")
    .single();
}

export async function findJoinableDuelByCode(inviteCode: string, currentUserId: string) {
  const normalizedCode = inviteCode.trim().toUpperCase();

  if (normalizedCode.length < 4) {
    return null;
  }

  const { data: duels, error } = await supabase
    .from("duels")
    .select("id, status, challenger_id, challenged_id")
    .eq("status", "aguardando")
    .gt("expires_at", new Date().toISOString())
    .limit(50);

  if (error) {
    throw error;
  }

  return (
    duels?.find(
      (duel) =>
        duel.id.replace(/-/g, "").slice(0, 6).toUpperCase() === normalizedCode &&
        duel.challenger_id !== currentUserId,
    ) ?? null
  );
}

export async function acceptDuel(duelId: string, userId: string): DuelMutationResult {
  const { data, error } = await supabase.rpc("accept_duel", {
    p_duel_id: duelId,
  });

  if (!isMissingFunctionError(error, "accept_duel")) {
    return { data: data ?? null, error };
  }

  const fallback = await supabase
    .from("duels")
    .update({
      challenged_id: userId,
      status: "em_batalha",
    })
    .eq("id", duelId)
    .eq("status", "aguardando")
    .or(`challenged_id.is.null,challenged_id.eq.${userId}`)
    .select("*")
    .single();

  return {
    data: fallback.data ?? null,
    error: fallback.error,
  };
}

export async function cancelDuel(duelId: string): DuelMutationResult {
  const { data, error } = await supabase.rpc("cancel_duel", {
    p_duel_id: duelId,
  });

  if (!isMissingFunctionError(error, "cancel_duel")) {
    return { data: data ?? null, error };
  }

  const fallback = await supabase
    .from("duels")
    .update({ status: "expirado" })
    .eq("id", duelId)
    .in("status", ["aberto", "aguardando"])
    .select("*")
    .single();

  return {
    data: fallback.data ?? null,
    error: fallback.error,
  };
}

export async function submitDuelAttempt(input: SubmitDuelAttemptInput): DuelMutationResult {
  const answersPayload = toAnswerPayload(input.answers);
  const { data, error } = await supabase.rpc("submit_duel_attempt", {
    p_duel_id: input.duelId,
    p_answers: answersPayload,
    p_time_spent_seconds: input.timeSpentSeconds,
    p_anti_cheat_flags: input.antiCheatFlags,
  });

  if (!isMissingFunctionError(error, "submit_duel_attempt")) {
    return { data: data ?? null, error };
  }

  const score = calculateScore(input.questions, answersPayload);
  const completedAt = new Date().toISOString();

  if (input.playerRole === "challenger") {
    const fallback = await supabase
      .from("duels")
      .update({
        challenger_answers: answersPayload,
        challenger_score: score,
        challenger_time_seconds: input.timeSpentSeconds,
        challenger_anti_cheat: input.antiCheatFlags,
        challenger_finished_at: completedAt,
        status: "aguardando",
      })
      .eq("id", input.duelId)
      .eq("challenger_id", input.userId)
      .eq("status", "aberto")
      .select("*")
      .single();

    return {
      data: fallback.data ?? null,
      error: fallback.error,
    };
  }

  const fallback = await supabase
    .from("duels")
    .update({
      challenged_answers: answersPayload,
      challenged_score: score,
      challenged_time_seconds: input.timeSpentSeconds,
      challenged_anti_cheat: input.antiCheatFlags,
      challenged_finished_at: completedAt,
    })
    .eq("id", input.duelId)
    .eq("challenged_id", input.userId)
    .eq("status", "em_batalha")
    .select("*")
    .single();

  if (fallback.error || !fallback.data) {
    return {
      data: fallback.data ?? null,
      error: fallback.error,
    };
  }

  const finalizeResult = await supabase.rpc("finalize_duel", {
    p_duel_id: input.duelId,
  });

  if (finalizeResult.error) {
    return {
      data: fallback.data,
      error: finalizeResult.error,
    };
  }

  const refreshed = await supabase
    .from("duels")
    .select("*")
    .eq("id", input.duelId)
    .single();

  return {
    data: refreshed.data ?? fallback.data,
    error: refreshed.error,
  };
}
