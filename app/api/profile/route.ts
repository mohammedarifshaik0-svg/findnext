import { createClient } from "@/lib/supabase/server";

type Experience = { id?: string; company?: string; role?: string; location?: string; startDate?: string; endDate?: string; isCurrent?: boolean; description?: string };
type Education = { id?: string; institution?: string; qualification?: string; field?: string; startDate?: string; endDate?: string; grade?: string; description?: string };
type Item = { id?: string; itemType?: string; title?: string; subtitle?: string; description?: string; url?: string; level?: string; issuedAt?: string };
type Payload = { fullName?: string; headline?: string; professionalSummary?: string; email?: string; phone?: string; city?: string; country?: string; pronouns?: string; portfolioSlug?: string; theme?: string; accent?: string; isPublic?: boolean; consentProfileStorage?: boolean; consentTalentDiscovery?: boolean; experiences?: Experience[]; education?: Education[]; items?: Item[] };
const clean = (value: unknown, max = 4000) => typeof value === "string" ? value.trim().slice(0, max) : "";

async function authorized() {
  const supabase = await createClient(); const { data, error } = await supabase.auth.getClaims();
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;
  return { supabase, userId, error };
}

export async function GET() {
  const { supabase, userId } = await authorized(); if (!userId) return Response.json({ error: "Sign in to continue." }, { status: 401 });
  const { data: profile, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!profile) return Response.json({ profile: null, experiences: [], education: [], items: [], resumes: [] });
  const [experiences, education, items, resumes, subscription] = await Promise.all([
    supabase.from("experiences").select("*").eq("profile_id", userId).order("sort_order"),
    supabase.from("education").select("*").eq("profile_id", userId).order("sort_order"),
    supabase.from("profile_items").select("*").eq("profile_id", userId).order("sort_order"),
    supabase.from("resumes").select("id, original_name, content_type, size_bytes, parse_status, created_at").eq("profile_id", userId).order("created_at", { ascending: false }),
    supabase.from("subscriptions").select("plan,status,period_starts_at,period_ends_at").eq("profile_id", userId).maybeSingle(),
  ]);
  const failed = [experiences.error, education.error, items.error, resumes.error, subscription.error].find(Boolean);
  if (failed) return Response.json({ error: failed.message }, { status: 500 });
  return Response.json({ profile, experiences: experiences.data, education: education.data, items: items.data, resumes: resumes.data, subscription: subscription.data });
}

export async function PUT(request: Request) {
  const { supabase, userId } = await authorized(); if (!userId) return Response.json({ error: "Sign in to continue." }, { status: 401 });
  const payload = await request.json() as Payload; if (payload.consentProfileStorage !== true) return Response.json({ error: "Profile storage consent is required." }, { status: 400 });
  const { data: current } = await supabase.from("profiles").select("trial_started_at,trial_ends_at").eq("id", userId).maybeSingle();
  const now = new Date().toISOString(); const startsTrial = payload.isPublic === true && !current?.trial_started_at;
  const trialStartedAt = startsTrial ? now : current?.trial_started_at ?? null; const trialEndsAt = startsTrial ? new Date(Date.now() + 604800000).toISOString() : current?.trial_ends_at ?? null;
  const profile = { id: userId, full_name: clean(payload.fullName, 120), headline: clean(payload.headline, 180), professional_summary: clean(payload.professionalSummary), email: clean(payload.email, 180), phone: clean(payload.phone, 40), city: clean(payload.city, 100), country: clean(payload.country, 100), pronouns: clean(payload.pronouns, 40), portfolio_slug: clean(payload.portfolioSlug, 80), theme: clean(payload.theme, 30) || "studio", accent: clean(payload.accent, 30) || "indigo", is_public: Boolean(payload.isPublic), trial_started_at: trialStartedAt, trial_ends_at: trialEndsAt, consent_profile_storage: true, consent_talent_discovery: Boolean(payload.consentTalentDiscovery), updated_at: now };
  const { error: profileError } = await supabase.from("profiles").upsert(profile);
  if (profileError) return Response.json({ error: profileError.message }, { status: 500 });
  const { error: deleteError } = await supabase.from("experiences").delete().eq("profile_id", userId); if (deleteError) return Response.json({ error: deleteError.message }, { status: 500 });
  await supabase.from("education").delete().eq("profile_id", userId); await supabase.from("profile_items").delete().eq("profile_id", userId);
  const experiences = (payload.experiences ?? []).slice(0, 30).map((row, i) => ({ id: clean(row.id, 80) || crypto.randomUUID(), profile_id: userId, company: clean(row.company, 160), role: clean(row.role, 160), location: clean(row.location, 120), start_date: clean(row.startDate, 20), end_date: clean(row.endDate, 20), is_current: Boolean(row.isCurrent), description: clean(row.description), sort_order: i }));
  const education = (payload.education ?? []).slice(0, 20).map((row, i) => ({ id: clean(row.id, 80) || crypto.randomUUID(), profile_id: userId, institution: clean(row.institution, 180), qualification: clean(row.qualification, 160), field: clean(row.field, 160), start_date: clean(row.startDate, 20), end_date: clean(row.endDate, 20), grade: clean(row.grade, 80), description: clean(row.description), sort_order: i }));
  const allowed = new Set(["skill", "project", "achievement", "certification", "language", "link"]);
  const items = (payload.items ?? []).slice(0, 100).map((row, i) => ({ id: clean(row.id, 80) || crypto.randomUUID(), profile_id: userId, item_type: allowed.has(clean(row.itemType, 30)) ? clean(row.itemType, 30) : "skill", title: clean(row.title, 180), subtitle: clean(row.subtitle, 180), description: clean(row.description), url: clean(row.url, 500), level: clean(row.level, 80), issued_at: clean(row.issuedAt, 20), sort_order: i }));
  const inserts = await Promise.all([experiences.length ? supabase.from("experiences").insert(experiences) : Promise.resolve({ error: null }), education.length ? supabase.from("education").insert(education) : Promise.resolve({ error: null }), items.length ? supabase.from("profile_items").insert(items) : Promise.resolve({ error: null })]);
  const insertError = inserts.find((result) => result.error)?.error; if (insertError) return Response.json({ error: insertError.message }, { status: 500 });
  await supabase.from("profile_revisions").insert({ profile_id: userId, changed_by: userId, change_type: current ? "profile_updated" : "profile_created", snapshot_json: payload });
  const { data: subscription } = await supabase.from("subscriptions").select("id").eq("profile_id", userId).maybeSingle();
  if (!subscription) await supabase.from("subscriptions").insert({ profile_id: userId, plan: "trial", status: "active", period_starts_at: trialStartedAt, period_ends_at: trialEndsAt });
  else if (startsTrial) await supabase.from("subscriptions").update({ period_starts_at: trialStartedAt, period_ends_at: trialEndsAt, status: "active" }).eq("profile_id", userId);
  return Response.json({ ok: true, profileId: userId, savedAt: now });
}
