import { useEffect, useRef, useState, useCallback } from "react";

// ─── FRACTIONS CURRICULUM 6º ANO ─────────────────────────────────────────────
const QUESTIONS = [
  // Leitura de frações
  { question: "Qual fração representa 1 parte de 2 iguais?", answers: ["1/2","2/1","1/3","2/3"], correct: 0, hint: "Divida 1 todo em 2 partes iguais" },
  { question: "Qual fração representa 3 partes de 4 iguais?", answers: ["4/3","3/4","1/4","3/3"], correct: 1, hint: "Numerador = partes; Denominador = total" },
  { question: "Qual é a fração com numerador 2 e denominador 5?", answers: ["5/2","2/3","2/5","3/5"], correct: 2, hint: "Numerador em cima, denominador embaixo" },
  // Equivalência
  { question: "1/2 é igual a qual fração?", answers: ["2/5","3/4","2/4","1/4"], correct: 2, hint: "Multiplique numerador e denominador por 2" },
  { question: "Qual fração é equivalente a 2/3?", answers: ["4/9","4/6","3/6","2/6"], correct: 1, hint: "Multiplique numerador e denominador por 2" },
  { question: "3/6 simplificada é igual a?", answers: ["3/3","2/4","1/2","1/3"], correct: 2, hint: "Divida numerador e denominador por 3" },
  { question: "Qual fração é equivalente a 1/4?", answers: ["2/6","3/8","2/8","1/8"], correct: 2, hint: "Multiplique numerador e denominador por 2" },
  // Comparação
  { question: "Qual é a maior fração?", answers: ["1/4","1/3","1/2","1/5"], correct: 2, hint: "Mesmo numerador: menor denominador = maior fração" },
  { question: "Qual é a menor fração?", answers: ["2/3","2/4","2/5","2/6"], correct: 3, hint: "Mesmo numerador: maior denominador = menor fração" },
  { question: "Qual fração está entre 1/4 e 3/4?", answers: ["1/8","3/8","2/4","5/4"], correct: 2, hint: "2/4 = 1/2, que fica entre 1/4 e 3/4" },
  // Soma — mesmo denominador
  { question: "1/4 + 2/4 = ?", answers: ["3/8","2/4","3/4","1/2"], correct: 2, hint: "Mesmo denominador: some os numeradores" },
  { question: "2/7 + 3/7 = ?", answers: ["5/14","5/7","1/7","6/7"], correct: 1, hint: "Denominadores iguais: some só os numeradores" },
  { question: "1/6 + 4/6 = ?", answers: ["5/12","4/6","5/6","1/6"], correct: 2, hint: "1+4=5, denominador continua 6" },
  // Subtração — mesmo denominador
  { question: "5/8 - 3/8 = ?", answers: ["2/8","2/0","8/8","2/16"], correct: 0, hint: "Denominadores iguais: subtraia os numeradores" },
  { question: "7/10 - 3/10 = ?", answers: ["4/20","4/0","3/10","4/10"], correct: 3, hint: "7-3=4, denominador continua 10" },
  // Fração de um inteiro
  { question: "Metade de 20 é?", answers: ["5","15","10","8"], correct: 2, hint: "1/2 de 20 = 20÷2" },
  { question: "1/4 de 12 é?", answers: ["4","3","6","2"], correct: 1, hint: "1/4 de 12 = 12÷4" },
  { question: "2/3 de 9 é?", answers: ["3","6","4","5"], correct: 1, hint: "2/3 de 9: primeiro 9÷3=3, depois 3×2=6" },
  // Frações impróprias e mistas
  { question: "A fração 5/3 é chamada de:", answers: ["Própria","Unitária","Imprópria","Decimal"], correct: 2, hint: "Quando numerador > denominador = imprópria" },
  { question: "1 e 1/2 como fração imprópria é:", answers: ["2/2","1/2","3/2","4/2"], correct: 2, hint: "1×2+1=3, denominador 2 → 3/2" },
];

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const W = 800, H = 320;
const GROUND = H - 60;
const RUNNER_X = 120;
const RUNNER_W = 44, RUNNER_H = 54;
const GRAVITY = 0.55;
const JUMP_FORCE = -13;
const OBSTACLE_W = 52, OBSTACLE_H = 52;
const SPEEDS = [3.5, 4.2, 5.0, 5.8];

// ─── COLORS ───────────────────────────────────────────────────────────────────
const PALETTE = {
  sky1: "#0f0c29", sky2: "#302b63", sky3: "#24243e",
  ground: "#1a1a2e", groundTop: "#e94560",
  runner: "#f5a623", runnerShade: "#c8821a",
  obstacle: "#e94560", obstacleShade: "#a3102e",
  particle: ["#f5a623","#e94560","#4ecca3","#fff","#ffe66d"],
  correct: "#4ecca3", wrong: "#e94560",
  cloud: "rgba(255,255,255,0.06)",
  star: "rgba(255,255,255,0.7)",
};

// ─── PARTICLE SYSTEM ─────────────────────────────────────────────────────────
function spawnParticles(x, y, color, count = 18) {
  return Array.from({ length: count }, () => ({
    x, y,
    vx: (Math.random() - 0.5) * 9,
    vy: (Math.random() - 0.5) * 9 - 3,
    life: 1,
    decay: 0.04 + Math.random() * 0.04,
    size: 3 + Math.random() * 5,
    color,
  }));
}

// ─── DRAW HELPERS ─────────────────────────────────────────────────────────────
function drawRunner(ctx, x, y, frame, state) {
  // body
  ctx.save();
  if (state === "hit") { ctx.globalAlpha = 0.6; ctx.filter = "hue-rotate(180deg)"; }

  // legs animation
  const legOffset = state === "jump" ? 8 : Math.sin(frame * 0.3) * 8;
  // back leg
  ctx.fillStyle = PALETTE.runnerShade;
  ctx.beginPath(); ctx.roundRect(x + 14, y + 36, 10, 20 - legOffset, 4); ctx.fill();
  // front leg
  ctx.fillStyle = PALETTE.runner;
  ctx.beginPath(); ctx.roundRect(x + 24, y + 36, 10, 20 + legOffset, 4); ctx.fill();
  // body
  ctx.fillStyle = PALETTE.runner;
  ctx.beginPath(); ctx.roundRect(x + 8, y + 14, 28, 26, 8); ctx.fill();
  // arm swing
  const armSwing = state === "jump" ? -12 : Math.sin(frame * 0.3 + 1) * 10;
  ctx.strokeStyle = PALETTE.runnerShade; ctx.lineWidth = 6; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(x + 20, y + 22); ctx.lineTo(x + 8, y + 28 + armSwing); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + 24, y + 22); ctx.lineTo(x + 36, y + 28 - armSwing); ctx.stroke();
  // head
  ctx.fillStyle = "#ffe0b2";
  ctx.beginPath(); ctx.arc(x + 22, y + 10, 12, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#333";
  ctx.beginPath(); ctx.arc(x + 26, y + 8, 2.5, 0, Math.PI * 2); ctx.fill();
  // scarf
  ctx.strokeStyle = PALETTE.correct; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(x + 12, y + 20); ctx.lineTo(x + 32, y + 20); ctx.stroke();

  ctx.restore();
}

function drawObstacle(ctx, x, q) {
  const y = GROUND - OBSTACLE_H;
  // shadow
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath(); ctx.ellipse(x + OBSTACLE_W / 2, GROUND + 4, OBSTACLE_W / 2, 6, 0, 0, Math.PI * 2); ctx.fill();
  // block
  ctx.fillStyle = PALETTE.obstacleShade;
  ctx.beginPath(); ctx.roundRect(x, y + 4, OBSTACLE_W, OBSTACLE_H, 10); ctx.fill();
  ctx.fillStyle = PALETTE.obstacle;
  ctx.beginPath(); ctx.roundRect(x, y, OBSTACLE_W, OBSTACLE_H, 10); ctx.fill();
  // fraction on obstacle
  ctx.fillStyle = "#fff";
  ctx.font = "bold 11px 'Nunito', sans-serif";
  ctx.textAlign = "center";
  // draw the question's correct fraction visually
  const ans = q.answers[q.correct];
  const parts = ans.includes("/") ? ans.split("/") : null;
  if (parts) {
    ctx.font = "bold 14px 'Nunito', sans-serif";
    ctx.fillText(parts[0], x + OBSTACLE_W / 2, y + 18);
    ctx.fillRect(x + 10, y + 22, OBSTACLE_W - 20, 2);
    ctx.fillText(parts[1], x + OBSTACLE_W / 2, y + 38);
  } else {
    ctx.font = "bold 18px 'Nunito', sans-serif";
    ctx.fillText(ans, x + OBSTACLE_W / 2, y + 30);
  }
  ctx.textAlign = "left";
}

function drawBackground(ctx, offset, clouds) {
  // gradient sky
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, PALETTE.sky1);
  grad.addColorStop(0.6, PALETTE.sky2);
  grad.addColorStop(1, PALETTE.sky3);
  ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);

  // stars (static)
  ctx.fillStyle = PALETTE.star;
  for (let i = 0; i < 40; i++) {
    const sx = ((i * 173 + offset * 0.1) % W);
    const sy = (i * 47) % (H * 0.6);
    const ss = (i % 3 === 0) ? 1.5 : 0.8;
    ctx.beginPath(); ctx.arc(sx, sy, ss, 0, Math.PI * 2); ctx.fill();
  }

  // clouds
  clouds.forEach(c => {
    ctx.fillStyle = PALETTE.cloud;
    ctx.beginPath(); ctx.ellipse(c.x, c.y, c.w, c.h, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(c.x + c.w * 0.5, c.y - c.h * 0.4, c.w * 0.7, c.h * 0.8, 0, 0, Math.PI * 2); ctx.fill();
  });

  // ground
  const groundGrad = ctx.createLinearGradient(0, GROUND, 0, H);
  groundGrad.addColorStop(0, "#1a1a2e");
  groundGrad.addColorStop(1, "#0f0c29");
  ctx.fillStyle = groundGrad; ctx.fillRect(0, GROUND, W, H - GROUND);
  // ground line
  ctx.strokeStyle = PALETTE.groundTop; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(0, GROUND); ctx.lineTo(W, GROUND); ctx.stroke();
  // ground pattern
  ctx.strokeStyle = "rgba(233,69,96,0.15)"; ctx.lineWidth = 1;
  const lineOff = offset % 60;
  for (let lx = -lineOff; lx < W; lx += 60) {
    ctx.beginPath(); ctx.moveTo(lx, GROUND); ctx.lineTo(lx + 20, H); ctx.stroke();
  }
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export default function FractionRunner({ studentName = "Aluno", onFinish }) {
  const canvasRef = useRef(null);
  const stateRef = useRef({
    running: false,
    vy: 0, py: GROUND - RUNNER_H, onGround: true,
    runnerState: "run", // run | jump | hit | celebrate
    frame: 0,
    offset: 0,
    obstacle: null, // { x, qIndex }
    particles: [],
    clouds: Array.from({ length: 5 }, (_, i) => ({ x: i * 180, y: 40 + i * 20, w: 60 + i * 10, h: 20 + i * 5 })),
    score: 0,
    combo: 0,
    distance: 0,
    questionIndex: 0,
    correctCount: 0,
    wrongCount: 0,
    level: 0,
    screenFlash: 0,
    flashColor: "#4ecca3",
    questionQueue: [],
    totalQuestions: 10,
    answered: 0,
    gameOver: false,
  });

  const [uiState, setUiState] = useState("intro"); // intro | playing | question | gameover
  const [currentQ, setCurrentQ] = useState(null);
  const [selectedAns, setSelectedAns] = useState(null);
  const [answerFeedback, setAnswerFeedback] = useState(null); // null | correct | wrong
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [totalQ] = useState(10);
  const [lives, setLives] = useState(3);
  const [showHint, setShowHint] = useState(false);
  const [gameResult, setGameResult] = useState(null);
  const rafRef = useRef(null);
  const pausedForQ = useRef(false);

  // shuffle questions
  const buildQueue = useCallback(() => {
    const shuffled = [...QUESTIONS].sort(() => Math.random() - 0.5).slice(0, 10);
    return shuffled;
  }, []);

  // ─── GAME LOOP ──────────────────────────────────────────────────────────────
  const loop = useCallback(() => {
    const s = stateRef.current;
    const canvas = canvasRef.current;
    if (!canvas || s.gameOver) return;
    const ctx = canvas.getContext("2d");

    if (!pausedForQ.current) {
      s.frame++;
      s.distance += 1;
      const spd = SPEEDS[s.level];

      // scroll background
      s.offset += spd;
      s.clouds.forEach(c => {
        c.x -= spd * 0.3;
        if (c.x < -120) c.x = W + 60;
      });

      // physics
      if (!s.onGround) {
        s.vy += GRAVITY;
        s.py += s.vy;
        if (s.py >= GROUND - RUNNER_H) {
          s.py = GROUND - RUNNER_H;
          s.vy = 0;
          s.onGround = true;
          if (s.runnerState === "jump") s.runnerState = "run";
        }
      }

      // obstacle
      if (!s.obstacle && s.questionQueue.length > 0 && s.answered < s.totalQuestions) {
        s.obstacle = { x: W + 50, qIndex: s.questionQueue[s.answered] };
        s.qShowing = false;
      }
      if (s.obstacle) {
        s.obstacle.x -= spd;
        // show question when obstacle is ~350px away
        if (!s.qShowing && s.obstacle.x < W - 300) {
          s.qShowing = true;
          pausedForQ.current = true;
          setCurrentQ(s.obstacle.qIndex);
          setSelectedAns(null);
          setAnswerFeedback(null);
          setShowHint(false);
          setUiState("question");
        }
      }

      // particles
      s.particles = s.particles
        .map(p => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, vy: p.vy + 0.25, life: p.life - p.decay }))
        .filter(p => p.life > 0);

      // screen flash decay
      if (s.screenFlash > 0) s.screenFlash -= 0.06;
    }

    // ─── DRAW ────────────────────────────────────────────────────────────────
    drawBackground(ctx, s.offset, s.clouds);

    if (s.obstacle) drawObstacle(ctx, s.obstacle.x, s.obstacle.qIndex);

    drawRunner(ctx, RUNNER_X, s.py, s.frame, s.runnerState);

    // particles
    s.particles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    });

    // screen flash overlay
    if (s.screenFlash > 0) {
      ctx.save();
      ctx.globalAlpha = s.screenFlash * 0.35;
      ctx.fillStyle = s.flashColor;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    // HUD: distance
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.beginPath(); ctx.roundRect(W - 140, 10, 130, 32, 8); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.font = "bold 13px 'Nunito', sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`📏 ${Math.floor(s.distance / 10)}m`, W - 16, 32);
    ctx.textAlign = "left";

    rafRef.current = requestAnimationFrame(loop);
  }, []);

  const startGame = useCallback(() => {
    const s = stateRef.current;
    s.running = true;
    s.vy = 0; s.py = GROUND - RUNNER_H; s.onGround = true;
    s.runnerState = "run";
    s.frame = 0; s.offset = 0;
    s.obstacle = null; s.particles = [];
    s.score = 0; s.combo = 0; s.distance = 0;
    s.questionIndex = 0; s.correctCount = 0; s.wrongCount = 0;
    s.level = 0; s.screenFlash = 0;
    s.answered = 0; s.gameOver = false;
    s.questionQueue = buildQueue();
    s.qShowing = false;
    setScore(0); setCombo(0); setAnswered(0); setLives(3);
    setUiState("playing");
    pausedForQ.current = false;
    rafRef.current = requestAnimationFrame(loop);
  }, [loop, buildQueue]);

  const handleAnswer = useCallback((idx) => {
    if (selectedAns !== null) return;
    const q = currentQ;
    const correct = idx === q.correct;
    setSelectedAns(idx);
    setAnswerFeedback(correct ? "correct" : "wrong");

    const s = stateRef.current;

    if (correct) {
      // JUMP over obstacle!
      s.vy = JUMP_FORCE;
      s.onGround = false;
      s.runnerState = "jump";
      const newCombo = s.combo + 1;
      s.combo = newCombo;
      const pts = 100 + (newCombo > 1 ? (newCombo - 1) * 50 : 0);
      s.score += pts;
      s.correctCount++;
      s.flashColor = PALETTE.correct;
      s.screenFlash = 1;
      // explode obstacle with particles
      if (s.obstacle) {
        const ox = s.obstacle.x + OBSTACLE_W / 2;
        const oy = GROUND - OBSTACLE_H / 2;
        const colors = [...PALETTE.particle];
        s.particles.push(...spawnParticles(ox, oy, colors[Math.floor(Math.random() * colors.length)], 28));
      }
      setScore(s.score);
      setCombo(s.combo);
    } else {
      // HIT — stumble
      s.runnerState = "hit";
      s.combo = 0;
      const newLives = lives - 1;
      setLives(newLives);
      s.flashColor = PALETTE.wrong;
      s.screenFlash = 1;
      setCombo(0);
      if (newLives <= 0) {
        setTimeout(() => {
          s.gameOver = true;
          setGameResult({ score: s.score, correct: s.correctCount, wrong: s.wrongCount, total: s.totalQuestions });
          setUiState("gameover");
        }, 800);
      }
      setTimeout(() => { if (s.runnerState === "hit") s.runnerState = "run"; }, 600);
    }

    s.answered++;
    setAnswered(s.answered);
    s.obstacle = null;
    s.qShowing = false;

    setTimeout(() => {
      pausedForQ.current = false;
      setUiState("playing");
      setSelectedAns(null);
      setAnswerFeedback(null);
      setShowHint(false);
      // check if done
      if (s.answered >= s.totalQuestions) {
        setTimeout(() => {
          s.gameOver = true;
          setGameResult({ score: s.score, correct: s.correctCount, wrong: s.wrongCount, total: s.totalQuestions });
          setUiState("gameover");
        }, 1200);
      }
    }, correct ? 900 : 1400);
  }, [currentQ, selectedAns, lives]);

  useEffect(() => {
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  // scale canvas to fit mobile
  const containerRef = useRef(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const obs = new ResizeObserver(entries => {
      for (const e of entries) {
        const w = e.contentRect.width;
        setScale(Math.min(1, w / W));
      }
    });
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  // ─── MEDAL ────────────────────────────────────────────────────────────────
  const getMedal = (correct, total) => {
    const pct = correct / total;
    if (pct >= 0.9) return { icon: "🥇", label: "Mestre das Frações!", color: "#ffd93d" };
    if (pct >= 0.7) return { icon: "🥈", label: "Ótimo desempenho!", color: "#c0c0c0" };
    if (pct >= 0.5) return { icon: "🥉", label: "Bom começo!", color: "#cd7f32" };
    return { icon: "📚", label: "Continue praticando!", color: "#888" };
  };

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "#0f0c29", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Nunito', sans-serif", color: "white", padding: "16px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;800;900&family=Baloo+2:wght@700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pop { 0%{transform:scale(0.8)} 60%{transform:scale(1.1)} 100%{transform:scale(1)} }
        @keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-6px)} 75%{transform:translateX(6px)} }
        @keyframes glow { 0%,100%{box-shadow:0 0 12px #4ecca355} 50%{box-shadow:0 0 28px #4ecca3aa} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes streak { 0%{opacity:0;transform:scale(0.5)translateY(0)} 50%{opacity:1;transform:scale(1.4)translateY(-30px)} 100%{opacity:0;transform:scale(1)translateY(-60px)} }
        .fadeUp { animation: fadeUp 0.4s ease forwards; }
        .pop { animation: pop 0.35s ease forwards; }
        .shake { animation: shake 0.4s ease; }
        .float { animation: float 3s ease-in-out infinite; }
        .ans-btn { transition: all 0.18s; border: 2.5px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.07); color: white; border-radius: 14px; padding: 14px 18px; cursor: pointer; font-family: 'Nunito', sans-serif; font-size: clamp(15px,3.5vw,19px); font-weight: 800; text-align: center; }
        .ans-btn:hover:not(:disabled) { transform: scale(1.04); border-color: #4ecca3; background: rgba(78,204,163,0.15); }
        .ans-btn:active:not(:disabled) { transform: scale(0.97); }
        .ans-correct { border-color: #4ecca3 !important; background: rgba(78,204,163,0.25) !important; animation: glow 1s ease; }
        .ans-wrong { border-color: #e94560 !important; background: rgba(233,69,96,0.25) !important; animation: shake 0.4s ease; }
        .ans-reveal { border-color: #4ecca3 !important; background: rgba(78,204,163,0.12) !important; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-thumb { background: #4ecca3; border-radius: 4px; }
      `}</style>

      {/* ── INTRO ── */}
      {uiState === "intro" && (
        <div className="fadeUp" style={{ maxWidth: 480, width: "100%", textAlign: "center" }}>
          <div className="float" style={{ fontSize: "80px", marginBottom: "10px" }}>🏃</div>
          <h1 style={{ fontFamily: "'Baloo 2', cursive", fontSize: "clamp(28px,7vw,48px)", background: "linear-gradient(135deg,#4ecca3,#ffe66d)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", lineHeight: 1.1, marginBottom: "10px" }}>
            Corrida das Frações
          </h1>
          <p style={{ color: "#aaa", marginBottom: "8px", fontSize: "15px" }}>Derrube os obstáculos respondendo certo!</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "20px", padding: "20px", marginBottom: "28px", textAlign: "left" }}>
            {[["🏁","Responda a fração certa para PULAR o obstáculo"],["❤️","Você tem 3 vidas — errar perde uma vida"],["🔥","Acertar em sequência dá combo e mais pontos"],["📐","Conteúdo de frações do 6º ano"]].map(([icon, txt], i) => (
              <div key={i} style={{ display: "flex", gap: "12px", alignItems: "flex-start", fontSize: "14px", color: "#ccc" }}>
                <span style={{ fontSize: "18px" }}>{icon}</span><span>{txt}</span>
              </div>
            ))}
          </div>
          <button onClick={startGame} style={{ background: "linear-gradient(135deg,#4ecca3,#38b2ac)", border: "none", borderRadius: "20px", padding: "16px 48px", color: "#0f0c29", fontSize: "20px", fontFamily: "'Baloo 2', cursive", fontWeight: 800, cursor: "pointer", boxShadow: "0 4px 24px #4ecca355", transition: "all 0.2s" }}
            onMouseOver={e => e.target.style.transform = "scale(1.05)"}
            onMouseOut={e => e.target.style.transform = "scale(1)"}>
            Começar Corrida! 🚀
          </button>
        </div>
      )}

      {/* ── PLAYING + QUESTION ── */}
      {(uiState === "playing" || uiState === "question") && (
        <div style={{ width: "100%", maxWidth: W, display: "flex", flexDirection: "column", gap: "12px" }}>
          {/* scorebar */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 4px" }}>
            <div style={{ display: "flex", gap: "4px" }}>
              {Array.from({ length: 3 }).map((_, i) => <span key={i} style={{ fontSize: "20px", opacity: i < lives ? 1 : 0.2, transition: "opacity 0.4s" }}>❤️</span>)}
            </div>
            <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
              {combo >= 2 && <span style={{ fontSize: "13px", color: "#ffe66d", fontWeight: 800 }}>🔥 ×{combo}</span>}
              <span style={{ fontSize: "15px", fontWeight: 800, color: "#4ecca3" }}>⭐ {score}</span>
              <span style={{ fontSize: "13px", color: "#888" }}>{answered}/{totalQ}</span>
            </div>
          </div>

          {/* canvas */}
          <div ref={containerRef} style={{ width: "100%", borderRadius: "20px", overflow: "hidden", border: "2px solid rgba(78,204,163,0.2)", boxShadow: "0 0 40px rgba(78,204,163,0.1)" }}>
            <canvas ref={canvasRef} width={W} height={H}
              style={{ display: "block", width: "100%", height: "auto", imageRendering: "pixelated" }} />
          </div>

          {/* progress bar */}
          <div style={{ width: "100%", height: "5px", background: "rgba(255,255,255,0.08)", borderRadius: "10px", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${(answered / totalQ) * 100}%`, background: "linear-gradient(90deg,#4ecca3,#ffe66d)", borderRadius: "10px", transition: "width 0.5s ease" }} />
          </div>

          {/* QUESTION PANEL */}
          {uiState === "question" && currentQ && (
            <div className="fadeUp" style={{ background: "rgba(15,12,41,0.97)", border: "2px solid rgba(78,204,163,0.3)", borderRadius: "24px", padding: "clamp(16px,4vw,28px)", backdropFilter: "blur(12px)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px", gap: "10px" }}>
                <p style={{ fontSize: "clamp(15px,3.5vw,20px)", fontWeight: 900, color: "#fff", lineHeight: 1.3, flex: 1 }}>
                  {currentQ.question}
                </p>
                <button onClick={() => setShowHint(h => !h)}
                  style={{ background: showHint ? "rgba(255,230,109,0.2)" : "rgba(255,255,255,0.07)", border: `1.5px solid ${showHint ? "#ffe66d" : "rgba(255,255,255,0.15)"}`, borderRadius: "10px", padding: "5px 12px", color: showHint ? "#ffe66d" : "#888", cursor: "pointer", fontSize: "13px", whiteSpace: "nowrap", fontFamily: "Nunito", fontWeight: 700 }}>
                  💡 Dica
                </button>
              </div>
              {showHint && (
                <div className="fadeUp" style={{ background: "rgba(255,230,109,0.1)", border: "1px solid rgba(255,230,109,0.3)", borderRadius: "12px", padding: "10px 14px", marginBottom: "14px", fontSize: "14px", color: "#ffe66d" }}>
                  {currentQ.hint}
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                {currentQ.answers.map((ans, i) => {
                  let cls = "ans-btn";
                  if (selectedAns !== null) {
                    if (i === currentQ.correct) cls += " ans-reveal ans-correct";
                    else if (i === selectedAns && selectedAns !== currentQ.correct) cls += " ans-wrong";
                  }
                  return (
                    <button key={i} className={cls} disabled={selectedAns !== null} onClick={() => handleAnswer(i)}>
                      {ans}
                      {selectedAns !== null && i === currentQ.correct && " ✅"}
                      {selectedAns === i && i !== currentQ.correct && " ❌"}
                    </button>
                  );
                })}
              </div>
              {answerFeedback && (
                <div className="pop" style={{ textAlign: "center", marginTop: "14px", fontSize: "clamp(15px,4vw,20px)", fontWeight: 900, color: answerFeedback === "correct" ? "#4ecca3" : "#e94560" }}>
                  {answerFeedback === "correct"
                    ? combo >= 3 ? `🔥 COMBO ×${combo}! +${100 + (combo - 1) * 50} pts` : "🎉 Correto! Você pulou o obstáculo!"
                    : `😬 Errou! Era: ${currentQ.answers[currentQ.correct]}`}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── GAME OVER ── */}
      {uiState === "gameover" && gameResult && (() => {
        const medal = getMedal(gameResult.correct, gameResult.total);
        return (
          <div className="fadeUp" style={{ maxWidth: 420, width: "100%", textAlign: "center" }}>
            <div className="float" style={{ fontSize: "80px", marginBottom: "10px" }}>{medal.icon}</div>
            <h2 style={{ fontFamily: "'Baloo 2', cursive", fontSize: "clamp(22px,6vw,36px)", color: medal.color, marginBottom: "6px" }}>{medal.label}</h2>
            <p style={{ color: "#aaa", marginBottom: "28px", fontSize: "14px" }}>Corrida concluída, {studentName}!</p>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "28px" }}>
              {[
                ["⭐", "Pontuação", `${gameResult.score} pts`, "#ffe66d"],
                ["✅", "Acertos", `${gameResult.correct} de ${gameResult.total}`, "#4ecca3"],
                ["❌", "Erros", `${gameResult.wrong}`, "#e94560"],
              ].map(([icon, label, val, color], i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "14px", padding: "12px 20px", fontFamily: "Nunito", fontSize: "16px" }}>
                  <span style={{ color: "#bbb" }}>{icon} {label}</span>
                  <strong style={{ color }}>{val}</strong>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
              <button onClick={startGame} style={{ background: "linear-gradient(135deg,#4ecca3,#38b2ac)", border: "none", borderRadius: "16px", padding: "13px 28px", color: "#0f0c29", fontSize: "16px", fontFamily: "'Baloo 2', cursive", fontWeight: 800, cursor: "pointer" }}>
                🔄 Jogar Novamente
              </button>
              {onFinish && (
                <button onClick={() => onFinish(gameResult)} style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "16px", padding: "13px 28px", color: "white", fontSize: "16px", fontFamily: "'Baloo 2', cursive", fontWeight: 800, cursor: "pointer" }}>
                  📊 Ver Ranking
                </button>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
