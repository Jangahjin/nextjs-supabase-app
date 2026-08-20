import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LoadingIndicator } from "@/components/ui/loading-indicator";
import { EventForm } from "@/components/events/event-form";

async function NewEventGuard({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) {
    redirect("/auth/login");
  }

  const { data: membership } = await supabase
    .from("group_members")
    .select("role, status")
    .eq("group_id", groupId)
    .eq("user_id", auth.claims.sub)
    .maybeSingle();

  const isAdmin =
    membership?.status === "approved" &&
    (membership.role === "owner" || membership.role === "admin");

  if (!isAdmin) {
    redirect(`/groups/${groupId}/events`);
  }

  return <EventForm groupId={groupId} />;
}

export default function NewEventPage({ params }: { params: Promise<{ groupId: string }> }) {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
      <h1 className="text-2xl font-bold">새 일정 만들기</h1>
      <Suspense fallback={<LoadingIndicator />}>
        <NewEventGuard params={params} />
      </Suspense>
    </div>
  );
}
