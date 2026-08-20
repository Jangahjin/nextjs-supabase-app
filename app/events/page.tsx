import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LoadingIndicator } from "@/components/ui/loading-indicator";
import { MyEventCard } from "@/components/events/my-event-card";
import { EmptyState } from "@/components/ui/empty-state";

type MyEvent = {
  id: string;
  title: string;
  location: string | null;
  start_at: string;
  status: string;
  role: "organizer" | "participant";
};

async function MyEventsSection() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) {
    redirect("/auth/login");
  }

  const userId = auth.claims.sub;

  const [{ data: organizerEvents }, { data: participations }] = await Promise.all([
    supabase
      .from("events")
      .select("id, title, location, start_at, status")
      .eq("created_by", userId)
      .order("start_at", { ascending: true }),
    supabase
      .from("event_participants")
      .select("events(id, title, location, start_at, status)")
      .eq("user_id", userId)
      .in("status", ["approved", "attended"]),
  ]);

  const events = new Map<string, MyEvent>();

  for (const e of organizerEvents ?? []) {
    events.set(e.id, { ...e, role: "organizer" });
  }

  for (const p of participations ?? []) {
    const e = p.events;
    if (e && !events.has(e.id)) {
      events.set(e.id, { ...e, role: "participant" });
    }
  }

  const sortedEvents = Array.from(events.values()).sort(
    (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
  );

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">내 이벤트</h1>
      {sortedEvents.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {sortedEvents.map((e) => (
            <MyEventCard
              key={e.id}
              id={e.id}
              title={e.title}
              location={e.location}
              startAt={e.start_at}
              status={e.status}
              role={e.role}
            />
          ))}
        </div>
      ) : (
        <EmptyState title="주최하거나 참여한 이벤트가 아직 없습니다." />
      )}
    </div>
  );
}

export default function MyEventsPage() {
  return (
    <Suspense fallback={<LoadingIndicator />}>
      <MyEventsSection />
    </Suspense>
  );
}
