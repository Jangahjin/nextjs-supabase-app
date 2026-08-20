import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { Suspense } from "react";
import { AnnouncementForm } from "@/components/announcements/announcement-form";

async function EditAnnouncementGuard({
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

  const { data: membership } = await supabase
    .from("group_members")
    .select("role, status")
    .eq("group_id", groupId)
    .eq("user_id", auth.claims.sub)
    .maybeSingle();

  const isAdmin =
    membership?.status === "approved" &&
    (membership.role === "owner" || membership.role === "admin");

  if (!isAdmin) {
    redirect(`/groups/${groupId}/announcements/${announcementId}`);
  }

  const { data: announcement } = await supabase
    .from("announcements")
    .select("title, content, pinned")
    .eq("id", announcementId)
    .maybeSingle();

  if (!announcement) {
    notFound();
  }

  return (
    <AnnouncementForm
      groupId={groupId}
      announcementId={announcementId}
      initialTitle={announcement.title}
      initialContent={announcement.content}
      initialPinned={announcement.pinned}
    />
  );
}

export default function EditAnnouncementPage({
  params,
}: {
  params: Promise<{ groupId: string; announcementId: string }>;
}) {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
      <h1 className="text-2xl font-bold">공지 수정</h1>
      <Suspense fallback={<p className="text-sm text-muted-foreground">불러오는 중...</p>}>
        <EditAnnouncementGuard params={params} />
      </Suspense>
    </div>
  );
}
