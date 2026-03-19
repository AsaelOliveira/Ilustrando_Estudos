import { motion } from "framer-motion";

interface MathBlockProps {
  lines: string[];
  highlight?: boolean;
}

/** Renders math operations in a vertical/stacked format */
export default function MathBlock({ lines, highlight }: MathBlockProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`inline-flex flex-col items-end font-mono text-lg px-6 py-4 rounded-xl border ${
        highlight
          ? "bg-primary/5 border-primary/20"
          : "bg-secondary/50 border-border"
      }`}
    >
      {lines.map((line, i) => (
        <div
          key={i}
          className={`${
            i === lines.length - 1 ? "border-t-2 border-foreground/30 pt-1 mt-1 font-bold text-primary" : ""
          } whitespace-pre text-right leading-relaxed`}
        >
          {line}
        </div>
      ))}
    </motion.div>
  );
}

/** Renders a fraction visually as numerator/denominator stacked */
export function FractionDisplay({ numerator, denominator, size = "md" }: { numerator: string | number; denominator: string | number; size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "text-sm px-2",
    md: "text-lg px-3",
    lg: "text-2xl px-4",
  };

  return (
    <span className={`inline-flex flex-col items-center ${sizeClasses[size]} font-mono`}>
      <span className="text-foreground">{numerator}</span>
      <span className="border-t-2 border-foreground/40 w-full min-w-[1.5em]" />
      <span className="text-foreground">{denominator}</span>
    </span>
  );
}
