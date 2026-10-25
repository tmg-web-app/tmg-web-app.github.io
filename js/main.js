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

  // Promo modal
  const promoModal = document.getElementById('promoModal');
  const modalTopic = promoModal ? promoModal.querySelector('[data-modal-topic]') : null;
  let lastTrigger = null;

  const openPromoModal = (topic, trigger) => {
    if (!promoModal || !promoModal.hidden) {
      return;
    }
    lastTrigger = trigger || null;
    if (topic && modalTopic) {
      modalTopic.textContent = topic;
    }
    promoModal.hidden = false;
    document.body.classList.add('modal-open');
    const closeButton = promoModal.querySelector('.modal-close');
    if (closeButton) {
      closeButton.focus();
    }
  };

  const closePromoModal = () => {
    promoModal.hidden = true;
    document.body.classList.remove('modal-open');
    if (lastTrigger) {
      lastTrigger.focus();
      lastTrigger = null;
    }
  };

  const promoTriggers = document.querySelectorAll('.promo-trigger');
  for (const trigger of promoTriggers) {
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      openPromoModal(trigger.getAttribute('data-modal-topic'), trigger);
    });
  }

  // Hero promo sticker opens on mouse-down / touch-press, plus keyboard access
  const stickerTrigger = document.querySelector('.hero-promo-sticker.promo-trigger');
  if (stickerTrigger) {
    stickerTrigger.addEventListener('pointerdown', (e) => {
      if (e.button !== undefined && e.button !== 0) {
        return;
      }
      e.preventDefault();
      openPromoModal(stickerTrigger.getAttribute('data-modal-topic'), stickerTrigger);
    });
    stickerTrigger.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openPromoModal(stickerTrigger.getAttribute('data-modal-topic'), stickerTrigger);
      }
    });
  }

  if (promoModal) {
    for (const closer of promoModal.querySelectorAll('[data-modal-close]')) {
      closer.addEventListener('click', closePromoModal);
    }

    promoModal.addEventListener('click', (e) => {
      if (e.target === promoModal) {
        closePromoModal();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !promoModal.hidden) {
        closePromoModal();
      }
    });

    document.addEventListener('focusin', (e) => {
      if (promoModal.hidden || promoModal.contains(e.target)) {
        return;
      }
      const focusable = promoModal.querySelectorAll('a[href], button');
      if (focusable.length) {
        focusable[0].focus();
      }
    });
  }

  // Smooth Scrolling for Anchors
  const scrollLinks = document.querySelectorAll('a[href^="#"]:not(.promo-trigger)');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const heroVideo = document.querySelector('.hero-video');
  if (heroVideo && prefersReducedMotion) {
    heroVideo.removeAttribute('autoplay');
    heroVideo.pause();
    heroVideo.currentTime = 0;
  } else if (heroVideo) {
    // Play the full video once, then loop only the final 4 seconds.
    // A pre-seeked standby copy cross-fades in near the end so the loop has no seek stall.
    const loopSeconds = 4;
    const fadeSeconds = 0.4;
    const standby = heroVideo.cloneNode();
    standby.removeAttribute('autoplay');
    standby.removeAttribute('aria-label');
    standby.setAttribute('aria-hidden', 'true');
    standby.classList.add('is-standby');
    heroVideo.after(standby);

    const loopStart = (video) => Math.max(0, video.duration - loopSeconds);
    const primeStandby = (video) => {
      video.pause();
      video.currentTime = loopStart(video);
    };
    standby.addEventListener('loadedmetadata', () => primeStandby(standby), { once: true });

    let active = heroVideo;
    let idle = standby;
    let swapping = false;

    const swap = () => {
      swapping = true;
      const previous = active;
      idle.play();
      idle.classList.remove('is-standby');
      previous.classList.add('is-standby');
      active = idle;
      idle = previous;
      setTimeout(() => {
        primeStandby(previous);
        swapping = false;
      }, fadeSeconds * 1000 + 100);
    };

    const watch = () => {
      if (!swapping && active.duration && active.currentTime >= active.duration - fadeSeconds) {
        swap();
      }
      requestAnimationFrame(watch);
    };
    requestAnimationFrame(watch);
  }
  
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
});