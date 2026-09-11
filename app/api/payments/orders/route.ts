import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PLAN_PRICES, type PaidPlan, type BillingCycle } from "@/lib/plans";
import { razorpayConfig, razorpayRequest } from "@/lib/razorpay";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request:Request) {
  if(request.headers.get("origin") !== new URL(request.url).origin) return new Response(null,{status:403});
  const db=await createClient();
  const {data:{user}}=await db.auth.getUser();
  if(!user) return new Response(null,{status:401});
  const limited=await checkRateLimit(user.id,"payment_order"); if(limited) return limited;
  const raw=await request.text(); if(raw.length>2048) return new Response(null,{status:413});
  let body; try {body=JSON.parse(raw);} catch {return new Response(null,{status:400});}
  if(!["live","flex","care"].includes(body?.plan) || !["28_days","annual"].includes(body?.billingCycle) || typeof body?.purchaseId!=="string" || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(body.purchaseId)) return Response.json({error:"Choose a valid plan and billing period."},{status:400});
  try {
    const {mode,keyId}=razorpayConfig();
    // Live sales stay closed until webhook setup and final commercial launch approval.
    if(mode === "live" && process.env.RAZORPAY_CHECKOUT_ENABLED !== "true") return Response.json({error:"Online checkout is being prepared. Please contact payments@thevxl.com."},{status:503});
    const admin=createAdminClient();
    const plan=body.plan as PaidPlan; const cycle=body.billingCycle as BillingCycle;
    const amount=PLAN_PRICES[plan][cycle]*100;
    const previous=await admin.from("payment_purchases").select("*").eq("id",body.purchaseId).eq("profile_id",user.id).maybeSingle();
    if(previous.error) throw new Error("purchase_read_failed");
    if(previous.data) {
      const p=previous.data;
      if(p.mode!==mode || p.plan!==plan || p.billing_cycle!==cycle) return new Response(null,{status:409});
      if(p.razorpay_order_id && p.status!=="captured") return Response.json({keyId,orderId:p.razorpay_order_id,amount:p.amount_paise,currency:p.currency,purchaseId:p.id,test:mode==="test"});
      return Response.json({error:"This purchase is already being processed. Check your plan before retrying."},{status:409});
    }
    const inserted=await admin.from("payment_purchases").insert({id:body.purchaseId,profile_id:user.id,mode,plan,billing_cycle:cycle,amount_paise:amount});
    if(inserted.error) return Response.json({error:"Purchase already started. Please check its status."},{status:409});
    const order=await razorpayRequest("orders",{amount,currency:"INR",receipt:body.purchaseId,notes:{vxl_purchase_id:body.purchaseId,vxl_user_id:user.id,vxl_plan:plan,vxl_billing_cycle:cycle}});
    if(typeof order.id!=="string" || !/^order_[A-Za-z0-9]+$/.test(order.id) || order.amount!==amount || order.currency!=="INR") throw new Error("order_mismatch");
    const saved=await admin.from("payment_purchases").update({razorpay_order_id:order.id,status:"created"}).eq("id",body.purchaseId);
    if(saved.error) throw new Error("order_save_failed");
    return Response.json({keyId,orderId:order.id,amount,currency:"INR",purchaseId:body.purchaseId,test:mode==="test"});
  } catch {
    console.error("[vxl-payments] order_creation_failed");
    return Response.json({error:"Checkout is temporarily unavailable. No payment was initiated. Please try later."},{status:503});
  }
}
