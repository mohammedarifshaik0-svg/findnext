"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Loader2, Sparkles } from "lucide-react";

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
      <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.55h3.24c1.9-1.75 2.98-4.33 2.98-7.42Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.98-.9 6.64-2.35l-3.25-2.55c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.03v2.63A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.39 13.93A6 6 0 0 1 6.08 12c0-.67.11-1.32.31-1.93V7.44H3.03A10 10 0 0 0 2 12c0 1.61.38 3.14 1.03 4.56l3.36-2.63Z" />
      <path fill="#EA4335" d="M12 5.94c1.47 0 2.79.5 3.83 1.5l2.88-2.88A9.65 9.65 0 0 0 12 2a10 10 0 0 0-8.97 5.44l3.36 2.63C7.18 7.7 9.39 5.94 12 5.94Z" />
    </svg>
  );
}

export function AuthPanel() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const referral = new URLSearchParams(window.location.search).get("ref")?.trim().toUpperCase();
    if (referral) window.localStorage.setItem("vxl_referral", referral);
  }, []);

  const signInWithGoogle = async () => {
    setGoogleLoading(true);
    setMessage("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setGoogleLoading(false);
      setMessage(error.message);
    }
  };

  const submit = async () => {
    setLoading(true);
    setMessage("");
    const supabase = createClient();
    const result = mode === "signup"
      ? await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        })
      : await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (result.error) {
      setMessage(result.error.message);
      return;
    }
    if (mode === "signup" && !result.data.session) {
      setMessage("Check your email to confirm your account. The link will bring you back here signed in.");
      return;
    }
    window.location.assign("/");
  };

  return (
    <main className="relative grid min-h-screen overflow-hidden bg-[#f5f5f7] lg:grid-cols-[1.05fr_.95fr]">
      <section className="relative hidden min-h-screen overflow-hidden bg-[#09090b] p-12 text-white lg:flex lg:flex-col lg:justify-between xl:p-16">
        <div className="vxl-grid absolute inset-0 opacity-30" />
        <div className="vxl-glow absolute -left-40 top-20 h-[520px] w-[520px]" />
        <div className="relative flex items-center gap-3"><div className="vxl-mark">X</div><span className="text-xl font-extrabold tracking-[-.04em]">VXL</span></div>
        <div className="relative max-w-xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.06] px-3 py-1.5 text-xs font-semibold text-zinc-300"><Sparkles className="h-3.5 w-3.5 text-[#ff6b6b]" />Résumé to portfolio, beautifully</div>
          <h1 className="mt-7 text-6xl font-bold leading-[.98] tracking-[-.055em] xl:text-7xl">Your résumé,<br/><span className="vxl-gradient-text">reimagined.</span></h1>
          <p className="mt-7 max-w-lg text-lg leading-8 text-zinc-400">VXL turns your experience into a portfolio with depth, personality and a story worth remembering.</p>
          <div className="mt-9 grid gap-3 text-sm text-zinc-300 sm:grid-cols-2">{["All templates included", "Private until you publish", "Edit every imported detail", "No ads. Ever."].map((item)=><div key={item} className="flex items-center gap-2"><span className="grid h-5 w-5 place-items-center rounded-full bg-white/10"><Check className="h-3 w-3 text-emerald-400" /></span>{item}</div>)}</div>
        </div>
        <p className="relative text-xs text-zinc-600">We Excel. We Grow Together.</p>
      </section>
      <section className="grid min-h-screen place-items-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-10 flex items-center gap-3 lg:hidden"><div className="vxl-mark">X</div><span className="text-xl font-extrabold tracking-[-.04em]">VXL</span></div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-[#5f3cfe]">Welcome to your portfolio studio</p>
          <h2 className="mt-3 text-4xl font-bold tracking-[-.045em] text-[#12121d]">Make your next move visible.</h2>
          <p className="mt-3 text-sm leading-6 text-zinc-500">Start free. Your seven-day trial begins only when you publish.</p>

        <Button className="mt-8 h-12 w-full border-zinc-300 bg-white text-zinc-900 shadow-[0_8px_24px_rgba(15,23,42,.06)] hover:bg-zinc-50" variant="outline" onClick={signInWithGoogle} disabled={googleLoading || loading}>
          {googleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleMark />}
          Continue with Google
        </Button>

        <div className="my-6 flex items-center gap-4 text-xs font-semibold uppercase tracking-[.16em] text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />or use email<span className="h-px flex-1 bg-slate-200" />
        </div>

        <div className="space-y-3">
          <Input className="h-12" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" />
          <Input className="h-12" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (minimum 8 characters)" />
          <Button className="h-12 w-full bg-gradient-to-r from-[#18181b] to-[#09090b] shadow-[0_10px_24px_rgba(0,0,0,.18)]" onClick={submit} disabled={loading || googleLoading || !email || password.length < 8}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "signup" ? "Create my profile" : "Sign in"}
          </Button>
        </div>

        {message && <p className="mt-4 rounded-xl border border-violet-100 bg-violet-50 p-3 text-sm text-violet-900" role="status">{message}</p>}
        <button className="mt-5 text-sm font-semibold text-[#5f3cfe]" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setMessage(""); }}>
          {mode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}
        </button>
        <p className="mt-6 border-t border-zinc-200 pt-5 text-sm leading-6 text-zinc-500">Your data is saved securely. Nothing is public until you review and approve it.</p>
        </div>
      </section>
    </main>
  );
}
