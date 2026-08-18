"use client";

import { runCarpoolMatching } from "@/app/groups/[groupId]/events/[eventId]/carpool/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

type CarpoolMatchRow = {
  id: string;
  status: string;
  driverName: string;
  driverArea: string;
  riderName: string;
  riderArea: string;
};

export function CarpoolMatchList({
  groupId,
  eventId,
  isAdmin,
  matches,
}: {
  groupId: string;
  eventId: string;
  isAdmin: boolean;
  matches: CarpoolMatchRow[];
}) {
  const [isMatching, setIsMatching] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const router = useRouter();

  const handleRunMatching = async () => {
    setIsMatching(true);
    const result = await runCarpoolMatching({ groupId, eventId });

    if (result?.error) {
      toast.error(result.error);
      setIsMatching(false);
      return;
    }

    toast.success("카풀 매칭을 실행했습니다.");
    setIsMatching(false);
    router.refresh();
  };

  const handleToggleConfirm = async (matchId: string, nextStatus: "confirmed" | "proposed") => {
    setLoadingId(matchId);
    const supabase = createClient();
    const { error } = await supabase
      .from("carpool_matches")
      .update({ status: nextStatus })
      .eq("id", matchId);

    if (error) {
      toast.error(error.message);
      setLoadingId(null);
      return;
    }

    toast.success(
      nextStatus === "confirmed" ? "매칭을 확정했습니다." : "매칭 확정을 취소했습니다."
    );
    setLoadingId(null);
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-4">
      {isAdmin && (
        <Button onClick={handleRunMatching} disabled={isMatching} className="w-fit">
          {isMatching ? "매칭 실행 중..." : "카풀 자동 매칭 실행"}
        </Button>
      )}
      {matches.length === 0 ? (
        <p className="text-sm text-muted-foreground">아직 매칭된 카풀이 없습니다.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>운전자</TableHead>
              <TableHead>탑승자</TableHead>
              <TableHead>상태</TableHead>
              {isAdmin && <TableHead>관리</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {matches.map((m) => (
              <TableRow key={m.id}>
                <TableCell>
                  {m.driverName} ({m.driverArea})
                </TableCell>
                <TableCell>
                  {m.riderName} ({m.riderArea})
                </TableCell>
                <TableCell>
                  <Badge variant={m.status === "confirmed" ? "default" : "secondary"}>
                    {m.status === "confirmed" ? "확정" : "제안됨"}
                  </Badge>
                </TableCell>
                {isAdmin && (
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={loadingId === m.id}
                      onClick={() =>
                        handleToggleConfirm(
                          m.id,
                          m.status === "confirmed" ? "proposed" : "confirmed"
                        )
                      }
                    >
                      {m.status === "confirmed" ? "확정 취소" : "확정"}
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
