import { isAuthorizedAdminRequest } from "@/lib/admin-auth";
import { paymentInstructionsEmail } from "@/lib/email-templates";
import { sendVxlEmail } from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  if (!(await isAuthorizedAdminRequest(request))) {
    return Response.json({ error: "Not authorized." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    requestId?: string;
  };
  if (!body.requestId) {
    return Response.json({ error: "A request ID is required." }, { status: 400 });
  }
  if (!process.env.FINDNEXT_UPI_ID) {
    return Response.json(
      { error: "Payment instructions are not configured." },
      { status: 503 },
    );
  }

  try {
    const admin = createAdminClient();
    const { data: planRequest, error } = await admin
      .from("plan_requests")
      .select("id,profile_id,email,plan,billing_cycle,amount_paise,status")
      .eq("id", body.requestId)
      .single();

    if (error || !planRequest) {
      return Response.json({ error: "Plan request not found." }, { status: 404 });
    }
    if (planRequest.status !== "requested") {
      return Response.json(
        { error: "Payment instructions were already handled for this request." },
        { status: 409 },
      );
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("full_name")
      .eq("id", planRequest.profile_id)
      .single();

    const email = paymentInstructionsEmail({
      name: profile?.full_name || "there",
      requestId: planRequest.id,
      plan: String(planRequest.plan).toUpperCase(),
      cycle: planRequest.billing_cycle === "annual" ? "annual" : "28 days",
      amount: `₹${Number(planRequest.amount_paise) / 100}`,
      upiId: process.env.FINDNEXT_UPI_ID,
    });

    const delivery = await sendVxlEmail(
      { to: planRequest.email, ...email },
      `payment-instructions-${planRequest.id}`,
    );

    if (!delivery.sent) {
      console.error("Payment instruction email failed", {
        requestId: planRequest.id,
        reason: delivery.reason,
      });
      return Response.json(
        { error: "Email delivery failed. Nothing was marked as sent; try again." },
        { status: 502 },
      );
    }

    const { error: updateError } = await admin
      .from("plan_requests")
      .update({
        status: "instructions_sent",
        updated_at: new Date().toISOString(),
      })
      .eq("id", planRequest.id)
      .eq("status", "requested");

    if (updateError) throw updateError;
    return Response.json({ ok: true, emailed: true });
  } catch (error) {
    console.error("Payment instructions failed", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return Response.json(
      { error: "Could not send payment instructions." },
      { status: 500 },
    );
  }
}
