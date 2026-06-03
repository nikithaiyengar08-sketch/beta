import { createFileRoute } from "@tanstack/react-router";
import { Footer } from "@/components/folio/Footer";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Folio" },
      { name: "description", content: "How Folio collects, uses, and protects your data." },
      { property: "og:title", content: "Privacy Policy — Folio" },
      { property: "og:description", content: "How Folio collects, uses, and protects your data." },
      { rel: "canonical", href: "/privacy" },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      
      <article className="mx-auto max-w-2xl px-6 py-16 prose prose-sm prose-neutral">
        <h1 className="font-serif text-5xl mb-2">Privacy Policy</h1>
        <p className="text-sm text-foreground/60 mb-10">Last updated: June 2026</p>

        <section className="space-y-6 text-[15px] leading-relaxed">
          <p>Folio (“we”, “us”) builds a private place for your reading life. This policy explains what we collect and why.</p>

          <h2 className="font-serif text-2xl mt-8">What we collect</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Account data</strong>: email, display name, and (if you choose) profile details like bio, avatar, archetype.</li>
            <li><strong>Reading data</strong>: books you save, reviews, quotes, lists, and reading rooms you join.</li>
            <li><strong>Usage data</strong>: basic telemetry (pages visited, errors) to keep the app reliable.</li>
          </ul>

          <h2 className="font-serif text-2xl mt-8">How we use it</h2>
          <p>To run your account, sync your library across devices, power features like Reading Rooms, and improve the product. We do not sell your data.</p>

          <h2 className="font-serif text-2xl mt-8">Sharing</h2>
          <p>Public profile content (display name, avatar, public reviews, public lists) is visible to anyone. Private lists, drafts, and friends-only content are visible only to you (or your followers, when applicable).</p>

          <h2 className="font-serif text-2xl mt-8">Your rights</h2>
          <p>You can edit or delete your profile, reviews, quotes, and lists at any time from Settings. To delete your account entirely, contact <a href="mailto:hello@folio.app" className="underline">hello@folio.app</a>.</p>

          <h2 className="font-serif text-2xl mt-8">Contact</h2>
          <p>Questions? Reach us at <a href="mailto:hello@folio.app" className="underline">hello@folio.app</a>.</p>
        </section>
      </article>
      <Footer />
    </main>
  );
}
