import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Footer } from "@/components/folio/Footer";
import { Hero } from "@/components/folio/Hero";
import { Marquee } from "@/components/folio/Marquee";
import { WhyFolio } from "@/components/folio/WhyFolio";
import { CommunityPreview } from "@/components/folio/CommunityPreview";
import { Testimonials } from "@/components/folio/Testimonials";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Folio — Your reading life, beautifully kept" },
      {
        name: "description",
        content:
          "Folio is the reading app for people who actually love books. Track your reads, join reading rooms, discover readers like you.",
      },
      { property: "og:title", content: "Folio — Your reading life, beautifully kept" },
      {
        property: "og:description",
        content: "Track reading, join rooms, discover your Reader DNA. A better reading experience than Goodreads.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Index,
});

function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && user) {
      navigate({ to: "/home", search: { tab: "library" }, replace: true });
    }
  }, [loading, user, navigate]);

  return (
    <main className="min-h-screen bg-background text-foreground antialiased">
      <Hero />
      <Marquee />
      <WhyFolio />
      <CommunityPreview />
      <Testimonials />
      <Footer />
    </main>
  );
}
