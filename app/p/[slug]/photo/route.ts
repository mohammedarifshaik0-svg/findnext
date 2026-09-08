import { createAdminClient } from "@/lib/supabase/admin";
import { loadPortfolioAccess } from "@/lib/published-portfolio";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const access = await loadPortfolioAccess(slug);
  const photoPath = access?.data.profile.photo_path;
  if (!access || typeof photoPath !== "string" || !photoPath) return new Response(null, { status: 404 });
  const { data, error } = await createAdminClient().storage.from("profile-media").download(photoPath);
  if (error || !data) return new Response(null, { status: 404 });
  return new Response(data, {
    headers: {
      "content-type": data.type || "image/jpeg",
      "cache-control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
