"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { CalendarDays, MapPin, Users } from "lucide-react";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function JoinEventPanel({
  inviteCode,
  groupName,
  title,
  location,
  startAt,
  capacity,
  approvedCount,
}: {
  inviteCode: string;
  groupName: string;
  title: string;
  location: string | null;
  startAt: string;
  capacity: number | null;
  approvedCount: number;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleJoin = async () => {
    setIsLoading(true);
    setError(null);
    const supabase = createClient();

    const { data, error } = await supabase
      .rpc("join_event_by_invite_code", { p_invite_code: inviteCode })
      .maybeSingle();

    if (error) {
      setError(error.message);
      setIsLoading(false);
      return;
    }

    if (!data) {
      setError("유효하지 않은 초대 링크입니다.");
      setIsLoading(false);
      return;
    }

    toast.success("참여 신청이 완료되었습니다. 모임장의 승인을 기다려주세요.");
    router.push(`/events/${data.event_id}`);
  };

  return (
    <Card>
      <div className="flex aspect-video items-center justify-center rounded-t-xl bg-muted text-muted-foreground">
        <CalendarDays className="size-10" />
      </div>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{groupName}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-sm">
          <CalendarDays className="size-4 text-muted-foreground" />
          {formatDateTime(startAt)}
        </div>
        {location && (
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="size-4 text-muted-foreground" />
            {location}
          </div>
        )}
        <div className="flex items-center gap-2 text-sm">
          <Users className="size-4 text-muted-foreground" />
          자리 {approvedCount}
          {capacity ? ` / ${capacity}` : ""}
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <Button onClick={handleJoin} disabled={isLoading}>
          {isLoading ? "신청 중..." : "참여하기"}
        </Button>
      </CardContent>
    </Card>
  );
}
