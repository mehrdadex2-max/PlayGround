import {
  TERRITORIES, TERRITORY_MAP, SIDES, FACTIONS, UNIT_INFO, BUILD_COSTS,
  VICTORY_REGIONS, adjacent
} from './data.js';
import {
  createGame, recruit, build, moveArmy, canAttack, simulateBattle,
  applyBattleResult, checkVictory, runAITurn, applyIncome, resetMoves,
  sideIncome, regionCount, armyCount, armyPower, otherSide, playerStats
} from './engine.js';
import { createMap } from './map.js';
import { sfx } from './audio.js';

const SAVE_KEY = 'wotr.save.v2';
const $ = selector => document.querySelector(selector);
const fa = n => String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const hud = $('#hud');
const panel = $('#panel');
const mapControls = $('#mapControls');
const intro = $('#intro');
const toasts = $('#toasts');
const turnBanner = $('#turnBanner');
const battleLayer = $('#battleLayer');
const dialogLayer = $('#dialogLayer');
const endLayer = $('#endLayer');
const playerCrest = $('#playerCrest');
const btnSound = $('#btnSound');
const btnEnd = $('#btnEnd');
const btnContinue = $('#btnContinue');

let state = createGame('free');
let selectedId = null;
let introSide = 'free';
let gameStarted = false;
let busy = false;
let endShown = false;
let battleState = null;
let bannerTimer = null;
let crestCounter = 0;

const map = createMap($('#map'), { onSelect: handleSelect });

/* ------------------------------------------------------------------ */
/* visuals                                                             */
/* ------------------------------------------------------------------ */

const UNIT_ICONS = {
  inf: '<path d="M12 2.2 19 5.3v5.6c0 4.2-3 7.1-7 9-4-1.9-7-4.8-7-9V5.3z"/>',
  arch: '<path d="M5 4c8 2 12 6 14 14M5 4v8.5A9.5 9.5 0 0 0 14.5 22M17 6.5l3-2.5M7.5 12.5 4 15.5"/>',
  cav: '<path d="M3 18c2.6.2 4.5-.6 6-2.3l2-2.2c.8-.9 2.1-.7 2.7.3l1.4 2.2H19l2 4h-3l-1.7-1.4H9.3L7 21H3z"/><path d="M10.5 12.6 8.8 8.2M16 12.9l2.2-3.6"/>',
  hero: '<path d="M12 2.3 14.8 8l6.5.9-4.7 4.5 1.2 6.4L12 16.8l-5.8 3 1.2-6.4L2.7 8.9 9.2 8z"/>'
};

function icon(type, cls = 'u-icon') {
  return `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${UNIT_ICONS[type] || ''}</svg>`;
}

function crestSvg(side) {
  const free = side === 'free';
  const id = `cg${++crestCounter}`;
  const frame = free ? '#c9a75c' : '#b4705f';
  const top = free ? '#253a4c' : '#3b1c17';
  const bottom = free ? '#0d1922' : '#190b08';
  const emblem = free
    ? `
      <path d="M32 59V32" stroke="#e4edf2" stroke-width="2.4" stroke-linecap="round"/>
      <path d="M32 45 22 36M32 40l10-9M32 34l-7-8M32 34l7-8" stroke="#d7e4ea" stroke-width="1.7" stroke-linecap="round" opacity=".9"/>
      <circle cx="22" cy="33" r="5" fill="#c9dfd0" opacity=".92"/>
      <circle cx="42" cy="28.5" r="5.4" fill="#c9dfd0" opacity=".92"/>
      <circle cx="32" cy="23" r="6" fill="#d7e6dc" opacity=".95"/>
      <circle cx="26" cy="20" r="4" fill="#c9dfd0" opacity=".9"/>
      <circle cx="39" cy="19" r="4.2" fill="#c9dfd0" opacity=".9"/>
      <path d="M19 62h26" stroke="#c9a75c" stroke-width="1.1" opacity=".55"/>`
    : `
      <path d="M14 38Q32 19 50 38Q32 57 14 38Z" fill="rgba(255,150,120,.08)" stroke="#e5a08c" stroke-width="1.6"/>
      <ellipse cx="32" cy="38" rx="6" ry="6.4" fill="#ff9b84" opacity=".9"/>
      <path d="M32 38c-1.4-3.2-1.4-6 0-8 1.4 2 1.4 4.8 0 8Z" fill="#2a0d09"/>
      <path d="M32 12v8M23.5 15l4 6.5M40.5 15l-4 6.5" stroke="#d99a82" stroke-width="1.6" stroke-linecap="round" opacity=".85"/>
      <path d="M19 62h26" stroke="#b4705f" stroke-width="1.1" opacity=".55"/>`;

  return `<svg viewBox="0 0 64 74" aria-hidden="true">
    <defs>
      <linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${top}"/>
        <stop offset="1" stop-color="${bottom}"/>
      </linearGradient>
    </defs>
    <path d="M32 3 58 12v24c0 18-12 30-26 35C18 66 6 54 6 36V12Z" fill="url(#${id})" stroke="${frame}" stroke-width="2"/>
    <path d="M32 8.5 53 15v20.6c0 15-10 25.3-21 29.6-11-4.3-21-14.6-21-29.6V15Z" fill="none" stroke="${frame}" stroke-width=".8" opacity=".45"/>
    ${emblem}
  </svg>`;
}

function paintCrests() {
  document.querySelectorAll('[data-crest]').forEach(el => {
    el.innerHTML = crestSvg(el.getAttribute('data-crest'));
  });
}

function syncSound() {
  btnSound.classList.toggle('muted', sfx.muted);
  btnSound.title = sfx.muted ? 'صدا خاموش' : 'صدا روشن';
}

function showToast(text, kind = '', duration = 3200) {
  const el = document.createElement('div');
  el.className = `toast ${kind}`.trim();
  el.textContent = text;
  toasts.appendChild(el);
  while (toasts.children.length > 4) toasts.firstElementChild.remove();
  setTimeout(() => {
    el.classList.add('leaving');
    setTimeout(() => el.remove(), 380);
  }, duration);
}

function showBanner(text, side) {
  const span = turnBanner.querySelector('span');
  span.textContent = text;
  turnBanner.className = 'turn-banner';
  void turnBanner.offsetWidth;
  turnBanner.classList.add('show', side === 'dark' ? 'dark' : 'free');
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => turnBanner.classList.remove('show'), 1800);
}

/* ------------------------------------------------------------------ */
/* persistence                                                         */
/* ------------------------------------------------------------------ */

function readSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    if (saved.version !== 1 || !saved.playerSide || !saved.territories) return null;
    for (const t of TERRITORIES) {
      if (!saved.territories[t.id]) return null;
    }
    if (saved.status !== 'playing') return null;
    return saved;
  } catch {
    return null;
  }
}

function saveGame() {
  try {
    if (gameStarted && state.status === 'playing' && state.active === state.playerSide) {
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    } else if (state.status !== 'playing') {
      localStorage.removeItem(SAVE_KEY);
    }
  } catch { }
}

/* ------------------------------------------------------------------ */
/* HUD + panel                                                         */
/* ------------------------------------------------------------------ */

function updateHUD() {
  const player = state.playerSide;
  const enemy = otherSide(player);
  const target = TERRITORY_MAP[SIDES[enemy].supreme].name;
  $('#playerFaction').textContent = SIDES[player].name;
  $('#hudGoal').textContent = `هدف: کنترل ${fa(VICTORY_REGIONS)} سرزمین یا تصرف ${target}`;
  $('#statTurn').textContent = fa(state.turn);
  $('#statGold').textContent = fa(state.gold[player]);
  $('#statIncome').textContent = `+${fa(sideIncome(state, player))}`;
  $('#statRegions').textContent = `${fa(regionCount(state, player))} / ${fa(VICTORY_REGIONS)}`;
  $('#endSub').textContent = state.active === player ? `نوبت ${SIDES[enemy].short}` : 'در حال اجرا…';
  btnEnd.disabled = busy || state.status !== 'playing' || state.active !== player;
  btnEnd.classList.toggle('pulse', !busy && state.status === 'playing' && state.active === player);
  playerCrest.innerHTML = crestSvg(player);
}

function targetsFor(id) {
  const t = state.territories[id];
  const empty = { ally: [], enemy: [] };
  if (!t || !gameStarted || busy || state.status !== 'playing') return empty;
  if (t.owner !== state.playerSide || state.active !== state.playerSide) return empty;
  if (t.moved || armyCount(t.units) === 0) return empty;
  for (const n of adjacent(id)) {
    if (state.territories[n].owner === state.playerSide) empty.ally.push(n);
    else empty.enemy.push(n);
  }
  return empty;
}

function renderAll() {
  if (!gameStarted) {
    map.render(state, { selectedId: null });
    return;
  }
  map.render(state, { selectedId, targets: targetsFor(selectedId) });
  updateHUD();
  renderPanel();
}

function ownerBadge(t) {
  if (t.owner === state.playerSide) return '<span class="badge ally">قلمرو شما</span>';
  return '<span class="badge enemy">قلمرو دشمن</span>';
}

function renderPanel() {
  if (!gameStarted || !selectedId) {
    panel.classList.add('is-hidden');
    panel.innerHTML = '';
    return;
  }
  const def = TERRITORY_MAP[selectedId];
  const t = state.territories[selectedId];
  if (!def || !t) { panel.classList.add('is-hidden'); return; }
  const faction = FACTIONS[t.faction] || FACTIONS.gondor;
  const player = state.playerSide;
  const isMine = t.owner === player;
  const canCommand = isMine && state.active === player && state.status === 'playing' && !busy;
  const total = armyCount(t.units);
  const keep = (def.capital || t.fort > 0 || t.barracks) ? 1 : 0;
  const fortBonus = t.fort > 0 ? `+${fa(Math.round(t.fort * 16))}٪ دفاع` : 'بدون استحکام';

  panel.style.setProperty('--faction', faction.color);
  panel.classList.remove('is-hidden');

  let recruitHTML = '';
  if (isMine && canCommand) {
    if (t.barracks) {
      const buttons = ['inf', 'arch', 'cav'].map(type => {
        const info = UNIT_INFO[type];
        const disabled = state.gold[player] < info.cost || t.recruits >= 3 || !canCommand;
        return `<button class="recruit-btn" type="button" data-act="recruit" data-type="${type}" ${disabled ? 'disabled' : ''}>
          ${icon(type)}
          <b>${info.name}</b>
          <span>${fa(info.cost)} طلا</span>
        </button>`;
      }).join('');
      recruitHTML = `<div class="p-section-title">استخدام نیرو <span style="margin-inline-start:auto;color:#8d816a;font-weight:600">${fa(t.recruits)} / ۳</span></div>
        <div class="recruit-grid">${buttons}</div>`;
    } else {
      recruitHTML = `<div class="p-hint"><b>پادگان ندارید.</b> برای استخدام نیرو، ابتدا در این سرزمین پادگان بسازید.</div>`;
    }
  }

  let buildHTML = '';
  if (isMine && canCommand && (!t.barracks || t.fort < 3)) {
    const items = [];
    if (!t.barracks) {
      items.push(`<button class="build-btn" type="button" data-act="build" data-what="barracks" ${state.gold[player] < BUILD_COSTS.barracks ? 'disabled' : ''}>
        <span>ساخت پادگان</span><small>${fa(BUILD_COSTS.barracks)} طلا</small></button>`);
    }
    if (t.fort < 3) {
      items.push(`<button class="build-btn" type="button" data-act="build" data-what="fort" ${state.gold[player] < BUILD_COSTS.fort ? 'disabled' : ''}>
        <span>تقویت استحکام</span><small>${fa(BUILD_COSTS.fort)} طلا</small></button>`);
    }
    buildHTML = `<div class="p-section-title">ساخت‌وساز</div><div class="build-grid">${items.join('')}</div>`;
  }

  let ordersHTML = '';
  if (isMine && canCommand) {
    if (total === 0) {
      ordersHTML = `<div class="p-hint"><b>ارتشی در این سرزمین نیست.</b> نیرو استخدام کنید یا از سرزمین مجاور کمک بفرستید.</div>`;
    } else if (t.moved) {
      ordersHTML = `<div class="p-hint"><b>این ارتش در این نوبت حرکت کرده است.</b> در نوبت بعد دوباره آماده فرمان خواهد بود.</div>`;
    } else {
      const actions = [];
      for (const n of adjacent(selectedId)) {
        const nd = TERRITORY_MAP[n];
        const nt = state.territories[n];
        const nUnits = armyCount(nt.units);
        if (nt.owner === player) {
          const canMove = total > keep;
          actions.push(`<button class="action-btn move" type="button" data-act="move" data-target="${n}" ${canMove ? '' : 'disabled'}>
            <span class="act-main"><b>حرکت به ${nd.name}</b><span>${FACTIONS[nt.faction].name} · ${fa(nUnits)} نیرو</span></span>
            <span class="act-side">${canMove ? 'حرکت' : 'گارد لازم'}</span>
          </button>`);
        } else {
          const defPower = armyPower(nt.units, nt.fort, true);
          actions.push(`<button class="action-btn attack" type="button" data-act="attack" data-target="${n}">
            <span class="act-main"><b>حمله به ${nd.name}</b><span>${FACTIONS[nt.faction].name} · ${fa(nUnits)} مدافع</span></span>
            <span class="act-side">دفاع ${fa(Math.round(defPower))}</span>
          </button>`);
        }
      }
      ordersHTML = `<div class="p-section-title">فرمان‌های ارتش</div><div class="action-list">${actions.join('') || '<div class="p-hint">سرزمین مجاوری برای حرکت وجود ندارد.</div>'}</div>`;
    }
  } else if (!isMine && canCommand) {
    const attackers = adjacent(selectedId)
      .filter(n => state.territories[n].owner === player && !state.territories[n].moved && armyCount(state.territories[n].units) > 0);
    if (attackers.length) {
      ordersHTML = `<div class="p-section-title">حمله به این سرزمین</div><div class="action-list">` +
        attackers.map(n => {
          const nd = TERRITORY_MAP[n];
          const nt = state.territories[n];
          return `<button class="action-btn attack" type="button" data-act="attack-from" data-from="${n}" data-target="${selectedId}">
            <span class="act-main"><b>حمله از ${nd.name}</b><span>${fa(armyCount(nt.units))} نیرو · قدرت ${fa(Math.round(armyPower(nt.units)))}</span></span>
            <span class="act-side">حمله</span>
          </button>`;
        }).join('') + '</div>';
    } else {
      ordersHTML = `<div class="p-hint">هیچ ارتش آماده‌ای در همسایگی این سرزمین نیست. ابتدا ارتشی را به یک سرزمین مجاور ببرید.</div>`;
    }
  } else if (isMine && !canCommand) {
    ordersHTML = `<div class="p-hint">${state.status !== 'playing' ? 'کمپین به پایان رسیده است.' : 'اکنون نوبت دشمن است. فرمان‌ها در نوبت شما فعال می‌شوند.'}</div>`;
  }

  const income = TERRITORY_MAP[selectedId].income;
  panel.innerHTML = `
    <div class="p-head" style="--faction:${faction.color}">
      <span class="p-head-crest crest small">${crestSvg(t.owner)}</span>
      <div class="p-head-text">
        <div class="p-title-row">
          <span class="p-name">${def.name}</span>
          ${def.capital ? '<span class="badge capital">پایتخت</span>' : ''}
          ${ownerBadge(t)}
        </div>
        <span class="p-faction">${faction.name} · ${SIDES[t.owner].name}</span>
      </div>
      <button class="p-close" type="button" data-panel-close aria-label="بستن">×</button>
    </div>
    <div class="p-body">
      <div class="p-stats">
        <div class="p-stat"><small>درآمد</small><b class="gold">${fa(income + (t.camp ? 1 : 0))}</b></div>
        <div class="p-stat"><small>استحکام</small><b class="green">${fa(t.fort)}</b></div>
        <div class="p-stat"><small>گارد</small><b class="${total ? '' : 'red'}">${fa(total)}</b></div>
      </div>
      ${ordersHTML}
      ${recruitHTML}
      ${buildHTML}
      <div class="p-section-title">ترکیب ارتش</div>
      <div class="unit-grid">
        ${Object.entries(UNIT_INFO).map(([type, info]) => {
          const count = t.units[type] || 0;
          return `<div class="unit-card ${count ? '' : 'empty'}">${icon(type)}<b class="u-count">${fa(count)}</b><span class="u-name">${info.short}</span></div>`;
        }).join('')}
      </div>
      <p class="p-desc">${def.desc}</p>
      <div class="p-hint"><b>${fortBonus}.</b> کمانداران در دفاع و سواره‌نظام در حمله برتری دارند. هر نوبت هر ارتش یک بار می‌تواند حرکت کند.</div>
    </div>`;
}

/* ------------------------------------------------------------------ */
/* player actions                                                      */
/* ------------------------------------------------------------------ */

function doRecruit(type) {
  const result = recruit(state, selectedId, type, state.playerSide);
  if (!result.ok) { showToast(result.reason, 'attack'); return; }
  sfx.coin();
  saveGame();
  renderAll();
  showToast(result.message, 'good');
}

function doBuild(what) {
  const result = build(state, selectedId, what, state.playerSide);
  if (!result.ok) { showToast(result.reason, 'attack'); return; }
  sfx.build();
  saveGame();
  renderAll();
  showToast(result.message, 'good');
}

function doMove(targetId) {
  const from = selectedId;
  const result = moveArmy(state, from, targetId, state.playerSide);
  if (!result.ok) { showToast(result.reason, 'attack'); return; }
  selectedId = targetId;
  sfx.move();
  saveGame();
  renderAll();
  map.arrow(from, targetId, '#9ad8ff');
  map.flash(targetId);
  showToast(result.message, 'good');
}

function doAttack(fromId, toId) {
  const check = canAttack(state, fromId, toId, state.playerSide);
  if (!check.ok) { showToast(check.reason, 'attack'); return; }
  const defender = state.territories[toId];
  if (armyCount(defender.units) === 0) {
    const result = simulateBattle(state, fromId, toId);
    applyBattleResult(state, result);
    selectedId = toId;
    sfx.horn();
    saveGame();
    renderAll();
    map.flash(toId);
    showToast(`${result.toName} بدون مقاومت سقوط کرد.`, 'good');
    checkEnd();
    return;
  }
  openBattle(fromId, toId);
}

function handleSelect(id) {
  if (!gameStarted || busy) return;
  if (!id) {
    if (selectedId) {
      selectedId = null;
      sfx.click();
      renderAll();
    }
    return;
  }
  sfx.select();
  selectedId = selectedId === id ? null : id;
  renderAll();
}

/* ------------------------------------------------------------------ */
/* battle                                                              */
/* ------------------------------------------------------------------ */

function armyPanelHTML(kind, side, territoryName, factionName, units, power, share, heroName) {
  const faction = FACTIONS[factionName] || FACTIONS.gondor;
  const rows = Object.entries(UNIT_INFO).map(([type, info]) => {
    const count = units[type] || 0;
    return `<div class="army-unit ${type === 'hero' ? 'hero' : ''}${count ? '' : ' dead'}" data-unit="${type}">
      ${icon(type)}
      <span>${type === 'hero' && heroName ? heroName : info.name}</span>
      <b>${fa(count)}</b>
    </div>`;
  }).join('');
  return `<div class="army-panel ${kind}" style="--army-color:${faction.color}">
    <div class="army-top">
      <span class="crest small">${crestSvg(side)}</span>
      <span>
        <span class="army-title">${kind === 'attacker' ? 'مهاجم' : 'مدافع'}</span><br>
        <span class="army-name">${territoryName} · ${factionName}</span>
      </span>
    </div>
    <div class="army-units">${rows}</div>
    <div class="army-power"><span>قدرت نبرد</span><b>${fa(Math.round(power))}</b></div>
    <div class="power-track"><i style="--w:${share.toFixed(1)}%"></i></div>
  </div>`;
}

function openBattle(fromId, toId) {
  const result = simulateBattle(state, fromId, toId);
  battleState = { result, resolved: false };
  const from = state.territories[fromId];
  const to = state.territories[toId];
  const fromDef = TERRITORY_MAP[fromId];
  const toDef = TERRITORY_MAP[toId];
  const totalPower = Math.max(1, result.atkPower + result.defPower);
  const atkShare = result.atkPower / totalPower * 100;
  const defShare = 100 - atkShare;
  const atkFaction = FACTIONS[from.faction].name;
  const defFaction = FACTIONS[to.faction].name;

  battleLayer.innerHTML = `<div class="modal-card battle-card" id="battleCard">
    <div class="battle-head">
      <div class="battle-kicker">نبرد سرنوشت‌ساز</div>
      <h2 class="battle-title">${toDef.name}</h2>
      <p class="battle-sub">${atkFaction} از ${fromDef.name} به ${defFaction} یورش می‌برد</p>
    </div>
    <div class="battle-body">
      <div class="battle-armies">
        ${armyPanelHTML('attacker', from.owner, fromDef.name, atkFaction, result.atkUnits, result.atkPower, atkShare, fromDef.heroName)}
        <div class="army-strike"><span class="strike-badge">نبرد</span></div>
        ${armyPanelHTML('defender', to.owner, toDef.name, defFaction, result.defUnits, result.defPower, defShare, toDef.heroName)}
      </div>
      <div class="battle-result" id="battleResult"></div>
      <div class="battle-actions" id="battleActions">
        <button class="btn-ghost" type="button" data-battle="retreat">عقب‌نشینی</button>
        <button class="btn-primary" type="button" data-battle="fight">شروع نبرد</button>
      </div>
    </div>
  </div>`;
  battleLayer.classList.remove('is-hidden');
  sfx.horn();
}

function updateBattleArmy(panelClass, units) {
  battleLayer.querySelectorAll(`.${panelClass} .army-unit`).forEach(row => {
    const type = row.getAttribute('data-unit');
    const count = units[type] || 0;
    const b = row.querySelector('b');
    if (b) b.textContent = fa(count);
    row.classList.toggle('dead', count === 0);
  });
}

function resolveBattleUI() {
  if (!battleState || battleState.resolved) return;
  battleState.resolved = true;
  const card = $('#battleCard');
  const result = battleState.result;
  card.classList.add('clash');
  sfx.sword();
  setTimeout(() => {
    card.classList.remove('clash');
    updateBattleArmy('attacker', result.atkSurvivors);
    updateBattleArmy('defender', result.defSurvivors);
    const win = result.attackerWon;
    const atkLost = result.atkArmy - armyCount(result.atkSurvivors);
    const defLost = result.defArmy - armyCount(result.defSurvivors);
    const resultEl = $('#battleResult');
    resultEl.innerHTML = `
      <div class="result-banner ${win ? 'win' : 'lose'}">${win ? `پیروزی — ${result.toName} تصرف شد` : `شکست — حمله به ${result.toName} دفع شد`}</div>
      <ul class="battle-log">${result.log.map(line => `<li>${line}</li>`).join('')}</ul>
      <div class="casualties">
        <span>تلفات مهاجم: <b>${fa(atkLost)}</b></span>
        <span>تلفات مدافع: <b>${fa(defLost)}</b></span>
      </div>`;
    resultEl.classList.add('show');
    $('#battleActions').innerHTML = '<button class="btn-primary" type="button" data-battle="continue">بازگشت به نقشه</button>';
    if (win) sfx.victory(); else sfx.defeat();
  }, 760);
}

function closeBattle() {
  battleLayer.classList.add('is-hidden');
  battleLayer.innerHTML = '';
  battleState = null;
}

function finishBattle(result) {
  applyBattleResult(state, result);
  selectedId = result.attackerWon ? result.toId : result.fromId;
  sfx.move();
  saveGame();
  renderAll();
  map.flash(result.attackerWon ? result.toId : result.fromId);
  showToast(result.attackerWon ? `${result.toName} به دست شما افتاد.` : `دفاع از ${result.toName} موفق بود.`, result.attackerWon ? 'good' : 'attack');
  checkEnd();
}

/* ------------------------------------------------------------------ */
/* turn flow                                                           */
/* ------------------------------------------------------------------ */

function handleAIAction(action) {
  if (action.type === 'attack') {
    const won = action.attackerWon;
    const text = won
      ? `${SIDES[action.attackerSide].short} ${action.toName} را تصرف کرد.`
      : `${action.toName} در برابر حمله ${SIDES[action.attackerSide].short} ایستاد.`;
    showToast(text, won ? 'attack' : 'good');
    sfx.sword();
    selectedId = null;
    map.flash(action.toId);
    if (won) map.flash(action.fromId);
  } else if (action.type === 'build') {
    showToast(action.result.message, 'attack');
    map.flash(action.id);
  } else if (action.type === 'move') {
    map.arrow(action.from, action.to, state.active === 'dark' ? '#ff9b84' : '#9ad8ff');
    map.flash(action.to);
  } else if (action.type === 'recruit') {
    map.flash(action.id);
  }
}

async function endTurn() {
  if (busy || state.status !== 'playing' || state.active !== state.playerSide) return;
  busy = true;
  selectedId = null;
  updateHUD();
  renderPanel();
  const enemy = otherSide(state.playerSide);
  state.active = enemy;
  applyIncome(state, enemy);
  resetMoves(state, enemy);
  renderAll();
  showBanner(`نوبت ${SIDES[enemy].name}`, enemy);
  showToast(`نوبت ${SIDES[enemy].name} آغاز شد.`, enemy === 'dark' ? 'attack' : 'good', 1800);
  sfx.horn();
  await sleep(700);

  await runAITurn(state, { delay: 450, onAction: handleAIAction });

  if (state.status === 'playing') {
    state.turn += 1;
    state.active = state.playerSide;
    applyIncome(state, state.playerSide);
    resetMoves(state, state.playerSide);
    busy = false;
    saveGame();
    renderAll();
    showBanner(`نوبت ${SIDES[state.playerSide].name}`, state.playerSide);
    showToast('درآمد جدید رسید و ارتش‌ها آماده فرمان‌اند.', 'gold', 2200);
    sfx.horn();
  } else {
    busy = false;
    saveGame();
    renderAll();
    checkEnd();
  }
}

function checkEnd() {
  checkVictory(state);
  if (state.status !== 'playing') {
    busy = false;
    selectedId = null;
    saveGame();
    renderAll();
    setTimeout(showEnd, 650);
    return true;
  }
  return false;
}

function showEnd() {
  if (endShown) return;
  endShown = true;
  const player = state.playerSide;
  const win = state.status === 'victory';
  const stats = playerStats(state);
  endLayer.innerHTML = `<div class="modal-card end-card ${win ? 'win' : 'lose'}">
    <div class="end-kicker">${win ? 'سرزمین میانه آزاد شد' : 'سایه همه‌جا را گرفت'}</div>
    <h2 class="end-title">${win ? 'پیروزی' : 'شکست'}</h2>
    <p class="end-reason">${state.reason}</p>
    <div class="end-stats">
      <div class="end-stat"><small>نوبت</small><b>${fa(state.turn)}</b></div>
      <div class="end-stat"><small>سرزمین</small><b>${fa(stats.regions)}</b></div>
      <div class="end-stat"><small>پیروزی نبرد</small><b>${fa(stats.wins)}</b></div>
    </div>
    <div class="modal-actions">
      <button class="btn-primary" type="button" data-end="again">کمپین تازه</button>
      <button class="btn-ghost" type="button" data-end="menu">صفحه آغاز</button>
    </div>
  </div>`;
  endLayer.classList.remove('is-hidden');
  if (win) sfx.victory(); else sfx.defeat();
}

/* ------------------------------------------------------------------ */
/* intro / help                                                        */
/* ------------------------------------------------------------------ */

function markIntroSide() {
  document.querySelectorAll('.side-card').forEach(card => {
    card.classList.toggle('selected', card.getAttribute('data-side') === introSide);
  });
}

function updateIntroAvailability() {
  const saved = readSave();
  btnContinue.classList.toggle('is-hidden', !saved);
  if (saved) introSide = saved.playerSide;
  markIntroSide();
  document.querySelectorAll('.side-card').forEach(card => {
    const side = card.getAttribute('data-side');
    const count = TERRITORIES.filter(t => t.side === side).length;
    const tag = card.querySelector('.side-card-tag');
    if (tag) tag.innerHTML = `${fa(count)} سرزمین <span class="side-card-cap">· پایتخت: ${TERRITORY_MAP[SIDES[side].supreme].name}</span>`;
  });
}

function hideIntro() {
  intro.classList.add('leaving');
  setTimeout(() => {
    intro.classList.add('is-hidden');
    document.body.classList.remove('intro-open');
  }, 420);
  hud.classList.remove('is-hidden');
  mapControls.classList.remove('is-hidden');
}

function showIntro() {
  document.body.classList.add('intro-open');
  intro.classList.remove('is-hidden', 'leaving');
  hud.classList.add('is-hidden');
  mapControls.classList.add('is-hidden');
  panel.classList.add('is-hidden');
  gameStarted = false;
  busy = false;
  selectedId = null;
  markIntroSide();
  updateIntroAvailability();
  map.render(state, { selectedId: null });
}

function startNewGame() {
  sfx.unlock();
  sfx.click();
  state = createGame(introSide);
  gameStarted = true;
  busy = false;
  endShown = false;
  selectedId = SIDES[introSide].supreme;
  hideIntro();
  map.start(SIDES[introSide].supreme);
  renderAll();
  saveGame();
  sfx.horn();
  showToast(`کمپین ${SIDES[introSide].name} آغاز شد.`, 'good');
}

function continueGame() {
  const saved = readSave();
  if (!saved) {
    showToast('کمپین ذخیره‌شده‌ای پیدا نشد.', 'attack');
    updateIntroAvailability();
    return;
  }
  state = saved;
  state.active = saved.playerSide;
  gameStarted = true;
  busy = false;
  endShown = false;
  introSide = saved.playerSide;
  selectedId = SIDES[saved.playerSide].supreme;
  hideIntro();
  map.start(SIDES[saved.playerSide].supreme);
  renderAll();
  sfx.horn();
  showToast('کمپین از آخرین وضعیت ادامه یافت.', 'good');
}

function openHelp() {
  sfx.click();
  dialogLayer.innerHTML = `<div class="modal-card">
    <button class="modal-close" type="button" data-dialog-close aria-label="بستن">×</button>
    <h2>راهنمای جنگ حلقه</h2>
    <p>یک کمپین نوبتی روی نقشه سرزمین میانه. هر سرزمین درآمد، استحکام و پادگان مخصوص خود را دارد.</p>
    <ul class="rules-list">
      <li><b>هدف:</b> کنترل ۲۱ سرزمین یا تصرف پایتخت دشمن. با تصرف میناس تیریث یا گورگوروت کمپین یک‌سره می‌شود.</li>
      <li><b>درآمد:</b> در آغاز نوبت شما، از هر سرزمین تحت کنترل طلا می‌گیرید. پایتخت‌ها درآمد بیشتری دارند.</li>
      <li><b>استخدام:</b> فقط در سرزمین‌های دارای پادگان می‌توانید نیرو بگیرید. هر پادگان در هر نوبت حداکثر ۳ نیرو می‌فرستد.</li>
      <li><b>حرکت:</b> هر ارتش در هر نوبت یک بار حرکت می‌کند. برای حمله، سرزمین دشمن را از یک سرزمین مجاور انتخاب کنید.</li>
      <li><b>نبرد:</b> ترکیب نیروها مهم است؛ کماندار در دفاع و سواره‌نظام در حمله برتری دارد. استحکامات قدرت مدافع را بالا می‌برد.</li>
      <li><b>ساخت‌وساز:</b> با طلا پادگان بسازید یا استحکام سرزمین را تا سطح ۳ بالا ببرید.</li>
      <li><b>کنترل نقشه:</b> با کشیدن انگشت جابه‌جا شوید، با دو انگشت یا دکمه‌ها بزرگ‌نمایی کنید و روی سرزمین‌ها بزنید.</li>
    </ul>
    <p style="margin-top:14px;font-size:10px;opacity:.7">این بازی یک پروژه مستقل و الهام‌گرفته از حالت War of the Ring است و به سازندگان بازی‌های اصلی وابسته نیست.</p>
    <div class="modal-actions"><button class="btn-primary" type="button" data-dialog-close>فهمیدم</button></div>
  </div>`;
  dialogLayer.classList.remove('is-hidden');
}

function closeHelp() {
  dialogLayer.classList.add('is-hidden');
  dialogLayer.innerHTML = '';
}

/* ------------------------------------------------------------------ */
/* events                                                              */
/* ------------------------------------------------------------------ */

panel.addEventListener('click', event => {
  if (event.target.closest('[data-panel-close]')) {
    selectedId = null;
    sfx.click();
    renderAll();
    return;
  }
  const btn = event.target.closest('[data-act]');
  if (!btn || btn.disabled) return;
  const act = btn.getAttribute('data-act');
  if (act === 'recruit') doRecruit(btn.getAttribute('data-type'));
  else if (act === 'build') doBuild(btn.getAttribute('data-what'));
  else if (act === 'move') doMove(btn.getAttribute('data-target'));
  else if (act === 'attack') doAttack(selectedId, btn.getAttribute('data-target'));
  else if (act === 'attack-from') doAttack(btn.getAttribute('data-from'), btn.getAttribute('data-target'));
});

battleLayer.addEventListener('click', event => {
  const btn = event.target.closest('[data-battle]');
  if (!btn) return;
  const act = btn.getAttribute('data-battle');
  if (act === 'fight') {
    resolveBattleUI();
  } else if (act === 'retreat') {
    sfx.click();
    closeBattle();
  } else if (act === 'continue') {
    const result = battleState?.result;
    closeBattle();
    if (result) finishBattle(result);
  }
});

dialogLayer.addEventListener('click', event => {
  if (event.target === dialogLayer || event.target.closest('[data-dialog-close]')) closeHelp();
});

endLayer.addEventListener('click', event => {
  const btn = event.target.closest('[data-end]');
  if (!btn) return;
  const act = btn.getAttribute('data-end');
  endLayer.classList.add('is-hidden');
  endLayer.innerHTML = '';
  endShown = false;
  if (act === 'again') {
    state = createGame(state.playerSide);
    gameStarted = true;
    busy = false;
    selectedId = SIDES[state.playerSide].supreme;
    map.start(SIDES[state.playerSide].supreme);
    renderAll();
    saveGame();
    showBanner('کمپین تازه', state.playerSide);
  } else if (act === 'menu') {
    const side = state.playerSide;
    state = createGame(side);
    introSide = side;
    showIntro();
  }
});

$('#btnStart').addEventListener('click', startNewGame);
btnContinue.addEventListener('click', continueGame);
$('#btnIntroHelp').addEventListener('click', openHelp);
$('#btnHelp').addEventListener('click', openHelp);
btnSound.addEventListener('click', () => {
  sfx.setMuted(!sfx.muted);
  syncSound();
  sfx.click();
});
btnEnd.addEventListener('click', () => {
  sfx.click();
  endTurn();
});
$('#zoomIn').addEventListener('click', () => { sfx.click(); map.zoomIn(); });
$('#zoomOut').addEventListener('click', () => { sfx.click(); map.zoomOut(); });
$('#zoomFit').addEventListener('click', () => { sfx.click(); map.reset(); });

document.querySelectorAll('.side-card').forEach(card => {
  card.addEventListener('click', () => {
    introSide = card.getAttribute('data-side');
    sfx.click();
    markIntroSide();
  });
});

window.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    if (!dialogLayer.classList.contains('is-hidden')) closeHelp();
    else if (!battleLayer.classList.contains('is-hidden') && !battleState?.resolved) closeBattle();
  }
});

window.addEventListener('beforeunload', saveGame);
document.addEventListener('visibilitychange', () => { if (document.hidden) saveGame(); });

/* ------------------------------------------------------------------ */
/* boot                                                                */
/* ------------------------------------------------------------------ */

const saved = readSave();
state = saved || createGame('free');
introSide = saved?.playerSide || 'free';
paintCrests();
markIntroSide();
updateIntroAvailability();
syncSound();
map.render(state, { selectedId: null });
updateHUD();
