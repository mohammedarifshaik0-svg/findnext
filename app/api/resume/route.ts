import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient(); const { data } = await supabase.auth.getClaims(); const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;
  if (!userId) return Response.json({ error: "Sign in to continue." }, { status: 401 });
  const form = await request.formData(); const file = form.get("resume"); if (!(file instanceof File)) return Response.json({ error: "Choose a résumé file." }, { status: 400 });
  const types = new Set(["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]); if (!types.has(file.type)) return Response.json({ error: "Upload a PDF or DOCX file." }, { status: 415 });
  if (file.size > 5 * 1024 * 1024) return Response.json({ error: "The maximum file size is 5 MB." }, { status: 413 });
  const id = crypto.randomUUID(); const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-"); const storagePath = `${userId}/${id}/${safeName}`;
  const { error: uploadError } = await supabase.storage.from("resumes").upload(storagePath, file, { contentType: file.type, upsert: false });
  if (uploadError) return Response.json({ error: uploadError.message }, { status: 500 });
  await supabase.from("resumes").update({ is_primary: false }).eq("profile_id", userId);
  const { error } = await supabase.from("resumes").insert({ id, profile_id: userId, storage_path: storagePath, original_name: file.name, content_type: file.type, size_bytes: file.size, parse_status: "review", is_primary: true });
  if (error) { await supabase.storage.from("resumes").remove([storagePath]); return Response.json({ error: error.message }, { status: 500 }); }
  return Response.json({ ok: true, id, name: file.name, size: file.size, status: "review" }, { status: 201 });
}
