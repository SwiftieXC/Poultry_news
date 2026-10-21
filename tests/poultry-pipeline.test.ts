import { pointModels, stub, tag, embeddingsStub } from './setup.ts';
import { analysisStep } from './analysis-steps.ts';
import assert from 'node:assert/strict';
import { test,after } from 'node:test';
import { closeDb,sql } from '@aihot/backend/db';
import { stopBoss } from '@aihot/backend/jobs/queue';
import { upsertMaterial } from '@aihot/backend/content/materials';
import { analyzeArticle } from '@aihot/backend/editorial/analyze';
import { publishArticle } from '@aihot/backend/publication/publish';
import { groupArticle } from '@aihot/backend/events/group';
import { addDays,beijingDate } from '@aihot/contracts/time';
import { composeDaily } from '@aihot/backend/reports/compose';
import { loadReport } from '@aihot/backend/publication/reports';
import { formatChineseCopy } from '@aihot/site/format';

const T=tag();let mode='pass';const calls:string[]=[];
const summary='日本主管机构新增熟制禽肉工厂注册，仅限公告列明产品。业务含义：可能增加合格供应，不能推及生鲜产品。今日值得跟进：核对工厂编号和生效日期。';
const provider=await stub((_hit,request)=>{
 const step=analysisStep(request.body);calls.push(step);
 const value=step==='prefilter'?{label:mode==='block'?'BLOCK':'PASS',reason:'synthetic regression'}:
 step==='score'?{attentionScore:80}:
 step==='structure'?{category:'regulation_access',tags:['政策与准入','日本','中国','熟制禽肉','新增准入'],subjects:['maff'],scope:'single',fact:{title:'熟制禽肉工厂注册',subject:'MAFF',action:'注册',object:'熟制禽肉工厂',occurredAt:null,evidence:'仅限熟制产品，不含生鲜产品。',conditions:[{quote:'仅限熟制产品，不含生鲜产品。'}]}}:
 {itemType:'regulation',authorRole:'principal',tags:['政策与准入'],editorialJudgment:'原文限定加工形态，需要核对工厂和产品范围。',titleZh:'日本主管机构新增熟制禽肉工厂注册',summaryZh:summary};
 return {choices:[{message:{content:JSON.stringify(value)}}],usage:{prompt_tokens:20,completion_tokens:20,total_tokens:40}};
});
pointModels(provider.url);
after(async()=>{await provider.close();await stopBoss();await closeDb();});
test('a poultry action summary survives analysis, publication and a rule-composed daily without a report model',async()=>{
 const sourceId=`poultry-pipeline-${T}`;
 await sql`INSERT INTO sources(id,name,kind,tier,participation_mode,next_fetch_at) VALUES(${sourceId},'Synthetic poultry fixture','rss','T1','editorial','2100-01-01')`;
 const at=new Date(Date.now()-60000);const date=addDays(beijingDate(new Date()),1);
 const {articleId}=await upsertMaterial({sourceId,url:`https://example.org/poultry/${T}`,title:'合成禽肉公告',bodyText:'MAFF 公告更新工厂注册。仅限熟制产品，不含生鲜产品。',bodyStatus:'ok',publishedAt:at,discoveredAt:at,via:'fetch'});
 const result=await analyzeArticle(articleId);
 assert.equal(result?.output?.category,'regulation_access');assert.deepEqual(result?.output?.scores,[80,80]);
 assert.equal(result?.output?.summaryZh,summary);assert.equal(result?.output?.fact?.conditions.length,1);
 const embeddings=await embeddingsStub();
 try { await groupArticle(articleId); } finally { await embeddings.close(); pointModels(provider.url); }
 const published=await publishArticle(articleId,{now:new Date(),releasedAt:at});assert.equal(published?.selected,true);
 const modelCalls=calls.length;
 await composeDaily(date);
 assert.equal(calls.length,modelCalls,'daily composition must not buy another model call');
 const report=await loadReport('daily',date);
 const text=JSON.stringify(report);
 assert.ok(text.includes('今日值得跟进'));assert.ok(text.includes('不能推及生鲜产品'));
 assert.equal(formatChineseCopy(summary),summary);
 mode='block';const start=calls.length;
 const noise=await upsertMaterial({sourceId,url:`https://example.org/recipe/${T}`,title:'家常鸡肉菜谱',bodyText:'家庭烤鸡配方，没有贸易动作。',bodyStatus:'ok',publishedAt:at,discoveredAt:at,via:'fetch'});
 const blocked=await analyzeArticle(noise.articleId);
 assert.equal(blocked?.output?.relevance,'block');assert.deepEqual(calls.slice(start),['prefilter']);
});
