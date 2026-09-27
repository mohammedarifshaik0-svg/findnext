"use client";

import { ChevronDown, ChevronUp, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { CustomSection, CustomSectionItem } from "@/lib/phase2-showcases";

const id = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;
const newItem = (): CustomSectionItem => ({ id: id("custom_item"), title: "", subtitle: "", description: "", url: "", dateLabel: "" });
const newSection = (): CustomSection => ({ id: id("custom_section"), title: "", description: "", layout: "cards", isVisible: true, items: [newItem()] });

function move<T>(rows: T[], index: number, direction: -1 | 1) {
  const target = index + direction;
  if (target < 0 || target >= rows.length) return rows;
  const next = [...rows];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export function CustomSectionsBuilder({ sections, limit, onChange }: { sections: CustomSection[]; limit: number | null; onChange: (sections: CustomSection[]) => void }) {
  const canAdd = limit === null || sections.length < limit;
  const updateSection = (sectionId: string, patch: Partial<CustomSection>) => onChange(sections.map((section) => section.id === sectionId ? { ...section, ...patch } : section));
  return (
    <div>
      <div className="vxl-custom-section-toolbar">
        <div><strong>{sections.length}{limit === null ? "" : ` / ${limit}`} sections</strong><p>{limit === null ? "Care includes unlimited custom sections, subject to safe-use limits." : "Flex includes up to five custom sections."}</p></div>
        <Button type="button" variant="outline" onClick={() => canAdd && onChange([...sections, newSection()])} disabled={!canAdd}><Plus className="h-4 w-4" />Add section</Button>
      </div>
      {!sections.length && <div className="vxl-showcase-empty mt-4"><Plus /><div><strong>Create a section recruiters will remember</strong><p>Add awards, publications, volunteering, speaking, services, communities or anything your résumé structure cannot express.</p></div></div>}
      <div className="mt-4 space-y-4">
        {sections.map((section, sectionIndex) => (
          <article className="vxl-custom-section-editor" key={section.id}>
            <header>
              <div><span>CUSTOM SECTION {String(sectionIndex + 1).padStart(2, "0")}</span><h3>{section.title || "Untitled section"}</h3></div>
              <div className="flex items-center gap-1">
                <Button type="button" variant="ghost" size="icon" aria-label="Move section up" disabled={sectionIndex === 0} onClick={() => onChange(move(sections, sectionIndex, -1))}><ChevronUp /></Button>
                <Button type="button" variant="ghost" size="icon" aria-label="Move section down" disabled={sectionIndex === sections.length - 1} onClick={() => onChange(move(sections, sectionIndex, 1))}><ChevronDown /></Button>
                <Button type="button" variant="ghost" size="icon" aria-label="Delete section" onClick={() => onChange(sections.filter((row) => row.id !== section.id))}><Trash2 /></Button>
              </div>
            </header>
            <div className="form-grid mt-5">
              <label className="field"><span>Section title</span><Input value={section.title} onChange={(event) => updateSection(section.id, { title: event.target.value })} placeholder="Awards, Volunteering, Publications…" /></label>
              <label className="field"><span>Layout</span><select value={section.layout} onChange={(event) => updateSection(section.id, { layout: event.target.value as CustomSection["layout"] })}><option value="cards">Cards</option><option value="list">List</option><option value="timeline">Timeline</option></select></label>
            </div>
            <label className="field mt-4"><span>Section introduction</span><Textarea rows={2} value={section.description} onChange={(event) => updateSection(section.id, { description: event.target.value })} placeholder="Optional context for this part of your story." /></label>
            <label className="vxl-custom-visibility"><Checkbox checked={section.isVisible} onCheckedChange={(value) => updateSection(section.id, { isVisible: Boolean(value) })} />{section.isVisible ? <Eye /> : <EyeOff />}<span>{section.isVisible ? "Included when published" : "Hidden from the public portfolio"}</span></label>
            <div className="vxl-custom-items">
              <div className="vxl-showcase-assets-title"><span>Section entries</span><Button type="button" variant="outline" size="sm" disabled={section.items.length >= 20} onClick={() => updateSection(section.id, { items: [...section.items, newItem()] })}><Plus />Add entry</Button></div>
              {section.items.map((item, itemIndex) => (
                <div className="vxl-custom-item" key={item.id}>
                  <div className="vxl-custom-item-heading"><strong>Entry {itemIndex + 1}</strong><Button type="button" variant="ghost" size="icon" aria-label="Delete entry" onClick={() => updateSection(section.id, { items: section.items.filter((row) => row.id !== item.id) })}><Trash2 /></Button></div>
                  <div className="form-grid"><label className="field"><span>Title</span><Input value={item.title} onChange={(event) => updateSection(section.id, { items: section.items.map((row) => row.id === item.id ? { ...row, title: event.target.value } : row) })} /></label><label className="field"><span>Supporting detail</span><Input value={item.subtitle} onChange={(event) => updateSection(section.id, { items: section.items.map((row) => row.id === item.id ? { ...row, subtitle: event.target.value } : row) })} /></label></div>
                  <div className="form-grid mt-3"><label className="field"><span>Date or label</span><Input value={item.dateLabel} onChange={(event) => updateSection(section.id, { items: section.items.map((row) => row.id === item.id ? { ...row, dateLabel: event.target.value } : row) })} placeholder="2026, Ongoing, Winner…" /></label><label className="field"><span>Evidence link</span><Input type="url" value={item.url} onChange={(event) => updateSection(section.id, { items: section.items.map((row) => row.id === item.id ? { ...row, url: event.target.value } : row) })} placeholder="https://" /></label></div>
                  <label className="field mt-3"><span>Description</span><Textarea rows={3} value={item.description} onChange={(event) => updateSection(section.id, { items: section.items.map((row) => row.id === item.id ? { ...row, description: event.target.value } : row) })} /></label>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
