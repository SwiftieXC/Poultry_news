import assert from "node:assert/strict";
import { after, test } from "node:test";
import { MockAgent, getGlobalDispatcher, setGlobalDispatcher } from "undici";
import { config } from "@aihot/backend/config";
import { extractFromUrl, isSignInRedirect, isSignInUrl, readable } from "@aihot/backend/content/extract";
import { fromHtml, fromMarkdown } from "@aihot/backend/sources/web-list";
import type { SourceRow } from "@aihot/backend/sources/types";

const previousDispatcher = getGlobalDispatcher();
const previousPrivate = config.allowPrivateNetworkFetch;
const previousProxy = config.egressProxyUrl;
const mockAgent = new MockAgent();
mockAgent.disableNetConnect();
setGlobalDispatcher(mockAgent);
config.allowPrivateNetworkFetch = true;
config.egressProxyUrl = null;

after(async () => {
  config.allowPrivateNetworkFetch = previousPrivate;
  config.egressProxyUrl = previousProxy;
  setGlobalDispatcher(previousDispatcher);
  await mockAgent.close();
});

const origin = "https://publisher.invalid";
const loginText = "Sign in to your account with your email address and password to continue. ".repeat(8);
const loginPage = `<html><head><title>Sign in to Example</title></head><body><article><h1>Sign in to Example</h1><p>${loginText}</p></article></body></html>`;
const articleText = "A report explains how password managers help users sign in securely and prevent account takeover. ".repeat(5);
const articlePage = `<html><head><title>Password manager safety report</title></head><body><article><h1>Password manager safety report</h1><p>${articleText}</p></article></body></html>`;
const registerPage = `<html><head><title>Certified poultry products register</title></head><body><article><h1>Certified poultry products register</h1><p>${articleText}</p></article></body></html>`;
const source = { id: "signin-filter", kind: "web_list", config: { url: `${origin}/listing` } } as never as SourceRow;

test("sign-in paths match complete path segments and redirects preserve the register slash case", () => {
  for (const path of ["/login", "/account/sign-up", "/oauth/authorize", "/sso", "/auth"]) {
    assert.equal(isSignInUrl(`${origin}${path}`), true, path);
  }
  for (const path of ["/auth-for-agents", "/authors/market-news", "/signing-in-guide"]) {
    assert.equal(isSignInUrl(`${origin}${path}`), false, path);
  }
  assert.equal(isSignInRedirect(`${origin}/papers/123`, `${origin}/login?next=%2Fpapers%2F123`), true);
  assert.equal(isSignInRedirect(`${origin}/brand/register`, `${origin}/brand/register/`), false);
  assert.equal(isSignInRedirect(`${origin}/authors/market-news`, `${origin}/authors/market-news/`), false);
});

test("HTML and Markdown listing navigation omits login and registration links", () => {
  const html = `<article><a href="/poultry-report">Poultry trade report</a></article><nav><a href="/login">Log in</a><a href="/signup">Sign up</a></nav>`;
  const markdown = `[Poultry trade report](${origin}/poultry-report)\n[Log in](${origin}/login)\n[Sign up](${origin}/signup)`;
  assert.deepEqual(fromHtml(html, `${origin}/listing`, source).map((item) => item.url), [`${origin}/poultry-report`]);
  assert.deepEqual(fromMarkdown(markdown, `${origin}/listing`, source).map((item) => item.url), [`${origin}/poultry-report`]);
});

test("a sign-in redirect is rejected while an article about signing in remains extractable", async () => {
  mockAgent.get(origin).intercept({ path: "/papers/123" }).reply(302, "", { headers: { location: "/login?next=%2Fpapers%2F123" } });
  mockAgent.get(origin).intercept({ path: "/login?next=%2Fpapers%2F123" }).reply(200, loginPage, { headers: { "content-type": "text/html" } });
  mockAgent.get(origin).intercept({ path: "/password-report" }).reply(200, articlePage, { headers: { "content-type": "text/html" } });
  mockAgent.get(origin).intercept({ path: "/brand/register" }).reply(301, "", { headers: { location: "/brand/register/" } });
  mockAgent.get(origin).intercept({ path: "/brand/register/" }).reply(200, registerPage, { headers: { "content-type": "text/html" } });

  assert.ok(readable(loginPage, `${origin}/login`), "the login form itself passes ordinary body-length checks");
  assert.equal(await extractFromUrl(`${origin}/papers/123`, "article:signin-redirect"), null);
  const article = await extractFromUrl(`${origin}/password-report`, "article:password-report");
  assert.ok(article?.text.includes("password managers"));
  const registry = await extractFromUrl(`${origin}/brand/register`, "article:register-page");
  assert.ok(registry?.text.includes("password managers"), "the registry page survives its trailing-slash redirect");
});
