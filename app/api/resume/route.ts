import { createClient } from "@/lib/supabase/server";
import { extractResumeText, parseResumeText } from "@/lib/resume-parser";
import { assertResumeReimportAvailable, recordResumeReimport } from "@/lib/resume-entitlements";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createClient(); const { data } = await supabase.auth.getClaims(); const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;
  if (!userId) return Response.json({ error: "Sign in to continue." }, { status: 401 });
  const { data: existingResume } = await supabase.from("resumes").select("id").eq("profile_id", userId).eq("is_primary", true).maybeSingle();
  if (existingResume) {
    try { await assertResumeReimportAvailable(supabase, userId); }
    catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Your résumé import allowance is not available." }, { status: 403 }); }
  }
  const form = await request.formData(); const file = form.get("resume"); if (!(file instanceof File)) return Response.json({ error: "Choose a résumé file." }, { status: 400 });
  const types = new Set(["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]); if (!types.has(file.type)) return Response.json({ error: "Upload a PDF or DOCX file." }, { status: 415 });
  if (file.size > 5 * 1024 * 1024) return Response.json({ error: "The maximum file size is 5 MB." }, { status: 413 });
  const id = crypto.randomUUID(); const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-"); const storagePath = `${userId}/${id}/${safeName}`;
  const { error: uploadError } = await supabase.storage.from("resumes").upload(storagePath, file, { contentType: file.type, upsert: false });
  if (uploadError) return Response.json({ error: uploadError.message }, { status: 500 });
  await supabase.from("resumes").update({ is_primary: false }).eq("profile_id", userId);
  const { error } = await supabase.from("resumes").insert({ id, profile_id: userId, storage_path: storagePath, original_name: file.name, content_type: file.type, size_bytes: file.size, parse_status: "processing", is_primary: true });
  if (error) { await supabase.storage.from("resumes").remove([storagePath]); return Response.json({ error: error.message }, { status: 500 }); }

  try {
    console.info("resume.parse.started", { resumeId: id, contentType: file.type, sizeBytes: file.size });
    const buffer = Buffer.from(await file.arrayBuffer());
    const extractedText = await extractResumeText(buffer, file.type);
    const parsedData = parseResumeText(extractedText);
    const { error: extractionError } = await supabase.from("resume_extractions").insert({
      resume_id: id,
      profile_id: userId,
      parser_version: "rules-v2",
      status: "complete",
      extracted_text: extractedText.slice(0, 100000),
      extracted_json: parsedData,
    });
    if (extractionError) throw extractionError;
    const { error: statusError } = await supabase.from("resumes").update({ parse_status: "review" }).eq("id", id);
    if (statusError) throw statusError;
    if (existingResume) await recordResumeReimport(supabase, id);
    console.info("resume.parse.completed", { resumeId: id, textLength: extractedText.length, experiences: parsedData.experiences.length, education: parsedData.education.length, items: parsedData.items.length });
    return Response.json({ ok: true, id, name: file.name, size: file.size, status: "review", parsedData }, { status: 201 });
  } catch (parseError) {
    const message = parseError instanceof Error ? parseError.message : "Could not read this résumé.";
    console.error("resume.parse.failed", { resumeId: id, error: message, stack: parseError instanceof Error ? parseError.stack : undefined });
    await supabase.from("resume_extractions").insert({ resume_id: id, profile_id: userId, parser_version: "rules-v2", status: "failed", parse_error: message });
    await supabase.from("resumes").update({ parse_status: "failed" }).eq("id", id);
    return Response.json({ error: "The résumé was stored, but we could not read its text. Try a text-based PDF or DOCX.", id, status: "failed" }, { status: 422 });
  }
}
