import { createClient } from "@/lib/supabase/server";

async function authorized() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return {
    supabase,
    userId: typeof data?.claims?.sub === "string" ? data.claims.sub : null,
  };
}

export async function POST() {
  const { supabase, userId } = await authorized();
  if (!userId) return Response.json({ error: "Sign in to publish." }, { status: 401 });
  const { data, error } = await supabase.rpc("publish_my_portfolio");
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json(data, { status: 200 });
}

export async function DELETE() {
  const { supabase, userId } = await authorized();
  if (!userId) return Response.json({ error: "Sign in to change visibility." }, { status: 401 });
  const { data, error } = await supabase.rpc("unpublish_my_portfolio");
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json(data, { status: 200 });
}
