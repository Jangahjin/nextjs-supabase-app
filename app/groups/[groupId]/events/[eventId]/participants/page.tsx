import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LoadingIndicator } from "@/components/ui/loading-indicator";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ParticipantRow } from "@/components/events/participant-row";
import { EmptyState } from "@/components/ui/empty-state";

async function ParticipantsList({
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

  const { data: participants } = await supabase
    .from("event_participants")
    .select(
      "id, status, profile:profiles!event_participants_user_id_fkey(full_name, email, avatar_url)"
    )
    .eq("event_id", eventId)
    .order("applied_at", { ascending: true });

  const rows = (participants ?? []).filter((p) => p.profile !== null);

  if (rows.length === 0) {
    return <EmptyState title="아직 참석 신청이 없습니다." />;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>참여자</TableHead>
          <TableHead>상태</TableHead>
          <TableHead>관리</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((p) => (
          <ParticipantRow
            key={p.id}
            participantId={p.id}
            name={p.profile!.full_name || p.profile!.email}
            email={p.profile!.email}
            avatarUrl={p.profile!.avatar_url}
            status={p.status}
          />
        ))}
      </TableBody>
    </Table>
  );
}

export default function EventParticipantsPage({
  params,
}: {
  params: Promise<{ groupId: string; eventId: string }>;
}) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">참여자 관리</h2>
      <Suspense fallback={<LoadingIndicator />}>
        <ParticipantsList params={params} />
      </Suspense>
    </div>
  );
}
