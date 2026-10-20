import { TERRITORIES, TERRITORY_MAP, FACTIONS } from './data.js';

const W = 1000;
const H = 780;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3.6;

const LAND_PATH = 'M 305 68 C 380 32 505 36 610 54 C 712 72 792 108 838 172 C 870 218 880 278 888 338 C 898 410 896 492 876 566 C 858 634 822 706 772 748 C 716 794 640 776 574 762 C 520 751 480 760 430 768 C 362 779 288 744 240 694 C 194 646 158 578 137 508 C 110 426 94 344 99 268 C 104 192 144 128 205 98 C 236 83 266 75 305 68 Z';

const fa = n => String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);

function mulberry32(a) {
  return function () {
    a |= 0;
    a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function clipPoly(poly, mx, my, nx, ny) {
  const out = [];
  const side = p => (p[0] - mx) * nx + (p[1] - my) * ny;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const da = side(a);
    const db = side(b);
    if (da <= 0) out.push(a);
    if ((da <= 0) !== (db <= 0)) {
      const t = da / (da - db);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  return out;
}

function voronoiCells() {
  const bbox = [[20, 10], [980, 10], [980, 790], [20, 790]];
  const cells = new Map();
  for (const site of TERRITORIES) {
    let poly = bbox.map(p => [...p]);
    for (const other of TERRITORIES) {
      if (other.id === site.id) continue;
      const mx = (site.x + other.x) / 2;
      const my = (site.y + other.y) / 2;
      const nx = other.x - site.x;
      const ny = other.y - site.y;
      poly = clipPoly(poly, mx, my, nx, ny);
      if (poly.length < 3) break;
    }
    const d = poly.length
      ? 'M ' + poly.map(p => `${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(' L ') + ' Z'
      : '';
    cells.set(site.id, d);
  }
  return cells;
}

const CELLS = voronoiCells();

function mountainRange(points, count, size, rng, mtn, snow) {
  const segs = [];
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    segs.push({ a, b, len, start: total });
    total += len;
  }
  for (let i = 0; i < count; i++) {
    const dist = count === 1 ? 0 : total * i / (count - 1);
    const seg = segs.find(s => dist >= s.start && dist <= s.start + s.len) || segs[segs.length - 1];
    const t = seg.len ? (dist - seg.start) / seg.len : 0;
    let x = seg.a[0] + (seg.b[0] - seg.a[0]) * t;
    let y = seg.a[1] + (seg.b[1] - seg.a[1]) * t;
    const nx = -(seg.b[1] - seg.a[1]) / (seg.len || 1);
    const ny = (seg.b[0] - seg.a[0]) / (seg.len || 1);
    const jitter = (rng() - 0.5) * size * 0.8;
    x += nx * jitter;
    y += ny * jitter;
    const s = size * (0.75 + rng() * 0.5);
    mtn.push(`M ${(x - s).toFixed(1)} ${(y + s * 0.52).toFixed(1)} L ${x.toFixed(1)} ${(y - s * 0.7).toFixed(1)} L ${(x + s).toFixed(1)} ${(y + s * 0.52).toFixed(1)}`);
    snow.push(`M ${x.toFixed(1)} ${(y - s * 0.7).toFixed(1)} L ${(x - s * 0.3).toFixed(1)} ${(y - s * 0.1).toFixed(1)} L ${(x + s * 0.2).toFixed(1)} ${(y - s * 0.16).toFixed(1)} Z`);
  }
}

function forest(cx, cy, rx, ry, count, rng, scale, trunks, tops) {
  for (let i = 0; i < count; i++) {
    const angle = rng() * Math.PI * 2;
    const rad = Math.sqrt(rng());
    const x = cx + Math.cos(angle) * rx * rad;
    const y = cy + Math.sin(angle) * ry * rad;
    const s = (0.7 + rng() * 0.6) * scale;
    const X = x.toFixed(1), Y = y.toFixed(1), S = s.toFixed(2);
    void X; void Y; void S;
    trunks.push(`M ${x.toFixed(1)} ${(y + s).toFixed(1)} L ${x.toFixed(1)} ${(y - 4 * s).toFixed(1)}`);
    tops.push(`M ${x.toFixed(1)} ${(y - 13 * s).toFixed(1)} L ${(x - 5 * s).toFixed(1)} ${(y - 3 * s).toFixed(1)} L ${(x + 5 * s).toFixed(1)} ${(y - 3 * s).toFixed(1)} Z`);
    tops.push(`M ${x.toFixed(1)} ${(y - 18 * s).toFixed(1)} L ${(x - 4 * s).toFixed(1)} ${(y - 8 * s).toFixed(1)} L ${(x + 4 * s).toFixed(1)} ${(y - 8 * s).toFixed(1)} Z`);
  }
}

function smoothPath(points) {
  if (points.length < 2) return '';
  let d = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 1; i < points.length - 1; i++) {
    const xc = (points[i][0] + points[i + 1][0]) / 2;
    const yc = (points[i][1] + points[i + 1][1]) / 2;
    d += ` Q ${points[i][0]} ${points[i][1]} ${xc} ${yc}`;
  }
  const last = points[points.length - 1];
  d += ` L ${last[0]} ${last[1]}`;
  return d;
}

function buildDecor() {
  const rng = mulberry32(20261020);
  const mtn = [], snow = [], trunks = [], tops = [], rivers = [], waves = [];

  mountainRange([[108, 232], [132, 330], [150, 428]], 8, 8, rng, mtn, snow);
  mountainRange([[430, 212], [451, 292], [451, 372], [440, 455], [456, 506]], 17, 9, rng, mtn, snow);
  mountainRange([[588, 184], [660, 204], [742, 240], [802, 266]], 9, 8, rng, mtn, snow);
  mountainRange([[748, 298], [790, 324], [832, 346]], 5, 7, rng, mtn, snow);
  mountainRange([[352, 650], [420, 665], [490, 662], [552, 670]], 11, 8, rng, mtn, snow);
  mountainRange([[598, 590], [638, 630], [680, 676], [712, 712]], 9, 7, rng, mtn, snow);
  mountainRange([[688, 614], [740, 640], [782, 666]], 6, 6, rng, mtn, snow);
  mountainRange([[320, 172], [352, 218], [378, 250]], 5, 7, rng, mtn, snow);
  mountainRange([[462, 160], [492, 190]], 3, 6, rng, mtn, snow);

  forest(205, 316, 17, 22, 6, rng, 0.9, trunks, tops);
  forest(388, 366, 12, 18, 4, rng, 0.85, trunks, tops);
  forest(575, 396, 56, 82, 24, rng, 1, trunks, tops);
  forest(470, 472, 17, 20, 6, rng, 0.9, trunks, tops);
  forest(390, 528, 18, 24, 7, rng, 0.95, trunks, tops);
  forest(514, 598, 15, 15, 4, rng, 0.8, trunks, tops);
  forest(602, 630, 12, 10, 3, rng, 0.72, trunks, tops);
  forest(296, 300, 12, 15, 4, rng, 0.75, trunks, tops);
  forest(252, 340, 9, 11, 3, rng, 0.7, trunks, tops);

  const riverLines = [
    [[499, 305], [520, 358], [501, 428], [540, 480], [558, 530], [553, 600], [570, 652], [565, 700], [556, 736]],
    [[229, 252], [240, 300], [232, 350], [250, 412]],
    [[340, 456], [351, 490], [345, 525], [356, 562]],
    [[431, 562], [470, 580], [500, 600], [521, 626]],
    [[660, 344], [680, 390], [700, 440], [711, 492]],
    [[300, 180], [320, 240], [315, 285]]
  ];
  for (const river of riverLines) rivers.push(smoothPath(river));

  const wavePoints = [
    [115, 500], [160, 565], [205, 620], [270, 690],
    [345, 725], [420, 745], [495, 750], [640, 770],
    [710, 770], [790, 740], [850, 680], [890, 600],
    [905, 520], [60, 380], [70, 300], [85, 220]
  ];
  for (const [x, y] of wavePoints) {
    const s = 0.8 + rng() * 0.6;
    waves.push(`M ${(x - 14 * s).toFixed(1)} ${y} Q ${(x - 7 * s).toFixed(1)} ${(y - 5 * s).toFixed(1)} ${x} ${y} Q ${(x + 7 * s).toFixed(1)} ${(y + 5 * s).toFixed(1)} ${(x + 14 * s).toFixed(1)} ${y}`);
  }

  return `<path class="mtn" d="${mtn.join(' ')}"/>` +
    `<path class="mtn-snow" d="${snow.join(' ')}"/>` +
    `<path class="tree-trunk" d="${trunks.join(' ')}"/>` +
    `<path class="tree-top" d="${tops.join(' ')}"/>` +
    `<path class="river" d="${rivers.join(' ')}"/>` +
    `<path class="wave" d="${waves.join(' ')}"/>`;
}

const DECOR = buildDecor();

function labelSize(name) {
  if (name.length <= 8) return 14;
  if (name.length <= 12) return 12.5;
  if (name.length <= 16) return 11;
  return 10;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function tokenStar() {
  return '<path class="token-star" d="M0 -20 L1.7 -16.7 L5.2 -16.3 L2.6 -13.7 L3.2 -10.2 L0 -12 L-3.2 -10.2 L-2.6 -13.7 L-5.2 -16.3 L-1.7 -16.7 Z"/>';
}

function buildingHTML(t) {
  let out = '';
  if (t.fort > 0) {
    out += `<g class="bld fort" transform="translate(0 21)">` +
      `<path d="M-8 6 V-2 H-5 V1 H-2 V-2 H2 V1 H5 V-2 H8 V6 Z"/>` +
      `<text x="11" y="5">${fa(t.fort)}</text></g>`;
  }
  if (t.barracks) {
    out += `<g class="bld barracks" transform="translate(15 21)">` +
      '<path d="M-5 5 L5 -5 M-5 -5 L5 5 M-5 -5 L-5 -1 M-5 -5 L-1 -5 M5 5 L5 1 M5 5 L1 5"/>' +
      '</g>';
  }
  return out;
}

function renderMap(state, selectedId, targets) {
  const ally = new Set(targets.ally || []);
  const enemy = new Set(targets.enemy || []);
  let cells = '';
  let labels = '';
  let tokens = '';
  let buildings = '';

  for (const def of TERRITORIES) {
    const t = state.territories[def.id];
    if (!t) continue;
    const faction = FACTIONS[t.faction] || FACTIONS.gondor;
    const classes = ['territory', `side-${t.owner}`];
    if (def.id === selectedId) classes.push('selected');
    if (ally.has(def.id)) classes.push('target-ally');
    if (enemy.has(def.id)) classes.push('target-enemy');
    cells += `<path class="${classes.join(' ')}" data-id="${def.id}" style="--faction:${faction.color}" d="${CELLS.get(def.id)}">` +
      `<title>${escapeHtml(def.name)} — ${escapeHtml(faction.name)}</title></path>`;

    const labelClasses = ['territory-label', `side-${t.owner}`];
    if (def.capital) labelClasses.push('capital-label');
    if (def.id === selectedId) labelClasses.push('selected-label');
    labels += `<text class="${labelClasses.join(' ')}" x="${def.x}" y="${def.y - 27}" style="font-size:${labelSize(def.name)}px">${escapeHtml(def.name)}</text>`;

    const total = (t.units.inf || 0) + (t.units.arch || 0) + (t.units.cav || 0) + (t.units.hero || 0);
    if (total > 0) {
      tokens += `<g class="token side-${t.owner}${def.capital ? ' capital' : ''}" data-id="${def.id}" style="--faction:${faction.color}" transform="translate(${def.x} ${def.y + 1})">` +
        `<circle class="token-halo" r="18"/>` +
        `<circle class="token-ring" r="14"/>` +
        `<circle class="token-body" r="11"/>` +
        `<text class="token-count" y="4">${fa(total)}</text>` +
        (def.capital ? '<circle class="token-cap" r="16.5"/>' : '') +
        (t.units.hero > 0 ? tokenStar() : '') +
        '</g>';
    }
    if (t.fort > 0 || t.barracks) {
      buildings += `<g class="buildings" data-id="${def.id}" transform="translate(${def.x} ${def.y + 2})">${buildingHTML(t)}</g>`;
    }
  }

  return `
    <defs>
      <linearGradient id="seaGrad" x1="0" y1="0" x2="0.35" y2="1">
        <stop offset="0" stop-color="#102128"/>
        <stop offset="0.55" stop-color="#0b171c"/>
        <stop offset="1" stop-color="#071014"/>
      </linearGradient>
      <linearGradient id="landGrad" x1="0" y1="0" x2="0.7" y2="1">
        <stop offset="0" stop-color="#d8c49b"/>
        <stop offset="0.5" stop-color="#c9b184"/>
        <stop offset="1" stop-color="#b99b6d"/>
      </linearGradient>
      <filter id="softGlow" x="-60%" y="-60%" width="220%" height="220%">
        <feDropShadow dx="0" dy="0" stdDeviation="4" flood-color="#ffdd94" flood-opacity="0.9"/>
      </filter>
      <clipPath id="landClip"><path d="${LAND_PATH}"/></clipPath>
    </defs>
    <rect class="sea" x="0" y="0" width="${W}" height="${H}" fill="url(#seaGrad)"/>
    <g class="sea-decor">
      <text class="sea-label" x="155" y="545" transform="rotate(-66 155 545)">دریای بزرگ</text>
      <text class="sea-label small" x="512" y="760">خلیج بلفالاس</text>
    </g>
    <path class="land-mass" d="${LAND_PATH}" fill="url(#landGrad)"/>
    <g clip-path="url(#landClip)">
      <g class="terrain">${DECOR}</g>
      <g class="territories">${cells}</g>
    </g>
    <path class="coastline" d="${LAND_PATH}"/>
    <g class="labels">${labels}</g>
    <g class="buildings-layer">${buildings}</g>
    <g class="tokens">${tokens}</g>
    <g class="compass" transform="translate(890 138)">
      <circle r="26" class="compass-ring"/>
      <circle r="18" class="compass-ring inner"/>
      <path d="M0 -20 L5 0 L0 20 L-5 0 Z" class="compass-needle"/>
      <text y="-31">ش</text>
    </g>
  `;
}

export function createMap(container, { onSelect } = {}) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'map-svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.setAttribute('role', 'application');
  svg.setAttribute('aria-label', 'نقشه سرزمین میانه');
  const viewport = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  viewport.setAttribute('class', 'map-viewport');
  svg.appendChild(viewport);
  container.appendChild(svg);

  const view = { s: 1, tx: 0, ty: 0 };
  let initialized = false;
  let currentState = null;
  let currentSelection = null;
  let currentTargets = { ally: [], enemy: [] };

  const pointers = new Map();
  let dragStart = null;
  let pinchStart = null;
  let dragMoved = false;
  let suppressTap = false;

  const rect = () => svg.getBoundingClientRect();
  function metrics() {
    const r = rect();
    const base = Math.min(r.width / W, r.height / H) || 1;
    return {
      r, base,
      ox: (r.width - W * base) / 2,
      oy: (r.height - H * base) / 2
    };
  }
  function screenToView(clientX, clientY) {
    const { r, base, ox, oy } = metrics();
    return { x: (clientX - r.left - ox) / base, y: (clientY - r.top - oy) / base };
  }
  function clampView() {
    if (view.s <= 1) {
      view.s = 1;
      view.tx = 0;
      view.ty = 0;
      return;
    }
    const mobile = rect().width < 760;
    const margin = mobile ? 300 : 0;
    view.s = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, view.s));
    view.tx = Math.min(margin, Math.max(W - W * view.s - margin, view.tx));
    view.ty = Math.min(margin, Math.max(H - H * view.s - margin, view.ty));
  }
  function applyView() {
    clampView();
    viewport.setAttribute('transform', `translate(${view.tx.toFixed(2)} ${view.ty.toFixed(2)}) scale(${view.s.toFixed(3)})`);
    svg.dataset.zoom = view.s >= 1.3 ? 'close' : 'far';
    svg.dispatchEvent(new CustomEvent('mapzoom', { detail: { scale: view.s } }));
  }
  function zoomAt(point, nextScale) {
    const s1 = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextScale));
    const p = { x: (point.x - view.tx) / view.s, y: (point.y - view.ty) / view.s };
    view.s = s1;
    view.tx = point.x - p.x * s1;
    view.ty = point.y - p.y * s1;
    applyView();
  }
  function centerOn(id, scale = null) {
    const t = TERRITORY_MAP[id];
    if (!t) return;
    const r = rect();
    const mobile = r.width < 760;
    view.s = scale ?? (mobile ? 2.2 : 1);
    if (view.s <= 1) {
      view.tx = 0;
      view.ty = 0;
    } else {
      const anchorY = mobile ? 320 : H / 2;
      view.tx = W / 2 - t.x * view.s;
      view.ty = anchorY - t.y * view.s;
    }
    applyView();
  }
  function reset() {
    view.s = 1;
    view.tx = 0;
    view.ty = 0;
    applyView();
  }

  svg.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    dragMoved = false;
    if (pointers.size === 1) {
      dragStart = { x: e.clientX, y: e.clientY, view: { ...view }, id: e.pointerId };
      pinchStart = null;
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinchStart = {
        dist: Math.hypot(a.x - b.x, a.y - b.y),
        view: { ...view }
      };
      dragStart = null;
    }
  });

  window.addEventListener('pointermove', e => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.size === 1 && dragStart) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      if (Math.hypot(dx, dy) > 8) dragMoved = true;
      if (dragMoved) {
        const { base } = metrics();
        view.tx = dragStart.view.tx + dx / base;
        view.ty = dragStart.view.ty + dy / base;
        applyView();
      }
    } else if (pointers.size >= 2 && pinchStart) {
      const [a, b] = [...pointers.values()];
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (dist < 5) return;
      const s1 = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, pinchStart.view.s * dist / pinchStart.dist));
      const v = screenToView(mid.x, mid.y);
      const p = {
        x: (v.x - pinchStart.view.tx) / pinchStart.view.s,
        y: (v.y - pinchStart.view.ty) / pinchStart.view.s
      };
      view.s = s1;
      view.tx = v.x - p.x * s1;
      view.ty = v.y - p.y * s1;
      applyView();
      dragMoved = true;
    }
  }, { passive: true });

  window.addEventListener('pointerup', e => {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
    if (pointers.size === 0) {
      if (!dragMoved) {
        const target = e.target.closest?.('[data-id]');
        if (!suppressTap) onSelect?.(target ? target.getAttribute('data-id') : null);
      }
      dragStart = null;
      pinchStart = null;
      dragMoved = false;
    } else if (pointers.size === 1) {
      pinchStart = null;
      const [p] = [...pointers.values()];
      dragStart = { x: p.x, y: p.y, view: { ...view } };
    }
  });

  window.addEventListener('pointercancel', e => {
    pointers.delete(e.pointerId);
    if (pointers.size === 0) {
      dragStart = null;
      pinchStart = null;
      dragMoved = false;
    }
  });

  svg.addEventListener('wheel', e => {
    e.preventDefault();
    const v = screenToView(e.clientX, e.clientY);
    zoomAt(v, view.s * Math.exp(-e.deltaY * 0.0016));
  }, { passive: false });

  svg.addEventListener('dblclick', e => {
    e.preventDefault();
    const v = screenToView(e.clientX, e.clientY);
    zoomAt(v, view.s * 1.35);
  });

  new ResizeObserver(() => { applyView(); if (!initialized) reset(); }).observe(container);

  function render(state, { selectedId = null, targets = { ally: [], enemy: [] } } = {}) {
    currentState = state;
    currentSelection = selectedId;
    currentTargets = targets;
    viewport.innerHTML = renderMap(state, selectedId, targets);
    applyView();
  }

  function flash(id) {
    const nodes = viewport.querySelectorAll(`[data-id="${id}"]`);
    nodes.forEach(n => n.classList.add('flash'));
    setTimeout(() => nodes.forEach(n => n.classList.remove('flash')), 1100);
  }

  function arrow(fromId, toId, color = '#ffd97a') {
    const a = TERRITORY_MAP[fromId];
    const b = TERRITORY_MAP[toId];
    if (!a || !b) return;
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2 - 26;
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', `M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`);
    path.setAttribute('class', 'move-arrow');
    path.style.stroke = color;
    viewport.appendChild(path);
    setTimeout(() => path.remove(), 1000);
  }

  function start(id, { mobileScale = null } = {}) {
    initialized = true;
    centerOn(id, mobileScale);
  }

  function zoomBy(factor) {
    zoomAt({ x: W / 2, y: H / 2 }, view.s * factor);
  }

  return {
    render, flash, arrow, reset, zoomBy,
    zoomIn: () => zoomBy(1.3),
    zoomOut: () => zoomBy(1 / 1.3),
    start,
    focus: id => { initialized = true; centerOn(id, view.s); },
    get scale() { return view.s; }
  };
}
