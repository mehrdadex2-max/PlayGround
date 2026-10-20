(() => {
  'use strict';

  const DATA = window.LOTR_DATA;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
  const faNum = (value) => String(value).replace(/\d/g, (d) => FA_DIGITS[Number(d)]);
  const icon = (name, cls = '') => `<svg class="icon ${cls}" aria-hidden="true"><use href="#${name}"/></svg>`;
  const typeLabel = { book: 'کتاب', film: 'فیلم', series: 'سریال' };
  const state = {
    characterFilter: 'all',
    region: 'all',
    selectedLocation: null,
    era: 0,
    bookTab: 'book',
    galleryIndex: 0,
    theme: 'dark'
  };

  /* ------------------------------------------------------------------ */
  /* Theme                                                              */
  /* ------------------------------------------------------------------ */

  const storedTheme = localStorage.getItem('lotr-theme');
  if (storedTheme === 'light' || storedTheme === 'dark') state.theme = storedTheme;
  document.documentElement.dataset.theme = state.theme;

  function syncThemeMeta() {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', state.theme === 'light' ? '#efe7d5' : '#0b0d10');
  }
  syncThemeMeta();

  $('#themeToggle').addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = state.theme;
    localStorage.setItem('lotr-theme', state.theme);
    syncThemeMeta();
  });

  /* ------------------------------------------------------------------ */
  /* Header, navigation, scroll                                         */
  /* ------------------------------------------------------------------ */

  const header = $('#siteHeader');
  const progress = $('#scrollProgress');
  const backToTop = $('#backToTop');
  const nav = $('#mainNav');
  const menuToggle = $('#menuToggle');

  function onScroll() {
    const y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 24);
    backToTop.classList.toggle('is-visible', y > 700);
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  function closeMenu() {
    nav.classList.remove('is-open');
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'باز کردن منو');
  }
  menuToggle.addEventListener('click', () => {
    const open = !nav.classList.contains('is-open');
    nav.classList.toggle('is-open', open);
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'بستن منو' : 'باز کردن منو');
  });
  nav.addEventListener('click', (e) => {
    if (e.target.closest('.nav-link')) closeMenu();
  });
  document.addEventListener('click', (e) => {
    if (!nav.classList.contains('is-open')) return;
    if (nav.contains(e.target) || menuToggle.contains(e.target)) return;
    closeMenu();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) closeMenu();
  });

  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  const navLinks = $$('.nav-link');
  const trackedSections = ['home', 'map', 'races', 'characters', 'timeline', 'books', 'gallery', 'quiz']
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  function setActiveNav(id) {
    navLinks.forEach((link) => {
      link.classList.toggle('is-active', link.getAttribute('href') === `#${id}`);
    });
  }

  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) setActiveNav(entry.target.id);
    });
  }, { rootMargin: '-42% 0px -52% 0px', threshold: 0 });
  trackedSections.forEach((section) => sectionObserver.observe(section));

  /* ------------------------------------------------------------------ */
  /* Reveal and counters                                                */
  /* ------------------------------------------------------------------ */

  let revealObserver;
  function initReveals() {
    if ('IntersectionObserver' in window) {
      revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        });
      }, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' });
      observeReveals();
    } else {
      $$('.reveal').forEach((el) => el.classList.add('is-visible'));
    }
  }
  function observeReveals() {
    if (!revealObserver) return;
    $$('.reveal:not(.is-visible)').forEach((el) => revealObserver.observe(el));
  }

  function animateCounter(el) {
    const target = Number(el.dataset.count) || 0;
    const duration = target > 100 ? 1700 : 1300;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = faNum(Math.round(target * eased));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  function initCounters() {
    const counters = $$('[data-count]');
    if (!('IntersectionObserver' in window)) {
      counters.forEach((el) => { el.textContent = faNum(el.dataset.count); });
      return;
    }
    const counterObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        animateCounter(entry.target);
        counterObserver.unobserve(entry.target);
      });
    }, { threshold: 0.5 });
    counters.forEach((el) => counterObserver.observe(el));
  }

  /* ------------------------------------------------------------------ */
  /* Hero particles                                                     */
  /* ------------------------------------------------------------------ */

  function initHeroCanvas() {
    const canvas = $('#heroCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let particles = [];
    let width = 0;
    let height = 0;
    let dpr = 1;

    function makeParticles() {
      const count = Math.max(28, Math.min(96, Math.round((width * height) / 19000)));
      particles = Array.from({ length: count }, (_, i) => {
        const star = i % 5 !== 0;
        return {
          star,
          x: Math.random() * width,
          y: star ? Math.random() * height * 0.72 : Math.random() * height,
          r: star ? 0.5 + Math.random() * 1.15 : 0.8 + Math.random() * 1.9,
          a: star ? 0.2 + Math.random() * 0.55 : 0.15 + Math.random() * 0.55,
          vy: star ? 0 : -(0.12 + Math.random() * 0.4),
          vx: star ? 0 : (Math.random() - 0.5) * 0.18,
          phase: Math.random() * Math.PI * 2,
          speed: 0.6 + Math.random() * 1.4
        };
      });
    }

    function resize() {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      makeParticles();
      if (reduce) draw(0);
    }

    function draw(time) {
      ctx.clearRect(0, 0, width, height);
      const light = state.theme === 'light';
      const starColor = light ? '104, 82, 38' : '236, 214, 164';
      const emberColor = light ? '154, 104, 40' : '232, 166, 80';
      ctx.globalCompositeOperation = light ? 'source-over' : 'lighter';
      particles.forEach((p) => {
        if (p.star) {
          const twinkle = 0.55 + Math.sin(time * 0.001 * p.speed + p.phase) * 0.45;
          ctx.beginPath();
          ctx.fillStyle = `rgba(${starColor}, ${p.a * twinkle})`;
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.fillStyle = `rgba(${emberColor}, ${p.a})`;
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
          if (!reduce) {
            p.y += p.vy;
            p.x += p.vx;
            p.a *= 0.9985;
            if (p.y < -10 || p.a < 0.05) {
              p.y = height + 10;
              p.x = Math.random() * width;
              p.a = 0.15 + Math.random() * 0.55;
            }
          }
        }
      });
      ctx.globalCompositeOperation = 'source-over';
      if (!reduce) requestAnimationFrame(draw);
    }

    resize();
    if (!reduce) requestAnimationFrame(draw);
    window.addEventListener('resize', resize);
  }

  /* ------------------------------------------------------------------ */
  /* Map                                                                */
  /* ------------------------------------------------------------------ */

  const pinsLayer = $('#mapPins');
  const mapPanel = $('#mapPanel');

  function renderMapPins() {
    pinsLayer.innerHTML = DATA.locations.map((loc) => `
      <g class="map-pin" data-location="${loc.id}" transform="translate(${loc.x * 10}, ${loc.y * 7.2})"
         tabindex="0" role="button" aria-label="${loc.name}، ${loc.region}">
        <circle class="pin-halo" r="18"></circle>
        <circle class="pin-ring" r="8"></circle>
        <circle class="pin-core" r="4.2"></circle>
        <text x="0" y="24" text-anchor="middle">${loc.name}</text>
      </g>
    `).join('');
  }

  function mapPanelEmpty() {
    mapPanel.innerHTML = `
      <div class="map-panel-empty">
        <span class="map-panel-icon">${icon('i-compass')}</span>
        <h3>یک سرزمین را انتخاب کنید</h3>
        <p>نشان‌های طلایی روی نقشه، دروازه ورود به تاریخچه، ساکنان و رازهای هر منطقه‌اند.</p>
        <ul class="map-legend">
          <li><span class="legend-pin"></span> مکان‌های کلیدی</li>
          <li><span class="legend-route"></span> مسیر یاران حلقه</li>
        </ul>
      </div>`;
  }

  function selectLocation(id, scrollPanel = false) {
    const loc = DATA.locations.find((item) => item.id === id);
    if (!loc) return;
    state.selectedLocation = id;
    $$('.map-pin', pinsLayer).forEach((pin) => {
      pin.classList.toggle('is-active', pin.dataset.location === id);
    });
    mapPanel.innerHTML = `
      <div class="map-detail-head">
        <span class="map-detail-icon">${icon(loc.icon)}</span>
        <div>
          <h3>${loc.name}</h3>
          <span class="map-detail-en">${loc.en}</span>
        </div>
        <span class="region-badge">${loc.region}</span>
      </div>
      <p class="map-detail-tagline">${loc.tagline}</p>
      <p class="map-detail-text">${loc.desc}</p>
      <p class="map-detail-story">${loc.story}</p>
      <p class="map-detail-label">شخصیت‌های پیوسته</p>
      <div class="map-figures">${loc.figures.map((f) => `<span>${f}</span>`).join('')}</div>
      <p class="map-detail-quote">${icon('i-quote')}«${loc.quote}»</p>`;
    if (scrollPanel && window.innerWidth < 1025) {
      setTimeout(() => mapPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 80);
    }
  }

  function applyRegionFilter(region) {
    state.region = region;
    $$('.map-filters .chip').forEach((chip) => {
      chip.classList.toggle('is-active', chip.dataset.region === region);
    });
    $$('.map-pin', pinsLayer).forEach((pin) => {
      const loc = DATA.locations.find((item) => item.id === pin.dataset.location);
      pin.classList.toggle('is-hidden', region !== 'all' && loc && loc.region !== region);
    });
    if (state.selectedLocation && region !== 'all') {
      const selected = DATA.locations.find((item) => item.id === state.selectedLocation);
      if (selected && selected.region !== region) {
        state.selectedLocation = null;
        mapPanelEmpty();
      }
    }
  }

  function initMap() {
    renderMapPins();
    mapPanelEmpty();
    pinsLayer.addEventListener('click', (e) => {
      const pin = e.target.closest('.map-pin');
      if (pin) selectLocation(pin.dataset.location);
    });
    pinsLayer.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const pin = e.target.closest('.map-pin');
      if (!pin) return;
      e.preventDefault();
      selectLocation(pin.dataset.location);
    });
    $('.map-filters').addEventListener('click', (e) => {
      const chip = e.target.closest('[data-region]');
      if (chip) applyRegionFilter(chip.dataset.region);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Races                                                              */
  /* ------------------------------------------------------------------ */

  function renderRaces() {
    $('#raceGrid').innerHTML = DATA.races.map((race, i) => `
      <article class="race-card reveal" data-race="${race.id}" style="--accent:${race.accent};--delay:${(i * 0.045).toFixed(2)}s">
        <span class="race-icon">${icon(race.icon)}</span>
        <span class="race-en">${race.en}</span>
        <h3>${race.name}</h3>
        <p class="race-tagline">${race.tagline}</p>
        <p class="race-desc">${race.desc}</p>
        <ul class="race-traits">${race.traits.map((t) => `<li>${t}</li>`).join('')}</ul>
        <p class="race-figures"><strong>چهره‌های شناخته‌شده:</strong> ${race.figures.join('، ')}</p>
      </article>
    `).join('');
  }

  /* ------------------------------------------------------------------ */
  /* Characters                                                         */
  /* ------------------------------------------------------------------ */

  const characterGrid = $('#characterGrid');
  const characterDialog = $('#characterDialog');

  function renderCharacters() {
    const filter = state.characterFilter;
    const list = DATA.characters.filter((c) => filter === 'all' || c.groups.includes(filter));
    characterGrid.innerHTML = list.map((c, i) => `
      <article class="character-card reveal" data-char="${c.id}" tabindex="0" role="button"
        aria-label="مشاهده پرونده ${c.name}" style="--accent:${c.accent};--delay:${(i * 0.035).toFixed(2)}s">
        <div class="char-art">
          <span class="char-medallion">${icon(c.icon)}</span>
          <span class="char-runes">${c.en.toUpperCase()}</span>
        </div>
        <div class="char-body">
          <span class="char-en">${c.en}</span>
          <h3>${c.name}</h3>
          <span class="char-race">${c.race} · ${c.affiliation}</span>
          <p class="char-quote">«${c.quote}»</p>
          <span class="char-more">مشاهده پرونده ${icon('i-arrow')}</span>
        </div>
      </article>
    `).join('');
    observeReveals();
  }

  function openCharacter(id) {
    const c = DATA.characters.find((item) => item.id === id);
    if (!c) return;
    $('#characterDetail').innerHTML = `
      <div class="detail-hero" style="--accent:${c.accent}">
        <div class="detail-art">
          <span class="detail-emblem">${icon(c.icon)}</span>
          <span class="detail-art-runes">${c.en.toUpperCase()}</span>
        </div>
        <div class="detail-content">
          <span class="detail-en">${c.en}</span>
          <h2 id="detailName">${c.name}</h2>
          <p class="detail-titles">${c.titles}</p>
          <blockquote class="detail-quote">«${c.quote}»</blockquote>
          <div class="detail-copy">
            <p>${c.bio}</p>
            <p>${c.story}</p>
          </div>
          <div class="detail-meta">
            <div><span>نژاد</span><strong>${c.race}</strong></div>
            <div><span>وابستگی</span><strong>${c.affiliation}</strong></div>
            <div><span>سلاح یا نشانه</span><strong>${c.weapon}</strong></div>
            <div><span>نخستین حضور</span><strong>${c.first}</strong></div>
            <div><span>سرنوشت</span><strong>${c.fate}</strong></div>
            <div><span>گروه</span><strong>${c.groups.length ? c.groups.join('، ') : 'مستقل'}</strong></div>
          </div>
          <div class="detail-tags">
            <span>#${c.race}</span>
            ${c.groups.map((g) => `<span>#${g}</span>`).join('')}
          </div>
        </div>
      </div>`;
    openDialog(characterDialog);
  }

  function initCharacters() {
    renderCharacters();
    $('#characterFilters').addEventListener('click', (e) => {
      const chip = e.target.closest('[data-filter]');
      if (!chip) return;
      state.characterFilter = chip.dataset.filter;
      $$('#characterFilters .chip').forEach((c) => c.classList.toggle('is-active', c === chip));
      renderCharacters();
    });
    characterGrid.addEventListener('click', (e) => {
      const card = e.target.closest('[data-char]');
      if (card) openCharacter(card.dataset.char);
    });
    characterGrid.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const card = e.target.closest('[data-char]');
      if (!card) return;
      e.preventDefault();
      openCharacter(card.dataset.char);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Timeline                                                           */
  /* ------------------------------------------------------------------ */

  function renderEraTabs() {
    $('#eraTabs').innerHTML = DATA.eras.map((era, i) => `
      <button class="era-tab ${i === state.era ? 'is-active' : ''}" role="tab"
        aria-selected="${i === state.era}" data-era="${i}" type="button">
        ${era.name}<small>${era.en}</small>
      </button>
    `).join('');
  }

  function renderEra(index) {
    state.era = index;
    const era = DATA.eras[index];
    $$('#eraTabs .era-tab').forEach((tab, i) => {
      tab.classList.toggle('is-active', i === index);
      tab.setAttribute('aria-selected', String(i === index));
    });
    $('#eraSummary').innerHTML = `
      <span class="era-index">${String(index + 1).padStart(2, '0')} · ${era.en.toUpperCase()}</span>
      <h3>${era.name}</h3>
      <span class="era-span">${era.span}</span>
      <p>${era.summary}</p>
      <div class="era-count"><strong>${faNum(era.events.length)}</strong><span>رخداد کلیدی در این گاه‌شمار</span></div>
    `;
    $('#timelineList').innerHTML = era.events.map((ev, i) => `
      <article class="timeline-item" style="animation-delay:${(i * 0.07).toFixed(2)}s">
        <span class="timeline-year">${ev.year}</span>
        <h4>${ev.title}</h4>
        <p>${ev.desc}</p>
      </article>
    `).join('');
  }

  function initTimeline() {
    renderEraTabs();
    renderEra(0);
    $('#eraTabs').addEventListener('click', (e) => {
      const tab = e.target.closest('[data-era]');
      if (tab) renderEra(Number(tab.dataset.era));
    });
  }

  /* ------------------------------------------------------------------ */
  /* Books and adaptations                                              */
  /* ------------------------------------------------------------------ */

  function renderBooks() {
    const list = DATA.books.filter((b) => b.type === state.bookTab);
    $('#bookGrid').innerHTML = list.map((b, i) => `
      <article class="book-card reveal" data-book-id="${b.id}" style="--delay:${(i * 0.035).toFixed(2)}s">
        <div class="book-cover" style="--c1:${b.accent};--c2:${b.accent2}">
          <div class="cover-top">
            <span class="cover-icon">${icon(b.icon)}</span>
            <span class="cover-year">${b.year}</span>
          </div>
          <span class="cover-watermark" aria-hidden="true">${icon(b.icon)}</span>
          <div class="cover-main">
            <span class="cover-tag">${b.tag}</span>
            <h3>${b.title}</h3>
            <span class="cover-en">${b.en}</span>
          </div>
        </div>
        <div class="book-info">
          <p class="book-meta">${b.meta}</p>
          <h4>${b.title}</h4>
          <p>${b.desc}</p>
          <span class="book-type">${typeLabel[b.type]}</span>
        </div>
      </article>
    `).join('');
    observeReveals();
  }

  function initBooks() {
    renderBooks();
    $('#bookTabs').addEventListener('click', (e) => {
      const tab = e.target.closest('[data-book-tab]');
      if (!tab) return;
      state.bookTab = tab.dataset.bookTab;
      $$('#bookTabs .tab').forEach((t) => {
        const active = t === tab;
        t.classList.toggle('is-active', active);
        t.setAttribute('aria-selected', String(active));
      });
      renderBooks();
    });
  }

  /* ------------------------------------------------------------------ */
  /* Artifacts                                                          */
  /* ------------------------------------------------------------------ */

  function renderArtifacts() {
    $('#artifactGrid').innerHTML = DATA.artifacts.map((a, i) => `
      <article class="artifact-card reveal" data-artifact="${a.id}" style="--accent:${a.accent};--delay:${(i * 0.04).toFixed(2)}s">
        <span class="artifact-icon">${icon(a.icon)}</span>
        <span class="artifact-en">${a.en}</span>
        <h3>${a.name}</h3>
        <p>${a.desc}</p>
        <p class="artifact-owner"><span>صاحب یا حامل:</span> ${a.owner}</p>
        <p class="artifact-fate">${a.fate}</p>
      </article>
    `).join('');
  }

  /* ------------------------------------------------------------------ */
  /* Languages                                                          */
  /* ------------------------------------------------------------------ */

  function renderLanguages() {
    $('#languageCards').innerHTML = DATA.languages.map((lang) => `
      <article class="language-card">
        <span class="language-icon">${icon(lang.icon)}</span>
        <div>
          <div class="language-head"><h3>${lang.name}</h3><span>${lang.en}</span></div>
          <p>${lang.desc}</p>
          <ul class="phrase-list">
            ${lang.phrases.map((p) => `
              <li>
                <span class="phrase-word">${p.word}<span class="phrase-pron">${p.pron}</span></span>
                <span class="phrase-meaning">${p.meaning}</span>
              </li>`).join('')}
          </ul>
        </div>
      </article>
    `).join('');
  }

  /* ------------------------------------------------------------------ */
  /* Illustrated gallery                                                */
  /* ------------------------------------------------------------------ */

  function starField(prefix, count = 34, maxY = 300, color = '#f5e8c6') {
    let out = '';
    for (let i = 0; i < count; i++) {
      const x = ((i * 137.5 + 31) % 800).toFixed(1);
      const y = ((i * 83.7 + 17) % maxY).toFixed(1);
      const r = (0.6 + (i % 4) * 0.35).toFixed(2);
      const o = (0.2 + (i % 5) * 0.13).toFixed(2);
      out += `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}" opacity="${o}"/>`;
    }
    return out;
  }

  function sceneSVG(scene, prefix) {
    const p = prefix;

    if (scene === 'shire') {
      return `<svg viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id="${p}-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#1b2f3d"/><stop offset=".42" stop-color="#536a5b"/>
            <stop offset=".7" stop-color="#c39356"/><stop offset="1" stop-color="#e6c07c"/>
          </linearGradient>
          <radialGradient id="${p}-sun" cx="50%" cy="50%" r="50%">
            <stop offset="0" stop-color="#ffe9ae" stop-opacity=".95"/><stop offset=".45" stop-color="#f4c274" stop-opacity=".35"/><stop offset="1" stop-color="#f4c274" stop-opacity="0"/>
          </radialGradient>
          <linearGradient id="${p}-hill1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a5a42"/><stop offset="1" stop-color="#1e3629"/></linearGradient>
          <linearGradient id="${p}-hill2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b4a35"/><stop offset="1" stop-color="#172b21"/></linearGradient>
          <linearGradient id="${p}-hill3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#203a29"/><stop offset="1" stop-color="#101e17"/></linearGradient>
          <linearGradient id="${p}-door" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8a6033"/><stop offset="1" stop-color="#4a2e16"/></linearGradient>
          <radialGradient id="${p}-doorGlow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ffd47a" stop-opacity=".65"/><stop offset="1" stop-color="#ffd47a" stop-opacity="0"/></radialGradient>
        </defs>
        <rect width="800" height="600" fill="url(#${p}-sky)"/>
        ${starField(p, 26, 230)}
        <circle cx="628" cy="188" r="64" fill="url(#${p}-sun)"/>
        <path d="M0 334c104-56 176-64 268-22 88 40 152 34 228-10s196-52 304 16v282H0Z" fill="url(#${p}-hill1)"/>
        <path d="M0 414c112-38 194-16 282 24 92 42 178 24 260-10 98-40 178-18 258 18v154H0Z" fill="url(#${p}-hill2)"/>
        <g fill="#1b3325" opacity=".85">
          <path d="M126 420c-22-34-12-72 16-88 30 20 38 58 12 92Z"/><rect x="144" y="414" width="7" height="34" fill="#20301f"/>
          <path d="M676 380c-20-32-10-66 16-80 28 18 34 54 10 84Z"/><rect x="692" y="376" width="7" height="32" fill="#20301f"/>
          <path d="M594 424c-16-26-8-54 14-66 23 15 27 44 8 69Z"/><rect x="606" y="420" width="6" height="26" fill="#20301f"/>
        </g>
        <g>
          <circle cx="270" cy="470" r="76" fill="#2b4a34"/>
          <circle cx="270" cy="468" r="64" fill="#33553b"/>
          <circle cx="270" cy="458" r="42" fill="url(#${p}-doorGlow)"/>
          <circle cx="270" cy="460" r="34" fill="url(#${p}-door)" stroke="#2d1b0c" stroke-width="4"/>
          <circle cx="270" cy="460" r="25" fill="none" stroke="#3a2411" stroke-width="2" opacity=".8"/>
          <circle cx="270" cy="460" r="7" fill="#e8bd68"/>
          <rect x="226" y="490" width="88" height="8" rx="4" fill="#14251b"/>
          <circle cx="352" cy="444" r="16" fill="#e2ba6d" opacity=".2"/>
          <circle cx="352" cy="444" r="9" fill="#f3d48e" opacity=".8"/>
          <rect x="340" y="396" width="12" height="34" fill="#3a3b2b"/>
          <path d="M346 392c8-16 2-28-6-38 14 2 22 14 20 26-1 6-5 10-14 12Z" fill="#c7c4b2" opacity=".28"/>
          <path d="M346 388c-6-12-12-16-20-20 12-2 22 6 24 16Z" fill="#c7c4b2" opacity=".18"/>
        </g>
        <path d="M0 502c130-22 226 10 328 16 108 6 210-24 314-14 62 6 112 18 158 30v66H0Z" fill="url(#${p}-hill3)"/>
        <g fill="#f4d792">
          <circle cx="196" cy="478" r="2" opacity=".85"/><circle cx="452" cy="520" r="1.7" opacity=".7"/>
          <circle cx="562" cy="470" r="1.5" opacity=".6"/><circle cx="322" cy="536" r="1.8" opacity=".75"/>
          <circle cx="678" cy="536" r="1.4" opacity=".55"/>
        </g>
      </svg>`;
    }

    if (scene === 'rivendell') {
      return `<svg viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id="${p}-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#101d33"/><stop offset=".45" stop-color="#334a66"/>
            <stop offset=".78" stop-color="#8a7a74"/><stop offset="1" stop-color="#c79a6f"/>
          </linearGradient>
          <linearGradient id="${p}-cliff" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a3340"/><stop offset="1" stop-color="#111820"/></linearGradient>
          <linearGradient id="${p}-tower" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e4dbc4"/><stop offset=".6" stop-color="#a99a7d"/><stop offset="1" stop-color="#655a48"/></linearGradient>
          <linearGradient id="${p}-fall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cfe3e6" stop-opacity=".9"/><stop offset="1" stop-color="#87aeb2" stop-opacity=".25"/></linearGradient>
          <radialGradient id="${p}-mist" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#b8c8c8" stop-opacity=".28"/><stop offset="1" stop-color="#b8c8c8" stop-opacity="0"/></radialGradient>
        </defs>
        <rect width="800" height="600" fill="url(#${p}-sky)"/>
        ${starField(p, 40, 280)}
        <circle cx="196" cy="128" r="34" fill="#f4e8c8" opacity=".9"/>
        <circle cx="184" cy="120" r="31" fill="url(#${p}-sky)" opacity=".75"/>
        <path d="M0 0h164c-8 112-30 208-76 288-30 54-58 84-88 118Z" fill="url(#${p}-cliff)"/>
        <path d="M800 0H626c10 124 34 222 82 302 28 46 56 74 92 104Z" fill="url(#${p}-cliff)"/>
        <path d="M352 248h112l-8 60c-16 20-34 30-50 32-18-2-38-12-56-32Z" fill="url(#${p}-fall)"/>
        <path d="M370 300c12 44 18 78 16 112M410 308c8 44 10 76 8 108M438 300c6 38 10 70 10 100" stroke="#d5e7e9" stroke-width="3" opacity=".55" fill="none"/>
        <ellipse cx="402" cy="494" rx="168" ry="34" fill="url(#${p}-mist)"/>
        <g fill="url(#${p}-tower)" stroke="#5e5543" stroke-width="2">
          <path d="M540 384V248l30-58 30 58v136Z"/>
          <path d="M608 404V300l22-44 22 44v104Z"/>
          <path d="M492 414V330l18-34 18 34v84Z"/>
        </g>
        <g fill="#f6d896">
          <rect x="560" y="286" width="6" height="12" rx="3"/><rect x="578" y="286" width="6" height="12" rx="3"/>
          <rect x="560" y="322" width="6" height="12" rx="3"/><rect x="578" y="322" width="6" height="12" rx="3"/>
          <rect x="624" y="334" width="5" height="10" rx="2"/><rect x="508" y="356" width="5" height="10" rx="2"/>
        </g>
        <g stroke="#8f8269" stroke-width="2" fill="none" opacity=".85">
          <path d="M462 450c48-18 92-18 138 0"/><path d="M462 450v22M600 450v22"/>
          <path d="M470 462h122"/>
        </g>
        <path d="M0 502c92-12 172-6 244 14 82 22 174 18 262-4 92-24 184-16 294 24v64H0Z" fill="#0e171b"/>
        <path d="M0 536c120-10 208 6 300 20 100 16 204 8 304-12 70-14 132-8 196 12v44H0Z" fill="#0a1114"/>
      </svg>`;
    }

    if (scene === 'lothlorien') {
      return `<svg viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id="${p}-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#1d3527"/><stop offset=".45" stop-color="#58703c"/>
            <stop offset=".75" stop-color="#b39245"/><stop offset="1" stop-color="#dbb967"/>
          </linearGradient>
          <linearGradient id="${p}-trunk" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3c2f1c"/><stop offset=".5" stop-color="#6e5730"/><stop offset="1" stop-color="#2e2416"/></linearGradient>
          <radialGradient id="${p}-canopy" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#f0cb63"/><stop offset=".6" stop-color="#c69b3b"/><stop offset="1" stop-color="#7d5c1c"/></radialGradient>
          <linearGradient id="${p}-beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff0b0" stop-opacity=".3"/><stop offset="1" stop-color="#fff0b0" stop-opacity="0"/></linearGradient>
          <linearGradient id="${p}-water" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9fbfae" stop-opacity=".5"/><stop offset="1" stop-color="#5b7f76" stop-opacity=".2"/></linearGradient>
        </defs>
        <rect width="800" height="600" fill="url(#${p}-sky)"/>
        <g opacity=".85">
          <polygon points="250,0 330,0 180,520 110,520" fill="url(#${p}-beam)"/>
          <polygon points="470,0 540,0 430,480 360,480" fill="url(#${p}-beam)" opacity=".7"/>
          <polygon points="650,0 700,0 620,430 570,430" fill="url(#${p}-beam)" opacity=".5"/>
        </g>
        <g>
          <path d="M86 600c10-150 16-294 8-438l30-4c8 152 4 292-6 442Z" fill="url(#${p}-trunk)"/>
          <ellipse cx="112" cy="124" rx="150" ry="78" fill="url(#${p}-canopy)" opacity=".9"/>
          <ellipse cx="40" cy="176" rx="108" ry="58" fill="url(#${p}-canopy)" opacity=".72"/>
        </g>
        <g>
          <path d="M678 600c-10-160-14-312-4-452l32 2c-6 150-4 300 6 450Z" fill="url(#${p}-trunk)"/>
          <ellipse cx="690" cy="108" rx="158" ry="82" fill="url(#${p}-canopy)" opacity=".9"/>
          <ellipse cx="764" cy="168" rx="104" ry="56" fill="url(#${p}-canopy)" opacity=".68"/>
        </g>
        <g>
          <path d="M352 600c6-128 10-232 4-330l22-2c6 104 4 208-2 332Z" fill="url(#${p}-trunk)" opacity=".72"/>
          <ellipse cx="368" cy="250" rx="92" ry="52" fill="url(#${p}-canopy)" opacity=".7"/>
        </g>
        <path d="M396 600c-18-64-14-116 4-168 18-52 16-98 0-144 30 30 42 84 30 138-10 50-12 106 8 174Z" fill="url(#${p}-water)"/>
        <g fill="#f5dc8a" opacity=".9">
          <path d="M246 340c10-10 22-10 30 0-10 6-20 6-30 0Z"/>
          <path d="M546 300c8-8 20-8 28 0-10 6-18 6-28 0Z"/>
          <path d="M470 412c7-7 17-7 24 0-8 5-16 5-24 0Z"/>
          <path d="M296 476c7-7 17-7 24 0-8 5-16 5-24 0Z"/>
        </g>
        <g fill="#ffe6a1">
          <circle cx="212" cy="386" r="2"/><circle cx="580" cy="350" r="1.7"/><circle cx="500" cy="472" r="1.5"/>
          <circle cx="336" cy="536" r="1.8"/><circle cx="638" cy="512" r="1.6"/><circle cx="154" cy="454" r="1.4"/>
        </g>
        <ellipse cx="400" cy="548" rx="280" ry="40" fill="#2c3a22" opacity=".5"/>
      </svg>`;
    }

    if (scene === 'erebor') {
      return `<svg viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id="${p}-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#071426"/><stop offset=".5" stop-color="#152c44"/><stop offset="1" stop-color="#40566c"/>
          </linearGradient>
          <linearGradient id="${p}-mountain" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2c3743"/><stop offset=".55" stop-color="#18222c"/><stop offset="1" stop-color="#0a1015"/></linearGradient>
          <radialGradient id="${p}-gate" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ffd27a" stop-opacity=".95"/><stop offset=".45" stop-color="#e08b2d" stop-opacity=".45"/><stop offset="1" stop-color="#e08b2d" stop-opacity="0"/></radialGradient>
          <linearGradient id="${p}-aurora" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7fd5b0" stop-opacity="0"/><stop offset=".4" stop-color="#7fd5b0" stop-opacity=".28"/><stop offset=".7" stop-color="#a0c9ff" stop-opacity=".22"/><stop offset="1" stop-color="#a0c9ff" stop-opacity="0"/></linearGradient>
        </defs>
        <rect width="800" height="600" fill="url(#${p}-sky)"/>
        ${starField(p, 52, 340, '#dbe8f4')}
        <path d="M0 120c180-44 330-6 470 22 130 26 244-2 330-28v76c-120 32-238 52-370 22-120-28-260-52-430-4Z" fill="url(#${p}-aurora)"/>
        <path d="M0 168c176-30 310 4 448 26 128 20 244-8 352-30v28c-120 30-236 46-360 22-130-24-268-48-440-10Z" fill="url(#${p}-aurora)" opacity=".55"/>
        <circle cx="642" cy="96" r="2.2" fill="#f2f7ff" opacity=".9"/>
        <path d="M0 600V430l142-76 74 40 118-176 74-18 76 194 82-52 86 118 62-36 86 96v80Z" fill="url(#${p}-mountain)"/>
        <path d="M334 218l74-18 76 194-70-42-46-58-48 38Z" fill="#3c4a56" opacity=".7"/>
        <path d="M260 600l130-258 134 258Z" fill="#111a21"/>
        <path d="M312 600l84-162 92 162Z" fill="#0a0f14"/>
        <ellipse cx="394" cy="574" rx="126" ry="40" fill="url(#${p}-gate)" opacity=".65"/>
        <path d="M356 600v-62c0-22 17-40 39-40s39 18 39 40v62Z" fill="#f2b24f" opacity=".92"/>
        <path d="M370 600v-58c0-14 11-25 25-25s25 11 25 25v58Z" fill="#7c3f12" opacity=".8"/>
        <path d="M350 492h90M354 504h82" stroke="#8c6b3f" stroke-width="3" opacity=".7"/>
        <g fill="#1f2b33">
          <path d="M270 580V500h22v80Z"/><path d="M508 580V500h22v80Z"/>
          <path d="M262 500h38l-19-22Z"/><path d="M500 500h38l-19-22Z"/>
        </g>
        <path d="M0 600V556c112-22 210-8 300 26 92 34 200 30 306 6 76-18 140-14 194 4v8Z" fill="#070c10"/>
        <g fill="#f0c777" opacity=".7">
          <circle cx="258" cy="450" r="1.6"/><circle cx="534" cy="428" r="1.4"/><circle cx="602" cy="486" r="1.7"/>
        </g>
      </svg>`;
    }

    if (scene === 'rohan') {
      return `<svg viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id="${p}-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#2a2a3a"/><stop offset=".35" stop-color="#7a4e44"/>
            <stop offset=".68" stop-color="#c47d45"/><stop offset="1" stop-color="#e8bd79"/>
          </linearGradient>
          <radialGradient id="${p}-sun" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff1ba"/><stop offset=".5" stop-color="#ffca6e" stop-opacity=".6"/><stop offset="1" stop-color="#ffca6e" stop-opacity="0"/></radialGradient>
          <linearGradient id="${p}-plain1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9a7439"/><stop offset="1" stop-color="#6c4f27"/></linearGradient>
          <linearGradient id="${p}-plain2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#75562b"/><stop offset="1" stop-color="#442f18"/></linearGradient>
          <linearGradient id="${p}-plain3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4e371b"/><stop offset="1" stop-color="#2b1d0f"/></linearGradient>
        </defs>
        <rect width="800" height="600" fill="url(#${p}-sky)"/>
        <circle cx="560" cy="318" r="118" fill="url(#${p}-sun)"/>
        <circle cx="560" cy="318" r="34" fill="#ffe9a9" opacity=".9"/>
        <g fill="#4d3436" opacity=".45">
          <path d="M60 190c80-22 150-16 218 4 60 18 108 10 150-4-32 22-78 30-136 16-70-16-148-26-232-16Z"/>
          <path d="M420 116c70-16 130-10 184 8-52 4-108 6-184-8Z" opacity=".7"/>
        </g>
        <path d="M0 352c116-26 212-14 308 10 102 26 214 22 318-8 66-20 122-20 174-6v252H0Z" fill="url(#${p}-plain1)"/>
        <path d="M0 422c122-24 220 4 318 22 106 20 208 8 302-18 68-18 128-18 180-2v176H0Z" fill="url(#${p}-plain2)"/>
        <path d="M0 512c116-22 212-4 310 12 106 18 206 6 298-14 72-16 134-12 192 4v86H0Z" fill="url(#${p}-plain3)"/>
        <g transform="translate(512 352)">
          <ellipse cx="26" cy="146" rx="132" ry="66" fill="#3a2813"/>
          <path d="M-96 150c30-52 78-76 136-67 48 8 78 30 104 67Z" fill="#4a3419"/>
          <path d="M-60 108h148v42H-60Z" fill="#24190c"/>
          <path d="M-36 84h100v26H-36Z" fill="#1a1209"/>
          <path d="M-54 84 14 36l68 48Z" fill="#8d5d24"/>
          <path d="M-54 84 14 36l20 14-60 34Z" fill="#c08a3e" opacity=".6"/>
          <path d="M14 36v48" stroke="#3a2813" stroke-width="2"/>
          <rect x="-28" y="88" width="6" height="34" fill="#d7a35c" opacity=".8"/>
          <rect x="42" y="88" width="6" height="34" fill="#d7a35c" opacity=".8"/>
          <rect x="2" y="96" width="20" height="26" rx="2" fill="#f0c477" opacity=".9"/>
          <ellipse cx="12" cy="120" rx="26" ry="12" fill="#e8a54a" opacity=".2"/>
          <rect x="16" y="20" width="3" height="36" fill="#1a1209"/>
          <path d="M19 20h26l-7 8 7 8H19Z" fill="#a64b35"/>
          <path d="M-102 132h-16v18h16M104 132h16v18h-16" fill="#24190c"/>
          <path d="M-110 132h22M104 132h22" stroke="#3a2813" stroke-width="2"/>
        </g>
        <g stroke="#2b2117" stroke-width="1.6" fill="none" opacity=".7">
          <path d="M150 232c8-7 15-7 23 0M186 218c7-6 13-6 20 0M236 240c6-5 12-5 18 0"/>
        </g>
        <g stroke="#2b1d0f" stroke-width="1.4" opacity=".55">
          <path d="M52 548c10-14 18-24 24-38M76 556c8-18 16-30 20-44M680 540c8-16 14-28 18-42M712 548c8-14 14-26 18-40"/>
        </g>
        <g fill="#f1c477" opacity=".75">
          <circle cx="142" cy="494" r="1.7"/><circle cx="260" cy="522" r="1.4"/><circle cx="632" cy="504" r="1.6"/>
        </g>
      </svg>`;
    }

    if (scene === 'gondor') {
      return `<svg viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id="${p}-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#1d3044"/><stop offset=".45" stop-color="#6b7477"/>
            <stop offset=".75" stop-color="#c7a878"/><stop offset="1" stop-color="#e2c48f"/>
          </linearGradient>
          <linearGradient id="${p}-mtn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b4650"/><stop offset="1" stop-color="#1b2229"/></linearGradient>
          <linearGradient id="${p}-city" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e6ddc8"/><stop offset=".55" stop-color="#b9ad94"/><stop offset="1" stop-color="#736a58"/></linearGradient>
          <linearGradient id="${p}-rock" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a3a34"/><stop offset="1" stop-color="#121412"/></linearGradient>
          <radialGradient id="${p}-beacon" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ffdc8a"/><stop offset=".4" stop-color="#e7983c" stop-opacity=".6"/><stop offset="1" stop-color="#e7983c" stop-opacity="0"/></radialGradient>
        </defs>
        <rect width="800" height="600" fill="url(#${p}-sky)"/>
        ${starField(p, 18, 200)}
        <circle cx="180" cy="136" r="26" fill="#f5ecd4" opacity=".8"/>
        <path d="M0 360l96-92 76 58 86-122 90 116 72-46 96 94 84-52 100 86 100-66v264H0Z" fill="url(#${p}-mtn)" opacity=".8"/>
        <path d="M0 470c88-38 166-30 246-4 78 26 158 28 244 4 92-26 180-18 310 32v98H0Z" fill="#20251f"/>
        <path d="M244 600V330h312v270Z" fill="url(#${p}-rock)"/>
        <g fill="url(#${p}-city)" stroke="#5e5747" stroke-width="2">
          <rect x="318" y="430" width="164" height="132"/>
          <rect x="344" y="386" width="112" height="96"/>
          <rect x="366" y="336" width="68" height="86"/>
          <rect x="386" y="288" width="28" height="74"/>
        </g>
        <g fill="url(#${p}-city)" stroke="#5e5747" stroke-width="2">
          <path d="M386 254h28l14-24h-56Z"/>
          <path d="M382 288h36v-16h-36Z" opacity=".9"/>
        </g>
        <g fill="url(#${p}-city)" stroke="#5e5747" stroke-width="2">
          <rect x="270" y="470" width="46" height="96"/>
          <rect x="486" y="458" width="52" height="108"/>
          <rect x="250" y="510" width="86" height="56"/>
          <rect x="466" y="498" width="92" height="68"/>
        </g>
        <g fill="#f0cf8a">
          <rect x="392" y="306" width="6" height="14" rx="2"/>
          <rect x="374" y="350" width="5" height="12" rx="2"/><rect x="420" y="350" width="5" height="12" rx="2"/>
          <rect x="350" y="402" width="5" height="12" rx="2"/><rect x="446" y="402" width="5" height="12" rx="2"/>
          <rect x="328" y="458" width="5" height="12" rx="2"/><rect x="466" y="458" width="5" height="12" rx="2"/>
        </g>
        <circle cx="400" cy="228" r="30" fill="url(#${p}-beacon)" opacity=".8"/>
        <path d="M400 212v18M400 230l8 8" stroke="#f4d391" stroke-width="2" opacity=".7"/>
        <g stroke="#5d5748" stroke-width="2" fill="none" opacity=".65">
          <path d="M318 506h164M344 470h112M366 430h68"/>
        </g>
        <path d="M0 600v-42c110-18 204-4 300 12 100 16 198 8 296-8 74-12 142-8 204 10v28Z" fill="#0b0e0c"/>
      </svg>`;
    }

    if (scene === 'mordor') {
      return `<svg viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id="${p}-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#140807"/><stop offset=".4" stop-color="#42110d"/>
            <stop offset=".72" stop-color="#8e2c14"/><stop offset="1" stop-color="#d05c22"/>
          </linearGradient>
          <linearGradient id="${p}-mtn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b1b19"/><stop offset="1" stop-color="#0d0807"/></linearGradient>
          <linearGradient id="${p}-lava" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffb347" stop-opacity="0"/><stop offset=".5" stop-color="#ff8a2a"/><stop offset="1" stop-color="#ffb347" stop-opacity="0"/></linearGradient>
          <radialGradient id="${p}-crater" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ffd27a"/><stop offset=".4" stop-color="#e8621f" stop-opacity=".7"/><stop offset="1" stop-color="#e8621f" stop-opacity="0"/></radialGradient>
          <radialGradient id="${p}-eye" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ffdf9a"/><stop offset=".45" stop-color="#e8591e" stop-opacity=".65"/><stop offset="1" stop-color="#e8591e" stop-opacity="0"/></radialGradient>
        </defs>
        <rect width="800" height="600" fill="url(#${p}-sky)"/>
        <g opacity=".4" fill="#1a0908">
          <path d="M0 120c120-26 220 4 320 18 104 14 200-6 300-26 64-14 124-10 180 6v40c-104-18-202-4-304 16-110 22-224 18-334-4C92 154 46 148 0 158Z"/>
          <path d="M0 212c150-20 270 18 400 22 118 4 224-22 400-16v26c-142 22-274 32-402 20-136-12-262-32-398-12Z" opacity=".6"/>
        </g>
        <circle cx="610" cy="160" r="86" fill="url(#${p}-eye)" opacity=".55"/>
        <ellipse cx="610" cy="160" rx="58" ry="26" fill="none" stroke="#ff9b45" stroke-width="2" opacity=".5"/>
        <ellipse cx="610" cy="160" rx="15" ry="24" fill="#1a0905" opacity=".7"/>
        <path d="M0 600V422l92-58 70 40 90-122 64 18 66 154 82-74 80 96 76-28 90 78 90-44v118Z" fill="url(#${p}-mtn)"/>
        <path d="M338 600l102-184 116 184Z" fill="#0b0706"/>
        <path d="M384 600l58-92 62 92Z" fill="#150a06"/>
        <ellipse cx="444" cy="486" rx="190" ry="130" fill="url(#${p}-crater)" opacity=".55"/>
        <ellipse cx="444" cy="522" rx="120" ry="54" fill="url(#${p}-crater)" opacity=".9"/>
        <path d="M368 556c24-14 44-10 64 0 22 10 42 8 60-2" stroke="url(#${p}-lava)" stroke-width="7" fill="none" opacity=".95"/>
        <path d="M402 600c18-12 38-14 64-6 18 5 34 4 48-2" stroke="url(#${p}-lava)" stroke-width="4" fill="none" opacity=".8"/>
        <path d="M428 492c10-24 26-36 44-48M400 512c-14-18-18-32-22-50" stroke="url(#${p}-lava)" stroke-width="2.4" fill="none" opacity=".8"/>
        <g fill="#f08a36" opacity=".8">
          <circle cx="276" cy="452" r="1.8"/><circle cx="514" cy="430" r="1.5"/><circle cx="352" cy="386" r="1.4"/>
          <circle cx="590" cy="480" r="1.6"/><circle cx="196" cy="512" r="1.3"/><circle cx="646" cy="404" r="1.2"/>
          <circle cx="470" cy="560" r="2"/><circle cx="322" cy="540" r="1.3"/>
        </g>
        <path d="M0 600v-54c104-18 192-8 278 8 96 18 190 16 286-2 88-16 164-10 236 12v36Z" fill="#070403"/>
      </svg>`;
    }

    return `<svg viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="${p}-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#071527"/><stop offset=".55" stop-color="#123247"/><stop offset="1" stop-color="#4f7782"/>
        </linearGradient>
        <linearGradient id="${p}-sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#274f5d"/><stop offset=".5" stop-color="#102b39"/><stop offset="1" stop-color="#071722"/></linearGradient>
        <linearGradient id="${p}-sail" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4efdf"/><stop offset="1" stop-color="#aca68f"/></linearGradient>
        <linearGradient id="${p}-cliff" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b2a31"/><stop offset="1" stop-color="#070d11"/></linearGradient>
        <radialGradient id="${p}-moon" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#f8f0ce"/><stop offset=".55" stop-color="#dcd8a8" stop-opacity=".55"/><stop offset="1" stop-color="#dcd8a8" stop-opacity="0"/></radialGradient>
        <linearGradient id="${p}-path" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4e9b8" stop-opacity=".55"/><stop offset="1" stop-color="#f4e9b8" stop-opacity=".05"/></linearGradient>
      </defs>
      <rect width="800" height="600" fill="url(#${p}-sky)"/>
      ${starField(p, 56, 300, '#e6eef4')}
      <circle cx="548" cy="150" r="78" fill="url(#${p}-moon)"/>
      <circle cx="548" cy="150" r="28" fill="#f6efcf" opacity=".95"/>
      <path d="M0 330c116-8 214 6 310 14 120 10 224-4 330-18 56-8 106-8 160 2v272H0Z" fill="url(#${p}-sea)"/>
      <path d="M524 330h48l-70 270h-96Z" fill="url(#${p}-path)" opacity=".6"/>
      <g fill="none" stroke="#cfe0dd" stroke-width="1.2" opacity=".3">
        <path d="M60 386c90-8 160 4 248 0M340 418c100-8 174 4 268-2M120 470c90-6 160 6 250 0M420 508c80-6 142 4 218 0"/>
      </g>
      <path d="M0 0h96c10 84 6 144-10 202-14 52-40 94-86 128Z" fill="url(#${p}-cliff)"/>
      <path d="M800 0h-82c-8 80-2 136 14 190 14 46 40 82 68 108Z" fill="url(#${p}-cliff)"/>
      <g transform="translate(360 318)">
        <path d="M-82 44c26-12 132-12 162 0 10 4 8 16-2 20-40 14-118 14-158 0-10-4-12-16-2-20Z" fill="#1a1710"/>
        <path d="M-72 44V16h148v28Z" fill="#2a2417"/>
        <rect x="-6" y="-92" width="5" height="138" fill="#2a2417"/>
        <path d="M0-88c32 16 58 54 58 84H0Z" fill="url(#${p}-sail)"/>
        <path d="M2-70c-26 18-44 44-48 68H2Z" fill="url(#${p}-sail)" opacity=".85"/>
        <path d="M-6-92l-24 44 24-12Z" fill="#c8c0a6"/>
        <path d="M72 50l14 20h-30Z" fill="#1a1710"/>
      </g>
      <path d="M0 600v-54c124-16 220 6 314 18 106 14 206 6 304-10 68-10 126-6 182 10v36Z" fill="#050c11"/>
      <g fill="#dbe7e4" opacity=".4">
        <circle cx="204" cy="358" r="1.4"/><circle cx="662" cy="376" r="1.2"/><circle cx="296" cy="492" r="1.3"/>
      </g>
    </svg>`;
  }

  function renderGallery() {
    $('#galleryGrid').innerHTML = DATA.gallery.map((item, i) => `
      <article class="gallery-item reveal" data-gallery="${item.id}" tabindex="0" role="button"
        aria-label="بازکردن تصویر ${item.title}" style="--delay:${(i * 0.04).toFixed(2)}s">
        <div class="gallery-art">${sceneSVG(item.scene, `g-${item.id}`)}</div>
        <div class="gallery-overlay">
          <span class="gallery-en">${item.en}</span>
          <h3>${item.title}</h3>
        </div>
        <span class="gallery-open">${icon('i-spark')}</span>
      </article>
    `).join('');
  }

  const galleryDialog = $('#galleryDialog');

  function openGallery(index) {
    const total = DATA.gallery.length;
    state.galleryIndex = (index + total) % total;
    const item = DATA.gallery[state.galleryIndex];
    $('#galleryDetailArt').innerHTML = sceneSVG(item.scene, `d-${item.id}`);
    $('#galleryDetailEn').textContent = item.en;
    $('#galleryDetailTitle').textContent = item.title;
    $('#galleryDetailDesc').textContent = item.desc;
    $('#galleryDetailQuote').textContent = `«${item.quote}»`;
    $('#galleryCounter').textContent = `${faNum(state.galleryIndex + 1)} از ${faNum(total)}`;
    if (!galleryDialog.open) openDialog(galleryDialog);
  }

  function initGallery() {
    renderGallery();
    const grid = $('#galleryGrid');
    grid.addEventListener('click', (e) => {
      const item = e.target.closest('[data-gallery]');
      if (!item) return;
      openGallery(DATA.gallery.findIndex((g) => g.id === item.dataset.gallery));
    });
    grid.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const item = e.target.closest('[data-gallery]');
      if (!item) return;
      e.preventDefault();
      openGallery(DATA.gallery.findIndex((g) => g.id === item.dataset.gallery));
    });
    $('#galleryPrev').addEventListener('click', () => openGallery(state.galleryIndex - 1));
    $('#galleryNext').addEventListener('click', () => openGallery(state.galleryIndex + 1));
    galleryDialog.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') openGallery(state.galleryIndex - 1);
      if (e.key === 'ArrowLeft') openGallery(state.galleryIndex + 1);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Dialog helpers                                                     */
  /* ------------------------------------------------------------------ */

  function openDialog(dialog) {
    if (!dialog) return;
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    document.body.classList.add('dialog-open');
  }

  function initDialogs() {
    $$('dialog').forEach((dialog) => {
      dialog.addEventListener('click', (e) => {
        if (e.target === dialog) dialog.close();
      });
      dialog.addEventListener('close', () => {
        if (!document.querySelector('dialog[open]')) document.body.classList.remove('dialog-open');
      });
    });
    $('#detailClose').addEventListener('click', () => characterDialog.close());
    $('#galleryClose').addEventListener('click', () => galleryDialog.close());
  }

  /* ------------------------------------------------------------------ */
  /* Quiz                                                               */
  /* ------------------------------------------------------------------ */

  const quiz = {
    index: 0,
    score: 0,
    answered: false,
    best: null
  };
  const QUIZ_TOTAL = DATA.quiz.length;

  function readBest() {
    const stored = localStorage.getItem('lotr-quiz-best');
    if (stored === null || stored === '') return null;
    const raw = Number(stored);
    return Number.isFinite(raw) && raw >= 0 ? raw : null;
  }

  function syncBest() {
    quiz.best = readBest();
    const wrap = $('#quizBest');
    if (quiz.best === null) {
      wrap.hidden = true;
      return;
    }
    wrap.hidden = false;
    $('#quizBestValue').textContent = `${faNum(quiz.best)} از ${faNum(QUIZ_TOTAL)}`;
  }

  function quizStart() {
    quiz.index = 0;
    quiz.score = 0;
    quiz.answered = false;
    $('#quizStart').hidden = true;
    $('#quizResult').hidden = true;
    $('#quizBody').hidden = false;
    renderQuizQuestion();
  }

  function renderQuizQuestion() {
    const question = DATA.quiz[quiz.index];
    quiz.answered = false;
    $('#quizStep').textContent = `پرسش ${faNum(quiz.index + 1)} از ${faNum(QUIZ_TOTAL)}`;
    $('#quizScore').textContent = `امتیاز: ${faNum(quiz.score)}`;
    $('#quizProgressBar').style.width = `${((quiz.index + 1) / QUIZ_TOTAL) * 100}%`;
    $('#quizQuestion').textContent = question.q;
    $('#quizOptions').innerHTML = question.options.map((option, i) => `
      <button class="quiz-option" type="button" data-option="${i}">
        <span class="opt-index">${faNum(i + 1)}</span>
        <span>${option}</span>
      </button>`).join('');
    $('#quizFeedback').hidden = true;
    $('#quizFeedback').className = 'quiz-feedback';
    $('#quizNextBtn').hidden = true;
    $('#quizNextBtn').querySelector('span').textContent = quiz.index === QUIZ_TOTAL - 1 ? 'دیدن نتیجه' : 'پرسش بعدی';
  }

  function answerQuiz(optionIndex) {
    if (quiz.answered) return;
    quiz.answered = true;
    const question = DATA.quiz[quiz.index];
    const correct = optionIndex === question.answer;
    if (correct) quiz.score += 1;
    $$('#quizOptions .quiz-option').forEach((button, i) => {
      button.classList.add('is-locked');
      button.disabled = true;
      if (i === question.answer) button.classList.add('is-correct');
      if (i === optionIndex && !correct) button.classList.add('is-wrong');
    });
    $('#quizScore').textContent = `امتیاز: ${faNum(quiz.score)}`;
    const feedback = $('#quizFeedback');
    feedback.hidden = false;
    feedback.className = `quiz-feedback ${correct ? 'is-good' : 'is-bad'}`;
    feedback.innerHTML = `<strong>${correct ? 'درست! ' : 'پاسخ درست: ' + question.options[question.answer] + '. '}</strong>${question.explain}`;
    $('#quizNextBtn').hidden = false;
  }

  function quizNext() {
    if (quiz.index < QUIZ_TOTAL - 1) {
      quiz.index += 1;
      renderQuizQuestion();
      $('#quizQuestion').focus?.();
      return;
    }
    const score = quiz.score;
    const pct = Math.round((score / QUIZ_TOTAL) * 100);
    $('#resultScore').textContent = faNum(score);
    $('#scoreRing').style.setProperty('--pct', String(pct));
    let title = 'کاوشگر گم‌شده';
    let text = 'سفر تازه آغاز شده است. افسانه‌های سرزمین میانه را دوباره بخوانید و به شایر بازگردید.';
    if (score === QUIZ_TOTAL) {
      title = 'استاد افسانه‌ها';
      text = 'بی‌نقص! شما همچون گندالف، لایه‌های تاریخ آردا را می‌شناسید. حتی الروند هم به دانش شما افتخار می‌کند.';
    } else if (score >= 10) {
      title = 'یار حلقه';
      text = 'شما شایسته همراهی فرودو هستید. دانش شما از سرزمین میانه عمیق است و تنها چند راز کوچک باقی مانده.';
    } else if (score >= 7) {
      title = 'دوستدار شایر';
      text = 'سفری خوب بود! شما با قهرمانان و مکان‌های اصلی آشنا هستید؛ کمی بیشتر در کتاب‌ها کاوش کنید.';
    } else if (score >= 4) {
      title = 'مسافر تازه‌وارد';
      text = 'درهای سرزمین میانه به روی شما باز است. با خواندن سه‌گانه، داستان‌های بیشتری را کشف خواهید کرد.';
    }
    $('#resultTitle').textContent = title;
    $('#resultText').textContent = text;
    $('#quizBody').hidden = true;
    $('#quizResult').hidden = false;
    if (quiz.best === null || score > quiz.best) {
      localStorage.setItem('lotr-quiz-best', String(score));
      syncBest();
    }
  }

  function initQuiz() {
    syncBest();
    $('#quizStartBtn').addEventListener('click', quizStart);
    $('#quizRestartBtn').addEventListener('click', quizStart);
    $('#quizNextBtn').addEventListener('click', quizNext);
    $('#quizOptions').addEventListener('click', (e) => {
      const option = e.target.closest('[data-option]');
      if (option) answerQuiz(Number(option.dataset.option));
    });
  }

  /* ------------------------------------------------------------------ */
  /* Search                                                             */
  /* ------------------------------------------------------------------ */

  const searchDialog = $('#searchDialog');
  const searchInput = $('#searchInput');
  const searchResults = $('#searchResults');
  let searchReturnFocus = null;

  function normalize(text) {
    return String(text)
      .toLowerCase()
      .replace(/[يى]/g, 'ی')
      .replace(/ك/g, 'ک')
      .replace(/[\u064B-\u0652\u200c]/g, '')
      .trim();
  }

  function buildSearchIndex() {
    const items = [];
    DATA.characters.forEach((c) => items.push({
      key: `char:${c.id}`,
      type: 'شخصیت',
      title: c.name,
      subtitle: `${c.en} · ${c.race}`,
      icon: c.icon,
      haystack: normalize(`${c.name} ${c.en} ${c.race} ${c.titles} ${c.affiliation} ${c.bio} ${c.story}`)
    }));
    DATA.locations.forEach((l) => items.push({
      key: `loc:${l.id}`,
      type: 'مکان',
      title: l.name,
      subtitle: `${l.en} · ${l.region}`,
      icon: l.icon,
      haystack: normalize(`${l.name} ${l.en} ${l.region} ${l.tagline} ${l.desc} ${l.story}`)
    }));
    DATA.races.forEach((r) => items.push({
      key: `race:${r.id}`,
      type: 'نژاد',
      title: r.name,
      subtitle: `${r.en} · ${r.tagline}`,
      icon: r.icon,
      haystack: normalize(`${r.name} ${r.en} ${r.tagline} ${r.desc} ${r.traits.join(' ')} ${r.figures.join(' ')}`)
    }));
    DATA.artifacts.forEach((a) => items.push({
      key: `artifact:${a.id}`,
      type: 'گنجینه',
      title: a.name,
      subtitle: `${a.en} · ${a.owner}`,
      icon: a.icon,
      haystack: normalize(`${a.name} ${a.en} ${a.owner} ${a.desc} ${a.fate}`)
    }));
    DATA.books.forEach((b) => items.push({
      key: `book:${b.id}`,
      type: typeLabel[b.type],
      title: b.title,
      subtitle: `${b.en} · ${b.year}`,
      icon: b.icon,
      haystack: normalize(`${b.title} ${b.en} ${b.year} ${b.tag} ${b.meta} ${b.desc}`)
    }));
    DATA.gallery.forEach((g) => items.push({
      key: `gallery:${g.id}`,
      type: 'گالری',
      title: g.title,
      subtitle: g.en,
      icon: 'i-spark',
      haystack: normalize(`${g.title} ${g.en} ${g.desc}`)
    }));
    return items;
  }

  const searchIndex = buildSearchIndex();

  function searchRow(item, label) {
    return `<button class="search-result" type="button" data-search-key="${item.key}">
      <span class="search-result-icon">${icon(item.icon)}</span>
      <span class="search-result-text"><strong>${item.title}</strong><span>${item.subtitle}</span></span>
      <span class="search-type">${label || item.type}</span>
    </button>`;
  }

  function renderSearchResults(query) {
    const q = normalize(query);
    if (!q) {
      const suggestions = ['char:frodo', 'char:gandalf', 'loc:mordor', 'artifact:one-ring', 'book:silmarillion']
        .map((key) => searchIndex.find((item) => item.key === key))
        .filter(Boolean);
      searchResults.innerHTML = `<p class="search-group-title">پیشنهادهایی برای آغاز</p>${suggestions.map((item) => searchRow(item)).join('')}`;
      return;
    }
    const matches = searchIndex
      .filter((item) => item.haystack.includes(q))
      .sort((a, b) => {
        const at = normalize(a.title).startsWith(q) ? 0 : 1;
        const bt = normalize(b.title).startsWith(q) ? 0 : 1;
        return at - bt || a.title.localeCompare(b.title, 'fa');
      })
      .slice(0, 12);
    if (!matches.length) {
      searchResults.innerHTML = `<div class="search-empty">${icon('i-search')}در سرزمین میانه چیزی با «${query}» پیدا نشد. شاید با نام انگلیسی یا نام دیگر آن امتحان کنید.</div>`;
      return;
    }
    searchResults.innerHTML = `<p class="search-group-title">${faNum(matches.length)} نتیجه در سرزمین میانه</p>${matches.map((item) => searchRow(item)).join('')}`;
  }

  function handleSearchResult(key) {
    const [kind, id] = key.split(':');
    searchDialog.close();
    if (kind === 'char') {
      window.setTimeout(() => openCharacter(id), 120);
      return;
    }
    if (kind === 'loc') {
      scrollToSection('#map');
      window.setTimeout(() => selectLocation(id, false), 450);
      return;
    }
    if (kind === 'race') {
      scrollToSection('#races');
      window.setTimeout(() => flashElement(`[data-race="${id}"]`), 420);
      return;
    }
    if (kind === 'artifact') {
      scrollToSection('#artifacts');
      window.setTimeout(() => flashElement(`[data-artifact="${id}"]`), 420);
      return;
    }
    if (kind === 'book') {
      const book = DATA.books.find((b) => b.id === id);
      if (book && book.type !== state.bookTab) {
        state.bookTab = book.type;
        $$('#bookTabs .tab').forEach((t) => {
          const active = t.dataset.bookTab === book.type;
          t.classList.toggle('is-active', active);
          t.setAttribute('aria-selected', String(active));
        });
        renderBooks();
      }
      scrollToSection('#books');
      window.setTimeout(() => flashElement(`[data-book-id="${id}"]`), 460);
      return;
    }
    if (kind === 'gallery') {
      scrollToSection('#gallery');
      const index = DATA.gallery.findIndex((g) => g.id === id);
      window.setTimeout(() => openGallery(index), 480);
    }
  }

  function scrollToSection(selector) {
    const target = document.querySelector(selector);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function flashElement(selector) {
    const el = document.querySelector(selector);
    if (!el) return;
    el.classList.remove('flash');
    void el.offsetWidth;
    el.classList.add('flash');
    window.setTimeout(() => el.classList.remove('flash'), 1800);
  }

  function openSearch() {
    searchReturnFocus = document.activeElement;
    renderSearchResults('');
    openDialog(searchDialog);
    window.setTimeout(() => {
      searchInput.value = '';
      searchInput.focus();
    }, 30);
    searchInput.value = '';
  }

  function initSearch() {
    $('#searchOpen').addEventListener('click', openSearch);
    $('#searchClose').addEventListener('click', () => searchDialog.close());
    searchInput.addEventListener('input', () => renderSearchResults(searchInput.value));
    searchResults.addEventListener('click', (e) => {
      const result = e.target.closest('[data-search-key]');
      if (result) handleSearchResult(result.dataset.searchKey);
    });
    searchDialog.addEventListener('close', () => {
      if (searchReturnFocus && typeof searchReturnFocus.focus === 'function') {
        window.setTimeout(() => searchReturnFocus.focus(), 10);
      }
    });
    document.addEventListener('keydown', (e) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '');
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (!searchDialog.open) openSearch();
      } else if (e.key === '/' && !typing && !document.querySelector('dialog[open]')) {
        e.preventDefault();
        openSearch();
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /* Cursor glow                                                        */
  /* ------------------------------------------------------------------ */

  function initCursor() {
    if (!window.matchMedia('(pointer: fine)').matches) return;
    const glow = $('#cursorGlow');
    let raf = null;
    let x = 0;
    let y = 0;
    document.addEventListener('pointermove', (e) => {
      x = e.clientX;
      y = e.clientY;
      document.body.classList.add('has-cursor');
      if (raf) return;
      raf = requestAnimationFrame(() => {
        glow.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        raf = null;
      });
    }, { passive: true });
    document.addEventListener('pointerleave', () => document.body.classList.remove('has-cursor'));
  }

  /* ------------------------------------------------------------------ */
  /* Boot                                                               */
  /* ------------------------------------------------------------------ */

  function init() {
    initHeroCanvas();
    initMap();
    renderRaces();
    initCharacters();
    initTimeline();
    initBooks();
    renderArtifacts();
    renderLanguages();
    initGallery();
    initQuiz();
    initSearch();
    initDialogs();
    initCursor();
    initCounters();
    initReveals();
    observeReveals();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
