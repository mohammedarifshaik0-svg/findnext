import { createAdminClient } from "@/lib/supabase/admin";
import { loadPortfolioAccess } from "@/lib/published-portfolio";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const access = await loadPortfolioAccess(slug);
  const resume = access?.resume;
  if (!resume) return new Response("No résumé has been shared.", { status: 404 });
  const { data, error } = await createAdminClient().storage.from("resumes").download(resume.storage_path);
  if (error || !data) return new Response(null, { status: 404 });
  const safeName = resume.original_name.replace(/["\r\n]/g, "");
  return new Response(data, {
    headers: {
      "content-type": resume.content_type || "application/octet-stream",
      "content-disposition": `attachment; filename="${safeName}"`,
      "cache-control": "private, no-store",
    },
  });
}
