"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export function AnnouncementForm({
  groupId,
  announcementId,
  initialTitle = "",
  initialContent = "",
  initialPinned = false,
}: {
  groupId: string;
  announcementId?: string;
  initialTitle?: string;
  initialContent?: string;
  initialPinned?: boolean;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [pinned, setPinned] = useState(initialPinned);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    const supabase = createClient();

    if (announcementId) {
      const { error } = await supabase
        .from("announcements")
        .update({ title, content, pinned })
        .eq("id", announcementId);

      if (error) {
        setError(error.message);
        setIsLoading(false);
        return;
      }

      toast.success("공지를 수정했습니다.");
      router.push(`/groups/${groupId}/announcements/${announcementId}`);
      router.refresh();
      return;
    }

    const { data, error } = await supabase
      .from("announcements")
      .insert({ group_id: groupId, title, content, pinned })
      .select("id")
      .single();

    if (error) {
      setError(error.message);
      setIsLoading(false);
      return;
    }

    toast.success("공지가 등록되었습니다.");
    router.push(`/groups/${groupId}/announcements/${data.id}`);
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="title">제목</Label>
            <Input id="title" required value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="content">내용</Label>
            <Input
              id="content"
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="pinned"
              checked={pinned}
              onCheckedChange={(checked) => setPinned(checked === true)}
            />
            <Label htmlFor="pinned">상단 고정</Label>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" disabled={isLoading}>
            {isLoading
              ? announcementId
                ? "저장 중..."
                : "등록 중..."
              : announcementId
                ? "저장"
                : "공지 등록"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
