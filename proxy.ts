import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export async function proxy(request: NextRequest) {
  const isWebhook = request.nextUrl.pathname === "/api/webhooks/razorpay";
  if (request.nextUrl.pathname.startsWith("/api/") && UNSAFE_METHODS.has(request.method) && !isWebhook) {
    const origin = request.headers.get("origin");
    if (!origin || origin !== request.nextUrl.origin) return new Response(null, { status: 403 });
  }
  return updateSession(request);
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"] };
