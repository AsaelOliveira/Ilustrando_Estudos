/**
 * Fundo decorativo: formas geometricas nas cores da paleta (estilo da maquete).
 * Leve (divs puras), sem animacao, opacidade menor no escuro.
 */
export default function BackgroundConfetti() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute left-[6%] top-[12%] h-10 w-10 rounded-full bg-brand-green opacity-[0.14] dark:opacity-[0.08]" />
      <div className="absolute right-[10%] top-[18%] h-8 w-8 rotate-12 rounded-lg bg-brand-yellow opacity-[0.14] dark:opacity-[0.08]" />
      <div className="absolute left-[14%] top-[58%] h-7 w-7 rotate-45 rounded-md bg-brand-blue opacity-[0.12] dark:opacity-[0.07]" />
      <div className="absolute right-[6%] top-[46%] h-12 w-12 rounded-full border-[6px] border-brand-purple opacity-[0.12] dark:opacity-[0.07]" />
      <div className="absolute bottom-[14%] left-[40%] h-6 w-6 rounded-full bg-brand-pink opacity-[0.12] dark:opacity-[0.07]" />
      <div className="absolute bottom-[22%] right-[24%] hidden h-9 w-9 rotate-12 rounded-lg bg-brand-orange opacity-[0.12] dark:opacity-[0.07] sm:block" />
      <div className="absolute left-[46%] top-[8%] hidden h-5 w-5 rotate-45 rounded bg-brand-blue opacity-[0.10] dark:opacity-[0.06] sm:block" />
      <div className="absolute bottom-[8%] left-[8%] hidden h-8 w-8 rounded-full border-4 border-brand-green opacity-[0.10] dark:opacity-[0.06] sm:block" />
    </div>
  );
}
