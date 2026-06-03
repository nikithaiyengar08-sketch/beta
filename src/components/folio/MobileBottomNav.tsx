import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Compass, MessageSquare, Activity, User } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function MobileBottomNav() {
  const { user } = useAuth();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { setUsername(null); return; }
    supabase.from("profiles").select("username").eq("id", user.id).maybeSingle()
      .then(({ data }: { data: { username: string | null } | null }) => {
        setUsername(data?.username ?? null);
      });
  }, [user]);

  if (!user) return null;

  const items = [
    { to: "/home", search: { tab: "library" as const }, label: "Home", icon: Home, match: (p: string) => p === "/home" },
    { to: "/discover", label: "Discover", icon: Compass, match: (p: string) => p.startsWith("/discover") },
    { to: "/rooms", label: "Rooms", icon: MessageSquare, match: (p: string) => p.startsWith("/rooms") },
    { to: "/feed", label: "Activity", icon: Activity, match: (p: string) => p.startsWith("/feed") },
    username
      ? { to: "/u/$username" as const, params: { username }, label: "Me", icon: User, match: (p: string) => p.startsWith("/u/") || p === "/settings" }
      : { to: "/settings" as const, label: "Me", icon: User, match: (p: string) => p === "/settings" },
  ];

  return (
    <nav
      aria-label="Primary"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border/60 bg-background/92 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="grid grid-cols-5 h-14">
        {items.map((it) => {
          const active = it.match(path);
          const Icon = it.icon;
          const linkProps: any = { to: it.to };
          if ("search" in it && it.search) linkProps.search = it.search;
          if ("params" in it && it.params) linkProps.params = it.params;
          return (
            <li key={it.label}>
              <Link
                {...linkProps}
                className={`relative h-full flex flex-col items-center justify-center gap-0.5 text-[9px] uppercase tracking-wider transition-colors ${
                  active ? "text-foreground" : "text-foreground/45 hover:text-foreground/70"
                }`}
              >
                {active && (
                  <span className="absolute top-0 inset-x-0 h-0.5 bg-rose rounded-full" />
                )}
                <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.2 : 1.7} />
                <span className="font-medium">{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
