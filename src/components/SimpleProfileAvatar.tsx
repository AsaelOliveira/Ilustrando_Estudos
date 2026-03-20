import { motion } from "framer-motion";
import { UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { normalizeAvatarUnlocks, type AvatarEffect } from "@/lib/profile-avatar-options";

type SimpleProfileAvatarProps = {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showBadge?: boolean;
  src?: string | null;
  effect?: AvatarEffect | null;
};

const avatarSizes = {
  sm: {
    container: "h-8 w-8",
    icon: "h-4 w-4",
    badge: "h-2.5 w-2.5",
  },
  md: {
    container: "h-12 w-12",
    icon: "h-6 w-6",
    badge: "h-3.5 w-3.5",
  },
  lg: {
    container: "h-20 w-20",
    icon: "h-10 w-10",
    badge: "h-[18px] w-[18px]",
  },
  xl: {
    container: "h-32 w-32",
    icon: "h-16 w-16",
    badge: "h-5 w-5",
  },
} as const;

export default function SimpleProfileAvatar({
  size = "md",
  className,
  showBadge = true,
  src,
  effect,
}: SimpleProfileAvatarProps) {
  const classes = avatarSizes[size];
  const { profile } = useAuth();
  const avatarSrc = src === undefined ? profile?.avatar_url : src;
  const isDiceBearAvatar = avatarSrc?.includes("dicebear.com");
  const unlockedItems = normalizeAvatarUnlocks(profile?.avatar_unlocks);
  const profileEffect =
    profile?.avatar_style && typeof profile.avatar_style === "object" && !Array.isArray(profile.avatar_style)
      ? (profile.avatar_style as { effect?: AvatarEffect }).effect
      : null;
  const unlockedProfileEffect =
    profileEffect && profileEffect !== "none" && unlockedItems.includes(`effect:${profileEffect}`)
      ? profileEffect
      : "none";
  const resolvedEffect = effect ?? unlockedProfileEffect ?? "none";

  return (
    <div className={cn("relative inline-flex shrink-0 items-center justify-center", classes.container, className)} aria-hidden="true">
      {resolvedEffect === "glow" ? (
        <>
          <span className="absolute inset-[-14%] rounded-full bg-emerald-400/30 blur-xl animate-pulse" />
          <span className="absolute inset-[-4%] rounded-full border-2 border-emerald-300/80 animate-pulse" />
          <span className="absolute inset-[-1%] rounded-full border border-cyan-200/70 [animation:pulse_1.8s_ease-in-out_infinite]" />
        </>
      ) : null}
      {resolvedEffect === "orbit" ? (
        <>
          <span className="absolute inset-[-12%] rounded-full border-2 border-sky-300/80 animate-spin" />
          <span className="absolute inset-[-3%] rounded-full border border-dashed border-emerald-300/80 [animation:spin_10s_linear_infinite_reverse]" />
          <span className="absolute right-[1%] top-[18%] h-3 w-3 rounded-full bg-sky-300 shadow-[0_0_14px_rgba(56,189,248,0.7)]" />
          <span className="absolute bottom-[10%] left-[2%] h-2.5 w-2.5 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(52,211,153,0.7)] [animation:spin_10s_linear_infinite]" />
        </>
      ) : null}
      {resolvedEffect === "sparkles" ? (
        <>
          <span className="absolute inset-[-8%] rounded-full bg-amber-200/25 blur-lg" />
          <span className="absolute left-[2%] top-[14%] h-3 w-3 rounded-full bg-amber-300 shadow-[0_0_14px_rgba(252,211,77,0.75)] animate-pulse" />
          <span className="absolute right-[6%] top-[6%] h-2.5 w-2.5 rounded-full bg-sky-300 shadow-[0_0_12px_rgba(125,211,252,0.75)] [animation:pulse_1.8s_ease-in-out_infinite]" />
          <span className="absolute bottom-[12%] right-[2%] h-3 w-3 rounded-full bg-emerald-300 shadow-[0_0_14px_rgba(110,231,183,0.75)] [animation:pulse_2.1s_ease-in-out_infinite]" />
          <span className="absolute bottom-[6%] left-[10%] h-2.5 w-2.5 rounded-full bg-fuchsia-300 shadow-[0_0_12px_rgba(240,171,252,0.75)] [animation:pulse_2.4s_ease-in-out_infinite]" />
        </>
      ) : null}
      {resolvedEffect === "spin" ? (
        <>
          <span className="absolute inset-[-10%] rounded-full bg-fuchsia-300/15 blur-lg" />
          <span className="absolute inset-[-4%] rounded-full border border-fuchsia-300/60" />
        </>
      ) : null}
      {resolvedEffect === "mirror" ? (
        <>
          <span className="absolute inset-[-8%] rounded-full bg-cyan-200/20 blur-lg" />
          <motion.span
            className="absolute inset-y-[10%] w-[22%] rounded-full bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.85)_50%,transparent_100%)] blur-[1px]"
            animate={{ x: ["-170%", "210%"] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
          />
        </>
      ) : null}

      <motion.div
        className={cn(
          "relative inline-flex h-full w-full items-center justify-center overflow-hidden rounded-full border border-white/80 bg-[radial-gradient(circle_at_30%_30%,#ffffff_0%,#dbeafe_42%,#93c5fd_100%)] shadow-[0_12px_30px_rgba(59,130,246,0.18)]",
        )}
        animate={
          resolvedEffect === "spin"
            ? { rotate: [0, 10, -10, 0], scale: [1, 1.03, 1] }
            : resolvedEffect === "mirror"
              ? { x: [0, 3, -3, 0] }
              : undefined
        }
        transition={
          resolvedEffect === "spin"
            ? { duration: 3.8, repeat: Infinity, ease: "easeInOut" }
            : resolvedEffect === "mirror"
              ? { duration: 2.8, repeat: Infinity, ease: "easeInOut" }
              : undefined
        }
      >
        {avatarSrc ? (
          isDiceBearAvatar ? (
            <img src={avatarSrc} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-white p-[10%]">
              <img src={avatarSrc} alt="" className="h-full w-full object-contain" />
            </div>
          )
        ) : (
          <>
            <div className="absolute inset-[8%] rounded-full border border-white/60 bg-white/20" />
            <div className="absolute inset-[18%] rounded-full bg-slate-950/5" />
            <UserRound className={cn("relative z-10 text-slate-700/80", classes.icon)} strokeWidth={2.25} />
          </>
        )}
      </motion.div>

      {showBadge ? (
        <span
          className={cn(
            "absolute bottom-[10%] right-[10%] rounded-full border border-white/80 bg-emerald-400 shadow-[0_4px_12px_rgba(16,185,129,0.35)]",
            classes.badge,
          )}
        />
      ) : null}
    </div>
  );
}
