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
    const payload = JSON.stringify({
      from: process.env.VXL_FROM_EMAIL || process.env.FINDNEXT_FROM_EMAIL || "VXL <findnext@ignyxx.in>",
      to: [email.to], reply_to: process.env.VXL_REPLY_TO_EMAIL || "findnext@ignyxx.in",
      subject: email.subject, html: email.html, text: email.text,
    });
    const send = () => fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json", "idempotency-key": idempotencyKey },
      body: payload,
      signal: AbortSignal.timeout(5000),
    });
    let last: Response | undefined;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        last = await send();
        if (last.status !== 429 && last.status < 500) break;
      } catch {
        last = undefined;
        if (attempt === 2) throw new Error("provider_unreachable");
      }
      if (attempt < 2) {
        const retryAfter = Number(last?.headers.get("retry-after"));
        if (retryAfter > 2) break; // Do not ignore the provider's longer backoff.
        await new Promise(resolve => setTimeout(resolve, Math.max(500 * 2 ** attempt, retryAfter * 1000 || 0)));
      }
    }
    if (!last) throw new Error("provider_unreachable");
    response = last;
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
