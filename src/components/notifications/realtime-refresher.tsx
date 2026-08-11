"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * FR32/EC-N5: subscribes to the caller's own notification and task changes
 * (RLS-filtered channels) and refreshes the server-rendered tree — badge,
 * lists, and dashboards stay current without bespoke client state. Focus
 * refetch covers websocket drops; debounce collapses event bursts.
 */
export function RealtimeRefresher({ userId }: { userId: string }) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const refresh = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => router.refresh(), 400);
    };

    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`user-updates-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${userId}`,
        },
        refresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
          filter: `assigned_to=eq.${userId}`,
        },
        refresh,
      )
      .subscribe();

    window.addEventListener("focus", refresh);
    return () => {
      if (timer.current) clearTimeout(timer.current);
      window.removeEventListener("focus", refresh);
      supabase.removeChannel(channel);
    };
  }, [userId, router]);

  return null;
}
