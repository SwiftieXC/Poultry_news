import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { test } from 'node:test';
import { CATEGORIES, CATEGORY_TAGS, TOPIC_TAGS, ENTITY_TAGS, ENTITIES, ITEM_TYPES, RELEASE } from '@aihot/industry/taxonomy';
import { normalizeTags, entityIdentity } from '@aihot/backend/editorial/vocabulary';
import { STRUCTURE_SYSTEM, normalizeStructure, StructureSchema } from '@aihot/backend/editorial/analyze';
import { UNDERSTAND_SYSTEM, PREFILTER_SYSTEM, finalizeCopy } from '@aihot/backend/editorial/writing';
import { promptText } from '@aihot/backend/editorial/prompts';
import { assertSupportedConfig } from '@aihot/backend/sources/config-keys';
import { SELECTION } from '@aihot/industry/selection';
import { formatChineseCopy } from '@aihot/site/format';
import { SITE } from '@aihot/site';
import type { AnalyzeInputArticle } from '@aihot/backend/editorial/input';

const topics=JSON.parse(readFileSync('industry/topics.json','utf8'));
const sources=JSON.parse(readFileSync('industry/sources.json','utf8')).sources;
test('markets are topic tags, product labels and categories stay distinct',()=>{
 assert.equal(CATEGORIES.length,7);assert.equal(ITEM_TYPES.length,8);assert.equal(RELEASE,null);
 const labels=new Set<string>([...CATEGORY_TAGS,...TOPIC_TAGS,...ENTITY_TAGS]);
 assert.equal(labels.size,CATEGORY_TAGS.length+TOPIC_TAGS.length+ENTITY_TAGS.length);
 assert.equal(new Set(topics.topics.map((t:any)=>t.slug)).size,topics.topics.length);
 for(const t of topics.topics){
  assert.ok(['company','field','genre'].includes(t.group));
  if(t.entityId)assert.ok(ENTITIES[t.entityId]);
  for(const tag of t.tags??[])assert.ok(labels.has(tag),tag);
 }
 for(const slug of ['china','japan','saudi-arabia','uae','egypt','brazil','thailand'])assert.ok(topics.topics.some((t:any)=>t.slug===slug&&t.group==='field'));
 assert.deepEqual(SELECTION.thresholds,{T1:60,T1_5:65,T2:76});
});
test('tag normalization preserves category first and the six-tag budget without invented buyers',()=>{
 assert.deepEqual(normalizeTags(['日本','政策与准入','中国','熟制鸡肉','新增准入','工厂注册','臆造买家']),['政策与准入','日本','中国','熟制禽肉','新增准入','工厂注册']);
 assert.deepEqual(normalizeTags(['菜谱','invented']),['其他']);
 assert.equal(entityIdentity('Seara'),'jbs');assert.equal(entityIdentity('BRF'),'brf');
});
test('industry prompts render every template with no stale AI editorial assumptions',()=>{
 const rendered=[UNDERSTAND_SYSTEM,PREFILTER_SYSTEM,STRUCTURE_SYSTEM];
 for(const name of readdirSync('industry/prompts').filter(n=>n.endsWith('.md'))){
  const text=readFileSync(`industry/prompts/${name}`,'utf8');
  const vals=Object.fromEntries([...text.matchAll(/\{\{([A-Za-z][\w.-]*)\s*\}\}/g)].map(m=>[m[1]!, 'fixture']));
  // Includes may need caller values; these are the real public renderer values for this prompt.
  Object.assign(vals,{categoryCount:'7',categoryGuide:'fixture',categoryTags:CATEGORY_TAGS.join('、'),topicTags:TOPIC_TAGS.join('、'),entityTags:ENTITY_TAGS.join('、'),entities:'fixture'});
  rendered.push(promptText(name.slice(0,-3),vals));
 }
 for(const text of rendered){assert.doesNotMatch(text,/\{\{|GPT|Claude|AI 行业|model_release|模型发布/);}
 assert.match(UNDERSTAND_SYSTEM,/今日值得跟进/);assert.match(PREFILTER_SYSTEM,/菜谱/);
});
test('initial sources have supported configs, stable identities and summary-only permission',()=>{
 assert.ok(sources.length>=2);assert.equal(new Set(sources.map((s:any)=>s.id)).size,sources.length);
 for(const s of sources){assertSupportedConfig(s.kind,s.config);if(s.owner_entity_id!==null)assert.ok(ENTITIES[s.owner_entity_id]);assert.equal(s.site_fulltext,false);assert.equal(s.syndicate_fulltext,false);assert.ok(s.config._aihot.initialBackfillLimit<=3);}
});
test('Chinese rendering is deterministic and preserves decimal prices, links, code and English phrases',()=>{
 const raw='日本进口鸡肉100吨,业务含义:可能影响BRF报价。今日值得跟进:核对HS0207与3.5USD/kg -- 食品。';
 const out=formatChineseCopy(raw);
 assert.equal(out,'日本进口鸡肉 100 吨，业务含义：可能影响 BRF 报价。今日值得跟进：核对 HS0207 与 3.5USD/kg -- 食品。');
 assert.equal(formatChineseCopy(out),out);
 const protectedText='链接 https://example.com/a?q=1.2&b=x，执行 `npm run dev:web` 与 data.csv。';
 assert.equal(formatChineseCopy(protectedText),protectedText);
 assert.equal(formatChineseCopy('BRF, JBS: export 3.5 USD/kg'),'BRF, JBS: export 3.5 USD/kg');
 assert.equal(formatChineseCopy('“中文” — 资料'),'“中文” -- 资料');
});
test('Chinese tonnage uses exact tonnes or ten-thousand tonnes with ranges and no rounding',()=>{
 const cases=[
  ['500.3 千吨','50.03 万吨'],['45.9千吨','4.59 万吨'],['0.3 千吨','300 吨'],
  ['9.999 千吨','9999 吨'],['10.000 千吨','1 万吨'],['1,234.50 千吨','123.45 万吨'],
  ['0.000001 千吨','0.001 吨'],['0.123456789012345678 千吨','123.456789012345678 吨'],
  ['45–50 千吨','4.5--5 万吨'],['5～15 千吨','0.5～1.5 万吨'],
  ['0.3-0.5 千吨','300-500 吨'],['-10 千吨','-1 万吨'],['0 千吨','0 吨'],
 ];
 for(const [input,expected] of cases){
  assert.equal(formatChineseCopy(input),expected,input);
  assert.equal(formatChineseCopy(expected),expected,'must be idempotent');
 }
 const protectedText='`500.3 千吨` https://example.org/500.3?id=45.9 与 3.5 USD/kg';
 assert.equal(formatChineseCopy(protectedText),protectedText);
 assert.equal(formatChineseCopy('1e3 千吨'),'1e3 千吨','do not partially parse scientific notation');
});

test('unmentioned competitor identities never enter titles or summaries',()=>{
 const input={sourceKind:'rss',title:'中国工厂扩大对日出口',text:'圣农发展扩大熟制禽肉对日出口。',sourceName:'企业公告',sourceUrl:'https://example.org/news'};
 const copy=finalizeCopy(input,{titleZh:'BRF 扩大出口',summaryZh:'JBS 扩大出口。'});
 assert.equal(copy.identityGuard.outcome,'fallback');assert.equal(copy.titleZh,input.title);assert.equal(copy.summaryZh,'');
});
test('policy evidence and product conditions must be continuous quotes from the original',()=>{
 const body='日本主管机构新增熟制禽肉工厂注册。仅限熟制产品，不含生鲜产品。';
 const a:AnalyzeInputArticle={id:'fixture',revision:1,title:'工厂注册',url:'https://example.org/notice',author:null,publishedAt:new Date('2026-10-07T00:00Z'),bodyText:body,excerpt:null,xPost:null,media:[],source:{name:'Fixture',kind:'rss',tier:'T1',firstParty:true}};
 const data=StructureSchema.parse({category:'regulation_access',tags:['政策与准入','日本','熟制禽肉'],subjects:['gacc'],scope:'single',fact:{title:'工厂注册',subject:'主管机构',action:'注册',object:'熟制禽肉',occurredAt:null,evidence:'日本主管机构新增熟制禽肉工厂注册。',conditions:[{quote:'仅限熟制产品，不含生鲜产品。'},{quote:'所有中国工厂全部获批。'}]}});
 const value=normalizeStructure(data,a);
 assert.equal(value.fact?.evidence,'日本主管机构新增熟制禽肉工厂注册。');
 assert.equal(value.fact?.conditions.length,1);
 assert.equal(value.fact?.occurredAt,null);
});
