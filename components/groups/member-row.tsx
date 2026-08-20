"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

const STATUS_LABEL: Record<string, string> = {
  pending: "승인 대기중",
  approved: "가입됨",
  rejected: "거절됨",
};

const ROLE_LABEL: Record<string, string> = {
  owner: "모임장",
  admin: "운영진",
  member: "멤버",
};

export function MemberRow({
  memberId,
  name,
  email,
  avatarUrl,
  role,
  status,
  isAdmin,
  isSelf,
}: {
  memberId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: string;
  status: string;
  isAdmin: boolean;
  isSelf: boolean;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const updateStatus = async (nextStatus: "approved" | "rejected") => {
    setIsLoading(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("group_members")
      .update({
        status: nextStatus,
        joined_at: nextStatus === "approved" ? new Date().toISOString() : null,
      })
      .eq("id", memberId);

    if (error) {
      toast.error(error.message);
      setIsLoading(false);
      return;
    }

    toast.success(nextStatus === "approved" ? "가입을 승인했습니다." : "가입 신청을 거절했습니다.");
    setIsLoading(false);
    router.refresh();
  };

  const handleLeave = async () => {
    setIsLoading(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("group_members")
      .update({ status: "left" })
      .eq("id", memberId);

    if (error) {
      toast.error(error.message);
      setIsLoading(false);
      return;
    }

    toast.success("모임에서 나갔습니다.");
    router.push("/groups");
    router.refresh();
  };

  const handleRemove = async () => {
    setIsLoading(true);
    const supabase = createClient();
    const { error } = await supabase.from("group_members").delete().eq("id", memberId);

    if (error) {
      toast.error(error.message);
      setIsLoading(false);
      return;
    }

    toast.success("멤버를 제거했습니다.");
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
            <p className="font-medium">
              {name} {isSelf && <span className="text-muted-foreground">(나)</span>}
            </p>
            <p className="text-xs text-muted-foreground">{email}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>{ROLE_LABEL[role] ?? role}</TableCell>
      <TableCell>
        <Badge variant={status === "approved" ? "default" : "secondary"}>
          {STATUS_LABEL[status] ?? status}
        </Badge>
      </TableCell>
      <TableCell>
        {isAdmin && status === "pending" && (
          <div className="flex gap-2">
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
          </div>
        )}
        {status === "approved" && role !== "owner" && isSelf && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="outline" disabled={isLoading}>
                모임 탈퇴
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>이 모임에서 나가시겠어요?</AlertDialogTitle>
                <AlertDialogDescription>
                  나가면 이 모임의 일정·공지 등에 다시 접근하려면 초대코드로 재가입해야 합니다.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isLoading}>취소</AlertDialogCancel>
                <AlertDialogAction variant="destructive" disabled={isLoading} onClick={handleLeave}>
                  {isLoading ? "처리 중..." : "나가기"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        {status === "approved" && role !== "owner" && isAdmin && !isSelf && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="destructive" disabled={isLoading}>
                멤버 제거
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>&quot;{name}&quot;님을 모임에서 제거할까요?</AlertDialogTitle>
                <AlertDialogDescription>
                  제거하면 이 멤버는 모임 정보에 접근할 수 없으며, 재가입하려면 초대코드가 다시
                  필요합니다.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isLoading}>취소</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  disabled={isLoading}
                  onClick={handleRemove}
                >
                  {isLoading ? "처리 중..." : "제거"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </TableCell>
    </TableRow>
  );
}
