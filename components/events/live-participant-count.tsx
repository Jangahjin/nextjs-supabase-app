"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

export function LiveParticipantCount({
  eventId,
  initialCount,
  capacity,
}: {
  eventId: string;
  initialCount: number;
  capacity: number | null;
}) {
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    const supabase = createClient();

    const refetchCount = async () => {
      const { count: approvedCount, error } = await supabase
        .from("event_participants")
        .select("id", { count: "exact", head: true })
        .eq("event_id", eventId)
        .in("status", ["approved", "attended"]);
      if (error) {
        console.error(error);
        return;
      }
      setCount(approvedCount ?? 0);
    };

    const channel = supabase
      .channel(`event_participants:${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "event_participants",
          filter: `event_id=eq.${eventId}`,
        },
        refetchCount
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          refetchCount();
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  return (
    <p className="text-muted-foreground">
      참석 확정 {count}명{capacity ? ` / 정원 ${capacity}명` : ""}
    </p>
  );
}
