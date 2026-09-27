import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CUSTOM_DOMAINS_ENABLED } from "@/lib/custom-domains";
import { PORTFOLIO_ANALYSIS_ENABLED } from "@/lib/portfolio-analysis";
import { defaultTextFinishForTheme, textFinishesForTheme } from "@/lib/portfolio-style";
import { PHASE_2_SHOWCASES_ENABLED, customSectionLimit, isShowcasePlan, normalizeAdvancedCustomization, normalizeHttpsUrl, showcaseSlug, type AdvancedCustomization, type CustomSection, type PortfolioShowcase, type ShowcaseLinkKind } from "@/lib/phase2-showcases";
import { CARE_SUPPORT_ENABLED, isActiveCarePlan } from "@/lib/care-support";

type Experience = { id?: string; company?: string; role?: string; location?: string; startDate?: string; endDate?: string; isCurrent?: boolean; description?: string };
type Education = { id?: string; institution?: string; qualification?: string; field?: string; startDate?: string; endDate?: string; grade?: string; description?: string };
type Item = { id?: string; itemType?: string; title?: string; subtitle?: string; description?: string; url?: string; level?: string; issuedAt?: string };
type Payload = { fullName?: string; headline?: string; professionalSummary?: string; email?: string; phone?: string; city?: string; country?: string; pronouns?: string; portfolioSlug?: string; theme?: string; accent?: string; textTone?: string; effectIntensity?: number; isPublic?: boolean; consentProfileStorage?: boolean; consentTalentDiscovery?: boolean; experiences?: Experience[]; education?: Education[]; items?: Item[]; showcases?: PortfolioShowcase[]; customSections?: CustomSection[]; advancedCustomization?: AdvancedCustomization };
const clean = (value: unknown, max = 4000) => typeof value === "string" ? value.trim().slice(0, max) : "";
const linkKinds = new Set<ShowcaseLinkKind>(["live", "github", "figma", "drive", "document", "credential", "other"]);
const normalizeShowcases = (rows: PortfolioShowcase[] = []) => rows.slice(0, 30).map((row, index) => ({
  id: clean(row.id, 80) || crypto.randomUUID(),
  source_type: "project" as const,
  source_id: clean(row.sourceId, 80),
  slug: showcaseSlug(row.slug || row.title, `project-${index + 1}`),
  title: clean(row.title, 180),
  summary: clean(row.summary, 1000),
  challenge: clean(row.challenge),
  approach: clean(row.approach),
  outcome: clean(row.outcome),
  links: (Array.isArray(row.links) ? row.links : []).slice(0, 12).flatMap((link) => {
    const url = normalizeHttpsUrl(link.url);
    if (!url) return [];
    return [{ id: clean(link.id, 80) || crypto.randomUUID(), label: clean(link.label, 80) || "View evidence", url, kind: linkKinds.has(link.kind) ? link.kind : "other" }];
  }),
  media: (Array.isArray(row.media) ? row.media : []).slice(0, 10).flatMap((media) => {
    const assetId = clean(media.assetId, 100);
    if (assetId) return [{ id: clean(media.id, 80) || assetId, assetId, url: "", alt: clean(media.alt, 180), caption: clean(media.caption, 300), kind: media.kind === "document" ? "document" as const : "image" as const, name: clean(media.name, 180) }];
    const url = normalizeHttpsUrl(media.url);
    if (!url) return [];
    return [{ id: clean(media.id, 80) || crypto.randomUUID(), assetId: "", url, alt: clean(media.alt, 180), caption: clean(media.caption, 300), kind: "image" as const, name: "" }];
  }),
  is_enabled: Boolean(row.isEnabled),
  sort_order: index,
})).filter((row) => row.source_id && row.title);
const normalizeCustomSections = (rows: CustomSection[] = []) => rows.slice(0, 50).map((section, sectionIndex) => ({
  id: clean(section.id, 80) || crypto.randomUUID(),
  title: clean(section.title, 120),
  description: clean(section.description, 1000),
  layout: (["cards", "list", "timeline"] as const).includes(section.layout) ? section.layout : "cards" as const,
  is_visible: Boolean(section.isVisible),
  sort_order: sectionIndex,
  items: (Array.isArray(section.items) ? section.items : []).slice(0, 20).map((item, itemIndex) => ({
    id: clean(item.id, 80) || crypto.randomUUID(),
    title: clean(item.title, 180), subtitle: clean(item.subtitle, 180), description: clean(item.description),
    url: normalizeHttpsUrl(item.url, 500), date_label: clean(item.dateLabel, 80), sort_order: itemIndex,
  })).filter((item) => item.title),
})).filter((section) => section.title);
const privateJson = (body: unknown, init?: ResponseInit) => Response.json(body, {
  ...init,
  headers: {
    "Cache-Control": "private, no-store, max-age=0, must-revalidate",
    "Pragma": "no-cache",
    "Vary": "Cookie",
    ...init?.headers,
  },
});

async function authorized() {
  const supabase = await createClient(); const { data, error } = await supabase.auth.getClaims();
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;
  return { supabase, userId, error };
}

export async function GET() {
  const { supabase, userId } = await authorized(); if (!userId) return privateJson({ error: "Sign in to continue." }, { status: 401 });
  const { data: profile, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) return privateJson({ error: "Could not load your portfolio right now." }, { status: 503 });
  if (!profile) return privateJson({ accountId: userId, profile: null, experiences: [], education: [], items: [], resumes: [] });
  const [experiences, education, items, resumes, subscription, extraction] = await Promise.all([
    supabase.from("experiences").select("*").eq("profile_id", userId).order("sort_order"),
    supabase.from("education").select("*").eq("profile_id", userId).order("sort_order"),
    supabase.from("profile_items").select("*").eq("profile_id", userId).order("sort_order"),
    supabase.from("resumes").select("id, original_name, content_type, size_bytes, parse_status, created_at").eq("profile_id", userId).order("created_at", { ascending: false }),
    supabase.from("subscriptions").select("plan,status,period_starts_at,period_ends_at").eq("profile_id", userId).maybeSingle(),
    supabase.from("resume_extractions").select("resume_id,status,extracted_json,parse_error,created_at").eq("profile_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const failed = [experiences.error, education.error, items.error, resumes.error, subscription.error, extraction.error].find(Boolean);
  if (failed) return privateJson({ error: "Could not load every portfolio section right now." }, { status: 503 });
  let publishedUpdates: number | null = null;
  if (subscription.data?.status === "active" && subscription.data.period_starts_at && subscription.data.period_ends_at) {
    const start = new Date(subscription.data.period_starts_at).getTime();
    const end = new Date(subscription.data.period_ends_at).getTime();
    const cycleMs = 28 * 86_400_000;
    const cycleStart = new Date(start + Math.max(0, Math.floor((Math.min(Date.now(), end) - start) / cycleMs)) * cycleMs);
    const cycleEnd = new Date(Math.min(end, cycleStart.getTime() + cycleMs));
    const { data: events } = await supabase.from("subscription_usage_events").select("units").eq("profile_id", userId).eq("entitlement", "published_updates").gte("occurred_at", cycleStart.toISOString()).lt("occurred_at", cycleEnd.toISOString());
    publishedUpdates = (events ?? []).reduce((total, event) => total + (Number(event.units) || 0), 0);
  }
  const showcaseAccess = PHASE_2_SHOWCASES_ENABLED && isShowcasePlan(subscription.data?.plan, subscription.data?.status, subscription.data?.period_ends_at);
  let showcases: unknown[] = [];
  let customSections: unknown[] = [];
  if (showcaseAccess) {
    const [showcaseResult, sectionResult, sectionItemResult] = await Promise.all([
      supabase.from("portfolio_showcases").select("*").eq("profile_id", userId).order("sort_order"),
      supabase.from("custom_sections").select("*").eq("profile_id", userId).order("sort_order"),
      supabase.from("custom_section_items").select("*").eq("profile_id", userId).order("sort_order"),
    ]);
    if (showcaseResult.error || sectionResult.error || sectionItemResult.error) return privateJson({ error: "Could not load Phase 2 portfolio content right now." }, { status: 503 });
    showcases = showcaseResult.data ?? [];
    customSections = (sectionResult.data ?? []).map((section) => ({ ...section, items: (sectionItemResult.data ?? []).filter((item) => item.section_id === section.id) }));
  }
  return privateJson({ accountId: userId, profile, experiences: experiences.data, education: education.data, items: items.data, resumes: resumes.data, subscription: subscription.data, publishedUpdates, resumeExtraction: extraction.data, showcases, customSections, phase2: { showcasesEnabled: PHASE_2_SHOWCASES_ENABLED, showcaseAccess, customDomainsEnabled: CUSTOM_DOMAINS_ENABLED, customDomainAccess: CUSTOM_DOMAINS_ENABLED && isShowcasePlan(subscription.data?.plan, subscription.data?.status, subscription.data?.period_ends_at), prioritySupportEnabled: CARE_SUPPORT_ENABLED, prioritySupportAccess: CARE_SUPPORT_ENABLED && isActiveCarePlan(subscription.data?.plan, subscription.data?.status, subscription.data?.period_ends_at), analysisEnabled: PORTFOLIO_ANALYSIS_ENABLED } });
}

export async function PUT(request: Request) {
  const { supabase, userId } = await authorized(); if (!userId) return Response.json({ error: "Sign in to continue." }, { status: 401 });
  const payload = await request.json() as Payload; if (payload.consentProfileStorage !== true) return Response.json({ error: "Profile storage consent is required." }, { status: 400 });
  const { data: current } = await supabase.from("profiles").select("id,is_public,trial_started_at,trial_ends_at").eq("id", userId).maybeSingle();
  const now = new Date().toISOString();
  const effectIntensity = Math.max(0, Math.min(100, Number.isFinite(payload.effectIntensity) ? Math.round(payload.effectIntensity!) : 65));
  const experiences = (payload.experiences ?? []).slice(0, 30).map((row, i) => ({ id: clean(row.id, 80) || crypto.randomUUID(), profile_id: userId, company: clean(row.company, 160), role: clean(row.role, 160), location: clean(row.location, 120), start_date: clean(row.startDate, 20), end_date: clean(row.endDate, 20), is_current: Boolean(row.isCurrent), description: clean(row.description), sort_order: i }));
  const education = (payload.education ?? []).slice(0, 20).map((row, i) => ({ id: clean(row.id, 80) || crypto.randomUUID(), profile_id: userId, institution: clean(row.institution, 180), qualification: clean(row.qualification, 160), field: clean(row.field, 160), start_date: clean(row.startDate, 20), end_date: clean(row.endDate, 20), grade: clean(row.grade, 80), description: clean(row.description), sort_order: i }));
  const allowed = new Set(["skill", "project", "achievement", "certification", "language", "link"]);
  const items = (payload.items ?? []).slice(0, 100).map((row, i) => ({ id: clean(row.id, 80) || crypto.randomUUID(), profile_id: userId, item_type: allowed.has(clean(row.itemType, 30)) ? clean(row.itemType, 30) : "skill", title: clean(row.title, 180), subtitle: clean(row.subtitle, 180), description: clean(row.description), url: clean(row.url, 500), level: clean(row.level, 80), issued_at: clean(row.issuedAt, 20), sort_order: i }));
  let normalizedShowcases: ReturnType<typeof normalizeShowcases> = [];
  let normalizedCustomSections: ReturnType<typeof normalizeCustomSections> = [];
  let normalizedAdvancedCustomization: AdvancedCustomization | undefined;
  if (payload.showcases !== undefined || payload.customSections !== undefined || payload.advancedCustomization !== undefined) {
    if (!PHASE_2_SHOWCASES_ENABLED) return Response.json({ error: "Phase 2 portfolio features are not enabled in this environment." }, { status: 403 });
    const { data: membership } = await supabase.from("subscriptions").select("plan,status,period_ends_at").eq("profile_id", userId).maybeSingle();
    if (!isShowcasePlan(membership?.plan, membership?.status, membership?.period_ends_at)) return Response.json({ error: "Phase 2 portfolio features require an active Flex or Care plan." }, { status: 403 });
    normalizedShowcases = normalizeShowcases(payload.showcases ?? []);
    normalizedCustomSections = normalizeCustomSections(payload.customSections ?? []);
    const projectIds = new Set(items.filter((item) => item.item_type === "project").map((item) => item.id));
    if (normalizedShowcases.some((row) => !projectIds.has(row.source_id))) return Response.json({ error: "Every showcase must belong to one of your saved projects." }, { status: 400 });
    if (new Set(normalizedShowcases.map((row) => row.slug)).size !== normalizedShowcases.length) return Response.json({ error: "Each Portfolio Showcase needs a unique detail-page address." }, { status: 400 });
    const assetReferences = normalizedShowcases.flatMap((showcase) => showcase.media.filter((media) => media.assetId).map((media) => ({ assetId: media.assetId, showcaseId: showcase.id })));
    if (assetReferences.length) {
      const { data: assets, error: assetError } = await supabase.from("showcase_assets").select("id,showcase_id").eq("profile_id", userId).in("id", assetReferences.map((reference) => reference.assetId));
      const assetOwners = new Map((assets ?? []).map((asset) => [asset.id, asset.showcase_id]));
      if (assetError || assetReferences.some((reference) => assetOwners.get(reference.assetId) !== reference.showcaseId)) return Response.json({ error: "One or more Showcase files could not be verified." }, { status: 400 });
    }
    const sectionLimit = customSectionLimit(membership?.plan);
    if (sectionLimit !== null && normalizedCustomSections.length > sectionLimit) return Response.json({ error: `Your ${String(membership?.plan).toUpperCase()} plan includes ${sectionLimit} custom sections.` }, { status: 403 });
    if (payload.advancedCustomization !== undefined) normalizedAdvancedCustomization = normalizeAdvancedCustomization(payload.advancedCustomization);
  }
  const profileTheme = clean(payload.theme, 30) || "studio";
  const requestedTextTone = clean(payload.textTone, 30);
  const textTone = textFinishesForTheme(profileTheme).some((finish) => finish.id === requestedTextTone)
    ? requestedTextTone
    : defaultTextFinishForTheme[profileTheme] ?? "ivory";
  const profile = { id: userId, full_name: clean(payload.fullName, 120), headline: clean(payload.headline, 180), professional_summary: clean(payload.professionalSummary), email: clean(payload.email, 180), phone: clean(payload.phone, 40), city: clean(payload.city, 100), country: clean(payload.country, 100), pronouns: clean(payload.pronouns, 40), portfolio_slug: clean(payload.portfolioSlug, 80), theme: profileTheme, accent: clean(payload.accent, 30) || "champagne", text_tone: textTone, effect_intensity: effectIntensity, is_public: current?.is_public ?? false, trial_started_at: current?.trial_started_at ?? null, trial_ends_at: current?.trial_ends_at ?? null, consent_profile_storage: true, consent_talent_discovery: Boolean(payload.consentTalentDiscovery), updated_at: now, ...(normalizedAdvancedCustomization ? { advanced_customization: normalizedAdvancedCustomization } : {}) };
  // Profile entitlement fields are not client-writable. This authenticated route
  // performs the narrow server-side draft write after binding the row to userId.
  const { error: profileError } = await createAdminClient().from("profiles").upsert(profile);
  if (profileError) {
    console.error("[vxl-profile] profile_upsert_failed", { code: profileError.code, message: profileError.message, details: profileError.details });
    return Response.json({ error: "Could not save your portfolio right now. Please retry; if it continues, contact hello@thevxl.com." }, { status: 503 });
  }
  const { error: deleteError } = await supabase.from("experiences").delete().eq("profile_id", userId); if (deleteError) return Response.json({ error: "Could not save your portfolio sections." }, { status: 503 });
  const [educationDelete, itemsDelete] = await Promise.all([
    supabase.from("education").delete().eq("profile_id", userId),
    supabase.from("profile_items").delete().eq("profile_id", userId),
  ]);
  const relatedDeleteError = educationDelete.error || itemsDelete.error;
  if (relatedDeleteError) return Response.json({ error: "Could not save your portfolio sections." }, { status: 503 });
  const inserts = await Promise.all([experiences.length ? supabase.from("experiences").insert(experiences) : Promise.resolve({ error: null }), education.length ? supabase.from("education").insert(education) : Promise.resolve({ error: null }), items.length ? supabase.from("profile_items").insert(items) : Promise.resolve({ error: null })]);
  const insertError = inserts.find((result) => result.error)?.error; if (insertError) return Response.json({ error: "Could not save your portfolio sections." }, { status: 503 });
  if (payload.showcases !== undefined) {
    const { data: existingShowcases, error: showcaseReadError } = await supabase.from("portfolio_showcases").select("id").eq("profile_id", userId);
    if (showcaseReadError) return Response.json({ error: "Could not save Portfolio Showcases." }, { status: 503 });
    if (normalizedShowcases.length) {
      const { error: showcaseInsertError } = await supabase.from("portfolio_showcases").upsert(normalizedShowcases.map((row) => ({ ...row, profile_id: userId })), { onConflict: "id" });
      if (showcaseInsertError) return Response.json({ error: "Could not save Portfolio Showcases." }, { status: 503 });
      const referencedAssetIds = normalizedShowcases.flatMap((showcase) => showcase.media.map((media) => media.assetId).filter(Boolean));
      if (referencedAssetIds.length) {
        const { error: assetAttachError } = await createAdminClient().from("showcase_assets").update({ detached_at: null }).eq("profile_id", userId).in("id", referencedAssetIds);
        if (assetAttachError) return Response.json({ error: "Could not attach every Showcase file." }, { status: 503 });
      }
    }
    const desiredIds = new Set(normalizedShowcases.map((row) => row.id));
    const staleIds = (existingShowcases ?? []).map((row) => row.id).filter((id) => !desiredIds.has(id));
    if (staleIds.length) {
      const { error: showcaseDeleteError } = await supabase.from("portfolio_showcases").delete().eq("profile_id", userId).in("id", staleIds);
      if (showcaseDeleteError) return Response.json({ error: "Could not remove old Portfolio Showcases." }, { status: 503 });
    }
  }
  if (payload.customSections !== undefined) {
    const { error: sectionDeleteError } = await supabase.from("custom_sections").delete().eq("profile_id", userId);
    if (sectionDeleteError) return Response.json({ error: "Could not save Custom Sections." }, { status: 503 });
    if (normalizedCustomSections.length) {
      const sectionRows = normalizedCustomSections.map((section) => ({ id: section.id, profile_id: userId, title: section.title, description: section.description, layout: section.layout, is_visible: section.is_visible, sort_order: section.sort_order }));
      const { error: sectionInsertError } = await supabase.from("custom_sections").insert(sectionRows);
      if (sectionInsertError) return Response.json({ error: "Could not save Custom Sections." }, { status: 503 });
      const itemRows = normalizedCustomSections.flatMap((section) => section.items.map((item) => ({ ...item, profile_id: userId, section_id: section.id })));
      if (itemRows.length) {
        const { error: sectionItemInsertError } = await supabase.from("custom_section_items").insert(itemRows);
        if (sectionItemInsertError) return Response.json({ error: "Could not save Custom Section entries." }, { status: 503 });
      }
    }
  }
  const { error: revisionError } = await supabase.from("profile_revisions").insert({ profile_id: userId, changed_by: userId, change_type: current ? "profile_updated" : "profile_created", snapshot_json: payload });
  if (revisionError) return Response.json({ error: revisionError.message }, { status: 500 });
  return Response.json({ ok: true, profileId: userId, savedAt: now, isPublic: profile.is_public });
}
