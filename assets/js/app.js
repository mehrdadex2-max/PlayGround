(function () {
  "use strict";

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

  const toPersian = (value) => String(value).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);
  const icon = (name, cls = "") =>
    `<svg class="${cls}" aria-hidden="true"><use href="#i-${name}"></use></svg>`;
  const normalize = (text) =>
    String(text || "")
      .toLowerCase()
      .replace(/[يى]/g, "ی")
      .replace(/ك/g, "ک")
      .replace(/[\u064B-\u065F\u200c]/g, "")
      .replace(/\s+/g, " ")
      .trim();

  const state = {
    charFilter: "همه",
    charQuery: "",
    bookFilter: "همه",
    activeRegion: "shire",
    activeRace: RACES[0].id,
    quoteIndex: 0,
    quoteTimer: null,
    lastFocus: null,
    searchResults: [],
    searchFocus: -1
  };

  /* ---------- Decorative embers ---------- */
  function buildEmbers() {
    const field = $("#emberField");
    if (!field || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < 26; i += 1) {
      const ember = document.createElement("span");
      ember.className = "ember";
      ember.style.left = `${Math.random() * 100}%`;
      ember.style.setProperty("--dx", `${(Math.random() - 0.5) * 160}px`);
      ember.style.animationDuration = `${9 + Math.random() * 12}s`;
      ember.style.animationDelay = `${Math.random() * 12}s`;
      const size = 1.5 + Math.random() * 2.5;
      ember.style.width = `${size}px`;
      ember.style.height = `${size}px`;
      fragment.appendChild(ember);
    }
    field.appendChild(fragment);
  }

  /* ---------- Header, progress, nav ---------- */
  function setupChrome() {
    const header = $("#siteHeader");
    const progress = $("#scrollProgress");
    const backTop = $("#backTop");
    const glow = $("#cursorGlow");

    const onScroll = () => {
      const y = window.scrollY || document.documentElement.scrollTop;
      header.classList.toggle("scrolled", y > 30);
      backTop.classList.toggle("show", y > 700);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.width = `${max > 0 ? Math.min(100, (y / max) * 100) : 0}%`;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    backTop.addEventListener("click", () =>
      window.scrollTo({ top: 0, behavior: "smooth" })
    );

    const menuBtn = $("#menuBtn");
    const mobileNav = $("#mobileNav");
    menuBtn.addEventListener("click", () => {
      const open = header.classList.toggle("nav-open");
      menuBtn.setAttribute("aria-expanded", String(open));
      menuBtn.setAttribute("aria-label", open ? "بستن منو" : "باز کردن منو");
    });
    const closeMenu = () => {
      header.classList.remove("nav-open");
      menuBtn.setAttribute("aria-expanded", "false");
      menuBtn.setAttribute("aria-label", "باز کردن منو");
    };
    $$("a", mobileNav).forEach((link) =>
      link.addEventListener("click", closeMenu)
    );
    document.addEventListener("click", (event) => {
      if (header.classList.contains("nav-open") && !event.target.closest("#siteHeader")) {
        closeMenu();
      }
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeMenu();
    });

    if (window.matchMedia("(pointer: fine)").matches) {
      document.body.classList.add("has-pointer");
      window.addEventListener(
        "pointermove",
        (event) => {
          glow.style.left = `${event.clientX}px`;
          glow.style.top = `${event.clientY}px`;
        },
        { passive: true }
      );
    }

    const sections = $$("main section[id]");
    const navLinks = $$(".main-nav a");
    if ("IntersectionObserver" in window) {
      const activeObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            navLinks.forEach((link) =>
              link.classList.toggle(
                "active",
                link.getAttribute("href") === `#${entry.target.id}`
              )
            );
          });
        },
        { rootMargin: "-40% 0px -55% 0px", threshold: 0 }
      );
      sections.forEach((section) => activeObserver.observe(section));
    }
  }

  /* ---------- Reveal on scroll ---------- */
  function setupReveal() {
    const elements = $$(".reveal");
    if (!("IntersectionObserver" in window)) {
      elements.forEach((el) => el.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          obs.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    elements.forEach((el) => observer.observe(el));
  }

  /* ---------- Animated counters ---------- */
  function setupCounters() {
    const counters = $$(".stat-num");
    if (!counters.length) return;
    const animate = (el) => {
      const target = Number(el.dataset.count || 0);
      const duration = 1400;
      const start = performance.now();
      const tick = (now) => {
        const progress = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = toPersian(Math.round(target * eased));
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    if (!("IntersectionObserver" in window)) {
      counters.forEach(animate);
      return;
    }
    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          animate(entry.target);
          obs.unobserve(entry.target);
        });
      },
      { threshold: 0.6 }
    );
    counters.forEach((counter) => observer.observe(counter));
  }

  /* ---------- Map ---------- */
  function renderMap() {
    const wrap = $("#mapHotspots");
    const panel = $("#mapPanel");
    if (!wrap || !panel) return;

    wrap.innerHTML = REGIONS.map(
      (region) => `
      <button class="hotspot ${region.id === state.activeRegion ? "active" : ""}"
        style="--x:${region.x};--y:${region.y}"
        data-region="${region.id}"
        aria-label="${region.name}">
        <span>${region.name}</span>
      </button>`
    ).join("");

    const panelHTML = (region) => `
      <div class="map-panel-icon">${icon(region.icon)}</div>
      <span class="map-panel-type">${region.type}</span>
      <h3>${region.name}</h3>
      <p class="map-panel-en">${region.en}</p>
      <p>${region.desc}</p>
      <ul class="map-details">${region.details.map((d) => `<li>${d}</li>`).join("")}</ul>
      <p class="race-sub">چهره‌های شاخص</p>
      <div class="map-people">${region.people.map((p) => `<span>${p}</span>`).join("")}</div>
      <p class="map-note">${region.note}</p>`;

    const select = (id) => {
      const region = REGIONS.find((r) => r.id === id);
      if (!region) return;
      state.activeRegion = id;
      $$(".hotspot", wrap).forEach((btn) =>
        btn.classList.toggle("active", btn.dataset.region === id)
      );
      panel.classList.add("switching");
      window.setTimeout(() => {
        panel.innerHTML = panelHTML(region);
        panel.classList.remove("switching");
      }, 170);
    };

    panel.innerHTML = panelHTML(REGIONS.find((r) => r.id === state.activeRegion));
    wrap.addEventListener("click", (event) => {
      const btn = event.target.closest(".hotspot");
      if (btn) select(btn.dataset.region);
    });
    window.selectRegion = select;
  }

  /* ---------- Characters ---------- */
  const charFilters = ["همه", "یاران حلقه", "هابیت‌ها", "الف‌ها", "دورف‌ها", "انسان‌ها", "جادوگران", "تاریکی"];

  function renderCharacterFilters() {
    const wrap = $("#charFilters");
    if (!wrap) return;
    wrap.innerHTML = charFilters
      .map(
        (filter) => `
        <button class="chip ${filter === state.charFilter ? "active" : ""}" data-filter="${filter}">
          ${filter}
        </button>`
      )
      .join("");
    wrap.addEventListener("click", (event) => {
      const btn = event.target.closest(".chip");
      if (!btn) return;
      state.charFilter = btn.dataset.filter;
      $$(".chip", wrap).forEach((chip) =>
        chip.classList.toggle("active", chip === btn)
      );
      applyCharacterFilter();
    });
  }

  function renderCharacters() {
    const grid = $("#characterGrid");
    if (!grid) return;
    grid.innerHTML = CHARACTERS.map(
      (char) => `
      <button class="char-card" data-char="${char.id}" style="--c:${char.color}" aria-label="داستان ${char.name}">
        <div class="char-portrait">
          <span class="char-initial" aria-hidden="true">${char.en.charAt(0)}</span>
          ${icon(char.icon)}
        </div>
        <div class="char-body">
          <span class="char-race">${char.race}</span>
          <h3>${char.name}</h3>
          <p class="char-en">${char.en}</p>
          <p class="char-epithet">${char.epithet}</p>
          <p class="char-short">${char.short}</p>
          <div class="char-more"><span>خواندن داستان</span>${icon("arrow")}</div>
        </div>
      </button>`
    ).join("");
    grid.addEventListener("click", (event) => {
      const card = event.target.closest(".char-card");
      if (card) openCharacter(card.dataset.char);
    });
    applyCharacterFilter();
  }

  function applyCharacterFilter() {
    const grid = $("#characterGrid");
    const empty = $("#charEmpty");
    if (!grid) return;
    const query = normalize(state.charQuery);
    let visible = 0;
    $$(".char-card", grid).forEach((card) => {
      const char = CHARACTERS.find((c) => c.id === card.dataset.char);
      if (!char) return;
      const matchesFilter =
        state.charFilter === "همه" || char.tags.includes(state.charFilter);
      const haystack = normalize(
        `${char.name} ${char.en} ${char.epithet} ${char.race} ${char.tags.join(" ")} ${char.short}`
      );
      const matchesQuery = !query || haystack.includes(query);
      const show = matchesFilter && matchesQuery;
      card.classList.toggle("is-hidden", !show);
      if (show) visible += 1;
    });
    if (empty) empty.hidden = visible > 0;
  }

  function setupCharSearch() {
    const input = $("#charSearch");
    if (!input) return;
    input.addEventListener("input", () => {
      state.charQuery = input.value;
      applyCharacterFilter();
    });
  }

  /* ---------- Character modal ---------- */
  function openCharacter(id) {
    const char = CHARACTERS.find((c) => c.id === id);
    if (!char) return;
    const modal = $("#charModal");
    const body = $("#modalBody");
    if (!modal || !body) return;
    state.lastFocus = document.activeElement;
    body.innerHTML = `
      <div class="modal-portrait" style="--c:${char.color}">
        ${icon(char.icon)}
        <span class="modal-initial">${char.en}</span>
        <span class="modal-race">${char.race}</span>
      </div>
      <div class="modal-content">
        <h2 id="modalName">${char.name}</h2>
        <p class="modal-en">${char.en}</p>
        <span class="modal-epithet">${char.epithet}</span>
        <p>${char.long}</p>
        <blockquote class="modal-quote">«${char.quote}»</blockquote>
        <div class="modal-facts">
          ${Object.entries(char.facts)
            .map(
              ([key, value]) =>
                `<div><dt>${key}</dt><dd>${value}</dd></div>`
            )
            .join("")}
        </div>
        <p class="modal-label">پیوندها</p>
        <div class="modal-rel">
          ${char.relations
            .map((name) => {
              const related = CHARACTERS.find(
                (c) => c.name === name || c.name.includes(name) || name.includes(c.name)
              );
              return related
                ? `<button data-char="${related.id}">${name}</button>`
                : `<button disabled style="opacity:.55;cursor:default">${name}</button>`;
            })
            .join("")}
        </div>
      </div>`;
    body.querySelectorAll("[data-char]").forEach((btn) =>
      btn.addEventListener("click", () => openCharacter(btn.dataset.char))
    );
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    window.setTimeout(() => {
      const close = $(".modal-close", modal);
      if (close) close.focus();
    }, 60);
  }

  function closeCharacter() {
    const modal = $("#charModal");
    if (!modal || !modal.classList.contains("open")) return;
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    if (!$("#searchOverlay").classList.contains("open")) {
      document.body.style.overflow = "";
    }
    if (state.lastFocus && state.lastFocus.focus) state.lastFocus.focus();
  }

  function setupModal() {
    const modal = $("#charModal");
    if (!modal) return;
    modal.addEventListener("click", (event) => {
      if (event.target.closest("[data-close-modal]")) closeCharacter();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeCharacter();
        closeSearch();
      }
    });
  }

  /* ---------- Races ---------- */
  function renderRaceTabs() {
    const tabs = $("#raceTabs");
    if (!tabs) return;
    tabs.innerHTML = RACES.map(
      (race) => `
      <button class="race-tab ${race.id === state.activeRace ? "active" : ""}"
        role="tab" aria-selected="${race.id === state.activeRace}" data-race="${race.id}">
        ${icon(race.icon)} ${race.name}
      </button>`
    ).join("");
    tabs.addEventListener("click", (event) => {
      const btn = event.target.closest(".race-tab");
      if (!btn) return;
      state.activeRace = btn.dataset.race;
      $$(".race-tab", tabs).forEach((tab) =>
        tab.classList.toggle("active", tab === btn)
      );
      renderRacePanel();
    });
    renderRacePanel();
  }

  function renderRacePanel() {
    const panel = $("#racePanel");
    if (!panel) return;
    const race = RACES.find((r) => r.id === state.activeRace) || RACES[0];
    const figureHTML = race.figures
      .map((name) => {
        const char = CHARACTERS.find(
          (c) => c.name === name || c.name.includes(name) || name.includes(c.name)
        );
        return char
          ? `<button data-char="${char.id}">${name}</button>`
          : `<span class="figure-static">${name}</span>`;
      })
      .join("");
    panel.style.setProperty("--c", race.color);
    panel.innerHTML = `
      <div class="race-visual">
        <div class="race-glyph">${icon(race.icon)}</div>
        <span class="race-runes">${race.en.toUpperCase()}</span>
      </div>
      <div class="race-content">
        <h3>${race.name}</h3>
        <p class="race-en">${race.en}</p>
        <p class="race-desc">${race.desc}</p>
        <p class="race-sub">ویژگی‌ها</p>
        <div class="race-traits">${race.traits.map((t) => `<span>${t}</span>`).join("")}</div>
        <p class="race-sub">چهره‌های شناخته‌شده</p>
        <div class="race-figures">${figureHTML}</div>
        <p class="race-book"><strong>منبع اصلی:</strong> ${race.book}</p>
      </div>`;
    panel.querySelectorAll("[data-char]").forEach((btn) =>
      btn.addEventListener("click", () => openCharacter(btn.dataset.char))
    );
  }

  /* ---------- Artifacts ---------- */
  function renderArtifacts() {
    const grid = $("#artifactGrid");
    if (!grid) return;
    grid.innerHTML = ARTIFACTS.map(
      (artifact) => `
      <article class="artifact-card">
        <div class="artifact-top">
          <div class="artifact-icon">${icon(artifact.icon)}</div>
          <span class="artifact-type">${artifact.type}</span>
        </div>
        <h3>${artifact.name}</h3>
        <p class="artifact-en">${artifact.en}</p>
        <p class="artifact-desc">${artifact.desc}</p>
        <dl class="artifact-meta">
          <div><dt>نیرو:</dt><dd>${artifact.power}</dd></div>
          <div><dt>حامل:</dt><dd>${artifact.owner}</dd></div>
          <div><dt>سرنوشت:</dt><dd>${artifact.fate}</dd></div>
        </dl>
      </article>`
    ).join("");

    const ledger = $("#ringLedger");
    if (ledger) {
      ledger.innerHTML = RING_LORE.map(
        (ring) => `
        <article class="ledger-card" style="--c:${ring.color}">
          <span class="ledger-count">${ring.count}</span>
          <div class="ledger-icon">${icon(ring.icon)}</div>
          <h4>${ring.name}</h4>
          <p class="ledger-en">${ring.en}</p>
          <p class="ledger-desc">${ring.desc}</p>
          <span class="ledger-owner">حاملان: ${ring.owners}</span>
        </article>`
      ).join("");
    }

    const track = $("#journeyTrack");
    if (track) {
      track.innerHTML = JOURNEY.map(
        (step, index) => `
        <li class="journey-step">
          <span class="journey-dot">${icon(step.icon)}</span>
          <h4>${step.name}</h4>
          <span>${step.en}</span>
          <p>${step.desc}</p>
        </li>`
      ).join("");
    }
  }

  /* ---------- Books ---------- */
  function renderBookFilters() {
    const wrap = $("#bookFilters");
    if (!wrap) return;
    const filters = ["همه", "اصلی", "افسانه‌ها", "پژوهشی"];
    wrap.innerHTML = filters
      .map(
        (filter) => `
        <button class="chip ${filter === state.bookFilter ? "active" : ""}" data-filter="${filter}">
          ${filter}
        </button>`
      )
      .join("");
    wrap.addEventListener("click", (event) => {
      const btn = event.target.closest(".chip");
      if (!btn) return;
      state.bookFilter = btn.dataset.filter;
      $$(".chip", wrap).forEach((chip) =>
        chip.classList.toggle("active", chip === btn)
      );
      applyBookFilter();
    });
  }

  function renderBooks() {
    const grid = $("#bookGrid");
    if (!grid) return;
    grid.innerHTML = BOOKS.map(
      (book) => `
      <article class="book-card" data-category="${book.category}" style="--cover:${book.color}">
        <div class="book-cover">
          ${icon("ring", "cover-mark")}
          <strong>${book.title}</strong>
          <small>${book.en}</small>
          <span class="cover-author">J.R.R. TOLKIEN</span>
        </div>
        <div class="book-info">
          <div class="book-top">
            <span class="book-cat">${book.category}</span>
            <span class="book-order">${book.order}</span>
          </div>
          <h3>${book.title}</h3>
          <p class="book-en">${book.en}</p>
          <p class="book-desc">${book.desc}</p>
          <div class="book-meta">
            <span>سال نشر: <strong>${book.year}</strong></span>
            <span>صفحه: <strong>${book.pages}</strong></span>
          </div>
        </div>
      </article>`
    ).join("");
    applyBookFilter();
  }

  function applyBookFilter() {
    $$("#bookGrid .book-card").forEach((card) => {
      const show =
        state.bookFilter === "همه" || card.dataset.category === state.bookFilter;
      card.classList.toggle("is-hidden", !show);
    });
  }

  /* ---------- Films ---------- */
  function renderFilms() {
    const grid = $("#filmGrid");
    if (!grid) return;
    grid.innerHTML = FILMS.map(
      (film) => `
      <article class="film-card" style="--accent:${film.accent}">
        <div class="film-poster">
          <span class="film-label">${film.label}</span>
          <span class="film-roman">${film.roman}</span>
          <span class="film-year">${film.year}</span>
        </div>
        <div class="film-body">
          <h3>${film.title}</h3>
          <p class="film-en">${film.en}</p>
          <p class="film-note">${film.note}</p>
          <div class="film-meta">
            <span>کارگردان: <strong>${film.director}</strong></span>
            <span>مدت: <strong>${film.runtime}</strong></span>
          </div>
          <span class="film-award">${icon("star")} ${film.awards}</span>
        </div>
      </article>`
    ).join("");
  }

  /* ---------- Quotes ---------- */
  function renderQuotes() {
    const textEl = $("#quoteText");
    const authorEl = $("#quoteAuthor");
    const dots = $("#quoteDots");
    if (!textEl || !authorEl || !dots) return;

    const show = (index, userInitiated = false) => {
      state.quoteIndex = (index + QUOTES.length) % QUOTES.length;
      const quote = QUOTES[state.quoteIndex];
      textEl.classList.add("fading");
      authorEl.style.opacity = "0";
      window.setTimeout(() => {
        textEl.textContent = quote.text;
        authorEl.textContent = quote.author;
        textEl.classList.remove("fading");
        authorEl.style.opacity = "1";
      }, 320);
      $$("button", dots).forEach((dot, i) =>
        dot.classList.toggle("active", i === state.quoteIndex)
      );
      if (userInitiated) restartQuoteTimer();
    };

    dots.innerHTML = QUOTES.map(
      (_, i) =>
        `<button data-quote="${i}" role="tab" aria-label="نقل‌قول ${toPersian(i + 1)}" class="${i === 0 ? "active" : ""}"></button>`
    ).join("");
    dots.addEventListener("click", (event) => {
      const btn = event.target.closest("button");
      if (btn) show(Number(btn.dataset.quote), true);
    });

    const restartQuoteTimer = () => {
      window.clearInterval(state.quoteTimer);
      state.quoteTimer = window.setInterval(
        () => show(state.quoteIndex + 1),
        7000
      );
    };

    const section = $(".quote-section");
    section.addEventListener("mouseenter", () => window.clearInterval(state.quoteTimer));
    section.addEventListener("mouseleave", restartQuoteTimer);
    restartQuoteTimer();
  }

  /* ---------- FAQ ---------- */
  function renderFAQ() {
    const list = $("#faqList");
    if (!list) return;
    list.innerHTML = FAQ.map(
      (item, index) => `
      <div class="faq-item">
        <button class="faq-question" aria-expanded="false" aria-controls="faq-answer-${index}">
          <span>${item.q}</span>
          <span class="faq-icon" aria-hidden="true"></span>
        </button>
        <div class="faq-answer" id="faq-answer-${index}">
          <p>${item.a}</p>
        </div>
      </div>`
    ).join("");
    list.addEventListener("click", (event) => {
      const button = event.target.closest(".faq-question");
      if (!button) return;
      const item = button.closest(".faq-item");
      const answer = $(".faq-answer", item);
      const isOpen = item.classList.contains("open");
      $$(".faq-item", list).forEach((other) => {
        other.classList.remove("open");
        $(".faq-question", other).setAttribute("aria-expanded", "false");
        $(".faq-answer", other).style.maxHeight = null;
      });
      if (!isOpen) {
        item.classList.add("open");
        button.setAttribute("aria-expanded", "true");
        answer.style.maxHeight = `${answer.scrollHeight}px`;
      }
    });
  }

  /* ---------- Global search ---------- */
  function openSearch() {
    const overlay = $("#searchOverlay");
    if (!overlay) return;
    state.lastFocus = document.activeElement;
    overlay.classList.add("open");
    overlay.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    const input = $("#globalSearch");
    window.setTimeout(() => input.focus(), 80);
  }

  function closeSearch() {
    const overlay = $("#searchOverlay");
    if (!overlay || !overlay.classList.contains("open")) return;
    overlay.classList.remove("open");
    overlay.setAttribute("aria-hidden", "true");
    if (!$("#charModal").classList.contains("open")) {
      document.body.style.overflow = "";
    }
    if (state.lastFocus && state.lastFocus.focus) state.lastFocus.focus();
    const input = $("#globalSearch");
    if (input) input.value = "";
    renderSearchResults("");
  }

  const searchTypeOrder = ["شخصیت", "سرزمین", "نژاد", "اثر", "کتاب"];

  function renderSearchResults(query) {
    const wrap = $("#searchResults");
    if (!wrap) return;
    const q = normalize(query);
    if (!q) {
      wrap.innerHTML =
        '<p class="search-hint">برای شروع، نامی بنویسید؛ مثلاً «گندالف» یا «موردور».</p>';
      state.searchResults = [];
      state.searchFocus = -1;
      return;
    }
    const results = SEARCH_INDEX.filter((item) =>
      normalize(`${item.title} ${item.sub}`).includes(q)
    ).slice(0, 16);
    state.searchResults = results;
    state.searchFocus = -1;
    if (!results.length) {
      wrap.innerHTML = `<p class="search-hint">چیزی با «${query}» پیدا نشد. نام دیگری را امتحان کنید.</p>`;
      return;
    }
    let html = "";
    searchTypeOrder.forEach((type) => {
      const group = results.filter((r) => r.type === type);
      if (!group.length) return;
      html += `<p class="search-group-title">${type}</p>`;
      group.forEach((result) => {
        const index = results.indexOf(result);
        html += `
          <button class="search-result" data-index="${index}" style="--c:${result.color}">
            <span class="search-result-icon">${icon(result.icon)}</span>
            <span class="search-result-info"><strong>${result.title}</strong><small>${result.sub || ""}</small></span>
            <span class="search-result-type">${result.type}</span>
          </button>`;
      });
    });
    wrap.innerHTML = html;
    wrap.querySelectorAll(".search-result").forEach((btn) =>
      btn.addEventListener("click", () => activateSearchResult(Number(btn.dataset.index)))
    );
  }

  function activateSearchResult(index) {
    const result = state.searchResults[index];
    if (!result) return;
    if (result.target.startsWith("char:")) {
      closeSearch();
      openCharacter(result.target.split(":")[1]);
    } else if (result.target.startsWith("region:")) {
      closeSearch();
      const id = result.target.split(":")[1];
      document.querySelector("#map").scrollIntoView({ behavior: "smooth" });
      if (window.selectRegion) window.selectRegion(id);
    } else {
      closeSearch();
      const target = document.getElementById(result.target);
      if (target) target.scrollIntoView({ behavior: "smooth" });
    }
  }

  function setupSearch() {
    const openBtn = $("#searchOpen");
    const overlay = $("#searchOverlay");
    const input = $("#globalSearch");
    if (!openBtn || !overlay || !input) return;

    openBtn.addEventListener("click", openSearch);
    overlay.addEventListener("click", (event) => {
      if (event.target.closest("[data-close-search]")) closeSearch();
    });
    input.addEventListener("input", () => renderSearchResults(input.value));
    input.addEventListener("keydown", (event) => {
      const items = $$(".search-result", overlay);
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        if (!items.length) return;
        state.searchFocus =
          (state.searchFocus + (event.key === "ArrowDown" ? 1 : -1) + items.length) %
          items.length;
        items.forEach((item, i) =>
          item.classList.toggle("focused", i === state.searchFocus)
        );
        items[state.searchFocus].scrollIntoView({ block: "nearest" });
      } else if (event.key === "Enter") {
        const index =
          state.searchFocus >= 0
            ? Number(items[state.searchFocus].dataset.index)
            : state.searchResults.length
            ? 0
            : -1;
        if (index >= 0) activateSearchResult(index);
      }
    });

    document.addEventListener("keydown", (event) => {
      const tag = document.activeElement.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA";
      if ((event.key === "/" && !typing) || ((event.ctrlKey || event.metaKey) && event.key === "k")) {
        event.preventDefault();
        openSearch();
      }
    });
  }

  /* ---------- Newsletter ---------- */
  function setupNewsletter() {
    const form = $("#newsletterForm");
    const note = $("#formNote");
    const input = $("#emailInput");
    if (!form || !note || !input) return;
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const value = input.value.trim();
      const valid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
      if (!valid) {
        note.textContent = "لطفاً یک نشانی ایمیل معتبر وارد کنید.";
        note.classList.add("error");
        input.focus();
        return;
      }
      note.classList.remove("error");
      note.textContent = "نام شما در دفتر سرزمین میانه ثبت شد. به‌زودی نامه می‌رسد.";
      input.value = "";
      showToast("عضویت شما ثبت شد؛ خوش آمدید به سرزمین میانه.");
    });
  }

  let toastTimer = null;
  function showToast(message) {
    const toast = $("#toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove("show"), 3600);
  }

  /* ---------- Init ---------- */
  function init() {
    buildEmbers();
    setupChrome();
    renderMap();
    renderCharacterFilters();
    renderCharacters();
    setupCharSearch();
    setupModal();
    renderRaceTabs();
    renderArtifacts();
    renderBookFilters();
    renderBooks();
    renderFilms();
    renderQuotes();
    renderFAQ();
    setupSearch();
    setupNewsletter();
    setupReveal();
    setupCounters();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
