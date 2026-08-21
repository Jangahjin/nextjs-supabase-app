import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LoadingIndicator } from "@/components/ui/loading-indicator";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { GroupCard } from "@/components/groups/group-card";
import { EmptyState } from "@/components/ui/empty-state";

async function MyGroups() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) {
    redirect("/auth/login");
  }

  const { data: memberships } = await supabase
    .from("group_members")
    .select("status, group:groups(id, name, category, description, cover_image_url, updated_at)")
    .in("status", ["pending", "approved"])
    .order("created_at", { ascending: false });

  const groups = (memberships ?? []).filter((m) => m.group !== null);

  if (groups.length === 0) {
    return (
      <EmptyState
        title="아직 가입한 모임이 없습니다."
        description="새 모임을 만들거나 초대코드로 가입해보세요."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
      {groups.map((m) => (
        <GroupCard
          key={m.group!.id}
          id={m.group!.id}
          name={m.group!.name}
          category={m.group!.category}
          description={m.group!.description}
          status={m.status as "pending" | "approved"}
          coverImageUrl={m.group!.cover_image_url}
          updatedAt={m.group!.updated_at}
        />
      ))}
    </div>
  );
}

export default function GroupsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">내 모임</h1>
        <Button asChild>
          <Link href="/groups/new">새 모임 만들기</Link>
        </Button>
      </div>
      <Suspense fallback={<LoadingIndicator />}>
        <MyGroups />
      </Suspense>
    </div>
  );
}
