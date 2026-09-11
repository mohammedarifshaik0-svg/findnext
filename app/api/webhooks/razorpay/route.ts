import { after } from "next/server";
import { validRazorpaySignature } from "@/lib/razorpay-signature";
import { reconcilePayment } from "@/lib/payment-reconciliation";
import { processQueuedVxlEmails } from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/admin";
import { razorpayConfig } from "@/lib/razorpay";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return Response.json({error:"Webhook is not configured."},{status:503});
  if (Number(request.headers.get("content-length")) > 262144) return new Response(null,{status:413});
  const raw = await request.text();
  if (Buffer.byteLength(raw) > 262144) return new Response(null,{status:413});
  if (!validRazorpaySignature(raw,request.headers.get("x-razorpay-signature") ?? "",secret)) return new Response(null,{status:401});
  let event;
  try { event=JSON.parse(raw); } catch { return new Response(null,{status:400}); }
  if (!["payment.captured","payment.failed"].includes(event?.event)) return Response.json({received:true,ignored:true});
  const eventId=request.headers.get("x-razorpay-event-id");
  if (!eventId || eventId.length > 255) return new Response(null,{status:400});
  const paymentId=event?.payload?.payment?.entity?.id;
  if (typeof paymentId !== "string" || !/^pay_[A-Za-z0-9]+$/.test(paymentId)) return new Response(null,{status:400});
  const admin=createAdminClient();
  const {mode}=razorpayConfig();
  const {data:existing,error:lookupError}=await admin.from("razorpay_webhook_events").select("status,event_type,payment_id,delivery_count").eq("event_id",eventId).maybeSingle();
  if (lookupError) return Response.json({error:"Webhook audit unavailable. Retry delivery."},{status:503});
  if (existing && (existing.event_type !== event.event || existing.payment_id !== paymentId)) return new Response(null,{status:409});
  if (existing) {
    const delivery=await admin.from("razorpay_webhook_events").update({delivery_count:existing.delivery_count+1,last_received_at:new Date().toISOString()}).eq("event_id",eventId);
    if (delivery.error) return Response.json({error:"Webhook audit unavailable. Retry delivery."},{status:503});
    if (existing.status === "processed") return Response.json({received:true,duplicate:true});
  } else {
    const inserted=await admin.from("razorpay_webhook_events").insert({event_id:eventId,event_type:event.event,payment_id:paymentId,mode});
    if (inserted.error) return Response.json({error:"Webhook audit unavailable. Retry delivery."},{status:503});
  }
  try {
    const result=await reconcilePayment(paymentId);
    if(result.status === "pending") return Response.json({error:"Payment state is pending."},{status:503});
    const audited=await admin.from("razorpay_webhook_events").update({status:"processed",processed_at:new Date().toISOString(),last_error_category:null}).eq("event_id",eventId);
    if (audited.error) return Response.json({error:"Webhook audit unavailable. Retry delivery."},{status:503});
    console.info("[vxl-payments] webhook_processed",{eventId,eventType:event.event,paymentId,duplicate:Boolean(existing)});
    after(async()=>{try {await processQueuedVxlEmails(10);} catch {console.error("[vxl-payments] email_processing_failed");}});
    return Response.json({received:true});
  } catch {
    await admin.from("razorpay_webhook_events").update({status:"failed",last_error_category:"reconciliation_failed"}).eq("event_id",eventId);
    console.error("[vxl-payments] webhook_reconciliation_failed",{event:event.event});
    return Response.json({error:"Reconciliation unavailable. Retry delivery."},{status:503});
  }
}
