import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LoadingIndicator } from "@/components/ui/loading-indicator";
import { CarpoolMatchList } from "@/components/carpool/carpool-match-list";
import { CarpoolOfferForm } from "@/components/carpool/carpool-offer-form";
import { CarpoolRequestForm } from "@/components/carpool/carpool-request-form";
import { CancelCarpoolOfferButton } from "@/components/carpool/cancel-carpool-offer-button";
import { CancelCarpoolRequestButton } from "@/components/carpool/cancel-carpool-request-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

async function CarpoolSection({
  params,
}: {
  params: Promise<{ groupId: string; eventId: string }>;
}) {
  const { groupId, eventId } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) {
    redirect("/auth/login");
  }
  const selfId = auth.claims.sub;

  const { data: membership } = await supabase
    .from("group_members")
    .select("role, status")
    .eq("group_id", groupId)
    .eq("user_id", selfId)
    .maybeSingle();

  const isAdmin =
    membership?.status === "approved" &&
    (membership.role === "owner" || membership.role === "admin");

  const { data: offers } = await supabase
    .from("carpool_offers")
    .select("id, seats_available")
    .eq("event_id", eventId);

  const { data: requests } = await supabase
    .from("carpool_requests")
    .select("id")
    .eq("event_id", eventId);

  const { data: myOffer } = await supabase
    .from("carpool_offers")
    .select("id, departure_area, seats_available")
    .eq("event_id", eventId)
    .eq("driver_id", selfId)
    .maybeSingle();

  const { data: myRequest } = await supabase
    .from("carpool_requests")
    .select("id, departure_area")
    .eq("event_id", eventId)
    .eq("rider_id", selfId)
    .maybeSingle();

  const { data: rawMatches } = await supabase
    .from("carpool_matches")
    .select(
      `id, status,
       offer:carpool_offers!inner(event_id, departure_area, driver:profiles!carpool_offers_driver_id_fkey(full_name, email)),
       request:carpool_requests!inner(departure_area, rider:profiles!carpool_requests_rider_id_fkey(full_name, email))`
    )
    .eq("offer.event_id", eventId)
    .order("created_at", { ascending: true });

  const matches = (rawMatches ?? [])
    .filter((m) => m.offer !== null && m.request !== null)
    .map((m) => ({
      id: m.id,
      status: m.status,
      driverName: m.offer!.driver?.full_name || m.offer!.driver?.email || "알 수 없음",
      driverArea: m.offer!.departure_area,
      riderName: m.request!.rider?.full_name || m.request!.rider?.email || "알 수 없음",
      riderArea: m.request!.departure_area,
    }));

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>카풀 현황</CardTitle>
          <CardDescription>
            운전자 {offers?.length ?? 0}명 · 탑승 신청 {requests?.length ?? 0}건 · 매칭 완료{" "}
            {matches.length}건
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CarpoolMatchList
            groupId={groupId}
            eventId={eventId}
            isAdmin={isAdmin}
            matches={matches}
          />
        </CardContent>
      </Card>
      <div className="grid gap-6">
        <div className="flex flex-col gap-2">
          <CarpoolOfferForm
            eventId={eventId}
            offerId={myOffer?.id}
            initialDepartureArea={myOffer?.departure_area}
            initialSeatsAvailable={myOffer?.seats_available}
          />
          {myOffer && (
            <div className="flex justify-end">
              <CancelCarpoolOfferButton offerId={myOffer.id} />
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <CarpoolRequestForm
            eventId={eventId}
            requestId={myRequest?.id}
            initialDepartureArea={myRequest?.departure_area}
          />
          {myRequest && (
            <div className="flex justify-end">
              <CancelCarpoolRequestButton requestId={myRequest.id} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CarpoolPage({
  params,
}: {
  params: Promise<{ groupId: string; eventId: string }>;
}) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">카풀</h2>
      <Suspense fallback={<LoadingIndicator />}>
        <CarpoolSection params={params} />
      </Suspense>
    </div>
  );
}
