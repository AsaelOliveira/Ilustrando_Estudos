import { useState, useMemo } from "react";
import { motion } from "framer-motion";

interface ConfettiPiece {
  id: number;
  x: number;
  delay: number;
  color: string;
  size: number;
}

export default function Confetti({ show }: { show: boolean }) {
  const pieces = useMemo(() => {
    if (!show) return [];
    const colors = [
      "hsl(258, 90%, 62%)",
      "hsl(35, 100%, 55%)",
      "hsl(152, 70%, 45%)",
      "hsl(258, 90%, 72%)",
      "hsl(45, 93%, 58%)",
    ];
    return Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 1.5,
      color: colors[i % colors.length],
      size: Math.random() * 6 + 4,
    }));
  }, [show]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
      {pieces.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-sm"
          style={{
            left: `${p.x}%`,
            top: -20,
            width: p.size,
            height: p.size * 1.5,
            backgroundColor: p.color,
          }}
          initial={{ y: -20, rotate: 0, opacity: 1 }}
          animate={{ y: "110vh", rotate: 720, opacity: 0 }}
          transition={{ duration: 2.5 + Math.random(), delay: p.delay, ease: "easeIn" }}
        />
      ))}
    </div>
  );
}
