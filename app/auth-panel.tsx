"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

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
    <main className="grid min-h-screen place-items-center bg-[#f4f6fb] px-6">
      <section className="w-full max-w-xl rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_30px_100px_rgba(21,32,64,.12)] sm:p-12">
        <div className="brand-mark">FN</div>
        <p className="mt-8 text-sm font-semibold uppercase tracking-[.18em] text-indigo-600">FindNext</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-.04em] text-slate-950 sm:text-5xl">Your career, made visible.</h1>
        <p className="mt-5 max-w-md text-lg leading-8 text-slate-600">Turn your résumé into a polished portfolio and keep every career detail ready for your next opportunity.</p>

        <Button className="mt-8 h-12 w-full border-slate-300 bg-white text-slate-800 shadow-sm hover:bg-slate-50" variant="outline" onClick={signInWithGoogle} disabled={googleLoading || loading}>
          {googleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleMark />}
          Continue with Google
        </Button>

        <div className="my-6 flex items-center gap-4 text-xs font-semibold uppercase tracking-[.16em] text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />or use email<span className="h-px flex-1 bg-slate-200" />
        </div>

        <div className="space-y-3">
          <Input className="h-12" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" />
          <Input className="h-12" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (minimum 8 characters)" />
          <Button className="h-12 w-full" onClick={submit} disabled={loading || googleLoading || !email || password.length < 8}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "signup" ? "Create my profile" : "Sign in"}
          </Button>
        </div>

        {message && <p className="mt-4 rounded-xl bg-indigo-50 p-3 text-sm text-indigo-800" role="status">{message}</p>}
        <button className="mt-5 text-sm font-semibold text-indigo-600" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setMessage(""); }}>
          {mode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}
        </button>
        <p className="mt-5 text-sm leading-6 text-slate-500">Nothing is published until you review and approve it.</p>
      </section>
    </main>
  );
}
