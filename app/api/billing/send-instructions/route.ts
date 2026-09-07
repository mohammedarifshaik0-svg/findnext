import { paymentInstructionsEmail } from "@/lib/email-templates";
import { sendFindNextEmail } from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const expected = process.env.FINDNEXT_ADMIN_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!expected || supplied !== expected) return Response.json({ error: "Not authorized." }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { requestId?: string };
  if (!body.requestId) return Response.json({ error: "A request ID is required." }, { status: 400 });
  if (!process.env.FINDNEXT_UPI_ID) return Response.json({ error: "Payment instructions are not configured." }, { status: 503 });

  const admin = createAdminClient();
  const { data: planRequest, error } = await admin.from("plan_requests").select("id,profile_id,email,plan,billing_cycle,amount_paise,status").eq("id", body.requestId).single();
  if (error || !planRequest) return Response.json({ error: "Plan request not found." }, { status: 404 });
  if (!["requested", "instructions_sent"].includes(planRequest.status)) return Response.json({ error: "This request is no longer awaiting payment." }, { status: 400 });
  const { data: profile } = await admin.from("profiles").select("full_name").eq("id", planRequest.profile_id).single();
  const email = paymentInstructionsEmail({ name: profile?.full_name || "there", requestId: planRequest.id, plan: String(planRequest.plan).toUpperCase(), cycle: planRequest.billing_cycle === "annual" ? "annual" : "28 days", amount: `₹${Number(planRequest.amount_paise) / 100}`, upiId: process.env.FINDNEXT_UPI_ID });
  const delivery = await sendFindNextEmail({ to: planRequest.email, ...email }, `payment-instructions-${planRequest.id}`);
  if (delivery.sent) {
    await admin.from("plan_requests").update({ status: "instructions_sent", updated_at: new Date().toISOString() }).eq("id", planRequest.id);
    return Response.json({ ok: true, emailed: true });
  }
  return Response.json({ ok: true, emailed: false, emailDraft: email, mailto: `mailto:${encodeURIComponent(planRequest.email)}?subject=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(email.text)}` });
}
