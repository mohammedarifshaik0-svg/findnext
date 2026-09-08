// Temporary synthetic probe for the protected preview; remove before merge.
import { generateText } from "ai";
export const maxDuration = 60;
export const dynamic = "force-dynamic";
let probe: Promise<unknown> | undefined;
async function run() {
  let stage = "generation";
  try {
    const result = await generateText({ model: "google/gemini-3.8-flash", instructions: "Improve grammar only. Return only the revised text. Do not add facts.", prompt: "I am a student learning software engineering and building small projects.", maxOutputTokens: 900, maxRetries: 0, abortSignal: AbortSignal.timeout(25000) });
    stage = "verification";
    const verification = await generateText({ model: "google/gemini-3.8-flash", instructions: "Return PASS if the candidate preserves the source facts, otherwise FAIL.", prompt: JSON.stringify({source:"I am a student learning software engineering and building small projects.",candidate:result.text}), maxOutputTokens: 20, maxRetries: 0, abortSignal: AbortSignal.timeout(25000) });
    return { generation: { text: result.text, finish: result.finishReason, usage: result.usage }, verification: { text: verification.text, finish: verification.finishReason, usage: verification.usage } };
  } catch (error) {
    const e = error as {name?: string; statusCode?: number; message?: string};
    const message = e.message?.toLowerCase() || "";
    return { stage, name: e.name, status: e.statusCode, keyPresent: Boolean(process.env.AI_GATEWAY_API_KEY), oidcPresent: Boolean(process.env.VERCEL_OIDC_TOKEN), category: message.includes("credit") ? "credits" : message.includes("oidc") ? "oidc" : message.includes("api key") ? "api_key" : message.includes("model") ? "model" : "other" };
  }
}
export async function GET() {
  if (process.env.VERCEL_ENV !== "preview") return new Response(null, {status:404});
  probe ??= run();
  return Response.json(await probe, {headers:{"Cache-Control":"no-store"}});
}
