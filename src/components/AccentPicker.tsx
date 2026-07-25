import { Check } from "lucide-react";
import { useAccentTheme } from "@/lib/accent-theme";
import { cn } from "@/lib/utils";

/**
 * Seletor da cor de destaque do app (preferencia local do aluno).
 * Usado na secao "Aparencia" da pagina de configuracoes.
 */
export function AccentPicker() {
  const { accent, setAccent, options } = useAccentTheme();

  return (
    <div className="flex flex-wrap items-center gap-3" role="radiogroup" aria-label="Cor do aplicativo">
      {options.map((option) => {
        const selected = option.id === accent;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={option.label}
            title={option.label}
            onClick={() => setAccent(option.id)}
            className={cn(
              "btn-tap flex h-11 w-11 items-center justify-center rounded-full border-2 transition-all",
              selected
                ? "scale-110 border-foreground/60"
                : "border-transparent hover:scale-105"
            )}
            style={{
              backgroundColor: option.swatch,
              boxShadow: selected
                ? `0 3px 0 rgba(0,0,0,0.25), 0 0 0 3px hsl(var(--background)), 0 0 0 5px ${option.swatch}`
                : "0 3px 0 rgba(0,0,0,0.2)",
            }}
          >
            {selected && <Check className="h-5 w-5 text-white drop-shadow" strokeWidth={3.5} />}
          </button>
        );
      })}
    </div>
  );
}
