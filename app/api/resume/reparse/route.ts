import { createClient } from "@/lib/supabase/server";
import { extractResumeText, parseResumeText } from "@/lib/resume-parser";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = typeof claims?.claims?.sub === "string" ? claims.claims.sub : null;
  if (!userId) return Response.json({ error: "Sign in to continue." }, { status: 401 });

  const body = await request.json().catch(() => ({})) as { resumeId?: string };
  if (!body.resumeId) return Response.json({ error: "Choose a saved résumé." }, { status: 400 });

  const { data: resume, error: resumeError } = await supabase
    .from("resumes")
    .select("id, storage_path, original_name, content_type, size_bytes")
    .eq("id", body.resumeId)
    .eq("profile_id", userId)
    .maybeSingle();
  if (resumeError) return Response.json({ error: resumeError.message }, { status: 500 });
  if (!resume) return Response.json({ error: "That résumé was not found." }, { status: 404 });

  const { data: file, error: downloadError } = await supabase.storage.from("resumes").download(resume.storage_path);
  if (downloadError || !file) return Response.json({ error: downloadError?.message || "Could not load the saved résumé." }, { status: 500 });

  await supabase.from("resumes").update({ parse_status: "processing" }).eq("id", resume.id);
  try {
    console.info("resume.reparse.started", { resumeId: resume.id, contentType: resume.content_type, sizeBytes: resume.size_bytes });
    const buffer = Buffer.from(await file.arrayBuffer());
    const extractedText = await extractResumeText(buffer, resume.content_type);
    const parsedData = parseResumeText(extractedText);
    const { error: extractionError } = await supabase.from("resume_extractions").insert({
      resume_id: resume.id,
      profile_id: userId,
      parser_version: "rules-v1",
      status: "complete",
      extracted_text: extractedText.slice(0, 100000),
      extracted_json: parsedData,
    });
    if (extractionError) throw extractionError;
    const { error: statusError } = await supabase.from("resumes").update({ parse_status: "review" }).eq("id", resume.id);
    if (statusError) throw statusError;
    console.info("resume.reparse.completed", { resumeId: resume.id, textLength: extractedText.length, experiences: parsedData.experiences.length, education: parsedData.education.length, items: parsedData.items.length });
    return Response.json({ ok: true, id: resume.id, name: resume.original_name, size: resume.size_bytes, status: "review", parsedData });
  } catch (parseError) {
    const message = parseError instanceof Error ? parseError.message : "Could not read this résumé.";
    console.error("resume.reparse.failed", { resumeId: resume.id, error: message, stack: parseError instanceof Error ? parseError.stack : undefined });
    await supabase.from("resume_extractions").insert({ resume_id: resume.id, profile_id: userId, parser_version: "rules-v1", status: "failed", parse_error: message });
    await supabase.from("resumes").update({ parse_status: "failed" }).eq("id", resume.id);
    return Response.json({ error: "The résumé is still stored, but its text could not be read. Try a text-based PDF or DOCX.", status: "failed" }, { status: 422 });
  }
}
