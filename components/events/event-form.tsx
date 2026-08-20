"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

function toDatetimeLocalValue(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EventForm({
  groupId,
  eventId,
  initialTitle = "",
  initialLocation,
  initialDescription,
  initialStartAt,
  initialEndAt,
  initialCapacity,
  initialRsvpDeadline,
}: {
  groupId: string;
  eventId?: string;
  initialTitle?: string;
  initialLocation?: string | null;
  initialDescription?: string | null;
  initialStartAt?: string;
  initialEndAt?: string | null;
  initialCapacity?: number | null;
  initialRsvpDeadline?: string | null;
}) {
  const isEdit = Boolean(eventId);
  const [title, setTitle] = useState(initialTitle);
  const [location, setLocation] = useState(initialLocation ?? "");
  const [description, setDescription] = useState(initialDescription ?? "");
  const [startAt, setStartAt] = useState(
    initialStartAt ? toDatetimeLocalValue(initialStartAt) : ""
  );
  const [endAt, setEndAt] = useState(initialEndAt ? toDatetimeLocalValue(initialEndAt) : "");
  const [capacity, setCapacity] = useState(initialCapacity?.toString() ?? "");
  const [rsvpDeadline, setRsvpDeadline] = useState(
    initialRsvpDeadline ? toDatetimeLocalValue(initialRsvpDeadline) : ""
  );
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    const supabase = createClient();

    const payload = {
      title,
      location: location || null,
      description: description || null,
      start_at: new Date(startAt).toISOString(),
      end_at: endAt ? new Date(endAt).toISOString() : null,
      capacity: capacity ? Number(capacity) : null,
      rsvp_deadline: rsvpDeadline ? new Date(rsvpDeadline).toISOString() : null,
    };

    if (eventId) {
      const { error } = await supabase.from("events").update(payload).eq("id", eventId);

      if (error) {
        setError(error.message);
        setIsLoading(false);
        return;
      }

      toast.success("일정을 수정했습니다.");
      router.push(`/groups/${groupId}/events/${eventId}`);
      router.refresh();
      return;
    }

    const { data, error } = await supabase
      .from("events")
      .insert({ group_id: groupId, ...payload })
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
            {isLoading ? (isEdit ? "저장 중..." : "생성 중...") : isEdit ? "저장" : "일정 만들기"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
