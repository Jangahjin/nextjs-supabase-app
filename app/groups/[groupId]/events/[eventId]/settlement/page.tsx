import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LoadingIndicator } from "@/components/ui/loading-indicator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SettlementForm } from "@/components/settlements/settlement-form";
import { SettlementItemRow } from "@/components/settlements/settlement-item-row";
import { DeleteSettlementButton } from "@/components/settlements/delete-settlement-button";

async function SettlementSection({
  params,
}: {
  params: Promise<{ groupId: string; eventId: string }>;
}) {
  const { groupId, eventId } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) {
    redirect("/auth/login");
  }
  const selfId = auth.claims.sub;

  const { data: membership } = await supabase
    .from("group_members")
    .select("role, status")
    .eq("group_id", groupId)
    .eq("user_id", selfId)
    .maybeSingle();

  const isAdmin =
    membership?.status === "approved" &&
    (membership.role === "owner" || membership.role === "admin");

  const { data: settlement } = await supabase
    .from("settlements")
    .select("id, title, total_amount, status")
    .eq("event_id", eventId)
    .maybeSingle();

  if (!settlement) {
    if (!isAdmin) {
      return <p className="text-sm text-muted-foreground">아직 정산이 생성되지 않았습니다.</p>;
    }
    return <SettlementForm groupId={groupId} eventId={eventId} />;
  }

  const { data: items } = await supabase
    .from("settlement_items")
    .select(
      "id, user_id, amount, is_paid, profile:profiles!settlement_items_user_id_fkey(full_name, email, avatar_url)"
    )
    .eq("settlement_id", settlement.id)
    .order("created_at", { ascending: true });

  const rows = (items ?? []).filter((i) => i.profile !== null);
  const paidCount = rows.filter((i) => i.is_paid).length;
  const unpaidTotal = rows.filter((i) => !i.is_paid).reduce((sum, i) => sum + i.amount, 0);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{settlement.title}</CardTitle>
          <CardDescription>
            총 {settlement.total_amount.toLocaleString("ko-KR")}원 · {paidCount}/{rows.length}명
            입금완료 · 미입금 합계 {unpaidTotal.toLocaleString("ko-KR")}원
          </CardDescription>
        </CardHeader>
        {isAdmin && (
          <CardContent className="flex justify-end">
            <DeleteSettlementButton settlementId={settlement.id} />
          </CardContent>
        )}
      </Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>참여자</TableHead>
            <TableHead>분담금</TableHead>
            <TableHead>입금 확인</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((i) => (
            <SettlementItemRow
              key={i.id}
              itemId={i.id}
              name={i.profile!.full_name || i.profile!.email}
              email={i.profile!.email}
              avatarUrl={i.profile!.avatar_url}
              amount={i.amount}
              isPaid={i.is_paid}
              canToggle={isAdmin || i.user_id === selfId}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default function EventSettlementPage({
  params,
}: {
  params: Promise<{ groupId: string; eventId: string }>;
}) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">정산</h2>
      <Suspense fallback={<LoadingIndicator />}>
        <SettlementSection params={params} />
      </Suspense>
    </div>
  );
}
