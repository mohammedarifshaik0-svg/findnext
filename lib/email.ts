type Email = { to: string; subject: string; html: string; text: string };

const safeProviderCode = (value: unknown) =>
  typeof value === "string" ? value.replace(/[^a-zA-Z0-9_.-]/g, "").slice(0, 80) : "unknown";

export async function sendVxlEmail(email: Email, idempotencyKey: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("[vxl-email] configuration_missing", { provider: "resend" });
    return { sent: false as const, reason: "not_configured" as const };
  }

  let response: Response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json", "idempotency-key": idempotencyKey },
      body: JSON.stringify({
        from: process.env.VXL_FROM_EMAIL || process.env.FINDNEXT_FROM_EMAIL || "VXL <hello@thevxl.com>",
        to: [email.to],
        reply_to: process.env.VXL_REPLY_TO_EMAIL || "findnext@ignyxx.in",
        subject: email.subject,
        html: email.html,
        text: email.text,
      }),
    });
  } catch {
    console.error("[vxl-email] request_failed", { provider: "resend" });
    return { sent: false as const, reason: "provider_unreachable" as const };
  }

  if (!response.ok) {
    const providerError = await response.json().catch(() => null) as { name?: unknown; code?: unknown } | null;
    console.error("[vxl-email] provider_rejected", {
      provider: "resend",
      status: response.status,
      code: safeProviderCode(providerError?.name ?? providerError?.code),
    });
    return { sent: false as const, reason: "provider_error" as const, status: response.status };
  }

  const result = await response.json() as { id?: string };
  return { sent: true as const, id: result.id ?? null };
}
