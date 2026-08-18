"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

const STATUS_LABEL: Record<string, string> = {
  applied: "승인 대기중",
  approved: "참석 확정",
  rejected: "거절됨",
  cancelled: "신청 취소함",
  attended: "참석 완료",
  absent: "불참",
};

export function ParticipantRow({
  participantId,
  name,
  email,
  avatarUrl,
  status,
}: {
  participantId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  status: string;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const updateStatus = async (nextStatus: string) => {
    setIsLoading(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("event_participants")
      .update({
        status: nextStatus,
        responded_at: new Date().toISOString(),
      })
      .eq("id", participantId);

    if (error) {
      toast.error(error.message);
      setIsLoading(false);
      return;
    }

    toast.success("참석 현황을 업데이트했습니다.");
    setIsLoading(false);
    router.refresh();
  };

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-2">
          <Avatar size="sm">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
            <AvatarFallback>{name.slice(0, 1)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{name}</p>
            <p className="text-xs text-muted-foreground">{email}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={status === "approved" || status === "attended" ? "default" : "secondary"}>
          {STATUS_LABEL[status] ?? status}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-2">
          {status === "applied" && (
            <>
              <Button size="sm" disabled={isLoading} onClick={() => updateStatus("approved")}>
                승인
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={isLoading}
                onClick={() => updateStatus("rejected")}
              >
                거절
              </Button>
            </>
          )}
          {status === "approved" && (
            <>
              <Button size="sm" disabled={isLoading} onClick={() => updateStatus("attended")}>
                참석 처리
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={isLoading}
                onClick={() => updateStatus("absent")}
              >
                불참 처리
              </Button>
            </>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
