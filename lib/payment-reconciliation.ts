import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { razorpayConfig, razorpayRequest } from "@/lib/razorpay";
import { purchaseActivatedEmail } from "@/lib/email-templates";

export async function reconcilePayment(paymentId: string, accountId?: string) {
  if (!/^pay_[A-Za-z0-9]+$/.test(paymentId)) throw new Error("invalid_payment_id");
  const { mode } = razorpayConfig();
  // Webhook payloads and browser responses identify a payment, but the authenticated
  // provider API supplies its current state (also handles out-of-order delivery).
  const payment = await razorpayRequest(`payments/${paymentId}`);
  const admin = createAdminClient();
  const { data: purchase, error } = await admin.from("payment_purchases").select("*").eq("razorpay_order_id",payment.order_id).eq("mode",mode).maybeSingle();
  if (error || !purchase || (accountId && purchase.profile_id !== accountId)) throw new Error("purchase_not_found");
  if (payment.id !== paymentId || payment.amount !== purchase.amount_paise || payment.currency !== purchase.currency) throw new Error("payment_mismatch");
  if (payment.status === "failed") {
    const saved = await admin.from("payment_purchases").update({status:"failed"}).eq("id",purchase.id).neq("status","captured");
    if (saved.error) throw new Error("payment_save_failed");
    return { status: purchase.status === "captured" ? "captured" : "failed", test: mode === "test" };
  }
  if (payment.status !== "captured" || payment.captured !== true || payment.amount_refunded > 0) return {status:"pending",test:mode === "test"};
  const email = purchaseActivatedEmail(purchase.plan.toUpperCase(),purchase.id);
  const saved = await admin.rpc("vxl_capture_purchase",{purchase_id:purchase.id,payment_id:payment.id,expected_mode:mode,email_subject:email.subject,email_html:email.html,email_text:email.text});
  if (saved.error) throw new Error("payment_activation_failed");
  return {
    ...saved.data,
    transactionId: purchase.id,
    plan: purchase.plan,
    billingCycle: purchase.billing_cycle,
    amountPaise: purchase.amount_paise,
    currency: purchase.currency,
  };
}
