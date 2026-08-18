"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export function JoinGroupPanel({
  groupId,
  name,
  description,
  category,
}: {
  groupId: string;
  name: string;
  description: string | null;
  category: string | null;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleJoin = async () => {
    setIsLoading(true);
    setError(null);
    const supabase = createClient();

    const { error } = await supabase.from("group_members").insert({ group_id: groupId });

    if (error) {
      setError(error.code === "23505" ? "이미 가입했거나 신청한 모임입니다." : error.message);
      setIsLoading(false);
      return;
    }

    toast.success("가입 신청이 완료되었습니다. 모임장의 승인을 기다려주세요.");
    router.push(`/groups/${groupId}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{name}</CardTitle>
        {category && <CardDescription>{category}</CardDescription>}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
        {error && <p className="text-sm text-red-500">{error}</p>}
        <Button onClick={handleJoin} disabled={isLoading}>
          {isLoading ? "신청 중..." : "가입 신청하기"}
        </Button>
      </CardContent>
    </Card>
  );
}
