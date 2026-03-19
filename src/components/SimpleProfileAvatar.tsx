import { UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

type SimpleProfileAvatarProps = {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showBadge?: boolean;
  src?: string | null;
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
}: SimpleProfileAvatarProps) {
  const classes = avatarSizes[size];
  const { profile } = useAuth();
  const avatarSrc = src ?? profile?.avatar_url;
  const isDiceBearAvatar = avatarSrc?.includes("dicebear.com");

  return (
    <div
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/80 bg-[radial-gradient(circle_at_30%_30%,#ffffff_0%,#dbeafe_42%,#93c5fd_100%)] shadow-[0_12px_30px_rgba(59,130,246,0.18)]",
        classes.container,
        className,
      )}
      aria-hidden="true"
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
