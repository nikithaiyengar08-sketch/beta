import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { useNavigate, useRouterState } from "@tanstack/react-router";

export function AuthModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { signIn, signUp, signInWithGoogle, resetPasswordForEmail } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Display name is collected during onboarding right after signup; no need to ask twice.
  const [busy, setBusy] = useState(false);

  const switchMode = (newMode: "signin" | "signup" | "forgot") => {
    setMode(newMode);
    setPassword("");
  };


  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    let res: { error?: string };
    if (mode === "forgot") {
      res = await resetPasswordForEmail(email);
    } else if (mode === "signin") {
      res = await signIn(email, password);
    } else {
      res = await signUp(email, password, email.split("@")[0]);
    }
    setBusy(false);
    if (res.error) return toast.error(res.error);
    if (mode === "forgot") {
      toast.success("Check your email for a reset link");
      setMode("signin");
      return;
    }
    toast.success(mode === "signin" ? "Welcome back" : "Check your email — we'll take you into onboarding once verified.");
    if (mode === "signin") {
      onOpenChange(false);
      if (pathname === "/" || pathname === "/auth") {
        navigate({ to: "/home", search: { tab: "library" } });
      }
    }
  };

  const google = async () => {
    setBusy(true);
    const res = await signInWithGoogle();
    setBusy(false);
    if (res.error) toast.error(res.error);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-background border-border">
        <DialogTitle className="font-serif text-3xl">
          {mode === "signin" ? "Welcome back" : mode === "signup" ? "Create your Folio" : "Reset your password"}
        </DialogTitle>
        <p className="text-sm text-foreground/60 -mt-1">
          {mode === "forgot" ? "We'll email you a reset link." : "Your reading life, beautifully kept."}
        </p>


        {mode !== "forgot" && (
          <>
            <Button type="button" onClick={google} disabled={busy} variant="outline" className="w-full rounded-full">
              Continue with Google
            </Button>
            <div className="relative my-2 text-center text-xs text-foreground/40">
              <span className="bg-background px-2 relative z-10">or</span>
              <div className="absolute inset-x-0 top-1/2 h-px bg-border" />
            </div>
          </>
        )}

        <form onSubmit={submit} className="space-y-3">
          <Input type="email" placeholder="Email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          {mode !== "forgot" && (
            <Input type="password" placeholder="Password" required minLength={mode === "signup" ? 8 : 6}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              value={password} onChange={(e) => setPassword(e.target.value)} />
          )}
          <Button type="submit" disabled={busy} className="w-full rounded-full bg-foreground text-background">
            {busy ? "…" : mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}
          </Button>
        </form>

        <div className="flex justify-between items-center pt-1">
          <button
            type="button"
            onClick={() => switchMode(mode === "signin" ? "signup" : "signin")}
            className="text-xs text-foreground/60 hover:text-foreground"
          >
            {mode === "signin" ? "New here? Create an account" : mode === "signup" ? "Already have an account? Sign in" : "Back to sign in"}
          </button>
          {mode === "signin" && (
            <button type="button" onClick={() => switchMode("forgot")} className="text-xs text-foreground/60 hover:text-foreground">
              Forgot password?
            </button>
          )}

        </div>
      </DialogContent>
    </Dialog>
  );
}
