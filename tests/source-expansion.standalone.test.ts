import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import http from 'node:http';
import { parseLooseDate } from '@aihot/backend/sources/dates';
import { fetchDetail, fromHtml } from '@aihot/backend/sources/web-list';
import { noiseFiltered } from '@aihot/backend/sources/filters';
import { config } from '@aihot/backend/config';

const sources = JSON.parse(readFileSync('industry/sources.json', 'utf8')).sources;
const source = (id: string) => sources.find((item: { id: string }) => item.id === id);

test('Poultry Times media is T2 and rejects sponsored articles even when their title contains a trade exemption', () => {
  const configured = source('poultrytimes-news');
  const sponsored = { title: 'Poultry exports and processing capacity', categories: ['Sponsored Content'], url: 'https://www.poultrytimes.com/sponsored-trade/' } as never;
  assert.equal(noiseFiltered(sponsored, configured), true);
  assert.equal(noiseFiltered({ title: 'Hormel enters agreement to acquire Brakebush', categories: ['Business'] } as never, configured), false);
  assert.equal(noiseFiltered({ title: 'Emily Metz named an award recipient', categories: ['Associations & Federations'] } as never, configured), true);
  assert.equal(configured.tier, 'T2');
  assert.equal(configured.site_fulltext, false);
  assert.equal(configured.syndicate_fulltext, false);
});

test('Wellhope dated cards separate titles from excerpts and keep substantive broiler export meetings', () => {
  const html = '<nav><a href="https://en.wellhope-ag.com/news/hfxw9ec/">News</a></nav><ul class="xypg-news-list">'
    + '<li><a href="https://en.wellhope-ag.com/news/2203.html"><div class="tit"><h3>Meeting to Advance Raw Broiler Exports</h3><div class="date">2026-08-20 14:16:52</div></div><div class="info">Business background</div><div class="more">Read More +</div></a></li>'
    + '<li><a href="https://en.wellhope-ag.com/news/2202.html"><div class="tit"><h3>Wellhope Named to the Fortune China 500</h3><div class="date">2026-08-05 16:33:00</div></div></a></li>'
    + '<li><a href="https://en.wellhope-ag.com/news/2197.html"><div class="tit"><h3>Wellhope Enters the EU Egg Products Market</h3><div class="date">2026-01-21 15:53:17</div></div></a></li></ul>';
  const configured = source('wellhope-news');
  const items = fromHtml(html, configured.config.url, configured);
  assert.equal(items.length, 3);
  assert.equal(items[0]?.title, 'Meeting to Advance Raw Broiler Exports');
  assert.equal(items[0]?.publishedAt?.toISOString(), '2026-08-20T06:16:52.000Z');
  assert.equal(noiseFiltered(items[0]!, configured), false);
  assert.equal(noiseFiltered(items[1]!, configured), true);
  assert.equal(noiseFiltered(items[2]!, configured), true);
  assert.equal(configured.site_fulltext, false);
  assert.equal(configured.syndicate_fulltext, false);
});

test('MHLW import-watch config reads dated HTML announcements without treating PDFs or navigation as articles', () => {
  const html = '<a href="/stf/seisakunitsuite/bunya/kenkou_iryou/shokuhin/">Food</a><ul class="m-listNews">'
    + '<li><a href="/stf/newpage_75846.html"><time datetime="2026-08-28">2026年8月28日掲載</time><div class="m-listNews__txt"><span>輸入食品監視統計</span><em>NEW</em></div></a></li>'
    + '<li><a href="/content/11135200/001743305.pdf"><time datetime="2026-08-28">2026年8月28日</time><div class="m-listNews__txt"><span>PDF attachment</span></div></a></li></ul>';
  const items = fromHtml(html, source('mhlw-import-watch').config.url, source('mhlw-import-watch'));
  assert.equal(items.length, 1);
  assert.equal(items[0]?.title, '輸入食品監視統計');
  assert.equal(items[0]?.url, 'https://www.mhlw.go.jp/stf/newpage_75846.html');
  assert.equal(items[0]?.publishedAt?.toISOString(), '2026-08-28T00:00:00.000Z');
  assert.equal(source('mhlw-import-watch').kind, 'web_list', 'the restricted RSS feed is not used');
});

test('a publication field split into adjacent year, month and day spans keeps its calendar date', () => {
  const source = { id: 'date-fixture', config: { url: 'https://example.org/news', itemSelector: '.newsList .dec', linkSelector: 'h2 a', titleSelector: 'h2 a', publishedAtSelector: '.g_date', publishedAtUtcOffset: '+08:00' } } as never;
  const html = '<div class="newsList"><div class="dec"><div class="g_date"><span>2026</span><span>10</span><span>12</span></div><h2><a href="/news/notice">Export capacity notice</a></h2></div></div>';
  const items = fromHtml(html, 'https://example.org/news', source);
  assert.equal(items[0]?.publishedAt?.toISOString(), '2026-10-11T16:00:00.000Z');
});

test('Fengxiang config takes a single title, unique article URL and publication field from each card', () => {
  const html = '<nav><a href="/index/news/index.html">News</a></nav><div class="newsList"><div class="dec"><div class="pic"><a href="/index/news/details/id/10/tab/0.html">Picture</a></div><div class="g_date"><span>2026</span><span>10</span><span>12</span></div><div class="title"><h2><a href="/index/news/details/id/10/tab/0.html">出口产能公告</a></h2></div><a href="/index/news/details/id/10/tab/0.html">Excerpt</a></div></div>';
  const items = fromHtml(html, source('fengxiang-news').config.url, source('fengxiang-news'));
  assert.equal(items.length, 1);
  assert.equal(items[0]?.title, '出口产能公告');
  assert.equal(items[0]?.url, 'https://www.fengxiang.com/index/news/details/id/10/tab/0.html');
  assert.equal(items[0]?.publishedAt?.toISOString(), '2026-10-11T16:00:00.000Z');
});

test('Almarai cards deduplicate carousel clones and use headings instead of Read More', () => {
  const card = '<div class="storiesWrapper"><div class="date">06/10/2026</div><h4>Poultry capacity expansion</h4><a class="btn-cta" href="/en/corporate/media-center/almarai-news/expansion">Read More</a></div>';
  const older = '<div class="blocItem"><h4>Older poultry release</h4><a class="btn-cta" href="/en/corporate/media-center/almarai-news/older">Read More</a></div>';
  const items = fromHtml(card + card + older, source('almarai-news').config.url, source('almarai-news'));
  assert.equal(items.length, 2);
  assert.equal(items[0]?.title, 'Poultry capacity expansion');
  assert.equal(items[0]?.publishedAt, null, 'ambiguous day/month text is not inferred');
});

test('Almarai detail reads authoritative publication metadata, ignoring dates of related stories', async () => {
  const server = http.createServer((_request, response) => {
    response.setHeader('content-type', 'text/html; charset=utf-8');
    response.end('<html><head><meta property="article:published_time" content="2026-10-06T00:00:00"></head><body><article><h1>Poultry expansion</h1><p>' + 'New poultry production capacity was announced. '.repeat(20) + '</p></article><aside><div class="date">08/10/2026</div></aside></body></html>');
  });
  const previous = config.allowPrivateNetworkFetch;
  try {
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    config.allowPrivateNetworkFetch = true;
    const { port } = server.address() as { port: number };
    const detail = await fetchDetail(`http://127.0.0.1:${port}/article`, source('almarai-news'), { date: true, title: false, summary: false, body: true });
    assert.equal(detail.publishedAt?.toISOString(), '2026-10-05T21:00:00.000Z');
    assert.match(detail.body?.text ?? '', /New poultry production capacity/);
  } finally {
    config.allowPrivateNetworkFetch = previous;
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});

test('new sources exclude obvious promotions while preserving supply, price and export actions', () => {
  for (const [id, excluded, kept] of [
    ['fengxiang-news', '急救 AED 培训', '无疫区促进出口'],
    ['nichirei-foods-news', '新TVCMを公開', '価格改定と安定供給'],
    ['almarai-news', 'Talent Development Awards', 'Poultry capacity investment'],
  ]) {
    assert.equal(noiseFiltered({ title: excluded } as never, source(id)), true, id);
    assert.equal(noiseFiltered({ title: kept } as never, source(id)), false, id);
  }
  assert.equal(noiseFiltered({ title: 'システム障害についてのWebCM' } as never, source('nichirei-foods-news')), false, 'a supply disruption is not lost to a promotion marker');
});

test('compact calendar fields reject impossible days, partial dates and embedded identifiers', () => {
  assert.equal(parseLooseDate('20240229', '+09:00')?.toISOString(), '2024-02-28T15:00:00.000Z');
  for (const value of ['20260229', '20260230', '20261301', '202610', '1202610123', 'v20261012', 'id:20261012']) assert.equal(parseLooseDate(value), null, value);
  assert.equal(parseLooseDate('2026-10-12')?.toISOString(), '2026-10-12T00:00:00.000Z');
});
