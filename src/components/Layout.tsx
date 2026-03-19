import { ReactNode, useEffect, useState } from "react";
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
  X,
} from "lucide-react";
import BackgroundBlobs from "./BackgroundBlobs";
import BrandMark from "./BrandMark";
import SimpleProfileAvatar from "./SimpleProfileAvatar";
import { type AuthProfile, type AuthRole, useAuth } from "@/hooks/useAuth";
import { getAvatarCoins } from "@/lib/avatar-system";

type NavItem = {
  to: string;
  label: string;
  icon: typeof Home;
};

const publicNavItems: NavItem[] = [
  { to: "/", label: "Home", icon: Home },
  { to: "/sobre", label: "Sobre", icon: Info },
];

const privateNavItems: NavItem[] = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard },
  { to: "/app/turmas", label: "Turmas", icon: BookOpen },
  { to: "/app/progresso", label: "Progresso", icon: LayoutDashboard },
  { to: "/app/competicao", label: "Competição", icon: Trophy },
  { to: "/app/duelo", label: "Duelo", icon: Sword },
  { to: "/app/configuracoes", label: "Loja", icon: ShoppingBag },
];

export default function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [points, setPoints] = useState(0);
  const { user, profile, role, signOut } = useAuth();
  const isAppRoute = location.pathname.startsWith("/app");
  const navItems = isAppRoute ? privateNavItems : publicNavItems;
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
        const totalPoints = getAvatarCoins(data?.points ?? 0, data?.missions_completed ?? 0, data?.streak_days ?? 0);
        const spentPoints = profile?.avatar_shop_spent ?? 0;
        setPoints(Math.max(totalPoints - spentPoints, 0));
      });

    return () => {
      active = false;
    };
  }, [isAppRoute, profile?.avatar_shop_spent, user]);

  return (
    <div className="flex min-h-screen flex-col">
      <BackgroundBlobs />
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/60 backdrop-blur-xl">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Link to={homeTarget} className="group flex items-center gap-2.5">
            <motion.div whileHover={{ rotate: 8, scale: 1.1 }}>
              <BrandMark />
            </motion.div>
            <div className="flex flex-col">
              <span className="font-heading text-lg font-bold leading-tight text-foreground transition-colors group-hover:text-primary">
                Ilustrando
              </span>
              <span className="-mt-0.5 font-body text-[10px] leading-tight text-muted-foreground">Estudos</span>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 text-sm font-body sm:flex">
            {navItems.map((item) => {
              const isActive = item.to === "/app" ? location.pathname === "/app" : location.pathname.startsWith(item.to);
              const Icon = item.icon;

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2.5 font-medium transition-all ${
                    isActive
                      ? "bg-primary/10 text-primary shadow-sm"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}

            {user && isAppRoute ? (
              <div className="ml-2 flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium text-foreground shadow-sm">
                <Brain className="h-3.5 w-3.5 text-primary" />
                <span className="text-muted-foreground">Sinapses</span>
                <span className="font-semibold text-foreground">{points}</span>
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
                <Link
                  to="/app/configuracoes"
                  className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-medium transition-all hover:bg-secondary"
                >
                  <SimpleProfileAvatar size="sm" showBadge={false} className="ring-2 ring-primary/15" />
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
              <Link
                to="/login"
                className="btn-tap ml-3 flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 font-heading text-sm font-bold text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-glow"
              >
                <LogIn className="h-4 w-4" />
                Entrar
              </Link>
            )}
          </nav>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="btn-tap rounded-xl p-2.5 text-muted-foreground hover:bg-secondary hover:text-foreground sm:hidden"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <MobileNav
              pathname={location.pathname}
              onClose={() => setMobileOpen(false)}
              user={user}
              profile={profile}
              role={role}
              signOut={signOut}
              points={points}
            />
          )}
        </AnimatePresence>
      </header>
      <main className="flex-1">{children}</main>
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
  onClose,
  user,
  profile,
  role,
  signOut,
  points,
}: {
  pathname: string;
  onClose: () => void;
  user: User | null;
  profile: AuthProfile | null;
  role: AuthRole | null;
  signOut: () => void;
  points: number;
}) {
  const navItems = pathname.startsWith("/app") ? privateNavItems : publicNavItems;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden border-t border-border/50 bg-background/95 backdrop-blur-xl sm:hidden"
    >
      <nav className="flex flex-col gap-1 p-4">
        {navItems.map((item) => {
          const isActive = item.to === "/app" ? pathname === "/app" : pathname.startsWith(item.to);
          const Icon = item.icon;

          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={`flex items-center gap-3 rounded-2xl px-4 py-3.5 font-medium transition-all ${
                isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}

        {role === "admin" && (
          <Link
            to="/app/admin"
            onClick={onClose}
            className="flex items-center gap-3 rounded-2xl px-4 py-3.5 font-medium text-muted-foreground transition-all hover:bg-secondary hover:text-foreground"
          >
            <Shield className="h-4 w-4" />
            Admin
          </Link>
        )}

        {user && pathname.startsWith("/app") ? (
          <div className="flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm text-foreground">
            <Brain className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">Sinapses</span>
            <span className="font-semibold">{points}</span>
          </div>
        ) : null}

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
