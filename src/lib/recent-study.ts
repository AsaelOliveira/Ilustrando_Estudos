export interface RecentStudyEntry {
  turmaId: string;
  disciplinaId: string;
  temaId: string;
  visitedAt: string;
}

const RECENT_STUDY_KEY = "ilustrando_recent_study";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getRecentStudy(): RecentStudyEntry | null {
  if (!canUseStorage()) return null;

  const raw = window.localStorage.getItem(RECENT_STUDY_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<RecentStudyEntry>;

    if (!parsed.turmaId || !parsed.disciplinaId || !parsed.temaId || !parsed.visitedAt) {
      return null;
    }

    return {
      turmaId: parsed.turmaId,
      disciplinaId: parsed.disciplinaId,
      temaId: parsed.temaId,
      visitedAt: parsed.visitedAt,
    };
  } catch {
    return null;
  }
}

export function setRecentStudy(entry: RecentStudyEntry) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(RECENT_STUDY_KEY, JSON.stringify(entry));
}
