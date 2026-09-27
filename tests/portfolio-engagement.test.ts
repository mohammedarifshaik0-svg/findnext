import assert from "node:assert/strict";
import { isEngagementEventType, resolveEngagementTarget } from "../lib/portfolio-engagement.ts";

const snapshot = {
  profile: { email: "jane@example.com" },
  resume: { storage_path: "profiles/jane/resume.pdf" },
  items: [{ id: "project-1", title: "Live product", url: "https://example.com/product" }],
  customSections: [{ items: [{ id: "award-1", title: "Award proof", url: "https://example.com/award" }] }],
  showcases: [{
    id: "showcase-1",
    slug: "revenue-growth",
    title: "Revenue growth",
    is_enabled: true,
    links: [{ id: "link-1", label: "GitHub repository", url: "https://github.com/example/project" }],
    media: [{ id: "media-1", assetId: "asset-1", caption: "Dashboard result" }],
  }],
};

assert.equal(isEngagementEventType("showcase_view"), true);
assert.equal(isEngagementEventType("portfolio_view"), false);

assert.deepEqual(resolveEngagementTarget(snapshot, "contact_click", ""), { key: "contact", label: "Contact" });
assert.deepEqual(resolveEngagementTarget(snapshot, "resume_download", ""), { key: "resume", label: "Résumé download" });
assert.deepEqual(resolveEngagementTarget(snapshot, "showcase_view", "revenue-growth"), { key: "showcase:revenue-growth", label: "Revenue growth" });
assert.deepEqual(resolveEngagementTarget(snapshot, "evidence_open", "media-1"), { key: "evidence:revenue-growth:media-1", label: "Dashboard result" });
assert.deepEqual(resolveEngagementTarget(snapshot, "external_link_click", "https://example.com/product"), { key: "external:example.com", label: "Live product" });

assert.equal(resolveEngagementTarget(snapshot, "showcase_view", "unknown"), null);
assert.equal(resolveEngagementTarget(snapshot, "evidence_open", "unknown"), null);
assert.equal(resolveEngagementTarget(snapshot, "external_link_click", "https://attacker.example/"), null);
assert.equal(resolveEngagementTarget({ profile: {} }, "contact_click", ""), null);
