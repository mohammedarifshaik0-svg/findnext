import "server-only";

export function razorpayConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !secret) throw new Error("payments_not_configured");
  const mode = keyId.startsWith("rzp_test_") ? "test" : keyId.startsWith("rzp_live_") ? "live" : null;
  if (!mode || (mode === "live" && process.env.VERCEL_ENV !== "production")) throw new Error("payment_mode_mismatch");
  return { keyId, secret, mode };
}

export async function razorpayRequest(path: string, body?: object) {
  const { keyId, secret } = razorpayConfig();
  const response = await fetch(`https://api.razorpay.com/v1/${path}`, {
    method: body ? "POST" : "GET",
    headers: { Authorization: `Basic ${Buffer.from(`${keyId}:${secret}`).toString("base64")}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error(`razorpay_http_${response.status}`);
  return response.json();
}
