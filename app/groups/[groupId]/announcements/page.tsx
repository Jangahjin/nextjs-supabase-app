import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AnnouncementCard } from "@/components/announcements/announcement-card";

async function AnnouncementsSection({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) {
    redirect("/auth/login");
  }

  const [{ data: announcements }, { data: membership }] = await Promise.all([
    supabase
      .from("announcements")
      .select("id, title, content, pinned, created_at")
      .eq("group_id", groupId)
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("group_members")
      .select("role, status")
      .eq("group_id", groupId)
      .eq("user_id", auth.claims.sub)
      .maybeSingle(),
  ]);

  const isAdmin =
    membership?.status === "approved" &&
    (membership.role === "owner" || membership.role === "admin");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">공지</h2>
        {isAdmin && (
          <Button asChild>
            <Link href={`/groups/${groupId}/announcements/new`}>공지 작성</Link>
          </Button>
        )}
      </div>
      {announcements && announcements.length > 0 ? (
        <div className="flex flex-col gap-4">
          {announcements.map((a) => (
            <AnnouncementCard
              key={a.id}
              groupId={groupId}
              id={a.id}
              title={a.title}
              content={a.content}
              pinned={a.pinned}
              createdAt={a.created_at}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">아직 등록된 공지가 없습니다.</p>
      )}
    </div>
  );
}

export default function GroupAnnouncementsPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">불러오는 중...</p>}>
      <AnnouncementsSection params={params} />
    </Suspense>
  );
}
