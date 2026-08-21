"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export function ProfileForm({
  userId,
  initialFullName,
  email,
  avatarUrl,
}: {
  userId: string;
  initialFullName: string;
  email: string;
  avatarUrl: string | null;
}) {
  const [fullName, setFullName] = useState(initialFullName);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    const supabase = createClient();

    // full_name 외 필드(email 등)는 절대 payload에 포함하지 않는다.
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName })
      .eq("id", userId);

    if (error) {
      setError(error.message);
      setIsLoading(false);
      return;
    }

    toast.success("프로필을 저장했습니다.");
    setIsLoading(false);
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {avatarUrl && (
        <Avatar size="lg">
          <AvatarImage src={avatarUrl} alt={fullName || email} />
          <AvatarFallback>{(fullName || email).slice(0, 1)}</AvatarFallback>
        </Avatar>
      )}
      <div className="grid gap-2">
        <Label htmlFor="full-name">이름</Label>
        <Input
          id="full-name"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="email">이메일</Label>
        <p id="email" className="text-sm text-muted-foreground">
          {email}
        </p>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={isLoading} className="w-fit">
        {isLoading ? "저장 중..." : "저장"}
      </Button>
    </form>
  );
}
