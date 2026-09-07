type MascotMarkProps = {
  sizeClassName?: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  variant?: "full" | "mark";
};

/**
 * Zoey, mascote oficial da plataforma.
 *
 * O srcSet evita baixar a arte maior nos usos compactos (como o cabecalho),
 * mantendo definicao suficiente para telas de alta densidade no hero.
 */
export default function MascotMark({
  sizeClassName = "h-10 w-10",
  className = "",
  sizes = "2.5rem",
  priority = false,
  variant = "full",
}: MascotMarkProps) {
  const isMark = variant === "mark";

  return (
    <img
      src={isMark ? "/mascote-zoey-mark-384.webp" : "/mascote-zoey-384.webp"}
      srcSet={isMark ? undefined : "/mascote-zoey-384.webp 384w, /mascote-zoey-768.webp 768w"}
      sizes={sizes}
      width={isMark ? 384 : 768}
      height={isMark ? 384 : 768}
      alt="Zoey, mascote do Ilustrando Estudos"
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
      draggable={false}
      className={`max-w-full select-none object-contain drop-shadow-sm dark:drop-shadow-[0_2px_2px_rgba(255,255,255,0.18)] ${sizeClassName} ${className}`.trim()}
    />
  );
}
