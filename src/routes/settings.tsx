import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Footer } from "@/components/folio/Footer";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useGate } from "@/components/auth/AuthGate";
import { toast } from "sonner";

const ARCHETYPES = [
  "Literary wanderer",
  "Cozy escapist",
  "Sharp non-fiction",
  "Poetry lover",
  "Genre devourer",
  "Slow & deep",
];

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — Folio" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user, loading } = useAuth();
  const { openAuth } = useGate();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [originalUsername, setOriginalUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [archetype, setArchetype] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const uploadTo = async (bucket: "avatars" | "covers", file: File) => {
    if (!user) return null;
    const MAX = 5 * 1024 * 1024; // 5 MB
    const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!ALLOWED.includes(file.type)) {
      toast.error("Please choose a JPG, PNG, WebP, or GIF image");
      return null;
    }
    if (file.size > MAX) {
      toast.error("Image must be 5 MB or smaller");
      return null;
    }
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      upsert: true, contentType: file.type,
    });
    if (error) { toast.error(error.message); return null; }
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  };

  useEffect(() => {
    if (loading) return;
    if (!user) { openAuth(); return; }
    supabase.from("profiles")
      .select("username, display_name, bio, archetype, avatar_url, cover_image_url")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setUsername(data.username ?? "");
          setOriginalUsername(data.username ?? "");
          setDisplayName(data.display_name ?? "");
          setBio(data.bio ?? "");
          setArchetype(data.archetype ?? "");
          setAvatarUrl(data.avatar_url ?? "");
          setCoverUrl(data.cover_image_url ?? "");
        }
        setHydrated(true);
      });
  }, [user, loading, openAuth]);

  useEffect(() => {
    if (!username || username === originalUsername) { setUsernameError(null); return; }
    if (!/^[a-z0-9_]{3,24}$/.test(username)) {
      setUsernameError("3–24 chars, lowercase, numbers, underscore");
      return;
    }
    const t = setTimeout(async () => {
      const { data } = await supabase.from("profiles").select("id").eq("username", username).maybeSingle();
      setUsernameError(data && data.id !== user?.id ? "Taken" : null);
    }, 300);
    return () => clearTimeout(t);
  }, [username, originalUsername, user?.id]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || usernameError) return;
    setBusy(true);
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      username,
      display_name: displayName || username,
      bio: bio || null,
      archetype: archetype || null,
      avatar_url: avatarUrl || null,
      cover_image_url: coverUrl || null,
      onboarding_done: true,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    navigate({ to: "/u/$username", params: { username } });
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      
      <div className="mx-auto max-w-2xl px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-serif text-4xl">Edit profile</h1>
          {originalUsername && (
            <Link to="/u/$username" params={{ username: originalUsername }} className="text-sm text-foreground/60 hover:text-foreground">View profile →</Link>
          )}
        </div>
        {!user && !loading && (
          <p className="text-sm text-foreground/60">Sign in to edit your profile.</p>
        )}
        {user && hydrated && (
          <form onSubmit={save} className="space-y-5">
            <Field label="Username">
              <Input value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().trim())} required />
              {usernameError && <p className="text-xs text-rose mt-1">{usernameError}</p>}
            </Field>
            <Field label="Display name">
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </Field>
            <Field label="Bio">
              <Textarea value={bio} maxLength={200} onChange={(e) => setBio(e.target.value)} />
              <p className="text-[11px] text-foreground/40 mt-1">{bio.length}/200</p>
            </Field>
            <Field label="Reader archetype">
              <div className="flex flex-wrap gap-2">
                {ARCHETYPES.map(a => (
                  <button type="button" key={a} onClick={() => setArchetype(a === archetype ? "" : a)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition ${archetype === a ? "bg-foreground text-background border-foreground" : "border-border hover:border-foreground/40"}`}>
                    {a}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Avatar URL">
              <div className="flex items-center gap-3">
                {avatarUrl && <img src={avatarUrl} alt="" className="h-14 w-14 rounded-full object-cover border border-border" />}
                <div className="flex-1 space-y-2">
                  <Input type="url" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://… or upload" />
                  <label className="inline-flex text-xs px-3 py-1.5 rounded-full border border-border hover:border-foreground/40 cursor-pointer">
                    {uploadingAvatar ? "Uploading…" : "Upload image"}
                    <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                      const f = e.target.files?.[0]; if (!f) return;
                      setUploadingAvatar(true);
                      const url = await uploadTo("avatars", f);
                      setUploadingAvatar(false);
                      if (url) { setAvatarUrl(url); toast.success("Avatar uploaded"); }
                    }} />
                  </label>
                </div>
              </div>
            </Field>
            <Field label="Cover image URL">
              <div className="space-y-2">
                {coverUrl && <img src={coverUrl} alt="" className="h-28 w-full rounded-lg object-cover border border-border" />}
                <Input type="url" value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="https://… or upload" />
                <label className="inline-flex text-xs px-3 py-1.5 rounded-full border border-border hover:border-foreground/40 cursor-pointer">
                  {uploadingCover ? "Uploading…" : "Upload cover"}
                  <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                    const f = e.target.files?.[0]; if (!f) return;
                    setUploadingCover(true);
                    const url = await uploadTo("covers", f);
                    setUploadingCover(false);
                    if (url) { setCoverUrl(url); toast.success("Cover uploaded"); }
                  }} />
                </label>
              </div>
            </Field>
            <Button type="submit" disabled={busy || !!usernameError || !username}>
              {busy ? "Saving…" : "Save"}
            </Button>
          </form>
        )}
      </div>
      <Footer />
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wide text-foreground/60">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}