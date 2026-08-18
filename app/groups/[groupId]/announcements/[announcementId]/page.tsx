import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { Suspense } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("ko-KR", {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function AnnouncementDetail({
  params,
}: {
  params: Promise<{ groupId: string; announcementId: string }>;
}) {
  const { announcementId } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) {
    redirect("/auth/login");
  }

  const { data: announcement } = await supabase
    .from("announcements")
    .select("title, content, pinned, created_at")
    .eq("id", announcementId)
    .maybeSingle();

  if (!announcement) {
    notFound();
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>{announcement.title}</CardTitle>
          {announcement.pinned && <Badge>고정</Badge>}
        </div>
        <CardDescription>{formatDateTime(announcement.created_at)}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="whitespace-pre-wrap text-sm">{announcement.content}</p>
      </CardContent>
    </Card>
  );
}

export default function AnnouncementDetailPage({
  params,
}: {
  params: Promise<{ groupId: string; announcementId: string }>;
}) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">불러오는 중...</p>}>
      <AnnouncementDetail params={params} />
    </Suspense>
  );
}
