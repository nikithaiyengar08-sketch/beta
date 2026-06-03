import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { Sparkles, Users, BookOpen } from "lucide-react";

const ARCHETYPES = [
  { value: "Literary wanderer", emoji: "🌿" },
  { value: "Cozy escapist", emoji: "☕" },
  { value: "Sharp non-fiction", emoji: "✎" },
  { value: "Poetry lover", emoji: "✿" },
  { value: "Genre devourer", emoji: "♛" },
  { value: "Slow & deep", emoji: "⌛" },
];

type Step = "profile" | "welcome";

// Single in-memory flag per page load to absolutely prevent duplicate onboarding.
// This survives re-renders and strict mode double-effects.
const completedUserIds = new Set<string>();

export function OnboardingModal() {
  const { user, displayName: authDisplayName } = useAuth();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("profile");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [archetype, setArchetype] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const checkedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user) { setOpen(false); return; }

    // Skip if already determined for this user in this session
    if (completedUserIds.has(user.id)) return;
    if (checkedRef.current === user.id) return;
    checkedRef.current = user.id;

    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("username, display_name, bio, archetype, onboarding_done")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;

      if (data) {
        // Returning user: onboarding already done → never show again
        if (data.onboarding_done || data.username) {
          completedUserIds.add(user.id);
          return;
        }
        // Has partial data but onboarding not marked done
        setDisplayName(data.display_name ?? authDisplayName ?? "");
        setBio(data.bio ?? "");
        setArchetype(data.archetype ?? "");
        setUsername(data.username ?? "");
        setStep("profile");
        setOpen(true);
      } else {
        // Brand new user — no profile row yet
        setDisplayName(authDisplayName ?? "");
        setStep("profile");
        setOpen(true);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id, authDisplayName]);

  useEffect(() => {
    if (!username) { setUsernameError(null); return; }
    if (!/^[a-z0-9_]{3,24}$/.test(username)) {
      setUsernameError("3–24 chars, lowercase, numbers, underscore");
      return;
    }
    setChecking(true);
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", username)
        .maybeSingle();
      setChecking(false);
      if (data && data.id !== user?.id) setUsernameError("Taken");
      else setUsernameError(null);
    }, 300);
    return () => clearTimeout(t);
  }, [username, user?.id]);

  if (!user) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (usernameError) return;
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        username,
        display_name: displayName || username,
        bio: bio || null,
        archetype: archetype || null,
        onboarding_done: true,
      });
    setBusy(false);
    if (error) return toast.error(error.message);
    // Mark as completed so it never shows again this session
    completedUserIds.add(user.id);
    toast.success("Welcome to Folio!");
    setStep("welcome");
  };

  const handleClose = (v: boolean) => {
    // Block closing on profile step if no valid username yet
    if (!v && step === "profile" && (!username || !!usernameError)) return;
    if (!v) {
      // Closing welcome step — mark done
      if (user) completedUserIds.add(user.id);
    }
    setOpen(v);
  };

  const finishOnboarding = () => {
    if (user) completedUserIds.add(user.id);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="sm:max-w-md bg-background border-border overflow-hidden"
        onInteractOutside={(e) => { if (step === "profile" && (!username || !!usernameError)) e.preventDefault(); }}
        onEscapeKeyDown={(e) => { if (step === "profile" && (!username || !!usernameError)) e.preventDefault(); }}
      >
        {step === "profile" && (
          <div className="animate-fade-in-soft">
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.2em] text-foreground/55">
              <span className="h-1 w-6 rounded-full bg-rose" />
              <span className="h-1 w-6 rounded-full bg-border" />
              Step 1 of 2
            </div>
            <DialogTitle className="font-serif text-3xl mt-3">Create your Folio</DialogTitle>
            <p className="text-sm text-foreground/60 mt-1">A few details so other readers can find you.</p>
            <form onSubmit={submit} className="space-y-3 mt-4">
              <div>
                <Input
                  placeholder="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().trim())}
                  required
                  aria-invalid={!!usernameError}
                />
                <p className={`text-[11px] mt-1 ${usernameError ? "text-burgundy" : "text-foreground/50"}`}>
                  {checking ? "Checking…" : usernameError ?? `folio.app/u/${username || "yourname"}`}
                </p>
              </div>
              <Input placeholder="Display name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
              <Textarea placeholder="A line about you as a reader (optional)" value={bio} maxLength={200} onChange={(e) => setBio(e.target.value)} />
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-foreground/55 mb-2">Pick a reader archetype (optional)</p>
                <div className="flex flex-wrap gap-1.5">
                  {ARCHETYPES.map(a => (
                    <button
                      type="button"
                      key={a.value}
                      onClick={() => setArchetype(a.value === archetype ? "" : a.value)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition inline-flex items-center gap-1.5 ${archetype === a.value ? "bg-foreground text-background border-foreground" : "border-border text-foreground/70 hover:border-foreground/40"}`}
                    >
                      <span className="text-[14px] leading-none">{a.emoji}</span> {a.value}
                    </button>
                  ))}
                </div>
              </div>
              <Button type="submit" disabled={busy || !username || !!usernameError} className="w-full rounded-full bg-foreground text-background hover:bg-forest-deep transition">
                {busy ? "Saving…" : "Continue →"}
              </Button>
            </form>
          </div>
        )}

        {step === "welcome" && (
          <div className="animate-fade-in-soft">
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.2em] text-foreground/55">
              <span className="h-1 w-6 rounded-full bg-rose" />
              <span className="h-1 w-6 rounded-full bg-rose" />
              All set
            </div>
            <DialogTitle className="font-serif text-3xl mt-3">Welcome, {displayName || username}.</DialogTitle>
            <p className="text-sm text-foreground/60 mt-1">Three things readers do first.</p>

            <div className="mt-5 space-y-2.5">
              <NextStep
                icon={<BookOpen className="h-4 w-4 text-gold" />}
                title="Add your first book"
                body="Search for what you're reading now or something you loved — your shelf starts here."
                to="/home"
                search={{ tab: "library" }}
                onPick={finishOnboarding}
              />
              <NextStep
                icon={<Users className="h-4 w-4 text-forest" />}
                title="Find readers like you"
                body="Folio matches you with readers whose taste overlaps with yours."
                to="/readers"
                onPick={finishOnboarding}
              />
              <NextStep
                icon={<Sparkles className="h-4 w-4 text-rose" />}
                title="Discover what's trending"
                body="Browse books the community is reading, active rooms, and curated lists."
                to="/discover"
                onPick={finishOnboarding}
              />
            </div>

            <button
              onClick={finishOnboarding}
              className="mt-5 w-full text-xs text-foreground/55 hover:text-foreground py-2 transition"
            >
              I'll explore on my own →
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function NextStep({ icon, title, body, to, search, onPick }: {
  icon: React.ReactNode;
  title: string;
  body: string;
  to: any;
  search?: any;
  onPick: () => void;
}) {
  return (
    <Link
      to={to}
      search={search}
      onClick={onPick}
      className="block card-surface p-3.5 hover-lift group"
    >
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-full bg-gradient-warm grid place-items-center shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">{title}</p>
            <span className="text-foreground/40 group-hover:text-foreground transition group-hover:translate-x-0.5">→</span>
          </div>
          <p className="text-[12px] text-foreground/65 mt-0.5 leading-relaxed">{body}</p>
        </div>
      </div>
    </Link>
  );
}
