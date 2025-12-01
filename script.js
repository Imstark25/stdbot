/**
 * Student AI Doubt Solver - Rive-inspired UI
 * Modern, animated, dark theme interface
 */

// ===== Configuration =====
const WEBHOOK_URL = "https://your-n8n-webhook-url-here";
const MAX_HISTORY = 200;
const STORAGE_KEY = "studyai_history";

// ===== DOM Elements =====
const elements = {
  particles: document.getElementById("particles"),
  subjectsCarousel: document.getElementById("subjectsCarousel"),
  questionInput: document.getElementById("questionInput"),
  charCount: document.getElementById("charCount"),
  submitBtn: document.getElementById("submitBtn"),
  resultsSection: document.getElementById("resultsSection"),
  loadingState: document.getElementById("loadingState"),
  answerCard: document.getElementById("answerCard"),
  answerContent: document.getElementById("answerContent"),
  flashcardsSection: document.getElementById("flashcardsSection"),
  flashcardsGrid: document.getElementById("flashcardsGrid"),
  copyBtn: document.getElementById("copyBtn"),
  exportBtn: document.getElementById("exportBtn"),
  toastContainer: document.getElementById("toastContainer"),
  imageModal: document.getElementById("imageModal"),
  modalImage: document.getElementById("modalImage"),
  modalClose: document.getElementById("modalClose"),
  themeToggle: document.getElementById("themeToggle"),
};

// ===== Initialize Particles =====
function initParticles() {
  const particleCount = 30;
  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement("div");
    particle.className = "particle";
    particle.style.left = `${Math.random() * 100}%`;
    particle.style.animationDuration = `${15 + Math.random() * 20}s`;
    particle.style.animationDelay = `${Math.random() * 15}s`;
    particle.style.opacity = 0.3 + Math.random() * 0.4;
    particle.style.width = particle.style.height = `${2 + Math.random() * 4}px`;
    elements.particles.appendChild(particle);
  }
}

// ===== Subject Selection =====
function initSubjectCarousel() {
  const chips = elements.subjectsCarousel.querySelectorAll(".subject-chip");
  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      chips.forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
    });
  });
}

function getSelectedSubject() {
  const active = elements.subjectsCarousel.querySelector(".subject-chip.active");
  return active ? active.dataset.subject : "General";
}

// ===== Character Count =====
function updateCharCount() {
  const count = elements.questionInput.value.length;
  elements.charCount.textContent = count;
  if (count > 900) {
    elements.charCount.style.color = "#ef4444";
  } else if (count > 700) {
    elements.charCount.style.color = "#f59e0b";
  } else {
    elements.charCount.style.color = "";
  }
}

// ===== Toast Notifications =====
function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${type === "success" ? "#10b981" : "#ef4444"}" stroke-width="2">
      ${type === "success" 
        ? '<path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>'
        : '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>'}
    </svg>
    <span>${message}</span>
  `;
  elements.toastContainer.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add("hiding");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ===== Loading Animation =====
function showLoading() {
  elements.resultsSection.classList.add("visible");
  elements.loadingState.classList.add("visible");
  elements.answerCard.classList.remove("visible");
  elements.flashcardsSection.classList.remove("visible");
  elements.submitBtn.classList.add("loading");
  
  // Animate loading steps
  const steps = elements.loadingState.querySelectorAll(".step");
  steps.forEach((step, index) => {
    setTimeout(() => {
      steps.forEach((s) => s.classList.remove("active", "completed"));
      for (let i = 0; i < index; i++) {
        steps[i].classList.add("completed");
      }
      steps[index].classList.add("active");
    }, index * 1500);
  });
}

function hideLoading() {
  elements.loadingState.classList.remove("visible");
  elements.submitBtn.classList.remove("loading");
}

// ===== API Call =====
async function callBackend(question, subject) {
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, subject }),
    });
    
    if (!response.ok) throw new Error("Network error");
    return await response.json();
  } catch (error) {
    console.warn("Using mock data:", error.message);
    return getMockResponse(question, subject);
  }
}

function getMockResponse(question, subject) {
  return {
    summary: `This is a comprehensive explanation for your ${subject} question: "${question}". The AI has analyzed your query and generated detailed steps to help you understand the concept thoroughly.`,
    steps: [
      {
        title: "Understanding the Basics",
        description: "First, let's establish the fundamental concepts. This forms the foundation for deeper understanding of the topic."
      },
      {
        title: "Core Principles",
        description: "Now we explore the main principles and theories that govern this concept. These are essential for solving related problems."
      },
      {
        title: "Practical Application",
        description: "Here's how you can apply this knowledge to solve real problems. Practice with similar examples to reinforce your understanding."
      },
      {
        title: "Common Mistakes to Avoid",
        description: "Be aware of these frequent errors students make. Understanding these will help you avoid them in exams."
      }
    ],
    images: [
      "https://picsum.photos/seed/study1/400/250",
      "https://picsum.photos/seed/study2/400/250"
    ],
    citations: [
      { title: "Khan Academy - Comprehensive Guide", url: "https://khanacademy.org" },
      { title: "MIT OpenCourseWare", url: "https://ocw.mit.edu" },
      { title: "Wikipedia Reference", url: "https://wikipedia.org" }
    ],
    flashcards: [
      { front: "What is the key concept?", back: "The key concept involves understanding the relationship between variables and applying formulas correctly." },
      { front: "How do you solve this type of problem?", back: "Break it down into steps: identify variables, apply the formula, and verify your answer." },
      { front: "What are common applications?", back: "This concept is used in engineering, physics, and everyday problem-solving scenarios." }
    ]
  };
}

// ===== Render Answer =====
function renderAnswer(data) {
  let html = "";
  
  // Summary
  if (data.summary) {
    html += `<div class="answer-summary">${data.summary}</div>`;
  }
  
  // Steps
  if (data.steps && data.steps.length > 0) {
    html += `<div class="answer-steps">`;
    data.steps.forEach((step, index) => {
      html += `
        <div class="step-item" style="animation-delay: ${index * 0.1}s">
          <div class="step-number">${index + 1}</div>
          <div class="step-content">
            <h4>${step.title}</h4>
            <p>${step.description}</p>
          </div>
        </div>
      `;
    });
    html += `</div>`;
  }
  
  // Images
  if (data.images && data.images.length > 0) {
    html += `<div class="answer-images">`;
    data.images.forEach((img) => {
      html += `<img src="${img}" alt="Visual aid" class="answer-image" onclick="openImageModal('${img}')" />`;
    });
    html += `</div>`;
  }
  
  // Citations
  if (data.citations && data.citations.length > 0) {
    html += `
      <div class="answer-citations">
        <h4>References</h4>
        <div class="citation-list">
          ${data.citations.map((c) => `<a href="${c.url}" target="_blank" rel="noopener" class="citation-link">${c.title}</a>`).join("")}
        </div>
      </div>
    `;
  }
  
  elements.answerContent.innerHTML = html;
  elements.answerCard.classList.add("visible");
}

// ===== Render Flashcards =====
function renderFlashcards(flashcards) {
  if (!flashcards || flashcards.length === 0) return;
  
  elements.flashcardsGrid.innerHTML = flashcards.map((card, index) => `
    <div class="flashcard" onclick="this.classList.toggle('flipped')" style="animation-delay: ${index * 0.1}s">
      <div class="flashcard-inner">
        <div class="flashcard-front">${card.front}</div>
        <div class="flashcard-back">${card.back}</div>
      </div>
    </div>
  `).join("");
  
  elements.flashcardsSection.classList.add("visible");
}

// ===== Image Modal =====
function openImageModal(src) {
  elements.modalImage.src = src;
  elements.imageModal.classList.add("visible");
}

function closeImageModal() {
  elements.imageModal.classList.remove("visible");
}

// ===== Local Storage =====
function saveToHistory(question, subject, response) {
  const history = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  history.unshift({
    id: Date.now(),
    question,
    subject,
    response,
    timestamp: new Date().toISOString()
  });
  
  // Keep only last MAX_HISTORY entries
  if (history.length > MAX_HISTORY) {
    history.length = MAX_HISTORY;
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

// ===== Submit Question =====
async function submitQuestion() {
  const question = elements.questionInput.value.trim();
  const subject = getSelectedSubject();
  
  if (!question) {
    showToast("Please enter a question", "error");
    elements.questionInput.focus();
    return;
  }
  
  if (question.length > 1000) {
    showToast("Question is too long (max 1000 characters)", "error");
    return;
  }
  
  showLoading();
  
  try {
    const response = await callBackend(question, subject);
    
    // Wait minimum time for animation
    await new Promise((resolve) => setTimeout(resolve, 3000));
    
    hideLoading();
    renderAnswer(response);
    renderFlashcards(response.flashcards);
    saveToHistory(question, subject, response);
    showToast("Answer generated successfully!");
    
    // Scroll to results
    elements.resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    hideLoading();
    showToast("Failed to generate answer. Please try again.", "error");
    console.error(error);
  }
}

// ===== Copy to Clipboard =====
async function copyAnswer() {
  const text = elements.answerContent.innerText;
  try {
    await navigator.clipboard.writeText(text);
    showToast("Copied to clipboard!");
  } catch (error) {
    showToast("Failed to copy", "error");
  }
}

// ===== Export PDF =====
function exportPDF() {
  const element = elements.answerCard;
  const opt = {
    margin: 1,
    filename: "StudyAI-Answer.pdf",
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: "in", format: "letter", orientation: "portrait" }
  };
  
  html2pdf().set(opt).from(element).save();
  showToast("PDF exported!");
}

// ===== Event Listeners =====
function initEventListeners() {
  // Input events
  elements.questionInput.addEventListener("input", updateCharCount);
  elements.questionInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      submitQuestion();
    }
  });
  
  // Submit button
  elements.submitBtn.addEventListener("click", submitQuestion);
  
  // Card actions
  elements.copyBtn.addEventListener("click", copyAnswer);
  elements.exportBtn.addEventListener("click", exportPDF);
  
  // Modal
  elements.modalClose.addEventListener("click", closeImageModal);
  elements.imageModal.addEventListener("click", (e) => {
    if (e.target === elements.imageModal) closeImageModal();
  });
  
  // Keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeImageModal();
  });
}

// ===== Initialize =====
function init() {
  initParticles();
  initSubjectCarousel();
  initEventListeners();
  updateCharCount();
  
  // Focus input after a delay
  setTimeout(() => {
    elements.questionInput.focus();
  }, 1000);
}

// Make openImageModal available globally for inline onclick
window.openImageModal = openImageModal;

// Start app
document.addEventListener("DOMContentLoaded", init);
