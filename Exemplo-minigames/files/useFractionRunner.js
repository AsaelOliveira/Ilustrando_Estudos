// useFractionRunner.js
// Estratégia Supabase Free:
//   - 1 INSERT por partida (ao terminar)
//   - 1 SELECT para o ranking (carrega 1x, sem realtime)
//   - Cache local com localStorage para não repetir leituras desnecessárias

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// SQL para criar a tabela (rode no Supabase SQL Editor):
/*
create table if not exists game_scores (
  id uuid default gen_random_uuid() primary key,
  student_name text not null,
  student_id text,
  game_id text not null default 'fraction_runner',
  score integer not null,
  correct_count integer not null,
  total_questions integer not null,
  created_at timestamptz default now()
);
-- índice para ranking rápido
create index if not exists idx_game_scores_game_score
  on game_scores(game_id, score desc);

-- Row Level Security (recomendado)
alter table game_scores enable row level security;
create policy "Anyone can insert" on game_scores for insert with check (true);
create policy "Anyone can read" on game_scores for select using (true);
*/

const GAME_ID = "fraction_runner";
const CACHE_KEY = "fractionrunner_leaderboard";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

export function useFractionRunner(studentName, studentId) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  // Carrega ranking com cache local — não bate no Supabase toda hora
  const loadLeaderboard = useCallback(async (force = false) => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!force && cached) {
        const { data, ts } = JSON.parse(cached);
        if (Date.now() - ts < CACHE_TTL) {
          setLeaderboard(data);
          return;
        }
      }
      const { data, error } = await supabase
        .from("game_scores")
        .select("student_name, score, correct_count, total_questions, created_at")
        .eq("game_id", GAME_ID)
        .order("score", { ascending: false })
        .limit(10);

      if (error) throw error;
      setLeaderboard(data || []);
      localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
    } catch (e) {
      console.warn("Leaderboard load failed:", e.message);
    }
  }, []);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  // Salva resultado — apenas 1 INSERT
  const saveResult = useCallback(async (result) => {
    if (saving || saved) return;
    setSaving(true);
    setError(null);
    try {
      const { error } = await supabase.from("game_scores").insert({
        student_name: studentName || "Anônimo",
        student_id: studentId || null,
        game_id: GAME_ID,
        score: result.score,
        correct_count: result.correct,
        total_questions: result.total,
      });
      if (error) throw error;
      setSaved(true);
      // Atualiza ranking após salvar (invalida cache)
      await loadLeaderboard(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }, [studentName, studentId, saving, saved, loadLeaderboard]);

  return { leaderboard, saveResult, saving, saved, error };
}
