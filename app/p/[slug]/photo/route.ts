import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("photo_path").eq("portfolio_slug", slug).maybeSingle();
  if (!profile?.photo_path) return new Response(null, { status: 404 });
  const { data, error } = await supabase.storage.from("profile-media").download(profile.photo_path);
  if (error || !data) return new Response(null, { status: 404 });
  return new Response(data, {
    headers: {
      "content-type": data.type || "image/jpeg",
      "cache-control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
