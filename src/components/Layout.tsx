import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { motion } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import {
  Brain,
  BookOpen,
  Flag,
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
} from "lucide-react";
import BackgroundConfetti from "./BackgroundConfetti";
import BrandMark from "./BrandMark";
import MascotMark from "./MascotMark";
import { ModeToggle } from "./mode-toggle";
import SimpleProfileAvatar from "./SimpleProfileAvatar";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
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
  { to: "/app/corrida", label: "Corrida", icon: Flag },
  { to: "/app/configuracoes", label: "Loja", icon: ShoppingBag },
];

/** Abas da barra inferior (mobile) — os 4 destinos principais do aluno. */
const bottomTabItems: NavItem[] = [
  { to: "/app", label: "Início", icon: Home },
  { to: "/app/turmas", label: "Estudar", icon: BookOpen },
  { to: "/app/progresso", label: "Progresso", icon: LayoutDashboard },
  { to: "/app/competicao", label: "Competição", icon: Trophy, alert: "mission" },
];

function isItemActive(pathname: string, to: string) {
  return to === "/app" ? pathname === "/app" : pathname.startsWith(to);
}

function AlertCount({ count, className = "" }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <span
      className={`inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-brand-pink px-1.5 text-[10px] font-extrabold text-white shadow-[0_2px_0_hsl(var(--c-pink-d))] ${className}`.trim()}
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}

export default function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
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

  const showBottomBar = Boolean(user) && isAppRoute;

  const homeTarget = isAppRoute && user ? "/app" : "/";

  const loadPoints = useCallback(async () => {
    if (!user || !isAppRoute) {
      setPoints(0);
      return;
    }

    const { data } = await supabase
      .from("student_scores")
      .select("points, missions_completed, streak_days")
      .eq("user_id", user.id)
      .maybeSingle();

    const totalPoints =
      role === "admin"
        ? 999999
        : getAvatarCoins(data?.points ?? 0, data?.missions_completed ?? 0, data?.streak_days ?? 0);
    const spentPoints = profile?.avatar_shop_spent ?? 0;
    setPoints(Math.max(totalPoints - spentPoints, 0));
  }, [isAppRoute, profile?.avatar_shop_spent, role, user]);

  useEffect(() => {
    let active = true;

    void loadPoints();

    if (!user || !isAppRoute) {
      return () => {
        active = false;
      };
    }

    const channel = supabase
      .channel(`layout-score:${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "student_scores", filter: `user_id=eq.${user.id}` },
        () => {
          if (!active) return;
          void loadPoints();
        },
      )
      .subscribe();

    const handleFocus = () => {
      if (!active) return;
      void loadPoints();
    };
    const handleScoreUpdate = () => {
      if (!active) return;
      void loadPoints();
    };
    window.addEventListener("focus", handleFocus);
    window.addEventListener("app:student-score-updated", handleScoreUpdate);

    return () => {
      active = false;
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("app:student-score-updated", handleScoreUpdate);
      void supabase.removeChannel(channel);
    };
  }, [isAppRoute, loadPoints, user]);

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="page-progress w-0" id="global-progress" />
      <BackgroundConfetti />

      <header className="sticky top-0 z-40 w-full border-b-[3px] border-border bg-background/85 backdrop-blur-xl">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Link to={homeTarget} className="group flex items-center gap-2.5">
            <BrandMark />
            <motion.div whileHover={{ rotate: 10, scale: 1.12 }} whileTap={{ scale: 0.95 }}>
              <MascotMark variant="mark" priority />
            </motion.div>
            <div className="flex flex-col">
              <span className="font-heading text-lg font-extrabold leading-tight tracking-tight">
                <span className="text-primary">Ilustrando</span>{" "}
                <span className="text-brand-blue">Estudos</span>
              </span>
              <span className="-mt-0.5 hidden font-body text-[10px] font-bold uppercase leading-tight tracking-[0.2em] text-muted-foreground sm:block">
                Aprender brincando
              </span>
            </div>
          </Link>

          {/* Navegacao desktop */}
          <nav className="hidden items-center gap-1 rounded-[1.35rem] border-2 border-border bg-card p-1.5 text-sm font-body shadow-card xl:flex">
            {navItems.map((item) => {
              const isActive = isItemActive(location.pathname, item.to);
              const Icon = item.icon;
              const alertCount = item.alert ? navAlertMap[item.alert] : 0;

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`relative flex items-center gap-2.5 rounded-2xl px-4 py-2.5 font-bold transition-all ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-3d"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                  <AlertCount count={alertCount} className="absolute -right-1 -top-1" />
                </Link>
              );
            })}

            {user && isAppRoute ? (
              <div className="ml-2 flex items-center gap-2 rounded-2xl border-2 border-sinapses/30 bg-sinapses/10 px-4 py-2 text-[13px] font-extrabold text-sinapses">
                <Brain className="h-4 w-4" />
                <span className="opacity-70">Sinapses</span>
                <span className="text-foreground">{points}</span>
              </div>
            ) : null}

            {role === "admin" && (
              <Link
                to="/app/admin"
                className={`ml-1 flex items-center gap-1.5 rounded-xl border-2 px-3 py-2 text-xs font-bold transition-all ${
                  location.pathname === "/app/admin"
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <Shield className="h-3.5 w-3.5" />
                Admin
              </Link>
            )}

            {user ? (
              <div className="ml-2 flex items-center gap-2">
                <ModeToggle />
                <Link
                  to="/app/configuracoes"
                  className="flex items-center gap-2 rounded-xl border-2 border-border px-3 py-2 text-xs font-bold transition-all hover:bg-secondary"
                >
                  <SimpleProfileAvatar size="sm" showBadge={false} />
                  <span className="text-foreground">{profile?.nome?.split(" ")[0] || "Perfil"}</span>
                </Link>
                <button
                  onClick={signOut}
                  className="rounded-xl p-2 text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive"
                  title="Sair"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="ml-2 flex items-center gap-2">
                <ModeToggle />
                <Link
                  to="/login"
                  className="btn-3d flex items-center gap-2 px-5 py-2.5 font-heading text-sm"
                >
                  <LogIn className="h-4 w-4" />
                  Entrar
                </Link>
              </div>
            )}
          </nav>

          {/* Lado direito no mobile/tablet: Sinapses visivel (sem precisar abrir menu) */}
          <div className="flex items-center gap-2 xl:hidden">
            {user && isAppRoute ? (
              <div className="flex items-center gap-1.5 rounded-full border-2 border-sinapses/30 bg-sinapses/10 px-3 py-1.5 text-[13px] font-extrabold text-sinapses">
                <Brain className="h-4 w-4" />
                <span className="text-foreground">{points}</span>
              </div>
            ) : (
              <>
                <ModeToggle />
                <Link
                  to="/login"
                  className="btn-3d flex items-center gap-2 px-4 py-2 font-heading text-sm"
                >
                  <LogIn className="h-4 w-4" />
                  Entrar
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main
        className={`flex-1 ${showBottomBar ? "pb-[calc(6rem+env(safe-area-inset-bottom))] xl:pb-0" : ""}`}
      >
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          {children}
        </motion.div>
      </main>

      <footer
        className={`mt-16 border-t-2 border-border py-8 ${showBottomBar ? "hidden xl:block" : ""}`}
      >
        <div className="container mx-auto px-4 text-center font-body text-sm text-muted-foreground">
          <p>Ilustrando Estudos - Escola Ilustrando o Aprender</p>
        </div>
      </footer>

      {/* Barra de navegacao inferior (mobile/tablet) */}
      {showBottomBar ? (
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl xl:hidden">
          <div className="mx-auto flex max-w-lg items-stretch justify-between px-2">
            {bottomTabItems.map((item) => {
              const isActive = isItemActive(location.pathname, item.to);
              const Icon = item.icon;
              const alertCount = item.alert ? navAlertMap[item.alert] : 0;

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`relative flex min-h-[3.5rem] min-w-[3.5rem] flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-extrabold transition-colors ${
                    isActive ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {isActive ? (
                    <span className="absolute top-0 h-1 w-10 rounded-b-full bg-primary" />
                  ) : null}
                  <span className="relative">
                    <Icon className="h-6 w-6" strokeWidth={isActive ? 2.6 : 2} />
                    <AlertCount count={alertCount} className="absolute -right-2 -top-1.5" />
                  </span>
                  {item.label}
                </Link>
              );
            })}

            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className={`relative flex min-h-[3.5rem] min-w-[3.5rem] flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-extrabold transition-colors ${
                menuOpen ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <span className="relative">
                <Menu className="h-6 w-6" />
                <AlertCount count={navAlertMap.duel} className="absolute -right-2 -top-1.5" />
              </span>
              Menu
            </button>
          </div>
        </nav>
      ) : null}

      {/* Menu inferior (drawer) com os destinos secundarios */}
      <Drawer open={menuOpen} onOpenChange={setMenuOpen}>
        <DrawerContent className="border-t-2 border-border bg-card">
          <DrawerHeader className="pb-0">
            <DrawerTitle className="font-heading text-lg font-extrabold">Menu</DrawerTitle>
          </DrawerHeader>
          <MenuSheetBody
            pathname={location.pathname}
            user={user}
            profile={profile}
            role={role}
            signOut={signOut}
            duelAlerts={navAlertMap.duel}
          />
        </DrawerContent>
      </Drawer>
    </div>
  );
}

function MenuSheetBody({
  pathname,
  user,
  profile,
  role,
  signOut,
  duelAlerts,
}: {
  pathname: string;
  user: User | null;
  profile: AuthProfile | null;
  role: AuthRole | null;
  signOut: () => void;
  duelAlerts: number;
}) {
  const secondaryItems: NavItem[] = [
    { to: "/app/duelo", label: "Duelo", icon: Sword, alert: "duel" },
    { to: "/app/corrida", label: "Corrida", icon: Flag },
    { to: "/app/configuracoes", label: "Loja e Perfil", icon: ShoppingBag },
    ...(role === "admin" || role === "professor" || role === "coordenadora"
      ? [{ to: "/app/acompanhamento", label: "Acompanhamento", icon: Users }]
      : []),
    ...(role === "admin" ? [{ to: "/app/admin", label: "Admin", icon: Shield }] : []),
  ];

  return (
    <nav className="flex flex-col gap-1 p-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
      {secondaryItems.map((item) => {
        const isActive = isItemActive(pathname, item.to);
        const Icon = item.icon;
        const alertCount = item.alert === "duel" ? duelAlerts : 0;

        return (
          <DrawerClose asChild key={item.to}>
            <Link
              to={item.to}
              className={`relative flex items-center gap-3 rounded-2xl px-4 py-3.5 font-bold transition-all ${
                isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <Icon className="h-5 w-5" />
              {item.label}
              <AlertCount count={alertCount} className="ml-auto" />
            </Link>
          </DrawerClose>
        );
      })}

      <div className="my-2 h-0.5 rounded-full bg-border" />

      <div className="flex items-center justify-between px-4 py-2">
        <span className="text-sm font-bold text-muted-foreground">Aparência</span>
        <ModeToggle />
      </div>

      <div className="my-2 h-0.5 rounded-full bg-border" />

      {user ? (
        <>
          <DrawerClose asChild>
            <Link
              to="/app/configuracoes"
              className="flex items-center gap-3 rounded-2xl px-4 py-3.5 font-bold text-muted-foreground transition-all hover:bg-secondary hover:text-foreground"
            >
              <SimpleProfileAvatar size="sm" showBadge={false} />
              {profile?.nome?.split(" ")[0] || "Perfil"}
            </Link>
          </DrawerClose>
          <button
            onClick={signOut}
            className="flex items-center gap-3 rounded-2xl px-4 py-3.5 text-left font-bold text-destructive transition-all hover:bg-destructive/10"
          >
            <LogOut className="h-5 w-5" />
            Sair
          </button>
        </>
      ) : (
        <DrawerClose asChild>
          <Link
            to="/login"
            className="btn-3d mt-1 flex items-center justify-center gap-3 px-4 py-3.5 font-heading"
          >
            <LogIn className="h-5 w-5" />
            Entrar
          </Link>
        </DrawerClose>
      )}
    </nav>
  );
}
