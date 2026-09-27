import assert from "node:assert/strict";
import { customDomainDestination, isVxlPlatformHost, normalizeCustomDomain, requestHostname } from "../lib/custom-domains.ts";

assert.equal(normalizeCustomDomain(" Portfolio.Example.COM. "), "portfolio.example.com");
assert.equal(normalizeCustomDomain("xn--bcher-kva.example"), "xn--bcher-kva.example");
assert.equal(normalizeCustomDomain("https://example.com"), null);
assert.equal(normalizeCustomDomain("example.com/path"), null);
assert.equal(normalizeCustomDomain("localhost"), null);
assert.equal(normalizeCustomDomain("thevxl.com"), null);
assert.equal(normalizeCustomDomain("profile.thevxl.com"), null);
assert.equal(normalizeCustomDomain("preview.vercel.app"), null);
assert.equal(normalizeCustomDomain("bad_label.example"), null);
assert.equal(normalizeCustomDomain("-bad.example"), null);
assert.equal(normalizeCustomDomain("bad..example"), null);

assert.equal(requestHostname(new Headers({ "x-forwarded-host": "Portfolio.Example.com:443, proxy.internal" })), "portfolio.example.com");
assert.equal(isVxlPlatformHost("www.thevxl.com"), true);
assert.equal(isVxlPlatformHost("vxl-preview.vercel.app"), true);
assert.equal(isVxlPlatformHost("portfolio.example.com"), false);

assert.equal(customDomainDestination("/", "jane-doe"), "/p/jane-doe");
assert.equal(customDomainDestination("/resume", "jane-doe"), "/p/jane-doe/resume");
assert.equal(customDomainDestination("/photo", "jane-doe"), "/p/jane-doe/photo");
assert.equal(customDomainDestination("/showcase/revenue-growth", "jane-doe"), "/p/jane-doe/showcase/revenue-growth");
assert.equal(customDomainDestination("/pricing", "jane-doe"), null);
assert.equal(customDomainDestination("/", ""), null);
