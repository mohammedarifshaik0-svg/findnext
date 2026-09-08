import "server-only";

import { timingSafeEqual } from "crypto";
import { createClient } from "@/lib/supabase/server";

function allowedAdminEmails() {
  return new Set(
    (process.env.FINDNEXT_ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

function secretsMatch(supplied: string, expected: string) {
  const suppliedBuffer = Buffer.from(supplied);
  const expectedBuffer = Buffer.from(expected);
  return (
    suppliedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(suppliedBuffer, expectedBuffer)
  );
}

export async function getAdminSession() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const email =
    typeof data?.claims?.email === "string"
      ? data.claims.email.trim().toLowerCase()
      : "";

  return {
    email,
    authorized: Boolean(email) && allowedAdminEmails().has(email),
  };
}

export async function isAuthorizedAdminRequest(request: Request) {
  const expected = process.env.FINDNEXT_ADMIN_SECRET;
  const supplied =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";

  if (expected && supplied && secretsMatch(supplied, expected)) return true;
  return (await getAdminSession()).authorized;
}
