import { ReactNode, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { AnimatePresence, motion } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import {
  Brain,
  BookOpen,
  Home,
  Info,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  ShoppingBag,
  Shield,
  Sword,
  Trophy,
  Users,
  X,
} from "lucide-react";
import BackgroundBlobs from "./BackgroundBlobs";
import BrandMark from "./BrandMark";
import { ModeToggle } from "./mode-toggle";
import SimpleProfileAvatar from "./SimpleProfileAvatar";
import { type AuthProfile, type AuthRole, useAuth } from "@/hooks/useAuth";
import { useAppAlerts } from "@/hooks/useAppAlerts";
import { getAvatarCoins } from "@/lib/avatar-system";

type NavItem = {
  to: string;
  label: string;
  icon: typeof Home;
  alert?: "mission" | "duel";
};

const publicNavItems: NavItem[] = [
  { to: "/", label: "Home", icon: Home },
  { to: "/sobre", label: "Sobre", icon: Info },
];

const privateNavItems: NavItem[] = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard },
  { to: "/app/turmas", label: "Turmas", icon: BookOpen },
  { to: "/app/progresso", label: "Progresso", icon: LayoutDashboard },
  { to: "/app/competicao", label: "Competição", icon: Trophy, alert: "mission" },
  { to: "/app/duelo", label: "Duelo", icon: Sword, alert: "duel" },
  { to: "/app/configuracoes", label: "Loja", icon: ShoppingBag },
];

export default function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [points, setPoints] = useState(0);
  const { user, profile, role, signOut } = useAuth();
  const { missionAvailable, openDuelCount } = useAppAlerts();
  const isAppRoute = location.pathname.startsWith("/app");

  const navItems = useMemo(
    () =>
      isAppRoute
        ? [
            ...privateNavItems,
            ...(role === "admin" || role === "professor" || role === "coordenadora"
              ? [{ to: "/app/acompanhamento", label: "Acompanhamento", icon: Users }]
              : []),
          ]
        : publicNavItems,
    [isAppRoute, role],
  );

  const navAlertMap = useMemo(
    () => ({
      mission: role === "aluno" && missionAvailable ? 1 : 0,
      duel: role === "aluno" ? openDuelCount : 0,
    }),
    [missionAvailable, openDuelCount, role],
  );
  const mobileAlertCount = navAlertMap.mission + navAlertMap.duel;

  const homeTarget = isAppRoute && user ? "/app" : "/";

  useEffect(() => {
    if (!user || !isAppRoute) {
      setPoints(0);
      return;
    }

    let active = true;

    supabase
      .from("student_scores")
      .select("points, missions_completed, streak_days")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        const totalPoints =
          role === "admin"
            ? 999999
            : getAvatarCoins(data?.points ?? 0, data?.missions_completed ?? 0, data?.streak_days ?? 0);
        const spentPoints = profile?.avatar_shop_spent ?? 0;
        setPoints(Math.max(totalPoints - spentPoints, 0));
      });

    return () => {
      active = false;
    };
  }, [isAppRoute, profile?.avatar_shop_spent, role, user]);

  return (
    <div className="flex min-h-screen flex-col">
      <div className="page-progress w-0" id="global-progress" />
      <div className="grain-overlay" />
      <BackgroundBlobs />
      <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/50 backdrop-blur-2xl">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Link to={homeTarget} className="group flex items-center gap-2.5">
            <motion.div whileHover={{ rotate: 8, scale: 1.08 }}>
              <BrandMark />
            </motion.div>
            <div className="flex flex-col">
              <span className="font-heading text-lg font-bold leading-tight text-foreground transition-colors group-hover:text-primary">
                Ilustrando
              </span>
              <span className="-mt-0.5 font-body text-[10px] leading-tight text-muted-foreground">Estudos</span>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 rounded-[1.35rem] border border-border/50 bg-background/75 p-1.5 text-sm font-body xl:flex">
            {navItems.map((item) => {
              const isActive = item.to === "/app" ? location.pathname === "/app" : location.pathname.startsWith(item.to);
              const Icon = item.icon;
              const alertCount = item.alert ? navAlertMap[item.alert] : 0;

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`relative flex items-center gap-2.5 rounded-2xl px-5 py-3 font-bold transition-all ${
                    isActive
                      ? "bg-primary/10 text-primary shadow-[inset_0_0_20px_rgba(99,102,241,0.08)] ring-1 ring-primary/20"
                      : "text-muted-foreground/80 hover:bg-secondary hover:text-foreground hover:scale-105"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="flex items-center gap-2">
                    {item.label}
                    {alertCount > 0 ? (
                      <span className="relative inline-flex h-2.5 w-2.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-500" />
                      </span>
                    ) : null}
                  </span>
                  {alertCount > 0 ? (
                    <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white shadow-lg shadow-rose-500/25">
                      {alertCount > 9 ? "9+" : alertCount}
                    </span>
                  ) : null}
                </Link>
              );
            })}

            {user && isAppRoute ? (
              <div className="ml-3 flex items-center gap-2.5 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-2.5 text-[13px] font-bold text-primary shadow-[0_0_15px_-5px_rgba(99,102,241,0.2)]">
                <Brain className="h-4 w-4 animate-pulse" />
                <span className="opacity-70">Sinapses</span>
                <span className="text-foreground">{points}</span>
              </div>
            ) : null}

            {role === "admin" && (
              <Link
                to="/app/admin"
                className={`ml-1 flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-all ${
                  location.pathname === "/app/admin"
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <Shield className="h-3.5 w-3.5" />
                Admin
              </Link>
            )}

            {user ? (
              <div className="ml-3 flex items-center gap-2">
                <ModeToggle />
                <Link
                  to="/app/configuracoes"
                  className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-medium transition-all hover:bg-secondary"
                >
                  <SimpleProfileAvatar size="sm" showBadge={false} />
                  <span className="text-foreground">{profile?.nome?.split(" ")[0] || "Perfil"}</span>
                </Link>
                <button
                  onClick={signOut}
                  className="rounded-xl p-2 text-muted-foreground transition-all hover:bg-destructive/5 hover:text-destructive"
                  title="Sair"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="ml-3 flex items-center gap-2">
                <ModeToggle />
                <Link
                  to="/login"
                  className="btn-tap flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 font-heading text-sm font-bold text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-glow"
                >
                  <LogIn className="h-4 w-4" />
                  Entrar
                </Link>
              </div>
            )}
          </nav>

          <button
            onClick={() => setMobileOpen((current) => !current)}
            className="btn-tap relative rounded-xl p-2.5 text-muted-foreground hover:bg-secondary hover:text-foreground xl:hidden"
          >
            {mobileAlertCount > 0 ? (
              <>
                <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white shadow-lg shadow-rose-500/25">
                  {mobileAlertCount > 9 ? "9+" : mobileAlertCount}
                </span>
                <span className="absolute right-2 top-2 inline-flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-500" />
                </span>
              </>
            ) : null}
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        <AnimatePresence>
          {mobileOpen ? (
            <MobileNav
              pathname={location.pathname}
              navItems={navItems}
              user={user}
              profile={profile}
              role={role}
              signOut={signOut}
              points={points}
              missionAvailable={missionAvailable}
              openDuelCount={openDuelCount}
              onClose={() => setMobileOpen(false)}
            />
          ) : null}
        </AnimatePresence>
      </header>

      <main className="flex-1">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          {children}
        </motion.div>
      </main>

      <footer className="mt-16 border-t border-border/50 py-8">
        <div className="container mx-auto px-4 text-center font-body text-sm text-muted-foreground">
          <p>Ilustrando Estudos - Escola Ilustrando o Aprender</p>
        </div>
      </footer>
    </div>
  );
}

function MobileNav({
  pathname,
  navItems,
  user,
  profile,
  role,
  signOut,
  points,
  missionAvailable,
  openDuelCount,
  onClose,
}: {
  pathname: string;
  navItems: NavItem[];
  user: User | null;
  profile: AuthProfile | null;
  role: AuthRole | null;
  signOut: () => void;
  points: number;
  missionAvailable: boolean;
  openDuelCount: number;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden border-t border-border/50 bg-background/95 backdrop-blur-xl xl:hidden"
    >
      <nav className="flex flex-col gap-1 p-4">
        {navItems.map((item) => {
          const isActive = item.to === "/app" ? pathname === "/app" : pathname.startsWith(item.to);
          const Icon = item.icon;
          const alertCount = item.alert
            ? item.alert === "mission"
              ? role === "aluno" && missionAvailable
                ? 1
                : 0
              : role === "aluno"
                ? openDuelCount
                : 0
            : 0;

          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={`relative flex items-center gap-3 rounded-2xl px-4 py-3.5 font-medium transition-all ${
                isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="flex items-center gap-2">
                {item.label}
                {alertCount > 0 ? (
                  <span className="relative inline-flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-500" />
                  </span>
                ) : null}
              </span>
              {alertCount > 0 ? (
                <span className="ml-auto inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">
                  {alertCount > 9 ? "9+" : alertCount}
                </span>
              ) : null}
            </Link>
          );
        })}

        {user && pathname.startsWith("/app") ? (
          <div className="flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm text-foreground">
            <Brain className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">Sinapses</span>
            <span className="font-semibold">{points}</span>
          </div>
        ) : null}

        <div className="my-2 h-px bg-border/50" />

        <div className="px-4 py-2">
          <ModeToggle />
        </div>

        <div className="my-2 h-px bg-border/50" />

        {user ? (
          <>
            <Link
              to="/app/configuracoes"
              onClick={onClose}
              className="flex items-center gap-3 rounded-2xl px-4 py-3.5 font-medium text-muted-foreground transition-all hover:bg-secondary hover:text-foreground"
            >
              <SimpleProfileAvatar size="sm" showBadge={false} />
              {profile?.nome?.split(" ")[0] || "Perfil"}
            </Link>
            <button
              onClick={() => {
                signOut();
                onClose();
              }}
              className="flex items-center gap-3 rounded-2xl px-4 py-3.5 text-left font-medium text-destructive transition-all hover:bg-destructive/5"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </>
        ) : (
          <Link
            to="/login"
            onClick={onClose}
            className="mt-1 flex items-center gap-3 rounded-2xl bg-primary px-4 py-3.5 font-heading font-bold text-primary-foreground transition-all"
          >
            <LogIn className="h-4 w-4" />
            Entrar
          </Link>
        )}
      </nav>
    </motion.div>
  );
}
