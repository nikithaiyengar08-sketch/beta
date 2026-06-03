import { createFileRoute } from "@tanstack/react-router";
import { Footer } from "@/components/folio/Footer";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Folio" },
      { name: "description", content: "The terms that govern your use of Folio." },
      { property: "og:title", content: "Terms of Service — Folio" },
      { property: "og:description", content: "The terms that govern your use of Folio." },
      { rel: "canonical", href: "/terms" },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      
      <article className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="font-serif text-5xl mb-2">Terms of Service</h1>
        <p className="text-sm text-foreground/60 mb-10">Last updated: June 2026</p>

        <section className="space-y-6 text-[15px] leading-relaxed">
          <p>By creating a Folio account you agree to these terms. Keep it brief — be kind, don't break the law, don't try to break the service.</p>

          <h2 className="font-serif text-2xl mt-8">Your account</h2>
          <p>You're responsible for the activity on your account. Keep your password safe. One person per account.</p>

          <h2 className="font-serif text-2xl mt-8">Your content</h2>
          <p>You own what you post (reviews, quotes, lists, highlights). You grant Folio a license to host and display it so the product can work. You can delete it any time.</p>

          <h2 className="font-serif text-2xl mt-8">Acceptable use</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>No harassment, hate speech, or illegal content.</li>
            <li>No spam, scraping, or automated abuse.</li>
            <li>Respect copyright. Quote responsibly.</li>
          </ul>

          <h2 className="font-serif text-2xl mt-8">Termination</h2>
          <p>You can close your account any time. We may suspend accounts that violate these terms.</p>

          <h2 className="font-serif text-2xl mt-8">Disclaimer</h2>
          <p>Folio is provided “as is”. We work hard to keep it running but can't guarantee perfection. To the maximum extent allowed by law, we're not liable for indirect damages.</p>

          <h2 className="font-serif text-2xl mt-8">Contact</h2>
          <p>Questions? <a href="mailto:hello@folio.app" className="underline">hello@folio.app</a>.</p>
        </section>
      </article>
      <Footer />
    </main>
  );
}
