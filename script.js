/* ═══════════════════════════════════════════════
   MIKLÓS SIMÓ — PREMIUM PORTFOLIO ENGINE
   GSAP + Particles + Parallax + Interactions
   FIXED: all null-reference bugs, music section,
   lightbox, YouTube URL handling
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

  const hoverTargets = 'a, button, .featured-card, .music-card, .category-card, .contact-link-card, .skill-chip, .glow-btn, .ai-item, .logo-item, .mockup-card, .frame-item';
  document.addEventListener('mouseover', e => {
    const isHover = !!e.target.closest(hoverTargets);
    ring.classList.toggle('hov', isHover);
    glow.classList.toggle('hov', isHover);
  });

  // Click ripple
  document.addEventListener('mousedown', e => {
    const ripple = document.createElement('div');
    ripple.className = 'cursor-ripple';
    ripple.style.cssText = `left:${e.clientX}px;top:${e.clientY}px`;
    document.body.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  });
}

// ═══════════════ REACTOR ENERGY CANVAS ═══════════════
function initLoaderCanvas() {
  const canvas = $('#loader-canvas');
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');
  let W, H, cx, cy;
  const resize = () => {
    W = canvas.width = innerWidth; H = canvas.height = innerHeight;
    cx = W / 2; cy = H / 2;
  };
  resize();
  window.addEventListener('resize', resize);

  // Energy particles radiating outward from center
  const particles = [];
  const TOTAL = 60;

  function spawnParticle() {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 1.2 + 0.3;
    const hue = Math.random() > 0.5 ? '139,92,246' : '96,165,250';
    return {
      x: cx + (Math.random() - 0.5) * 20,
      y: cy + (Math.random() - 0.5) * 20,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r: Math.random() * 1.5 + 0.4,
      life: 1,
      decay: Math.random() * 0.008 + 0.003,
      hue
    };
  }

  for (let i = 0; i < TOTAL; i++) {
    const p = spawnParticle();
    p.life = Math.random(); // scatter initial life
    particles.push(p);
  }

  let running = true;

  (function tick() {
    if (!running) return;
    ctx.clearRect(0, 0, W, H);

    particles.forEach((p, i) => {
      p.x += p.vx; p.y += p.vy;
      p.life -= p.decay;

      if (p.life <= 0) {
        particles[i] = spawnParticle();
        return;
      }

      const alpha = p.life * 0.4;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.hue},${alpha})`;
      ctx.fill();
    });

    requestAnimationFrame(tick);
  })();

  return () => { running = false; };
}

// ═══════════════ HERO PARTICLE FIELD ═══════════════
function initHeroParticles() {
  const canvas = $('#hero-particles-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H;
  const resize = () => {
    const rect = canvas.parentElement?.getBoundingClientRect();
    W = canvas.width = rect?.width || innerWidth;
    H = canvas.height = rect?.height || innerHeight;
  };
  resize();
  window.addEventListener('resize', resize);

  const NEON_PALETTE = [
    '0,240,255',    // neon cyan
    '217,70,239',   // electric pink
    '124,58,237',   // violet
    '167,139,250',  // soft purple
    '255,255,255',  // white sparkle (rare)
  ];

  const isMobile = window.innerWidth < 768;
  const particleCount = isMobile ? 25 : 70;

  const particles = Array.from({ length: particleCount }, () => {
    const paletteIdx = Math.random() < 0.08 ? 4 : Math.floor(Math.random() * 4); // 8% white sparkles
    return {
      x: Math.random() * (W || 1),
      y: Math.random() * (H || 1),
      origVx: (Math.random() - 0.5) * 0.35,
      origVy: (Math.random() - 0.5) * 0.35,
      vx: 0,
      vy: 0,
      r: paletteIdx === 4 ? Math.random() * 0.8 + 0.2 : Math.random() * 1.6 + 0.3, // sparkles are tiny
      a: paletteIdx === 4 ? 0.6 + Math.random() * 0.4 : 0.08 + Math.random() * 0.22,
      color: NEON_PALETTE[paletteIdx],
    };
  });
  particles.forEach(p => { p.vx = p.origVx; p.vy = p.origVy; });

  let mX = -1000, mY = -1000;
  window.addEventListener('mousemove', (e) => {
    mX = e.clientX;
    mY = e.clientY;
  });
  window.addEventListener('mouseout', () => {
    mX = -1000; mY = -1000;
  });

  (function tick() {
    ctx.clearRect(0, 0, W, H);

    // Update and draw particles
    particles.forEach(p => {
      // Interactive mouse repel
      let dx = mX - p.x;
      let dy = mY - p.y;
      let dist = Math.sqrt(dx*dx + dy*dy);

      if (dist < 140 && dist > 0) {
        let force = (140 - dist) / 140;
        p.vx -= (dx / dist) * force * 0.09;
        p.vy -= (dy / dist) * force * 0.09;
      }

      // Friction / return to base speed
      p.vx = p.vx * 0.96 + p.origVx * 0.04;
      p.vy = p.vy * 0.96 + p.origVy * 0.04;

      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.color},${p.a})`;
      ctx.fill();
    });

    // Neon constellation lines — cyan/pink tones — SKIP ON MOBILE FOR PERFORMANCE
    if (!isMobile) {
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          let dx = particles[i].x - particles[j].x;
          let dy = particles[i].y - particles[j].y;
          let dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < 85) {
            const alpha = (1 - dist/85) * 0.18;
            // Use a gradient-ish approach: blend cyan toward center
            const lineColor = (i + j) % 3 === 0 ? '0,240,255' : '217,70,239';
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(${lineColor},${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
    }
    requestAnimationFrame(tick);
  })();
}

// ═══════════════ HERO ORBS ═══════════════
function initHeroOrbs() {
  const canvas = $('#hero-orbs-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H;
  const resize = () => {
    const rect = canvas.parentElement?.getBoundingClientRect();
    W = canvas.width = rect?.width || innerWidth;
    H = canvas.height = rect?.height || innerHeight;
  };
  resize();
  window.addEventListener('resize', resize);

  const orbs = Array.from({ length: 12 }, () => ({
    x: Math.random() * (W || 1), y: Math.random() * (H || 1),
    vx: (Math.random() - 0.5) * 0.6, vy: (Math.random() - 0.5) * 0.6,
    r: Math.random() * 6 + 2, a: Math.random() * 0.3 + 0.1
  }));

  (function tick() {
    ctx.clearRect(0, 0, W, H);
    orbs.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < -50) p.x = W + 50; if (p.x > W + 50) p.x = -50;
      if (p.y < -50) p.y = H + 50; if (p.y > H + 50) p.y = -50;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(167,139,250,${p.a})`;
      ctx.shadowColor = 'rgba(139,92,246,.6)';
      ctx.shadowBlur = p.r * 2;
      ctx.fill();
      ctx.shadowBlur = 0;
    });
    requestAnimationFrame(tick);
  })();
}

// ═══════════════ PARALLAX HERO ═══════════════
// FIX: use gsap.quickTo for performant per-frame parallax (avoids creating new tweens every rAF)
function initParallax() {
  const layerDefs = [
    { el: $('#parallax-layer-1'), factor: 0.005 },
    { el: $('#parallax-layer-2'), factor: 0.015 },
    { el: $('#parallax-layer-5'), factor: 0.03 },
    { el: $('#parallax-layer-6'), factor: 0.08 },
    { el: $('#parallax-layer-glass-1'), factor: 0.06 },
    { el: $('#parallax-layer-glass-2'), factor: 0.04 },
    { el: $('#parallax-layer-glass-3'), factor: 0.1 },
    { el: $('#hero-orbs-canvas'), factor: 0.15 },
  ].filter(l => l.el);

  if (layerDefs.length === 0) return;

  // Pre-create quickTo setters for each layer (much faster than gsap.to per frame)
  const layers = layerDefs.map(l => ({
    factor: l.factor,
    setX: gsap.quickTo(l.el, 'x', { duration: 1.2, ease: 'power2.out' }),
    setY: gsap.quickTo(l.el, 'y', { duration: 1.2, ease: 'power2.out' }),
  }));

  window.addEventListener('mousemove', e => {
    const mx = (e.clientX / window.innerWidth - 0.5) * 2;
    const my = (e.clientY / window.innerHeight - 0.5) * 2;
    layers.forEach(l => {
      l.setX(mx * l.factor * 100);
      l.setY(my * l.factor * 100);
    });
  });
}

// ═══════════════ LUXURY DIAMOND LOADING SEQUENCE ═══════════════
function runLoader() {
  return new Promise(resolve => {
    // Fallback if not on home page
    const loaderContainer = $('#loader');
    if (!loaderContainer) { resolve(); return; }

    const svg = $('.aaa-loader-svg');
    if (!svg) { resolve(); return; }

    // Minimal delay before starting to draw
    setTimeout(() => {
      loaderContainer.classList.add('draw-active');

      // After CSS transitions complete (aaa-outer=2.2s, s=2.1s, m=2.3s → ~2.5s total),
      // fire the cinematic exit pulse
      setTimeout(() => {
        svg.classList.add('aaa-loader-exit-pulse');

        // Start fading the loader container DURING the pulse (at ~40% of pulse duration)
        setTimeout(() => {
          gsap.to(loaderContainer, {
            opacity: 0,
            duration: 1.1,
            ease: 'power3.inOut',
            onComplete: () => {
              loaderContainer.classList.add('done');

              // Navbar entrance animation
              const navBrand = $('.nav-brand');
              if (navBrand) {
                gsap.fromTo(navBrand,
                  { opacity: 0, scale: 0.93, filter: 'blur(6px)' },
                  { opacity: 1, scale: 1, filter: 'blur(0px)', duration: 1.4, ease: 'power3.out', force3D: true, clearProps: 'filter' }
                );
              }
              resolve();
            }
          });
        }, 700); // Begin fade at 700ms into the 1400ms pulse animation
      }, 2500); // 2.5s for all lines to draw completely
    }, 80); // Nearly immediate start
  });
}

// ═══════════════ HERO ENTRANCE ANIMATIONS ═══════════════
function animateHeroEntrance() {
  const items = $$('#hero-text .anim-item');
  if (!items.length) return;
  
  const isMobile = window.innerWidth < 768;

  // Staggered cinematic entrance — each element reveals smoothly
  gsap.fromTo(items,
    { opacity: 0, y: 25, filter: isMobile ? 'none' : 'blur(6px)' },
    { opacity: 1, y: 0, filter: isMobile ? 'none' : 'blur(0px)', duration: 1.2, stagger: 0.18, ease: 'power3.out', delay: 0.05, force3D: true, clearProps: isMobile ? '' : 'filter' }
  );

  // The massive name gets its own big reveal
  const name = $('#hero-text .hero-name');
  if (name) {
    gsap.fromTo(name,
      { opacity: 0, scale: 0.90, y: isMobile ? 25 : 50, filter: isMobile ? 'none' : 'blur(12px)' },
      { opacity: 1, scale: 1, y: 0, filter: isMobile ? 'none' : 'blur(0px)', duration: isMobile ? 1.4 : 2.2, ease: 'power4.out', delay: 0.15, force3D: true, clearProps: isMobile ? '' : 'filter' }
    );
  }

  const ind = $('#scroll-indicator');
  if (ind) {
    gsap.fromTo(ind, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 1.0, delay: 1.8, ease: 'power2.out', force3D: true });
  }
}

// ═══════════════ SCROLL REVEAL (IntersectionObserver) ═══════════════
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

// ═══════════════ NAV SCROLL BEHAVIOUR ═══════════════
// FIX: null guard on #main-nav
function initNavScroll() {
  const nav = $('#main-nav');
  if (!nav) return;

  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', scrollY > 80);
  });

  const sections = $$('section[id]');
  const links = $$('.nav-link[data-section]');
  if (!sections.length || !links.length) return;

  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        links.forEach(l => l.classList.toggle('active', l.dataset.section === e.target.id));
      }
    });
  }, { threshold: 0.3 });

  sections.forEach(s => observer.observe(s));
}

// ═══════════════ SMOOTH SCROLL NAV ═══════════════
// FIX: added null guards for mobile nav elements
function initSmoothNav() {
  document.addEventListener('click', e => {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;
    e.preventDefault();
    const target = $(link.getAttribute('href'));
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Close mobile menu
      const overlay = $('#mobile-nav-overlay');
      const toggle = $('#menu-toggle');
      if (overlay) overlay.classList.remove('open');
      if (toggle) toggle.classList.remove('open');
    }
  });
}

// ═══════════════ MOBILE HAMBURGER ═══════════════
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

  // FIX: close mobile menu when resizing back to desktop
  window.addEventListener('resize', () => {
    if (window.innerWidth > 768 && overlay.classList.contains('open')) {
      toggle.classList.remove('open');
      overlay.classList.remove('open');
    }
  });
}

// ═══════════════ GSAP SCROLL ANIMATIONS ═══════════════
// FIX: guard against ScrollTrigger not being loaded
function initGSAPScrollAnimations() {
  if (typeof ScrollTrigger === 'undefined') return;
  gsap.registerPlugin(ScrollTrigger);

  // Section glow effects
  $$('.section').forEach(section => {
    if (section.querySelector('.section-bg-glow')) return;
    const glow = document.createElement('div');
    glow.className = 'section-bg-glow';
    glow.style.cssText = `position:absolute;top:0;left:50%;width:600px;height:600px;transform:translateX(-50%);pointer-events:none;z-index:0;background:radial-gradient(circle,rgba(139,92,246,.05) 0%,transparent 70%);filter:blur(60px);`;
    section.insertBefore(glow, section.firstChild);
  });

  // Stat counter animation
  $$('.stat-item').forEach(item => {
    const num = item.querySelector('.stat-number');
    const label = item.querySelector('.stat-label');
    if (!num || !label) return;

    const target = parseInt(num.dataset.count) || 0;
    const originalLabel = label.textContent;

    ScrollTrigger.create({
      trigger: num,
      start: 'top 85%',
      once: true,
      onEnter: () => {
        gsap.to(num, {
          innerText: target,
          duration: 2.5,
          ease: 'power3.out',
          snap: { innerText: 1 },
          onUpdate() {
            const val = Math.floor(this.targets()[0].innerText);
            num.textContent = val;
            
            // Pluralization logic for "Discipline"
            if (originalLabel.toLowerCase().includes('discipline')) {
              label.textContent = val === 1 ? 'Discipline' : 'Disciplines';
            }
          }
        });
      }
    });
  });
}

// ═══════════════ TILT EFFECT ═══════════════
function initTiltCards() {
  $$('[data-tilt]').forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      gsap.to(card, {
        rotationY: x * 8,
        rotationX: -y * 8,
        duration: 0.3,
        ease: 'power2.out',
        transformPerspective: 800
      });
    });
    card.addEventListener('mouseleave', () => {
      gsap.to(card, { rotationY: 0, rotationX: 0, duration: 0.5, ease: 'power3.out' });
    });
  });

  // Card mouse-tracking glow for featured and project cards
  $$('.featured-card, .project-category-card').forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width * 100).toFixed(1);
      const y = ((e.clientY - rect.top) / rect.height * 100).toFixed(1);
      card.style.setProperty('--mouse-x', x + '%');
      card.style.setProperty('--mouse-y', y + '%');
    });
  });
}

// ═══════════════ SECTION GLOWS ═══════════════
// NOTE: glow creation is already handled in initGSAPScrollAnimations.
// This function is kept as a no-op fallback for when ScrollTrigger is not loaded.
function initSectionGlows() {
  if (typeof ScrollTrigger !== 'undefined') return; // already handled
  $$('.section').forEach(section => {
    if (section.querySelector('.section-bg-glow')) return;
    const glow = document.createElement('div');
    glow.className = 'section-bg-glow';
    glow.style.cssText = 'position:absolute;top:0;left:50%;width:600px;height:600px;transform:translateX(-50%);pointer-events:none;z-index:0;background:radial-gradient(circle,rgba(139,92,246,.05) 0%,transparent 70%);filter:blur(60px);';
    section.insertBefore(glow, section.firstChild);
  });
}

// ═══════════════ DYNAMIC PROJECTS ═══════════════
// Reads window.PORTFOLIO_DATA and renders category cards + filter buttons
// FIX: handles both array format (manual data.js) and object format (scan.py output)
function normalizePortfolioData(raw) {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object') {
    // scan.py outputs { images:[], videos:[], ... } — flatten all arrays
    // Inject 'category' from the object key into each item
    return Object.entries(raw).reduce((acc, [key, val]) => {
      if (Array.isArray(val)) {
        val.forEach(item => {
          if (!item.category) item.category = key;
          acc.push(item);
        });
      }
      return acc;
    }, []);
  }
  return [];
}

function initDynamicProjects() {
  const container = $('#dynamic-projects-container');
  const filtersContainer = $('#project-filters');
  const projects = normalizePortfolioData(window.PORTFOLIO_DATA);

  if (!container || !projects.length) return;

  // Build category list (filter out undefined/null categories)
  const categories = ['all', ...new Set(projects.map(p => p.category).filter(Boolean))];

  // Render filter buttons using event delegation
  if (filtersContainer) {
    filtersContainer.innerHTML = categories.map(cat => {
      const label = cat === 'all' ? 'All Projects' : (cat || '').split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      return `<button class="filter-btn ${cat === 'all' ? 'active' : ''}" data-filter="${cat}">${label}</button>`;
    }).join('');

    // Use event delegation for filter clicks
    filtersContainer.addEventListener('click', e => {
      const btn = e.target.closest('.filter-btn');
      if (!btn) return;
      // Update active state
      filtersContainer.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      // Filter
      const filter = btn.dataset.filter;
      container.querySelectorAll('.category-card').forEach(card => {
        const match = filter === 'all' || card.dataset.category === filter;
        card.style.display = match ? '' : 'none';
        if (match) gsap.fromTo(card, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' });
      });
    });
  }

  // Render project cards
  container.innerHTML = '';
  projects.forEach(p => {
    const cat = p.category || 'other';
    const catLabel = cat.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    const card = document.createElement('div');
    card.className = 'category-card';
    card.dataset.category = cat;

    const icon = { music: '🎵', video: '🎬', logos: '✦', branding: '🌐', 'social-media': '📱', 'ai-art': '🧠' }[p.category] || '📁';

    card.innerHTML = `
      <div class="cat-icon">${icon}</div>
      <div class="cat-content">
        <h3>${p.title}</h3>
        <p>${p.desc || ''}</p>
      </div>
      <div class="cat-arrow">→</div>
    `;

    card.addEventListener('click', () => openGlobalLightbox(p));
    container.appendChild(card);
  });
}

// ═══════════════ MUSIC SECTION ═══════════════
// FIX: replaced broken fetchYouTubeReleases with working initMusicSection
// Renders music projects from PORTFOLIO_DATA into the music grid
function initMusicSection() {
  const container = $('#dynamic-music-container');
  const playerEmbed = $('#player-embed');
  const playerWrapper = $('#music-player-wrapper');
  const closeBtn = $('#player-close');

  if (!container) return;

  // Get music tracks from PORTFOLIO_DATA, sorted newest first
  // FIX: handle both array and object data formats
  const projects = normalizePortfolioData(window.PORTFOLIO_DATA);
  const musicTracks = projects
    .filter(p => p.category === 'music' || p.youtubeId)
    .sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || '')) // newer first
    .slice(0, 5); // display top 5

  if (!musicTracks.length) {
    container.innerHTML = '<p class="loading-pulse">No music tracks found in data.js. Add projects with category: "music".</p>';
    return;
  }

  container.innerHTML = '';
  musicTracks.forEach(track => {
    const card = document.createElement('div');
    card.className = 'music-card';
    card.innerHTML = `
      <div class="music-cover">
        <img src="${track.thumbnail}" alt="${track.title}" loading="lazy">
        <div class="music-play-overlay">
          <div class="play-btn">▶</div>
        </div>
      </div>
      <div class="music-info">
        <div class="music-title">${track.title}</div>
        <div class="music-artist">YouTube Release</div>
      </div>
    `;

    // FIX: attach onerror handler properly via JS instead of inline HTML
    const coverImg = card.querySelector('.music-cover img');
    if (coverImg) {
      coverImg.addEventListener('error', function() {
        this.style.display = 'none';
        this.parentElement.innerHTML = '<div class="music-cover-art" style="background:linear-gradient(135deg,#1a0533,#2d1b69);"><div class="music-icon">🎵</div></div>';
      });
    }

    container.appendChild(card);

    // Click: play in embedded player
    card.addEventListener('click', () => {
      const vidUrl = track.videoUrl || (track.youtubeId ? `https://www.youtube.com/watch?v=${track.youtubeId}` : '');
      if (!playerEmbed || !vidUrl) {
        // If no video, open lightbox instead
        openGlobalLightbox(track);
        return;
      }
      let embedUrl = normalizeYouTubeEmbed(vidUrl);
      playerEmbed.innerHTML = `<iframe src="${embedUrl}?autoplay=1" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
      if (playerWrapper) {
        playerWrapper.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  });

  // Close player button
  if (closeBtn && playerEmbed) {
    closeBtn.addEventListener('click', () => {
      playerEmbed.innerHTML = '<p class="player-placeholder">Select a track above to start listening</p>';
    });
  }
}

// ═══════════════ YOUTUBE URL NORMALIZER ═══════════════
// FIX: extracts clean video ID from any YouTube URL format,
// strips extra query params to prevent double-? or broken embed URLs
function normalizeYouTubeEmbed(url) {
  if (!url) return '';
  let videoId = '';
  // Format: youtube.com/watch?v=VIDEO_ID or youtube.com/watch?v=VIDEO_ID&other_params
  const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (watchMatch) { videoId = watchMatch[1]; }
  // Format: youtu.be/VIDEO_ID
  else if (url.includes('youtu.be/')) {
    videoId = (url.split('youtu.be/')[1] || '').split(/[?&#]/)[0];
  }
  // Format: youtube.com/embed/VIDEO_ID (already embedded)
  else if (url.includes('/embed/')) {
    videoId = (url.split('/embed/')[1] || '').split(/[?&#]/)[0];
  }
  // If we extracted a valid ID, return clean embed URL
  if (videoId && videoId.length === 11) {
    return `https://www.youtube.com/embed/${videoId}`;
  }
  return url; // Unrecognized format, return as-is
}

// ═══════════════ GLOBAL LIGHTBOX ═══════════════
function openGlobalLightbox(project) {
  const lb = $('#project-lightbox');
  const mediaContainer = $('#pl-media-container');
  const title = $('#pl-title');
  const desc = $('#pl-desc');
  const category = $('#pl-category');
  const content = $('#pl-content');

  if (!lb || !mediaContainer) return;

  // Populate data
  if (title) title.textContent = project.title || 'Project Details';

  let contentHtml = project.content || project.desc || '';

  // Render gallery grid inside description
  if (project.gallery && project.gallery.length > 0) {
    contentHtml += `<div class="lightbox-gallery" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px;margin-top:2rem;">` +
      project.gallery.map(img =>
        `<img src="${img}" alt="Gallery image" loading="lazy" style="width:100%;border-radius:8px;object-fit:cover;aspect-ratio:1;transition:transform .3s;cursor:none;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">`
      ).join('') +
      `</div>`;
  }
  if (desc) desc.innerHTML = contentHtml;
  if (category) category.textContent = (project.category || 'work').toUpperCase();

  mediaContainer.innerHTML = '';

  // Render media: video or cover image
  if (project.videoUrl) {
    const embedUrl = normalizeYouTubeEmbed(project.videoUrl);
    mediaContainer.innerHTML = `<iframe width="100%" height="100%" src="${embedUrl}?autoplay=1" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen style="border:none;"></iframe>`;
  } else {
    mediaContainer.innerHTML = `<img src="${project.thumbnail}" alt="${project.title}" style="width:100%;height:100%;object-fit:contain;max-height:70vh;" loading="lazy">`;
  }

  lb.classList.add('open');
  document.body.style.overflow = 'hidden'; // prevent bg scroll

  // Animate in
  if (content) {
    gsap.fromTo(content,
      { opacity: 0, y: 40, scale: 0.95 },
      { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: 'power3.out' }
    );
  }
}

function closeGlobalLightbox() {
  const lb = $('#project-lightbox');
  const mediaContainer = $('#pl-media-container');
  const content = $('#pl-content');

  if (!lb) return;

  if (content) {
    gsap.to(content, {
      opacity: 0, y: 20, scale: 0.95, duration: 0.3, ease: 'power2.in',
      onComplete: () => {
        lb.classList.remove('open');
        document.body.style.overflow = ''; // restore scrolling
        if (mediaContainer) mediaContainer.innerHTML = ''; // stop video
      }
    });
  } else {
    lb.classList.remove('open');
    document.body.style.overflow = '';
    if (mediaContainer) mediaContainer.innerHTML = '';
  }
}

function initLightboxClose() {
  const closeBtn = $('#pl-close');
  const backdrop = $('#pl-backdrop');

  if (closeBtn) closeBtn.addEventListener('click', closeGlobalLightbox);
  if (backdrop) backdrop.addEventListener('click', closeGlobalLightbox);

  // FIX: Escape key closes lightbox
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeGlobalLightbox();
  });
}

// ═══════════════ FEATURED WORKS MODAL ═══════════════
function initFeaturedModal() {
  const cards = $$('.featured-card[data-project]');
  const modal = $('#featured-modal');
  const backdrop = $('#f-modal-backdrop');
  const closeBtn = $('#f-modal-close');
  const titleEl = $('#f-modal-title');
  const catEl = $('#f-modal-category');
  const mediaEl = $('#f-modal-media');
  const markdownEl = $('#f-modal-markdown');
  const loadingEl = $('#f-modal-loading');
  const contentEl = $('#f-modal-content');

  if (!cards.length || !modal) return;

  // MEDIA MAP:
  // Each key matches a data-project attribute on the featured cards.
  // Files are resolved relative to assets/projects/<key>/<file>
  // MEDIA MAP: Professional Showcase Configuration
  const FEATURED_MEDIA_MAP = {
    'nova-run': [
      { file: '01.png', label: 'Master Hero Composition', type: 'hero' },
      { file: '02.png', label: 'Web Platform Interface', type: 'laptop' },
      { file: '03.png', label: 'iOS App Ecosystem', type: 'phone' },
      { file: '01.png', label: 'Performance Wearable', type: 'watch' }
    ],
    'luma-coffee': [
      { file: '01.png', label: 'Atmospheric Brand Hero', type: 'hero' },
      { file: '02.png', label: 'Ordering Portal', type: 'laptop' },
      { file: '03.png', label: 'Mobile Loyalty App', type: 'phone' },
      { file: '01.png', label: 'Watch Notification', type: 'watch' }
    ],
    'pulse-fitness': [
      { file: '01.png', label: 'Data Ecosystem Hero', type: 'hero' },
      { file: '02.png', label: 'Analytics Dashboard', type: 'laptop' },
      { file: '03.png', label: 'Live Workout Feed', type: 'phone' },
      { file: '01.png', label: 'Heart Rate Monitoring', type: 'watch' }
    ],
    'flare-streetwear': [
      { file: '01.png', label: 'Editorial Vision Hero', type: 'hero' },
      { file: '02.png', label: 'E-Commerce Hub', type: 'laptop' },
      { file: '03.png', label: 'Drop Countdown', type: 'phone' },
      { file: '01.png', label: 'Label Mini-App', type: 'watch' }
    ],
    'spark-dating': [
      { file: '01.png', label: 'Interaction Hero Canvas', type: 'hero' },
      { file: '02.png', label: 'Match Management', type: 'laptop' },
      { file: '03.png', label: 'Instant Messaging', type: 'phone' },
      { file: '01.png', label: 'Nearby Alert', type: 'watch' }
    ],
    'vertex-tech': [
      { file: '01.png', label: 'Technical Infrastructure Hero', type: 'hero' },
      { file: '02.png', label: 'Cloud Controller UI', type: 'laptop' },
      { file: '03.png', label: 'Security Portal', type: 'phone' },
      { file: '01.png', label: 'Status Monitor', type: 'watch' }
    ]
  };

  function closeModal() {
    if (contentEl) {
      gsap.to(contentEl, {
        opacity: 0, y: 20, scale: 0.95, duration: 0.3, ease: 'power2.in',
        onComplete: () => {
          modal.classList.remove('open');
          document.body.style.overflow = '';
          if (mediaEl) mediaEl.innerHTML = ''; // Stop video playback
        }
      });
    } else {
      modal.classList.remove('open');
      document.body.style.overflow = '';
      if (mediaEl) mediaEl.innerHTML = ''; // Stop video playback
    }
  }

  cards.forEach(card => {
    card.addEventListener('click', async () => {
      const id = card.dataset.project;
      const title = card.querySelector('.card-title')?.textContent || '';
      const category = card.querySelector('.card-category')?.textContent || '';
      
      if (titleEl) titleEl.textContent = title;
      if (catEl) catEl.textContent = category;
      
      if (mediaEl) mediaEl.innerHTML = '';
      if (markdownEl) {
        markdownEl.innerHTML = '';
        markdownEl.style.display = 'none';
      }
      if (loadingEl) loadingEl.style.display = 'block';
      
      modal.classList.add('open');
      document.body.style.overflow = 'hidden'; // prevent bg scroll
      
      if (contentEl) {
        gsap.fromTo(contentEl,
          { opacity: 0, y: 40, scale: 0.95 },
          { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: 'power3.out' }
        );
      }
      
      // 1. Build Media Showcase (God-Level Hierarchical Layout)
      const items = FEATURED_MEDIA_MAP[id] || [];
      if (items.length === 0) {
        if (mediaEl) mediaEl.innerHTML = `<div class="f-modal-empty">Project media is currently being curated. Check back soon for the full visual showcase.<br><br><small>Assets will be available in <code>/assets/projects/${id}/</code></small></div>`;
      } else {
        const heroItem = items.find(i => i.type === 'hero');
        const phoneItem = items.find(i => i.type === 'phone');
        const watchItem = items.find(i => i.type === 'watch');
        const laptopItem = items.find(i => i.type === 'laptop');

        let mediaHtml = '';

        // Part 1: Hero Anchor
        if (heroItem) {
          mediaHtml += `
            <div class="f-showcase-item-group f-showcase-hero">
              <div class="device-frame device-hero">
                <img src="assets/projects/${id}/${heroItem.file}" alt="${heroItem.label}" class="f-modal-img">
              </div>
            </div>`;
        }

        // Part 2: Phone + Watch Row
        if (phoneItem || watchItem) {
          mediaHtml += `<div class="f-showcase-row">`;
          
          if (phoneItem) {
            mediaHtml += `
              <div class="f-showcase-item-group f-showcase-phone-wrap">
                <div class="device-frame device-phone">
                  <img src="assets/projects/${id}/${phoneItem.file}" alt="${phoneItem.label}" class="f-modal-img">
                </div>
                <div class="f-modal-showcase-label">${phoneItem.label}</div>
              </div>`;
          }

          if (watchItem) {
            mediaHtml += `
              <div class="f-showcase-item-group f-showcase-watch-wrap">
                <div class="device-frame device-watch">
                  <img src="assets/projects/${id}/${watchItem.file}" alt="${watchItem.label}" class="f-modal-img">
                </div>
                <div class="f-modal-showcase-label">${watchItem.label}</div>
              </div>`;
          }

          mediaHtml += `</div>`;
        }

        // Part 3: Centered Laptop
        if (laptopItem) {
          mediaHtml += `
            <div class="f-showcase-item-group f-showcase-laptop-wrap">
              <div class="device-frame device-laptop">
                <img src="assets/projects/${id}/${laptopItem.file}" alt="${laptopItem.label}" class="f-modal-img">
              </div>
              <div class="f-modal-showcase-label">${laptopItem.label}</div>
            </div>`;
        }

        if (mediaEl) mediaEl.innerHTML = mediaHtml;
      }

      // 2. Fetch and Parse Markdown
      try {
        const response = await fetch(`assets/projects/${id}/description.md`);
        if (response.ok) {
          const mdContent = await response.text();
          let html = '';
          if (typeof marked !== 'undefined') {
             html = marked.parse(mdContent);
          } else {
             html = `<pre style="white-space:pre-wrap; font-family:inherit;">${mdContent}</pre>`;
          }
          
          if (markdownEl) {
            markdownEl.innerHTML = html;
            // Add "View full case study" button
            const btnWrap = document.createElement('div');
            btnWrap.style.cssText = 'text-align:center; margin-top:3.5rem;';
            btnWrap.innerHTML = `
              <a href="#" class="btn-primary" style="display:inline-flex; padding: 1rem 2.5rem;">
                <span>View Full Case Study</span>
                <div class="btn-shimmer"></div>
              </a>
            `;
            markdownEl.appendChild(btnWrap);
          }
        } else {
          if (markdownEl) markdownEl.innerHTML = '<p>Project overview currently in development. Full details coming soon.</p>';
        }
      } catch (err) {
        if (markdownEl) markdownEl.innerHTML = '<p>Failed to load project details.</p>';
      }
      
      if (loadingEl) loadingEl.style.display = 'none';
      if (markdownEl) markdownEl.style.display = 'block';
    });
  });

  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', e => {
    if (e.target === modal || e.target === backdrop) {
      closeModal();
    }
  });
  
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modal.classList.contains('open')) {
      closeModal();
    }
  });
}

// ═══════════════ DATA LIGHTBOX ═══════════════
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
async function boot() {
  console.log('🚀 Portfolio engine starting...');
  try {
    initCursor();
    const stopLoaderParticles = initLoaderCanvas();

    await runLoader();

    if (stopLoaderParticles) stopLoaderParticles();

    initHeroParticles();
    initHeroOrbs();
    initParallax();
    animateHeroEntrance();
    initScrollReveals();
    initNavScroll();
    initSmoothNav();
    initMobileNav();
    initGSAPScrollAnimations();

    // Dynamic Data Systems
    initDynamicProjects();
    initLightboxClose();
    initDataLightbox();
    initFeaturedModal();
    initMusicSection(); // FIX: replaced fetchYouTubeReleases + initMusicPlayerClose

    initTiltCards();
    initSectionGlows();
    console.log('✨ Portfolio engine booted successfully.');
  } catch (err) {
    console.error('❌ Boot error:', err);
  }
}

document.addEventListener('DOMContentLoaded', boot);
