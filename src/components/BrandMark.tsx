type BrandMarkProps = {
  sizeClassName?: string;
  imageClassName?: string;
  className?: string;
};

export default function BrandMark({
  sizeClassName = "h-10 w-10",
  imageClassName = "h-8 w-8",
  className = "",
}: BrandMarkProps) {
  return (
    <div
      className={`flex items-center justify-center rounded-2xl border border-slate-200/80 bg-white shadow-soft ${sizeClassName} ${className}`.trim()}
    >
      <img
        src="/logo-escola.png"
        alt="Escola Ilustrando o Aprender"
        className={`object-contain ${imageClassName}`.trim()}
      />
    </div>
  );
}
