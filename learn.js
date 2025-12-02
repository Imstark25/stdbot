/**
 * Learn Page - Student AI Doubt Solver
 */

const THEME_KEY = "studyai_theme";

// DOM Elements
const elements = {
  particles: document.getElementById("particles"),
  toastContainer: document.getElementById("toastContainer"),
  themeToggle: document.getElementById("themeToggle"),
  themeDropdown: document.getElementById("themeDropdown"),
};

// ===== Theme Management =====
function initTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY) || "dark";
  setTheme(savedTheme);
}

function setTheme(themeId) {
  document.documentElement.setAttribute("data-theme", themeId);
  localStorage.setItem(THEME_KEY, themeId);
  
  const options = document.querySelectorAll(".theme-option");
  options.forEach((option) => {
    option.classList.toggle("active", option.dataset.theme === themeId);
  });
  
  const toggleBtn = elements.themeToggle;
  if (toggleBtn) {
    const isLight = themeId === "light";
    toggleBtn.innerHTML = isLight
      ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>`
      : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="5"/>
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
        </svg>`;
  }
}

function initThemeSelector() {
  const options = document.querySelectorAll(".theme-option");
  options.forEach((option) => {
    option.addEventListener("click", () => {
      setTheme(option.dataset.theme);
      showToast(`Theme changed to ${option.textContent.trim()}`);
    });
  });
}

// ===== Particles =====
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

// ===== Toast =====
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

// ===== Initialize =====
function init() {
  initTheme();
  initThemeSelector();
  initParticles();
}

document.addEventListener("DOMContentLoaded", init);
