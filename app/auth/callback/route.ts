import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next");
  const safeNext = next?.startsWith("/") && !next.startsWith("//") ? next : "/";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const destination = new URL(safeNext, url.origin);
      const createdAt = data.user?.created_at ? new Date(data.user.created_at).getTime() : 0;
      destination.searchParams.set("vxl_auth_event", createdAt && Date.now() - createdAt < 5 * 60_000 ? "sign_up" : "login");
      destination.searchParams.set("vxl_auth_method", data.user?.app_metadata.provider === "google" ? "google" : "email");
      return NextResponse.redirect(destination);
    }
  }

  return NextResponse.redirect(new URL("/auth/error", url.origin));
}
