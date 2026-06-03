import { Link } from "@tanstack/react-router";
import { useGate } from "@/components/auth/AuthGate";
import { useAuth } from "@/lib/auth-context";

export function Footer() {
  const { user } = useAuth();
  const { openAuth } = useGate();

  return (
    <footer className="relative bg-background border-t border-border pt-20 pb-10 overflow-hidden">
      <div className="mx-auto max-w-7xl px-6">

        {/* CTA — only for logged-out */}
        {!user && (
          <div className="text-center mb-20">
            <h2 className="font-serif text-5xl md:text-7xl leading-[0.95] text-balance">
              Begin your <em className="text-forest-deep">Reading World.</em>
            </h2>
            <p className="mt-5 text-foreground/55 text-lg max-w-md mx-auto">
              Free to join. Your shelf, goals, and community are waiting.
            </p>
            <button
              onClick={openAuth}
              className="mt-7 inline-flex items-center gap-2 rounded-full bg-foreground text-background px-8 py-3.5 text-sm font-medium hover:bg-foreground/90 transition-colors"
            >
              Create your Folio — free →
            </button>
          </div>
        )}

        <div className="grid md:grid-cols-4 gap-10 text-sm">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <span className="font-serif text-2xl">Folio</span>
              <span className="h-1.5 w-1.5 rounded-full bg-rose" />
            </div>
            <p className="text-foreground/55 max-w-xs leading-relaxed">
              Your reading life, beautifully kept. Track books, join reading rooms, and find readers who love what you love.
            </p>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-widest text-foreground/40 mb-4">Product</p>
            <ul className="space-y-2.5 text-foreground/65">
              <li><Link to="/discover" className="hover:text-foreground transition">Discover</Link></li>
              <li><Link to="/rooms" className="hover:text-foreground transition">Reading Rooms</Link></li>
              <li><Link to="/home" search={{ tab: "library" }} className="hover:text-foreground transition">Your Library</Link></li>
              <li><Link to="/premium" className="hover:text-foreground transition text-rose">Premium ★</Link></li>
            </ul>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-widest text-foreground/40 mb-4">Company</p>
            <ul className="space-y-2.5 text-foreground/65">
              <li><Link to="/privacy" className="hover:text-foreground transition">Privacy</Link></li>
              <li><Link to="/terms" className="hover:text-foreground transition">Terms</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-14 pt-6 border-t border-border flex flex-wrap justify-between gap-3 text-xs text-foreground/40">
          <p>© 2026 Folio. Made for readers, by readers.</p>
          <div className="flex gap-4">
            <Link to="/privacy" className="hover:text-foreground transition">Privacy</Link>
            <Link to="/terms" className="hover:text-foreground transition">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
