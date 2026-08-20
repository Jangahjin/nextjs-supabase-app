import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { Suspense } from "react";
import { LoadingIndicator } from "@/components/ui/loading-indicator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GroupSettingsForm } from "@/components/groups/group-settings-form";
import { InviteCodeBadge } from "@/components/groups/invite-code-badge";
import { DeleteGroupButton } from "@/components/groups/delete-group-button";

async function SettingsContent({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
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
    redirect(`/groups/${groupId}`);
  }

  const { data: group } = await supabase
    .from("groups")
    .select("name, category, description, member_limit, invite_code, owner_id")
    .eq("id", groupId)
    .maybeSingle();

  if (!group) {
    notFound();
  }

  const isOwner = group.owner_id === auth.claims.sub;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>초대 코드</CardTitle>
        </CardHeader>
        <CardContent>
          <InviteCodeBadge inviteCode={group.invite_code} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>모임 정보 수정</CardTitle>
        </CardHeader>
        <CardContent>
          <GroupSettingsForm
            groupId={groupId}
            initialName={group.name}
            initialCategory={group.category}
            initialDescription={group.description}
            initialMemberLimit={group.member_limit}
          />
        </CardContent>
      </Card>
      {isOwner && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle>위험 구역</CardTitle>
          </CardHeader>
          <CardContent>
            <DeleteGroupButton groupId={groupId} groupName={group.name} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function GroupSettingsPage({ params }: { params: Promise<{ groupId: string }> }) {
  return (
    <Suspense fallback={<LoadingIndicator />}>
      <SettingsContent params={params} />
    </Suspense>
  );
}
