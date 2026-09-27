import { createClient } from "@/lib/supabase/server";
import { PHASE_2_SHOWCASES_ENABLED, isShowcasePlan } from "@/lib/phase2-showcases";
import { checkRateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";

const TYPES = new Map<string, { extension: string; kind: "image" | "document"; max: number }>([
  ["image/jpeg", { extension: "jpg", kind: "image", max: 5 * 1024 * 1024 }],
  ["image/png", { extension: "png", kind: "image", max: 5 * 1024 * 1024 }],
  ["image/webp", { extension: "webp", kind: "image", max: 5 * 1024 * 1024 }],
  ["application/pdf", { extension: "pdf", kind: "document", max: 8 * 1024 * 1024 }],
]);

const clean = (value: FormDataEntryValue | null, max = 180) => typeof value === "string" ? value.trim().slice(0, max) : "";
const safeName = (value: string) => value.replace(/[\r\n]/g, " ").replace(/[^a-zA-Z0-9._() -]/g, "").trim().slice(0, 180) || "showcase-file";
const matchesSignature = (type: string, bytes: Uint8Array) => {
  if (type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png") return [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((value, index) => bytes[index] === value);
  if (type === "image/webp") return new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
  if (type === "application/pdf") return new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-";
  return false;
};

export async function POST(request: Request) {
  if (!PHASE_2_SHOWCASES_ENABLED) return Response.json({ error: "Portfolio Showcases are not enabled in this environment." }, { status: 404 });
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = typeof claims?.claims?.sub === "string" ? claims.claims.sub : null;
  if (!userId) return Response.json({ error: "Sign in to upload Showcase files." }, { status: 401 });
  const limited = await checkRateLimit(userId, "showcase_upload");
  if (limited) return limited;

  const form = await request.formData();
  const file = form.get("file");
  const showcaseId = clean(form.get("showcaseId"), 80);
  if (!(file instanceof File) || !showcaseId) return Response.json({ error: "Choose a file and save the Showcase first." }, { status: 400 });
  const rules = TYPES.get(file.type);
  if (!rules) return Response.json({ error: "Use a JPG, PNG, WebP or PDF file." }, { status: 400 });
  if (!file.size || file.size > rules.max) return Response.json({ error: rules.kind === "image" ? "Keep each image under 5 MB." : "Keep each PDF under 8 MB." }, { status: 400 });
  const signature = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  if (!matchesSignature(file.type, signature)) return Response.json({ error: "The file contents do not match its file type." }, { status: 400 });

  const [{ data: membership }, { data: showcase }] = await Promise.all([
    supabase.from("subscriptions").select("plan,status,period_ends_at").eq("profile_id", userId).maybeSingle(),
    supabase.from("portfolio_showcases").select("id").eq("id", showcaseId).eq("profile_id", userId).maybeSingle(),
  ]);
  if (!isShowcasePlan(membership?.plan, membership?.status, membership?.period_ends_at)) return Response.json({ error: "Showcase uploads require an active Flex or Care plan." }, { status: 403 });
  if (!showcase) return Response.json({ error: "Save this Portfolio Showcase before uploading files." }, { status: 409 });

  const profileLimit = membership?.plan === "care" ? 75 : 25;
  const [profileAssetCount, showcaseAssetCount] = await Promise.all([
    supabase.from("showcase_assets").select("id", { count: "exact", head: true }).eq("profile_id", userId).is("detached_at", null),
    supabase.from("showcase_assets").select("id", { count: "exact", head: true }).eq("profile_id", userId).eq("showcase_id", showcaseId).is("detached_at", null),
  ]);
  if (profileAssetCount.error || showcaseAssetCount.error) return Response.json({ error: "Could not check Showcase storage availability." }, { status: 503 });
  const profileCount = profileAssetCount.count;
  const showcaseCount = showcaseAssetCount.count;
  if ((profileCount ?? 0) >= profileLimit) return Response.json({ error: `Your current plan supports up to ${profileLimit} stored Showcase files.` }, { status: 403 });
  if ((showcaseCount ?? 0) >= 10) return Response.json({ error: "Each Showcase supports up to 10 files." }, { status: 403 });

  const assetId = `asset_${crypto.randomUUID()}`;
  const storagePath = `${userId}/${showcaseId}/${assetId}.${rules.extension}`;
  const { error: uploadError } = await supabase.storage.from("showcase-assets").upload(storagePath, file, { contentType: file.type, cacheControl: "3600", upsert: false });
  if (uploadError) return Response.json({ error: "Could not upload this file right now." }, { status: 503 });

  const originalName = safeName(file.name);
  const { error: assetError } = await supabase.from("showcase_assets").insert({ id: assetId, profile_id: userId, showcase_id: showcaseId, storage_path: storagePath, asset_type: rules.kind, original_name: originalName, content_type: file.type, size_bytes: file.size });
  if (assetError) {
    await supabase.storage.from("showcase-assets").remove([storagePath]);
    return Response.json({ error: "The file uploaded but could not be attached to this Showcase." }, { status: 503 });
  }
  return Response.json({ ok: true, media: { id: assetId, assetId, url: "", alt: "", caption: "", kind: rules.kind, name: originalName } });
}

export async function DELETE(request: Request) {
  if (!PHASE_2_SHOWCASES_ENABLED) return Response.json({ error: "Portfolio Showcases are not enabled in this environment." }, { status: 404 });
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = typeof claims?.claims?.sub === "string" ? claims.claims.sub : null;
  if (!userId) return Response.json({ error: "Sign in to remove Showcase files." }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { assetId?: unknown };
  const assetId = typeof body.assetId === "string" ? body.assetId.trim().slice(0, 100) : "";
  if (!assetId) return Response.json({ error: "Choose a Showcase file to remove." }, { status: 400 });
  const { data: asset } = await supabase.from("showcase_assets").select("id").eq("id", assetId).eq("profile_id", userId).maybeSingle();
  if (!asset) return Response.json({ error: "That Showcase file was not found." }, { status: 404 });
  const { error } = await createAdminClient().from("showcase_assets").update({ detached_at: new Date().toISOString() }).eq("id", assetId).eq("profile_id", userId);
  if (error) return Response.json({ error: "Could not remove the Showcase file right now." }, { status: 503 });
  // The private object is retained because a published snapshot or restorable
  // version may still reference it. A future retention job can remove orphans.
  return Response.json({ ok: true, retainedForPublishedVersions: true });
}
