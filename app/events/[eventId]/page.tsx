import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RsvpButton } from "@/components/events/rsvp-button";
import { DeleteEventButton } from "@/components/events/delete-event-button";
import { CopyInviteLinkButton } from "@/components/events/copy-invite-link-button";
import { LiveParticipantCount } from "@/components/events/live-participant-count";
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

async function EventDetail({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) {
    redirect("/auth/login");
  }

  const { data: event } = await supabase
    .from("events")
    .select("group_id, title, description, location, start_at, capacity, status, invite_code")
    .eq("id", eventId)
    .maybeSingle();

  if (!event) {
    notFound();
  }

  const groupId = event.group_id;

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

  const isParticipating =
    myParticipant?.status === "approved" || myParticipant?.status === "attended";

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
          <LiveParticipantCount
            eventId={eventId}
            initialCount={approvedCount ?? 0}
            capacity={event.capacity}
          />
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
      <div className="flex items-center justify-end gap-2">
        {isAdmin ? (
          <>
            <CopyInviteLinkButton inviteCode={event.invite_code} />
            <Link
              href={`/groups/${groupId}/events/${eventId}/edit`}
              className="text-sm underline underline-offset-4"
            >
              일정 수정
            </Link>
            <DeleteEventButton groupId={groupId} eventId={eventId} />
          </>
        ) : (
          isParticipating && <Badge variant="secondary">참여자로 참여 중</Badge>
        )}
      </div>
    </div>
  );
}

export default function GlobalEventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  return (
    <Suspense fallback={<LoadingIndicator />}>
      <EventDetail params={params} />
    </Suspense>
  );
}
