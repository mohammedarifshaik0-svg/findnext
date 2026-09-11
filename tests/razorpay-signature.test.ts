import assert from "node:assert/strict";
import { test } from "node:test";
import { createHmac } from "node:crypto";
import { validRazorpaySignature } from "../lib/razorpay-signature.ts";

test("Razorpay signatures reject tampered payloads, wrong secrets and malformed hex",()=>{
  const raw='{"event":"payment.captured","amount":9900}';
  const secret="synthetic-test-secret";
  const signature=createHmac("sha256",secret).update(raw).digest("hex");
  assert.equal(validRazorpaySignature(raw,signature,secret),true);
  assert.equal(validRazorpaySignature(raw.replace("9900","100"),signature,secret),false);
  assert.equal(validRazorpaySignature(raw,signature,"wrong"),false);
  for(const invalid of ["", "x".repeat(64), signature.slice(1), signature+"00"]) assert.equal(validRazorpaySignature(raw,invalid,secret),false);
  assert.equal(validRazorpaySignature(JSON.stringify(JSON.parse(raw),null,2),signature,secret),false);
});
test("Checkout signature binds the server order and payment together",()=>{
  const secret="synthetic-test-secret";
  const signature=createHmac("sha256",secret).update("order_server|pay_verified").digest("hex");
  assert.equal(validRazorpaySignature("order_server|pay_verified",signature,secret),true);
  assert.equal(validRazorpaySignature("order_other|pay_verified",signature,secret),false);
});
