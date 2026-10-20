export const SIDES = {
  free: {
    id: 'free',
    name: 'مردمان آزاد',
    short: 'آزاد',
    color: '#5aa9e6',
    glow: '#9fd8ff',
    motto: 'در برابر تاریکی بایست',
    desc: 'گندور، روهان، الف‌ها و دورف‌ها متحد شده‌اند تا سرزمین میانه را از سایه نجات دهند.',
    supreme: 'minas_tirith'
  },
  dark: {
    id: 'dark',
    name: 'نیروهای تاریکی',
    short: 'تاریکی',
    color: '#d4554b',
    glow: '#ff9b84',
    motto: 'سرزمین میانه از آنِ سائرون است',
    desc: 'موردور، آیزنگارد و لشکرهای شرق برای فرمانروایی بر سرزمین میانه به پیش می‌تازند.',
    supreme: 'gorgoroth'
  }
};

export const FACTIONS = {
  gondor: { name: 'گندور', side: 'free', color: '#4f93d8' },
  rohan: { name: 'روهان', side: 'free', color: '#7fae62' },
  elves: { name: 'الف‌ها', side: 'free', color: '#67cbb7' },
  dwarves: { name: 'دورف‌ها', side: 'free', color: '#d3a04f' },
  north: { name: 'مردمان شمال', side: 'free', color: '#9fb9d9' },
  mordor: { name: 'موردور', side: 'dark', color: '#d1493f' },
  isengard: { name: 'آیزنگارد', side: 'dark', color: '#8f9bb0' },
  harad: { name: 'هاراد', side: 'dark', color: '#df9a4f' },
  rhun: { name: 'رون', side: 'dark', color: '#b4683c' },
  goblins: { name: 'گابلین‌ها', side: 'dark', color: '#8a9a4f' }
};

export const UNIT_INFO = {
  inf: { name: 'سرباز', short: 'پیاده', icon: 'inf', cost: 3, power: 1 },
  arch: { name: 'کماندار', short: 'کمان', icon: 'arch', cost: 4, power: 1.18 },
  cav: { name: 'سواره‌نظام', short: 'سواره', icon: 'cav', cost: 5, power: 1.42 },
  hero: { name: 'سردار', short: 'سردار', icon: 'hero', cost: 0, power: 3.6 }
};

export const BUILD_COSTS = {
  barracks: 6,
  fort: 8
};

export const VICTORY_REGIONS = 21;

const T = (id, name, x, y, side, faction, opts = {}) => ({
  id, name, x, y, side, faction,
  income: opts.income ?? 1,
  fort: opts.fort ?? 0,
  barracks: opts.barracks ?? false,
  capital: opts.capital ?? false,
  heroName: opts.heroName ?? null,
  desc: opts.desc ?? '',
  units: opts.units ?? { inf: 1, arch: 0, cav: 0, hero: 0 }
});

export const TERRITORIES = [
  T('forodwaith', 'سرزمین یخ', 470, 112, 'dark', 'goblins', {
    desc: 'بیابان یخ‌زده شمال، گذرگاهی سرد و بی‌رحم.',
    units: { inf: 1, arch: 0, cav: 0, hero: 0 }
  }),
  T('angmar', 'آنگمار', 340, 212, 'dark', 'goblins', {
    desc: 'قلمرو جادوگر-شاه، سرزمینی از برج‌های ویران و مه.',
    fort: 1,
    units: { inf: 2, arch: 0, cav: 0, hero: 0 }
  }),
  T('gundabad', 'گونداباد', 498, 196, 'dark', 'goblins', {
    desc: 'کوه مقدس گابلین‌ها در نوک رشته‌کوه‌های مه‌آلود.',
    fort: 1,
    units: { inf: 3, arch: 0, cav: 0, hero: 0 }
  }),
  T('lindon', 'لیندون', 116, 306, 'free', 'elves', {
    income: 2, fort: 2, barracks: true, capital: true, heroName: 'گیل-گالاد',
    desc: 'بندرهای خاکستری و آخرین پناهگاه الف‌های بلند در غرب.',
    units: { inf: 3, arch: 2, cav: 0, hero: 1 }
  }),
  T('shire', 'شایر', 220, 300, 'free', 'north', {
    desc: 'سرزمین سبز و آرام هابیت‌ها، دور از هیاهوی جنگ.',
    units: { inf: 1, arch: 1, cav: 0, hero: 0 }
  }),
  T('bree', 'بری', 296, 352, 'free', 'north', {
    desc: 'چهارراه غرب و خانه مردمان آزاد اریادور.',
    units: { inf: 2, arch: 1, cav: 0, hero: 0 }
  }),
  T('rivendell', 'ریوندل', 402, 336, 'free', 'elves', {
    income: 2, fort: 2, barracks: true, capital: true, heroName: 'الروند',
    desc: 'دره‌ای پنهان در میان کوه‌ها؛ شورای حلقه در همین‌جا برگزار شد.',
    units: { inf: 3, arch: 2, cav: 0, hero: 1 }
  }),
  T('high_pass', 'گردنه', 466, 348, 'dark', 'goblins', {
    desc: 'گذرگاه باریک کوهستان مه‌آلود؛ دروازه شمالی موریا.',
    units: { inf: 2, arch: 0, cav: 0, hero: 0 }
  }),
  T('moria', 'موریا', 406, 422, 'dark', 'goblins', {
    income: 2, fort: 2,
    desc: 'شهر زیرزمینی دورف‌ها، اکنون لانه گابلین‌ها و تاریکی.',
    units: { inf: 3, arch: 0, cav: 0, hero: 0 }
  }),
  T('lorien', 'لورین', 470, 476, 'free', 'elves', {
    income: 2, fort: 1, barracks: true, heroName: 'گالادریل',
    desc: 'جنگل طلایی و بی‌زمان الف‌ها، نگهبان مرزهای غربی.',
    units: { inf: 3, arch: 2, cav: 0, hero: 1 }
  }),
  T('mirkwood', 'میرک‌وود', 576, 406, 'free', 'elves', {
    income: 2,
    desc: 'جنگل تاریک شمال؛ خانه الف‌های چوبین و عنکبوت‌های غول‌آسا.',
    units: { inf: 2, arch: 2, cav: 0, hero: 0 }
  }),
  T('erebor', 'اربور', 650, 326, 'free', 'dwarves', {
    income: 3, fort: 3, barracks: true, capital: true, heroName: 'دین آهنین‌پا',
    desc: 'کوه تنها و پادشاهی زیرزمینی دورف‌ها با گنجینه‌های بی‌شمار.',
    units: { inf: 5, arch: 1, cav: 1, hero: 1 }
  }),
  T('iron_hills', 'تپه‌های آهن', 786, 316, 'free', 'dwarves', {
    income: 2, fort: 1,
    desc: 'تپه‌های سنگین و معادن آهن در شرق دور.',
    units: { inf: 2, arch: 1, cav: 0, hero: 0 }
  }),
  T('rhun', 'رون', 836, 436, 'dark', 'rhun', {
    income: 2, fort: 1, barracks: true,
    desc: 'سرزمین‌های شرقی و لشکرهای سواره‌نظام رون.',
    units: { inf: 3, arch: 2, cav: 1, hero: 0 }
  }),
  T('fangorn', 'فنگورن', 392, 530, 'free', 'north', {
    income: 2, fort: 1,
    desc: 'جنگل کهن آنت‌ها؛ خشم جنگل در برابر آیزنگارد.',
    units: { inf: 2, arch: 1, cav: 0, hero: 0 }
  }),
  T('isengard', 'آیزنگارد', 326, 496, 'dark', 'isengard', {
    income: 3, fort: 3, barracks: true, capital: true, heroName: 'سارومان',
    desc: 'برج اورتانک و کارگاه‌های سارومان سفید.',
    units: { inf: 5, arch: 2, cav: 1, hero: 1 }
  }),
  T('dunland', 'دانلند', 270, 466, 'dark', 'isengard', {
    desc: 'تپه‌های وحشی میان اریادور و روهان.',
    units: { inf: 2, arch: 0, cav: 0, hero: 0 }
  }),
  T('rohan_west', 'وستفولد', 352, 590, 'free', 'rohan', {
    income: 2,
    desc: 'دشت‌های غربی روهان و پرورش‌گاه اسب‌های جنگی.',
    units: { inf: 3, arch: 0, cav: 1, hero: 0 }
  }),
  T('edoras', 'ادوراس', 430, 614, 'free', 'rohan', {
    income: 3, fort: 2, barracks: true, capital: true, heroName: 'تئودن',
    desc: 'تالار طلایی پادشاهان روهان زیر سایه کوه‌ها.',
    units: { inf: 4, arch: 2, cav: 2, hero: 1 }
  }),
  T('rohan_east', 'ایستفولد', 486, 566, 'free', 'rohan', {
    income: 2,
    desc: 'دشت‌های شرقی روهان تا کرانه رود آندوین.',
    units: { inf: 2, arch: 2, cav: 1, hero: 0 }
  }),
  T('brown_lands', 'سرزمین‌های قهوه‌ای', 590, 506, 'dark', 'mordor', {
    desc: 'زمین‌های سوخته میان روهان و موردور.',
    units: { inf: 2, arch: 0, cav: 0, hero: 0 }
  }),
  T('dagorlad', 'داگورلاد', 666, 546, 'dark', 'mordor', {
    desc: 'دشت نبرد کهن پیش از دروازه‌های موردور.',
    units: { inf: 2, arch: 0, cav: 0, hero: 0 }
  }),
  T('udun', 'اودون', 710, 596, 'dark', 'mordor', {
    fort: 2,
    desc: 'دره سیاه و دروازه بزرگ موردور.',
    units: { inf: 3, arch: 1, cav: 0, hero: 0 }
  }),
  T('gorgoroth', 'گورگوروت', 732, 652, 'dark', 'mordor', {
    income: 4, fort: 3, barracks: true, capital: true, heroName: 'سائرون',
    desc: 'دشت خاکستر و باراد-دور، قلب تاریکی.',
    units: { inf: 6, arch: 3, cav: 0, hero: 1 }
  }),
  T('cirith_ungol', 'سیریث اونگول', 652, 632, 'dark', 'mordor', {
    fort: 1,
    desc: 'گذرگاه باریک کوه‌های سایه به سوی موردور.',
    units: { inf: 3, arch: 1, cav: 0, hero: 0 }
  }),
  T('nurn', 'نورن', 752, 700, 'dark', 'mordor', {
    income: 2,
    desc: 'دشت‌های کشاورزی جنوب موردور و بردگان آن.',
    units: { inf: 2, arch: 0, cav: 0, hero: 0 }
  }),
  T('harad', 'هاراد', 706, 736, 'dark', 'harad', {
    income: 2, barracks: true,
    desc: 'جنوب دور و لشکرهای هاراد با فیل‌های جنگی.',
    units: { inf: 3, arch: 1, cav: 2, hero: 0 }
  }),
  T('umbar', 'اومبار', 618, 746, 'dark', 'harad', {
    income: 2, fort: 1,
    desc: 'بندر دزدان دریایی و کشتی‌های سیاه.',
    units: { inf: 2, arch: 1, cav: 0, hero: 0 }
  }),
  T('minas_tirith', 'میناس تیریث', 506, 684, 'free', 'gondor', {
    income: 4, fort: 3, barracks: true, capital: true, heroName: 'آراگورن',
    desc: 'شهر سپید و دژ اصلی گندور در دامنه کوه‌های سفید.',
    units: { inf: 7, arch: 4, cav: 1, hero: 1 }
  }),
  T('ithilien', 'ایتیلیِن', 602, 638, 'free', 'gondor', {
    income: 2, fort: 1,
    desc: 'باغ‌های زیبای گندور در سایه موردور.',
    units: { inf: 3, arch: 3, cav: 0, hero: 0 }
  }),
  T('pelargir', 'پلارگیر', 548, 722, 'free', 'gondor', {
    income: 2, barracks: true,
    desc: 'بندر بزرگ گندور بر کرانه بلفالاس.',
    units: { inf: 2, arch: 1, cav: 0, hero: 0 }
  }),
  T('dol_amroth', 'دول آمروث', 440, 734, 'free', 'gondor', {
    income: 2, fort: 1,
    desc: 'شهر شاهزادگان سوان در ساحل جنوبی.',
    units: { inf: 4, arch: 2, cav: 1, hero: 0 }
  })
];

export const TERRITORY_MAP = Object.fromEntries(TERRITORIES.map(t => [t.id, t]));

const ADJ = {
  forodwaith: ['angmar', 'gundabad'],
  angmar: ['forodwaith', 'gundabad', 'lindon', 'rivendell'],
  gundabad: ['forodwaith', 'angmar', 'high_pass', 'mirkwood'],
  lindon: ['angmar', 'shire'],
  shire: ['lindon', 'bree'],
  bree: ['shire', 'rivendell', 'dunland'],
  rivendell: ['angmar', 'bree', 'high_pass', 'moria'],
  high_pass: ['gundabad', 'rivendell', 'moria', 'mirkwood'],
  moria: ['rivendell', 'high_pass', 'lorien', 'fangorn'],
  lorien: ['moria', 'fangorn', 'rohan_east'],
  mirkwood: ['gundabad', 'high_pass', 'erebor', 'lorien'],
  erebor: ['mirkwood', 'iron_hills', 'rhun'],
  iron_hills: ['erebor', 'rhun'],
  rhun: ['erebor', 'iron_hills', 'dagorlad'],
  fangorn: ['moria', 'lorien', 'isengard', 'rohan_west', 'rohan_east'],
  isengard: ['dunland', 'fangorn', 'rohan_west'],
  dunland: ['bree', 'isengard', 'rohan_west'],
  rohan_west: ['dunland', 'isengard', 'fangorn', 'edoras', 'rohan_east'],
  edoras: ['rohan_west', 'rohan_east', 'minas_tirith'],
  rohan_east: ['fangorn', 'lorien', 'edoras', 'rohan_west', 'brown_lands'],
  brown_lands: ['rohan_east', 'dagorlad', 'ithilien'],
  dagorlad: ['brown_lands', 'udun', 'rhun'],
  udun: ['dagorlad', 'gorgoroth', 'cirith_ungol'],
  gorgoroth: ['udun', 'cirith_ungol', 'nurn'],
  cirith_ungol: ['udun', 'gorgoroth', 'ithilien', 'nurn'],
  nurn: ['gorgoroth', 'cirith_ungol', 'harad'],
  harad: ['nurn', 'umbar', 'pelargir'],
  umbar: ['harad', 'pelargir', 'dol_amroth'],
  minas_tirith: ['ithilien', 'edoras', 'dol_amroth', 'pelargir'],
  ithilien: ['minas_tirith', 'brown_lands', 'cirith_ungol', 'pelargir'],
  pelargir: ['ithilien', 'minas_tirith', 'harad', 'umbar'],
  dol_amroth: ['minas_tirith', 'umbar']
};

for (const [id, list] of Object.entries(ADJ)) {
  for (const other of list) {
    if (!ADJ[other]) ADJ[other] = [];
    if (!ADJ[other].includes(id)) ADJ[other].push(id);
  }
}

export const ADJACENCY = ADJ;

export function adjacent(id) {
  return ADJ[id] || [];
}
