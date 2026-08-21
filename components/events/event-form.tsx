"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { CalendarDays } from "lucide-react";

function toDatetimeLocalValue(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function RequiredMark() {
  return (
    <span className="text-destructive" aria-hidden>
      *
    </span>
  );
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

  const cancelHref = isEdit ? `/groups/${groupId}/events/${eventId}` : `/groups/${groupId}/events`;

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
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label htmlFor="title">
                일정 제목 <RequiredMark />
              </Label>
              <Input
                id="title"
                required
                placeholder="예: 8월 정기 모임"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">설명</Label>
              <Textarea
                id="description"
                placeholder="참여자에게 안내할 내용을 적어주세요."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="location">장소</Label>
              <Input
                id="location"
                placeholder="예: 강남역 3번 출구"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-4 border-t border-border pt-4">
            <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              일정 및 인원
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="start-at">
                  시작 일시 <RequiredMark />
                </Label>
                <Input
                  id="start-at"
                  type="datetime-local"
                  required
                  value={startAt}
                  onChange={(e) => setStartAt(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="end-at">종료 일시</Label>
                <Input
                  id="end-at"
                  type="datetime-local"
                  value={endAt}
                  onChange={(e) => setEndAt(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="capacity">정원</Label>
                <Input
                  id="capacity"
                  type="number"
                  min={1}
                  placeholder="제한 없음"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="rsvp-deadline">참석 신청 마감</Label>
                <Input
                  id="rsvp-deadline"
                  type="datetime-local"
                  value={rsvpDeadline}
                  onChange={(e) => setRsvpDeadline(e.target.value)}
                />
              </div>
            </div>
          </div>

          {error && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button asChild variant="outline">
              <Link href={cancelHref}>취소</Link>
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (isEdit ? "저장 중..." : "생성 중...") : isEdit ? "저장" : "일정 만들기"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
