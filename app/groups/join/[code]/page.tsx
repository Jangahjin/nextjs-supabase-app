import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { JoinGroupPanel } from "@/components/groups/join-group-panel";

async function JoinPreview({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) {
    redirect("/auth/login");
  }

  const { data } = await supabase
    .rpc("get_group_by_invite_code", { p_invite_code: code })
    .maybeSingle();

  if (!data) {
    return <p className="text-sm text-muted-foreground">유효하지 않은 초대코드입니다.</p>;
  }

  return (
    <JoinGroupPanel
      groupId={data.id}
      name={data.name}
      description={data.description}
      category={data.category}
    />
  );
}

export default function JoinGroupPage({ params }: { params: Promise<{ code: string }> }) {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
      <h1 className="text-2xl font-bold">모임 가입하기</h1>
      <Suspense fallback={<p className="text-sm text-muted-foreground">불러오는 중...</p>}>
        <JoinPreview params={params} />
      </Suspense>
    </div>
  );
}
