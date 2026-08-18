import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

async function GroupDashboard({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) {
    redirect("/auth/login");
  }

  const { data: membership } = await supabase
    .from("group_members")
    .select("status")
    .eq("group_id", groupId)
    .eq("user_id", auth.claims.sub)
    .maybeSingle();

  if (membership?.status === "pending") {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            가입 신청이 접수되었습니다. 모임장의 승인을 기다려주세요.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { data: group } = await supabase
    .from("groups")
    .select("description, category, member_limit")
    .eq("id", groupId)
    .maybeSingle();

  const { count: memberCount } = await supabase
    .from("group_members")
    .select("id", { count: "exact", head: true })
    .eq("group_id", groupId)
    .eq("status", "approved");

  return (
    <Card>
      <CardHeader>
        <CardTitle>모임 정보</CardTitle>
        {group?.category && <CardDescription>{group.category}</CardDescription>}
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-sm">
        {group?.description && <p>{group.description}</p>}
        <p className="text-muted-foreground">
          현재 인원 {memberCount ?? 0}명
          {group?.member_limit ? ` / 최대 ${group.member_limit}명` : ""}
        </p>
      </CardContent>
    </Card>
  );
}

export default function GroupDashboardPage({ params }: { params: Promise<{ groupId: string }> }) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">불러오는 중...</p>}>
      <GroupDashboard params={params} />
    </Suspense>
  );
}
