import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LoadingIndicator } from "@/components/ui/loading-indicator";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MemberRow } from "@/components/groups/member-row";

async function MembersList({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) {
    redirect("/auth/login");
  }
  const selfId = auth.claims.sub;

  const { data: selfMembership } = await supabase
    .from("group_members")
    .select("role, status")
    .eq("group_id", groupId)
    .eq("user_id", selfId)
    .maybeSingle();

  const isAdmin =
    selfMembership?.status === "approved" &&
    (selfMembership.role === "owner" || selfMembership.role === "admin");

  const { data: members } = await supabase
    .from("group_members")
    .select("id, user_id, role, status, profile:profiles(full_name, email, avatar_url)")
    .eq("group_id", groupId)
    .order("created_at", { ascending: true });

  const rows = (members ?? []).filter((m) => m.profile !== null);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>멤버</TableHead>
          <TableHead>역할</TableHead>
          <TableHead>상태</TableHead>
          <TableHead>관리</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((m) => (
          <MemberRow
            key={m.id}
            memberId={m.id}
            name={m.profile!.full_name || m.profile!.email}
            email={m.profile!.email}
            avatarUrl={m.profile!.avatar_url}
            role={m.role}
            status={m.status}
            isAdmin={isAdmin}
            isSelf={m.user_id === selfId}
          />
        ))}
      </TableBody>
    </Table>
  );
}

export default function GroupMembersPage({ params }: { params: Promise<{ groupId: string }> }) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">멤버</h2>
      <Suspense fallback={<LoadingIndicator />}>
        <MembersList params={params} />
      </Suspense>
    </div>
  );
}
