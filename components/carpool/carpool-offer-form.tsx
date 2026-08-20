"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export function CarpoolOfferForm({
  eventId,
  offerId,
  initialDepartureArea = "",
  initialSeatsAvailable,
}: {
  eventId: string;
  offerId?: string;
  initialDepartureArea?: string;
  initialSeatsAvailable?: number;
}) {
  const [departureArea, setDepartureArea] = useState(initialDepartureArea);
  const [seatsAvailable, setSeatsAvailable] = useState(initialSeatsAvailable?.toString() ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    const supabase = createClient();

    const payload = {
      departure_area: departureArea,
      seats_available: Number(seatsAvailable),
    };

    if (offerId) {
      const { error } = await supabase.from("carpool_offers").update(payload).eq("id", offerId);

      if (error) {
        setError(error.message);
        setIsLoading(false);
        return;
      }

      toast.success("카풀 제공 정보를 수정했습니다.");
      setIsLoading(false);
      router.refresh();
      return;
    }

    const { error } = await supabase.from("carpool_offers").insert({
      event_id: eventId,
      ...payload,
    });

    if (error) {
      setError(error.message);
      setIsLoading(false);
      return;
    }

    toast.success("카풀 제공을 등록했습니다.");
    setIsLoading(false);
    router.refresh();
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="offer-departure-area">출발 지역</Label>
            <Input
              id="offer-departure-area"
              required
              placeholder="예: 강남역"
              value={departureArea}
              onChange={(e) => setDepartureArea(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="offer-seats">탑승 가능 좌석 수</Label>
            <Input
              id="offer-seats"
              type="number"
              min={1}
              required
              value={seatsAvailable}
              onChange={(e) => setSeatsAvailable(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" disabled={isLoading}>
            {isLoading
              ? offerId
                ? "저장 중..."
                : "등록 중..."
              : offerId
                ? "저장"
                : "운전자로 카풀 제공하기"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
