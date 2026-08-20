import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LoadingIndicator } from "@/components/ui/loading-indicator";
import { JoinEventPanel } from "@/components/events/join-event-panel";

async function JoinPreview({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) {
    redirect("/auth/login");
  }

  const { data } = await supabase
    .rpc("get_event_by_invite_code", { p_invite_code: code })
    .maybeSingle();

  if (!data) {
    return <p className="text-sm text-muted-foreground">유효하지 않은 초대 링크입니다.</p>;
  }

  return (
    <JoinEventPanel
      inviteCode={code}
      groupName={data.group_name}
      title={data.title}
      location={data.location}
      startAt={data.start_at}
      capacity={data.capacity}
      approvedCount={data.approved_count}
    />
  );
}

export default function JoinEventPage({ params }: { params: Promise<{ code: string }> }) {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
      <h1 className="text-2xl font-bold">이벤트 참여하기</h1>
      <Suspense fallback={<LoadingIndicator />}>
        <JoinPreview params={params} />
      </Suspense>
    </div>
  );
}
