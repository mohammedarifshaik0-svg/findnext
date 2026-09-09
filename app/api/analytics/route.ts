import { createHash } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase=await createClient(); const {data}=await supabase.auth.getClaims();
  const userId=typeof data?.claims?.sub==="string"?data.claims.sub:null;
  if(!userId) return Response.json({error:"Sign in to view analytics."},{status:401});
  const admin=createAdminClient(); const {data:subscription}=await admin.from("subscriptions").select("plan,status,period_ends_at").eq("profile_id",userId).maybeSingle(); const active=subscription?.status==="active"&&new Date(subscription.period_ends_at??0).getTime()>Date.now(); const detailed=active&&(subscription.plan==="flex"||subscription.plan==="care"); const historyDays=subscription?.plan==="care"?365:90;
  let query=admin.from("portfolio_views").select("viewed_at,visitor_hash,referrer_domain,device_class").eq("profile_id",userId).order("viewed_at"); if(detailed)query=query.gte("viewed_at",new Date(Date.now()-historyDays*86400000).toISOString());
  const {data:rows,error}=await query;
  if(error) return Response.json({error:"Analytics are temporarily unavailable."},{status:503});
  const days=new Map<string,number>(); const visitors=new Set<string>(); const sources=new Map<string,number>(); const devices=new Map<string,number>();
  for(const row of rows??[]){const day=String(row.viewed_at).slice(0,10);days.set(day,(days.get(day)??0)+1);visitors.add(String(row.visitor_hash));const source=row.referrer_domain||"Direct";sources.set(source,(sources.get(source)??0)+1);devices.set(row.device_class,(devices.get(row.device_class)??0)+1);}
  return Response.json({totalViews:rows?.length??0,detailed,historyDays:detailed?historyDays:null,uniqueVisitors:detailed?visitors.size:null,days:detailed?[...days].map(([date,views])=>({date,views})):[],sources:detailed?[...sources].sort((a,b)=>b[1]-a[1]).slice(0,5).map(([source,views])=>({source,views})):[],devices:detailed?[...devices].map(([device,views])=>({device,views})):[]});
}

export async function POST(request:Request){
  const {slug}=await request.json().catch(()=>({})) as {slug?:string}; if(!slug) return Response.json({ok:true});
  const admin=createAdminClient(); const {data:portfolio}=await admin.from("published_portfolios").select("profile_id,is_public").eq("slug",slug).maybeSingle();
  if(!portfolio?.is_public) return Response.json({ok:true});
  const forwarded=request.headers.get("x-forwarded-for")?.split(",")[0]??"unknown"; const ua=request.headers.get("user-agent")??"unknown"; const day=new Date().toISOString().slice(0,10);
  const visitor_hash=createHash("sha256").update(`${portfolio.profile_id}:${day}:${forwarded}:${ua}`).digest("hex");
  let referrer_domain:string|null=null; try{const ref=request.headers.get("referer");if(ref){const host=new URL(ref).hostname;if(host!==request.headers.get("host")&&!host.endsWith("thevxl.com"))referrer_domain=host.slice(0,120);}}catch{}
  const device_class=/ipad|tablet/i.test(ua)?"tablet":/mobile|android|iphone/i.test(ua)?"mobile":/mozilla|chrome|safari|firefox/i.test(ua)?"desktop":"other";
  await admin.from("portfolio_views").insert({profile_id:portfolio.profile_id,visitor_hash,referrer_domain,device_class});
  return Response.json({ok:true});
}
