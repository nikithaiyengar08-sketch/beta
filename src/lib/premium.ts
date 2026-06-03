// Premium status — backed by profiles.subscription_tier in Lovable Cloud.
// Falls back to a localStorage hint while the session is still loading so the
// preview UI doesn't flicker between tiers.
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

const HINT_KEY = "folio:premium-hint";

function readHint(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(HINT_KEY) === "1";
  } catch {
    return false;
  }
}

function writeHint(on: boolean) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(HINT_KEY, on ? "1" : "0");
  } catch {}
}

export function usePremium(): {
  isPremium: boolean;
  loading: boolean;
  setPremium: (v: boolean) => Promise<void>;
} {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [hint, setHintState] = useState<boolean>(false);

  useEffect(() => {
    setHintState(readHint());
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["premium", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("subscription_tier")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      const premium = data?.subscription_tier === "premium";
      writeHint(premium);
      return premium;
    },
    staleTime: 30_000,
  });

  const isPremium = user ? Boolean(data) : hint;

  const setPremium = async (v: boolean) => {
    if (!user) {
      writeHint(v);
      setHintState(v);
      return;
    }
    const { error } = await supabase
      .from("profiles")
      .update({ subscription_tier: v ? "premium" : "free" })
      .eq("id", user.id);
    if (error) throw error;
    writeHint(v);
    qc.invalidateQueries({ queryKey: ["premium", user.id] });
  };

  return { isPremium, loading: !!user && isLoading, setPremium };
}
