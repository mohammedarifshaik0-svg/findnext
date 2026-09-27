"use client";

import { ExternalLink, ImageIcon, Link2, Loader2, Plus, Sparkles, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { showcaseSlug, type PortfolioShowcase, type ShowcaseLink, type ShowcaseMedia } from "@/lib/phase2-showcases";

type Project = { id: string; title: string; subtitle: string; description: string };

const id = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;
const emptyShowcase = (project: Project): PortfolioShowcase => ({
  id: id("showcase"),
  sourceType: "project",
  sourceId: project.id,
  slug: showcaseSlug(project.title, "project"),
  title: project.title,
  summary: project.description,
  challenge: "",
  approach: "",
  outcome: "",
  links: [],
  media: [],
  isEnabled: false,
});

function updateRow(rows: PortfolioShowcase[], next: PortfolioShowcase) {
  return rows.some((row) => row.sourceId === next.sourceId)
    ? rows.map((row) => row.sourceId === next.sourceId ? next : row)
    : [...rows, next];
}

export function ShowcaseBuilder({ projects, showcases, uploadingId, onChange, onUpload, onRemoveAsset }: { projects: Project[]; showcases: PortfolioShowcase[]; uploadingId: string | null; onChange: (rows: PortfolioShowcase[]) => void; onUpload: (showcase: PortfolioShowcase, file: File) => void; onRemoveAsset: (showcase: PortfolioShowcase, media: ShowcaseMedia) => void }) {
  if (!projects.length) return <div className="vxl-showcase-empty"><Sparkles /><div><strong>Add a project first</strong><p>Portfolio Showcases turn an existing project into a deeper, evidence-led case study.</p></div></div>;

  return (
    <div className="space-y-4">
      {projects.map((project) => {
        const showcase = showcases.find((row) => row.sourceId === project.id) ?? emptyShowcase(project);
        const set = (patch: Partial<PortfolioShowcase>) => onChange(updateRow(showcases, { ...showcase, ...patch }));
        const addLink = () => set({ links: [...showcase.links, { id: id("link"), label: "", url: "", kind: "other" }] });
        const addMedia = () => set({ media: [...showcase.media, { id: id("media"), url: "", alt: "", caption: "" }] });
        return (
          <article className="vxl-showcase-editor" key={project.id}>
            <header>
              <div><span>PROJECT SHOWCASE</span><h3>{project.title || "Untitled project"}</h3><p>{project.subtitle || "Add deeper context, proof and outcomes."}</p></div>
              <label className="vxl-showcase-toggle"><Checkbox checked={showcase.isEnabled} onCheckedChange={(value) => set({ isEnabled: Boolean(value) })} /><span>Include when published</span></label>
            </header>
            <div className="form-grid mt-5">
              <label className="field"><span>Showcase title</span><Input value={showcase.title} onChange={(event) => set({ title: event.target.value })} /></label>
              <label className="field"><span>Detail-page address</span><Input value={showcase.slug} onChange={(event) => set({ slug: showcaseSlug(event.target.value) })} /></label>
            </div>
            <label className="field mt-4"><span>Opening summary</span><Textarea rows={3} value={showcase.summary} onChange={(event) => set({ summary: event.target.value })} placeholder="Give recruiters the 20-second version of this work." /></label>
            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              {(["challenge", "approach", "outcome"] as const).map((field) => <label className="field" key={field}><span>{field[0].toUpperCase() + field.slice(1)}</span><Textarea rows={5} value={showcase[field]} onChange={(event) => set({ [field]: event.target.value })} placeholder={field === "outcome" ? "Use measurable results where possible." : `Explain the ${field}.`} /></label>)}
            </div>
            <div className="vxl-showcase-assets">
              <div>
                <div className="vxl-showcase-assets-title"><span><Link2 />Evidence and links</span><Button type="button" variant="outline" size="sm" onClick={addLink}><Plus />Add link</Button></div>
                {showcase.links.map((link: ShowcaseLink) => <div className="vxl-showcase-asset-row" key={link.id}><Input aria-label="Link label" placeholder="GitHub, live site or credential" value={link.label} onChange={(event) => set({ links: showcase.links.map((row) => row.id === link.id ? { ...row, label: event.target.value } : row) })} /><Input type="url" aria-label="Secure link URL" placeholder="https://" value={link.url} onChange={(event) => set({ links: showcase.links.map((row) => row.id === link.id ? { ...row, url: event.target.value } : row) })} /><Button type="button" variant="ghost" size="icon" aria-label="Remove link" onClick={() => set({ links: showcase.links.filter((row) => row.id !== link.id) })}><Trash2 /></Button></div>)}
              </div>
              <div>
                <div className="vxl-showcase-assets-title"><span><ImageIcon />Files and screenshots</span><div className="flex gap-2"><label className="vxl-upload-action">{uploadingId === showcase.id ? <Loader2 className="animate-spin" /> : <Upload />}Upload<input type="file" className="sr-only" accept="image/jpeg,image/png,image/webp,application/pdf" disabled={Boolean(uploadingId) || showcase.media.length >= 10} onChange={(event) => { const file = event.target.files?.[0]; if (file) onUpload(showcase, file); event.target.value = ""; }} /></label><Button type="button" variant="outline" size="sm" disabled={showcase.media.length >= 10} onClick={addMedia}><Plus />External image</Button></div></div>
                {showcase.media.map((media: ShowcaseMedia) => <div className="vxl-showcase-asset-row" key={media.id}>{media.assetId ? <div className="vxl-uploaded-file"><strong>{media.name || "Uploaded file"}</strong><span>{media.kind === "document" ? "Private PDF" : "Private image"}</span></div> : <Input type="url" aria-label="Secure image URL" placeholder="HTTPS image URL" value={media.url} onChange={(event) => set({ media: showcase.media.map((row) => row.id === media.id ? { ...row, url: event.target.value } : row) })} />}<Input aria-label="Image description" placeholder={media.kind === "document" ? "Describe this document" : "Describe this image"} value={media.alt} onChange={(event) => set({ media: showcase.media.map((row) => row.id === media.id ? { ...row, alt: event.target.value } : row) })} /><Button type="button" variant="ghost" size="icon" aria-label="Remove file from draft" onClick={() => media.assetId ? onRemoveAsset(showcase, media) : set({ media: showcase.media.filter((row) => row.id !== media.id) })}><Trash2 /></Button></div>)}
              </div>
            </div>
            {showcase.isEnabled && <p className="vxl-showcase-ready"><ExternalLink />Visitors will see “Explore project” after your next publish.</p>}
          </article>
        );
      })}
    </div>
  );
}
