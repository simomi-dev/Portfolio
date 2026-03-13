/* ═══════════════════════════════════════════════
   GALLERY PAGES — Shared JavaScript
   Logo lightbox, cursor, nav scroll, smooth scrolling
═══════════════════════════════════════════════ */
'use strict';

const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];

// ═══════════════ CUSTOM CURSOR ═══════════════
function initCursor() {
  const dot = $('#cursor-dot');
  const ring = $('#cursor-ring');
  const glow = $('#cursor-glow');
  if (!dot || !ring || !glow) return;

  window.addEventListener('mousemove', e => {
    gsap.to(dot, { x: e.clientX, y: e.clientY, duration: 0.05 });
    gsap.to(ring, { x: e.clientX, y: e.clientY, duration: 0.15, ease: 'power2.out' });
    gsap.to(glow, { x: e.clientX, y: e.clientY, duration: 0.3, ease: 'power2.out' });
  });

  const hoverTargets = 'a, button, .logo-gallery-item, .video-frame-thumb, .social-gallery-item, .web-project-card, .gallery-tab';
  document.addEventListener('mouseover', e => {
    const isHover = !!e.target.closest(hoverTargets);
    ring.classList.toggle('hov', isHover);
    glow.classList.toggle('hov', isHover);
  });

  document.addEventListener('mousedown', e => {
    const ripple = document.createElement('div');
    ripple.className = 'cursor-ripple';
    ripple.style.cssText = `left:${e.clientX}px;top:${e.clientY}px`;
    document.body.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  });
}

// ═══════════════ NAV SCROLL ═══════════════
function initNavScroll() {
  const nav = $('#main-nav');
  if (!nav) return;
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', scrollY > 80);
  });
  nav.classList.add('scrolled'); // Always scrolled on gallery pages
}

// ═══════════════ SCROLL REVEAL ═══════════════
function initScrollReveals() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        observer.unobserve(e.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });
  $$('.reveal-up').forEach(el => observer.observe(el));
}

// ═══════════════ LOGO LIGHTBOX ═══════════════
function initLogoLightbox() {
  const lightbox = $('#logo-lightbox');
  if (!lightbox) return;

  const backdrop = $('#logo-lb-backdrop');
  const closeBtn = $('#logo-lb-close');
  const prevBtn = $('#logo-lb-prev');
  const nextBtn = $('#logo-lb-next');
  const imgEl = $('#logo-lb-img');
  const items = $$('.logo-gallery-item');

  if (!items.length) return;

  let currentIndex = 0;
  const sources = items.map(item => {
    const img = item.querySelector('img');
    return img ? img.src : '';
  }).filter(Boolean);

  function open(index) {
    currentIndex = index;
    imgEl.src = sources[currentIndex];
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function close() {
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
  }
  function prev() {
    currentIndex = (currentIndex - 1 + sources.length) % sources.length;
    imgEl.src = sources[currentIndex];
  }
  function next() {
    currentIndex = (currentIndex + 1) % sources.length;
    imgEl.src = sources[currentIndex];
  }

  items.forEach((item, i) => {
    item.addEventListener('click', () => open(i));
  });

  if (closeBtn) closeBtn.addEventListener('click', close);
  if (backdrop) backdrop.addEventListener('click', close);
  if (prevBtn) prevBtn.addEventListener('click', prev);
  if (nextBtn) nextBtn.addEventListener('click', next);

  window.addEventListener('keydown', e => {
    if (!lightbox.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') prev();
    if (e.key === 'ArrowRight') next();
  });
}

// ═══════════════ SUBCATEGORY TABS ═══════════════
function initGalleryTabs() {
  const tabs = $$('.gallery-tab');
  const sections = $$('.tab-section');
  if (!tabs.length || !sections.length) return;

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      sections.forEach(s => {
        const match = target === 'all' || s.dataset.section === target;
        s.style.display = match ? '' : 'none';
        if (match) {
          gsap.fromTo(s, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' });
        }
      });
    });
  });
}

// ═══════════════ MOBILE NAV ═══════════════
function initMobileNav() {
  const toggle = $('#menu-toggle');
  const overlay = $('#mobile-nav-overlay');
  if (!toggle || !overlay) return;

  toggle.addEventListener('click', () => {
    toggle.classList.toggle('open');
    overlay.classList.toggle('open');
  });

  $$('.mobile-nav-link').forEach(link => {
    link.addEventListener('click', () => {
      toggle.classList.remove('open');
      overlay.classList.remove('open');
    });
  });
}

// ═══════════════ ENTRANCE ANIMATION ═══════════════
function animateGalleryEntrance() {
  const hero = $('.gallery-hero');
  if (!hero) return;

  gsap.fromTo(hero.querySelectorAll('.gallery-back, .gallery-hero-icon, h1, p'),
    { opacity: 0, y: 30 },
    { opacity: 1, y: 0, duration: 0.8, stagger: 0.1, ease: 'power3.out', delay: 0.1 }
  );
}

// ═══════════════ DATA LIGHTBOX (General) ═══════════════
function initDataLightbox() {
  const lbOverlay = $('#lightboxOverlay');
  const lbImg = $('#lightboxImage');
  const lbClose = $('#lightboxClose');
  if (!lbOverlay || !lbImg || !lbClose) return;

  function closeLb() {
    lbOverlay.classList.remove('active');
    setTimeout(() => { lbImg.src = ''; }, 400); // clear after fade out
    document.body.style.overflow = '';
  }

  $$('[data-lightbox]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      const src = el.getAttribute('data-lightbox');
      if (src) {
        lbImg.src = src;
        lbOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
      }
    });
  });

  lbClose.addEventListener('click', closeLb);
  lbOverlay.addEventListener('click', e => {
    if (e.target === lbOverlay) closeLb();
  });
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && lbOverlay.classList.contains('active')) closeLb();
  });
}

// ═══════════════ BOOT ═══════════════
function bootGallery() {
  initCursor();
  initNavScroll();
  initMobileNav();
  initScrollReveals();
  initLogoLightbox();
  initDataLightbox();
  initGalleryTabs();
  animateGalleryEntrance();
}

document.addEventListener('DOMContentLoaded', bootGallery);

