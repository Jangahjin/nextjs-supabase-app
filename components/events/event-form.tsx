"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export function EventForm({ groupId }: { groupId: string }) {
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [capacity, setCapacity] = useState("");
  const [rsvpDeadline, setRsvpDeadline] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    const supabase = createClient();

    const { data, error } = await supabase
      .from("events")
      .insert({
        group_id: groupId,
        title,
        location: location || null,
        description: description || null,
        start_at: new Date(startAt).toISOString(),
        end_at: endAt ? new Date(endAt).toISOString() : null,
        capacity: capacity ? Number(capacity) : null,
        rsvp_deadline: rsvpDeadline ? new Date(rsvpDeadline).toISOString() : null,
      })
      .select("id")
      .single();

    if (error) {
      setError(error.message);
      setIsLoading(false);
      return;
    }

    toast.success("일정이 생성되었습니다.");
    router.push(`/groups/${groupId}/events/${data.id}`);
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="title">일정 제목</Label>
            <Input id="title" required value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="start-at">시작 일시</Label>
            <Input
              id="start-at"
              type="datetime-local"
              required
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="end-at">종료 일시 (선택)</Label>
            <Input
              id="end-at"
              type="datetime-local"
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="location">장소</Label>
            <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">설명</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="capacity">정원 (선택)</Label>
            <Input
              id="capacity"
              type="number"
              min={1}
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="rsvp-deadline">참석 신청 마감 (선택)</Label>
            <Input
              id="rsvp-deadline"
              type="datetime-local"
              value={rsvpDeadline}
              onChange={(e) => setRsvpDeadline(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "생성 중..." : "일정 만들기"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
