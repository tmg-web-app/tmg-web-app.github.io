document.addEventListener('DOMContentLoaded', () => {
  // Mobile Navigation Toggle
  const navToggle = document.getElementById('navToggle');
  const navMenu = document.getElementById('navMenu');

  if (navToggle && navMenu) {
    navToggle.addEventListener('click', () => {
      navMenu.classList.toggle('open');
    });
  }

  // Smooth Scrolling for Anchors
  const scrollLinks = document.querySelectorAll('a[href^="#"]');
  
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
          behavior: 'smooth'
        });
      }
    });
  }

  // Placeholder for advanced animations (e.g., node interaction)
  console.log("Tri-State Media Group - Modern Tech Site Loaded");
});