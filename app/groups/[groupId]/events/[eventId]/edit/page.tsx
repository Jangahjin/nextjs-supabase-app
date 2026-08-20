import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { Suspense } from "react";
import { EventForm } from "@/components/events/event-form";

async function EditEventGuard({
  params,
}: {
  params: Promise<{ groupId: string; eventId: string }>;
}) {
  const { groupId, eventId } = await params;
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
    redirect(`/groups/${groupId}/events/${eventId}`);
  }

  const { data: event } = await supabase
    .from("events")
    .select("title, location, description, start_at, end_at, capacity, rsvp_deadline")
    .eq("id", eventId)
    .maybeSingle();

  if (!event) {
    notFound();
  }

  return (
    <EventForm
      groupId={groupId}
      eventId={eventId}
      initialTitle={event.title}
      initialLocation={event.location}
      initialDescription={event.description}
      initialStartAt={event.start_at}
      initialEndAt={event.end_at}
      initialCapacity={event.capacity}
      initialRsvpDeadline={event.rsvp_deadline}
    />
  );
}

export default function EditEventPage({
  params,
}: {
  params: Promise<{ groupId: string; eventId: string }>;
}) {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
      <h1 className="text-2xl font-bold">일정 수정</h1>
      <Suspense fallback={<p className="text-sm text-muted-foreground">불러오는 중...</p>}>
        <EditEventGuard params={params} />
      </Suspense>
    </div>
  );
}
