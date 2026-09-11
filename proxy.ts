import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);\n\nexport async function proxy(request: NextRequest) {\n  const isWebhook = request.nextUrl.pathname === "/api/webhooks/razorpay";\n  if (request.nextUrl.pathname.startsWith("/api/") && UNSAFE_METHODS.has(request.method) && !isWebhook) {\n    const origin = request.headers.get("origin");\n    if (!origin || origin !== request.nextUrl.origin) return new Response(null, { status: 403 });\n  }\n  return updateSession(request);\n}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"] };
