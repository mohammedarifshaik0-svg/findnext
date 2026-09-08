import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

const limits = {
  plan_request: [6, 3600],
  resume_import: [12, 3600],
  code_redemption: [10, 900],
} as const;

export async function checkRateLimit(accountId: string, action: keyof typeof limits): Promise<Response | null> {
  const [maxAttempts, windowSeconds] = limits[action];
  const { data, error } = await createAdminClient().rpc("vxl_operation_allowed", {
    account_id: accountId, operation: action, max_attempts: maxAttempts, window_seconds: windowSeconds,
  });
  if (error) return Response.json({ error: "Could not check request availability. Please retry shortly." }, { status: 503 });
  if (!data) return Response.json({ error: "Too many attempts. Please wait before trying again. Your plan allowance has not changed." }, { status: 429, headers: { "Retry-After": String(windowSeconds) } });
  return null;
}
