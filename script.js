/* Student AI Doubt Solver – Dashboard Frontend (static) */

// Constants
const WEBHOOK_URL = "https://your-n8n-webhook-url-here";
const STORAGE_KEYS = {
  HISTORY: 'sads_history',
  REVISION: 'sads_revision',
  SRS: 'sads_flashcard_srs'
};

// DOM helpers
const dom = (sel, root=document) => root.querySelector(sel);
const domAll = (sel, root=document) => Array.from(root.querySelectorAll(sel));
function createEl(tag, { classes=[], attrs={}, html, text }={}){
  const el = document.createElement(tag);
  if (classes.length) el.className = classes.join(' ');
  Object.entries(attrs).forEach(([k,v]) => el.setAttribute(k, v));
  if (html!=null) el.innerHTML = html;
  if (text!=null) el.textContent = text;
  return el;
}

// Toast
function showToast(message, type='info'){
  const t = dom('#toast');
  if (!t) return; t.textContent = message; t.classList.add('show');
  if (type==='error') t.style.background = '#b00020'; else t.style.background = '#18212f';
  setTimeout(()=> t.classList.remove('show'), 2200);
}

// Storage utils
function loadLocalHistory(){
  try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.HISTORY)) || []; } catch { return []; }
}
function saveLocalHistory(arr){ localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(arr.slice(0,200))); }
function saveToLocalHistory(cardObj){
  const arr = loadLocalHistory();
  arr.unshift(cardObj);
  saveLocalHistory(arr);
}
function loadRevision(){ try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.REVISION)) || []; } catch { return []; } }
function saveRevision(arr){ localStorage.setItem(STORAGE_KEYS.REVISION, JSON.stringify(arr)); }
function loadSRS(){ try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.SRS)) || {}; } catch { return {}; } }
function saveSRS(obj){ localStorage.setItem(STORAGE_KEYS.SRS, JSON.stringify(obj)); }

// Debounce
function debounce(fn, delay=300){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a),delay); }; }

// Elements
const form = dom('#askForm');
const questionInput = dom('#questionInput');
const subjectSelect = dom('#subjectSelect');
const submitBtn = dom('#submitBtn');
const includeDiagramEl = dom('#includeDiagram');
const loader = dom('#loader');
const errorBox = dom('#errorBox');
const studyCard = dom('#studyCard');
const quickAnswerEl = dom('#quickAnswer');
const stepsListEl = dom('#stepsList');
const citationsListEl = dom('#citationsList');
const imagesGridEl = dom('#imagesGrid');
const flashcardsEl = dom('#flashcards');
const followUpsEl = dom('#followUps');
const statsCountEl = dom('#statsCount');
const historyListEl = dom('#historyList');
const saveBtn = dom('#saveBtn');
const exportBtn = dom('#exportBtn');
const revisionBtn = dom('#revisionBtn');
const searchInput = dom('#searchInput');
const subjectTop = dom('#subjectTop');
const subjectCarousel = dom('.subject-carousel');
const subjectBtns = domAll('.subject-btn');

// Sidebar and modal
const sidebar = dom('.sidebar');
const mobileMenuBtn = dom('#mobileMenuBtn');
const imageModal = dom('#imageModal');
const modalImage = dom('#modalImage');
const modalDownload = dom('#modalDownload');
const modalCloseBtn = dom('#modalCloseBtn');

// Loader step animation
let loaderInterval = null;

// Keyboard: Ctrl+Enter submits
document.addEventListener('keydown', (e)=>{
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    if (document.activeElement === questionInput || document.activeElement === document.body) {
      e.preventDefault(); form?.dispatchEvent(new Event('submit', { cancelable:true }));
    }
  }
});

// Init
document.addEventListener('DOMContentLoaded', ()=>{
  form.addEventListener('submit', (e)=>{ e.preventDefault(); submitQuestion(); });
  saveBtn.addEventListener('click', onSave);
  exportBtn.addEventListener('click', ()=> exportCardAsPDF('studyCard'));
  revisionBtn.addEventListener('click', onAddToRevision);

  // Subject carousel handling
  subjectBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      subjectBtns.forEach(b => {
        b.classList.remove('is-active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('is-active');
      btn.setAttribute('aria-selected', 'true');
      subjectSelect.value = btn.dataset.subject;
      // Scroll into view
      btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    });
  });

  // Sidebar mobile toggle
  mobileMenuBtn.addEventListener('click', ()=> sidebar.classList.toggle('is-open'));

  // Search debounce filters history list
  searchInput.addEventListener('input', debounce(()=> renderHistorySidebar(searchInput.value.trim()), 300));
  if (subjectTop) subjectTop.addEventListener('change', ()=> {
    subjectSelect.value = subjectTop.value;
    // Sync carousel
    subjectBtns.forEach(b => {
      b.classList.toggle('is-active', b.dataset.subject === subjectTop.value);
    });
  });

  // Modal handlers
  dom('[data-close-modal]', imageModal).addEventListener('click', closeModal);
  modalCloseBtn.addEventListener('click', closeModal);
  document.addEventListener('keydown', (e)=>{ if(e.key==='Escape' && !imageModal.classList.contains('hidden')) closeModal(); });

  // Shortcuts
  dom('#genDiagramBtn').addEventListener('click', ()=> showToast('Diagram generation will be added soon.'));
  dom('#exportAllBtn').addEventListener('click', ()=> showToast('Exporting all is not implemented in demo.'));

  // Nav items
  domAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      domAll('.nav-item').forEach(i => i.classList.remove('is-active'));
      item.classList.add('is-active');
    });
  });

  // Initial UI
  updateStats();
  renderHistorySidebar();
});

// Submit flow
async function submitQuestion(){
  const question = (questionInput.value||'').trim();
  const subject = (subjectSelect.value||'General').trim();
  const includeDiagram = !!includeDiagramEl.checked;
  if (!question) { showError('Please enter a question.'); questionInput.focus(); return; }
  clearError(); setLoading(true);
  try{
    const data = await callBackend(question, subject, includeDiagram);
    renderStudyCard(data);
    const historyItem = {
      id: String(Date.now()),
      question,
      shortAnswer: (data.answer||'').slice(0,160),
      createdAt: new Date().toISOString(),
      summarySnippet: (data.steps && data.steps[0]) ? String(data.steps[0]).slice(0,120) : ''
    };
    saveToLocalHistory(historyItem);
    updateStats();
    renderHistorySidebar();
  }catch(err){
    console.error(err); showToast('Failed to fetch answer.', 'error'); showError('Something went wrong. Please try again.');
  }finally{ setLoading(false); }
}

// Backend call with mock fallback
async function callBackend(question, subject, includeDiagram){
  const payload = { question, subject, include_diagram: includeDiagram };
  const placeholder = !WEBHOOK_URL || WEBHOOK_URL.includes('your-n8n-webhook-url-here');
  if (placeholder) {
    await sleep(800);
    return mockResponse(question, subject, includeDiagram);
  }
  const res = await fetch(WEBHOOK_URL, {
    method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// Renderers
function renderStudyCard(data){
  const answer = data?.answer || '';
  const steps = Array.isArray(data?.steps) ? data.steps : [];
  const citations = Array.isArray(data?.citations) ? data.citations : [];
  const images = Array.isArray(data?.images) ? data.images : [];
  const flashcards = Array.isArray(data?.flashcards) ? data.flashcards : [];
  const followUps = Array.isArray(data?.follow_ups) ? data.follow_ups : [];

  quickAnswerEl.textContent = answer;
  renderSteps(steps);
  renderCitations(citations);
  renderImages(images);
  renderFlashcards(flashcards);
  renderFollowUps(followUps, answer);

  studyCard.classList.remove('hidden');
  studyCard.scrollIntoView({ behavior:'smooth', block:'start' });
}

function renderSteps(steps){
  stepsListEl.innerHTML = '';
  steps.forEach(s=>{
    const li = createEl('li', { text: s });
    stepsListEl.appendChild(li);
  });
}

function renderCitations(list){
  citationsListEl.innerHTML='';
  list.forEach(c=>{
    const li = createEl('li');
    const a = createEl('a', { text: c.title || c.url || 'Source', attrs:{ href: c.url || '#', target:'_blank', rel:'noopener' } });
    li.appendChild(a); citationsListEl.appendChild(li);
  });
}

function renderImages(urls){
  imagesGridEl.innerHTML='';
  urls.forEach((url,i)=>{
    const item = createEl('div', { classes:['thumb'], attrs:{ role:'listitem', tabindex:'0', 'aria-label':`Open image ${i+1}` } });
    const img = createEl('img', { attrs:{ src:url, alt:`Image ${i+1}` } });
    item.appendChild(img);
    item.addEventListener('click', ()=> openImageModal(url));
    item.addEventListener('keypress', (e)=>{ if(e.key==='Enter') openImageModal(url); });
    imagesGridEl.appendChild(item);
  });
}

function renderFlashcards(cards){
  flashcardsEl.innerHTML='';
  const srs = loadSRS();
  cards.forEach((card, idx)=>{
    const root = createEl('div', { classes:['flashcard'] });
    const q = createEl('div', { classes:['flashcard__q'], text: card.q || 'Question' });
    const a = createEl('div', { classes:['flashcard__a'], text: card.a || 'Answer' });
    const toggle = createEl('button', { classes:['btn','btn-light'], text:'Show answer', attrs:{ type:'button','aria-expanded':'false' } });
    const mark = createEl('button', { classes:['btn','btn-ghost'], text:'Mark learned', attrs:{ type:'button' } });

    const key = currentHistoryIdHint();
    const learned = srs[key?.id || '']?.[idx] === true;
    if (learned) { mark.textContent = 'Learned ✓'; mark.style.opacity = '0.8'; }

    toggle.addEventListener('click', ()=>{
      const open = root.classList.toggle('is-open');
      toggle.textContent = open ? 'Hide answer' : 'Show answer';
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    mark.addEventListener('click', ()=>{
      const key2 = currentHistoryIdHint();
      if (!key2) { showToast('Save the card first to track progress.'); return; }
      const s = loadSRS(); s[key2.id] = s[key2.id] || {}; s[key2.id][idx] = !(s[key2.id][idx] === true);
      saveSRS(s);
      const state = s[key2.id][idx]; mark.textContent = state ? 'Learned ✓' : 'Mark learned'; mark.style.opacity = state ? '0.8' : '1';
    });

    root.append(q,a,createEl('div',{classes:['form__row']}, ), createEl('div'));
    // Actions row
    const row = createEl('div',{classes:['form__row']}); row.append(toggle, mark); root.appendChild(row);
    flashcardsEl.appendChild(root);
  });
}

function renderFollowUps(items, answer){
  followUpsEl.innerHTML='';
  const suggestions = (items && items.length) ? items : [
    'Explain this more simply', 'Give another example', 'Turn into flashcards', 'Show a real-world use'
  ];
  suggestions.forEach(text=>{
    const chip = createEl('button',{ classes:['chip'], text, attrs:{ type:'button' } });
    chip.addEventListener('click', ()=>{ questionInput.value = `${questionInput.value}\n${text}`.trim(); questionInput.focus(); });
    followUpsEl.appendChild(chip);
  });
}

// Image modal
function openImageModal(url){
  modalImage.src = url; modalDownload.href = url; imageModal.classList.remove('hidden'); modalCloseBtn.focus();
}
function closeModal(){ imageModal.classList.add('hidden'); modalImage.removeAttribute('src'); }

// Actions
function onSave(){
  const question = (questionInput.value||'').trim(); if (!question) return showToast('Ask a question first.','error');
  const item = {
    id: String(Date.now()),
    question,
    shortAnswer: (quickAnswerEl.textContent||'').slice(0,160),
    createdAt: new Date().toISOString(),
    summarySnippet: dom('#stepsList li')?.textContent?.slice(0,120) || ''
  };
  saveToLocalHistory(item); updateStats(); renderHistorySidebar();
  setCurrentHistoryIdHint(item.id);
  showToast('Saved to history.');
}

function onAddToRevision(){
  const hist = loadLocalHistory(); if (!hist.length) { showToast('Save the card first.','error'); return; }
  const current = hist[0];
  const rev = new Set(loadRevision()); rev.add(current.id); saveRevision(Array.from(rev));
  setCurrentHistoryIdHint(current.id);
  showToast('Added to revision list.');
}

function exportCardAsPDF(cardId){
  const el = document.getElementById(cardId); if (!el) return;
  if (window.html2pdf){
    window.html2pdf().from(el).set({ margin: 0.5, filename: 'study-card.pdf', image:{ type:'jpeg', quality:0.98 }, html2canvas:{ scale:2 } }).save();
  } else {
    showToast('PDF library not loaded.', 'error');
  }
}

// Loading / Errors
function setLoading(isLoading){
  if (isLoading){ 
    submitBtn.disabled = true; 
    loader.hidden = false;
    // Animate loader steps
    animateLoaderSteps();
  }
  else { 
    submitBtn.disabled = false; 
    loader.hidden = true;
    stopLoaderAnimation();
  }
}

function animateLoaderSteps() {
  const steps = domAll('.loader-step', loader);
  let currentStep = 0;
  
  // Reset all steps
  steps.forEach((s, i) => {
    s.classList.remove('is-active', 'is-done');
    s.querySelector('.loader-step-icon').textContent = '◯';
  });
  steps[0].classList.add('is-active');
  steps[0].querySelector('.loader-step-icon').textContent = '✓';
  
  loaderInterval = setInterval(() => {
    if (currentStep < steps.length - 1) {
      steps[currentStep].classList.remove('is-active');
      steps[currentStep].classList.add('is-done');
      currentStep++;
      steps[currentStep].classList.add('is-active');
      steps[currentStep].querySelector('.loader-step-icon').textContent = '✓';
    }
  }, 600);
}

function stopLoaderAnimation() {
  if (loaderInterval) {
    clearInterval(loaderInterval);
    loaderInterval = null;
  }
}
function showError(msg){ errorBox.textContent = msg; errorBox.hidden = false; }
function clearError(){ errorBox.hidden = true; errorBox.textContent = ''; }

// History sidebar
function renderHistorySidebar(filter=''){
  const list = loadLocalHistory();
  const filtered = filter ? list.filter(i=> i.question.toLowerCase().includes(filter.toLowerCase())) : list;
  historyListEl.innerHTML='';
  filtered.slice(0,10).forEach(item=>{
    const li = createEl('li', { classes:['history__item'] });
    const q = createEl('div', { text: item.question.slice(0,100) + (item.question.length>100?'…':'') });
    const meta = createEl('div', { classes:['history__meta'] });
    const time = new Date(item.createdAt).toLocaleString();
    meta.append(createEl('span',{ classes:['muted'], text: time }));
    const loadBtn = createEl('button',{ classes:['btn','btn-light'], text:'Load', attrs:{ type:'button','aria-label':'Load again' } });
    loadBtn.addEventListener('click', ()=>{ questionInput.value = item.question; submitQuestion(); });
    meta.append(loadBtn);
    li.append(q, meta); historyListEl.appendChild(li);
  });
}

function updateStats(){ statsCountEl.textContent = String(loadLocalHistory().length); }

// Helpers
function sleep(ms){ return new Promise(r=> setTimeout(r, ms)); }

// Current history id hint for SRS marking
let __currentHistoryId = null;
function setCurrentHistoryIdHint(id){ __currentHistoryId = id; }
function currentHistoryIdHint(){ const arr = loadLocalHistory(); const match = arr.find(x=> x.id===__currentHistoryId) || arr[0]; return match ? { id: match.id } : null; }

// Mock response for development
function mockResponse(question, subject, includeDiagram){
  return {
    answer: `Here is a concise explanation for “${question.slice(0,60)}${question.length>60?'…':''}”. It summarizes the key ideas in about three sentences for quick revision.`,
    steps: [
      'Identify the key variables and what is being asked.',
      'Recall the relevant concept or formula for this subject.',
      'Substitute known values, simplify, and check units/logic.',
      'Summarize the result and consider edge cases or assumptions.'
    ],
    citations: [
      { title:'Khan Academy – Topic overview', url:'https://www.khanacademy.org/' },
      { title:'Wikipedia – Background reading', url:'https://en.wikipedia.org/' }
    ],
    images: includeDiagram ? [
      'https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1559757175-08c3f857a5f7?q=80&w=1200&auto=format&fit=crop'
    ] : [],
    flashcards: [
      { q:'What is the main idea?', a:'Understanding the relationship between given variables and the goal.' },
      { q:'Which formula or concept applies?', a:'Use the primary rule linking inputs to the required output.' }
    ],
    follow_ups: ['Explain more simply','Give another example','Turn into flashcards','Real-world application']
  };
}
