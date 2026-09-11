import { createHmac, timingSafeEqual } from "node:crypto";

// Both Checkout and webhook signatures use Razorpay's documented HMAC-SHA256.
export function validRazorpaySignature(message: string, signature: string, secret: string) {
  if (!secret || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = createHmac("sha256", secret).update(message).digest();
  return timingSafeEqual(expected, Buffer.from(signature, "hex"));
}
