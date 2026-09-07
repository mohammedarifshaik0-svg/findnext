"use client";

import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { BriefcaseBusiness, Check, ChevronRight, CircleDollarSign, Eye, FileText, GraduationCap, Link2, Loader2, Plus, Save, ShieldCheck, Sparkles, Trash2, Upload, UserRound } from "lucide-react";
import type { ParsedResume } from "@/lib/resume-parser";
import { PlansPanel } from "@/app/plans-panel";

type Experience = { id: string; company: string; role: string; location: string; startDate: string; endDate: string; isCurrent: boolean; description: string };
type Education = { id: string; institution: string; qualification: string; field: string; startDate: string; endDate: string; grade: string; description: string };
type Item = { id: string; itemType: "skill" | "project" | "achievement" | "certification" | "language" | "link"; title: string; subtitle: string; description: string; url: string; level: string; issuedAt: string };
type State = { fullName: string; headline: string; professionalSummary: string; email: string; phone: string; city: string; country: string; pronouns: string; portfolioSlug: string; theme: string; accent: string; isPublic: boolean; consentProfileStorage: boolean; consentTalentDiscovery: boolean; experiences: Experience[]; education: Education[]; items: Item[] };

const uid = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;
const emptyExperience = (): Experience => ({ id: uid("exp"), company: "", role: "", location: "", startDate: "", endDate: "", isCurrent: false, description: "" });
const emptyEducation = (): Education => ({ id: uid("edu"), institution: "", qualification: "", field: "", startDate: "", endDate: "", grade: "", description: "" });
const defaultState = (account: { name: string; email: string }): State => ({ fullName: account.name, headline: "", professionalSummary: "", email: account.email, phone: "", city: "", country: "", pronouns: "", portfolioSlug: account.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""), theme: "studio", accent: "indigo", isPublic: false, consentProfileStorage: true, consentTalentDiscovery: false, experiences: [], education: [], items: [] });
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

export function ProfileWorkspace({ account }: { account: { name: string; email: string } }) {
  const [data, setData] = useState<State>(() => defaultState(account));
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [savedAt, setSavedAt] = useState<string | null>(null); const [notice, setNotice] = useState("");
  const [resume, setResume] = useState<{ id: string; original_name: string; parse_status: string } | null>(null); const [activeTab, setActiveTab] = useState("profile"); const fileRef = useRef<HTMLInputElement>(null);

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
  const applyParsed = (parsed: ParsedResume, fileName: string, resumeId: string, status: string) => {
    setResume({ id: resumeId, original_name: fileName, parse_status: status });
    setData((current) => mergeParsedResume(current, parsed));
    setActiveTab("profile");
    const imported = parsed.experiences.length + parsed.education.length + parsed.items.length;
    const warning = parsed.warnings.length ? ` ${parsed.warnings[0]}` : "";
    setNotice(`Résumé read successfully. We prefilled your details and imported ${imported} structured entries. Please review every field.${warning}`);
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
      applyParsed(result.parsedData as ParsedResume, String(result.name), String(result.id), String(result.status));
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
      applyParsed(result.parsedData as ParsedResume, String(result.name), String(result.id), String(result.status));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not read the saved résumé.");
    } finally {
      setSaving(false);
    }
  };
  const publish = async () => {
    if (completion < 100) {
      setNotice("Complete every publishing check before starting your free trial.");
      return;
    }
    const published = { ...data, isPublic: true };
    setData(published);
    await save(published, "Your portfolio is live. Your 7-day free trial has started.");
  };
  const unpublish = async () => {
    const privateProfile = { ...data, isPublic: false };
    setData(privateProfile);
    await save(privateProfile, "Your portfolio is now private. Your trial clock is not reset.");
  };
  const addItem = (itemType: Item["itemType"]) => update("items", [...data.items, { id: uid("itm"), itemType, title: "", subtitle: "", description: "", url: "", level: "", issuedAt: "" }]);
  if (loading) return <main className="grid min-h-screen place-items-center bg-[#f4f6fb]"><Loader2 className="h-7 w-7 animate-spin text-indigo-600" /></main>;
  const skills = data.items.filter((item) => item.itemType === "skill"); const links = data.items.filter((item) => item.itemType === "link");

  return <main className="min-h-screen bg-[#f4f6fb] text-slate-950">
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl"><div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between px-4 sm:px-6"><div className="flex items-center gap-3"><div className="brand-mark small">FN</div><div><p className="text-base font-bold tracking-[-.02em]">FindNext</p><p className="text-xs text-slate-500">Portfolio studio</p></div></div><div className="flex items-center gap-2 sm:gap-3"><span className="hidden text-sm text-slate-500 md:inline">{savedAt ? `Saved ${new Date(savedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Not saved yet"}</span><Button variant="outline" asChild><a href={`/p/${data.portfolioSlug || "preview"}`} target="_blank" rel="noreferrer"><Eye className="h-4 w-4" /> Preview</a></Button><Button onClick={save} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save</Button></div></div></header>
    <div className="mx-auto grid max-w-[1500px] gap-6 p-4 sm:p-6 xl:grid-cols-[240px_minmax(0,1fr)_380px]">
      <aside className="rounded-2xl border border-slate-200 bg-white p-4 xl:sticky xl:top-22 xl:h-[calc(100vh-7rem)]"><div className="rounded-xl bg-slate-950 p-4 text-white"><div className="flex items-center justify-between"><span className="text-sm font-medium">Profile strength</span><strong>{completion}%</strong></div><Progress value={completion} className="mt-3 bg-white/15" /><p className="mt-3 text-xs leading-5 text-slate-300">Complete profiles make stronger portfolios.</p></div><nav className="mt-4 grid grid-cols-2 gap-2 xl:grid-cols-1">{[{ id: "profile", icon: UserRound, label: "Personal profile" }, { id: "experience", icon: BriefcaseBusiness, label: "Experience" }, { id: "education", icon: GraduationCap, label: "Education" }, { id: "extras", icon: Sparkles, label: "Skills & more" }, { id: "publish", icon: Link2, label: "Publish settings" }, { id: "plans", icon: CircleDollarSign, label: "Plans & referrals" }].map(({ id, icon: Icon, label }) => <button key={id} onClick={() => setActiveTab(id)} className={`nav-item ${activeTab === id ? "active" : ""}`}><Icon className="h-4 w-4" />{label}<ChevronRight className="ml-auto hidden h-4 w-4 xl:block" /></button>)}</nav><div className="mt-4 border-t border-slate-100 pt-4"><div className="flex items-center gap-2 text-sm font-medium"><ShieldCheck className="h-4 w-4 text-emerald-600" />Private by default</div><p className="mt-2 text-xs leading-5 text-slate-500">Your portfolio stays private until you publish it.</p><a className="mt-3 block text-xs font-semibold text-indigo-600" href="mailto:findnext@ignyxx.in">findnext@ignyxx.in</a></div></aside>
      <section className="min-w-0 space-y-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center"><div><div className="flex items-center gap-2"><Badge className="bg-indigo-50 text-indigo-700">Step 1 · Start here</Badge><span className="text-sm text-slate-500">Import your career story</span></div><h1 className="mt-3 text-2xl font-semibold tracking-[-.03em]">Upload once. We’ll build the first draft.</h1><p className="mt-2 text-sm leading-6 text-slate-600">We securely read your PDF or DOCX, prefill every detail we can find, and keep you in control of every edit.</p></div><input ref={fileRef} className="hidden" type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(e) => uploadResume(e.target.files?.[0])} /><div className="flex flex-wrap gap-2">{resume && <Button variant="outline" size="lg" onClick={reparseResume} disabled={saving}><Sparkles className="h-4 w-4" />Read saved résumé</Button>}<Button variant="outline" size="lg" onClick={() => fileRef.current?.click()} disabled={saving}><Upload className="h-4 w-4" />{resume ? "Replace résumé" : "Upload & prefill"}</Button></div></div>{resume && <div className="mt-5 flex items-center gap-3 rounded-xl border border-indigo-100 bg-indigo-50/70 p-3"><div className="grid h-10 w-10 place-items-center rounded-lg bg-white text-indigo-600"><FileText className="h-5 w-5" /></div><div className="min-w-0"><p className="truncate text-sm font-semibold">{resume.original_name}</p><p className="text-xs text-indigo-700">{resume.parse_status === "review" || resume.parse_status === "complete" ? "Stored privately · Fields ready for review" : resume.parse_status === "failed" ? "Stored privately · Reading needs another attempt" : "Stored privately · Ready to read"}</p></div>{resume.parse_status === "review" || resume.parse_status === "complete" ? <Check className="ml-auto h-5 w-5 text-emerald-600" /> : null}</div>}<p className="mt-4 text-xs leading-5 text-slate-500"><ShieldCheck className="mr-1 inline h-3.5 w-3.5 text-emerald-600" />Your résumé is private. Nothing goes live until you approve and publish it.</p></div>
        {notice && <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-800">{notice}</div>}
        <Tabs value={activeTab} onValueChange={setActiveTab}><TabsList className="sr-only"><TabsTrigger value="profile">Profile</TabsTrigger><TabsTrigger value="experience">Experience</TabsTrigger><TabsTrigger value="education">Education</TabsTrigger><TabsTrigger value="extras">More</TabsTrigger><TabsTrigger value="publish">Publish</TabsTrigger><TabsTrigger value="plans">Plans</TabsTrigger></TabsList>
          <TabsContent value="profile"><Section title="Personal profile" description="The essentials recruiters see first."><div className="form-grid"><Field label="Full name" value={data.fullName} onChange={(v) => update("fullName", v)} /><Field label="Professional headline" value={data.headline} onChange={(v) => update("headline", v)} placeholder="Product designer · Fintech" /><Field label="Email" type="email" value={data.email} onChange={(v) => update("email", v)} /><Field label="Phone" value={data.phone} onChange={(v) => update("phone", v)} /><Field label="City" value={data.city} onChange={(v) => update("city", v)} /><Field label="Country" value={data.country} onChange={(v) => update("country", v)} /></div><label className="field mt-5"><span>Professional summary</span><Textarea rows={6} value={data.professionalSummary} onChange={(e) => update("professionalSummary", e.target.value)} placeholder="Tell people what you do, what you care about and the impact you create." /><small>{data.professionalSummary.length}/4,000</small></label></Section></TabsContent>
          <TabsContent value="experience"><CollectionSection title="Work experience" description="Roles, responsibilities and measurable impact." action={() => update("experiences", [...data.experiences, emptyExperience()])} actionLabel="Add experience">{data.experiences.length === 0 ? <Empty label="No experience added yet" /> : data.experiences.map((row, index) => <RecordCard key={row.id} title={row.role || `Experience ${index + 1}`} onDelete={() => update("experiences", data.experiences.filter((item) => item.id !== row.id))}><div className="form-grid"><Field label="Role" value={row.role} onChange={(v) => update("experiences", data.experiences.map((item) => item.id === row.id ? { ...item, role: v } : item))} /><Field label="Company" value={row.company} onChange={(v) => update("experiences", data.experiences.map((item) => item.id === row.id ? { ...item, company: v } : item))} /><Field label="Location" value={row.location} onChange={(v) => update("experiences", data.experiences.map((item) => item.id === row.id ? { ...item, location: v } : item))} /><Field label="Start date" type="month" value={row.startDate} onChange={(v) => update("experiences", data.experiences.map((item) => item.id === row.id ? { ...item, startDate: v } : item))} /></div><label className="field mt-4"><span>Impact and responsibilities</span><Textarea value={row.description} onChange={(e) => update("experiences", data.experiences.map((item) => item.id === row.id ? { ...item, description: e.target.value } : item))} /></label></RecordCard>)}</CollectionSection></TabsContent>
          <TabsContent value="education"><CollectionSection title="Education" description="Qualifications, institutions and academic highlights." action={() => update("education", [...data.education, emptyEducation()])} actionLabel="Add education">{data.education.length === 0 ? <Empty label="No education added yet" /> : data.education.map((row, index) => <RecordCard key={row.id} title={row.qualification || `Education ${index + 1}`} onDelete={() => update("education", data.education.filter((item) => item.id !== row.id))}><div className="form-grid"><Field label="Institution" value={row.institution} onChange={(v) => update("education", data.education.map((item) => item.id === row.id ? { ...item, institution: v } : item))} /><Field label="Qualification" value={row.qualification} onChange={(v) => update("education", data.education.map((item) => item.id === row.id ? { ...item, qualification: v } : item))} /><Field label="Field of study" value={row.field} onChange={(v) => update("education", data.education.map((item) => item.id === row.id ? { ...item, field: v } : item))} /><Field label="Grade" value={row.grade} onChange={(v) => update("education", data.education.map((item) => item.id === row.id ? { ...item, grade: v } : item))} /></div></RecordCard>)}</CollectionSection></TabsContent>
          <TabsContent value="extras"><Section title="Skills & profile details" description="Everything that gives your work more context."><div className="flex flex-wrap gap-2">{(["skill", "project", "achievement", "certification", "language", "link"] as Item["itemType"][]).map((type) => <Button key={type} variant="outline" size="sm" onClick={() => addItem(type)}><Plus className="h-3.5 w-3.5" />{type[0].toUpperCase() + type.slice(1)}</Button>)}</div><div className="mt-5 space-y-3">{data.items.length === 0 ? <Empty label="Add skills, projects or achievements" /> : data.items.map((row) => <RecordCard key={row.id} title={row.title || row.itemType} onDelete={() => update("items", data.items.filter((item) => item.id !== row.id))}><div className="form-grid"><Field label="Title" value={row.title} onChange={(v) => update("items", data.items.map((item) => item.id === row.id ? { ...item, title: v } : item))} /><Field label="Supporting detail" value={row.subtitle} onChange={(v) => update("items", data.items.map((item) => item.id === row.id ? { ...item, subtitle: v } : item))} placeholder="Level, issuer or technology" /></div><label className="field mt-4"><span>Description</span><Textarea value={row.description} onChange={(e) => update("items", data.items.map((item) => item.id === row.id ? { ...item, description: e.target.value } : item))} /></label></RecordCard>)}</div></Section></TabsContent>
          <TabsContent value="publish"><Section title="Review and publish" description="Your free trial starts only after you complete these checks and press Publish."><Field label="Portfolio address" value={data.portfolioSlug} onChange={(v) => update("portfolioSlug", v.toLowerCase().replace(/[^a-z0-9-]/g, ""))} /><p className="mt-2 text-sm text-slate-500">findnext.vercel.app/p/{data.portfolioSlug || "your-name"}</p><div className="mt-6 rounded-xl border border-slate-200 p-4"><p className="text-sm font-semibold">Publishing checklist</p><div className="mt-3 space-y-2">{completionChecks.map((item) => <div key={item.label} className="flex items-center gap-2 text-sm"><span className={`grid h-5 w-5 place-items-center rounded-full ${item.done ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>{item.done ? <Check className="h-3.5 w-3.5" /> : "·"}</span>{item.label}</div>)}</div></div><label className="mt-5 flex items-start gap-3 rounded-xl border border-slate-200 p-4"><Checkbox checked={data.consentProfileStorage} onCheckedChange={(value) => update("consentProfileStorage", Boolean(value))} /><span><strong className="block text-sm">Save my profile and résumé securely</strong><small className="mt-1 block text-slate-500">Required so you can return, edit and maintain your portfolio.</small></span></label><label className="mt-3 flex items-start gap-3 rounded-xl border border-slate-200 p-4"><Checkbox checked={data.consentTalentDiscovery} onCheckedChange={(value) => update("consentTalentDiscovery", Boolean(value))} /><span><strong className="block text-sm">Let verified employers discover me</strong><small className="mt-1 block text-slate-500">Optional. This can be changed any time.</small></span></label><div className="mt-6 rounded-xl bg-slate-950 p-5 text-white"><p className="text-xs font-semibold uppercase tracking-[.16em] text-indigo-300">You’re in our circle</p><p className="mt-2 text-lg font-semibold">{data.isPublic ? "Your portfolio is live." : "Review it. Love it. Then make it live."}</p><p className="mt-2 text-sm leading-6 text-slate-300">All templates are included. Your seven free days begin only when you publish.</p><div className="mt-5 flex flex-wrap gap-3">{data.isPublic ? <Button variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/20" onClick={unpublish} disabled={saving}>Make private</Button> : <Button onClick={publish} disabled={saving || completion < 100}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}Publish & start free trial</Button>}<Button variant="ghost" className="text-white hover:bg-white/10 hover:text-white" asChild><a href={`/p/${data.portfolioSlug || "preview"}`} target="_blank" rel="noreferrer"><Eye className="h-4 w-4" />Preview first</a></Button></div></div></Section></TabsContent>
          <TabsContent value="plans"><PlansPanel email={data.email || account.email} /></TabsContent>
        </Tabs>
      </section>
      <aside className="hidden xl:block"><div className="sticky top-22 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_80px_rgba(30,41,59,.08)]"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><p className="text-sm font-semibold">Live preview</p><p className="text-xs text-slate-500">Updates as you type</p></div><Badge variant="outline">Studio</Badge></div><div className="preview-sheet"><div className="preview-accent" /><div className="p-7"><p className="text-xs font-semibold uppercase tracking-[.18em] text-indigo-600">Portfolio</p><h2 className="mt-6 text-3xl font-semibold tracking-[-.04em]">{data.fullName || "Your name"}</h2><p className="mt-2 text-base text-slate-500">{data.headline || "Your professional headline"}</p><p className="mt-6 text-sm leading-6 text-slate-600">{data.professionalSummary || "Your summary will appear here as you build your profile."}</p><div className="mt-8 border-t border-slate-100 pt-6"><p className="preview-label">Experience</p>{data.experiences.slice(0, 2).map((row) => <div key={row.id} className="mt-4"><p className="text-sm font-semibold">{row.role || "Role"}</p><p className="text-xs text-slate-500">{row.company || "Company"}</p></div>)}{data.experiences.length === 0 && <p className="mt-3 text-sm text-slate-400">Add your work history</p>}</div><div className="mt-7"><p className="preview-label">Skills</p><div className="mt-3 flex flex-wrap gap-2">{skills.slice(0, 6).map((skill) => <span key={skill.id} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium">{skill.title || "Skill"}</span>)}</div></div>{links.length > 0 && <div className="mt-8 flex flex-wrap gap-3">{links.slice(0, 3).map((link) => <span key={link.id} className="text-xs font-semibold text-indigo-600">{link.title}</span>)}</div>}</div></div></div></aside>
    </div>
  </main>;
}

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) { return <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7"><h2 className="text-xl font-semibold tracking-[-.02em]">{title}</h2><p className="mt-1 text-sm text-slate-500">{description}</p><div className="mt-6">{children}</div></div>; }
function CollectionSection({ title, description, action, actionLabel, children }: { title: string; description: string; action: () => void; actionLabel: string; children: React.ReactNode }) { return <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7"><div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-semibold tracking-[-.02em]">{title}</h2><p className="mt-1 text-sm text-slate-500">{description}</p></div><Button variant="outline" onClick={action}><Plus className="h-4 w-4" />{actionLabel}</Button></div><div className="mt-6 space-y-4">{children}</div></div>; }
function RecordCard({ title, onDelete, children }: { title: string; onDelete: () => void; children: React.ReactNode }) { return <article className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5"><div className="mb-5 flex items-center justify-between"><h3 className="font-semibold capitalize">{title}</h3><Button variant="ghost" size="icon" onClick={onDelete} aria-label={`Delete ${title}`}><Trash2 className="h-4 w-4 text-slate-500" /></Button></div>{children}</article>; }
function Empty({ label }: { label: string }) { return <div className="grid min-h-28 place-items-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">{label}</div>; }
