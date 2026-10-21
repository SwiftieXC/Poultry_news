import assert from "node:assert/strict";
import { test } from "node:test";
import { readable } from "@aihot/backend/content/extract";

const prose = "The audit is favorable, but shipments remain suspended until the regulatory process is complete. ".repeat(8);
const consent = "CONSENT_ONLY: We store cookies and process device information. Choose whether to accept these privacy settings. ".repeat(24);
const page = (article: string, consentBoxes: string) =>
  `<html><head><title>Export audit</title></head><body><div class="elementor-widget-theme-post-content"><p>${article}</p></div>${consentBoxes}</body></html>`;

test("WP RGPD consent boxes cannot replace or contaminate an article body", () => {
  for (const id of ["rgpdCustomBox", "myModalrgpd"]) {
    const result = readable(page(prose, `<div id="${id}"><p>${consent}</p></div>`), "https://example.org/audit");
    assert.ok(result, id);
    assert.ok(result.text.includes("shipments remain suspended"), id);
    assert.ok(!result.text.includes("CONSENT_ONLY"), id);
  }
});

test("a page with only WP RGPD consent text supplies no confirmed body", () => {
  assert.equal(readable(page("", `<div id="rgpdCustomBox"><p>${consent}</p></div><div id="myModalrgpd"><p>${consent}</p></div>`), "https://example.org/audit"), null);
});

test("ordinary reporting about cookies is preserved", () => {
  const article = "Reporting about cookie policies and privacy rules, with the audit's original evidence. ".repeat(8);
  const result = readable(page(article, ""), "https://example.org/audit");
  assert.ok(result?.text.includes("cookie policies"));
});
