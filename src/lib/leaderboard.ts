import { supabase } from "@/integrations/supabase/client";

type ScoreRow = {
  user_id: string;
  turma_id: string;
  points: number;
  missions_completed?: number;
  streak_days?: number;
};

type ProfileRow = {
  user_id: string;
  nome: string;
  turma_id: string | null;
  avatar_url?: string | null;
};

type BaseLeaderboardEntry = {
  user_id: string;
  nome: string;
  turma_id: string;
  points: number;
};

export type LeaderboardEntry = BaseLeaderboardEntry & {
  missions_completed: number;
  streak_days: number;
  avatar_url: string | null;
};

export async function fetchLeaderboardSnapshot(options: {
  turmaId: string;
  turmaLimit: number;
  geralLimit: number;
  includeStats?: boolean;
  includeAvatar?: boolean;
}) {
  const scoreFields = [
    "user_id",
    "turma_id",
    "points",
    options.includeStats ? "missions_completed" : null,
    options.includeStats ? "streak_days" : null,
  ]
    .filter(Boolean)
    .join(", ");

  const [turmaScoresRes, geralScoresRes] = await Promise.all([
    supabase
      .from("student_scores")
      .select(scoreFields)
      .eq("turma_id", options.turmaId)
      .order("points", { ascending: false })
      .limit(options.turmaLimit),
    supabase
      .from("student_scores")
      .select(scoreFields)
      .order("points", { ascending: false })
      .limit(options.geralLimit),
  ]);

  const allScoreRows = [
    ...((turmaScoresRes.data as ScoreRow[] | null) ?? []),
    ...((geralScoresRes.data as ScoreRow[] | null) ?? []),
  ];
  const userIds = Array.from(new Set(allScoreRows.map((row) => row.user_id)));

  const profileFields = [
    "user_id",
    "nome",
    "turma_id",
    options.includeAvatar ? "avatar_url" : null,
  ]
    .filter(Boolean)
    .join(", ");

  const { data: profiles } = userIds.length
    ? await supabase.from("profiles").select(profileFields).in("user_id", userIds)
    : { data: [] as ProfileRow[] };

  const profileMap = new Map(((profiles as ProfileRow[] | null) ?? []).map((profile) => [profile.user_id, profile]));

  const mapRows = (rows: ScoreRow[]): LeaderboardEntry[] =>
    rows.map((row) => {
      const profile = profileMap.get(row.user_id);

      return {
        user_id: row.user_id,
        nome: profile?.nome || "Aluno",
        turma_id: row.turma_id,
        points: row.points,
        missions_completed: row.missions_completed ?? 0,
        streak_days: row.streak_days ?? 0,
        avatar_url: profile?.avatar_url ?? null,
      };
    });

  return {
    turma: mapRows((turmaScoresRes.data as ScoreRow[] | null) ?? []),
    geral: mapRows((geralScoresRes.data as ScoreRow[] | null) ?? []),
  };
}
