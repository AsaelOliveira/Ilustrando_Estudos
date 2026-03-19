export function parseAppDate(value: string | null | undefined) {
  if (!value) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

export function formatAppDate(
  value: string | null | undefined,
  options: Intl.DateTimeFormatOptions,
  fallback = "Sem atividade",
) {
  const parsed = parseAppDate(value);
  if (!parsed) return fallback;
  return new Intl.DateTimeFormat("pt-BR", options).format(parsed);
}
