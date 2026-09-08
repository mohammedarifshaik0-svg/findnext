import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;
  if (!userId) return Response.json({ error: "Sign in to continue." }, { status: 401 });
  const limited = await checkRateLimit(userId, "code_redemption");
  if (limited) return limited;
  const body = await request.json().catch(() => ({})) as { code?: string };
  const code = body.code?.trim();
  if (!code || code.length > 80) return Response.json({ error: "Enter a valid activation code." }, { status: 400 });
  const { data: redemption, error } = await supabase.rpc("redeem_activation_code", { input_code: code });
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ ok: true, redemption });
}
