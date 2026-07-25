type MascotMarkProps = {
  sizeClassName?: string;
  className?: string;
};

/**
 * Mascote da plataforma (placeholder em /mascote.svg).
 * Para trocar pelo mascote definitivo, basta substituir o arquivo
 * public/mascote.svg — todos os usos passam por este componente.
 */
export default function MascotMark({
  sizeClassName = "h-10 w-10",
  className = "",
}: MascotMarkProps) {
  return (
    <img
      src="/mascote.svg"
      alt="Mascote do Ilustrando Estudos"
      className={`object-contain ${sizeClassName} ${className}`.trim()}
    />
  );
}
