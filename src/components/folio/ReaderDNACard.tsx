import { useRef } from "react";
import type { ReaderDNA } from "@/lib/dna";
import { toast } from "sonner";

type Props = {
  dna: ReaderDNA;
  displayName: string;
  username?: string | null;
};

// Animated, screenshot-friendly DNA card. The download path is `html2canvas`
// (already a dep). Native share when available, copy-link fallback.
export function ReaderDNACard({ dna, displayName, username }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);

  const exportPng = async () => {
    if (!ref.current) return;
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(ref.current, { backgroundColor: null, scale: 2 });
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `folio-dna-${username || displayName || "reader"}.png`;
      a.click();
      toast.success("DNA card downloaded");
    } catch {
      toast.error("Couldn't export — try a screenshot");
    }
  };

  const share = async () => {
    const url = `${window.location.origin}/dna${username ? `?u=${username}` : ""}`;
    try {
      if (navigator.share) await navigator.share({ url, title: "My Reader DNA", text: dna.signature });
      else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied");
      }
    } catch { /* dismissed */ }
  };

  return (
    <div className="space-y-3">
      <div
        ref={ref}
        className="relative overflow-hidden rounded-3xl border border-border p-7 bg-gradient-to-br from-card to-muted"
      >
        <div className="absolute -top-20 -right-20 h-56 w-56 rounded-full bg-rose/20 blur-3xl" aria-hidden />
        <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-gold/20 blur-3xl" aria-hidden />

        <div className="relative">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-[0.25em] text-foreground/60">Folio · Reader DNA</p>
            <p className="text-[10px] text-foreground/50">@{username || displayName}</p>
          </div>

          <div className="mt-5 flex items-start gap-4">
            <div className="text-5xl">{dna.archetype.emoji}</div>
            <div>
              <p className="font-serif text-3xl leading-tight">{dna.archetype.name}</p>
              <p className="text-sm text-foreground/70 mt-1 italic">{dna.archetype.tagline}</p>
            </div>
          </div>

          <div className="mt-5">
            <p className="text-[10px] uppercase tracking-widest text-foreground/50 mb-2">Top genres</p>
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
              {dna.genres.slice(0, 5).map(g => (
                <div
                  key={g.genre}
                  className={`bg-${g.color}`}
                  style={{ width: `${g.pct}%` }}
                  title={`${g.genre} ${g.pct}%`}
                />
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-foreground/70">
              {dna.genres.slice(0, 5).map(g => (
                <span key={g.genre} className="inline-flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full bg-${g.color}`} />
                  {g.genre} · {g.pct}%
                </span>
              ))}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3 text-center">
            <Stat label="Pace" value={dna.pace} />
            <Stat label="Rereader" value={`${dna.rereader}%`} />
            <Stat label="Top mood" value={dna.moodArc[0]?.mood ?? "—"} />
          </div>

          <p className="mt-5 font-serif text-sm text-foreground/80 italic">"{dna.signature}"</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={share} className="rounded-full bg-foreground text-background px-5 py-2.5 text-sm min-h-11">
          Share DNA
        </button>
        <button onClick={exportPng} className="rounded-full border border-border px-5 py-2.5 text-sm min-h-11">
          Download card
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-background/60 backdrop-blur px-3 py-2">
      <p className="text-[10px] uppercase tracking-widest text-foreground/50">{label}</p>
      <p className="font-serif text-base mt-0.5">{value}</p>
    </div>
  );
}
