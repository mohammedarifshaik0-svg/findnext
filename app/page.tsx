import { createClient } from "@/lib/supabase/server";
import { ProfileWorkspace } from "./profile-workspace";
import { AuthPanel } from "./auth-panel";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) return <AuthPanel />;
  const id = typeof claims.sub === "string" ? claims.sub : "";
  if (!id) return <AuthPanel />;
  const email = typeof claims.email === "string" ? claims.email : "";
  const name = typeof claims.user_metadata === "object" && claims.user_metadata && "full_name" in claims.user_metadata ? String(claims.user_metadata.full_name) : email.split("@")[0];
  return <ProfileWorkspace account={{ id, name, email }} />;
}
