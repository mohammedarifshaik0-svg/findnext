import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validRazorpaySignature } from "@/lib/razorpay-signature";
import { razorpayConfig } from "@/lib/razorpay";
import { reconcilePayment } from "@/lib/payment-reconciliation";
import { processQueuedVxlEmails } from "@/lib/email";
import { checkRateLimit } from "@/lib/rate-limit";

export const maxDuration=60;
export async function POST(request:Request) {
  if(request.headers.get("origin") !== new URL(request.url).origin) return new Response(null,{status:403});
  const db=await createClient();
  const {data:{user}}=await db.auth.getUser();
  if(!user) return new Response(null,{status:401});
  const limited=await checkRateLimit(user.id,"payment_verify"); if(limited) return limited;
  const raw=await request.text(); if(raw.length>2048) return new Response(null,{status:413});
  let body; try {body=JSON.parse(raw);} catch {return new Response(null,{status:400});}
  if(!body || typeof body!=="object" || Array.isArray(body) || typeof body.razorpay_order_id!=="string" || typeof body.razorpay_payment_id!=="string" || typeof body.razorpay_signature!=="string") return new Response(null,{status:400});
  try {
    const {mode,secret}=razorpayConfig();
    const {data:purchase}=await createAdminClient().from("payment_purchases").select("razorpay_order_id").eq("profile_id",user.id).eq("mode",mode).eq("razorpay_order_id",body.razorpay_order_id).maybeSingle();
    if(!purchase || !validRazorpaySignature(`${purchase.razorpay_order_id}|${body.razorpay_payment_id}`,body.razorpay_signature,secret)) return Response.json({error:"Payment could not be verified."},{status:400});
    const result=await reconcilePayment(body.razorpay_payment_id,user.id);
    after(async()=>{try {await processQueuedVxlEmails(10);} catch {console.error("[vxl-payments] email_processing_failed");}});
    return Response.json(result);
  } catch {return Response.json({error:"Payment verification is pending. Check your plan before paying again."},{status:503});}
}
