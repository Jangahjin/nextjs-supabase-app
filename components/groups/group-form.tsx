"use client";

import { createClient } from "@/lib/supabase/client";
import { uploadGroupCoverImage } from "@/lib/supabase/storage";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export function GroupForm() {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [memberLimit, setMemberLimit] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setCoverFile(file);
    setCoverPreviewUrl(file ? URL.createObjectURL(file) : null);
  };

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

    if (coverFile) {
      const uploadResult = await uploadGroupCoverImage(supabase, data.id, coverFile);
      if (!uploadResult.ok) {
        toast.error(`모임은 생성됐지만 사진 업로드에 실패했습니다: ${uploadResult.error}`);
      } else {
        await supabase
          .from("groups")
          .update({ cover_image_url: uploadResult.publicUrl })
          .eq("id", data.id);
      }
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
          <div className="grid gap-2">
            <Label htmlFor="cover-image">모임 대표 사진 (선택)</Label>
            {coverPreviewUrl && (
              <div className="relative aspect-[4/3] w-full max-w-xs overflow-hidden rounded-md border">
                <Image
                  src={coverPreviewUrl}
                  alt="모임 대표 사진 미리보기"
                  fill
                  unoptimized
                  className="object-cover"
                />
              </div>
            )}
            <Input
              id="cover-image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "생성 중..." : "모임 만들기"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
