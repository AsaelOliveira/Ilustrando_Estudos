const APP_TIME_ZONE = "America/Sao_Paulo";

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

export function getSaoPauloDateStamp(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function getPreviousSaoPauloDateStamp(date = new Date()) {
  const previousDate = new Date(date);
  previousDate.setDate(previousDate.getDate() - 1);
  return getSaoPauloDateStamp(previousDate);
}
