import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAppAlerts } from "@/hooks/useAppAlerts";
import { getSaoPauloDateStamp } from "@/lib/date-utils";
import { toast } from "@/hooks/use-toast";

export default function SessionNotifications() {
  const { user, role, loading } = useAuth();
  const { missionAvailable, openDuelCount } = useAppAlerts();
  const location = useLocation();

  useEffect(() => {
    if (loading || !user || location.pathname === "/login") return;

    let active = true;

    const run = async () => {
      const today = getSaoPauloDateStamp();
      const missionToastKey = `mission-toast:${user.id}:${today}`;
      const duelToastKey = `duel-toast:${user.id}:${openDuelCount}`;
      const duelToastPrefix = `duel-toast:${user.id}:`;
      const notifications: Array<{ title: string; description: string }> = [];

      if (role === "aluno") {
        if (missionAvailable && !sessionStorage.getItem(missionToastKey)) {
          notifications.push({
            title: "Missão diária disponível",
            description: "Sua missão de hoje já está liberada. Entre em Competição para ganhar pontos e Sinapses.",
          });
          sessionStorage.setItem(missionToastKey, "shown");
        }

        if (openDuelCount > 0) {
          const alreadyShown = Object.keys(sessionStorage).some(
            (key) => key.startsWith(duelToastPrefix) && key === duelToastKey,
          );

          if (!alreadyShown) {
            notifications.push({
              title: openDuelCount === 1 ? "Novo desafio esperando você" : "Desafios esperando você",
              description:
                openDuelCount === 1
                  ? "Há um duelo aberto para você responder. Abra a Arena de Duelos para aceitar."
                  : `Você tem ${openDuelCount} desafios abertos esperando resposta na Arena de Duelos.`,
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
  }, [loading, location.pathname, missionAvailable, openDuelCount, role, user]);

  return null;
}
