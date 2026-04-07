import { supabase } from "@/integrations/supabase/client";

export type ActivityResultType = "exercicio" | "simulado";

type RecordActivityResultInput = {
  userId: string;
  turmaId: string;
  disciplinaId: string;
  temaId: string;
  tipo: ActivityResultType;
  acertos: number;
  total: number;
  countsForPoints?: boolean;
};

export async function recordActivityResult(input: RecordActivityResultInput) {
  if (input.total <= 0) return;

  const { error } = await supabase.from("activity_results").insert({
    user_id: input.userId,
    turma_id: input.turmaId,
    disciplina_id: input.disciplinaId,
    tema_id: input.temaId,
    tipo: input.tipo,
    acertos: input.acertos,
    total: input.total,
    counts_for_points: input.countsForPoints ?? true,
  });

  if (error) {
    console.error("Não foi possível salvar o resultado pedagógico:", error);
  }
}
