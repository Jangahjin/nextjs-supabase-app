import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export async function uploadGroupCoverImage(
  supabase: SupabaseClient<Database>,
  groupId: string,
  file: File
): Promise<{ ok: true; publicUrl: string } | { ok: false; error: string }> {
  const path = `${groupId}/cover`;
  const { error: uploadError } = await supabase.storage
    .from("group-covers")
    .upload(path, file, { upsert: true, contentType: file.type, cacheControl: "3600" });

  if (uploadError) {
    return { ok: false, error: uploadError.message };
  }

  const { data } = supabase.storage.from("group-covers").getPublicUrl(path);
  return { ok: true, publicUrl: data.publicUrl };
}
