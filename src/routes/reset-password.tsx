import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — Folio" },
      { name: "description", content: "Choose a new password for your Folio account." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase appends a recovery hash to the URL; the client picks it up automatically
    // via detectSessionInUrl. Verify a session exists before allowing a password change.
    const check = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        toast.error("This reset link is invalid or has expired.");
        navigate({ to: "/", replace: true });
        return;
      }
      setReady(true);
    };
    check();
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return toast.error("Password must be at least 8 characters");
    if (password !== confirm) return toast.error("Passwords don't match");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated");
    navigate({ to: "/home", search: { tab: "library" }, replace: true });
  };

  return (
    <main className="min-h-dvh bg-background text-foreground">
      
      <div className="mx-auto max-w-sm px-6 py-20">
        <h1 className="font-serif text-4xl mb-2">Choose a new password</h1>
        <p className="text-sm text-foreground/60 mb-8">At least 8 characters.</p>
        {ready && (
          <form onSubmit={submit} className="space-y-3">
            <Input
              type="password"
              placeholder="New password"
              autoComplete="new-password"
              minLength={8}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Input
              type="password"
              placeholder="Confirm new password"
              autoComplete="new-password"
              minLength={8}
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? "Updating…" : "Update password"}
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}
