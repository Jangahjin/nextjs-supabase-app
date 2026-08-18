"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function runCarpoolMatching({
  groupId,
  eventId,
}: {
  groupId: string;
  eventId: string;
}) {
  const supabase = await createClient();

  const { error } = await supabase.rpc("run_carpool_matching", { p_event_id: eventId });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/groups/${groupId}/events/${eventId}/carpool`);
  return { success: true };
}
