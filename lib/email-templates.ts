const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);

const shell = (preview: string, title: string, content: string) => `<!doctype html><html><body style="margin:0;background:#f5f5f7;color:#12121d;font-family:Arial,sans-serif"><div style="display:none;max-height:0;overflow:hidden">${escapeHtml(preview)}</div><div style="max-width:600px;margin:0 auto;padding:36px 18px"><div style="background:linear-gradient(145deg,#12121d,#09090b);border-radius:20px;padding:30px;color:#f8fafc"><div style="font-size:13px;letter-spacing:.18em;color:#b9a8ff;font-weight:800">VXL</div><h1 style="font-size:30px;line-height:1.15;margin:18px 0 0">${escapeHtml(title)}</h1>${content}<p style="margin:28px 0 0;padding-top:20px;border-top:1px solid #27272a;color:#a1a1aa;font-size:13px;line-height:1.6">We Excel. We Grow Together. Your portfolio stays yours—private until you publish, free of ads, and backed by a real person.<br><a style="color:#c4b5fd" href="mailto:findnext@ignyxx.in">findnext@ignyxx.in</a></p></div></div></body></html>`;

type PlanEmailInput = { name: string; requestId: string; plan: string; cycle: string; amount: string; summary?: string; benefits?: readonly string[] };

const benefitText = (benefits?: readonly string[]) => benefits?.length ? `\nIncluded:\n${benefits.map((benefit) => `• ${benefit}`).join("\n")}\n` : "";
const benefitHtml = (benefits?: readonly string[]) => benefits?.length ? `<div style="margin:22px 0;padding:18px;border:1px solid #303b60;border-radius:12px"><div style="font-size:12px;letter-spacing:.12em;color:#a5b4fc;font-weight:700">WHAT'S INCLUDED</div><ul style="margin:12px 0 0;padding-left:20px;color:#e2e8f0;line-height:1.9">${benefits.map((benefit) => `<li>${escapeHtml(benefit)}</li>`).join("")}</ul></div>` : "";

export function planRequestReceivedEmail(input: PlanEmailInput) {
  const summary = input.summary ? `\n${input.summary}\n` : "";
  const text = `Hi ${input.name},\n\nWe received your VXL ${input.plan} request (${input.cycle}) for ${input.amount}.${summary}${benefitText(input.benefits)}\nRequest ID: ${input.requestId}\n\nWe will send the confirmed payment instructions to this email. Never send an OTP, password or card details.\n\nVXL support\nfindnext@ignyxx.in`;
  return {
    subject: `Your VXL ${input.plan} plan request is confirmed`,
    text,
    html: shell(
      `Your VXL ${input.plan} plan request is safely recorded.`,
      `Your ${input.plan} request is in our circle.`,
      `<p style="color:#cbd5e1;line-height:1.75;margin:20px 0 0">Hi ${escapeHtml(input.name)}, we received your <strong>${escapeHtml(input.plan)}</strong> request for <strong>${escapeHtml(input.amount)}</strong> (${escapeHtml(input.cycle)}).</p>${input.summary ? `<p style="color:#cbd5e1;line-height:1.75">${escapeHtml(input.summary)}</p>` : ""}${benefitHtml(input.benefits)}<div style="margin:22px 0;padding:16px;border:1px solid #303b60;border-radius:12px;color:#c7d2fe;font-family:monospace">Request ${escapeHtml(input.requestId)}</div><p style="color:#cbd5e1;line-height:1.75">We will send the confirmed payment instructions to this email. Never share an OTP, password or card details.</p>`
    ),
  };
}

export function paymentInstructionsEmail(input: PlanEmailInput & { upiId: string }) {
  const text = `Hi ${input.name},\n\nHere are the confirmed details for your VXL ${input.plan} plan.\nAmount: ${input.amount}\nBilling: ${input.cycle}\nUPI ID: ${input.upiId}\nRequest ID: ${input.requestId}\n\nPlease put the request ID in the payment note. Reply with the UPI transaction reference after paying. We will verify it independently and email your single-use activation code. Never send an OTP, password or card details.\n\nVXL support\nfindnext@ignyxx.in`;
  return { subject: `Payment instructions for VXL ${input.plan}`, text, html: shell("Your confirmed VXL payment instructions.", "Your plan details are confirmed.", `<p style="color:#cbd5e1;line-height:1.75;margin:20px 0 0">Hi ${escapeHtml(input.name)}, here are the confirmed details for your <strong>${escapeHtml(input.plan)}</strong> plan.</p><div style="margin:22px 0;padding:18px;border:1px solid #303b60;border-radius:12px;color:#e2e8f0;line-height:1.9"><strong>Amount:</strong> ${escapeHtml(input.amount)}<br><strong>Billing:</strong> ${escapeHtml(input.cycle)}<br><strong>UPI ID:</strong> ${escapeHtml(input.upiId)}<br><strong>Request:</strong> ${escapeHtml(input.requestId)}</div><p style="color:#cbd5e1;line-height:1.75">Put the request ID in the payment note, then reply with the UPI transaction reference. We verify every payment independently before issuing a single-use activation code.</p><p style="color:#fda4af;font-size:13px;line-height:1.6">Never share an OTP, password or card details. VXL will never ask for them.</p>`) };
}

export function activationCodeEmail(input: PlanEmailInput & { code: string; expiresAt: string }) {
  const text = `Hi ${input.name},\n\nYour payment for VXL ${input.plan} has been verified.\n\nActivation code: ${input.code}\n\nEnter it in VXL → Plans & referrals. It can be used once, only by your account, and expires ${input.expiresAt}.\nRequest ID: ${input.requestId}\n\nVXL support\nfindnext@ignyxx.in`;
  return { subject: `Your VXL ${input.plan} activation code`, text, html: shell("Your private VXL activation code is ready.", "Payment verified. Your site can stay live.", `<p style="color:#cbd5e1;line-height:1.75;margin:20px 0 0">Hi ${escapeHtml(input.name)}, your <strong>${escapeHtml(input.plan)}</strong> payment has been verified.</p><div style="margin:24px 0;padding:20px;border-radius:14px;background:#151c36;text-align:center"><div style="font-size:12px;letter-spacing:.15em;color:#94a3b8">SINGLE-USE ACTIVATION CODE</div><div style="margin-top:10px;font-family:monospace;font-size:26px;letter-spacing:.08em;color:#f8fafc">${escapeHtml(input.code)}</div></div><p style="color:#cbd5e1;line-height:1.75">Enter it in <strong>VXL → Plans & referrals</strong>. It is bound to your account, works once, and expires ${escapeHtml(input.expiresAt)}.</p><p style="color:#94a3b8;font-size:13px">Request ${escapeHtml(input.requestId)}</p>`) };
}
