import { isAuthorizedAdminRequest } from "@/lib/admin-auth";
import { activationCodeEmail } from "@/lib/email-templates";
import { sendFindNextEmail } from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  if (!(await isAuthorizedAdminRequest(request))) {
    return Response.json({ error: "Not authorized." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    requestId?: string;
    paymentVerified?: boolean;
  };
  if (!body.requestId || body.paymentVerified !== true) {
    return Response.json(
      { error: "A request ID and confirmed payment verification are required." },
      { status: 400 },
    );
  }

  try {
    const admin = createAdminClient();
    const { data: planRequest, error: requestError } = await admin
      .from("plan_requests")
      .select("id,profile_id,email,plan,billing_cycle,amount_paise,status")
      .eq("id", body.requestId)
      .single();

    if (requestError || !planRequest) {
      return Response.json({ error: "Plan request not found." }, { status: 404 });
    }
    if (!["instructions_sent", "payment_review"].includes(planRequest.status)) {
      return Response.json(
        { error: "This request is not ready for payment approval." },
        { status: 409 },
      );
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("full_name")
      .eq("id", planRequest.profile_id)
      .single();

    const { data: code, error: codeError } = await admin.rpc(
      "issue_activation_code",
      { input_request_id: planRequest.id },
    );
    if (codeError || typeof code !== "string") {
      return Response.json(
        { error: codeError?.message || "Could not issue a code." },
        { status: 400 },
      );
    }

    const expiresAt = new Date(Date.now() + 14 * 86400000).toLocaleDateString(
      "en-IN",
      { day: "numeric", month: "long", year: "numeric" },
    );
    const email = activationCodeEmail({
      name: profile?.full_name || "there",
      requestId: planRequest.id,
      plan: String(planRequest.plan).toUpperCase(),
      cycle: planRequest.billing_cycle === "annual" ? "annual" : "28 days",
      amount: `₹${Number(planRequest.amount_paise) / 100}`,
      code,
      expiresAt,
    });

    const delivery = await sendFindNextEmail(
      { to: planRequest.email, ...email },
      `activation-${planRequest.id}`,
    );

    await admin
      .from("activation_codes")
      .update({
        delivery_status: delivery.sent ? "sent" : "failed",
        email_sent_at: delivery.sent ? new Date().toISOString() : null,
      })
      .eq("plan_request_id", planRequest.id);

    if (!delivery.sent) {
      console.error("Activation email failed", {
        requestId: planRequest.id,
        reason: delivery.reason,
      });
      return Response.json(
        {
          error:
            "The code was created but email delivery failed. Copy this recovery code now; it cannot be viewed later.",
          recoveryCode: code,
        },
        { status: 502 },
      );
    }

    return Response.json({ ok: true, emailed: true });
  } catch (error) {
    console.error("Activation issue failed", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return Response.json(
      { error: "Could not issue the activation code." },
      { status: 500 },
    );
  }
}
