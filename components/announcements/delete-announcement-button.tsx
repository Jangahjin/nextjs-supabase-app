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
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export function DeleteAnnouncementButton({
  groupId,
  announcementId,
}: {
  groupId: string;
  announcementId: string;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    setIsLoading(true);
    const supabase = createClient();
    const { error } = await supabase.from("announcements").delete().eq("id", announcementId);

    if (error) {
      toast.error(error.message);
      setIsLoading(false);
      return;
    }

    toast.success("공지가 삭제되었습니다.");
    router.push(`/groups/${groupId}/announcements`);
    router.refresh();
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="destructive" disabled={isLoading}>
          공지 삭제
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>이 공지를 삭제할까요?</AlertDialogTitle>
          <AlertDialogDescription>삭제하면 되돌릴 수 없습니다.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>취소</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={isLoading} onClick={handleDelete}>
            {isLoading ? "삭제 중..." : "삭제"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
