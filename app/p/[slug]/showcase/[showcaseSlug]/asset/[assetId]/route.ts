import { createAdminClient } from "@/lib/supabase/admin";
import { loadPortfolioAccess } from "@/lib/published-portfolio";
import type { ShowcaseMedia } from "@/lib/phase2-showcases";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string; showcaseSlug: string; assetId: string }> }) {
  const route = await params;
  const portfolio = await loadPortfolioAccess(route.slug);
  if (!portfolio) return new Response("Not found", { status: 404 });
  const showcase = portfolio.data.showcases?.find((row) => row.slug === route.showcaseSlug && row.is_enabled);
  const media = Array.isArray(showcase?.media) ? showcase.media as ShowcaseMedia[] : [];
  if (!showcase || !media.some((item) => item.assetId === route.assetId)) return new Response("Not found", { status: 404 });

  const admin = createAdminClient();
  const { data: asset } = await admin.from("showcase_assets").select("storage_path,content_type,original_name").eq("id", route.assetId).eq("profile_id", portfolio.profileId).eq("showcase_id", showcase.id).maybeSingle();
  if (!asset) return new Response("Not found", { status: 404 });
  const { data: file, error } = await admin.storage.from("showcase-assets").download(asset.storage_path);
  if (error || !file) return new Response("Not found", { status: 404 });
  const disposition = asset.content_type === "application/pdf" ? `attachment; filename="${String(asset.original_name).replace(/["\r\n]/g, "")}"` : "inline";
  return new Response(await file.arrayBuffer(), { headers: { "Content-Type": asset.content_type, "Content-Disposition": disposition, "Cache-Control": "private, no-store, max-age=0", "X-Content-Type-Options": "nosniff" } });
}
