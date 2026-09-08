"use client";

import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { BriefcaseBusiness, Camera, Check, ChevronRight, CircleDollarSign, Eye, FileText, GraduationCap, LayoutTemplate, Link2, Loader2, Moon, Plus, Save, ShieldCheck, Sparkles, Sun, Trash2, Upload, UserRound, X } from "lucide-react";
import type { ParsedResume } from "@/lib/resume-parser";
import { PlansPanel } from "@/app/plans-panel";
import { PortfolioMiniPreview } from "@/app/portfolio-mini-preview";
import { defaultPaletteForTheme, defaultTextFinishForTheme, palettesForTheme, textFinishesForTheme } from "@/lib/portfolio-style";

type Experience = { id: string; company: string; role: string; location: string; startDate: string; endDate: string; isCurrent: boolean; description: string };
type Education = { id: string; institution: string; qualification: string; field: string; startDate: string; endDate: string; grade: string; description: string };
type Item = { id: string; itemType: "skill" | "project" | "achievement" | "certification" | "language" | "link"; title: string; subtitle: string; description: string; url: string; level: string; issuedAt: string };
type State = { fullName: string; headline: string; professionalSummary: string; email: string; phone: string; city: string; country: string; pronouns: string; portfolioSlug: string; theme: string; accent: string; textTone: string; effectIntensity: number; photoPath: string | null; isPublic: boolean; consentProfileStorage: boolean; consentTalentDiscovery: boolean; experiences: Experience[]; education: Education[]; items: Item[] };

const uid = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;
const emptyExperience = (): Experience => ({ id: uid("exp"), company: "", role: "", location: "", startDate: "", endDate: "", isCurrent: false, description: "" });
const emptyEducation = (): Education => ({ id: uid("edu"), institution: "", qualification: "", field: "", startDate: "", endDate: "", grade: "", description: "" });
const defaultState = (account: { name: string; email: string }): State => ({ fullName: account.name, headline: "", professionalSummary: "", email: account.email, phone: "", city: "", country: "", pronouns: "", portfolioSlug: account.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""), theme: "studio", accent: "champagne", textTone: "ivory", effectIntensity: 65, photoPath: null, isPublic: false, consentProfileStorage: true, consentTalentDiscovery: false, experiences: [], education: [], items: [] });
const mapRow = (row: Record<string, unknown>) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key.replace(/_([a-z])/g, (_, c) => c.toUpperCase()), value]));
const mergeParsedResume = (current: State, parsed: ParsedResume): State => ({
  ...current,
  fullName: parsed.fullName || current.fullName,
  headline: parsed.headline || current.headline,
  professionalSummary: parsed.professionalSummary || current.professionalSummary,
  email: parsed.email || current.email,
  phone: parsed.phone || current.phone,
  city: parsed.city || current.city,
  country: parsed.country || current.country,
  experiences: parsed.experiences.length ? parsed.experiences : current.experiences,
  education: parsed.education.length ? parsed.education : current.education,
  items: parsed.items.length ? parsed.items : current.items,
});

async function readApiResponse(response: Response): Promise<Record<string, unknown>> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return response.json() as Promise<Record<string, unknown>>;
  }
  await response.text().catch(() => "");
  return { error: response.ok ? "The server returned an unexpected response." : "The résumé service temporarily failed. Please try again." };
}

function Field({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return <label className="field"><span>{label}</span><Input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} /></label>;
}

const templates = [
  { id: "studio", name: "Editorial", description: "Deep navy, champagne details and an elegant career narrative.", mood: "Refined · Story-led", swatch: "from-[#090e22] via-[#1a234c] to-[#dfba86]" },
  { id: "canvas", name: "Prism", description: "Cinematic gradients, luminous depth and high-energy project stories.", mood: "Bold · Expressive", swatch: "from-[#050508] via-violet-700 to-pink-500" },
  { id: "ledger", name: "Zen", description: "Pure black, disciplined typography and quietly confident structure.", mood: "Minimal · Precise", swatch: "from-black via-[#171719] to-[#829579]" },
] as const;

export function ProfileWorkspace({ account }: { account: { name: string; email: string } }) {
  const [data, setData] = useState<State>(() => defaultState(account));
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [savedAt, setSavedAt] = useState<string | null>(null); const [notice, setNotice] = useState("");
  const [resume, setResume] = useState<{ id: string; original_name: string; parse_status: string } | null>(null); const [activeTab, setActiveTab] = useState("profile"); const fileRef = useRef<HTMLInputElement>(null); const photoRef = useRef<HTMLInputElement>(null);
  const [uiTheme, setUiTheme] = useState<"dark" | "light">(() => {
    if (typeof window === "undefined") return "dark";
    return window.localStorage.getItem("vxl_ui_theme") === "light" ? "light" : "dark";
  });

  useEffect(() => { fetch("/api/profile").then(async (response) => { if (!response.ok) throw new Error("Could not load your profile."); return response.json(); }).then((result) => {
    if (result.profile) { const profile = mapRow(result.profile); setData({ ...defaultState(account), ...profile, isPublic: Boolean(profile.isPublic), consentProfileStorage: Boolean(profile.consentProfileStorage), consentTalentDiscovery: Boolean(profile.consentTalentDiscovery), experiences: (result.experiences ?? []).map((row: Record<string, unknown>) => ({ ...mapRow(row), isCurrent: Boolean(row.is_current) })) as unknown as Experience[], education: (result.education ?? []).map(mapRow) as unknown as Education[], items: (result.items ?? []).map(mapRow) as unknown as Item[] }); setSavedAt(String(profile.updatedAt ?? "")); }
    if (result.resumes?.[0]) {
      setResume(result.resumes[0]);
      const extraction = result.resumeExtraction;
      const emptySavedProfile = !result.experiences?.length && !result.education?.length && !result.items?.length && !result.profile?.professional_summary;
      if (extraction?.status === "complete" && extraction.resume_id === result.resumes[0].id && extraction.extracted_json && emptySavedProfile) {
        setData((current) => mergeParsedResume(current, extraction.extracted_json as ParsedResume));
        setNotice("Your last résumé draft was recovered. Review the imported fields, then save your changes.");
      }
    }
  }).catch((error) => setNotice(error.message)).finally(() => setLoading(false)); }, [account]);

  const completionChecks = useMemo(() => [
    { label: "Name and professional headline", done: Boolean(data.fullName && data.headline) },
    { label: "Professional summary", done: data.professionalSummary.length >= 40 },
    { label: "Email and location", done: Boolean(data.email && data.city && data.country) },
    { label: "Education", done: data.education.length > 0 },
    { label: "At least three skills", done: data.items.filter((item) => item.itemType === "skill" && item.title).length >= 3 },
    { label: "Portfolio address", done: data.portfolioSlug.length >= 3 },
    { label: "Profile-storage consent", done: data.consentProfileStorage },
  ], [data]);
  const completion = Math.round((completionChecks.filter((item) => item.done).length / completionChecks.length) * 100);
  const update = <K extends keyof State>(key: K, value: State[K]) => setData((current) => ({ ...current, [key]: value }));
  const save = async (payloadOrEvent: State | ReactMouseEvent<HTMLButtonElement> = data, successMessage = "Everything is saved.") => {
    const payload = "fullName" in payloadOrEvent ? payloadOrEvent : data;
    setSaving(true);
    setNotice("");
    try {
      const response = await fetch("/api/profile", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const result = await readApiResponse(response);
      if (!response.ok) throw new Error(String(result.error || "Could not save changes."));
      setSavedAt(String(result.savedAt ?? ""));
      setNotice(successMessage);
      return true;
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not save changes.");
      return false;
    } finally {
      setSaving(false);
    }
  };
  const applyParsed = async (parsed: ParsedResume, fileName: string, resumeId: string, status: string) => {
    setResume({ id: resumeId, original_name: fileName, parse_status: status });
    const merged = mergeParsedResume(data, parsed);
    setData(merged);
    setActiveTab("profile");
    const imported = parsed.experiences.length + parsed.education.length + parsed.items.length;
    const warning = parsed.warnings.length ? ` ${parsed.warnings[0]}` : "";
    await save(merged, `Résumé read and saved. We prefilled your profile and imported ${imported} structured entries. Review every field before publishing.${warning}`);
  };
  const uploadResume = async (file?: File) => {
    if (!file) return;
    try {
      setNotice("Uploading and reading your résumé…");
      const profileReady = await save(data, "Profile ready for résumé import.");
      if (!profileReady) return;
      const form = new FormData();
      form.append("resume", file);
      const response = await fetch("/api/resume", { method: "POST", body: form });
      const result = await readApiResponse(response);
      if (!response.ok) throw new Error(String(result.error || "Upload failed."));
      await applyParsed(result.parsedData as ParsedResume, String(result.name), String(result.id), String(result.status));
      if (fileRef.current) fileRef.current.value = "";
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not upload and read the résumé.");
    }
  };
  const reparseResume = async () => {
    if (!resume) return;
    setSaving(true);
    setNotice("Reading your saved résumé and rebuilding the draft…");
    try {
      const response = await fetch("/api/resume/reparse", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ resumeId: resume.id }) });
      const result = await readApiResponse(response);
      if (!response.ok) throw new Error(String(result.error || "Could not read the saved résumé."));
      await applyParsed(result.parsedData as ParsedResume, String(result.name), String(result.id), String(result.status));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not read the saved résumé.");
    } finally {
      setSaving(false);
    }
  };
  const uploadPhoto = async (file?: File) => {
    if (!file) return;
    setSaving(true);
    setNotice("Uploading your portrait…");
    try {
      const form = new FormData();
      form.append("photo", file);
      const response = await fetch("/api/profile/photo", { method: "POST", body: form });
      const result = await readApiResponse(response);
      if (!response.ok) throw new Error(String(result.error || "Could not upload the photo."));
      update("photoPath", String(result.photoPath));
      setNotice("Portrait saved. Every template now adapts around it.");
      if (photoRef.current) photoRef.current.value = "";
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not upload the photo.");
    } finally {
      setSaving(false);
    }
  };
  const removePhoto = async () => {
    setSaving(true);
    setNotice("Removing your portrait…");
    try {
      const response = await fetch("/api/profile/photo", { method: "DELETE" });
      const result = await readApiResponse(response);
      if (!response.ok) throw new Error(String(result.error || "Could not remove the photo."));
      update("photoPath", null);
      setNotice("Portrait removed. Your templates will use their photo-free layouts.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not remove the photo.");
    } finally {
      setSaving(false);
    }
  };
  const publish = async () => {
    if (completion < 100) {
      const missing = completionChecks.filter((item) => !item.done).map((item) => item.label.toLowerCase());
      setNotice(`Your portfolio is saved, but before publishing please complete: ${missing.join(", ")}.`);
      return;
    }
    const published = { ...data, isPublic: true };
    setData(published);
    await save(published, "Your portfolio is live. Your 7-day free trial has started.");
  };
  const preview = async () => {
    const previewTab = window.open("about:blank", "vxl-portfolio-preview");
    const saved = await save(data, "Latest changes saved. Opening your portfolio preview.");
    if (!saved) { previewTab?.close(); return; }
    const url = `/p/${data.portfolioSlug || "preview"}`;
    if (previewTab) previewTab.location.assign(url); else window.location.assign(url);
  };
  const chooseTemplate = async (theme: State["theme"]) => {
    const next = { ...data, theme, accent: defaultPaletteForTheme[theme] ?? "champagne", textTone: defaultTextFinishForTheme[theme] ?? "ivory" };
    setData(next);
    await save(next, `${templates.find((template) => template.id === theme)?.name ?? "Portfolio"} template selected and saved.`);
  };
  const choosePalette = async (accent: string) => {
    const next = { ...data, accent };
    setData(next);
    await save(next, `${palettesForTheme(data.theme).find((palette) => palette.id === accent)?.name ?? "Color"} palette saved.`);
  };
  const chooseTextFinish = async (textTone: string) => {
    const next = { ...data, textTone };
    setData(next);
    await save(next, `${textFinishesForTheme(data.theme).find((finish) => finish.id === textTone)?.name ?? "Text"} finish saved.`);
  };
  const commitIntensity = async (values: number[]) => {
    const effectIntensity = Math.round(values[0] ?? data.effectIntensity);
    const next = { ...data, effectIntensity };
    setData(next);
    await save(next, "Visual intensity saved.");
  };
  const unpublish = async () => {
    const privateProfile = { ...data, isPublic: false };
    setData(privateProfile);
    await save(privateProfile, "Your portfolio is now private. Your trial clock is not reset.");
  };
  const addItem = (itemType: Item["itemType"]) => update("items", [...data.items, { id: uid("itm"), itemType, title: "", subtitle: "", description: "", url: "", level: "", issuedAt: "" }]);
  if (loading) return <main className="vxl-studio-loading"><div className="vxl-logo-mark">X</div><Loader2 className="h-5 w-5 animate-spin" /><span>Preparing your studio</span></main>;
  return <main className={`vxl-workspace ${uiTheme === "dark" ? "is-dark" : "is-light"}`}>
    <header className="vxl-studio-header"><div className="flex items-center gap-3"><div className="vxl-logo-mark">X</div><div><p className="vxl-studio-wordmark">VXL</p><p className="vxl-studio-caption">Portfolio studio</p></div></div><div className="vxl-studio-actions"><span className="hidden text-xs md:inline">{savedAt ? `Saved at ${new Date(savedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Draft not saved yet"}</span><button className="vxl-studio-icon" onClick={() => { const next = uiTheme === "dark" ? "light" : "dark"; setUiTheme(next); window.localStorage.setItem("vxl_ui_theme", next); }} aria-label={`Switch to ${uiTheme === "dark" ? "light" : "dark"} theme`}>{uiTheme === "dark" ? <Sun/> : <Moon/>}</button><Button variant="outline" onClick={preview} disabled={saving}><Eye className="h-4 w-4" />Preview</Button><Button className="vxl-studio-primary" onClick={save} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save draft</Button></div></header>
    <div className="vxl-studio-grid">
      <aside className="vxl-studio-sidebar"><div className="vxl-sidebar-profile"><span>PROFILE STRENGTH</span><strong>{completion}%</strong><Progress value={completion}/><p>{completion === 100 ? "Ready to publish." : "Complete the highlighted details to publish."}</p></div><nav>{[{ id: "profile", icon: UserRound, label: "Personal profile" }, { id: "experience", icon: BriefcaseBusiness, label: "Experience" }, { id: "education", icon: GraduationCap, label: "Education" }, { id: "extras", icon: Sparkles, label: "Skills & more" }, { id: "templates", icon: LayoutTemplate, label: "Templates" }, { id: "publish", icon: Link2, label: "Publish settings" }, { id: "plans", icon: CircleDollarSign, label: "Plans & referrals" }].map(({ id, icon: Icon, label }) => <button key={id} onClick={() => setActiveTab(id)} className={`nav-item ${activeTab === id ? "active" : ""}`}><Icon className="h-4 w-4" />{label}<ChevronRight className="ml-auto hidden h-4 w-4 xl:block" /></button>)}</nav><div className="vxl-sidebar-trust"><div><ShieldCheck className="h-4 w-4" />Private by default</div><p>Nothing is visible until you approve and publish.</p><a href="mailto:findnext@ignyxx.in">Talk to VXL support</a></div></aside>
      <section className="min-w-0 space-y-5">
        <div className="vxl-import-panel"><div className="vxl-import-copy"><div><Badge>01 · IMPORT</Badge><span>Private workspace</span></div><h1>Start with what you’ve already built.</h1><p>Upload your résumé and VXL will shape the first draft. Every extracted field remains yours to review, rewrite or remove.</p></div><input ref={fileRef} className="hidden" type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(e) => uploadResume(e.target.files?.[0])}/><div className="vxl-import-actions">{resume && <Button variant="outline" onClick={reparseResume} disabled={saving}><Sparkles/>Read saved résumé</Button>}<Button className="vxl-studio-primary" onClick={() => fileRef.current?.click()} disabled={saving}><Upload/>{resume ? "Replace résumé" : "Upload & prefill"}</Button></div>{resume && <div className="vxl-resume-status"><div><FileText/></div><span><strong>{resume.original_name}</strong><small>{resume.parse_status === "review" || resume.parse_status === "complete" ? "Stored privately · Ready for review" : resume.parse_status === "failed" ? "Stored privately · Reading needs another attempt" : "Stored privately · Ready to read"}</small></span>{resume.parse_status === "review" || resume.parse_status === "complete" ? <Check/> : null}</div>}<p className="vxl-private-note"><ShieldCheck/>Nothing goes live until you review and publish it.</p></div>
        {notice && <div className="vxl-inline-notice"><Check className="h-4 w-4"/>{notice}</div>}
        <Tabs value={activeTab} onValueChange={setActiveTab}><TabsList className="sr-only"><TabsTrigger value="profile">Profile</TabsTrigger><TabsTrigger value="experience">Experience</TabsTrigger><TabsTrigger value="education">Education</TabsTrigger><TabsTrigger value="extras">More</TabsTrigger><TabsTrigger value="templates">Templates</TabsTrigger><TabsTrigger value="publish">Publish</TabsTrigger><TabsTrigger value="plans">Plans</TabsTrigger></TabsList>
          <TabsContent value="profile"><Section title="Personal profile" description="The essentials recruiters see first.">
            <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:flex-row sm:items-center">
              <div className="relative grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-600 text-2xl font-bold text-white">
                {data.photoPath && data.portfolioSlug ? <Image src={`/p/${data.portfolioSlug}/photo`} alt="Your profile portrait" fill sizes="96px" className="object-cover" unoptimized /> : data.fullName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "YN"}
              </div>
              <div className="flex-1"><div className="flex items-center gap-2"><Camera className="h-4 w-4 text-indigo-600" /><p className="text-sm font-semibold">Profile picture <span className="font-normal text-slate-400">(optional)</span></p></div><p className="mt-1 text-sm leading-6 text-slate-500">Add one if it supports your story. Every template also has a complete photo-free layout.</p><input ref={photoRef} className="hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => uploadPhoto(event.target.files?.[0])} /><div className="mt-3 flex flex-wrap gap-2"><Button type="button" variant="outline" size="sm" onClick={() => photoRef.current?.click()} disabled={saving}><Upload className="h-3.5 w-3.5" />{data.photoPath ? "Replace photo" : "Add photo"}</Button>{data.photoPath && <Button type="button" variant="ghost" size="sm" onClick={removePhoto} disabled={saving}><X className="h-3.5 w-3.5" />Remove</Button>}</div></div>
            </div>
            <div className="form-grid"><Field label="Full name" value={data.fullName} onChange={(v) => update("fullName", v)} /><Field label="Professional headline" value={data.headline} onChange={(v) => update("headline", v)} placeholder="Product designer · Fintech" /><Field label="Email" type="email" value={data.email} onChange={(v) => update("email", v)} /><Field label="Phone" value={data.phone} onChange={(v) => update("phone", v)} /><Field label="City" value={data.city} onChange={(v) => update("city", v)} /><Field label="Country" value={data.country} onChange={(v) => update("country", v)} /></div><label className="field mt-5"><span>Professional summary</span><Textarea rows={6} value={data.professionalSummary} onChange={(e) => update("professionalSummary", e.target.value)} placeholder="Tell people what you do, what you care about and the impact you create." /><small>{data.professionalSummary.length}/4,000</small></label>
          </Section></TabsContent>
          <TabsContent value="experience"><CollectionSection title="Work experience" description="Roles, dates, responsibilities and measurable impact." action={() => update("experiences", [...data.experiences, emptyExperience()])} actionLabel="Add experience">{data.experiences.length === 0 ? <Empty label="No experience added yet" /> : data.experiences.map((row, index) => <RecordCard key={row.id} title={row.role || `Experience ${index + 1}`} onDelete={() => update("experiences", data.experiences.filter((item) => item.id !== row.id))}><div className="form-grid"><Field label="Role" value={row.role} onChange={(v) => update("experiences", data.experiences.map((item) => item.id === row.id ? { ...item, role: v } : item))} /><Field label="Company" value={row.company} onChange={(v) => update("experiences", data.experiences.map((item) => item.id === row.id ? { ...item, company: v } : item))} /><Field label="Location" value={row.location} onChange={(v) => update("experiences", data.experiences.map((item) => item.id === row.id ? { ...item, location: v } : item))} /><Field label="Start date" type="month" value={row.startDate} onChange={(v) => update("experiences", data.experiences.map((item) => item.id === row.id ? { ...item, startDate: v } : item))} /><Field label="End date" type="month" value={row.endDate} onChange={(v) => update("experiences", data.experiences.map((item) => item.id === row.id ? { ...item, endDate: v, isCurrent: false } : item))} /></div><label className="mt-4 flex items-center gap-3 text-sm"><Checkbox checked={row.isCurrent} onCheckedChange={(value) => update("experiences", data.experiences.map((item) => item.id === row.id ? { ...item, isCurrent: Boolean(value), endDate: value ? "" : item.endDate } : item))} />I currently work here</label><label className="field mt-4"><span>Impact and responsibilities</span><Textarea rows={6} value={row.description} onChange={(e) => update("experiences", data.experiences.map((item) => item.id === row.id ? { ...item, description: e.target.value } : item))} /></label></RecordCard>)}</CollectionSection></TabsContent>
          <TabsContent value="education"><CollectionSection title="Education" description="Qualifications, institutions, dates and academic highlights." action={() => update("education", [...data.education, emptyEducation()])} actionLabel="Add education">{data.education.length === 0 ? <Empty label="No education added yet" /> : data.education.map((row, index) => <RecordCard key={row.id} title={row.qualification || `Education ${index + 1}`} onDelete={() => update("education", data.education.filter((item) => item.id !== row.id))}><div className="form-grid"><Field label="Institution" value={row.institution} onChange={(v) => update("education", data.education.map((item) => item.id === row.id ? { ...item, institution: v } : item))} /><Field label="Qualification" value={row.qualification} onChange={(v) => update("education", data.education.map((item) => item.id === row.id ? { ...item, qualification: v } : item))} /><Field label="Field of study" value={row.field} onChange={(v) => update("education", data.education.map((item) => item.id === row.id ? { ...item, field: v } : item))} /><Field label="Grade" value={row.grade} onChange={(v) => update("education", data.education.map((item) => item.id === row.id ? { ...item, grade: v } : item))} /><Field label="Start date" type="month" value={row.startDate} onChange={(v) => update("education", data.education.map((item) => item.id === row.id ? { ...item, startDate: v } : item))} /><Field label="End date" type="month" value={row.endDate} onChange={(v) => update("education", data.education.map((item) => item.id === row.id ? { ...item, endDate: v } : item))} /></div><label className="field mt-4"><span>Details</span><Textarea rows={4} value={row.description} onChange={(e) => update("education", data.education.map((item) => item.id === row.id ? { ...item, description: e.target.value } : item))} /></label></RecordCard>)}</CollectionSection></TabsContent>
          <TabsContent value="extras"><Section title="Skills & profile details" description="Everything that gives your work more context."><div className="flex flex-wrap gap-2">{(["skill", "project", "achievement", "certification", "language", "link"] as Item["itemType"][]).map((type) => <Button key={type} variant="outline" size="sm" onClick={() => addItem(type)}><Plus className="h-3.5 w-3.5" />{type[0].toUpperCase() + type.slice(1)}</Button>)}</div><div className="mt-5 space-y-3">{data.items.length === 0 ? <Empty label="Add skills, projects or achievements" /> : data.items.map((row) => <RecordCard key={row.id} title={row.title || row.itemType} onDelete={() => update("items", data.items.filter((item) => item.id !== row.id))}><div className="form-grid"><Field label="Title" value={row.title} onChange={(v) => update("items", data.items.map((item) => item.id === row.id ? { ...item, title: v } : item))} /><Field label="Supporting detail" value={row.subtitle} onChange={(v) => update("items", data.items.map((item) => item.id === row.id ? { ...item, subtitle: v } : item))} placeholder="Level, issuer or technology" /></div><label className="field mt-4"><span>Description</span><Textarea value={row.description} onChange={(e) => update("items", data.items.map((item) => item.id === row.id ? { ...item, description: e.target.value } : item))} /></label></RecordCard>)}</div></Section></TabsContent>
          <TabsContent value="templates"><Section title="Choose your portfolio world" description="Each design tells the same career differently. All templates are included and adapt with or without a portrait."><div className="grid gap-4 md:grid-cols-3">{templates.map((template) => <button key={template.id} onClick={() => chooseTemplate(template.id)} disabled={saving} className={`group overflow-hidden rounded-2xl border-2 text-left transition duration-300 hover:-translate-y-1 ${data.theme === template.id ? "border-indigo-600 shadow-[0_16px_40px_rgba(79,70,229,.18)]" : "border-slate-200 hover:border-slate-300"}`}><div className={`relative h-44 overflow-hidden bg-gradient-to-br ${template.swatch} p-4`}><div className="absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(255,255,255,.3)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.3)_1px,transparent_1px)] [background-size:24px_24px]" /><div className="relative h-full border border-white/20 bg-black/25 p-4 text-white backdrop-blur-sm"><p className="text-[9px] font-semibold uppercase tracking-[.2em] opacity-70">Professional story</p><div className={`mt-4 h-3 rounded bg-white/90 ${template.id === "canvas" ? "w-3/4" : template.id === "ledger" ? "w-2/3" : "w-1/2"}`} /><div className="mt-2 h-1.5 w-1/3 rounded bg-white/40" /><div className="mt-8 grid grid-cols-[.45fr_1fr] gap-3"><div className="h-12 border border-white/15 bg-white/10" /><div className="space-y-2"><div className="h-1.5 rounded bg-white/55" /><div className="h-1.5 rounded bg-white/25" /><div className="h-1.5 w-2/3 rounded bg-white/25" /></div></div></div></div><div className="bg-white p-4"><div className="flex items-center justify-between"><div><p className="font-semibold">{template.name}</p><p className="mt-0.5 text-xs font-medium uppercase tracking-[.12em] text-indigo-600">{template.mood}</p></div>{data.theme === template.id && <span className="grid h-7 w-7 place-items-center rounded-full bg-indigo-600 text-white"><Check className="h-4 w-4" /></span>}</div><p className="mt-3 text-sm leading-5 text-slate-500">{template.description}</p></div></button>)}</div>
            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
              <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end"><div><p className="text-sm font-semibold">Fine-tune {templates.find((template) => template.id === data.theme)?.name}</p><p className="mt-1 text-sm text-slate-500">Pair a curated color world with a considered text finish, then tune the atmosphere.</p></div><Badge variant="outline">{data.effectIntensity < 35 ? "Quiet" : data.effectIntensity > 75 ? "Vivid" : "Balanced"}</Badge></div>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">{palettesForTheme(data.theme).map((palette) => <button type="button" key={palette.id} onClick={() => choosePalette(palette.id)} disabled={saving} aria-pressed={data.accent === palette.id} className={`rounded-xl border bg-white p-3 text-left transition ${data.accent === palette.id ? "border-indigo-600 ring-2 ring-indigo-100" : "border-slate-200 hover:border-slate-300"}`}><span className="flex gap-1.5">{palette.colors.map((color) => <span key={color} className="h-7 flex-1 rounded-md" style={{ backgroundColor: color }} />)}</span><span className="mt-3 flex items-center justify-between"><span><strong className="block text-sm">{palette.name}</strong><small className="text-slate-500">{palette.description}</small></span>{data.accent === palette.id && <Check className="h-4 w-4 text-indigo-600" />}</span></button>)}</div>
              <div className="mt-6"><p className="text-xs font-semibold uppercase tracking-[.14em] text-slate-500">Text finish</p><div className="mt-3 grid gap-3 sm:grid-cols-3">{textFinishesForTheme(data.theme).map((finish) => <button type="button" key={finish.id} onClick={() => chooseTextFinish(finish.id)} disabled={saving} aria-pressed={data.textTone === finish.id} className={`flex items-center gap-3 rounded-xl border bg-white p-3 text-left transition ${data.textTone === finish.id ? "border-indigo-600 ring-2 ring-indigo-100" : "border-slate-200 hover:border-slate-300"}`}><span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-xl font-semibold" style={{ color: finish.primary, backgroundColor: "#0b1020", textShadow: `0 0 18px ${finish.muted}55` }}>Aa</span><span className="min-w-0"><strong className="block text-sm">{finish.name}</strong><small className="block truncate text-slate-500">{finish.description}</small></span>{data.textTone === finish.id && <Check className="ml-auto h-4 w-4 shrink-0 text-indigo-600" />}</button>)}</div></div>
              <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4"><div className="flex items-center justify-between"><label className="text-sm font-semibold" htmlFor="effect-intensity">Visual intensity</label><span className="text-sm tabular-nums text-slate-500">{data.effectIntensity}%</span></div><Slider id="effect-intensity" className="mt-4" min={0} max={100} step={5} value={[data.effectIntensity]} onValueChange={(values) => update("effectIntensity", Math.round(values[0] ?? 65))} onValueCommit={commitIntensity} aria-label="Visual intensity" /><div className="mt-2 flex justify-between text-[11px] font-medium text-slate-400"><span>Quiet</span><span>Balanced</span><span>Vivid</span></div></div>
            </div>
            <div className="mt-6 flex justify-end"><Button variant="outline" onClick={preview} disabled={saving}><Eye className="h-4 w-4" />Open full preview</Button></div></Section></TabsContent>
          <TabsContent value="publish"><Section title="Review and publish" description="Your free trial starts only after you complete these checks and press Publish."><Field label="Portfolio address" value={data.portfolioSlug} onChange={(v) => update("portfolioSlug", v.toLowerCase().replace(/[^a-z0-9-]/g, ""))} /><p className="mt-2 text-sm text-slate-500">findnext.vercel.app/p/{data.portfolioSlug || "your-name"}</p><div className="mt-6 rounded-xl border border-slate-200 p-4"><p className="text-sm font-semibold">Publishing checklist</p><div className="mt-3 space-y-2">{completionChecks.map((item) => <div key={item.label} className="flex items-center gap-2 text-sm"><span className={`grid h-5 w-5 place-items-center rounded-full ${item.done ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>{item.done ? <Check className="h-3.5 w-3.5" /> : "·"}</span>{item.label}</div>)}</div></div><label className="mt-5 flex items-start gap-3 rounded-xl border border-slate-200 p-4"><Checkbox checked={data.consentProfileStorage} onCheckedChange={(value) => update("consentProfileStorage", Boolean(value))} /><span><strong className="block text-sm">Save my profile and résumé securely</strong><small className="mt-1 block text-slate-500">Required so you can return, edit and maintain your portfolio.</small></span></label><label className="mt-3 flex items-start gap-3 rounded-xl border border-slate-200 p-4"><Checkbox checked={data.consentTalentDiscovery} onCheckedChange={(value) => update("consentTalentDiscovery", Boolean(value))} /><span><strong className="block text-sm">Let verified employers discover me</strong><small className="mt-1 block text-slate-500">Optional. This can be changed any time.</small></span></label><div className="mt-6 rounded-xl bg-slate-950 p-5 text-white"><p className="text-xs font-semibold uppercase tracking-[.16em] text-indigo-300">You’re in our circle</p><p className="mt-2 text-lg font-semibold">{data.isPublic ? "Your portfolio is live." : "Review it. Love it. Then make it live."}</p><p className="mt-2 text-sm leading-6 text-slate-300">All templates are included. Your seven free days begin only when you publish.</p><div className="mt-5 flex flex-wrap gap-3">{data.isPublic ? <Button variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/20" onClick={unpublish} disabled={saving}>Make private</Button> : <Button onClick={publish} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}Publish & start free trial</Button>}<Button variant="ghost" className="text-white hover:bg-white/10 hover:text-white" onClick={preview} disabled={saving}><Eye className="h-4 w-4" />Preview first</Button></div></div></Section></TabsContent>
          <TabsContent value="plans"><PlansPanel email={data.email || account.email} /></TabsContent>
        </Tabs>
      </section>
      <aside className="vxl-preview-column"><div className="vxl-preview-shell"><div className="vxl-preview-bar"><span><i/><i/><i/></span><div><p>Live preview</p><small>Updates as you type</small></div><Badge variant="outline">{templates.find((template) => template.id === data.theme)?.name ?? "Studio"}</Badge></div><PortfolioMiniPreview data={data}/></div></aside>
    </div>
  </main>;
}

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) { return <div className="vxl-editor-section"><div className="vxl-editor-heading"><span>VXL STUDIO</span><h2>{title}</h2><p>{description}</p></div><div className="mt-6">{children}</div></div>; }
function CollectionSection({ title, description, action, actionLabel, children }: { title: string; description: string; action: () => void; actionLabel: string; children: React.ReactNode }) { return <div className="vxl-editor-section"><div className="flex items-start justify-between gap-4"><div className="vxl-editor-heading"><span>STRUCTURED CONTENT</span><h2>{title}</h2><p>{description}</p></div><Button variant="outline" onClick={action}><Plus className="h-4 w-4"/>{actionLabel}</Button></div><div className="mt-6 space-y-4">{children}</div></div>; }
function RecordCard({ title, onDelete, children }: { title: string; onDelete: () => void; children: React.ReactNode }) { return <article className="vxl-record-card"><div className="mb-5 flex items-center justify-between"><h3 className="font-semibold capitalize">{title}</h3><Button variant="ghost" size="icon" onClick={onDelete} aria-label={`Delete ${title}`}><Trash2 className="h-4 w-4"/></Button></div>{children}</article>; }
function Empty({ label }: { label: string }) { return <div className="vxl-empty-state"><LayoutTemplate/><strong>{label}</strong><span>Your next chapter can start here.</span></div>; }
