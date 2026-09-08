import { isAuthorizedAdminRequest } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await isAuthorizedAdminRequest(request))) {
    return Response.json({ error: "Not authorized." }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    const { data: requests, error } = await admin
      .from("plan_requests")
      .select(
        "id,profile_id,email,plan,billing_cycle,amount_paise,status,referral_code,created_at,updated_at",
      )
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;

    const profileIds = [...new Set((requests ?? []).map((item) => item.profile_id))];
    const requestIds = (requests ?? []).map((item) => item.id);

    const [{ data: profiles, error: profilesError }, { data: codes, error: codesError }] =
      await Promise.all([
        profileIds.length
          ? admin.from("profiles").select("id,full_name").in("id", profileIds)
          : Promise.resolve({ data: [], error: null }),
        requestIds.length
          ? admin
              .from("activation_codes")
              .select(
                "plan_request_id,delivery_status,email_sent_at,redeemed_at,expires_at",
              )
              .in("plan_request_id", requestIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

    if (profilesError) throw profilesError;
    if (codesError) throw codesError;

    const names = new Map((profiles ?? []).map((item) => [item.id, item.full_name]));
    const activation = new Map(
      (codes ?? []).map((item) => [item.plan_request_id, item]),
    );

    return Response.json({
      requests: (requests ?? []).map((item) => ({
        ...item,
        full_name: names.get(item.profile_id) || "VXL member",
        activation: activation.get(item.id) ?? null,
      })),
    });
  } catch (error) {
    console.error("Billing dashboard load failed", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return Response.json(
      { error: "Could not load billing requests." },
      { status: 500 },
    );
  }
}
