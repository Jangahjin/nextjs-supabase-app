"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { TableCell, TableRow } from "@/components/ui/table";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export function SettlementItemRow({
  itemId,
  name,
  email,
  avatarUrl,
  amount,
  isPaid,
  canToggle,
}: {
  itemId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  amount: number;
  isPaid: boolean;
  canToggle: boolean;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleToggle = async (checked: boolean) => {
    setIsLoading(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("settlement_items")
      .update({ is_paid: checked, paid_at: checked ? new Date().toISOString() : null })
      .eq("id", itemId);

    if (error) {
      toast.error(error.message);
      setIsLoading(false);
      return;
    }

    toast.success(checked ? "입금 확인 처리했습니다." : "입금 확인을 취소했습니다.");
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
      <TableCell>{amount.toLocaleString("ko-KR")}원</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Checkbox
            checked={isPaid}
            disabled={!canToggle || isLoading}
            onCheckedChange={(checked) => handleToggle(checked === true)}
          />
          <span className="text-sm text-muted-foreground">{isPaid ? "입금완료" : "미입금"}</span>
        </div>
      </TableCell>
    </TableRow>
  );
}
