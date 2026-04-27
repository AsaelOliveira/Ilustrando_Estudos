import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getSaoPauloDateStamp } from "@/lib/date-utils";

type AppAlertsContextValue = {
  missionAvailable: boolean;
  openDuelCount: number;
  loading: boolean;
  refresh: () => Promise<void>;
};

const AppAlertsContext = createContext<AppAlertsContextValue | null>(null);

export function AppAlertsProvider({ children }: { children: ReactNode }) {
  const { user, role, loading: authLoading } = useAuth();
  const [missionAvailable, setMissionAvailable] = useState(false);
  const [openDuelCount, setOpenDuelCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (authLoading) return;

    if (!user || role !== "aluno") {
      setMissionAvailable(false);
      setOpenDuelCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    const today = getSaoPauloDateStamp();

    const [{ count: missionCount }, { count: duelCount }] = await Promise.all([
      supabase
        .from("mission_attempts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("mission_date", today),
      supabase
        .from("duels")
        .select("*", { count: "exact", head: true })
        .eq("challenged_id", user.id)
        .eq("status", "aguardando"),
    ]);

    setMissionAvailable((missionCount ?? 0) === 0);
    setOpenDuelCount(duelCount ?? 0);
    setLoading(false);
  }, [authLoading, role, user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!user || role !== "aluno") return;

    const channel = supabase
      .channel(`app-alerts:${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "duels", filter: `challenged_id=eq.${user.id}` },
        () => void refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "mission_attempts", filter: `user_id=eq.${user.id}` },
        () => void refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "student_scores", filter: `user_id=eq.${user.id}` },
        () => void refresh(),
      )
      .subscribe();

    const handleFocus = () => void refresh();
    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
      void supabase.removeChannel(channel);
    };
  }, [refresh, role, user]);

  const value = useMemo(
    () => ({
      missionAvailable,
      openDuelCount,
      loading,
      refresh,
    }),
    [loading, missionAvailable, openDuelCount, refresh],
  );

  return <AppAlertsContext.Provider value={value}>{children}</AppAlertsContext.Provider>;
}

export function useAppAlerts() {
  const context = useContext(AppAlertsContext);

  if (!context) {
    return {
      missionAvailable: false,
      openDuelCount: 0,
      loading: true,
      refresh: async () => {},
    };
  }

  return context;
}
