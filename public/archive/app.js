const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const pages = new Set(['home','about','work','journal','calendar','now','contact']);
const panelSpells = {
  home: ['Finite', '지도의 발자국을 따라 돌아갑니다'], about: ['Revelio', '숨겨진 소개를 드러냅니다'],
  work: ['Accio', '활동의 흔적을 불러옵니다'], journal: ['Aparecium', '보이지 않던 잉크가 나타납니다'],
  calendar: ['Tempus', '시간의 페이지를 넘깁니다'], now: ['Lumos', '지금의 이야기를 비춥니다'],
  contact: ['Alohomora', '편지를 보낼 길을 엽니다']
};
let content = { posts: [], topicGroups: {}, events: [], todos: [], nowPosts: [], projects: [], now: null };
let activeFilter = 'all';
let activeTopic = 'all';
let visiblePosts = 6;
let calendarDate = new Date();
const dateFormat = new Intl.DateTimeFormat('en-US', { year:'numeric', month:'long', day:'numeric' });
const categoryLabels = { 'CTF/Wargame':'CTF / WARGAME', '블로그/기술문서':'TECH NOTES', '논문/컨퍼런스':'PAPERS / CONFERENCES' };
const displayTitle = post => post.title;
const displayCategory = category => categoryLabels[category] || category;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const mapLoader = $('#map-loader');

if (document.documentElement.classList.contains('map-loading')) {
  $('#entrance').inert = true;
  let dismissed = false;
  const dismissMap = (focusEntrance = false) => {
    if (dismissed) return;
    dismissed = true;
    mapLoader.classList.add('is-leaving');
    window.setTimeout(() => {
      mapLoader.hidden = true;
      document.documentElement.classList.remove('map-loading');
      $('#entrance').inert = false;
      if (focusEntrance) $('#enter-button').focus();
    }, 640);
  };
  const mapTimer = window.setTimeout(() => dismissMap(), 3300);
  $('#skip-map-loader').addEventListener('click', () => {
    window.clearTimeout(mapTimer);
    dismissMap(true);
  });
} else {
  mapLoader.hidden = true;
}

function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])); }
function showPanel(name, push = true) {
  const page = pages.has(name) ? name : 'home';
  $('#entrance').hidden = true;
  $('#app-shell').hidden = false;
  $$('.panel').forEach(panel => { panel.hidden = panel.dataset.page !== page; panel.classList.remove('panel-enter'); });
  const active = $(`.panel[data-page="${page}"]`);
  active.querySelector('.chapter-title')?.setAttribute('data-incantation', panelSpells[page][0]);
  if (!reducedMotion.matches) { void active.offsetWidth; active.classList.add('panel-enter'); }
  $$('[data-panel]').forEach(button => {
    const selected = button.dataset.panel === page;
    button.classList.toggle('selected', selected);
    if (button.closest('nav')) button.setAttribute('aria-current', selected ? 'page' : 'false');
  });
  window.closeSpellbook?.();
  if (push) history.pushState({page}, '', `/#${page}`);
  window.scrollTo({top:0,behavior:'instant'});
}
function openPanel(name) {
  const page = pages.has(name) ? name : 'home';
  if ($(`.panel[data-page="${page}"]`)?.hidden === false) {
    window.closeSpellbook?.();
    return;
  }
  const [spell, caption] = panelSpells[page];
  window.magicCurtain(spell, caption, () => showPanel(page), false, page);
}
function enter() {
  $('#entrance').classList.add('opening');
  try { sessionStorage.setItem('cedrai-entered','1'); } catch {}
  window.magicCurtain('Alohomora', '', () => showPanel('home'), false, 'entrance');
}
$('#enter-button').addEventListener('click', enter);
$$('[data-panel]').forEach(button => button.addEventListener('click', () => openPanel(button.dataset.panel)));
$('#spell-form').addEventListener('submit', event => {
  event.preventDefault();
  const input = $('#spell-input');
  const cast = window.normalizeArchiveSpell(input.value);
  if (['expectopatronum', '엑스펙토패트로눔', '익스펙토패트로눔'].includes(cast)) {
    input.value = '';
    window.castPatronus?.();
    return;
  }
  const destinations = {
    finite:'home', 피니테:'home', 피니트:'home',
    hominumrevelio:'about', homenumrevelio:'about', 호메눔리벨리오:'about', revelio:'about', 레벨리오:'about', 리벨리오:'about',
    accio:'work', 아씨오:'work', 아키오:'work',
    aparecium:'journal', 아파레시움:'journal',
    tempus:'calendar', 템푸스:'calendar',
    lumos:'now', 루모스:'now',
    alohomora:'contact', 알로호모라:'contact'
  };
  const page = destinations[cast];
  if (!page) {
    const spell = window.findArchiveSpell(cast);
    if (spell) {
      input.value = '';
      window.showArchiveSpellEffect(spell);
    } else {
      $('#spell-feedback').textContent = '찾을 수 없는 주문입니다. 다른 주문을 외워 보세요.';
      input.focus();
    }
    return;
  }
  $('#spell-feedback').textContent = `${panelSpells[page][0]} ✦`;
  input.value = '';
  openPanel(page);
});
window.addEventListener('popstate', () => {
  const page = location.hash.slice(1);
  const [spell, caption] = panelSpells[pages.has(page) ? page : 'home'];
  window.magicCurtain(spell, caption, () => showPanel(page, false), false, pages.has(page) ? page : 'home');
});
const initialPage = location.hash.slice(1);
let wasEntered = false;
try { wasEntered = sessionStorage.getItem('cedrai-entered') === '1'; } catch {}
if (pages.has(initialPage) || wasEntered) {
  showPanel(initialPage || 'home', false);
  requestAnimationFrame(() => window.scrollTo({top:0,behavior:'instant'}));
  window.addEventListener('load', () => window.setTimeout(() => window.scrollTo({top:0,behavior:'instant'}), 0), {once:true});
}

function renderPosts() {
  const search = $('#post-search').value.trim().toLocaleLowerCase();
  const matchesFilter = post => activeFilter === 'all' || (activeFilter === 'saved' ? window.fieldNotes.isSaved(post.slug) : post.category === (activeFilter === 'tech' ? '블로그/기술문서' : activeFilter));
  const available = content.posts.filter(matchesFilter);
  renderTopics(available);
  const list = available.filter(post => (activeTopic === 'all' || post.topic === activeTopic) && (`${post.title} ${post.category} ${post.topic || ''} ${post.summary || ''}`).toLocaleLowerCase().includes(search));
  $('#post-list').innerHTML = list.length ? list.slice(0, visiblePosts).map((post,index) => {
    const saved = window.fieldNotes.isSaved(post.slug);
    const progress = window.fieldNotes.getProgress(post.slug);
    return `<div class="post-item" style="--ink-order:${index % 8}"><a class="post-row" style="--ink-order:${index % 8}" href="/blog?post=${encodeURIComponent(post.number || post.slug.replace(/^tistory-/, ""))}" aria-label="Read ${escapeHtml(displayTitle(post))}"><span class="post-index">${String(index+1).padStart(2,'0')}</span><span class="post-text"><small>${escapeHtml(displayCategory(post.category))}${post.topic ? ` / ${escapeHtml(post.topic)}` : ''} · ${escapeHtml(post.date)}${post.protected ? ' · ✦ SEALED' : ''}</small><strong lang="${/[가-힣]/.test(displayTitle(post)) ? 'ko' : 'en'}">${escapeHtml(displayTitle(post))}</strong>${progress > 0 ? `<span class="post-progress">${progress >= 95 ? 'READ' : `${progress}% READ`}</span>` : ''}</span><span class="post-arrow">↗</span></a><button class="post-save" type="button" data-save-post="${escapeHtml(post.slug)}" aria-pressed="${saved}" aria-label="${saved ? 'Remove saved note' : 'Save note'}: ${escapeHtml(displayTitle(post))}" title="${saved ? 'Remove from saved' : 'Save this note'}">${saved ? '✦' : '✧'}</button></div>`;
  }).join('') : `<div class="empty-posts">${activeFilter === 'saved' && !search ? '아직 보관한 기록이 없습니다. 글 옆의 별을 눌러 추가해 보세요.' : 'No matching notes.'}</div>`;
  $('#post-count').textContent = `${list.length} ${activeFilter === 'saved' ? 'saved' : 'archive'} notes`;
  $('#more-posts').hidden = list.length <= visiblePosts;
}
function renderTopics(available) {
  const category = activeFilter === 'tech' ? '블로그/기술문서' : activeFilter;
  const configured = content.topicGroups[category];
  const counts = new Map();
  available.forEach(post => { if (post.topic) counts.set(post.topic, (counts.get(post.topic) || 0) + 1); });
  const ordered = configured || [...new Set(Object.values(content.topicGroups).flat())];
  const topics = configured || [...ordered.filter(topic => counts.has(topic)), ...[...counts.keys()].filter(topic => !ordered.includes(topic))];
  const wrapper = $('#journal-topics');
  wrapper.hidden = topics.length === 0;
  $('#journal-topic-options').innerHTML = ['all', ...topics].map(topic => `<button type="button" class="journal-topic${activeTopic === topic ? ' active' : ''}" data-topic="${escapeHtml(topic)}" aria-pressed="${activeTopic === topic}">${topic === 'all' ? 'ALL TOPICS' : escapeHtml(topic)} <span>${topic === 'all' ? available.length : counts.get(topic) || 0}</span></button>`).join('');
}
function renderJournalDesk() {
  const counts = {
    all: content.posts.length,
    'CTF/Wargame': content.posts.filter(post => post.category === 'CTF/Wargame').length,
    tech: content.posts.filter(post => post.category === '블로그/기술문서').length,
    '논문/컨퍼런스': content.posts.filter(post => post.category === '논문/컨퍼런스').length,
    '개발': content.posts.filter(post => post.category === '개발').length,
    'Bug Bounty': content.posts.filter(post => post.category === 'Bug Bounty').length,
    '공모전/자격증': content.posts.filter(post => post.category === '공모전/자격증').length,
    saved: content.posts.filter(post => window.fieldNotes.isSaved(post.slug)).length
  };
  Object.entries(counts).forEach(([key, count]) => { $(`[data-count="${key}"]`).textContent = count; });
  const last = content.posts.find(post => post.slug === window.fieldNotes.getLast());
  const progress = last && window.fieldNotes.getProgress(last.slug);
  $('#journal-resume').hidden = !last || !progress || progress >= 95;
  if (last && progress && progress < 95) {
    $('#journal-resume-title').textContent = last.title;
    $('#journal-resume-link').href = `/blog?post=${encodeURIComponent(last.number || last.slug.replace(/^tistory-/, ''))}`;
    $('#journal-resume-link').textContent = `CONTINUE AT ${progress}% ↗`;
  }
}
$('#post-search').addEventListener('input', () => { visiblePosts=6; renderPosts(); });
$$('.filter').forEach(button => button.addEventListener('click', () => {
  $$('.filter').forEach(item => { item.classList.remove('active'); item.setAttribute('aria-pressed','false'); });
  button.classList.add('active'); button.setAttribute('aria-pressed','true');
  activeFilter=button.dataset.filter; activeTopic='all'; visiblePosts=6; renderPosts();
  if(!reducedMotion.matches) { $('#post-list').classList.remove('list-enter'); void $('#post-list').offsetWidth; $('#post-list').classList.add('list-enter'); }
}));
$('#journal-topic-options').addEventListener('click', event => {
  const button = event.target.closest('[data-topic]');
  if (!button) return;
  activeTopic=button.dataset.topic; visiblePosts=6; renderPosts();
});
$('#more-posts').addEventListener('click', () => { visiblePosts+=6; renderPosts(); });
$('#post-list').addEventListener('click', event => {
  const save = event.target.closest('[data-save-post]');
  if (save) {
    const slug = save.dataset.savePost;
    window.fieldNotes.toggleSaved(slug);
    renderJournalDesk();
    renderPosts();
    $('#post-list').querySelectorAll('[data-save-post]').forEach(button => { if (button.dataset.savePost === slug) button.focus(); });
    return;
  }
  const link=event.target.closest('a.post-row');
  if(!link || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0 || reducedMotion.matches) return;
  event.preventDefault();
  window.location.href = link.href;
});
function localDay(date) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; }
function renderCalendar() {
  const year=calendarDate.getFullYear(), month=calendarDate.getMonth();
  $('#calendar-title').textContent = new Intl.DateTimeFormat('en-US',{month:'long',year:'numeric'}).format(calendarDate);
  const offset=(new Date(year,month,1).getDay()+6)%7;
  const count=new Date(year,month+1,0).getDate();
  const eventDates=new Set([...content.events,...content.todos].map(event=>event.date));
  const today=localDay(new Date());
  let html='';
  for(let i=0;i<offset;i++) html+='<div class="calendar-day empty" aria-hidden="true"></div>';
  for(let day=1;day<=count;day++) {
    const iso=localDay(new Date(year,month,day));
    html+=`<button class="calendar-day${iso===today?' today':''}" type="button" data-date="${iso}" aria-label="${iso}${eventDates.has(iso)?' has an entry':''}"><span>${day}</span>${eventDates.has(iso)?'<i></i>':''}</button>`;
  }
  $('#calendar-grid').innerHTML=html;
  $('#calendar-detail').textContent='날짜를 누르면 그날의 기록이 나타납니다.';
}
$('#prev-month').addEventListener('click',()=>{calendarDate=new Date(calendarDate.getFullYear(),calendarDate.getMonth()-1,1);renderCalendar()});
$('#next-month').addEventListener('click',()=>{calendarDate=new Date(calendarDate.getFullYear(),calendarDate.getMonth()+1,1);renderCalendar()});
$('#calendar-grid').addEventListener('click',event=>{
  const day=event.target.closest('[data-date]'); if(!day)return;
  $$('.calendar-day.selected').forEach(el=>el.classList.remove('selected'));
  day.classList.add('selected');
  const records=content.events.filter(item=>item.date===day.dataset.date);
  const todos=content.todos.filter(item=>item.date===day.dataset.date);
  $('#calendar-detail').innerHTML=`<strong>${dateFormat.format(new Date(`${day.dataset.date}T12:00:00`))}</strong>${records.length||todos.length?[...records.map(item=>escapeHtml(item.title)+(item.description?` — ${escapeHtml(item.description)}`:'')),...todos.map(item=>`${item.done?'✓':'◇'} ${escapeHtml(item.content)}`)].join('<br>'):'이 날짜에는 기록이 없습니다.'}`;
});
function renderCalendarLedger() {
  const rows=[...content.events.map(item=>({date:item.date,title:item.title,description:item.description,kind:'EVENT'})),...content.todos.map(item=>({date:item.date,title:item.content,description:item.done?'완료':'진행 중',kind:'TO DO'}))].sort((a,b)=>b.date.localeCompare(a.date));
  $('#calendar-ledger-list').innerHTML=rows.length?rows.map(item=>`<div class="calendar-ledger__row"><span>${escapeHtml(item.date)} · ${item.kind}</span><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.description)}</small></div>`).join(''):'아직 날짜가 적힌 기록이 없습니다.';
}
function renderNowHistory() {
  const rows=[...(content.nowPosts||[])].sort((a,b)=>b.created_at.localeCompare(a.created_at));
  const latest=rows.shift();
  if(latest){$('#now-date').textContent=dateFormat.format(new Date(latest.created_at));$('#now-text').textContent=latest.content;}
  $('#now-history').innerHTML=rows.map(item=>`<article class="now-history__entry"><span>${escapeHtml(dateFormat.format(new Date(item.created_at)))}</span><p>${escapeHtml(item.content)}</p></article>`).join('');
}
function renderProjects() {
  const projects=content.projects||[];
  const target=$('#project-records');
  target.hidden=!projects.length;
  target.innerHTML=projects.length?`<h3>THE PROJECT ARCHIVE</h3><div class="work-list">${projects.map((project,index)=>`<a href="${/^https?:\/\//.test(project.link)?escapeHtml(project.link):'/projects'}" ${/^https?:\/\//.test(project.link)?'target="_blank" rel="noopener noreferrer"':''}><span>${String(index+1).padStart(2,'0')} / PROJECT</span><strong>${escapeHtml(project.title)}</strong><small>${escapeHtml(project.description)}</small><b>↗</b></a>`).join('')}</div>`:'';
}
async function loadContent() {
  try {
    const response=await fetch('/api/archive-home', { cache: 'no-store' }); if(!response.ok) throw Error('content');
    content=await response.json();
    renderJournalDesk(); renderPosts(); renderCalendar(); renderCalendarLedger(); renderNowHistory(); renderProjects();
  } catch {
    $('#post-list').innerHTML='<div class="empty-posts">기록을 불러오지 못했습니다.</div>';
    $('#calendar-detail').textContent='달력을 불러오지 못했습니다.';
  }
}
loadContent();
window.addEventListener('storage', event => {
  if (event.key !== 'cedrai-field-notes-v1') return;
  renderJournalDesk(); renderPosts();
});
