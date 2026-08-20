import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RsvpButton } from "@/components/events/rsvp-button";
import { DeleteEventButton } from "@/components/events/delete-event-button";
import { LoadingIndicator } from "@/components/ui/loading-indicator";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function EventDetail({ params }: { params: Promise<{ groupId: string; eventId: string }> }) {
  const { groupId, eventId } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) {
    redirect("/auth/login");
  }

  const { data: event } = await supabase
    .from("events")
    .select("title, description, location, start_at, capacity, status")
    .eq("id", eventId)
    .maybeSingle();

  if (!event) {
    notFound();
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

  const { data: myParticipant } = await supabase
    .from("event_participants")
    .select("id, status")
    .eq("event_id", eventId)
    .eq("user_id", auth.claims.sub)
    .maybeSingle();

  const { count: approvedCount } = await supabase
    .from("event_participants")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId)
    .in("status", ["approved", "attended"]);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{event.title}</CardTitle>
          <CardDescription>{formatDateTime(event.start_at)}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          {event.location && <p>장소: {event.location}</p>}
          {event.description && <p>{event.description}</p>}
          <p className="text-muted-foreground">
            참석 확정 {approvedCount ?? 0}명{event.capacity ? ` / 정원 ${event.capacity}명` : ""}
          </p>
        </CardContent>
      </Card>
      <RsvpButton
        eventId={eventId}
        participantId={myParticipant?.id ?? null}
        status={myParticipant?.status ?? null}
      />
      <div className="flex gap-4 text-sm">
        {isAdmin && (
          <Link
            href={`/groups/${groupId}/events/${eventId}/participants`}
            className="underline underline-offset-4"
          >
            참여자 관리
          </Link>
        )}
        <Link
          href={`/groups/${groupId}/events/${eventId}/settlement`}
          className="underline underline-offset-4"
        >
          정산
        </Link>
        <Link
          href={`/groups/${groupId}/events/${eventId}/carpool`}
          className="underline underline-offset-4"
        >
          카풀
        </Link>
      </div>
      {isAdmin && (
        <div className="flex justify-end gap-2">
          <Link
            href={`/groups/${groupId}/events/${eventId}/edit`}
            className="text-sm underline underline-offset-4"
          >
            일정 수정
          </Link>
          <DeleteEventButton groupId={groupId} eventId={eventId} />
        </div>
      )}
    </div>
  );
}

export default function EventDetailPage({
  params,
}: {
  params: Promise<{ groupId: string; eventId: string }>;
}) {
  return (
    <Suspense fallback={<LoadingIndicator />}>
      <EventDetail params={params} />
    </Suspense>
  );
}
