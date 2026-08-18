"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export function GroupSettingsForm({
  groupId,
  initialName,
  initialCategory,
  initialDescription,
  initialMemberLimit,
}: {
  groupId: string;
  initialName: string;
  initialCategory: string | null;
  initialDescription: string | null;
  initialMemberLimit: number | null;
}) {
  const [name, setName] = useState(initialName);
  const [category, setCategory] = useState(initialCategory ?? "");
  const [description, setDescription] = useState(initialDescription ?? "");
  const [memberLimit, setMemberLimit] = useState(initialMemberLimit?.toString() ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    const supabase = createClient();

    const { error } = await supabase
      .from("groups")
      .update({
        name,
        category: category || null,
        description: description || null,
        member_limit: memberLimit ? Number(memberLimit) : null,
      })
      .eq("id", groupId);

    if (error) {
      setError(error.message);
      setIsLoading(false);
      return;
    }

    toast.success("모임 정보를 저장했습니다.");
    setIsLoading(false);
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid gap-2">
        <Label htmlFor="name">모임 이름</Label>
        <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="category">카테고리</Label>
        <Input id="category" value={category} onChange={(e) => setCategory(e.target.value)} />
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
      <Button type="submit" disabled={isLoading} className="w-fit">
        {isLoading ? "저장 중..." : "저장"}
      </Button>
    </form>
  );
}
