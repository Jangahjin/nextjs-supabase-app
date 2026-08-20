"use client";

import { Button } from "@/components/ui/button";
import { siteUrl } from "@/lib/utils";
import { toast } from "sonner";

export function CopyInviteLinkButton({ inviteCode }: { inviteCode: string }) {
  const handleCopy = async () => {
    const link = `${siteUrl}/join/${inviteCode}`;
    await navigator.clipboard.writeText(link);
    toast.success("초대 링크가 복사되었습니다.");
  };

  return (
    <Button size="sm" variant="outline" onClick={handleCopy}>
      공유하기
    </Button>
  );
}
