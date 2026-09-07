type Email = { to: string; subject: string; html: string; text: string };

export async function sendFindNextEmail(email: Email, idempotencyKey: string) {
  if (!process.env.RESEND_API_KEY) return { sent: false as const, reason: "not_configured" as const };
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, "content-type": "application/json", "idempotency-key": idempotencyKey },
    body: JSON.stringify({ from: process.env.FINDNEXT_FROM_EMAIL || "FindNext <findnext@ignyxx.in>", to: [email.to], reply_to: "findnext@ignyxx.in", subject: email.subject, html: email.html, text: email.text }),
  });
  if (!response.ok) return { sent: false as const, reason: "provider_error" as const };
  const result = await response.json() as { id?: string };
  return { sent: true as const, id: result.id ?? null };
}
