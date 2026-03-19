// FractionRunnerPage.jsx
// Página que integra o jogo + ranking via Supabase
// Coloque em: src/pages/games/FractionRunnerPage.jsx (ou onde o seu projeto organiza jogos)

import { useState } from "react";
import FractionRunner from "@/components/games/FractionRunner";
import { useFractionRunner } from "@/hooks/useFractionRunner";

// Adapte para pegar o aluno logado do seu contexto/auth
// import { useAuth } from "@/hooks/useAuth";

export default function FractionRunnerPage() {
  // const { user } = useAuth();
  // const studentName = user?.name || "Aluno";
  // const studentId   = user?.id   || null;
  const studentName = "Aluno"; // substitua pelo seu contexto de auth
  const studentId   = null;

  const { leaderboard, saveResult, saving, saved } = useFractionRunner(studentName, studentId);
  const [showRanking, setShowRanking] = useState(false);

  const handleFinish = async (result) => {
    await saveResult(result);
    setShowRanking(true);
  };

  return (
    <div>
      {!showRanking ? (
        <FractionRunner
          studentName={studentName}
          onFinish={handleFinish}
        />
      ) : (
        <RankingScreen
          leaderboard={leaderboard}
          saving={saving}
          saved={saved}
          studentName={studentName}
          onPlayAgain={() => setShowRanking(false)}
        />
      )}
    </div>
  );
}

function RankingScreen({ leaderboard, saving, saved, studentName, onPlayAgain }) {
  return (
    <div style={{
      minHeight: "100vh", background: "#0f0c29",
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "20px",
      fontFamily: "'Nunito', sans-serif", color: "white"
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@700;800&family=Nunito:wght@400;700;800&display=swap');`}</style>

      <h2 style={{ fontFamily: "'Baloo 2', cursive", fontSize: "clamp(24px,6vw,40px)", color: "#4ecca3", marginBottom: "6px" }}>
        🏆 Ranking da Turma
      </h2>
      <p style={{ color: "#888", marginBottom: "24px", fontSize: "14px" }}>
        {saving ? "Salvando resultado..." : saved ? "✅ Resultado salvo!" : ""}
      </p>

      <div style={{ width: "100%", maxWidth: "420px", display: "flex", flexDirection: "column", gap: "10px", marginBottom: "28px" }}>
        {leaderboard.length === 0 && (
          <p style={{ textAlign: "center", color: "#555" }}>Nenhum resultado ainda.</p>
        )}
        {leaderboard.map((entry, i) => {
          const medals = ["🥇", "🥈", "🥉"];
          const isMe = entry.student_name === studentName;
          return (
            <div key={i} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              background: isMe ? "rgba(78,204,163,0.12)" : "rgba(255,255,255,0.05)",
              border: `1px solid ${isMe ? "rgba(78,204,163,0.4)" : "rgba(255,255,255,0.08)"}`,
              borderRadius: "14px", padding: "12px 18px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "18px" }}>{medals[i] || `${i + 1}.`}</span>
                <span style={{ fontWeight: 800, color: isMe ? "#4ecca3" : "#ccc" }}>{entry.student_name}</span>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 900, color: "#ffe66d", fontSize: "17px" }}>{entry.score} pts</div>
                <div style={{ fontSize: "12px", color: "#666" }}>{entry.correct_count}/{entry.total_questions} ✅</div>
              </div>
            </div>
          );
        })}
      </div>

      <button onClick={onPlayAgain} style={{
        background: "linear-gradient(135deg,#4ecca3,#38b2ac)", border: "none",
        borderRadius: "16px", padding: "13px 32px", color: "#0f0c29",
        fontSize: "17px", fontFamily: "'Baloo 2', cursive", fontWeight: 800, cursor: "pointer"
      }}>
        🏃 Jogar Novamente
      </button>
    </div>
  );
}
