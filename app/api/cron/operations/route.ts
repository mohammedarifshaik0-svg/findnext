import { createAdminClient } from "@/lib/supabase/admin";
import { expiryReminderEmail } from "@/lib/email-templates";
import { processQueuedVxlEmails, queueVxlEmail } from "@/lib/email";

export const maxDuration = 60;

const DAY = 86_400_000;
const reminderStage = (days: number, isTrial: boolean) => {
  if (days <= 0 && days > -2) return "expired";
  if (isTrial && days > 0 && days <= 2) return "two-days";
  if (!isTrial && days > 5 && days <= 7) return "seven-days";
  if (!isTrial && days > 0 && days <= 2) return "two-days";
  return null;
};

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "Cron is not configured." }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const admin = createAdminClient();
  const windowStart = new Date(Date.now() - 2 * DAY).toISOString();
  const windowEnd = new Date(Date.now() + 8 * DAY).toISOString();
  const { data: subscriptions, error } = await admin.from("subscriptions")
    .select("id,profile_id,plan,status,period_ends_at")
    .eq("status", "active")
    .not("period_ends_at", "is", null)
    .gte("period_ends_at", windowStart)
    .lte("period_ends_at", windowEnd);
  if (error) return Response.json({ error: "Could not load expiring plans." }, { status: 503 });

  const profileIds = [...new Set((subscriptions ?? []).map(item => item.profile_id))];
  const { data: profiles } = profileIds.length
    ? await admin.from("profiles").select("id,full_name,email").in("id", profileIds)
    : { data: [] as Array<{ id: string; full_name: string; email: string }> };
  const profileMap = new Map((profiles ?? []).map(profile => [profile.id, profile]));
  let remindersQueued = 0;

  for (const subscription of subscriptions ?? []) {
    const profile = profileMap.get(subscription.profile_id);
    if (!profile?.email || !subscription.period_ends_at) continue;
    const daysRemaining = Math.ceil((new Date(subscription.period_ends_at).getTime() - Date.now()) / DAY);
    const isTrial = subscription.plan === "trial";
    const stage = reminderStage(daysRemaining, isTrial);
    if (!stage) continue;
    const endsAt = new Date(subscription.period_ends_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });
    const email = expiryReminderEmail({
      name: profile.full_name || "there", plan: String(subscription.plan).toUpperCase(), endsAt,
      daysRemaining: Math.max(0, daysRemaining), isTrial,
    });
    const key = `expiry-${subscription.id}-${new Date(subscription.period_ends_at).toISOString()}-${stage}`;
    if (await queueVxlEmail({ to: profile.email, ...email }, key)) remindersQueued++;
  }

  const deliveries = await processQueuedVxlEmails(20);
  return Response.json({ ok: true, remindersQueued, deliveries });
}
