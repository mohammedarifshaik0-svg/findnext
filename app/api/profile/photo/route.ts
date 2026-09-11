import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const ALLOWED_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

async function authorized() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;
  return { supabase, userId };
}

export async function POST(request: Request) {
  const { supabase, userId } = await authorized();
  if (!userId) return Response.json({ error: "Sign in to continue." }, { status: 401 });

  const form = await request.formData();
  const file = form.get("photo");
  if (!(file instanceof File)) return Response.json({ error: "Choose a profile photo." }, { status: 400 });
  const extension = ALLOWED_TYPES.get(file.type);
  if (!extension) return Response.json({ error: "Use a JPG, PNG or WebP image." }, { status: 400 });
  if (file.size > 5 * 1024 * 1024) return Response.json({ error: "Keep the photo under 5 MB." }, { status: 400 });

  const path = `${userId}/profile-${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage.from("profile-media").upload(path, file, {
    contentType: file.type,
    cacheControl: "3600",
    upsert: false,
  });
  if (uploadError) return Response.json({ error: uploadError.message }, { status: 500 });

  const { error: profileError } = await createAdminClient().from("profiles").update({ photo_path: path, updated_at: new Date().toISOString() }).eq("id", userId);
  if (profileError) {
    await supabase.storage.from("profile-media").remove([path]);
    return Response.json({ error: profileError.message }, { status: 500 });
  }
  // Keep the previous object because the live portfolio may still reference it
  // until the user publishes this new draft.
  return Response.json({ ok: true, photoPath: path });
}

export async function DELETE() {
  const { userId } = await authorized();
  if (!userId) return Response.json({ error: "Sign in to continue." }, { status: 401 });
  // Keep the object because the last published snapshot may still reference it.
  const { error } = await createAdminClient().from("profiles").update({ photo_path: null, updated_at: new Date().toISOString() }).eq("id", userId);
  if (error) return Response.json({ error: "Could not remove the photo right now." }, { status: 503 });
  return Response.json({ ok: true });
}
