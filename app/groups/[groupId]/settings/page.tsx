import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GroupSettingsForm } from "@/components/groups/group-settings-form";
import { InviteCodeBadge } from "@/components/groups/invite-code-badge";

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
    .select("name, category, description, member_limit, invite_code")
    .eq("id", groupId)
    .maybeSingle();

  if (!group) {
    notFound();
  }

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
    </div>
  );
}

export default function GroupSettingsPage({ params }: { params: Promise<{ groupId: string }> }) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">불러오는 중...</p>}>
      <SettingsContent params={params} />
    </Suspense>
  );
}
