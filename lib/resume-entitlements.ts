import type { SupabaseClient } from "@supabase/supabase-js";

const limits = { live: 1, flex: 5, care: 10 } as const;

export async function assertResumeReimportAvailable(supabase: SupabaseClient, userId: string) {
  const { data: subscription } = await supabase.from("subscriptions").select("plan,status,period_starts_at,period_ends_at").eq("profile_id", userId).maybeSingle();
  if (!subscription || subscription.status !== "active" || !subscription.period_ends_at || new Date(subscription.period_ends_at).getTime() <= Date.now() || !(subscription.plan in limits)) {
    throw new Error("Another résumé import requires an active VXL plan. Your existing profile and résumé are still safe.");
  }
  const start = new Date(subscription.period_starts_at).getTime();
  const cycleMs = 28 * 86_400_000;
  const cycleStart = new Date(start + Math.max(0, Math.floor((Date.now() - start) / cycleMs)) * cycleMs).toISOString();
  const { data: events } = await supabase.from("subscription_usage_events").select("units").eq("profile_id", userId).eq("entitlement", "resume_reimports").gte("occurred_at", cycleStart);
  const used = (events ?? []).reduce((total: number, event: { units: number }) => total + Number(event.units), 0);
  if (used >= limits[subscription.plan as keyof typeof limits]) throw new Error("You have used all résumé re-imports for this 28-day cycle. Your saved profile is safe; upgrade or wait for the reset date.");
}

export async function recordResumeReimport(supabase: SupabaseClient, resumeId: string) {
  const { error } = await supabase.rpc("consume_my_entitlement", { input_entitlement: "resume_reimports", input_metadata: { resumeId } });
  if (error) throw new Error(error.message);
}
