"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export function GroupForm() {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [memberLimit, setMemberLimit] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    const supabase = createClient();

    const { data, error } = await supabase
      .from("groups")
      .insert({
        name,
        category: category || null,
        description: description || null,
        member_limit: memberLimit ? Number(memberLimit) : null,
      })
      .select("id")
      .single();

    if (error) {
      setError(error.message);
      setIsLoading(false);
      return;
    }

    toast.success("모임이 생성되었습니다.");
    router.push(`/groups/${data.id}`);
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">모임 이름</Label>
            <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="category">카테고리</Label>
            <Input
              id="category"
              placeholder="예: 수영, 헬스, 친구 모임"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">소개</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="member-limit">최대 인원 (선택)</Label>
            <Input
              id="member-limit"
              type="number"
              min={1}
              value={memberLimit}
              onChange={(e) => setMemberLimit(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "생성 중..." : "모임 만들기"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
