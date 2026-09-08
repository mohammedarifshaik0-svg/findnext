import { notFound } from "next/navigation";
import { getAdminSession } from "@/lib/admin-auth";
import { AdminBillingDashboard } from "./admin-billing-dashboard";

export const dynamic = "force-dynamic";

export default async function AdminBillingPage() {
  const session = await getAdminSession();
  if (!session.authorized) notFound();

  return <AdminBillingDashboard adminEmail={session.email} />;
}
