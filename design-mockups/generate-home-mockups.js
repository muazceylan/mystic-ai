const fs = require('fs');
const path = require('path');

const W = 393;
const H = 852;

function esc(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function attrs(obj = {}) {
  return Object.entries(obj)
    .filter(([, v]) => v !== undefined && v !== null && v !== false)
    .map(([k, v]) => `${k}="${esc(v)}"`)
    .join(' ');
}

function el(tag, a = {}, children = '') {
  const aStr = attrs(a);
  return children === ''
    ? `<${tag}${aStr ? ' ' + aStr : ''}/>`
    : `<${tag}${aStr ? ' ' + aStr : ''}>${children}</${tag}>`;
}

function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (1664525 * s + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function makeStars({ x, y, w, h, count, seed, color, minR = 0.35, maxR = 1.25, opacity = [0.2, 0.95] }) {
  const rnd = seeded(seed);
  const items = [];
  for (let i = 0; i < count; i += 1) {
    const cx = x + rnd() * w;
    const cy = y + rnd() * h;
    const r = minR + rnd() * (maxR - minR);
    const op = opacity[0] + rnd() * (opacity[1] - opacity[0]);
    items.push(el('circle', { cx: cx.toFixed(2), cy: cy.toFixed(2), r: r.toFixed(2), fill: color, opacity: op.toFixed(2) }));
    if (rnd() > 0.9) {
      const len = 1.6 + rnd() * 1.4;
      items.push(el('path', {
        d: `M ${cx.toFixed(2)} ${(cy - len).toFixed(2)} L ${cx.toFixed(2)} ${(cy + len).toFixed(2)} M ${(cx - len).toFixed(2)} ${cy.toFixed(2)} L ${(cx + len).toFixed(2)} ${cy.toFixed(2)}`,
        stroke: color,
        'stroke-width': 0.4,
        'stroke-linecap': 'round',
        opacity: (op * 0.75).toFixed(2),
      }));
    }
  }
  return items.join('');
}

function noiseDots({ count, seed, color, opacityMax = 0.06 }) {
  const rnd = seeded(seed);
  const items = [];
  for (let i = 0; i < count; i += 1) {
    const cx = rnd() * W;
    const cy = rnd() * H;
    const r = 0.4 + rnd() * 1.6;
    const op = 0.01 + rnd() * opacityMax;
    items.push(el('circle', { cx: cx.toFixed(2), cy: cy.toFixed(2), r: r.toFixed(2), fill: color, opacity: op.toFixed(3) }));
  }
  return items.join('');
}

function iconChevron(x, y, size, stroke, sw = 1.8, opacity = 1) {
  const s = size;
  return el('path', {
    d: `M ${x} ${y} l ${s} ${s} l ${-s} ${s}`,
    fill: 'none',
    stroke,
    'stroke-width': sw,
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    opacity,
  });
}

function iconBell(x, y, stroke) {
  return [
    el('path', { d: `M ${x + 6} ${y + 11} c 0 -4 2.6 -6.8 5.8 -6.8 s 5.8 2.8 5.8 6.8 c 0 3.8 1.4 5.2 2.2 6 H ${x + 3.8} c 0.8 -0.8 2.2 -2.2 2.2 -6 z`, fill: 'none', stroke, 'stroke-width': 1.7, 'stroke-linejoin': 'round' }),
    el('path', { d: `M ${x + 9.1} ${y + 17.7} q 2.7 2.8 5.4 0`, fill: 'none', stroke, 'stroke-width': 1.5, 'stroke-linecap': 'round' }),
  ].join('');
}

function iconSliders(x, y, stroke) {
  return [
    el('path', { d: `M ${x + 4} ${y + 6} H ${x + 15}`, stroke, 'stroke-width': 1.7, 'stroke-linecap': 'round' }),
    el('path', { d: `M ${x + 4} ${y + 12} H ${x + 15}`, stroke, 'stroke-width': 1.7, 'stroke-linecap': 'round' }),
    el('path', { d: `M ${x + 9} ${y + 18} H ${x + 15}`, stroke, 'stroke-width': 1.7, 'stroke-linecap': 'round' }),
    el('path', { d: `M ${x + 8.2} ${y + 5.9} a 2.2 2.2 0 1 0 0.01 0`, fill: 'none', stroke, 'stroke-width': 1.5 }),
    el('path', { d: `M ${x + 11.2} ${y + 11.9} a 2.2 2.2 0 1 0 0.01 0`, fill: 'none', stroke, 'stroke-width': 1.5 }),
    el('path', { d: `M ${x + 6.2} ${y + 17.9} a 2.2 2.2 0 1 0 0.01 0`, fill: 'none', stroke, 'stroke-width': 1.5 }),
  ].join('');
}

function iconPlus(x, y, stroke) {
  return el('path', { d: `M ${x + 8} ${y + 3} V ${y + 13} M ${x + 3} ${y + 8} H ${x + 13}`, stroke, 'stroke-width': 1.8, 'stroke-linecap': 'round' });
}

function iconHeart(x, y, fill) {
  return el('path', { d: `M ${x + 8} ${y + 14} L ${x + 2.8} ${y + 8.5} c -1.8 -1.9 -1.6 -4.9 0.3 -6.4 c 1.5 -1.2 3.5 -0.9 4.9 0.7 c 1.4 -1.6 3.4 -1.9 4.9 -0.7 c 1.9 1.5 2.1 4.5 0.3 6.4 z`, fill, opacity: 0.95 });
}

function iconCalendar(x, y, stroke) {
  return [
    el('rect', { x: x + 2.5, y: y + 4, width: 11, height: 10.5, rx: 2.2, fill: 'none', stroke, 'stroke-width': 1.5 }),
    el('path', { d: `M ${x + 5} ${y + 2.7} V ${y + 5.6} M ${x + 11} ${y + 2.7} V ${y + 5.6} M ${x + 2.7} ${y + 7.4} H ${x + 13.3}`, stroke, 'stroke-width': 1.4, 'stroke-linecap': 'round' }),
    el('circle', { cx: x + 6.1, cy: y + 10.8, r: 0.85, fill: stroke }),
    el('circle', { cx: x + 9.9, cy: y + 10.8, r: 0.85, fill: stroke }),
  ].join('');
}

function iconSparkle(x, y, stroke) {
  return [
    el('path', { d: `M ${x + 8} ${y + 1.8} L ${x + 9.4} ${y + 6.6} L ${x + 14.2} ${y + 8} L ${x + 9.4} ${y + 9.4} L ${x + 8} ${y + 14.2} L ${x + 6.6} ${y + 9.4} L ${x + 1.8} ${y + 8} L ${x + 6.6} ${y + 6.6} Z`, fill: 'none', stroke, 'stroke-width': 1.35, 'stroke-linejoin': 'round' }),
    el('path', { d: `M ${x + 12.2} ${y + 2.2} l 0.9 2.2 l 2.2 0.9 l -2.2 0.9 l -0.9 2.2 l -0.9 -2.2 l -2.2 -0.9 l 2.2 -0.9 z`, fill: stroke, opacity: 0.85 }),
  ].join('');
}

function iconTrend(x, y, stroke, fillBg) {
  return [
    el('circle', { cx: x + 8, cy: y + 8, r: 8, fill: fillBg, opacity: 0.22 }),
    el('path', { d: `M ${x + 4} ${y + 11} l 3 -3 l 2.2 2.2 l 3.6 -3.6 M ${x + 10.8} ${y + 4.6} h 3.2 v 3.2`, fill: 'none', stroke, 'stroke-width': 1.65, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
  ].join('');
}

function iconFlower(x, y, stroke, fillBg) {
  return [
    el('circle', { cx: x + 8, cy: y + 8, r: 8, fill: fillBg, opacity: 0.24 }),
    el('circle', { cx: x + 7.2, cy: y + 8, r: 1.3, fill: 'none', stroke, 'stroke-width': 1.2 }),
    el('path', { d: `M ${x + 7.2} ${y + 6.1} c 0 -1.2 1.6 -1.8 2.2 -0.8 c 0.6 1 -0.3 1.6 -1.1 1.9 M ${x + 5.4} ${y + 7.8} c -1.2 0 -1.8 1.6 -0.8 2.2 c 1 0.6 1.6 -0.3 1.9 -1.1 M ${x + 8.8} ${y + 9.8} c 0 1.2 1.6 1.8 2.2 0.8 c 0.6 -1 -0.3 -1.6 -1.1 -1.9`, fill: 'none', stroke, 'stroke-width': 1.05, 'stroke-linecap': 'round' }),
    el('path', { d: `M ${x + 9.6} ${y + 8.6} q 2.4 2.1 2.4 4.5`, fill: 'none', stroke, 'stroke-width': 1.1, 'stroke-linecap': 'round' }),
  ].join('');
}

function iconCoin(x, y, stroke, fillBg) {
  return [
    el('circle', { cx: x + 8, cy: y + 8, r: 8, fill: fillBg, opacity: 0.22 }),
    el('path', { d: `M ${x + 5.1} ${y + 5.6} c 1.2 0 1.9 0.7 1.9 1.5 c 0 0.9 -0.8 1.4 -1.9 1.7 c -1 0.2 -1.6 0.6 -1.6 1.3 c 0 0.7 0.7 1.3 1.8 1.3 c 0.8 0 1.4 -0.2 1.9 -0.5 M ${x + 6.2} ${y + 4.7} v 1 M ${x + 6.2} ${y + 11.9} v 1.1`, fill: 'none', stroke, 'stroke-width': 1.2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
    el('path', { d: `M ${x + 9.6} ${y + 6.2} c 1.8 1.1 2.7 2.3 2.8 4.1`, fill: 'none', stroke, 'stroke-width': 1.15, 'stroke-linecap': 'round', opacity: 0.9 }),
  ].join('');
}

function iconBolt(x, y, fill) {
  return el('path', { d: `M ${x + 8.7} ${y + 2.1} L ${x + 4.8} ${y + 8.4} h 2.8 l -1.1 5.5 l 5.1 -7.4 H ${x + 8.9} z`, fill });
}
function iconStarBadge(x, y, fill) {
  return el('path', { d: `M ${x + 8} ${y + 2} l 1.4 4.6 l 4.6 1.4 l -4.6 1.4 l -1.4 4.6 l -1.4 -4.6 l -4.6 -1.4 l 4.6 -1.4 z`, fill });
}
function iconWarn(x, y, stroke) {
  return [
    el('path', { d: `M ${x + 8} ${y + 2.1} a 5.9 5.9 0 1 0 0.01 0`, fill: 'none', stroke, 'stroke-width': 1.4 }),
    el('path', { d: `M ${x + 5.4} ${y + 5.4} L ${x + 10.6} ${y + 10.6}`, stroke, 'stroke-width': 1.4, 'stroke-linecap': 'round' }),
  ].join('');
}
function iconTriangle(x, y, fill) {
  return [
    el('path', { d: `M ${x + 8} ${y + 2.2} L ${x + 13.6} ${y + 13.2} H ${x + 2.4} Z`, fill }),
    el('rect', { x: x + 7.4, y: y + 5.3, width: 1.2, height: 4.4, rx: 0.6, fill: '#fff', opacity: 0.92 }),
    el('circle', { cx: x + 8, cy: y + 11.4, r: 0.7, fill: '#fff', opacity: 0.92 }),
  ].join('');
}

function tabIcon(type, x, y, stroke, fill, active) {
  const sw = active ? 1.9 : 1.7;
  if (type === 'home') {
    return [
      el('path', { d: `M ${x + 2.6} ${y + 8.6} L ${x + 8} ${y + 4} l 5.4 4.6`, fill: 'none', stroke, 'stroke-width': sw, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
      el('path', { d: `M ${x + 4.1} ${y + 8.4} v 5.4 c 0 0.7 0.5 1.2 1.2 1.2 h 5.4 c 0.7 0 1.2 -0.5 1.2 -1.2 V ${y + 8.4}`, fill: active ? fill : 'none', opacity: active ? 0.22 : 1, stroke, 'stroke-width': sw, 'stroke-linejoin': 'round' }),
    ].join('');
  }
  if (type === 'calendar') return iconCalendar(x, y + 1, stroke);
  if (type === 'dream') {
    return [
      el('path', { d: `M ${x + 9.8} ${y + 3.4} c -2.4 0.4 -4.4 2.5 -4.6 5.4 c -0.2 2.5 1.2 4.5 3.1 5.6 c -3.3 0.2 -6.1 -2.5 -6.1 -5.9 c 0 -3.5 2.8 -6.4 6.2 -6.4 c 0.5 0 1 0.1 1.4 0.2 z`, fill: 'none', stroke, 'stroke-width': 1.7, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
      el('path', { d: `M ${x + 11.3} ${y + 4.1} l 0.6 1.6 l 1.6 0.6 l -1.6 0.6 l -0.6 1.6 l -0.6 -1.6 l -1.6 -0.6 l 1.6 -0.6 z`, fill: stroke, opacity: 0.9 }),
    ].join('');
  }
  if (type === 'match') return iconSparkle(x, y + 1, stroke);
  if (type === 'chart') {
    return [
      el('ellipse', { cx: x + 8, cy: y + 9, rx: 6.3, ry: 5.4, fill: 'none', stroke, 'stroke-width': 1.5 }),
      el('path', { d: `M ${x + 3.7} ${y + 5.8} c 2.3 1.5 4.4 4.2 8.6 6.4`, fill: 'none', stroke, 'stroke-width': 1.3, 'stroke-linecap': 'round' }),
      el('path', { d: `M ${x + 12.5} ${y + 3.7} c -1.7 2.5 -4.3 5 -6.9 7.3`, fill: 'none', stroke, 'stroke-width': 1.3, 'stroke-linecap': 'round' }),
    ].join('');
  }
  if (type === 'profile') {
    return [
      el('circle', { cx: x + 8, cy: y + 6.5, r: 2.6, fill: 'none', stroke, 'stroke-width': 1.5 }),
      el('path', { d: `M ${x + 3.2} ${y + 14.2} c 0.9 -2.8 3 -4 4.8 -4 s 3.9 1.2 4.8 4`, fill: 'none', stroke, 'stroke-width': 1.5, 'stroke-linecap': 'round' }),
    ].join('');
  }
  return '';
}

const layout = {
  contentX: 20,
  contentW: 353,
  hero: { x: 20, y: 116, w: 353, h: 146, r: 20 },
  quick: { x: 20, y: 272, w: 353, h: 36, gap: 8, r: 18 },
  daily: { x: 20, y: 318, w: 353, h: 100, r: 20 },
  compass: { x: 20, y: 428, w: 353, h: 126, r: 20 },
  weekly: { x: 20, y: 564, w: 353, h: 166, r: 20 },
  footerPill: { x: 145, y: 736, w: 103, h: 18, r: 9 },
  tabbar: { x: 8, y: 758, w: 377, h: 70, r: 24 },
  homeIndicator: { x: 146.5, y: 836, w: 100, h: 4, r: 2 },
};

const themes = {
  light: {
    file: 'home-light.svg',
    title: 'Home — Light',
    bgGradient: ['#FFFFFF', '#F6F3FF', '#F2EEFF'],
    bgAccent: '#B49BFF',
    bgNoise: '#6F5ACD',
    statusText: '#1C2133',
    statusMuted: '#1C2133',
    island: '#0B0D14',
    topText: '#1B2031',
    topSub: '#76708E',
    avatarRing: 'rgba(129,97,234,0.14)',
    avatarFillA: '#F3F0FF',
    avatarFillB: '#EDEAF9',
    iconBtnFill: 'rgba(248,246,255,0.94)',
    iconBtnStroke: '#E9E5F5',
    iconBtnIcon: '#625C79',
    cardFill: '#FFFFFF',
    cardStroke: '#ECE8F7',
    cardStrokeSoft: '#EEEAF8',
    rowFill: '#FBFAFF',
    rowStroke: '#EDEAF7',
    shadowFilter: 'cardShadowLight',
    softShadowFilter: 'chipShadowLight',
    heroTitle: '#FCFBFF',
    heroSub: 'rgba(244,240,255,0.9)',
    heroBody: 'rgba(246,242,255,0.88)',
    heroPillFill: 'rgba(248,244,255,0.92)',
    heroPillText: '#6A57D8',
    heroOverlay: 'rgba(10,10,28,0.22)',
    accent: '#7A5BEA',
    accent2: '#9A7DFF',
    accentSoft: '#F0EAFF',
    text: '#1B2031',
    text2: '#706C86',
    text3: '#8D89A2',
    divider: '#F0EDF7',
    scoreChipFill: '#F4F0FF',
    scoreChipText: '#6C59D6',
    scoreChipSub: '#7B7398',
    chipCareerFill: '#F3EEFF',
    chipCareerText: '#5C4FC2',
    chipEmotionFill: '#EEF8F4',
    chipEmotionText: '#2D7665',
    chipRiskFill: '#FBF2EA',
    chipRiskText: '#996440',
    weeklyHighFill: '#F7F0E2',
    weeklyHighText: '#A1711F',
    weeklyMidFill: '#F6EEE4',
    weeklyMidText: '#8B6A39',
    weeklyRiskFill: '#F7EEF1',
    weeklyRiskText: '#9A5669',
    oraclePillFill: 'rgba(255,255,255,0.86)',
    oraclePillStroke: '#ECE9F6',
    oracleDot: '#57B49A',
    tabFill: 'rgba(255,255,255,0.82)',
    tabStroke: '#E7E4F2',
    tabTopLine: 'rgba(255,255,255,0.65)',
    tabIcon: '#76718E',
    tabLabel: '#6E6988',
    tabActiveIcon: '#7D5EEA',
    tabActiveLabel: '#6F52DF',
    tabActiveBg: '#F2ECFF',
    glassHighlight: 'rgba(255,255,255,0.75)',
    heroMoonGlow: 'rgba(215,200,255,0.45)',
    heroNebula1: 'rgba(163,127,255,0.28)',
    heroNebula2: 'rgba(114,132,255,0.22)',
  },
  dark: {
    file: 'home-dark.svg',
    title: 'Home — Dark',
    bgGradient: ['#090E19', '#111523', '#171A27'],
    bgAccent: '#7F6BEA',
    bgNoise: '#D5C6FF',
    statusText: '#EEF0F8',
    statusMuted: '#EEF0F8',
    island: '#05070D',
    topText: '#F2F4FA',
    topSub: '#A49DBE',
    avatarRing: 'rgba(166,145,255,0.22)',
    avatarFillA: 'rgba(255,255,255,0.08)',
    avatarFillB: 'rgba(255,255,255,0.03)',
    iconBtnFill: 'rgba(255,255,255,0.04)',
    iconBtnStroke: 'rgba(255,255,255,0.08)',
    iconBtnIcon: '#D8D3EE',
    cardFill: 'rgba(18,23,34,0.72)',
    cardStroke: 'rgba(255,255,255,0.08)',
    cardStrokeSoft: 'rgba(255,255,255,0.06)',
    rowFill: 'rgba(255,255,255,0.03)',
    rowStroke: 'rgba(255,255,255,0.05)',
    shadowFilter: 'cardShadowDark',
    softShadowFilter: 'chipShadowDark',
    heroTitle: '#FAFBFF',
    heroSub: 'rgba(234,230,255,0.9)',
    heroBody: 'rgba(224,220,242,0.9)',
    heroPillFill: 'rgba(255,255,255,0.12)',
    heroPillText: '#DCCEFF',
    heroOverlay: 'rgba(0,0,0,0.32)',
    accent: '#B494FF',
    accent2: '#8E73FF',
    accentSoft: 'rgba(180,148,255,0.14)',
    text: '#EFF2F9',
    text2: '#B1AAC9',
    text3: '#928CA8',
    divider: 'rgba(255,255,255,0.05)',
    scoreChipFill: 'rgba(180,148,255,0.14)',
    scoreChipText: '#CFBBFF',
    scoreChipSub: '#B8B0CF',
    chipCareerFill: 'rgba(180,148,255,0.14)',
    chipCareerText: '#CFBBFF',
    chipEmotionFill: 'rgba(96,187,161,0.12)',
    chipEmotionText: '#9FE3CD',
    chipRiskFill: 'rgba(146,89,112,0.18)',
    chipRiskText: '#E4B8C7',
    weeklyHighFill: 'rgba(174,128,50,0.16)',
    weeklyHighText: '#F1D7A4',
    weeklyMidFill: 'rgba(169,128,83,0.14)',
    weeklyMidText: '#E7CCAE',
    weeklyRiskFill: 'rgba(132,70,94,0.2)',
    weeklyRiskText: '#E5B6C6',
    oraclePillFill: 'rgba(18,23,34,0.7)',
    oraclePillStroke: 'rgba(255,255,255,0.08)',
    oracleDot: '#56C4A8',
    tabFill: 'rgba(17,22,33,0.68)',
    tabStroke: 'rgba(255,255,255,0.08)',
    tabTopLine: 'rgba(255,255,255,0.08)',
    tabIcon: '#A59EBB',
    tabLabel: '#9E98B7',
    tabActiveIcon: '#C5ADFF',
    tabActiveLabel: '#D2C0FF',
    tabActiveBg: 'rgba(180,148,255,0.14)',
    glassHighlight: 'rgba(255,255,255,0.08)',
    heroMoonGlow: 'rgba(180,148,255,0.35)',
    heroNebula1: 'rgba(136,100,255,0.24)',
    heroNebula2: 'rgba(99,139,255,0.18)',
  },
};

function heroArt(theme, hero) {
  const dark = theme.file.includes('dark');
  const key = theme.file.replace(/[^a-z0-9]/gi, '');
  const stars = makeStars({
    x: hero.x,
    y: hero.y,
    w: hero.w,
    h: hero.h,
    count: dark ? 126 : 112,
    seed: 112233,
    color: '#FFFFFF',
    minR: 0.18,
    maxR: 1.05,
    opacity: dark ? [0.22, 0.98] : [0.16, 0.9],
  });
  const starBursts = makeStars({
    x: hero.x + 18,
    y: hero.y + 10,
    w: hero.w - 36,
    h: hero.h - 20,
    count: 18,
    seed: 334455,
    color: dark ? '#EDE4FF' : '#FFFFFF',
    minR: 0.55,
    maxR: 1.4,
    opacity: [0.25, 0.72],
  });
  const moonX = hero.x + hero.w - 72;
  const moonY = hero.y + 58;
  const moonR = 33.5;
  const moonCraterData = [
    [moonX - 8.2, moonY - 11.2, 4.9, 0.14],
    [moonX + 8.8, moonY - 8.4, 5.4, 0.12],
    [moonX - 13.0, moonY + 4.6, 6.4, 0.14],
    [moonX + 5.4, moonY + 8.7, 4.3, 0.14],
    [moonX - 0.6, moonY - 0.2, 8.4, 0.1],
    [moonX + 13.8, moonY + 1.4, 3.7, 0.12],
    [moonX - 17.0, moonY - 2.4, 3.1, 0.1],
    [moonX + 2.2, moonY + 14.1, 3.6, 0.1],
  ];
  const moonCraters = moonCraterData.map(([cx, cy, r, op], i) => [
    el('circle', { cx, cy, r, fill: i % 2 ? '#C8C4DA' : '#B9B4CF', opacity: op }),
    el('circle', { cx, cy, r: (r - 0.8).toFixed(2), fill: 'none', stroke: 'rgba(255,255,255,0.10)', 'stroke-width': 0.6, opacity: (op * 1.4).toFixed(2) }),
  ].join('')).join('');
  const moonMaria = [
    el('ellipse', { cx: moonX - 3.2, cy: moonY - 2.0, rx: 10.2, ry: 8.2, fill: 'rgba(119,118,142,0.14)' }),
    el('ellipse', { cx: moonX + 8.7, cy: moonY + 10.1, rx: 6.5, ry: 4.4, fill: 'rgba(110,109,136,0.12)' }),
    el('ellipse', { cx: moonX - 11.6, cy: moonY + 8.2, rx: 5.6, ry: 4.1, fill: 'rgba(108,108,134,0.11)' }),
  ].join('');

  return [
    el('defs', {}, [
      el('linearGradient', { id: `heroBg-${key}`, x1: 0, y1: 0, x2: 1, y2: 1 }, [
        el('stop', { offset: '0%', 'stop-color': '#050814' }),
        el('stop', { offset: '46%', 'stop-color': dark ? '#090F29' : '#090F26' }),
        el('stop', { offset: '100%', 'stop-color': dark ? '#191633' : '#15132F' }),
      ].join('')),
      el('radialGradient', { id: `heroRightBloom-${key}`, cx: '82%', cy: '62%', r: '58%' }, [
        el('stop', { offset: '0%', 'stop-color': dark ? 'rgba(149,115,255,0.18)' : 'rgba(156,124,255,0.22)' }),
        el('stop', { offset: '100%', 'stop-color': 'rgba(149,115,255,0.0)' }),
      ].join('')),
      el('radialGradient', { id: `moon-${key}`, cx: '40%', cy: '34%', r: '78%' }, [
        el('stop', { offset: '0%', 'stop-color': '#FFFDF7' }),
        el('stop', { offset: '34%', 'stop-color': '#F2EFF7' }),
        el('stop', { offset: '68%', 'stop-color': '#D7D2E4' }),
        el('stop', { offset: '100%', 'stop-color': '#AFA8C2' }),
      ].join('')),
      el('radialGradient', { id: `moonGlow-${key}`, cx: '50%', cy: '50%', r: '56%' }, [
        el('stop', { offset: '0%', 'stop-color': theme.heroMoonGlow, 'stop-opacity': dark ? 0.48 : 0.58 }),
        el('stop', { offset: '55%', 'stop-color': theme.heroMoonGlow, 'stop-opacity': dark ? 0.16 : 0.2 }),
        el('stop', { offset: '100%', 'stop-color': theme.heroMoonGlow, 'stop-opacity': 0 }),
      ].join('')),
      el('linearGradient', { id: `heroLeftFade-${key}`, x1: 0, y1: 0, x2: 1, y2: 0 }, [
        el('stop', { offset: '0%', 'stop-color': 'rgba(4,7,20,0.78)' }),
        el('stop', { offset: '45%', 'stop-color': 'rgba(6,9,22,0.54)' }),
        el('stop', { offset: '72%', 'stop-color': 'rgba(7,10,25,0.18)' }),
        el('stop', { offset: '100%', 'stop-color': 'rgba(7,10,25,0.0)' }),
      ].join('')),
      el('linearGradient', { id: `heroVignette-${key}`, x1: 0, y1: 0, x2: 0, y2: 1 }, [
        el('stop', { offset: '0%', 'stop-color': 'rgba(255,255,255,0.02)' }),
        el('stop', { offset: '60%', 'stop-color': 'rgba(0,0,0,0.0)' }),
        el('stop', { offset: '100%', 'stop-color': 'rgba(0,0,0,0.24)' }),
      ].join('')),
      el('filter', { id: `heroGlowBlur-${key}`, x: '-60%', y: '-60%', width: '220%', height: '220%' }, [
        el('feGaussianBlur', { stdDeviation: 10 }),
      ].join('')),
      el('clipPath', { id: `moonClip-${key}` }, el('circle', { cx: moonX, cy: moonY, r: moonR })),
    ].join('')),
    el('g', { 'clip-path': 'url(#heroClip)' }, [
      el('rect', { x: hero.x, y: hero.y, width: hero.w, height: hero.h, fill: `url(#heroBg-${key})` }),
      el('circle', { cx: hero.x + hero.w - 92, cy: hero.y + 116, r: 92, fill: theme.heroNebula1, filter: `url(#heroGlowBlur-${key})` }),
      el('circle', { cx: hero.x + 258, cy: hero.y + 70, r: 58, fill: theme.heroNebula2, filter: 'url(#nebulaBlur)' }),
      el('circle', { cx: hero.x + 110, cy: hero.y + 128, r: 50, fill: dark ? 'rgba(113,99,226,0.10)' : 'rgba(96,84,200,0.08)', filter: 'url(#nebulaBlur)' }),
      el('rect', { x: hero.x, y: hero.y, width: hero.w, height: hero.h, fill: `url(#heroRightBloom-${key})` }),
      stars,
      starBursts,
      el('circle', { cx: moonX, cy: moonY, r: moonR + 22, fill: `url(#moonGlow-${key})` }),
      el('circle', { cx: moonX, cy: moonY, r: moonR, fill: `url(#moon-${key})` }),
      el('g', { 'clip-path': `url(#moonClip-${key})` }, [
        moonMaria,
        moonCraters,
        el('circle', { cx: moonX - 16.5, cy: moonY + 0.8, r: moonR + 0.8, fill: 'rgba(18,20,30,0.36)' }),
        el('ellipse', { cx: moonX - 7.8, cy: moonY, rx: 22.2, ry: 31.8, fill: 'rgba(255,255,255,0.05)' }),
        el('ellipse', { cx: moonX - 12.8, cy: moonY, rx: 17.4, ry: 30.5, fill: 'rgba(9,11,19,0.16)' }),
        el('ellipse', { cx: moonX + 9.4, cy: moonY - 5.4, rx: 8.3, ry: 5.6, fill: 'rgba(255,255,255,0.08)' }),
      ].join('')),
      el('circle', { cx: moonX, cy: moonY, r: moonR, fill: 'none', stroke: 'rgba(255,255,255,0.16)', 'stroke-width': 0.9 }),
      el('path', {
        d: `M ${moonX + 2} ${moonY - 24} q 15 10 13 28`,
        stroke: 'rgba(255,255,255,0.14)',
        'stroke-width': 1.2,
        fill: 'none',
        'stroke-linecap': 'round',
      }),
      el('circle', { cx: moonX + 11.6, cy: moonY - 9.2, r: 2.1, fill: 'rgba(255,255,255,0.26)' }),
      el('circle', { cx: moonX + 4.2, cy: moonY + 13.5, r: 1.4, fill: 'rgba(255,255,255,0.18)' }),
      el('rect', { x: hero.x, y: hero.y, width: hero.w, height: hero.h, fill: `url(#heroLeftFade-${key})`, opacity: 0.97 }),
      el('rect', { x: hero.x, y: hero.y, width: hero.w, height: hero.h, fill: `url(#heroVignette-${key})`, opacity: 1 }),
      el('rect', { x: hero.x, y: hero.y, width: hero.w, height: hero.h, fill: 'none', stroke: dark ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.12)' }),
      el('path', { d: `M ${hero.x + 5} ${hero.y + 3} H ${hero.x + hero.w - 5}`, stroke: 'rgba(255,255,255,0.16)', 'stroke-width': 0.9, 'stroke-linecap': 'round' }),
      el('path', { d: `M ${hero.x + 10} ${hero.y + hero.h - 1.8} H ${hero.x + hero.w - 10}`, stroke: 'rgba(255,255,255,0.06)', 'stroke-width': 1, 'stroke-linecap': 'round' }),
    ].join('')),
  ].join('');
}

function t(x, y, text, options = {}) {
  const { size = 12, weight = 500, fill = '#000', anchor = 'start', opacity, letterSpacing, family, baseline = 'middle' } = options;
  return el('text', {
    x,
    y,
    fill,
    'font-family': family || "SF Pro Display, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    'font-size': size,
    'font-weight': weight,
    'text-anchor': anchor,
    'dominant-baseline': baseline,
    opacity,
    'letter-spacing': letterSpacing,
  }, esc(text));
}

function textPair(x, y, left, right, theme, rightFill, opts = {}) {
  const { size = 10, leftWeight = 500, rightWeight = 600 } = opts;
  return [
    t(x, y, left, { size, weight: leftWeight, fill: theme.text3 }),
    t(x + 33, y, right, { size, weight: rightWeight, fill: rightFill || theme.text }),
  ].join('');
}

function drawStatusBar(theme) {
  return [
    el('rect', { x: 126, y: 6, width: 141, height: 31, rx: 15.5, fill: theme.island }),
    t(31, 22, '9:41', { size: 11.5, weight: 600, fill: theme.statusText, baseline: 'alphabetic' }),
    el('path', { d: 'M 336 15 h 3 M 341 13 h 3 M 346 11 h 3', stroke: theme.statusMuted, 'stroke-width': 1.8, 'stroke-linecap': 'round' }),
    el('path', { d: 'M 353 15 h 8 l -1.8 -2.2 m 1.8 2.2 l -1.8 2.2', stroke: theme.statusMuted, 'stroke-width': 1.4, fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
    el('rect', { x: 365, y: 11.2, width: 18, height: 9.6, rx: 2.7, fill: 'none', stroke: theme.statusMuted, 'stroke-width': 1.3 }),
    el('rect', { x: 367.1, y: 13.2, width: 10.8, height: 5.6, rx: 1.4, fill: theme.statusMuted, opacity: 0.9 }),
    el('rect', { x: 383.4, y: 14.1, width: 1.7, height: 3.8, rx: 0.85, fill: theme.statusMuted, opacity: 0.9 }),
  ].join('');
}

function drawTopBar(theme) {
  const dark = theme.file.includes('dark');
  const topY = 52;
  const btnY = 47;
  return [
    el('g', { filter: `url(#${theme.softShadowFilter})` }, [
      el('circle', { cx: 38, cy: topY + 16, r: 16, fill: `url(#avatarGrad-${theme.file})`, stroke: theme.avatarRing, 'stroke-width': 1 }),
      el('circle', { cx: 38, cy: topY + 16, r: 15.1, fill: 'none', stroke: dark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.65)', 'stroke-width': 0.8 }),
      el('circle', { cx: 38, cy: topY + 12.3, r: 4.1, fill: theme.topSub, opacity: 0.55 }),
      el('path', { d: `M 31 ${topY + 23.8} c 1.8 -4.6 4.4 -5.8 7 -5.8 s 5.2 1.2 7 5.8`, fill: 'none', stroke: theme.topSub, 'stroke-width': 1.4, opacity: 0.55, 'stroke-linecap': 'round' }),
      el('circle', { cx: 304, cy: btnY + 18, r: 18, fill: theme.iconBtnFill, stroke: theme.iconBtnStroke, 'stroke-width': 1 }),
      el('circle', { cx: 348, cy: btnY + 18, r: 18, fill: theme.iconBtnFill, stroke: theme.iconBtnStroke, 'stroke-width': 1 }),
      el('path', { d: `M 288 ${btnY + 5.2} q 16 -4 32 0`, stroke: dark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.75)', 'stroke-width': 0.8, opacity: 0.9, 'stroke-linecap': 'round' }),
      el('path', { d: `M 332 ${btnY + 5.2} q 16 -4 32 0`, stroke: dark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.75)', 'stroke-width': 0.8, opacity: 0.9, 'stroke-linecap': 'round' }),
      iconSliders(295, btnY + 8.2, theme.iconBtnIcon),
      iconBell(339, btnY + 7.8, theme.iconBtnIcon),
    ].join('')),
    t(60, topY + 17, 'Muaz', { size: 17, weight: 700, fill: theme.topText }),
    t(20, 101, '25 Şub • Balık ☾ İkizler', { size: 9.7, weight: 550, fill: theme.topSub, baseline: 'alphabetic', letterSpacing: 0.1 }),
  ].join('');
}

function drawQuickActions(theme) {
  const dark = theme.file.includes('dark');
  const q = layout.quick;
  const items = [
    { label: 'Rüya Ekle', icon: (x, y) => iconPlus(x, y, theme.accent) },
    { label: 'Uyum', icon: (x, y) => iconHeart(x, y, theme.accent) },
    { label: 'Planlayıcı', icon: (x, y) => iconCalendar(x, y, theme.accent) },
    { label: 'Haritam', icon: (x, y) => iconSparkle(x, y, theme.accent) },
  ];
  const w = (q.w - q.gap * 3) / 4;
  return items.map((item, i) => {
    const x = q.x + i * (w + q.gap);
    const activeTone = i === 0 ? (dark ? 0.12 : 0.08) : 0;
    const iconCx = x + 17;
    const iconCy = q.y + 18;
    return el('g', { filter: `url(#${theme.softShadowFilter})` }, [
      el('rect', { x, y: q.y, width: w, height: q.h, rx: q.r, fill: dark ? 'rgba(17,23,34,0.66)' : theme.cardFill, stroke: theme.cardStrokeSoft, 'stroke-width': 1 }),
      el('path', { d: `M ${x + 10} ${q.y + 1.1} H ${x + w - 10}`, stroke: dark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.92)', 'stroke-width': 0.8, 'stroke-linecap': 'round', opacity: 0.9 }),
      activeTone ? el('rect', { x, y: q.y, width: w, height: q.h, rx: q.r, fill: theme.accent, opacity: activeTone }) : '',
      el('circle', { cx: iconCx, cy: iconCy, r: 9.2, fill: dark ? 'rgba(180,148,255,0.10)' : 'rgba(122,91,234,0.08)', stroke: dark ? 'rgba(180,148,255,0.20)' : 'rgba(122,91,234,0.12)', 'stroke-width': 0.8 }),
      item.icon(x + 9.2, q.y + 9.8),
      t(x + 31.5, q.y + 18.5, item.label, { size: item.label.length > 8 ? 8.9 : 9.1, weight: 650, fill: theme.text, baseline: 'middle' }),
    ].join(''));
  }).join('');
}

function drawDaily(theme) {
  const dark = theme.file.includes('dark');
  const c = layout.daily;
  const chipY = c.y + 71;
  return el('g', { filter: `url(#${theme.shadowFilter})` }, [
    el('rect', { x: c.x, y: c.y, width: c.w, height: c.h, rx: c.r, fill: theme.cardFill, stroke: theme.cardStroke, 'stroke-width': 1 }),
    el('path', { d: `M ${c.x + 14} ${c.y + 1.1} H ${c.x + c.w - 14}`, stroke: dark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.95)', 'stroke-width': 0.9, 'stroke-linecap': 'round', opacity: 0.95 }),
    t(c.x + 16, c.y + 22, 'Günlük Özet', { size: 15, weight: 700, fill: theme.text }),
    el('rect', { x: c.x + c.w - 84, y: c.y + 10, width: 68, height: 26, rx: 13, fill: theme.scoreChipFill, stroke: theme.cardStrokeSoft, 'stroke-width': 0.6 }),
    dark ? el('rect', { x: c.x + c.w - 84, y: c.y + 10, width: 68, height: 26, rx: 13, fill: 'rgba(180,148,255,0.08)' }) : '',
    t(c.x + c.w - 65, c.y + 23, '57', { size: 13.5, weight: 700, fill: theme.scoreChipText }),
    t(c.x + c.w - 40, c.y + 23.5, 'Genel', { size: 8.8, weight: 600, fill: theme.scoreChipSub }),
    t(c.x + 16, c.y + 47, 'Tema:', { size: 9.2, weight: 600, fill: theme.text3 }),
    t(c.x + 42, c.y + 47, 'Değişim rüzgarları', { size: 9.7, weight: 600, fill: theme.text2 }),
    t(c.x + 16, c.y + 61, 'Öneri:', { size: 9.2, weight: 600, fill: theme.text3 }),
    t(c.x + 48, c.y + 61, 'Cesaretle hareket et', { size: 9.7, weight: 600, fill: theme.text2 }),
    el('path', { d: `M ${c.x + 14} ${c.y + 68.5} H ${c.x + c.w - 34}`, stroke: theme.divider, 'stroke-width': 1 }),
    el('g', {}, [
      el('rect', { x: c.x + 16, y: chipY, width: 95, height: 16, rx: 8, fill: theme.chipCareerFill, stroke: dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', 'stroke-width': 0.6 }),
      t(c.x + 23, chipY + 8.4, 'Odak: Kariyer', { size: 8.2, weight: 650, fill: theme.chipCareerText }),
      el('rect', { x: c.x + 117, y: chipY, width: 87, height: 16, rx: 8, fill: theme.chipEmotionFill, stroke: dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', 'stroke-width': 0.6 }),
      t(c.x + 124, chipY + 8.4, 'Duygu: Sakin', { size: 8.2, weight: 650, fill: theme.chipEmotionText }),
      el('rect', { x: c.x + 210, y: chipY, width: 79, height: 16, rx: 8, fill: theme.chipRiskFill, stroke: dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', 'stroke-width': 0.6 }),
      t(c.x + 217, chipY + 8.4, 'Risk: Orta', { size: 8.2, weight: 650, fill: theme.chipRiskText }),
    ].join('')),
    iconChevron(c.x + c.w - 21, c.y + 48, 4.3, theme.text3, 1.6, 0.95),
  ].join(''));
}

function drawCompass(theme) {
  const dark = theme.file.includes('dark');
  const c = layout.compass;
  const rows = [
    { label: 'Kariyer & İş', score: '65', icon: (x, y) => iconTrend(x, y, theme.accent, theme.accent), tone: theme.chipCareerFill, iconColor: theme.accent },
    { label: 'Güzellik & Bakım', score: '65', icon: (x, y) => iconFlower(x, y, '#D28EC6', '#F0CFE6'), tone: 'rgba(210,142,198,0.12)', iconColor: '#D28EC6' },
    { label: 'Finans', score: '36', icon: (x, y) => iconCoin(x, y, '#E0B94C', '#F6E39E'), tone: 'rgba(224,185,76,0.12)', iconColor: '#E0B94C' },
  ];
  const rowY0 = c.y + 36;
  return el('g', { filter: `url(#${theme.shadowFilter})` }, [
    el('rect', { x: c.x, y: c.y, width: c.w, height: c.h, rx: c.r, fill: theme.cardFill, stroke: theme.cardStroke, 'stroke-width': 1 }),
    el('path', { d: `M ${c.x + 14} ${c.y + 1.1} H ${c.x + c.w - 14}`, stroke: dark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.95)', 'stroke-width': 0.9, 'stroke-linecap': 'round', opacity: 0.95 }),
    t(c.x + 16, c.y + 20, 'Karar Pusulası', { size: 15, weight: 700, fill: theme.text }),
    t(c.x + c.w - 21, c.y + 20, 'Tümünü gör', { size: 9.2, weight: 600, fill: theme.accent, anchor: 'end' }),
    iconChevron(c.x + c.w - 16, c.y + 15.5, 3.8, theme.accent, 1.5),
    rows.map((row, i) => {
      const y = rowY0 + i * 29;
      return [
        el('rect', { x: c.x + 12, y, width: c.w - 24, height: 22, rx: 11, fill: theme.rowFill, stroke: theme.rowStroke, 'stroke-width': 1 }),
        el('path', { d: `M ${c.x + 20} ${y + 1.1} H ${c.x + c.w - 32}`, stroke: dark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.9)', 'stroke-width': 0.7, 'stroke-linecap': 'round', opacity: 0.8 }),
        row.icon(c.x + 21, y + 3),
        t(c.x + 48, y + 11.5, row.label, { size: 9.7, weight: 600, fill: theme.text }),
        el('rect', { x: c.x + c.w - 58, y: y + 4.2, width: 26, height: 14, rx: 7, fill: dark ? 'rgba(255,255,255,0.03)' : 'rgba(124,106,205,0.05)', stroke: dark ? 'rgba(255,255,255,0.05)' : 'rgba(124,106,205,0.07)', 'stroke-width': 0.5 }),
        t(c.x + c.w - 45, y + 11.5, row.score, { size: 8.9, weight: 700, fill: i === 2 ? theme.chipRiskText : theme.text, anchor: 'middle' }),
        iconChevron(c.x + c.w - 18, y + 7.2, 3.4, theme.text3, 1.4),
      ].join('');
    }).join(''),
  ].join(''));
}

function drawWeekly(theme) {
  const dark = theme.file.includes('dark');
  const c = layout.weekly;
  const rows = [
    { title: 'İçsel Güç', badge: 'Yüksek', badgeFill: theme.weeklyHighFill, badgeText: theme.weeklyHighText, preview: '• 1 adım: Nefes çalışması yap.', icon: (x, y) => iconBolt(x, y, '#E7BE59') },
    { title: 'Altın Fırsat', badge: 'Orta', badgeFill: theme.weeklyMidFill, badgeText: theme.weeklyMidText, preview: '• 1 adım: Başvuru / teklif gönder.', icon: (x, y) => iconStarBadge(x, y, '#E9C85A') },
    { title: 'Kritik Uyarı', badge: 'Risk', badgeFill: theme.weeklyRiskFill, badgeText: theme.weeklyRiskText, preview: '• 1 adım: Tepki vermeden dur.', icon: (x, y) => iconWarn(x, y, '#C46B88') },
    { title: 'Enerji Kaybı', badge: 'Risk', badgeFill: theme.weeklyRiskFill, badgeText: theme.weeklyRiskText, preview: '• 1 adım: Hafif aktivite seç.', icon: (x, y) => iconTriangle(x, y, '#D0A03E') },
  ];
  const rowY0 = c.y + 36;
  return el('g', { filter: `url(#${theme.shadowFilter})` }, [
    el('rect', { x: c.x, y: c.y, width: c.w, height: c.h, rx: c.r, fill: theme.cardFill, stroke: theme.cardStroke, 'stroke-width': 1 }),
    el('path', { d: `M ${c.x + 14} ${c.y + 1.1} H ${c.x + c.w - 14}`, stroke: dark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.95)', 'stroke-width': 0.9, 'stroke-linecap': 'round', opacity: 0.95 }),
    t(c.x + 16, c.y + 19, 'Bu Hafta', { size: 15, weight: 700, fill: theme.text }),
    t(c.x + c.w - 16, c.y + 19, '25 Şub – 3 Mar', { size: 9.5, weight: 500, fill: theme.text2, anchor: 'end' }),
    rows.map((row, i) => {
      const y = rowY0 + i * 31;
      const badgeW = row.badge === 'Yüksek' ? 55 : 41;
      const badgeX = c.x + c.w - 31 - badgeW;
      return [
        el('rect', { x: c.x + 12, y, width: c.w - 24, height: 24, rx: 12, fill: theme.rowFill, stroke: theme.rowStroke, 'stroke-width': 1 }),
        el('path', { d: `M ${c.x + 20} ${y + 1.1} H ${c.x + c.w - 28}`, stroke: dark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.92)', 'stroke-width': 0.7, 'stroke-linecap': 'round', opacity: 0.85 }),
        el('circle', { cx: c.x + 24, cy: y + 8, r: 7.5, fill: dark ? 'rgba(255,255,255,0.03)' : 'rgba(122,91,234,0.04)', stroke: 'rgba(255,255,255,0.03)' }),
        row.icon(c.x + 16, y + 0.6),
        t(c.x + 37, y + 8.0, row.title, { size: 9.4, weight: 660, fill: theme.text, baseline: 'middle' }),
        el('rect', { x: badgeX, y: y + 3.5, width: badgeW, height: 13, rx: 6.5, fill: row.badgeFill, stroke: 'rgba(255,255,255,0.02)', 'stroke-width': 0.5 }),
        t(badgeX + badgeW / 2, y + 10.1, row.badge, { size: 7.5, weight: 700, fill: row.badgeText, anchor: 'middle' }),
        iconChevron(c.x + c.w - 18, y + 7.4, 3.1, theme.text3, 1.3, 0.85),
        t(c.x + 37, y + 17.3, row.preview, { size: 7.05, weight: 550, fill: theme.text2, opacity: 0.95, baseline: 'middle' }),
      ].join('');
    }).join(''),
  ].join(''));
}

function drawFooterOracle(theme) {
  const dark = theme.file.includes('dark');
  const p = layout.footerPill;
  return el('g', { filter: `url(#${theme.softShadowFilter})` }, [
    el('rect', { x: p.x, y: p.y, width: p.w, height: p.h, rx: p.r, fill: theme.oraclePillFill, stroke: theme.oraclePillStroke, 'stroke-width': 1 }),
    el('path', { d: `M ${p.x + 8} ${p.y + 1.1} H ${p.x + p.w - 8}`, stroke: dark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.92)', 'stroke-width': 0.7, 'stroke-linecap': 'round', opacity: 0.9 }),
    el('circle', { cx: p.x + 18, cy: p.y + 9, r: 4.2, fill: theme.oracleDot, opacity: 0.18 }),
    el('circle', { cx: p.x + 18, cy: p.y + 9, r: 3.1, fill: theme.oracleDot }),
    t(p.x + 28, p.y + 9.4, 'Oracle aktif', { size: 8.7, weight: 650, fill: theme.text2 }),
  ].join(''));
}

function drawTabBar(theme) {
  const dark = theme.file.includes('dark');
  const b = layout.tabbar;
  const items = [
    { label: 'Ana Sayfa', icon: 'home', active: true },
    { label: 'Planlayıcı', icon: 'calendar', active: false },
    { label: 'Rüya', icon: 'dream', active: false },
    { label: 'Yıldız Eşi', icon: 'match', active: false },
    { label: 'Haritam', icon: 'chart', active: false },
    { label: 'Profil', icon: 'profile', active: false },
  ];
  const cellW = b.w / 6;
  return [
    el('g', { filter: `url(#${theme.shadowFilter})` }, [
      el('rect', { x: b.x - 2, y: b.y - 4, width: b.w + 4, height: b.h + 10, rx: b.r + 6, fill: dark ? 'rgba(8,11,18,0.24)' : 'rgba(161,145,224,0.07)' }),
      el('rect', { x: b.x, y: b.y, width: b.w, height: b.h, rx: b.r, fill: theme.tabFill, stroke: theme.tabStroke, 'stroke-width': 1 }),
      el('rect', { x: b.x + 1, y: b.y + 1, width: b.w - 2, height: b.h - 2, rx: b.r - 1, fill: `url(#tabGlass-${theme.file})`, opacity: 0.95 }),
      el('path', { d: `M ${b.x + 2} ${b.y + 1} H ${b.x + b.w - 2}`, stroke: theme.tabTopLine, 'stroke-width': 1, 'stroke-linecap': 'round' }),
      el('rect', { x: b.x + 6, y: b.y + 6, width: b.w - 12, height: 14, rx: 10, fill: theme.glassHighlight, opacity: dark ? 0.08 : 0.12 }),
      el('path', { d: `M ${b.x + 14} ${b.y + b.h - 1.4} H ${b.x + b.w - 14}`, stroke: dark ? 'rgba(255,255,255,0.03)' : 'rgba(120,113,155,0.08)', 'stroke-width': 1, 'stroke-linecap': 'round' }),
      items.map((item, i) => {
        const cx = b.x + i * cellW + cellW / 2;
        const iconX = cx - 8;
        const iconY = b.y + 12;
        return [
          item.active ? el('ellipse', { cx, cy: b.y + 16, rx: 26, ry: 14, fill: theme.accent, opacity: dark ? 0.09 : 0.06 }) : '',
          item.active ? el('rect', { x: cx - 24, y: b.y + 7, width: 48, height: 18, rx: 9, fill: theme.tabActiveBg, stroke: dark ? 'rgba(196,173,255,0.18)' : 'rgba(125,94,234,0.12)', 'stroke-width': 0.7 }) : '',
          tabIcon(item.icon, iconX, iconY, item.active ? theme.tabActiveIcon : theme.tabIcon, item.active ? theme.tabActiveIcon : theme.tabIcon, item.active),
          t(cx, b.y + 52, item.label, { size: 8.15, weight: item.active ? 700 : 600, fill: item.active ? theme.tabActiveLabel : theme.tabLabel, anchor: 'middle' }),
        ].join('');
      }).join(''),
    ].join('')),
    el('rect', { x: layout.homeIndicator.x, y: layout.homeIndicator.y, width: layout.homeIndicator.w, height: layout.homeIndicator.h, rx: layout.homeIndicator.r, fill: theme.text2, opacity: theme.file.includes('dark') ? 0.25 : 0.22 }),
  ].join('');
}

function drawHero(theme) {
  const dark = theme.file.includes('dark');
  const h = layout.hero;
  return el('g', { filter: `url(#${theme.shadowFilter})` }, [
    el('rect', { x: h.x, y: h.y, width: h.w, height: h.h, rx: h.r, fill: '#0B0F20' }),
    heroArt(theme, h),
    el('rect', { x: h.x + h.w - 78, y: h.y + 12, width: 62, height: 24, rx: 12, fill: theme.heroPillFill, stroke: dark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.18)', 'stroke-width': 0.6 }),
    el('path', { d: `M ${h.x + h.w - 70} ${h.y + 13.4} H ${h.x + h.w - 24}`, stroke: dark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.85)', 'stroke-width': 0.7, 'stroke-linecap': 'round', opacity: 0.8 }),
    t(h.x + h.w - 47, h.y + 24, 'Detay', { size: 9.6, weight: 700, fill: theme.heroPillText, anchor: 'middle' }),
    t(h.x + 16, h.y + 45, 'Doğduğun Gece Ayı', { size: 19.1, weight: 740, fill: theme.heroTitle, letterSpacing: -0.1 }),
    t(h.x + 16, h.y + 67, 'Şişkin Ay (Waxing Gibbous) • %78 aydınlık', { size: 9.0, weight: 550, fill: theme.heroSub }),
    t(h.x + 16, h.y + 106, 'İç dünyanda büyütme ve tamamlamaya odaklı bir imza.', { size: 8.95, weight: 520, fill: theme.heroBody, baseline: 'alphabetic' }),
  ].join(''));
}

function render(theme) {
  const dark = theme.file.includes('dark');
  const bgStars = theme.file.includes('dark')
    ? makeStars({ x: 0, y: 0, w: W, h: H, count: 100, seed: 778899, color: '#FFFFFF', minR: 0.15, maxR: 0.85, opacity: [0.05, 0.45] })
    : '';
  const bgNoise = noiseDots({ count: theme.file.includes('dark') ? 120 : 140, seed: 424242, color: theme.bgNoise, opacityMax: theme.file.includes('dark') ? 0.035 : 0.05 });

  const defs = [
    el('linearGradient', { id: `bgGrad-${theme.file}`, x1: 0, y1: 0, x2: 0.9, y2: 1 }, [
      el('stop', { offset: '0%', 'stop-color': theme.bgGradient[0] }),
      el('stop', { offset: '52%', 'stop-color': theme.bgGradient[1] }),
      el('stop', { offset: '100%', 'stop-color': theme.bgGradient[2] }),
    ].join('')),
    el('radialGradient', { id: `bgAccent-${theme.file}`, cx: '18%', cy: '14%', r: '60%' }, [
      el('stop', { offset: '0%', 'stop-color': theme.bgAccent, 'stop-opacity': theme.file.includes('dark') ? 0.22 : 0.14 }),
      el('stop', { offset: '100%', 'stop-color': theme.bgAccent, 'stop-opacity': 0 }),
    ].join('')),
    el('radialGradient', { id: `bgAccent2-${theme.file}`, cx: '82%', cy: '78%', r: '55%' }, [
      el('stop', { offset: '0%', 'stop-color': theme.bgAccent, 'stop-opacity': theme.file.includes('dark') ? 0.14 : 0.1 }),
      el('stop', { offset: '100%', 'stop-color': theme.bgAccent, 'stop-opacity': 0 }),
    ].join('')),
    el('linearGradient', { id: `avatarGrad-${theme.file}`, x1: 0, y1: 0, x2: 1, y2: 1 }, [
      el('stop', { offset: '0%', 'stop-color': theme.avatarFillA }),
      el('stop', { offset: '100%', 'stop-color': theme.avatarFillB }),
    ].join('')),
    el('linearGradient', { id: `tabGlass-${theme.file}`, x1: 0, y1: 0, x2: 0, y2: 1 }, [
      el('stop', { offset: '0%', 'stop-color': dark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.55)' }),
      el('stop', { offset: '35%', 'stop-color': dark ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.18)' }),
      el('stop', { offset: '100%', 'stop-color': dark ? 'rgba(0,0,0,0.08)' : 'rgba(120,113,155,0.02)' }),
    ].join('')),
    el('filter', { id: 'cardShadowLight', x: '-20%', y: '-20%', width: '140%', height: '160%' }, [
      el('feDropShadow', { dx: 0, dy: 10, stdDeviation: 14, 'flood-color': '#B7AFD8', 'flood-opacity': 0.16 }),
      el('feDropShadow', { dx: 0, dy: 1, stdDeviation: 1.2, 'flood-color': '#FFFFFF', 'flood-opacity': 0.4 }),
    ].join('')),
    el('filter', { id: 'chipShadowLight', x: '-20%', y: '-20%', width: '140%', height: '160%' }, [
      el('feDropShadow', { dx: 0, dy: 4, stdDeviation: 6, 'flood-color': '#C9C2E2', 'flood-opacity': 0.14 }),
    ].join('')),
    el('filter', { id: 'cardShadowDark', x: '-25%', y: '-25%', width: '150%', height: '170%' }, [
      el('feDropShadow', { dx: 0, dy: 11, stdDeviation: 14, 'flood-color': '#000000', 'flood-opacity': 0.42 }),
      el('feDropShadow', { dx: 0, dy: 0, stdDeviation: 13, 'flood-color': '#7F6BEA', 'flood-opacity': 0.06 }),
    ].join('')),
    el('filter', { id: 'chipShadowDark', x: '-25%', y: '-25%', width: '150%', height: '170%' }, [
      el('feDropShadow', { dx: 0, dy: 6, stdDeviation: 8, 'flood-color': '#000000', 'flood-opacity': 0.25 }),
    ].join('')),
    el('filter', { id: 'nebulaBlur', x: '-50%', y: '-50%', width: '200%', height: '200%' }, [
      el('feGaussianBlur', { stdDeviation: 18 }),
    ].join('')),
    el('clipPath', { id: 'screenClip' }, el('rect', { x: 0, y: 0, width: W, height: H, rx: 0 })),
    el('clipPath', { id: 'heroClip' }, el('rect', { x: layout.hero.x, y: layout.hero.y, width: layout.hero.w, height: layout.hero.h, rx: layout.hero.r })),
  ].join('');

  const body = [
    el('rect', { x: 0, y: 0, width: W, height: H, fill: `url(#bgGrad-${theme.file})` }),
    el('circle', { cx: 60, cy: 92, r: 150, fill: `url(#bgAccent-${theme.file})` }),
    el('circle', { cx: 326, cy: 680, r: 120, fill: `url(#bgAccent2-${theme.file})` }),
    dark ? el('ellipse', { cx: 196, cy: 760, rx: 190, ry: 82, fill: 'rgba(88,76,156,0.10)', filter: 'url(#nebulaBlur)' }) : '',
    bgStars,
    bgNoise,
    drawStatusBar(theme),
    drawTopBar(theme),
    drawHero(theme),
    drawQuickActions(theme),
    drawDaily(theme),
    drawCompass(theme),
    drawWeekly(theme),
    drawFooterOracle(theme),
    drawTabBar(theme),
  ].join('');

  return `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" width="1179" height="2556" viewBox="0 0 ${W} ${H}" fill="none">` +
    `<title>${esc(theme.title)}</title>` +
    `<defs>${defs}</defs>` +
    `<g clip-path="url(#screenClip)">${body}</g>` +
    `</svg>`;
}

const outDir = path.join(process.cwd(), 'design-mockups');
fs.mkdirSync(outDir, { recursive: true });

const outPaths = [];
for (const key of ['light', 'dark']) {
  const theme = themes[key];
  const svg = render(theme);
  const full = path.join(outDir, theme.file);
  fs.writeFileSync(full, svg, 'utf8');
  outPaths.push(full);
}

console.log(outPaths.join('\n'));
