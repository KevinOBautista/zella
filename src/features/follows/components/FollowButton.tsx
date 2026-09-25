"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { toggleFollowAction } from "@/features/follows/actions";
import { loginHref } from "@/lib/seller-routing";
import { resumeHref } from "@/lib/auth-resume";
import { DemoActionDialog } from "@/features/demo/components/DemoActionDialog";
import { DEMO_COPY } from "@/features/demo/constants";

export function FollowButton({
  sellerId,
  initialFollowing,
  isLoggedIn,
  size = "sm",
  isDemo = false,
}: {
  sellerId: string;
  initialFollowing: boolean;
  isLoggedIn: boolean;
  size?: "sm" | "md";
  /** Demo sellers explain instead of being followed. */
  isDemo?: boolean;
}) {
  // `following` only ever reflects persisted state: it is set from the
  // action's result, never optimistically, so a failed request can't show
  // a false "Following".
  const [following, setFollowing] = useState(initialFollowing);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const [demoOpen, setDemoOpen] = useState(false);

  return (
    <>
    <Button
      type="button"
      size={size}
      variant={following ? "secondary" : "primary"}
      loading={pending}
      aria-pressed={following}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (pending) return;
        if (isDemo) {
          setDemoOpen(true);
          return;
        }
        if (!isLoggedIn) {
          router.push(loginHref({ next: resumeHref("follow"), reason: "follow" }));
          return;
        }
        startTransition(async () => {
          const result = await toggleFollowAction(sellerId);
          if ("error" in result) {
            toast.error(result.error);
            return;
          }
          setFollowing(result.following);
        });
      }}
    >
      {following ? "Following" : "Follow"}
    </Button>
    {isDemo && <DemoActionDialog open={demoOpen} onClose={() => setDemoOpen(false)} title={DEMO_COPY.followTitle} body={DEMO_COPY.followBody} />}
    </>
  );
}
