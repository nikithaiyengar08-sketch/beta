import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Crown } from "lucide-react";

/**
 * Renders children for Premium users.
 * For free users: shows a contextual, in-line nudge with blurred preview.
 * Premium is integrated naturally — not redirected to a separate page first.
 */
export function LockedPreview({
  title,
  blurb,
  children,
  isPremium = false,
  compact = false,
}: {
  title: string;
  blurb: string;
  children?: ReactNode;
  isPremium?: boolean;
  compact?: boolean;
}) {
  if (isPremium) return <>{children}</>;

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-border bg-card ${compact ? "p-5" : "p-6 sm:p-7"}`}>
      {/* Blurred preview */}
      <div className="pointer-events-none select-none blur-sm opacity-40 saturate-50" aria-hidden>
        {children ?? <div className="h-24" />}
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 grid place-items-center bg-background/65 backdrop-blur-[3px] p-5">
        <div className="text-center max-w-xs">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose/10 border border-rose/20 text-rose text-[10px] uppercase tracking-widest font-medium mb-3">
            <Crown className="h-3 w-3" />
            Premium feature
          </div>
          <p className="font-serif text-xl leading-tight">{title}</p>
          <p className="text-sm text-foreground/60 mt-2 leading-relaxed">{blurb}</p>
          <Link
            to="/premium"
            className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-foreground text-background text-sm font-medium px-5 py-2.5 hover:bg-foreground/90 transition-colors"
          >
            <Crown className="h-3.5 w-3.5" />
            Unlock with Premium
          </Link>
          <p className="mt-2 text-[11px] text-foreground/40">14-day free trial · Cancel anytime</p>
        </div>
      </div>
    </div>
  );
}

export function PremiumBadge({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full bg-rose/10 text-rose border border-rose/20 font-medium ${className}`}>
      <Crown className="h-2.5 w-2.5" /> Premium
    </span>
  );
}
