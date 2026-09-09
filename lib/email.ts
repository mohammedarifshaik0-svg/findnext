import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

type Email = { to: string; subject: string; html: string; text: string };

type SendOptions = { queueOnFailure?: boolean; attempts?: number };

const safeProviderCode = (value: unknown) =>
  typeof value === "string" ? value.replace(/[^a-zA-Z0-9_.-]/g, "").slice(0, 80) : "unknown";

export async function queueVxlEmail(email: Email, idempotencyKey: string, errorCode: string | null = null) {
  const { error } = await createAdminClient().from("email_delivery_jobs").upsert({
    dedupe_key: idempotencyKey,
    email_to: email.to,
    subject: email.subject,
    html_body: email.html,
    text_body: email.text,
    status: "queued",
    next_attempt_at: new Date().toISOString(),
    last_error_code: errorCode,
  }, { onConflict: "dedupe_key", ignoreDuplicates: true });
  if (error) {
    console.error("[vxl-email] queue_failed", { code: safeProviderCode(error.code) });
    return false;
  }
  return true;
}

export async function sendVxlEmail(email: Email, idempotencyKey: string, options: SendOptions = {}) {
  const queueOnFailure = options.queueOnFailure !== false;
  const maxAttempts = Math.max(1, Math.min(3, options.attempts ?? 3));
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("[vxl-email] configuration_missing", { provider: "resend" });
    const queued = queueOnFailure && await queueVxlEmail(email, idempotencyKey, "not_configured");
    return { sent: false as const, queued, reason: "not_configured" as const };
  }

  let response: Response;
  try {
    const payload = JSON.stringify({
      from: process.env.VXL_FROM_EMAIL || process.env.FINDNEXT_FROM_EMAIL || "VXL <hello@thevxl.com>",
      to: [email.to], reply_to: process.env.VXL_REPLY_TO_EMAIL || "hello@thevxl.com",
      subject: email.subject, html: email.html, text: email.text,
    });
    const send = () => fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json", "idempotency-key": idempotencyKey },
      body: payload,
      signal: AbortSignal.timeout(5000),
    });
    let last: Response | undefined;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        last = await send();
        if (last.status !== 429 && last.status < 500) break;
      } catch {
        last = undefined;
        if (attempt === maxAttempts - 1) throw new Error("provider_unreachable");
      }
      if (attempt < maxAttempts - 1) {
        const retryAfter = Number(last?.headers.get("retry-after"));
        if (retryAfter > 2) break; // Do not ignore the provider's longer backoff.
        await new Promise(resolve => setTimeout(resolve, Math.max(500 * 2 ** attempt, retryAfter * 1000 || 0)));
      }
    }
    if (!last) throw new Error("provider_unreachable");
    response = last;
  } catch {
    console.error("[vxl-email] request_failed", { provider: "resend" });
    const queued = queueOnFailure && await queueVxlEmail(email, idempotencyKey, "provider_unreachable");
    return { sent: false as const, queued, reason: "provider_unreachable" as const };
  }

  if (!response.ok) {
    const providerError = await response.json().catch(() => null) as { name?: unknown; code?: unknown } | null;
    console.error("[vxl-email] provider_rejected", {
      provider: "resend",
      status: response.status,
      code: safeProviderCode(providerError?.name ?? providerError?.code),
    });
    const retryable = response.status === 429 || response.status >= 500;
    const queued = retryable && queueOnFailure && await queueVxlEmail(email, idempotencyKey, `provider_${response.status}`);
    return { sent: false as const, queued, reason: "provider_error" as const, status: response.status };
  }

  const result = await response.json() as { id?: string };
  return { sent: true as const, id: result.id ?? null };
}

export async function processQueuedVxlEmails(limit = 40) {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  await admin.from("email_delivery_jobs").update({
    status: "failed", next_attempt_at: now, last_error_code: "stale_processing", updated_at: now,
  }).eq("status", "processing").lt("updated_at", new Date(Date.now() - 15 * 60_000).toISOString());
  const { data: jobs, error } = await admin.from("email_delivery_jobs")
    .select("id,dedupe_key,email_to,subject,html_body,text_body,attempts,max_attempts")
    .in("status", ["queued", "failed"])
    .lte("next_attempt_at", now)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw new Error("email_queue_unavailable");

  let sent = 0;
  let failed = 0;
  for (const job of jobs ?? []) {
    const claim = await admin.from("email_delivery_jobs").update({ status: "processing", updated_at: now })
      .eq("id", job.id).in("status", ["queued", "failed"]).select("id").maybeSingle();
    if (!claim.data) continue;

    const result = await sendVxlEmail({
      to: job.email_to, subject: job.subject, html: job.html_body, text: job.text_body,
    }, job.dedupe_key, { queueOnFailure: false, attempts: 1 });
    const attempts = job.attempts + 1;
    if (result.sent) {
      sent++;
      await admin.from("email_delivery_jobs").update({
        status: "sent", attempts, provider_message_id: result.id, sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(), last_error_code: null,
      }).eq("id", job.id);
    } else {
      failed++;
      const exhausted = attempts >= job.max_attempts;
      const delayHours = Math.min(24, 2 ** Math.max(0, attempts - 1));
      await admin.from("email_delivery_jobs").update({
        status: "failed", attempts,
        next_attempt_at: exhausted ? "9999-12-31T00:00:00.000Z" : new Date(Date.now() + delayHours * 3600000).toISOString(),
        updated_at: new Date().toISOString(), last_error_code: safeProviderCode(result.reason),
      }).eq("id", job.id);
    }
  }
  return { checked: jobs?.length ?? 0, sent, failed };
}
