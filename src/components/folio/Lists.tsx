import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";


const PALETTE = ["#3d6b4d", "#a86b6b", "#c9a44c", "#6b5d8a", "#d4a574", "#7a5c4a", "#8b4513", "#cd853f", "#5c4033"];

type Item = { id: string; title: string; count: number; by: string; followers: string; colors: string[]; covers: string[] };

export function Lists() {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const { data } = await supabase
        .from("reading_lists")
        .select("id, name, created_at, profiles(display_name, username), list_books(id, book:books(cover_url))")
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(6);
      const rows = (data ?? []) as any[];
      const mapped: Item[] = rows.map((r, i) => {
        const lb: any[] = r.list_books ?? [];
        const covers = lb.map(x => x.book?.cover_url).filter(Boolean).slice(0, 3);
        const colors = covers.length < 3 ? PALETTE.slice(i, i + 3) : [];
        return {
          id: r.id, title: r.name,
          count: lb.length,
          by: r.profiles?.display_name ?? r.profiles?.username ?? "anon",
          followers: "",
          colors, covers,
        };
      });
      setItems(mapped);
    } catch {}
  };


  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!user) { toast.error("Sign in"); return; }
    if (!name.trim()) { toast.error("Name required"); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from("reading_lists").insert({
        user_id: user.id, name: name.trim(),
        description: desc.trim() || null, is_public: isPublic,
      });
      if (error) throw error;
      toast.success("List created");
      setName(""); setDesc(""); setIsPublic(true); setDialogOpen(false);
      load();
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
    finally { setSaving(false); }
  };

  return (
    <section id="discover-lists" className="relative">
      <>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 text-foreground/50" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
            <h2 className="text-sm uppercase tracking-widest text-foreground/50 font-medium">Your lists</h2>
          </div>
          {user && (
            <Button size="sm" variant="outline" onClick={() => setDialogOpen(true)}>+ New list</Button>
          )}
        </div>

        {items.length === 0 && (
          <p className="text-center text-foreground/60 py-12">No public lists yet — be the first to make one.</p>
        )}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((l, i) => (
            <Link key={l.id} to="/list/$listId" params={{ listId: l.id }} className="group p-6 rounded-3xl bg-background border border-border hover:border-foreground/40 transition-all hover:-translate-y-1">
              <div className="flex -space-x-3 mb-5">
                {l.covers.length > 0 ? (
                  l.covers.map((c, idx) => (
                    <div key={idx} className="h-20 w-14 rounded-sm shadow-lg overflow-hidden group-hover:rotate-3 transition-transform" style={{ transitionDelay: `${idx * 60}ms` }}>
                      <img src={c} alt="" className="h-full w-full object-cover" />
                    </div>
                  ))
                ) : (
                  l.colors.map((c, idx) => (
                    <div key={idx} className="h-20 w-14 rounded-sm shadow-lg book-spine group-hover:rotate-3 transition-transform"
                      style={{ background: c, transitionDelay: `${idx * 60}ms` }} />
                  ))
                )}
                {l.count > 3 && (
                  <div className="h-20 w-14 rounded-sm bg-muted flex items-center justify-center text-xs text-foreground/50 ml-3">
                    +{l.count - 3}
                  </div>
                )}
              </div>
              <h3 className="font-serif text-2xl leading-tight">{l.title}</h3>
              <p className="mt-2 text-sm text-foreground/60">
                {l.count} books · by @{l.by}{l.followers ? ` · ${l.followers} followers` : ""}
              </p>
            </Link>
          ))}
        </div>
      </>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-ivory">
          <DialogHeader><DialogTitle className="font-serif text-3xl">Create a list</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="List name" className="w-full rounded-xl border border-border bg-background p-3 text-sm focus:outline-none focus:border-foreground/40" />
            <textarea rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Description (optional)" className="w-full rounded-xl border border-border bg-background p-3 text-sm focus:outline-none focus:border-foreground/40" />
            <div className="inline-flex rounded-full border border-border p-1 bg-background">
              {[[true, "Public"], [false, "Private"]].map(([v, l]) => (
                <button key={String(v)} onClick={() => setIsPublic(v as boolean)}
                  className={`text-xs px-4 py-1.5 rounded-full transition ${isPublic === v ? "bg-foreground text-background" : "text-foreground/60"}`}>
                  {l as string}
                </button>
              ))}
            </div>
            <Button onClick={create} disabled={saving} size="lg" className="w-full">
              {saving ? "Saving…" : "Create"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
