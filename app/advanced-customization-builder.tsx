"use client";

import { ChevronDown, ChevronUp, LayoutGrid, MoveVertical, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { advancedSectionKeys, type AdvancedCustomization, type AdvancedSectionKey, type SectionTreatment } from "@/lib/phase2-showcases";

const labels: Record<AdvancedSectionKey, string> = {
  story: "Profile story",
  skills: "Skills",
  experience: "Experience",
  projects: "Projects & proof",
  education: "Education",
  custom: "Custom sections",
};

function move<T>(rows: T[], index: number, direction: -1 | 1) {
  const target = index + direction;
  if (target < 0 || target >= rows.length) return rows;
  const next = [...rows];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

function Choice<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: Array<{ value: T; label: string; hint: string }>; onChange: (value: T) => void }) {
  return (
    <fieldset className="vxl-advanced-choice">
      <legend>{label}</legend>
      <div>
        {options.map((option) => (
          <button type="button" key={option.value} className={value === option.value ? "active" : ""} onClick={() => onChange(option.value)} aria-pressed={value === option.value}>
            <strong>{option.label}</strong><span>{option.hint}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function AdvancedCustomizationBuilder({ value, onChange }: { value: AdvancedCustomization; onChange: (value: AdvancedCustomization) => void }) {
  const patch = <K extends keyof AdvancedCustomization>(key: K, next: AdvancedCustomization[K]) => onChange({ ...value, [key]: next });
  return (
    <div className="vxl-advanced-builder">
      <div className="vxl-context-note"><Sparkles /><div><strong>Design direction, without design debt</strong><p>These choices work across every VXL template and remain reversible. Your live portfolio changes only when you publish.</p></div></div>
      <div className="vxl-advanced-grid">
        <Choice label="Spacing density" value={value.density} onChange={(next) => patch("density", next)} options={[{ value: "compact", label: "Compact", hint: "More proof above the fold" }, { value: "balanced", label: "Balanced", hint: "Comfortable professional rhythm" }, { value: "spacious", label: "Spacious", hint: "Editorial, high-impact pacing" }]} />
        <Choice label="Corner character" value={value.cornerStyle} onChange={(next) => patch("cornerStyle", next)} options={[{ value: "sharp", label: "Sharp", hint: "Precise and technical" }, { value: "soft", label: "Soft", hint: "Subtle modern rounding" }, { value: "rounded", label: "Rounded", hint: "Friendly and expressive" }]} />
        <Choice label="Heading voice" value={value.headingStyle} onChange={(next) => patch("headingStyle", next)} options={[{ value: "editorial", label: "Editorial", hint: "Serif-led narrative" }, { value: "modern", label: "Modern", hint: "Clean contemporary type" }, { value: "statement", label: "Statement", hint: "Bold uppercase presence" }]} />
        <Choice label="Showcase presentation" value={value.showcaseStyle} onChange={(next) => patch("showcaseStyle", next)} options={[{ value: "immersive", label: "Immersive", hint: "Large visual case study" }, { value: "minimal", label: "Minimal", hint: "Outcome and writing first" }, { value: "grid", label: "Grid", hint: "Evidence gallery first" }]} />
      </div>
      <div className="vxl-advanced-order">
        <header><div><span>PORTFOLIO FLOW</span><h3>Choose what recruiters see first</h3><p>Move whole content groups and give each one a quiet, tinted or outlined treatment.</p></div><MoveVertical /></header>
        <div>
          {value.sectionOrder.map((key, index) => (
            <article key={key}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{labels[key]}</strong>
              <label><span className="sr-only">{labels[key]} treatment</span><select value={value.sectionTreatments[key]} onChange={(event) => patch("sectionTreatments", { ...value.sectionTreatments, [key]: event.target.value as SectionTreatment })}><option value="plain">Plain</option><option value="tinted">Tinted</option><option value="outline">Outlined</option></select></label>
              <div><Button type="button" variant="ghost" size="icon" aria-label={`Move ${labels[key]} up`} disabled={index === 0} onClick={() => patch("sectionOrder", move(value.sectionOrder, index, -1))}><ChevronUp /></Button><Button type="button" variant="ghost" size="icon" aria-label={`Move ${labels[key]} down`} disabled={index === value.sectionOrder.length - 1} onClick={() => patch("sectionOrder", move(value.sectionOrder, index, 1))}><ChevronDown /></Button></div>
            </article>
          ))}
        </div>
      </div>
      <div className="vxl-advanced-summary"><LayoutGrid /><div><strong>{advancedSectionKeys.length} adaptable content groups</strong><p>Empty groups stay hidden automatically, so this order remains useful as your portfolio grows.</p></div></div>
    </div>
  );
}
