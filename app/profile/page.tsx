import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LoadingIndicator } from "@/components/ui/loading-indicator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

async function ProfileStats() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) {
    redirect("/auth/login");
  }

  const userId = auth.claims.sub;

  const [{ count: organizedCount }, { count: participatedCount }] = await Promise.all([
    supabase.from("events").select("id", { count: "exact", head: true }).eq("created_by", userId),
    supabase
      .from("event_participants")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .in("status", ["approved", "attended"]),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">프로필</h1>
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardDescription>주최한 이벤트</CardDescription>
            <CardTitle className="text-3xl">{organizedCount ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>참여한 이벤트</CardDescription>
            <CardTitle className="text-3xl">{participatedCount ?? 0}</CardTitle>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<LoadingIndicator />}>
      <ProfileStats />
    </Suspense>
  );
}
