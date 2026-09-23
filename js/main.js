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
        if (navMenu && navMenu.classList.contains('open')) {
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

  // Contact form submission via the Cloudflare Worker (fetch/JSON, no page navigation).
  const contactForm = document.getElementById('contactForm');

  if (contactForm) {
    const statusEl = document.getElementById('formStatus');
    const submitButton = contactForm.querySelector('.form-submit');
    const endpoint = contactForm.dataset.endpoint;
    const originalButtonLabel = submitButton ? submitButton.textContent : '';

    const setStatus = (message, state) => {
      if (!statusEl) {
        return;
      }

      statusEl.textContent = message;
      statusEl.classList.remove('form-status-pending', 'form-status-success', 'form-status-error');

      if (state) {
        statusEl.classList.add(`form-status-${state}`);
      }
    };

    contactForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      if (!submitButton || submitButton.disabled) {
        return;
      }

      submitButton.disabled = true;
      submitButton.setAttribute('aria-busy', 'true');
      submitButton.textContent = 'Sending…';
      setStatus('Sending your message…', 'pending');

      try {
        if (!endpoint) {
          throw new Error('The contact form is not configured yet. Please try again later.');
        }

        const formData = new FormData(contactForm);
        const payload = {
          name: (formData.get('name') || '').toString().trim(),
          email: (formData.get('email') || '').toString().trim(),
          service: (formData.get('service') || '').toString().trim(),
          message: (formData.get('message') || '').toString().trim(),
          website: (formData.get('website') || '').toString().trim(),
        };

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        let result = {};
        try {
          result = await response.json();
        } catch {
          result = {};
        }

        if (!response.ok || !result.ok) {
          throw new Error(result.error || 'Unable to send your message right now. Please try again later.');
        }

        setStatus('Message sent. Redirecting…', 'success');
        window.location.href = 'thanks.html';
      } catch (error) {
        submitButton.disabled = false;
        submitButton.removeAttribute('aria-busy');
        submitButton.textContent = originalButtonLabel;
        setStatus(
          error instanceof Error ? error.message : 'Unable to send your message right now. Please try again later.',
          'error'
        );
      }
    });
  }
});