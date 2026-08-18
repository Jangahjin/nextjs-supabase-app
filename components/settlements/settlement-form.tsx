"use client";

import { createSettlement } from "@/app/groups/[groupId]/events/[eventId]/settlement/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export function SettlementForm({ groupId, eventId }: { groupId: string; eventId: string }) {
  const [title, setTitle] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const result = await createSettlement({
      groupId,
      eventId,
      title,
      totalAmount: Number(totalAmount),
    });

    if (result?.error) {
      setError(result.error);
      setIsLoading(false);
      return;
    }

    toast.success("정산이 생성되었습니다.");
    setIsLoading(false);
    router.refresh();
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="title">정산 제목</Label>
            <Input
              id="title"
              required
              placeholder="예: 수영장 대관료 + 간식비"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="total-amount">총 금액 (원)</Label>
            <Input
              id="total-amount"
              type="number"
              min={1}
              required
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "생성 중..." : "참석 확정 인원으로 N빵 정산 만들기"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
