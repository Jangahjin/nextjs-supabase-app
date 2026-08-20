"use client";

import { createClient } from "@/lib/supabase/client";
import { EmptyState } from "@/components/ui/empty-state";
import Link from "next/link";
import { useEffect } from "react";

type NotificationItem = {
  id: string;
  title: string;
  body: string | null;
  link_path: string | null;
  read_at: string | null;
  created_at: string;
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("ko-KR", {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function NotificationList({ notifications }: { notifications: NotificationItem[] }) {
  useEffect(() => {
    const unreadIds = notifications.filter((n) => !n.read_at).map((n) => n.id);
    if (unreadIds.length === 0) return;
    const supabase = createClient();
    supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .in("id", unreadIds);
  }, [notifications]);

  if (notifications.length === 0) {
    return <EmptyState title="알림이 없습니다." />;
  }

  return (
    <div className="flex flex-col divide-y rounded-md border">
      {notifications.map((n) => (
        <Link
          key={n.id}
          href={n.link_path ?? "#"}
          className={`flex flex-col gap-1 p-4 hover:bg-accent ${!n.read_at ? "bg-accent/50" : ""}`}
        >
          <p className="font-medium">{n.title}</p>
          {n.body && <p className="text-sm text-muted-foreground">{n.body}</p>}
          <p className="text-xs text-muted-foreground">{formatDateTime(n.created_at)}</p>
        </Link>
      ))}
    </div>
  );
}
