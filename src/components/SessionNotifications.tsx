import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

function getTodayKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export default function SessionNotifications() {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (loading || !user || location.pathname === "/login") return;

    let active = true;

    const run = async () => {
      const today = getTodayKey();
      const missionToastKey = `mission-toast:${user.id}:${today}`;
      const duelToastPrefix = `duel-toast:${user.id}:`;

      const notifications: Array<{ title: string; description: string }> = [];

      if (role === "aluno") {
        const { data: missionToday } = await supabase
          .from("mission_attempts")
          .select("id")
          .eq("user_id", user.id)
          .eq("mission_date", today)
          .maybeSingle();

        if (!missionToday && !sessionStorage.getItem(missionToastKey)) {
          notifications.push({
            title: "Missão diária disponível",
            description: "Sua missão de hoje já está liberada. Entre em Competição para ganhar pontos e Sinapses.",
          });
          sessionStorage.setItem(missionToastKey, "shown");
        }

        const { data: incomingDuels } = await supabase
          .from("duels")
          .select("id")
          .eq("challenged_id", user.id)
          .eq("status", "aberto");

        const duelIds = (incomingDuels ?? []).map((duel) => duel.id).sort();
        if (duelIds.length > 0) {
          const duelToastKey = `${duelToastPrefix}${duelIds.join(",")}`;
          const alreadyShown = Object.keys(sessionStorage).some((key) => key.startsWith(duelToastPrefix) && key === duelToastKey);

          if (!alreadyShown) {
            notifications.push({
              title: duelIds.length === 1 ? "Novo desafio esperando você" : "Desafios esperando você",
              description:
                duelIds.length === 1
                  ? "Há um duelo aberto para você responder. Abra a Arena de Duelos para aceitar."
                  : `Você tem ${duelIds.length} desafios abertos esperando resposta na Arena de Duelos.`,
            });
            sessionStorage.setItem(duelToastKey, "shown");
          }
        }
      }

      if (!active) return;

      notifications.forEach((notification, index) => {
        window.setTimeout(() => {
          if (!active) return;
          toast({
            title: notification.title,
            description: notification.description,
          });
        }, index * 800);
      });
    };

    void run();

    return () => {
      active = false;
    };
  }, [loading, location.pathname, role, user]);

  return null;
}
