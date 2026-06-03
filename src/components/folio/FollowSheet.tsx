import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

type FollowProfile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  archetype: string | null;
};

function FollowRow({
  profile,
  currentUserId,
  onClose,
}: {
  profile: FollowProfile;
  currentUserId: string | null;
  onClose: () => void;
}) {
  const [following, setFollowing] = useState<boolean | null>(null);
  const isSelf = currentUserId === profile.id;

  useEffect(() => {
    if (!currentUserId || isSelf) return;
    supabase
      .from("follows")
      .select("id")
      .eq("follower_id", currentUserId)
      .eq("following_id", profile.id)
      .maybeSingle()
      .then(({ data }) => setFollowing(!!data));
  }, [currentUserId, profile.id, isSelf]);

  const toggle = async () => {
    if (!currentUserId) return;
    if (following) {
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", currentUserId)
        .eq("following_id", profile.id);
      if (error) return toast.error(error.message);
      setFollowing(false);
    } else {
      const { error } = await supabase
        .from("follows")
        .insert({ follower_id: currentUserId, following_id: profile.id });
      if (error) return toast.error(error.message);
      setFollowing(true);
    }
  };

  return (
    <div className="flex items-center gap-3 py-3 border-b border-border last:border-0">
      <Link
        to="/u/$username"
        params={{ username: profile.username ?? "" }}
        onClick={onClose}
        className="flex items-center gap-3 flex-1 min-w-0"
      >
        <div className="h-10 w-10 rounded-full bg-rose grid place-items-center text-sm font-serif text-background overflow-hidden flex-shrink-0">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            (profile.display_name?.[0] ?? profile.username?.[0] ?? "?").toUpperCase()
          )}
        </div>
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{profile.display_name || profile.username}</p>
          <p className="text-xs text-foreground/50 truncate">@{profile.username}</p>
          {profile.archetype && (
            <p className="text-[11px] text-foreground/40 truncate">{profile.archetype}</p>
          )}
        </div>
      </Link>
      {!isSelf && currentUserId && following !== null && (
        <Button
          size="sm"
          variant={following ? "outline" : "default"}
          onClick={toggle}
          className="flex-shrink-0"
        >
          {following ? "Following" : "Follow"}
        </Button>
      )}
    </div>
  );
}

export function FollowersSheet({
  open,
  onOpenChange,
  profileId,
  count,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  profileId: string;
  count: number;
}) {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<FollowProfile[] | null>(null);

  useEffect(() => {
    if (!open) return;
    setProfiles(null);
    supabase
      .from("follows")
      .select("follower_id")
      .eq("following_id", profileId)
      .order("created_at", { ascending: false })
      .limit(100)
      .then(async ({ data }) => {
        if (!data?.length) { setProfiles([]); return; }
        const ids = data.map((r) => r.follower_id);
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url, archetype")
          .in("id", ids);
        setProfiles((profs ?? []) as FollowProfile[]);
      });
  }, [open, profileId]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-sm overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-serif text-2xl">
            Followers <span className="text-foreground/40 font-sans font-normal text-lg">{count}</span>
          </SheetTitle>
        </SheetHeader>
        <div className="mt-6">
          {profiles === null ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              ))}
            </div>
          ) : profiles.length === 0 ? (
            <p className="text-sm text-foreground/50 italic">No followers yet.</p>
          ) : (
            profiles.map((p) => (
              <FollowRow
                key={p.id}
                profile={p}
                currentUserId={user?.id ?? null}
                onClose={() => onOpenChange(false)}
              />
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function FollowingSheet({
  open,
  onOpenChange,
  profileId,
  count,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  profileId: string;
  count: number;
}) {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<FollowProfile[] | null>(null);

  useEffect(() => {
    if (!open) return;
    setProfiles(null);
    supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", profileId)
      .order("created_at", { ascending: false })
      .limit(100)
      .then(async ({ data }) => {
        if (!data?.length) { setProfiles([]); return; }
        const ids = data.map((r) => r.following_id);
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url, archetype")
          .in("id", ids);
        setProfiles((profs ?? []) as FollowProfile[]);
      });
  }, [open, profileId]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-sm overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-serif text-2xl">
            Following <span className="text-foreground/40 font-sans font-normal text-lg">{count}</span>
          </SheetTitle>
        </SheetHeader>
        <div className="mt-6">
          {profiles === null ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              ))}
            </div>
          ) : profiles.length === 0 ? (
            <p className="text-sm text-foreground/50 italic">Not following anyone yet.</p>
          ) : (
            profiles.map((p) => (
              <FollowRow
                key={p.id}
                profile={p}
                currentUserId={user?.id ?? null}
                onClose={() => onOpenChange(false)}
              />
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
