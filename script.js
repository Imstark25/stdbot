/* Student AI Doubt Solver - Frontend (static) 
   Implements submit flow, placeholder backend call, and renderers.
*/

const WEBHOOK_URL = "https://your-n8n-webhook-url-here";

// Elements
const form = document.getElementById('askForm');
const questionInput = document.getElementById('questionInput');
const includeDiagramEl = document.getElementById('includeDiagram');
const loadingCard = document.getElementById('loadingCard');
const resultSection = document.getElementById('result');
const mainEl = document.getElementById('main');

const quickAnswerEl = document.getElementById('quickAnswer');
const stepsListEl = document.getElementById('stepsList');
const citationsListEl = document.getElementById('citationsList');
const imageTrackEl = document.getElementById('imageTrack');
const prevImgBtn = document.getElementById('prevImgBtn');
const nextImgBtn = document.getElementById('nextImgBtn');
const flashcardsEl = document.getElementById('flashcards');
const followUpsEl = document.getElementById('followUps');

let carouselIndex = 0;

// Init
document.addEventListener('DOMContentLoaded', () => {
  wireEvents();
  revealOnIntersect();
});

function wireEvents() {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    submitQuestion();
  });
  prevImgBtn.addEventListener('click', () => moveCarousel(-1));
  nextImgBtn.addEventListener('click', () => moveCarousel(1));
}

// Intersection reveal animations
function revealOnIntersect() {
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    }
  }, { threshold: 0.08 });
  document.querySelectorAll('[data-animate], .card').forEach(el => observer.observe(el));
}

// 1) Submit flow
async function submitQuestion() {
  const question = (questionInput.value || '').trim();
  const includeDiagram = !!includeDiagramEl.checked;

  if (!question) {
    questionInput.focus();
    questionInput.setAttribute('aria-invalid', 'true');
    return;
  } else {
    questionInput.removeAttribute('aria-invalid');
  }

  showLoading();
  try {
    const data = await callBackend(question, includeDiagram);
    renderResult(data);
  } catch (err) {
    console.error(err);
    renderResult({
      answer: 'Sorry, something went wrong. Please try again later.',
      steps: [], citations: [], images: [], flashcards: []
    });
  } finally {
    hideLoading();
  }
}

// 2) Backend call (placeholder)
async function callBackend(question, includeDiagram) {
  // If user hasn't configured URL, return mock data to demo UI
  const isPlaceholder = WEBHOOK_URL.includes('your-n8n-webhook-url-here');
  if (isPlaceholder) {
    await sleep(800);
    return mockResponse(question, includeDiagram);
  }

  const payload = { question, includeDiagram };
  const res = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(`Backend error: ${res.status}`);
  const data = await res.json();
  return data;
}

// 3) Render result
function renderResult(data) {
  // Ensure expected shape
  const answer = data?.answer || '';
  const steps = Array.isArray(data?.steps) ? data.steps : [];
  const citations = Array.isArray(data?.citations) ? data.citations : [];
  const images = Array.isArray(data?.images) ? data.images : [];
  const flashcards = Array.isArray(data?.flashcards) ? data.flashcards : [];

  quickAnswerEl.textContent = answer;
  renderSteps(steps);
  renderCitations(citations);
  renderImages(images);
  renderFlashcards(flashcards);
  renderFollowUps(answer, steps);

  resultSection.hidden = false;
  resultSection.setAttribute('aria-hidden', 'false');
  // Trigger reveal animation for new content
  requestAnimationFrame(() => {
    document.querySelectorAll('#result [data-animate], #result .card').forEach(el => {
      el.classList.add('is-visible');
    });
  });
}

// 4) Images carousel
function renderImages(imageUrls = []) {
  clearChildren(imageTrackEl);
  if (!imageUrls.length) {
    imageTrackEl.style.transform = 'translateX(0)';
    carouselIndex = 0;
    return;
  }

  imageUrls.forEach((url, i) => {
    const slide = document.createElement('div');
    slide.className = 'carousel__slide';
    slide.setAttribute('role', 'listitem');

    const img = document.createElement('img');
    img.src = url;
    img.alt = `Result illustration ${i + 1}`;
    slide.appendChild(img);
    imageTrackEl.appendChild(slide);
  });
  carouselIndex = 0;
  updateCarousel();
}

function moveCarousel(delta) {
  const count = imageTrackEl.children.length;
  if (!count) return;
  carouselIndex = (carouselIndex + delta + count) % count;
  updateCarousel();
}

function updateCarousel() {
  const count = imageTrackEl.children.length;
  const pct = count ? (carouselIndex * -100) : 0;
  imageTrackEl.style.transform = `translateX(${pct}%)`;
}

// 5) Flashcards
function renderFlashcards(cards = []) {
  clearChildren(flashcardsEl);
  if (!cards.length) return;

  cards.forEach((card, idx) => {
    const root = document.createElement('div');
    root.className = 'flashcard';
    root.setAttribute('data-index', String(idx));

    const q = document.createElement('div');
    q.className = 'flashcard__q';
    q.textContent = card.q || 'Question';

    const a = document.createElement('div');
    a.className = 'flashcard__a';
    a.textContent = card.a || 'Answer';

    const btn = document.createElement('button');
    btn.className = 'btn flashcard__toggle';
    btn.type = 'button';
    btn.setAttribute('aria-expanded', 'false');
    btn.textContent = 'Show answer';

    btn.addEventListener('click', () => {
      const open = root.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.textContent = open ? 'Hide answer' : 'Show answer';
    });

    root.append(q, a, btn);
    flashcardsEl.appendChild(root);
  });
}

// 6) Steps
function renderSteps(steps = []) {
  clearChildren(stepsListEl);
  steps.forEach((s) => {
    const li = document.createElement('li');
    li.textContent = s;
    stepsListEl.appendChild(li);
  });
}

// 7) Citations
function renderCitations(list = []) {
  clearChildren(citationsListEl);
  list.forEach((c) => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = c.url || '#';
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = c.title || c.url || 'Source';
    li.appendChild(a);
    citationsListEl.appendChild(li);
  });
}

// 8) Loading state
function showLoading() {
  mainEl.setAttribute('aria-busy', 'true');
  loadingCard.hidden = false;
  loadingCard.setAttribute('aria-hidden', 'false');
  resultSection.hidden = true;
  resultSection.setAttribute('aria-hidden', 'true');
}

function hideLoading() {
  mainEl.removeAttribute('aria-busy');
  loadingCard.hidden = true;
  loadingCard.setAttribute('aria-hidden', 'true');
}

// Follow-ups (bonus)
function renderFollowUps(answer, steps) {
  clearChildren(followUpsEl);
  const suggestions = [
    'Explain this in simpler words',
    'Give me another example',
    'Turn this into 3 flashcards',
    'Provide a real-world application',
  ];
  suggestions.forEach(text => {
    const chip = document.createElement('button');
    chip.className = 'chip';
    chip.type = 'button';
    chip.textContent = text;
    chip.addEventListener('click', () => {
      questionInput.value = `${answer ? answer + '\n' : ''}${text}`.trim();
      questionInput.focus();
    });
    followUpsEl.appendChild(chip);
  });
}

// Utilities
function clearChildren(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Mock backend response for demo
function mockResponse(question, includeDiagram) {
  return {
    answer: `Summary: ${question.slice(0, 100)}${question.length > 100 ? '…' : ''}`,
    steps: [
      'Identify given data and unknowns',
      'Apply the relevant formula or concept',
      'Substitute known values and simplify',
      'Verify units and reasonableness of result'
    ],
    citations: [
      { title: 'Khan Academy - Related Topic', url: 'https://www.khanacademy.org/' },
      { title: 'Wikipedia - Overview', url: 'https://en.wikipedia.org/' }
    ],
    images: includeDiagram ? [
      'https://images.unsplash.com/photo-1559757175-08c3f857a5f7?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?q=80&w=1200&auto=format&fit=crop'
    ] : [],
    flashcards: [
      { q: 'What is the core concept here?', a: 'It revolves around understanding relationships between given variables.' },
      { q: 'Which formula is key?', a: 'Use the primary formula linking the knowns to the unknown.' }
    ]
  };
}
