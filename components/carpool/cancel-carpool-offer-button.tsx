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

export function CancelCarpoolOfferButton({ offerId }: { offerId: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleCancel = async () => {
    setIsLoading(true);
    const supabase = createClient();
    const { error } = await supabase.from("carpool_offers").delete().eq("id", offerId);

    if (error) {
      toast.error(error.message);
      setIsLoading(false);
      return;
    }

    toast.success("카풀 제공을 취소했습니다.");
    router.refresh();
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="outline" disabled={isLoading}>
          제공 취소
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>카풀 제공을 취소할까요?</AlertDialogTitle>
          <AlertDialogDescription>
            취소하면 이 운전자와 배정된 탑승자 매칭도 함께 삭제됩니다.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>닫기</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={isLoading} onClick={handleCancel}>
            {isLoading ? "취소 중..." : "취소하기"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
