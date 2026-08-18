"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createSettlement({
  groupId,
  eventId,
  title,
  totalAmount,
}: {
  groupId: string;
  eventId: string;
  title: string;
  totalAmount: number;
}) {
  const supabase = await createClient();

  const { data: participants, error: participantsError } = await supabase
    .from("event_participants")
    .select("user_id")
    .eq("event_id", eventId)
    .in("status", ["approved", "attended"])
    .order("applied_at", { ascending: true });

  if (participantsError) {
    return { error: participantsError.message };
  }
  if (!participants || participants.length === 0) {
    return { error: "정산 대상 참여자(참석 확정 인원)가 없습니다." };
  }

  const { data: settlement, error: settlementError } = await supabase
    .from("settlements")
    .insert({ group_id: groupId, event_id: eventId, title, total_amount: totalAmount })
    .select("id")
    .single();

  if (settlementError || !settlement) {
    return { error: settlementError?.message ?? "정산 생성에 실패했습니다." };
  }

  const n = participants.length;
  const base = Math.floor(totalAmount / n);
  const remainder = totalAmount % n;

  const items = participants.map((p, index) => ({
    settlement_id: settlement.id,
    user_id: p.user_id,
    amount: base + (index < remainder ? 1 : 0),
  }));

  const { error: itemsError } = await supabase.from("settlement_items").insert(items);

  if (itemsError) {
    return { error: itemsError.message };
  }

  revalidatePath(`/groups/${groupId}/events/${eventId}/settlement`);
  return { success: true };
}
