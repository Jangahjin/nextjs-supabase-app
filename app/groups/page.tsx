import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { GroupCard } from "@/components/groups/group-card";

async function MyGroups() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) {
    redirect("/auth/login");
  }

  const { data: memberships } = await supabase
    .from("group_members")
    .select("status, group:groups(id, name, category, description)")
    .in("status", ["pending", "approved"])
    .order("created_at", { ascending: false });

  const groups = (memberships ?? []).filter((m) => m.group !== null);

  if (groups.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        아직 가입한 모임이 없습니다. 새 모임을 만들거나 초대코드로 가입해보세요.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      {groups.map((m) => (
        <GroupCard
          key={m.group!.id}
          id={m.group!.id}
          name={m.group!.name}
          category={m.group!.category}
          description={m.group!.description}
          status={m.status as "pending" | "approved"}
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
      <Suspense fallback={<p className="text-sm text-muted-foreground">불러오는 중...</p>}>
        <MyGroups />
      </Suspense>
    </div>
  );
}
