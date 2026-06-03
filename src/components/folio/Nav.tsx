import { Link, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useGate } from "@/components/auth/AuthGate";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { Menu, ChevronDown, Search, Settings, LogOut, Sparkles, BarChart3, Crown, BookOpen, Compass, Users, User as UserIcon, Plus, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { NotificationBell } from "@/components/folio/NotificationBell";

type NavLinkProps = { to: any; search?: any; params?: any; children: React.ReactNode; match?: (p: string) => boolean };
function NavLink({ to, search, params, children, match }: NavLinkProps) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const active = match ? match(path) : path === to;
  return (
    <Link
      to={to}
      search={search}
      params={params}
      className={`relative text-sm font-medium transition-colors ${active ? "text-foreground" : "text-foreground/60 hover:text-foreground"}`}
    >
      {children}
      {active && (
        <span className="absolute left-1/2 -translate-x-1/2 -bottom-[17px] h-0.5 w-full rounded-full bg-rose" />
      )}
    </Link>
  );
}

export function Nav() {
  const { user, displayName, signOut } = useAuth();
  const { openAuth, openSearch } = useGate();
  const [username, setUsername] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!user) { setUsername(null); setAvatarUrl(null); return; }
    supabase
      .from("profiles")
      .select("username, avatar_url")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }: { data: { username: string | null; avatar_url: string | null } | null }) => {
        setUsername(data?.username ?? null);
        setAvatarUrl(data?.avatar_url ?? null);
      });
  }, [user]);

  const closeMobile = () => setMobileOpen(false);
  const initial = (displayName?.[0] ?? username?.[0] ?? "F").toUpperCase();

  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="absolute inset-0 -z-10 bg-background/80 backdrop-blur-xl border-b border-border/50" />
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 sm:px-6 h-16">

        {/* Brand */}
        <Link
          to={user ? "/home" : "/"}
          search={user ? ({ tab: "library" } as any) : undefined}
          className="flex items-center gap-2 group shrink-0"
          aria-label="Folio home"
        >
          <span className="font-serif text-[1.6rem] leading-none text-foreground">Folio</span>
          <span className="h-1.5 w-1.5 rounded-full bg-rose transition-transform group-hover:scale-150" />
        </Link>

        {/* Primary nav — authenticated */}
        {user && (
          <div className="hidden md:flex items-center gap-7">
            <NavLink to="/home" search={{ tab: "library" }} match={(p) => p === "/home"}>Home</NavLink>
            <NavLink to="/discover" match={(p) => p.startsWith("/discover")}>Discover</NavLink>
            <NavLink to="/rooms" match={(p) => p.startsWith("/rooms")}>Rooms</NavLink>
            <NavLink to="/feed" match={(p) => p.startsWith("/feed")}>Activity</NavLink>
          </div>
        )}

        {/* Primary nav — guest */}
        {!user && (
          <div className="hidden md:flex items-center gap-7">
            <a href="#why-folio" className="text-sm font-medium text-foreground/60 hover:text-foreground transition-colors">Why Folio</a>
            <Link to="/discover" className="text-sm font-medium text-foreground/60 hover:text-foreground transition-colors">Discover</Link>
            <Link to="/premium" className="text-sm font-medium text-rose hover:text-burgundy transition-colors inline-flex items-center gap-1.5">
              <Crown className="h-3.5 w-3.5" /> Premium
            </Link>
          </div>
        )}

        {/* Right cluster */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <button
            onClick={openSearch}
            aria-label="Search books"
            className="inline-flex items-center gap-2 h-8 px-3 rounded-full border border-border hover:border-foreground/40 text-foreground/60 text-xs transition-colors"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Search</span>
            <kbd className="hidden lg:inline-flex items-center font-sans text-[10px] text-foreground/35 border-l border-border pl-2 ml-0.5">⌘K</kbd>
          </button>

          {user ? (
            <>
              <NotificationBell />

              {/* Avatar / profile dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger
                  aria-label="Profile menu"
                  className="group inline-flex items-center gap-2 h-8 pl-1 pr-2.5 rounded-full border border-border hover:border-foreground/40 transition-all outline-none data-[state=open]:border-foreground/40"
                >
                  <span className="h-6 w-6 rounded-full bg-gradient-rose grid place-items-center text-[11px] font-medium text-cream overflow-hidden ring-1 ring-border">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : initial}
                  </span>
                  <span className="hidden sm:inline text-xs font-medium text-foreground/75 max-w-[90px] truncate">
                    {displayName || username || "You"}
                  </span>
                  <ChevronDown className="hidden sm:block h-3 w-3 text-foreground/40 transition-transform group-data-[state=open]:rotate-180" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60">
                  <div className="px-2 py-2 flex items-center gap-3">
                    <span className="h-9 w-9 rounded-full bg-gradient-rose grid place-items-center text-sm font-medium text-cream overflow-hidden shrink-0">
                      {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : initial}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{displayName || username || "Reader"}</p>
                      {username && <p className="text-[11px] text-foreground/50 truncate">@{username}</p>}
                    </div>
                  </div>
                  <DropdownMenuSeparator />

                  {username && (
                    <DropdownMenuItem asChild>
                      <Link to="/u/$username" params={{ username }} className="flex items-center gap-2">
                        <UserIcon className="h-3.5 w-3.5" /> My profile
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onSelect={openSearch}>
                    <Plus className="h-3.5 w-3.5 mr-2" /> Add a book
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />

                  <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-foreground/40 px-2">Insights</DropdownMenuLabel>
                  <DropdownMenuItem asChild>
                    <Link to="/insights" search={{ tab: "dna" }} className="flex items-center gap-2"><Sparkles className="h-3.5 w-3.5 text-rose" /> Reader DNA</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/insights" search={{ tab: "recommendations" }} className="flex items-center gap-2"><BookOpen className="h-3.5 w-3.5 text-gold" /> Recommendations</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/insights" search={{ tab: "analytics" }} className="flex items-center gap-2"><BarChart3 className="h-3.5 w-3.5" /> Analytics</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />

                  <DropdownMenuItem asChild>
                    <Link to="/premium" className="flex items-center gap-2 text-rose"><Crown className="h-3.5 w-3.5" /> Folio Premium</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/settings" className="flex items-center gap-2"><Settings className="h-3.5 w-3.5" /> Settings</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => signOut()} className="text-burgundy focus:text-burgundy">
                    <LogOut className="h-3.5 w-3.5 mr-2" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button onClick={openAuth} size="sm" className="hidden md:inline-flex">
              Join free →
            </Button>
          )}

          {/* Mobile hamburger */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <button
                aria-label="Open menu"
                className="md:hidden inline-flex items-center justify-center h-8 w-8 rounded-full border border-border text-foreground/60 hover:border-foreground/40 transition-colors"
              >
                <Menu className="h-4 w-4" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 bg-background">
              <SheetHeader>
                <SheetTitle className="font-serif text-2xl flex items-center gap-2">
                  Folio <span className="h-1.5 w-1.5 rounded-full bg-rose" />
                </SheetTitle>
              </SheetHeader>

              {user && (
                <div className="mt-4 flex items-center gap-3 px-3 py-3 rounded-2xl bg-muted/50">
                  <span className="h-10 w-10 rounded-full bg-gradient-rose grid place-items-center text-sm font-medium text-cream overflow-hidden shrink-0">
                    {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : initial}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{displayName || username || "Reader"}</p>
                    {username && <p className="text-[11px] text-foreground/50 truncate">@{username}</p>}
                  </div>
                </div>
              )}

              <div className="mt-5 flex flex-col gap-0.5 text-sm">
                <button
                  onClick={() => { closeMobile(); openSearch(); }}
                  className="text-left flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-muted"
                >
                  <Search className="h-4 w-4 text-foreground/50" /> Search books
                </button>

                {user ? (
                  <>
                    <MobileItem to="/home" search={{ tab: "library" }} icon={<BookOpen className="h-4 w-4 text-foreground/50" />} label="Home" onClose={closeMobile} />
                    <MobileItem to="/discover" icon={<Compass className="h-4 w-4 text-foreground/50" />} label="Discover" onClose={closeMobile} />
                    <MobileItem to="/rooms" icon={<MessageSquare className="h-4 w-4 text-foreground/50" />} label="Rooms" onClose={closeMobile} />
                    <MobileItem to="/feed" icon={<Users className="h-4 w-4 text-foreground/50" />} label="Activity" onClose={closeMobile} />

                    <p className="px-3 pt-4 pb-1 text-[10px] uppercase tracking-[0.2em] text-foreground/35">Insights</p>
                    <MobileItem to="/insights" search={{ tab: "dna" }} icon={<Sparkles className="h-4 w-4 text-rose" />} label="Reader DNA" onClose={closeMobile} />
                    <MobileItem to="/insights" search={{ tab: "recommendations" }} icon={<BookOpen className="h-4 w-4 text-gold" />} label="Recommendations" onClose={closeMobile} />
                    <MobileItem to="/insights" search={{ tab: "analytics" }} icon={<BarChart3 className="h-4 w-4 text-foreground/50" />} label="Analytics" onClose={closeMobile} />

                    <p className="px-3 pt-4 pb-1 text-[10px] uppercase tracking-[0.2em] text-foreground/35">Account</p>
                    <MobileItem to="/premium" icon={<Crown className="h-4 w-4 text-rose" />} label="Folio Premium" onClose={closeMobile} />
                    <MobileItem to="/settings" icon={<Settings className="h-4 w-4 text-foreground/50" />} label="Settings" onClose={closeMobile} />
                    {username && <MobileItem to="/u/$username" params={{ username }} icon={<UserIcon className="h-4 w-4 text-foreground/50" />} label="My profile" onClose={closeMobile} />}

                    <button
                      onClick={() => { closeMobile(); signOut(); }}
                      className="mt-2 text-left flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-muted text-burgundy"
                    >
                      <LogOut className="h-4 w-4" /> Sign out
                    </button>
                  </>
                ) : (
                  <>
                    <SheetClose asChild>
                      <Link to="/discover" className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-muted">
                        <Compass className="h-4 w-4 text-foreground/50" /> Discover
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link to="/premium" className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-muted text-rose">
                        <Crown className="h-4 w-4" /> Premium
                      </Link>
                    </SheetClose>
                    <Button
                      onClick={() => { closeMobile(); openAuth(); }}
                      size="lg"
                      className="mt-4 w-full"
                    >
                      Join Folio free →
                    </Button>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  );
}

function MobileItem({ to, search, params, icon, label, onClose }: {
  to: any; search?: any; params?: any; icon: React.ReactNode; label: string; onClose: () => void
}) {
  return (
    <SheetClose asChild>
      <Link
        to={to}
        search={search}
        params={params}
        className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors"
      >
        {icon}
        <span>{label}</span>
      </Link>
    </SheetClose>
  );
}
