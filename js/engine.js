import {
  TERRITORIES, TERRITORY_MAP, SIDES, UNIT_INFO, BUILD_COSTS,
  VICTORY_REGIONS, adjacent
} from './data.js';

export const ZERO = { inf: 0, arch: 0, cav: 0, hero: 0 };

export const cloneUnits = u => ({ inf: u.inf || 0, arch: u.arch || 0, cav: u.cav || 0, hero: u.hero || 0 });

export function armyCount(units) {
  return (units.inf || 0) + (units.arch || 0) + (units.cav || 0) + (units.hero || 0);
}

export function armyPower(units, fort = 0, defender = false) {
  const base = (units.inf || 0) * 1 + (units.arch || 0) * 1.18 +
    (units.cav || 0) * 1.42 + (units.hero || 0) * 3.6;
  return base * (defender ? 1 + fort * 0.16 : 1);
}

export function createGame(playerSide) {
  const territories = {};
  for (const t of TERRITORIES) {
    territories[t.id] = {
      owner: t.side,
      faction: t.faction,
      units: cloneUnits(t.units),
      fort: t.fort,
      barracks: t.barracks,
      camp: false,
      moved: false,
      recruits: 0
    };
  }
  return {
    version: 1,
    playerSide,
    active: playerSide,
    turn: 1,
    gold: { free: 12, dark: 12 },
    territories,
    stats: {
      free: { battles: 0, wins: 0, unitsLost: 0 },
      dark: { battles: 0, wins: 0, unitsLost: 0 }
    },
    status: 'playing',
    reason: '',
    log: [{ turn: 1, type: 'info', text: 'کمپین آغاز شد. سرزمین‌ها را برای نبرد آماده کنید.' }]
  };
}

export const otherSide = side => side === 'free' ? 'dark' : 'free';

export function regionCount(state, side) {
  return Object.values(state.territories).filter(t => t.owner === side).length;
}

export function regionIncome(state, id) {
  const t = state.territories[id];
  if (!t) return 0;
  return (TERRITORY_MAP[id]?.income || 0) + (t.camp ? 1 : 0);
}

export function sideIncome(state, side) {
  return Object.keys(state.territories)
    .filter(id => state.territories[id].owner === side)
    .reduce((sum, id) => sum + regionIncome(state, id), 0);
}

export function applyIncome(state, side) {
  state.gold[side] += sideIncome(state, side);
}

export function resetMoves(state, side) {
  for (const t of Object.values(state.territories)) {
    if (t.owner === side) {
      t.moved = false;
      t.recruits = 0;
    }
  }
}

export function canActIn(state, id, side) {
  const t = state.territories[id];
  return !!t && t.owner === side && state.active === side && state.status === 'playing';
}

export function recruit(state, id, type, side) {
  const t = state.territories[id];
  const info = UNIT_INFO[type];
  if (!canActIn(state, id, side)) return { ok: false, reason: 'این سرزمین در اختیار شما نیست.' };
  if (!info || type === 'hero') return { ok: false, reason: 'این نیرو قابل استخدام نیست.' };
  if (!t.barracks) return { ok: false, reason: 'برای استخدام به پادگان نیاز دارید.' };
  if (t.recruits >= 3) return { ok: false, reason: 'این پادگان در این نوبت به اندازه کافی نیرو فرستاده است.' };
  if (state.gold[side] < info.cost) return { ok: false, reason: 'طلا کافی نیست.' };
  state.gold[side] -= info.cost;
  t.units[type] += 1;
  t.recruits += 1;
  return { ok: true, message: `${info.name} در ${TERRITORY_MAP[id].name} استخدام شد.` };
}

export function build(state, id, what, side) {
  const t = state.territories[id];
  if (!canActIn(state, id, side)) return { ok: false, reason: 'این سرزمین در اختیار شما نیست.' };
  if (what === 'barracks') {
    if (t.barracks) return { ok: false, reason: 'این سرزمین پادگان دارد.' };
    if (state.gold[side] < BUILD_COSTS.barracks) return { ok: false, reason: 'طلا کافی نیست.' };
    state.gold[side] -= BUILD_COSTS.barracks;
    t.barracks = true;
    return { ok: true, message: `پادگان در ${TERRITORY_MAP[id].name} ساخته شد.` };
  }
  if (what === 'fort') {
    if (t.fort >= 3) return { ok: false, reason: 'استحکام این سرزمین در بیشترین حد است.' };
    if (state.gold[side] < BUILD_COSTS.fort) return { ok: false, reason: 'طلا کافی نیست.' };
    state.gold[side] -= BUILD_COSTS.fort;
    t.fort += 1;
    return { ok: true, message: `استحکامات ${TERRITORY_MAP[id].name} تقویت شد.` };
  }
  return { ok: false, reason: 'ساخت نامعتبر است.' };
}

export function moveArmy(state, fromId, toId, side) {
  const a = state.territories[fromId];
  const b = state.territories[toId];
  if (!canActIn(state, fromId, side)) return { ok: false, reason: 'این ارتش در اختیار شما نیست.' };
  if (!b || b.owner !== side) return { ok: false, reason: 'فقط به سرزمین خودی می‌توانید حرکت کنید.' };
  if (!adjacent(fromId).includes(toId)) return { ok: false, reason: 'این سرزمین مجاور نیست.' };
  if (a.moved) return { ok: false, reason: 'این ارتش در این نوبت حرکت کرده است.' };
  if (armyCount(a.units) === 0) return { ok: false, reason: 'ارتشی برای حرکت وجود ندارد.' };
  const keep = (TERRITORY_MAP[fromId].capital || a.fort > 0 || a.barracks) ? 1 : 0;
  const total = armyCount(a.units);
  if (total <= keep) return { ok: false, reason: 'حداقل یک گارد باید در این سرزمین بماند.' };
  const moving = cloneUnits(a.units);
  let remaining = keep;
  for (const type of ['inf', 'arch', 'cav', 'hero']) {
    const take = Math.min(remaining, moving[type]);
    moving[type] -= take;
    remaining -= take;
  }
  for (const type of ['inf', 'arch', 'cav', 'hero']) {
    a.units[type] -= moving[type];
    b.units[type] += moving[type];
  }
  a.moved = true;
  b.moved = true;
  return {
    ok: true,
    moved: moving,
    message: `ارتش از ${TERRITORY_MAP[fromId].name} به ${TERRITORY_MAP[toId].name} حرکت کرد.`
  };
}

function survivorUnits(units, loss, winner, heroChance = 0.55) {
  const out = { ...ZERO };
  for (const type of ['inf', 'arch', 'cav', 'hero']) {
    const count = units[type] || 0;
    if (!count) continue;
    if (type === 'hero') {
      out.hero = winner && loss < 0.6 && Math.random() < heroChance ? 1 : 0;
    } else {
      out[type] = Math.max(0, Math.round(count * (1 - loss)));
    }
  }
  if (winner && armyCount(out) === 0 && armyCount(units) > 0) out.inf = 1;
  return out;
}

export function canAttack(state, fromId, toId, side) {
  const a = state.territories[fromId];
  const b = state.territories[toId];
  if (!a || !b) return { ok: false, reason: 'سرزمین نامعتبر است.' };
  if (a.owner !== side) return { ok: false, reason: 'این ارتش در اختیار شما نیست.' };
  if (b.owner === side) return { ok: false, reason: 'این سرزمین در اختیار شماست.' };
  if (!adjacent(fromId).includes(toId)) return { ok: false, reason: 'این سرزمین مجاور نیست.' };
  if (a.moved) return { ok: false, reason: 'این ارتش در این نوبت حرکت کرده است.' };
  if (armyCount(a.units) === 0) return { ok: false, reason: 'ارتشی برای حمله وجود ندارد.' };
  if (state.active !== side) return { ok: false, reason: 'اکنون نوبت شما نیست.' };
  return { ok: true };
}

export function simulateBattle(state, fromId, toId) {
  const from = state.territories[fromId];
  const to = state.territories[toId];
  const atkUnits = cloneUnits(from.units);
  const defUnits = cloneUnits(to.units);
  const atkArmy = armyCount(atkUnits);
  const defArmy = armyCount(defUnits);
  const fromName = TERRITORY_MAP[fromId].name;
  const toName = TERRITORY_MAP[toId].name;

  let atkBonus = 1;
  let defBonus = 1;
  if (atkArmy) {
    if ((atkUnits.cav / atkArmy) > (defUnits.arch / Math.max(1, defArmy))) atkBonus += 0.06;
    if ((atkUnits.arch / atkArmy) > (defUnits.inf / Math.max(1, defArmy))) atkBonus += 0.03;
  }
  if (defArmy) {
    if ((defUnits.arch / defArmy) > (atkUnits.inf / Math.max(1, atkArmy))) defBonus += 0.06;
    if ((defUnits.inf / defArmy) > (atkUnits.cav / Math.max(1, atkArmy))) defBonus += 0.04;
  }
  const atkPower = armyPower(atkUnits) * atkBonus * (0.93 + Math.random() * 0.14);
  const defPower = armyPower(defUnits, to.fort, true) * defBonus * (0.93 + Math.random() * 0.14);
  const attackerWon = atkPower > defPower * 1.02;

  let atkSurvivors;
  let defSurvivors;
  let atkLoss;
  let defLoss;
  if (attackerWon) {
    const pressure = Math.min(1, defPower / Math.max(0.1, atkPower));
    atkLoss = 0.12 + 0.46 * pressure;
    defLoss = 1;
    atkSurvivors = survivorUnits(atkUnits, atkLoss, true);
    defSurvivors = { ...ZERO };
  } else {
    const pressure = Math.min(1, atkPower / Math.max(0.1, defPower));
    defLoss = 0.08 + 0.4 * pressure;
    atkLoss = 1;
    atkSurvivors = { ...ZERO };
    defSurvivors = survivorUnits(defUnits, defLoss, true, 0.75);
  }

  const log = [];
  log.push(`نیروهای ${SIDES[from.owner].short} از ${fromName} به ${toName} یورش بردند.`);
  if (atkUnits.cav > 0) log.push('سواره‌نظام با تکیه بر سرعت، جناحین دشمن را آشفته کرد.');
  else if (atkUnits.arch > 0) log.push('کمانداران پیش از برخورد، آسمان را از تیر پر کردند.');
  else log.push('پیاده‌نظام سپرها را به هم قفل کرد و پیش رفت.');
  if (to.fort > 0) log.push(`استحکامات ${toName} (سطح ${to.fort}) مقاومت مدافعان را افزایش داد.`);
  if (defUnits.hero > 0) log.push('سردار مدافع با فریاد جنگاوران را به مقاومت فراخواند.');
  if (from.owner !== to.owner) log.push(attackerWon
    ? `${toName} سقوط کرد و پرچم ${SIDES[from.owner].short} بر فراز آن برافراشته شد.`
    : `حمله در برابر مدافعان ${toName} شکست خورد و ارتش مهاجم پراکنده شد.`);

  return {
    fromId, toId, fromName, toName,
    attackerSide: from.owner,
    defenderSide: to.owner,
    atkUnits, defUnits,
    atkArmy, defArmy,
    atkPower, defPower,
    attackerWon,
    atkSurvivors,
    defSurvivors,
    atkLoss,
    defLoss,
    fort: to.fort,
    heroName: TERRITORY_MAP[toId].heroName || TERRITORY_MAP[fromId].heroName || null,
    log
  };
}

export function applyBattleResult(state, result) {
  const from = state.territories[result.fromId];
  const to = state.territories[result.toId];
  const attacker = result.attackerSide;
  const defender = result.defenderSide;

  state.stats[attacker].battles += 1;
  state.stats[defender].battles += 1;
  const atkLost = result.atkArmy - armyCount(result.atkSurvivors);
  const defLost = result.defArmy - armyCount(result.defSurvivors);
  state.stats[attacker].unitsLost += atkLost;
  state.stats[defender].unitsLost += defLost;

  if (result.attackerWon) {
    state.stats[attacker].wins += 1;
    from.units = { ...ZERO };
    to.owner = attacker;
    to.faction = from.faction;
    to.units = cloneUnits(result.atkSurvivors);
    to.fort = Math.max(0, to.fort - 1);
    to.moved = true;
    to.recruits = 0;
    state.gold[attacker] += 2;
    state.log.push({
      turn: state.turn, type: 'battle',
      text: `${SIDES[attacker].short} ${result.toName} را تصرف کرد.`
    });
  } else {
    state.stats[defender].wins += 1;
    from.units = { ...ZERO };
    to.units = cloneUnits(result.defSurvivors);
    state.log.push({
      turn: state.turn, type: 'battle',
      text: `دفاع از ${result.toName} موفق بود و ارتش مهاجم نابود شد.`
    });
  }
  from.moved = true;
  to.moved = true;
  return result;
}

export function checkVictory(state) {
  if (state.status !== 'playing') return state;
  const player = state.playerSide;
  const enemy = otherSide(player);
  const playerCount = regionCount(state, player);
  const enemyCount = regionCount(state, enemy);
  const playerSupreme = SIDES[player].supreme;
  const enemySupreme = SIDES[enemy].supreme;

  if (state.territories[enemySupreme].owner === player) {
    state.status = 'victory';
    state.reason = `پایتخت دشمن، ${TERRITORY_MAP[enemySupreme].name}، سقوط کرد.`;
  } else if (state.territories[playerSupreme].owner === enemy) {
    state.status = 'defeat';
    state.reason = `پایتخت شما، ${TERRITORY_MAP[playerSupreme].name}، به دست دشمن افتاد.`;
  } else if (playerCount >= VICTORY_REGIONS) {
    state.status = 'victory';
    state.reason = `کنترل ${playerCount} سرزمین، سرزمین میانه را زیر پرچم شما آورد.`;
  } else if (enemyCount >= VICTORY_REGIONS) {
    state.status = 'defeat';
    state.reason = `دشمن ${enemyCount} سرزمین را در اختیار گرفت.`;
  }
  return state;
}

function pickRecruitType(state, side) {
  const costs = { inf: UNIT_INFO.inf.cost, arch: UNIT_INFO.arch.cost, cav: UNIT_INFO.cav.cost };
  if (state.gold[side] >= costs.cav && Math.random() < 0.3) return 'cav';
  if (state.gold[side] >= costs.arch && Math.random() < 0.55) return 'arch';
  if (state.gold[side] >= costs.inf) return 'inf';
  return null;
}

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

export async function runAITurn(state, { onAction = () => {}, delay = 440 } = {}) {
  const ai = state.active;
  let actions = 0;
  let recruited = 0;

  while (actions < 12 && state.status === 'playing') {
    const owned = Object.keys(state.territories).filter(id => state.territories[id].owner === ai);

    let bestAttack = null;
    for (const id of owned) {
      const t = state.territories[id];
      if (t.moved || armyCount(t.units) === 0) continue;
      for (const targetId of adjacent(id)) {
        const target = state.territories[targetId];
        if (target.owner === ai) continue;
        const ratio = armyPower(t.units) / Math.max(0.5, armyPower(target.units, target.fort, true));
        if (ratio > 1.08 && (!bestAttack || ratio > bestAttack.ratio)) {
          bestAttack = { from: id, to: targetId, ratio };
        }
      }
    }

    if (bestAttack && Math.random() < 0.9) {
      const result = simulateBattle(state, bestAttack.from, bestAttack.to);
      applyBattleResult(state, result);
      onAction({ type: 'attack', ...result });
      checkVictory(state);
      actions += 1;
      await wait(delay);
      continue;
    }

    if (recruited < 4) {
      let did = false;
      const barracks = owned.filter(id => {
        const t = state.territories[id];
        return t.barracks && t.recruits < 3;
      });
      for (const id of barracks) {
        const type = pickRecruitType(state, ai);
        if (!type) break;
        const result = recruit(state, id, type, ai);
        if (result.ok) {
          recruited += 1;
          actions += 1;
          did = true;
          onAction({ type: 'recruit', id, unit: type, result });
          await wait(Math.min(delay, 280));
          break;
        }
      }
      if (did) continue;
    }

    let reinforce = null;
    for (const id of owned) {
      const t = state.territories[id];
      if (t.moved || armyCount(t.units) < 3) continue;
      const hasEnemy = adjacent(id).some(n => state.territories[n].owner !== ai);
      if (hasEnemy) continue;
      for (const n of adjacent(id)) {
        const neighbor = state.territories[n];
        if (neighbor.owner !== ai) continue;
        const threatens = adjacent(n).some(x => state.territories[x].owner !== ai);
        if (threatens) { reinforce = { from: id, to: n }; break; }
      }
      if (reinforce) break;
    }
    if (reinforce) {
      const moved = moveArmy(state, reinforce.from, reinforce.to, ai);
      if (moved.ok) {
        onAction({ type: 'move', ...reinforce, message: moved.message });
        actions += 1;
        await wait(Math.min(delay, 340));
        continue;
      }
    }

    let buildAt = null;
    if (state.gold[ai] >= BUILD_COSTS.barracks) {
      buildAt = owned.find(id => {
        const t = state.territories[id];
        if (t.barracks) return false;
        return adjacent(id).some(n => state.territories[n].owner !== ai);
      });
    }
    if (buildAt) {
      const built = build(state, buildAt, 'barracks', ai);
      if (built.ok) {
        onAction({ type: 'build', id: buildAt, result: built });
        actions += 1;
        await wait(Math.min(delay, 340));
        continue;
      }
    }

    break;
  }
  return { actions };
}

export function playerStats(state) {
  const player = state.playerSide;
  const enemy = otherSide(player);
  return {
    ...state.stats[player],
    regions: regionCount(state, player),
    enemyRegions: regionCount(state, enemy),
    income: sideIncome(state, player)
  };
}
