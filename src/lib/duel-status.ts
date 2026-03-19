export type DuelPresenceStatus = "accepting" | "studying";

const STORAGE_KEY = "duel_presence_status";
export const DUEL_STATUS_EVENT = "duel-status-changed";

export function getStoredDuelStatus(): DuelPresenceStatus {
  if (typeof window === "undefined") return "accepting";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "studying" ? "studying" : "accepting";
}

export function setStoredDuelStatus(status: DuelPresenceStatus) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, status);
  window.dispatchEvent(new CustomEvent(DUEL_STATUS_EVENT, { detail: status }));
}

export function getDuelStatusMeta(status: DuelPresenceStatus) {
  if (status === "studying") {
    return {
      label: "Só estudando",
      shortLabel: "Estudando",
      emoji: "📘",
    };
  }

  return {
    label: "Aceitando desafios",
    shortLabel: "Na arena",
    emoji: "🛡️",
  };
}
