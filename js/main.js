document.addEventListener('DOMContentLoaded', () => {
  const currentYear = new Date().getFullYear();

  for (const yearElement of document.querySelectorAll('.current-year')) {
    yearElement.textContent = String(currentYear);
  }

  // Mobile Navigation Toggle
  const navToggle = document.getElementById('navToggle');
  const navMenu = document.getElementById('navMenu');

  if (navToggle && navMenu) {
    navToggle.addEventListener('click', () => {
      const isOpen = navMenu.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', String(isOpen));
    });
  }

  // Smooth Scrolling for Anchors
  const scrollLinks = document.querySelectorAll('a[href^="#"]');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  for (const link of scrollLinks) {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      
      const targetId = link.getAttribute('href');
      const targetElement = document.querySelector(targetId);
      
      if (targetElement) {
        // Close mobile menu if open
        if (navMenu.classList.contains('open')) {
          navMenu.classList.remove('open');
        }
        
        // Scroll to element
        targetElement.scrollIntoView({
          behavior: prefersReducedMotion ? 'auto' : 'smooth'
        });
      }
    });
  }

  const requiredFields = document.querySelectorAll('[required][data-required-message]');

  for (const field of requiredFields) {
    field.addEventListener('invalid', () => {
      if (!field.value.trim()) {
        field.setCustomValidity(field.dataset.requiredMessage);
      }
    });

    field.addEventListener('input', () => {
      field.setCustomValidity('');
    });
  }

  // Placeholder for advanced animations (e.g., node interaction)
  console.log("Tri-State Media Group - Modern Tech Site Loaded");
});