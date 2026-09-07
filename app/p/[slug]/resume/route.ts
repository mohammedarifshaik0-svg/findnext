import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("id,full_name").eq("portfolio_slug", slug).maybeSingle();
  if (!profile) return new Response(null, { status: 404 });
  const { data: resume } = await supabase.from("resumes").select("storage_path,original_name,content_type").eq("profile_id", profile.id).eq("is_primary", true).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!resume) return new Response("No résumé has been shared.", { status: 404 });
  const { data, error } = await supabase.storage.from("resumes").download(resume.storage_path);
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
