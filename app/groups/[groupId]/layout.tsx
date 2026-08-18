import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

async function GroupNav({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) {
    redirect("/auth/login");
  }

  const { data: group } = await supabase
    .from("groups")
    .select("id, name")
    .eq("id", groupId)
    .maybeSingle();

  if (!group) {
    notFound();
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

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">{group.name}</h1>
      <nav className="flex gap-4 border-b pb-2 text-sm">
        <Link href={`/groups/${groupId}`} className="hover:underline">
          홈
        </Link>
        {membership?.status === "approved" && (
          <>
            <Link href={`/groups/${groupId}/announcements`} className="hover:underline">
              공지
            </Link>
            <Link href={`/groups/${groupId}/events`} className="hover:underline">
              일정
            </Link>
            <Link href={`/groups/${groupId}/members`} className="hover:underline">
              멤버
            </Link>
          </>
        )}
        {isAdmin && (
          <Link href={`/groups/${groupId}/settings`} className="hover:underline">
            설정
          </Link>
        )}
      </nav>
    </div>
  );
}

export default function GroupLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ groupId: string }>;
}) {
  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={<p className="text-sm text-muted-foreground">불러오는 중...</p>}>
        <GroupNav params={params} />
      </Suspense>
      {children}
    </div>
  );
}
