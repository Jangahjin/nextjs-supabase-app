import type { Tables } from "@/lib/supabase/database.types";

export type Profile = Tables<"profiles">;
export type Group = Tables<"groups">;
export type GroupMember = Tables<"group_members">;
export type Event = Tables<"events">;
export type EventParticipant = Tables<"event_participants">;
export type Announcement = Tables<"announcements">;
export type Notification = Tables<"notifications">;
export type Settlement = Tables<"settlements">;
export type SettlementItem = Tables<"settlement_items">;
export type CarpoolOffer = Tables<"carpool_offers">;
export type CarpoolRequest = Tables<"carpool_requests">;
export type CarpoolMatch = Tables<"carpool_matches">;
