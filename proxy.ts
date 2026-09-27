import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";
import { CUSTOM_DOMAINS_ENABLED, customDomainDestination, isVxlPlatformHost, requestHostname } from "@/lib/custom-domains";

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export async function proxy(request: NextRequest) {
  const isWebhook = request.nextUrl.pathname === "/api/webhooks/razorpay";
  if (request.nextUrl.pathname.startsWith("/api/") && UNSAFE_METHODS.has(request.method) && !isWebhook) {
    const origin = request.headers.get("origin");
    if (!origin || origin !== request.nextUrl.origin) return new Response(null, { status: 403 });
  }
  const hostname = requestHostname(request.headers);
  const canResolveDomain = CUSTOM_DOMAINS_ENABLED
    && (request.method === "GET" || request.method === "HEAD")
    && !isVxlPlatformHost(hostname)
    && !request.nextUrl.pathname.startsWith("/api/")
    && !request.nextUrl.pathname.startsWith("/p/");
  if (canResolveDomain) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (supabaseUrl && publishableKey) {
      try {
        const lookup = new URL("/rest/v1/rpc/vxl_resolve_custom_domain", supabaseUrl);
        const result = await fetch(lookup, {
          method: "POST",
          headers: { apikey: publishableKey, "Content-Type": "application/json" },
          body: JSON.stringify({ requested_domain: hostname }),
          cache: "no-store",
        });
        const rows = result.ok ? await result.json() as Array<{ portfolio_slug?: string }> : [];
        const resolvedSlug = rows[0]?.portfolio_slug ?? "";
        const destination = customDomainDestination(request.nextUrl.pathname, resolvedSlug);
        if (destination) {
          const url = request.nextUrl.clone();
          url.pathname = destination;
          return updateSession(request, (nextRequest) => {
            const headers = new Headers(nextRequest.headers);
            headers.set("x-vxl-custom-domain", hostname);
            return NextResponse.rewrite(url, { request: { headers } });
          });
        }
        if (resolvedSlug) {
          return new Response(request.method === "HEAD" ? null : "Not found", {
            status: 404,
            headers: { "Cache-Control": "private, no-store, max-age=0" },
          });
        }
      } catch {
        // Domain resolution must fail closed to the normal VXL route surface.
      }
    }
  }
  return updateSession(request);
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"] };
