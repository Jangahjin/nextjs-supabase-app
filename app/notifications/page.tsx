import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { NotificationList } from "@/components/notifications/notification-list";

async function NotificationsContent() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) {
    redirect("/auth/login");
  }

  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, title, body, link_path, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  return <NotificationList notifications={notifications ?? []} />;
}

export default function NotificationsPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">알림</h1>
      <Suspense fallback={<p className="text-sm text-muted-foreground">불러오는 중...</p>}>
        <NotificationsContent />
      </Suspense>
    </div>
  );
}
