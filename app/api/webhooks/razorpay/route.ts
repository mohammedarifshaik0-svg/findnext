import { after } from "next/server";
import { validRazorpaySignature } from "@/lib/razorpay-signature";
import { reconcilePayment } from "@/lib/payment-reconciliation";
import { processQueuedVxlEmails } from "@/lib/email";

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
  const paymentId=event?.payload?.payment?.entity?.id;
  if (typeof paymentId !== "string" || !/^pay_[A-Za-z0-9]+$/.test(paymentId)) return new Response(null,{status:400});
  try {
    const result=await reconcilePayment(paymentId);
    if(result.status === "pending") return Response.json({error:"Payment state is pending."},{status:503});
    after(async()=>{try {await processQueuedVxlEmails(10);} catch {console.error("[vxl-payments] email_processing_failed");}});
    return Response.json({received:true});
  } catch {
    console.error("[vxl-payments] webhook_reconciliation_failed",{event:event.event});
    return Response.json({error:"Reconciliation unavailable. Retry delivery."},{status:503});
  }
}
