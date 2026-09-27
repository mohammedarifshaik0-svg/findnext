import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { CUSTOM_DOMAINS_ENABLED, normalizeCustomDomain } from "@/lib/custom-domains";
import { isShowcasePlan } from "@/lib/phase2-showcases";
import { checkRateLimit } from "@/lib/rate-limit";
import { addVercelProjectDomain, getVercelProjectDomain, inspectVercelDomain, removeVercelProjectDomain, safeDomainState, verifyVercelProjectDomain } from "@/lib/vercel-domains";

type DomainRow = {
  id: string;
  domain: string;
  portfolio_slug: string;
  status: "pending" | "verification_required" | "active" | "error";
  vercel_verified: boolean;
  dns_configured: boolean;
  verification: unknown[];
  dns_records: unknown[];
  last_error: string | null;
  last_checked_at: string | null;
  created_at: string;
};

const privateJson = (body: unknown, init?: ResponseInit) => Response.json(body, {
  ...init,
  headers: { "Cache-Control": "private, no-store, max-age=0, must-revalidate", "Pragma": "no-cache", "Vary": "Cookie", ...init?.headers },
});

async function context() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;
  if (!userId) return { supabase, admin: null, userId: null, membership: null, access: false };
  const { data: membership } = await supabase.from("subscriptions").select("plan,status,period_ends_at").eq("profile_id", userId).maybeSingle();
  return { supabase, admin: createAdminClient(), userId, membership, access: CUSTOM_DOMAINS_ENABLED && isShowcasePlan(membership?.plan, membership?.status, membership?.period_ends_at) };
}

const publicRow = (row: DomainRow | null) => row ? {
  id: row.id,
  domain: row.domain,
  portfolioSlug: row.portfolio_slug,
  status: row.status,
  vercelVerified: row.vercel_verified,
  dnsConfigured: row.dns_configured,
  verification: row.verification,
  dnsRecords: row.dns_records,
  lastError: row.last_error,
  lastCheckedAt: row.last_checked_at,
  createdAt: row.created_at,
} : null;

export async function GET() {
  const { admin, userId, membership, access } = await context();
  if (!userId || !admin) return privateJson({ error: "Sign in to manage a custom domain." }, { status: 401 });
  if (!CUSTOM_DOMAINS_ENABLED || !access) return privateJson({ featureEnabled: CUSTOM_DOMAINS_ENABLED, access: false, plan: membership?.plan ?? "free", domain: null });
  const { data, error } = await admin.from("custom_domains").select("*").eq("profile_id", userId).maybeSingle();
  if (error) return privateJson({ error: "Custom-domain settings are temporarily unavailable." }, { status: 503 });
  return privateJson({ featureEnabled: true, access: true, plan: membership?.plan, domain: publicRow(data as DomainRow | null) });
}

export async function POST(request: Request) {
  const { supabase, admin, userId, membership, access } = await context();
  if (!userId || !admin) return privateJson({ error: "Sign in to manage a custom domain." }, { status: 401 });
  if (!CUSTOM_DOMAINS_ENABLED) return privateJson({ error: "Custom domains are not enabled in this environment." }, { status: 404 });
  if (!access) return privateJson({ error: "Custom domains require an active Flex or Care plan." }, { status: 403 });
  const limited = await checkRateLimit(userId, "custom_domain_change");
  if (limited) return limited;

  const body = await request.json().catch(() => ({})) as { action?: unknown; domain?: unknown };
  const action = body.action === "refresh" ? "refresh" : body.action === "connect" ? "connect" : null;
  if (!action) return privateJson({ error: "Choose a valid domain action." }, { status: 400 });
  const { data: existing } = await admin.from("custom_domains").select("*").eq("profile_id", userId).maybeSingle();
  const domain = action === "refresh" ? normalizeCustomDomain(existing?.domain) : normalizeCustomDomain(body.domain);
  if (!domain) return privateJson({ error: "Enter a valid domain such as portfolio.example.com." }, { status: 400 });
  if (action === "connect" && existing && existing.domain !== domain) return privateJson({ error: "Remove your existing domain before connecting another one." }, { status: 409 });
  if (action === "connect" && !existing) {
    const { data: claimed } = await admin.from("custom_domains").select("id").eq("domain", domain).maybeSingle();
    if (claimed) return privateJson({ error: "That domain is already connected to another VXL portfolio." }, { status: 409 });
  }

  try {
    let projectDomain = action === "connect" && !existing ? await addVercelProjectDomain(domain) : await getVercelProjectDomain(domain);
    if (!projectDomain) return privateJson({ error: "That domain is not connected to the VXL project." }, { status: 404 });
    if (!projectDomain.verified) {
      try { projectDomain = await verifyVercelProjectDomain(domain); } catch { /* DNS or ownership challenge is still pending. */ }
    }
    const config = await inspectVercelDomain(domain);
    const state = safeDomainState(domain, projectDomain, config);
    const { data: profile } = await supabase.from("profiles").select("portfolio_slug").eq("id", userId).single();
    if (!profile?.portfolio_slug) return privateJson({ error: "Save your VXL portfolio address before connecting a domain." }, { status: 400 });
    const now = new Date().toISOString();
    const { data, error } = await admin.from("custom_domains").upsert({
      profile_id: userId,
      domain,
      portfolio_slug: profile.portfolio_slug,
      status: state.status,
      vercel_verified: state.vercelVerified,
      dns_configured: state.dnsConfigured,
      verification: state.verification,
      dns_records: state.dnsRecords,
      last_error: null,
      last_checked_at: now,
      updated_at: now,
    }, { onConflict: "profile_id" }).select("*").single();
    if (error) return privateJson({ error: "The domain was checked, but VXL could not save its status." }, { status: 503 });
    return privateJson({ ok: true, plan: membership?.plan, domain: publicRow(data as DomainRow) });
  } catch (error) {
    console.error("[vxl-domains] domain_action_failed", { action, domain, name: error instanceof Error ? error.name : "unknown" });
    return privateJson({ error: error instanceof Error && error.message === "custom_domain_service_unconfigured" ? "Custom-domain infrastructure is not configured in this environment." : "VXL could not connect to the domain provider right now. Please retry shortly." }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  const { admin, userId, access } = await context();
  if (!userId || !admin) return privateJson({ error: "Sign in to remove a custom domain." }, { status: 401 });
  if (!CUSTOM_DOMAINS_ENABLED) return privateJson({ error: "Custom domains are not enabled in this environment." }, { status: 404 });
  if (!access) return privateJson({ error: "An active Flex or Care plan is required to change this domain." }, { status: 403 });
  const limited = await checkRateLimit(userId, "custom_domain_change");
  if (limited) return limited;
  const body = await request.json().catch(() => ({})) as { domain?: unknown };
  const confirmedDomain = normalizeCustomDomain(body.domain);
  const { data: existing } = await admin.from("custom_domains").select("domain").eq("profile_id", userId).maybeSingle();
  if (!existing || !confirmedDomain || existing.domain !== confirmedDomain) return privateJson({ error: "Confirm the connected domain before removing it." }, { status: 400 });
  try {
    await removeVercelProjectDomain(existing.domain);
    const { error } = await admin.from("custom_domains").delete().eq("profile_id", userId).eq("domain", existing.domain);
    if (error) return privateJson({ error: "The domain was disconnected, but its VXL record could not be cleared." }, { status: 503 });
    return privateJson({ ok: true });
  } catch (error) {
    console.error("[vxl-domains] domain_remove_failed", { domain: existing.domain, name: error instanceof Error ? error.name : "unknown" });
    return privateJson({ error: "The domain could not be disconnected right now." }, { status: 503 });
  }
}
