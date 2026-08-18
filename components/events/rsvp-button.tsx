"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

const STATUS_LABEL: Record<string, string> = {
  applied: "신청함 (승인 대기중)",
  approved: "참석 확정",
  rejected: "거절됨",
  cancelled: "신청 취소함",
  attended: "참석 완료",
  absent: "불참 처리됨",
};

export function RsvpButton({
  eventId,
  participantId,
  status,
}: {
  eventId: string;
  participantId: string | null;
  status: string | null;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const canApply = !status || status === "cancelled" || status === "rejected";
  const canCancel = status === "applied" || status === "approved";

  const handleApply = async () => {
    setIsLoading(true);
    const supabase = createClient();

    const { error } = participantId
      ? await supabase
          .from("event_participants")
          .update({ status: "applied" })
          .eq("id", participantId)
      : await supabase.from("event_participants").insert({ event_id: eventId });

    if (error) {
      toast.error(error.message);
      setIsLoading(false);
      return;
    }

    toast.success("참석 신청이 완료되었습니다.");
    setIsLoading(false);
    router.refresh();
  };

  const handleCancel = async () => {
    if (!participantId) return;
    setIsLoading(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("event_participants")
      .update({ status: "cancelled" })
      .eq("id", participantId);

    if (error) {
      toast.error(error.message);
      setIsLoading(false);
      return;
    }

    toast.success("참석 신청을 취소했습니다.");
    setIsLoading(false);
    router.refresh();
  };

  return (
    <div className="flex items-center gap-3">
      {status && (
        <Badge variant={status === "approved" || status === "attended" ? "default" : "secondary"}>
          {STATUS_LABEL[status] ?? status}
        </Badge>
      )}
      {canApply && (
        <Button size="sm" disabled={isLoading} onClick={handleApply}>
          참석 신청하기
        </Button>
      )}
      {canCancel && (
        <Button size="sm" variant="outline" disabled={isLoading} onClick={handleCancel}>
          신청 취소
        </Button>
      )}
    </div>
  );
}
