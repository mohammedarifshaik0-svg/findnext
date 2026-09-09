"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowRight, BarChart3, Check, ChevronRight, FileText, Globe2,
  LayoutTemplate, Loader2, Moon, ShieldCheck, Sun, WandSparkles, X,
} from "lucide-react";

function VxlLogo({ compact = false }: { compact?: boolean }) {
  return <span className="vxl-logo" aria-label="VXL"><span className="vxl-logo-mark">X</span>{compact ? null : <span className="vxl-wordmark">VXL</span>}</span>;
}

function GoogleMark() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.55h3.24c1.9-1.75 2.98-4.33 2.98-7.42Z"/><path fill="#34A853" d="M12 22c2.7 0 4.98-.9 6.64-2.35l-3.25-2.55c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.03v2.63A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.39 13.93A6 6 0 0 1 6.08 12c0-.67.11-1.32.31-1.93V7.44H3.03A10 10 0 0 0 2 12c0 1.61.38 3.14 1.03 4.56l3.36-2.63Z"/><path fill="#EA4335" d="M12 5.94c1.47 0 2.79.5 3.83 1.5l2.88-2.88A9.65 9.65 0 0 0 12 2a10 10 0 0 0-8.97 5.44l3.36 2.63C7.18 7.7 9.39 5.94 12 5.94Z"/></svg>;
}

const templateCards = [
  { name: "Editorial", type: "Story-led", className: "template-editorial" },
  { name: "Prism", type: "Expressive", className: "template-prism" },
  { name: "Zen", type: "Precise", className: "template-zen" },
];
const featureCards = [
  { icon: FileText, number: "01", title: "Resume intelligence", copy: "Upload a PDF or DOCX. VXL extracts the details and gives you a structured draft to review." },
  { icon: LayoutTemplate, number: "02", title: "Every design included", copy: "No template paywall. Choose a world, tune its palette, type and atmosphere, then make it yours." },
  { icon: WandSparkles, number: "03", title: "A living career story", copy: "Edit whenever your career moves, preview every decision and publish only when it feels right." },
  { icon: Globe2, number: "04", title: "Ready to be shared", copy: "A fast, responsive portfolio with contact and résumé download built into the experience." },
  { icon: ShieldCheck, number: "05", title: "Private by default", copy: "Your information stays private until you explicitly review and publish it." },
  { icon: BarChart3, number: "06", title: "Know what connects", copy: "Understand how people discover and experience your portfolio as VXL grows with you." },
];
const plans = [
  { name: "Live", price: "₹99", note: "For a finished story that changes occasionally.", features: ["1 portfolio live", "2 published changes", "1 résumé re-import"] },
  { name: "Flex", price: "₹199", note: "For active careers that keep moving.", featured: true, features: ["Unlimited publishing", "5 résumé re-imports", "Custom domain"] },
  { name: "Care", price: "₹499", note: "For a premium result with a human beside you.", features: ["Everything in Flex", "10 résumé re-imports", "1 managed update"] },
];

export function AuthPanel() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [authOpen, setAuthOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    if (typeof window === "undefined") return "dark";
    return window.localStorage.getItem("vxl_ui_theme") === "dark" ? "dark" : "light";
  });

  useEffect(() => {
    const referral = new URLSearchParams(window.location.search).get("ref")?.trim().toUpperCase();
    if (referral) window.localStorage.setItem("vxl_referral", referral);
  }, []);

  const changeTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    window.localStorage.setItem("vxl_ui_theme", next);
  };
  const openAuth = (nextMode: "signin" | "signup") => { setMode(nextMode); setMessage(""); setAuthOpen(true); };
  const signInWithGoogle = async () => {
    setGoogleLoading(true); setMessage("");
    const { error } = await createClient().auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/auth/callback` } });
    if (error) { setGoogleLoading(false); setMessage(error.message); }
  };
  const submit = async () => {
    setLoading(true); setMessage("");
    const supabase = createClient();
    const result = mode === "signup"
      ? await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/auth/callback` } })
      : await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (result.error) return setMessage(result.error.message);
    if (mode === "signup" && !result.data.session) return setMessage("Check your email to confirm your account. The link will bring you back here signed in.");
    window.location.assign("/");
  };

  return <main className={`vxl-site ${theme === "dark" ? "is-dark" : "is-light"}`}>
    <nav className="vxl-public-nav">
      <a href="#top" className="shrink-0"><VxlLogo /></a>
      <div className="hidden items-center gap-8 text-sm md:flex"><a href="#process">Process</a><a href="#templates">Templates</a><a href="#features">Features</a><a href="#pricing">Pricing</a></div>
      <div className="flex items-center gap-2">
        <button className="vxl-icon-button" onClick={changeTheme} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}>{theme === "dark" ? <Sun/> : <Moon/>}</button>
        <button className="vxl-nav-signin hidden sm:block" onClick={() => openAuth("signin")}>Sign in</button>
        <button className="vxl-chrome-button" onClick={() => openAuth("signup")}>Start building <ArrowRight/></button>
      </div>
    </nav>

    <section id="top" className="vxl-hero">
      <div className="vxl-orbit vxl-orbit-one"/><div className="vxl-orbit vxl-orbit-two"/>
      <div className="vxl-hero-copy">
        <div className="vxl-eyebrow"><span className="vxl-status-dot"/> Your story deserves more than a document</div>
        <h1>Your résumé,<br/><span>Reimagined.</span></h1>
        <p>VXL turns the experience you already earned into a considered digital presence—structured, expressive and unmistakably yours.</p>
        <div className="vxl-hero-actions"><button className="vxl-chrome-button large" onClick={() => openAuth("signup")}>Build yours free <ArrowRight/></button><a href="#templates" className="vxl-quiet-button">Explore templates <ChevronRight/></a></div>
        <div className="vxl-hero-proof"><span><Check/> All templates included</span><span><Check/> Private until publish</span><span><Check/> No ads, ever</span></div>
      </div>
      <div className="vxl-product-window" aria-label="VXL portfolio editor preview">
        <div className="vxl-window-bar"><span className="vxl-window-dots"><i/><i/><i/></span><span>thevxl.com/your-name</span><span className="vxl-live-pill">Live preview</span></div>
        <div className="vxl-window-body"><div className="vxl-mock-sidebar"><VxlLogo compact/>{["Profile","Experience","Projects","Style"].map((item,index)=><span key={item} className={index===0?"active":""}><i/>{item}</span>)}</div><div className="vxl-mock-canvas"><small>PORTFOLIO / 2026</small><h3>Make your<br/>work visible.</h3><p>Strategy, systems and the details that turn ideas into outcomes.</p><div className="vxl-mock-grid"><i/><i/></div></div></div>
      </div>
    </section>

    <section id="process" className="vxl-section vxl-process">
      <div className="vxl-section-heading"><span>THE PROCESS</span><h2>From file to presence.</h2><p>Three deliberate steps. You stay in control at every one.</p></div>
      <div className="vxl-process-grid">{[
        ["01","Import","Drop in your résumé. We organise the people, places, work and proof inside it."],
        ["02","Direct","Review every detail, choose a visual world and adjust the expression live."],
        ["03","Publish","Approve the final story, claim your link and begin your seven-day trial."],
      ].map(([number,title,copy])=><article key={number}><span>{number}</span><div className="vxl-process-visual"><i/><i/><i/></div><h3>{title}</h3><p>{copy}</p></article>)}</div>
    </section>

    <section id="templates" className="vxl-section vxl-template-section">
      <div className="vxl-section-heading"><span>DESIGN WITHOUT A PAYWALL</span><h2>Templates that feel authored.</h2><p>Every visual world is included. Colour, type and intensity make it personal.</p></div>
      <div className="vxl-template-grid">{templateCards.map((template,index)=><article key={template.name} className={template.className}><div className="vxl-template-browser"><div><i/><i/><i/></div><main><small>{String(index+1).padStart(2,"0")} / SELECTED WORK</small><b>{index===0?"A record of meaningful change.":index===1?"Ideas in motion.":"Clarity over noise."}</b><span/><span/></main></div><footer><div><h3>{template.name}</h3><p>{template.type}</p></div><span>Included</span></footer></article>)}</div>
      <button className="vxl-quiet-button centered" onClick={() => openAuth("signup")}>See them with your story <ArrowRight/></button>
    </section>

    <section id="features" className="vxl-section">
      <div className="vxl-section-heading"><span>BUILT AROUND YOU</span><h2>Everything needed. Nothing noisy.</h2></div>
      <div className="vxl-feature-grid">{featureCards.map(({icon:Icon,number,title,copy})=><article key={number}><div><span>{number}</span><Icon/></div><h3>{title}</h3><p>{copy}</p></article>)}</div>
    </section>

    <section className="vxl-section vxl-transformation">
      <div className="vxl-section-heading"><span>THE TRANSFORMATION</span><h2>A résumé contains facts.<br/>A portfolio creates meaning.</h2></div>
      <div className="vxl-transform-grid">
        <article className="vxl-paper"><span>BEFORE / STATIC</span><h3>Alex Rivera</h3><p>Product Designer</p><hr/><small>EXPERIENCE</small><b>Senior Product Designer</b><p>Led cross-functional product design initiatives and improved customer outcomes.</p><small>EDUCATION</small><b>Design & Technology</b></article>
        <div className="vxl-transform-mark"><ArrowRight/></div>
        <article className="vxl-story-card"><span>AFTER / VXL</span><small>PRODUCT DESIGNER · LONDON</small><h3>Designing systems<br/>people trust.</h3><p>I turn complex journeys into calm, useful experiences—connecting research, product thinking and craft.</p><div><i/><i/></div></article>
      </div>
    </section>

    <section id="pricing" className="vxl-section vxl-pricing-section">
      <div className="vxl-section-heading"><span>SIMPLE, TRANSPARENT PLANS</span><h2>Start light. Grow when you need.</h2><p>All prices are for 28 days. Your seven-day trial starts only when you publish.</p></div>
      <div className="vxl-pricing-grid">{plans.map(plan=><article key={plan.name} className={plan.featured?"featured":""}>{plan.featured&&<div className="vxl-popular">MOST FLEXIBLE</div>}<span>{plan.name}</span><h3>{plan.price}<small>/28 days</small></h3><p>{plan.note}</p><ul>{plan.features.map(feature=><li key={feature}><Check/>{feature}</li>)}</ul><button className={plan.featured?"vxl-chrome-button":"vxl-quiet-button"} onClick={() => openAuth("signup")}>Choose {plan.name}<ArrowRight/></button></article>)}</div>
      <p className="vxl-pricing-note">Every plan includes every template, palette, typeface and effect. We charge for keeping your presence live—not for good taste.</p>
      <p className="vxl-compliance-note">By purchasing a VXL plan, you agree to our <Link href="/terms">Terms &amp; Conditions</Link> and <Link href="/refund-policy">Refund &amp; Cancellation Policy</Link>.</p>
    </section>

    <section className="vxl-final-cta"><span>YOUR NEXT MOVE, VISIBLE</span><h2>Ready to excel?</h2><p>Bring the résumé. VXL will help you turn it into something people remember.</p><button className="vxl-chrome-button large" onClick={() => openAuth("signup")}>Create your portfolio <ArrowRight/></button></section>
    <footer className="vxl-footer"><VxlLogo/><p>We Excel. We Grow Together.</p><div className="vxl-footer-links"><span>Legal</span><Link href="/terms">Terms &amp; Conditions</Link><Link href="/privacy">Privacy Policy</Link><Link href="/refund-policy">Refund &amp; Cancellation Policy</Link><Link href="/contact">Contact Us</Link></div><small>© 2026 VXL. All rights reserved.</small></footer>

    {authOpen&&<div className="vxl-auth-overlay" role="dialog" aria-modal="true" aria-labelledby="auth-title" onMouseDown={event=>{if(event.target===event.currentTarget)setAuthOpen(false)}}>
      <section className="vxl-auth-card"><button className="vxl-auth-close" onClick={()=>setAuthOpen(false)} aria-label="Close"><X/></button><VxlLogo/>
        <div className="vxl-auth-heading"><span>YOUR PORTFOLIO STUDIO</span><h2 id="auth-title">{mode==="signup"?"Begin with your story.":"Welcome back."}</h2><p>{mode==="signup"?"Create your private workspace. Your trial begins only when you publish.":"Sign in to continue shaping your portfolio."}</p></div>
        <Button className="vxl-google-button" variant="outline" onClick={signInWithGoogle} disabled={googleLoading||loading}>{googleLoading?<Loader2 className="animate-spin"/>:<GoogleMark/>}Continue with Google</Button>
        <div className="vxl-auth-divider"><span/>or use email<span/></div>
        <div className="space-y-3"><Input type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email address"/><Input type="password" autoComplete={mode==="signup"?"new-password":"current-password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password (minimum 8 characters)"/><Button className="vxl-auth-submit" onClick={submit} disabled={loading||googleLoading||!email||password.length<8}>{loading&&<Loader2 className="animate-spin"/>}{mode==="signup"?"Create my workspace":"Sign in to VXL"}<ArrowRight/></Button></div>
        {message&&<p className="vxl-auth-message" role="status">{message}</p>}
        <button className="vxl-auth-switch" onClick={()=>{setMode(mode==="signin"?"signup":"signin");setMessage("")}}>{mode==="signin"?"New to VXL? Create your workspace":"Already have a workspace? Sign in"}</button>
        <p className="vxl-auth-legal">By continuing, you agree to VXL&apos;s <Link href="/terms">Terms &amp; Conditions</Link> and acknowledge the <Link href="/privacy">Privacy Policy</Link>.</p>
        <p className="vxl-auth-trust"><ShieldCheck/>Your data is private until you choose to publish.</p>
      </section>
    </div>}
  </main>;
}
