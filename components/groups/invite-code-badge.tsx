"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";

export function InviteCodeBadge({ inviteCode }: { inviteCode: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const url = `${window.location.origin}/groups/join/${inviteCode}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("초대 링크를 복사했습니다.");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-2">
      <code className="rounded bg-muted px-2 py-1 text-sm">{inviteCode}</code>
      <Button size="sm" variant="outline" onClick={handleCopy}>
        {copied ? "복사됨" : "초대 링크 복사"}
      </Button>
    </div>
  );
}
