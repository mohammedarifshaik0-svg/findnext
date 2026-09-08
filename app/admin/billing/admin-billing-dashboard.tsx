"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Status =
  | "requested"
  | "instructions_sent"
  | "payment_review"
  | "approved"
  | "declined";

type BillingRequest = {
  id: string;
  profile_id: string;
  email: string;
  full_name: string;
  plan: "live" | "flex" | "care";
  billing_cycle: "28_days" | "annual";
  amount_paise: number;
  status: Status;
  referral_code: string | null;
  created_at: string;
  updated_at: string;
  activation: {
    delivery_status: string | null;
    email_sent_at: string | null;
    redeemed_at: string | null;
    expires_at: string | null;
  } | null;
};

const statusLabels: Record<Status, string> = {
  requested: "New request",
  instructions_sent: "Awaiting payment",
  payment_review: "Payment review",
  approved: "Code issued",
  declined: "Declined",
};

const statusStyles: Record<Status, string> = {
  requested: "bg-amber-50 text-amber-800 ring-amber-200",
  instructions_sent: "bg-blue-50 text-blue-800 ring-blue-200",
  payment_review: "bg-violet-50 text-violet-800 ring-violet-200",
  approved: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  declined: "bg-slate-100 text-slate-600 ring-slate-200",
};

function money(paise: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

function dateTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function AdminBillingDashboard({ adminEmail }: { adminEmail: string }) {
  const [requests, setRequests] = useState<BillingRequest[]>([]);
  const [filter, setFilter] = useState<Status | "all">("all");
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{
    tone: "good" | "bad";
    text: string;
    sticky?: boolean;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/billing", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not load requests.");
      setRequests(payload.requests ?? []);
    } catch (error) {
      setNotice({
        tone: "bad",
        text: error instanceof Error ? error.message : "Could not load requests.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!notice || notice.sticky) return;
    const timeout = window.setTimeout(() => setNotice(null), 6500);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const filtered = useMemo(
    () =>
      filter === "all"
        ? requests
        : requests.filter((request) => request.status === filter),
    [filter, requests],
  );

  const counts = useMemo(
    () => ({
      all: requests.length,
      requested: requests.filter((item) => item.status === "requested").length,
      instructions_sent: requests.filter(
        (item) => item.status === "instructions_sent",
      ).length,
      approved: requests.filter((item) => item.status === "approved").length,
    }),
    [requests],
  );

  async function perform(requestId: string, action: "instructions" | "issue") {
    if (
      action === "issue" &&
      !window.confirm(
        "Confirm that you independently received and verified this exact payment before issuing the code.",
      )
    ) {
      return;
    }

    setWorkingId(requestId);
    try {
      const response = await fetch(
        action === "instructions"
          ? "/api/billing/send-instructions"
          : "/api/billing/issue-code",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            action === "instructions"
              ? { requestId }
              : { requestId, paymentVerified: true },
          ),
        },
      );
      const payload = await response.json();
      if (!response.ok) {
        if (payload.recoveryCode) {
          setNotice({
            tone: "bad",
            text: `Email delivery failed. Copy this secure recovery code now: ${payload.recoveryCode}`,
            sticky: true,
          });
          await load();
          return;
        }
        throw new Error(payload.error || "The action could not be completed.");
      }

      setNotice({
        tone: "good",
        text:
          action === "instructions"
            ? "Payment instructions were emailed automatically."
            : "Payment confirmed. The one-time activation code was emailed.",
      });
      await load();
    } catch (error) {
      setNotice({
        tone: "bad",
        text: error instanceof Error ? error.message : "Something went wrong.",
      });
    } finally {
      setWorkingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f6fb] px-4 py-8 text-slate-950 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="overflow-hidden rounded-[2rem] bg-[radial-gradient(circle_at_80%_0%,rgba(129,140,248,.32),transparent_38%),linear-gradient(135deg,#111827,#312e81)] px-6 py-8 text-white shadow-2xl shadow-indigo-950/15 sm:px-10">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.24em] text-indigo-200">
                FindNext private operations
              </p>
              <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">
                Payments, minus the chaos.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-indigo-100 sm:text-base">
                Send private UPI instructions, verify payment yourself, then issue
                an account-bound single-use code.
              </p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm backdrop-blur">
              Signed in as <span className="font-semibold">{adminEmail}</span>
            </div>
          </div>
        </header>

        <section className="mt-6 grid gap-3 sm:grid-cols-4">
          {[
            ["Total requests", counts.all],
            ["Needs reply", counts.requested],
            ["Awaiting payment", counts.instructions_sent],
            ["Codes issued", counts.approved],
          ].map(([label, value]) => (
            <div
              key={String(label)}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <p className="text-sm font-medium text-slate-500">{label}</p>
              <p className="mt-1 text-3xl font-black tracking-tight">{value}</p>
            </div>
          ))}
        </section>

        <section className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div className="flex flex-wrap gap-2">
              {(["all", "requested", "instructions_sent", "approved"] as const).map(
                (item) => (
                  <button
                    key={item}
                    onClick={() => setFilter(item)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      filter === item
                        ? "bg-slate-950 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {item === "all"
                      ? "All"
                      : item === "instructions_sent"
                        ? "Awaiting payment"
                        : statusLabels[item]}
                  </button>
                ),
              )}
            </div>
            <button
              onClick={() => void load()}
              disabled={loading}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              {loading ? "Refreshing…" : "Refresh"}
            </button>
          </div>

          <div className="mt-6 grid gap-4">
            {loading && requests.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 p-10 text-center text-slate-500">
                Loading secure requests…
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 p-10 text-center text-slate-500">
                No requests in this view.
              </div>
            ) : (
              filtered.map((request) => (
                <article
                  key={request.id}
                  className="rounded-2xl border border-slate-200 p-5 transition hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-950/5"
                >
                  <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-lg font-bold">
                          {request.full_name}
                        </h2>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${statusStyles[request.status]}`}
                        >
                          {statusLabels[request.status]}
                        </span>
                        {request.activation?.redeemed_at && (
                          <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-bold text-teal-800 ring-1 ring-inset ring-teal-200">
                            Redeemed
                          </span>
                        )}
                      </div>
                      <p className="mt-1 break-all text-sm text-slate-600">
                        {request.email}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
                        <span>
                          <strong>{request.plan.toUpperCase()}</strong> ·{" "}
                          {request.billing_cycle === "annual"
                            ? "Annual"
                            : "28 days"}
                        </span>
                        <span className="font-bold text-indigo-700">
                          {money(request.amount_paise)}
                        </span>
                        <span className="text-slate-500">
                          Requested {dateTime(request.created_at)}
                        </span>
                      </div>
                      <p className="mt-3 font-mono text-xs text-slate-400">
                        {request.id}
                      </p>
                      {request.activation && (
                        <p className="mt-2 text-xs text-slate-500">
                          Activation email:{" "}
                          <strong>{request.activation.delivery_status || "pending"}</strong>
                          {request.activation.email_sent_at
                            ? ` · ${dateTime(request.activation.email_sent_at)}`
                            : ""}
                        </p>
                      )}
                    </div>

                    <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                      {request.status === "requested" && (
                        <button
                          onClick={() => void perform(request.id, "instructions")}
                          disabled={workingId === request.id}
                          className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-50"
                        >
                          {workingId === request.id
                            ? "Sending…"
                            : "Send payment instructions"}
                        </button>
                      )}
                      {(request.status === "instructions_sent" ||
                        request.status === "payment_review") && (
                        <button
                          onClick={() => void perform(request.id, "issue")}
                          disabled={workingId === request.id}
                          className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-50"
                        >
                          {workingId === request.id
                            ? "Issuing…"
                            : "Payment verified — issue code"}
                        </button>
                      )}
                      {request.status === "approved" && (
                        <div className="rounded-xl bg-emerald-50 px-5 py-3 text-sm font-bold text-emerald-800">
                          Code securely issued
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <p className="mx-auto mt-5 max-w-3xl text-center text-xs leading-5 text-slate-500">
          Never issue a code from a screenshot alone. Confirm the exact amount and
          reference inside your own payment app first. Readable codes are never stored
          in the database.
        </p>
      </div>

      {notice && (
        <div
          role="status"
          className={`fixed bottom-5 right-5 z-50 max-w-sm rounded-2xl border px-5 py-4 text-sm font-semibold shadow-2xl ${
            notice.tone === "good"
              ? "border-emerald-200 bg-emerald-950 text-emerald-50"
              : "border-rose-200 bg-rose-950 text-rose-50"
          }`}
        >
          <div className="flex items-start gap-3">
            <span className="break-words">{notice.text}</span>
            <button
              onClick={() => setNotice(null)}
              aria-label="Dismiss notification"
              className="shrink-0 rounded-lg border border-white/20 px-2 py-1 text-xs hover:bg-white/10"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
