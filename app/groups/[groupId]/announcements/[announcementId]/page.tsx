import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteAnnouncementButton } from "@/components/announcements/delete-announcement-button";

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
  const { groupId, announcementId } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) {
    redirect("/auth/login");
  }

  const [{ data: announcement }, { data: membership }] = await Promise.all([
    supabase
      .from("announcements")
      .select("title, content, pinned, created_at")
      .eq("id", announcementId)
      .maybeSingle(),
    supabase
      .from("group_members")
      .select("role, status")
      .eq("group_id", groupId)
      .eq("user_id", auth.claims.sub)
      .maybeSingle(),
  ]);

  if (!announcement) {
    notFound();
  }

  const isAdmin =
    membership?.status === "approved" &&
    (membership.role === "owner" || membership.role === "admin");

  return (
    <div className="flex flex-col gap-6">
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
      {isAdmin && (
        <div className="flex justify-end gap-2">
          <Link
            href={`/groups/${groupId}/announcements/${announcementId}/edit`}
            className="text-sm underline underline-offset-4"
          >
            공지 수정
          </Link>
          <DeleteAnnouncementButton groupId={groupId} announcementId={announcementId} />
        </div>
      )}
    </div>
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
