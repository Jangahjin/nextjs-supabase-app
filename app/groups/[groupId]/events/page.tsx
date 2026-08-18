import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EventCard } from "@/components/events/event-card";

async function EventsSection({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) {
    redirect("/auth/login");
  }

  const [{ data: events }, { data: membership }] = await Promise.all([
    supabase
      .from("events")
      .select("id, title, location, start_at, status")
      .eq("group_id", groupId)
      .order("start_at", { ascending: true }),
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
        <h2 className="text-xl font-semibold">일정</h2>
        {isAdmin && (
          <Button asChild>
            <Link href={`/groups/${groupId}/events/new`}>새 일정 만들기</Link>
          </Button>
        )}
      </div>
      {events && events.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((e) => (
            <EventCard
              key={e.id}
              groupId={groupId}
              id={e.id}
              title={e.title}
              location={e.location}
              startAt={e.start_at}
              status={e.status}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">아직 등록된 일정이 없습니다.</p>
      )}
    </div>
  );
}

export default function GroupEventsPage({ params }: { params: Promise<{ groupId: string }> }) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">불러오는 중...</p>}>
      <EventsSection params={params} />
    </Suspense>
  );
}
