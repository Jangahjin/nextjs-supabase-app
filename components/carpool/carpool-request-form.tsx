"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export function CarpoolRequestForm({
  eventId,
  requestId,
  initialDepartureArea = "",
}: {
  eventId: string;
  requestId?: string;
  initialDepartureArea?: string;
}) {
  const [departureArea, setDepartureArea] = useState(initialDepartureArea);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    const supabase = createClient();

    if (requestId) {
      const { error } = await supabase
        .from("carpool_requests")
        .update({ departure_area: departureArea })
        .eq("id", requestId);

      if (error) {
        setError(error.message);
        setIsLoading(false);
        return;
      }

      toast.success("탑승 신청 정보를 수정했습니다.");
      setIsLoading(false);
      router.refresh();
      return;
    }

    const { error } = await supabase.from("carpool_requests").insert({
      event_id: eventId,
      departure_area: departureArea,
    });

    if (error) {
      setError(error.message);
      setIsLoading(false);
      return;
    }

    toast.success("탑승 신청을 등록했습니다.");
    setIsLoading(false);
    router.refresh();
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="request-departure-area">출발 지역</Label>
            <Input
              id="request-departure-area"
              required
              placeholder="예: 강남역"
              value={departureArea}
              onChange={(e) => setDepartureArea(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" disabled={isLoading}>
            {isLoading
              ? requestId
                ? "저장 중..."
                : "등록 중..."
              : requestId
                ? "저장"
                : "탑승자로 신청하기"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
