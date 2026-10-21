const $ = id => document.getElementById(id);
const state = { corpus: null, labels: {}, drafts: {}, recovery: {}, current: null, filter: 'all', query: '', timer: null, saving: null };
const names = { select: '值得入选', related: '相关但不重要', irrelevant: '无关', uncertain: '暂不确定' };
const languages = { zh: '中文', ja: '日文', pt: '葡文', en: '英文', ar: '阿拉伯文' };
let storageKey;
const sameChoice = (a, b) => a?.decision === b?.decision && (a?.notes ?? '') === (b?.notes ?? '') && JSON.stringify([...(a?.flags ?? [])].sort()) === JSON.stringify([...(b?.flags ?? [])].sort());
const currentItem = () => state.corpus.items.find(item => item.id === state.current);
const choiceFor = id => state.drafts[id] ?? state.labels[id] ?? { decision: null, notes: '', flags: [], version: 0 };
function notice(message) { $('error').textContent = message; $('error').hidden = !message; }
function persistDrafts() {
  try { localStorage.setItem(storageKey, JSON.stringify({ ...state.recovery, ...state.drafts })); }
  catch { notice('浏览器无法保存草稿，请等到“已保存”后再离开页面。'); }
}
function status(message, kind = '') { $('save-status').textContent = message; $('save-status').className = `save-status ${kind}`; }
function filteredItems() {
  return state.corpus.items.filter(item => (!state.query || `${item.titleZh} ${item.originalTitle} ${item.sourceName} ${item.summaryZh}`.toLowerCase().includes(state.query))
    && (state.filter === 'all' || state.filter === 'pending' && !state.labels[item.id] || state.filter === 'uncertain' && state.labels[item.id]?.decision === 'uncertain'));
}
function renderNavigation() {
  const items = filteredItems();
  const saved = Object.values(state.labels);
  $('progress-text').textContent = `已标注 ${saved.length} / ${state.corpus.items.length} 条 · 待确认 ${saved.filter(label => label.decision === 'uncertain').length}`;
  $('progress').max = state.corpus.items.length; $('progress').value = saved.length;
  $('total-count').textContent = state.corpus.items.length;
  for (const filter of ['all', 'pending', 'uncertain']) {
    const button = $(`filter-${filter}`); button.classList.toggle('active', filter === state.filter); button.setAttribute('aria-pressed', String(filter === state.filter));
  }
  const list = $('case-list'); list.replaceChildren();
  for (const item of items) {
    const index = state.corpus.items.indexOf(item), label = state.labels[item.id];
    const button = document.createElement('button'); button.type = 'button'; button.className = `case-button${state.current === item.id ? ' active' : ''}`;
    button.setAttribute('aria-label', `${index + 1}：${item.titleZh}${label ? `，${names[label.decision]}` : '，未标注'}`);
    button.setAttribute('aria-current', state.current === item.id ? 'true' : 'false'); button.dataset.id = item.id;
    const number = document.createElement('span'); number.className = 'case-number'; number.textContent = String(index + 1).padStart(2, '0');
    const title = document.createElement('span'); title.className = 'case-title'; title.textContent = item.titleZh;
    const mark = document.createElement('span'); mark.className = `case-mark${label?.decision === 'uncertain' ? ' uncertain' : ''}`; mark.textContent = label ? label.decision === 'uncertain' ? '?' : '✓' : '';
    button.append(number, title, mark); button.addEventListener('click', () => navigateTo(item.id)); list.append(button);
  }
  const index = state.corpus.items.findIndex(item => item.id === state.current);
  $('previous').disabled = index <= 0;
  $('next').textContent = index === state.corpus.items.length - 1 ? '完成本轮 ✓' : '下一条 →';
}
function renderChoice() {
  const choice = choiceFor(state.current);
  for (const button of document.querySelectorAll('[data-decision]')) button.setAttribute('aria-pressed', String(button.dataset.decision === choice.decision));
  for (const input of document.querySelectorAll('.flags input')) input.checked = choice.flags.includes(input.value);
  $('save-now').hidden = !state.drafts[state.current];
}
function renderArticle() {
  const item = currentItem();
  $('empty').hidden = !!item; $('review').hidden = !item;
  if (!item) { renderNavigation(); return; }
  const index = state.corpus.items.indexOf(item);
  $('position').textContent = `资料 ${String(index + 1).padStart(2, '0')} / ${state.corpus.items.length}`;
  $('metadata').replaceChildren();
  const date = item.publishedAt ? new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(item.publishedAt)) : '原文日期待确认';
  for (const text of [item.sourceName, date, languages[item.language] ?? item.language]) { const span = document.createElement('span'); span.textContent = text; $('metadata').append(span); }
  $('title').textContent = item.titleZh;
  $('original-title').textContent = item.originalTitle === item.titleZh ? '' : item.originalTitle;
  $('original-title').hidden = item.originalTitle === item.titleZh;
  $('source-link').href = item.sourceUrl;
  $('summary').textContent = item.summaryZh;
  $('body-original').textContent = item.bodyOriginal;
  document.querySelector('.original').open = false;
  const choice = choiceFor(item.id); $('notes').value = choice.notes;
  renderChoice(); renderNavigation();
  if (state.drafts[item.id]) status('有未保存的修改，请核对后保存');
  else if (state.labels[item.id]) status(`已保存 · ${names[state.labels[item.id].decision]}`, 'saved');
  else status('请选择一个判断，选择后自动保存');
}
function edit(patch) {
  const id = state.current;
  const choice = choiceFor(id);
  state.drafts[id] = { decision: choice.decision, notes: choice.notes, flags: choice.flags, baseVersion: choice.baseVersion ?? choice.version ?? 0, ...patch };
  if (sameChoice(state.drafts[id], state.labels[id])) delete state.drafts[id];
  notice(''); persistDrafts(); renderChoice();
  if (!state.drafts[id]) return status('已保存', 'saved');
  status(state.drafts[id].decision ? '正在保存…' : '请选择一个判断后保存备注');
  clearTimeout(state.timer); state.timer = setTimeout(() => flush(), 450);
}
async function flush() {
  clearTimeout(state.timer);
  if (state.saving) return state.saving;
  state.saving = (async () => {
    for (const id of Object.keys(state.drafts)) {
      while (state.drafts[id]?.decision) {
        const draft = structuredClone(state.drafts[id]);
        try {
          const response = await fetch(`/api/labels/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft), signal: AbortSignal.timeout(8000) });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || '保存未确认，请重试或刷新核对。');
          state.labels[id] = result.label;
          if (sameChoice(state.drafts[id], draft)) delete state.drafts[id];
          else state.drafts[id].baseVersion = result.label.version;
          persistDrafts(); renderNavigation();
          if (state.current === id) { renderChoice(); status(state.drafts[id] ? '正在保存…' : '已保存 · 可以直接告诉我“标好了”', state.drafts[id] ? '' : 'saved'); }
        } catch (error) {
          notice(error.message || '保存结果未确认，请刷新核对。');
          if (state.current === id) { status('保存未确认，修改仍保留为本机草稿', 'failed'); $('save-now').hidden = false; }
          return false;
        }
      }
    }
    return true;
  })();
  const ok = await state.saving; state.saving = null; return ok;
}
async function navigateTo(id) {
  if (!await flush()) return;
  const draft = state.drafts[state.current];
  if (draft && !draft.decision && (draft.notes || draft.flags.length)) { notice('请先选择一个判断保存备注；难判断时可以选“暂不确定”。'); return; }
  state.current = id; $('restore-notice').hidden = true; notice(''); renderArticle();
}
document.querySelectorAll('[data-decision]').forEach(button => button.addEventListener('click', () => edit({ decision: button.dataset.decision })));
$('notes').addEventListener('input', () => edit({ notes: $('notes').value }));
document.querySelectorAll('.flags input').forEach(input => input.addEventListener('change', () => edit({ flags: [...document.querySelectorAll('.flags input:checked')].map(input => input.value).sort() })));
$('save-now').addEventListener('click', () => flush());
$('previous').addEventListener('click', () => { const index = state.corpus.items.findIndex(item => item.id === state.current); if (index > 0) navigateTo(state.corpus.items[index - 1].id); });
$('next').addEventListener('click', async () => {
  const index = state.corpus.items.findIndex(item => item.id === state.current);
  const target = filteredItems().find(item => state.corpus.items.indexOf(item) > index);
  if (target) return navigateTo(target.id);
  if (!await flush()) return;
  const pending = state.corpus.items.find(item => !state.labels[item.id]);
  if (pending) return navigateTo(pending.id);
  state.current = null; renderArticle();
});
for (const filter of ['all', 'pending', 'uncertain']) $(`filter-${filter}`).addEventListener('click', async () => {
  if (!await flush()) return; state.filter = filter; state.current = filteredItems()[0]?.id ?? null; renderArticle();
});
$('search').addEventListener('input', () => { state.query = $('search').value.trim().toLowerCase(); renderNavigation(); });
for (const link of document.querySelectorAll('a[download]')) link.addEventListener('click', async event => { event.preventDefault(); if (await flush()) location.href = link.href; });
window.addEventListener('beforeunload', event => { if (Object.keys(state.drafts).length) { event.preventDefault(); event.returnValue = ''; } });

try {
  const [corpusResponse, labelsResponse] = await Promise.all([fetch('/api/corpus'), fetch('/api/labels')]);
  if (!corpusResponse.ok || !labelsResponse.ok) throw new Error('资料读取失败，请检查本机标注服务。');
  state.corpus = await corpusResponse.json(); const saved = await labelsResponse.json(); state.labels = saved.labels;
  document.title = `${state.corpus.title} · 禽贸情报`;
  storageKey = `poultry-label-drafts:${state.corpus.batchId}:${state.corpus.corpusHash}`;
  try {
    const drafts = JSON.parse(localStorage.getItem(storageKey) || '{}');
    for (const [id, draft] of Object.entries(drafts)) {
      if (!state.corpus.items.some(item => item.id === id) || sameChoice(draft, state.labels[id])) continue;
      if (draft.baseVersion !== (state.labels[id]?.version ?? 0)) { state.recovery[id] = draft; notice('有一份旧草稿与当前标注不同，请先核对已保存内容；旧草稿仍保留在浏览器。'); continue; }
      state.drafts[id] = draft;
    }
  } catch { notice('浏览器草稿无法读取；服务器已保存的标注仍可继续使用。'); }
  state.current = Object.keys(state.drafts)[0] ?? state.corpus.items.find(item => !state.labels[item.id])?.id ?? state.corpus.items[0].id;
  $('restore-notice').hidden = !Object.keys(state.drafts).length;
  renderArticle();
} catch (error) { notice(error.message || '页面读取失败，请刷新重试。'); }
