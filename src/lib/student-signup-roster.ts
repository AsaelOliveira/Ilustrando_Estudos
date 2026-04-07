import { supabase } from "@/integrations/supabase/client";

export type StudentSignupRosterEntry = {
  nome: string;
  turma_id: string;
  email: string;
  claimed_user_id?: string | null;
  claimed_at?: string | null;
};

const STUDENT_SIGNUP_ROSTER_KEY = "student_signup_roster";

function simplifyText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function normalizeRosterName(value: string) {
  return simplifyText(value);
}

export function normalizeRosterTurma(value: string) {
  const simplified = simplifyText(value)
    .replace(/[º°]/g, "")
    .replace(/\s+/g, "");

  if (simplified.includes("6")) return "6ano";
  if (simplified.includes("7")) return "7ano";
  if (simplified.includes("8")) return "8ano";
  if (simplified.includes("9")) return "9ano";

  return value.trim().toLowerCase();
}

export function findRosterEntriesByName(entries: StudentSignupRosterEntry[], nome: string) {
  const normalizedName = normalizeRosterName(nome);
  if (!normalizedName) return [];

  return entries.filter((entry) => normalizeRosterName(entry.nome) === normalizedName);
}

function normalizeRosterEmail(value: string) {
  return simplifyText(value);
}

export function serializeSignupRoster(entries: StudentSignupRosterEntry[]) {
  return entries
    .map((entry) => `${entry.nome},${entry.turma_id},${entry.email}`)
    .join("\n");
}

export function parseSignupRosterCsv(csv: string) {
  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const seenKeys = new Set<string>();
  const entries: StudentSignupRosterEntry[] = [];
  const errors: string[] = [];

  lines.forEach((line, index) => {
    const [rawNome = "", rawTurma = "", rawEmail = ""] = line.split(",").map((part) => part.trim());
    const isHeaderLine =
      index === 0 &&
      normalizeRosterName(rawNome) === "nome" &&
      normalizeRosterName(rawTurma).startsWith("serie") &&
      normalizeRosterName(rawEmail) === "email";

    if (isHeaderLine) return;

    const nome = rawNome.replace(/\s+/g, " ").trim();
    const turma_id = normalizeRosterTurma(rawTurma);
    const email = rawEmail.toLowerCase();

    if (!nome || !turma_id || !email) {
      errors.push(`Linha ${index + 1}: use nome,turmaId,email.`);
      return;
    }

    const dedupeKey = normalizeRosterName(nome);
    if (seenKeys.has(dedupeKey)) {
      errors.push(`Linha ${index + 1}: aluno duplicado na lista autorizada.`);
      return;
    }

    seenKeys.add(dedupeKey);
    entries.push({ nome, turma_id, email });
  });

  return { entries, errors };
}

export async function loadSignupRoster() {
  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", STUDENT_SIGNUP_ROSTER_KEY)
    .maybeSingle();

  if (error) throw error;

  if (!data?.value || !Array.isArray(data.value)) {
    return [] as StudentSignupRosterEntry[];
  }

  return data.value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => ({
      nome: typeof item.nome === "string" ? item.nome : "",
      turma_id: typeof item.turma_id === "string" ? normalizeRosterTurma(item.turma_id) : "",
      email: typeof item.email === "string" ? item.email : "",
      claimed_user_id: typeof item.claimed_user_id === "string" ? item.claimed_user_id : null,
      claimed_at: typeof item.claimed_at === "string" ? item.claimed_at : null,
    }))
    .filter((item) => item.nome && item.turma_id && item.email);
}

export async function saveSignupRoster(entries: StudentSignupRosterEntry[]) {
  const seenNames = new Set<string>();
  for (const entry of entries) {
    const normalizedName = normalizeRosterName(entry.nome);
    if (seenNames.has(normalizedName)) {
      throw new Error("Não é permitido repetir o mesmo nome na lista autorizada.");
    }
    seenNames.add(normalizedName);
  }

  const existingEntries = await loadSignupRoster();
  const existingByKey = new Map(
    existingEntries.map((entry) => [
      `${entry.turma_id}::${normalizeRosterName(entry.nome)}::${normalizeRosterEmail(entry.email)}`,
      entry,
    ]),
  );

  const mergedEntries = entries.map((entry) => {
    const existing = existingByKey.get(
      `${entry.turma_id}::${normalizeRosterName(entry.nome)}::${normalizeRosterEmail(entry.email)}`,
    );

    return existing
      ? {
          ...entry,
          claimed_user_id: existing.claimed_user_id ?? null,
          claimed_at: existing.claimed_at ?? null,
        }
      : {
          ...entry,
          claimed_user_id: null,
          claimed_at: null,
        };
  });

  const { error } = await supabase.from("app_settings").upsert(
    {
      key: STUDENT_SIGNUP_ROSTER_KEY,
      description: "Lista autorizada para autocadastro dos alunos.",
      value: mergedEntries,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" },
  );

  if (error) throw error;

  return mergedEntries;
}
