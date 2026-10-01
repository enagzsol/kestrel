(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);

  /* ------------------------------------------------------------------ */
  /* State                                                               */
  /* ------------------------------------------------------------------ */
  const LS_HOLDINGS = 'kestrel.holdings';
  const LS_MARKET = 'kestrel.market';

  // Tokens priced from Hyperliquid marks. Optional ones only get a row once they are held.
  const PRICED = [
    { id: 'sol', sym: 'SOL' },
    { id: 'btc', sym: 'BTC', optional: true },
    { id: 'eth', sym: 'ETH', optional: true },
    { id: 'zec', sym: 'ZEC', optional: true },
    { id: 'hype', sym: 'HYPE', optional: true },
  ];
  const HOLDING_IDS = [...PRICED.map((t) => t.id), 'usdc', 'cash'];

  const DEFAULT_HOLDINGS = { sol: 0.04843, btc: 0, eth: 0, zec: 0, hype: 0, usdc: 3.65476, cash: 2 };
  // Seed values so the first paint matches the screenshot before any fetch resolves.
  const DEFAULT_MARKET = {
    sol: { price: 117.28, pct: 0.18 },
    btc: { price: 83889, pct: -0.52 },
    eth: { price: 2693.2, pct: -0.36 },
    zec: { price: 1389.9, pct: -5.4 },
    hype: { price: 89.08, pct: 3.55 },
    usdcSign: -1,           // USDC is pegged 1:1; only the direction of its tiny daily move is shown
    perps: { BTC: -0.25, ETH: -0.53, ZEC: 7.95, HYPE: 0.26, CL: -0.15 },
    updated: 0,
  };

  const load = (key, fallback) => {
    try {
      const v = JSON.parse(localStorage.getItem(key));
      return v && typeof v === 'object' ? { ...fallback, ...v } : { ...fallback };
    } catch { return { ...fallback }; }
  };
  const save = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode */ } };

  let holdings = load(LS_HOLDINGS, DEFAULT_HOLDINGS);
  let market = load(LS_MARKET, DEFAULT_MARKET);
  market.perps = { ...DEFAULT_MARKET.perps, ...(market.perps || {}) };
  delete market.usdc;
  if (market.usdcSign !== 1 && market.usdcSign !== -1) market.usdcSign = -1;

  /* ------------------------------------------------------------------ */
  /* Formatting                                                          */
  /* ------------------------------------------------------------------ */
  const sign = (v) => (v < 0 ? '-' : '+');
  const money = (v) => '$' + Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Portfolio change: the original shows extra precision under a dollar (e.g. +$0.0106).
  const totalChangeText = (v) => {
    const a = Math.abs(v);
    if (a === 0) return '$0.00';
    if (a >= 1) return sign(v) + money(a);
    let s = a.toFixed(4).replace(/0+$/, '');
    if (s.split('.')[1].length < 2) s = a.toFixed(2);
    return sign(v) + '$' + s;
  };
  // Per-token change: rounds to cents, "<$0.01" below half a cent.
  const tokenChangeText = (v) => {
    const a = Math.abs(v);
    if (a === 0) return '$0.00';
    if (a < 0.005) return sign(v) + '<$0.01';
    return sign(v) + '$' + a.toFixed(2);
  };
  const pctText = (p) => (p === 0 ? '0.00%' : sign(p) + Math.abs(p).toFixed(2) + '%');
  const qtyText = (q) => q.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 5 });
  const setSigned = (el, text, v) => {
    el.textContent = text;
    el.classList.toggle('pos', v > 0);
    el.classList.toggle('neg', v < 0);
    el.classList.toggle('flat', v === 0);
  };

  /* ------------------------------------------------------------------ */
  /* Portfolio maths                                                     */
  /* ------------------------------------------------------------------ */
  const tokenValue = (qty, { price, pct }) => {
    const value = qty * price;
    const prevPrice = price / (1 + pct / 100);
    return { value, change: qty * (price - prevPrice) };
  };

  const compute = () => {
    const tokens = { usdc: { value: holdings.usdc, change: 0 } };   // 1 USDC = 1 USD
    let total = holdings.cash + holdings.usdc;
    let change = 0;
    for (const { id } of PRICED) {
      tokens[id] = tokenValue(holdings[id], market[id]);
      total += tokens[id].value;
      change += tokens[id].change;
    }
    const base = total - change;
    const pct = base > 0 ? (change / base) * 100 : 0;
    return { tokens, total, change, pct };
  };

  const tokenRow = (id) => document.querySelector('.token[data-token="' + id + '"]');

  const render = () => {
    const p = compute();
    $('totalUsd').textContent = money(p.total);
    setSigned($('totalChange'), totalChangeText(p.change), p.change);
    setSigned($('totalPct'), pctText(p.pct), p.change);
    $('cashUsd').textContent = money(holdings.cash);

    for (const { id, sym, optional } of PRICED) {
      const t = p.tokens[id];
      $(id + 'Qty').textContent = qtyText(holdings[id]) + ' ' + sym;
      $(id + 'Usd').textContent = money(t.value);
      setSigned($(id + 'Change'), tokenChangeText(t.change), t.change);
      if (optional) tokenRow(id).hidden = !(holdings[id] > 0);
    }

    $('usdcQty').textContent = qtyText(holdings.usdc) + ' USDC';
    $('usdcUsd').textContent = money(p.tokens.usdc.value);
    setSigned($('usdcChange'), (market.usdcSign < 0 ? '-' : '+') + '<$0.01', market.usdcSign < 0 ? -1 : 1);

    // Largest holding first, like the original.
    Object.keys(p.tokens)
      .sort((a, b) => p.tokens[b].value - p.tokens[a].value)
      .forEach((id, i) => { tokenRow(id).style.order = i; });

    document.querySelectorAll('.perp[data-perp]').forEach((card) => {
      const pct = market.perps[card.dataset.perp];
      if (typeof pct !== 'number' || Number.isNaN(pct)) return;
      setSigned(card.querySelector('[data-pct]'), pctText(pct), pct);
    });
  };

  /* ------------------------------------------------------------------ */
  /* Market data                                                         */
  /* ------------------------------------------------------------------ */
  const HL = 'https://api.hyperliquid.xyz/info';
  const CG = 'https://api.coingecko.com/api/v3/simple/price?ids=usd-coin&vs_currencies=usd&include_24hr_change=true';

  const hlChanges = async (dex) => {
    const body = dex ? { type: 'metaAndAssetCtxs', dex } : { type: 'metaAndAssetCtxs' };
    const res = await fetch(HL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) throw new Error('HL ' + res.status);
    const [meta, ctxs] = await res.json();
    const out = {};
    meta.universe.forEach((asset, i) => {
      const ctx = ctxs[i];
      if (!ctx) return;
      const mark = parseFloat(ctx.markPx);
      const prev = parseFloat(ctx.prevDayPx);
      if (mark > 0 && prev > 0) out[asset.name] = { price: mark, pct: (mark / prev - 1) * 100 };
    });
    return out;
  };

  const refreshMarket = async () => {
    const [main, xyz] = await Promise.allSettled([hlChanges(), hlChanges('xyz')]);
    let changed = false;

    if (main.status === 'fulfilled') {
      for (const sym of ['BTC', 'ETH', 'ZEC', 'HYPE']) {
        if (main.value[sym]) { market.perps[sym] = main.value[sym].pct; changed = true; }
      }
      for (const { id, sym } of PRICED) {
        if (main.value[sym]) { market[id] = { price: main.value[sym].price, pct: main.value[sym].pct }; changed = true; }
      }
    }
    if (xyz.status === 'fulfilled' && xyz.value['xyz:CL']) {
      market.perps.CL = xyz.value['xyz:CL'].pct; changed = true;
    }
    if (changed) {
      market.updated = Date.now();
      save(LS_MARKET, market);
      render();
    }
  };

  // Only the direction of USDC's daily move is needed; CoinGecko once a minute is plenty.
  const refreshUsdcSign = async () => {
    try {
      const r = await fetch(CG);
      if (!r.ok) return;
      const g = await r.json();
      const chg = g['usd-coin'] && g['usd-coin'].usd_24h_change;
      if (typeof chg === 'number' && chg !== 0) {
        market.usdcSign = chg < 0 ? -1 : 1;
        save(LS_MARKET, market);
        render();
      }
    } catch { /* keep last known direction */ }
  };

  /* ------------------------------------------------------------------ */
  /* Clock                                                               */
  /* ------------------------------------------------------------------ */
  const tickClock = () => {
    const d = new Date();
    $('statusTime').textContent = d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0');
  };

  /* ------------------------------------------------------------------ */
  /* Drawer                                                              */
  /* ------------------------------------------------------------------ */
  const phone = $('phone');
  const openDrawer = () => phone.classList.add('drawer-open');
  const closeDrawer = () => phone.classList.remove('drawer-open');
  $('avatarBtn').addEventListener('click', openDrawer);
  $('pageDim').addEventListener('click', closeDrawer);

  // Swipe left on the pushed page closes the drawer; swipe right from the left edge opens it.
  let touchX = null, touchY = null, edgeSwipe = false;
  phone.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    touchX = t.clientX; touchY = t.clientY;
    edgeSwipe = !phone.classList.contains('drawer-open') && t.clientX - phone.getBoundingClientRect().left < 24;
  }, { passive: true });
  phone.addEventListener('touchend', (e) => {
    if (touchX === null) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchX, dy = t.clientY - touchY;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0 && phone.classList.contains('drawer-open')) closeDrawer();
      if (dx > 0 && edgeSwipe) openDrawer();
    }
    touchX = touchY = null;
  }, { passive: true });

  /* ------------------------------------------------------------------ */
  /* Plus actions                                                        */
  /* ------------------------------------------------------------------ */
  const actions = $('actions');
  $('fab').addEventListener('click', () => actions.classList.add('open'));
  $('actionsClose').addEventListener('click', () => actions.classList.remove('open'));
  actions.addEventListener('click', (e) => { if (e.target === actions) actions.classList.remove('open'); });
  actions.querySelectorAll('.action').forEach((b) => b.addEventListener('click', () => actions.classList.remove('open')));

  /* ------------------------------------------------------------------ */
  /* Edit holdings sheet                                                 */
  /* ------------------------------------------------------------------ */
  // Inputs are #inSol, #inBtc, ... with a matching #inSolUsd preview under each.
  const inId = (id) => 'in' + id[0].toUpperCase() + id.slice(1);
  const inputs = Object.fromEntries(HOLDING_IDS.map((id) => [id, $(inId(id))]));
  const parseNum = (s) => {
    const n = parseFloat(String(s).replace(/,/g, '.').replace(/[^0-9.]/g, ''));
    return Number.isFinite(n) && n >= 0 ? n : 0;
  };
  const previewSheet = () => {
    let total = 0;
    for (const id of HOLDING_IDS) {
      const qty = parseNum(inputs[id].value);
      const usd = market[id] && id !== 'usdc' ? tokenValue(qty, market[id]).value : qty;
      $(inId(id) + 'Usd').textContent = money(usd);
      total += usd;
    }
    $('inTotal').textContent = money(total);
  };
  const openSheet = (focus) => {
    for (const id of HOLDING_IDS) inputs[id].value = id === 'cash' ? holdings.cash.toFixed(2) : qtyText(holdings[id]);
    previewSheet();
    phone.classList.add('sheet-open');
    const el = inputs[focus];
    if (el) setTimeout(() => { el.focus(); el.select(); }, 420);
  };
  const closeSheet = () => { phone.classList.remove('sheet-open'); document.activeElement && document.activeElement.blur(); };

  $('cashCard').addEventListener('click', () => openSheet('cash'));
  document.querySelectorAll('.token[data-token]').forEach((b) => b.addEventListener('click', () => openSheet(b.dataset.token)));
  Object.values(inputs).forEach((i) => i.addEventListener('input', previewSheet));
  $('sheetSave').addEventListener('click', () => {
    holdings = Object.fromEntries(HOLDING_IDS.map((id) => [id, parseNum(inputs[id].value)]));
    save(LS_HOLDINGS, holdings);
    render();
    closeSheet();
  });
  $('sheetCancel').addEventListener('click', closeSheet);
  $('sheetBackdrop').addEventListener('click', closeSheet);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeSheet(); closeDrawer(); actions.classList.remove('open'); }
    if (e.key === 'Enter' && phone.classList.contains('sheet-open')) $('sheetSave').click();
  });

  /* ------------------------------------------------------------------ */
  /* Tabs (visual only)                                                  */
  /* ------------------------------------------------------------------ */
  document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((x) => x.classList.remove('active'));
    t.classList.add('active');
  }));

  /* ------------------------------------------------------------------ */
  /* Boot                                                                */
  /* ------------------------------------------------------------------ */
  render();
  tickClock();
  setInterval(tickClock, 1000);
  refreshMarket();
  refreshUsdcSign();
  setInterval(refreshMarket, 12000);
  setInterval(refreshUsdcSign, 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { refreshMarket(); refreshUsdcSign(); } });

  // Diagnostics: tap the Bank row 5 times quickly to see viewport metrics on-device.
  let bankTaps = [];
  document.querySelector('.bank-row').addEventListener('click', () => {
    const now = Date.now();
    bankTaps = bankTaps.filter((t) => now - t < 2000).concat(now);
    if (bankTaps.length < 5) return;
    bankTaps = [];
    let box = document.querySelector('.diag');
    if (!box) {
      box = document.createElement('div');
      box.className = 'diag';
      box.addEventListener('click', () => box.classList.remove('show'));
      phone.appendChild(box);
    }
    const cs = getComputedStyle(phone);
    const vv = window.visualViewport;
    const pb = phone.getBoundingClientRect();
    box.textContent = [
      'standalone: ' + (matchMedia('(display-mode: standalone)').matches || navigator.standalone === true),
      'inner:      ' + innerWidth + ' x ' + innerHeight,
      'screen:     ' + screen.width + ' x ' + screen.height,
      'visual:     ' + (vv ? Math.round(vv.width) + ' x ' + Math.round(vv.height) + ' @' + Math.round(vv.offsetTop) : 'n/a'),
      'phone box:  ' + Math.round(pb.width) + ' x ' + Math.round(pb.height) + ' @' + Math.round(pb.top),
      'safe top:   ' + cs.getPropertyValue('--safe-top').trim(),
      'safe btm:   ' + cs.getPropertyValue('--safe-bottom').trim(),
    ].join('\n');
    box.classList.add('show');
  });

  // Dev helper: ?state=drawer|actions|sheet|bottom|perps opens a given state on load (and skips the intro).
  const state = new URLSearchParams(location.search).get('state');
  if (state === 'drawer') openDrawer();
  if (state === 'actions') actions.classList.add('open');
  if (state === 'sheet') openSheet();
  if (state === 'bottom') document.fonts.ready.then(() => { $('scroll').scrollTop = 1e6; });
  if (state === 'perps') $('perps').scrollLeft = 1e6;
  const scrollTo = new URLSearchParams(location.search).get('scroll');
  if (scrollTo) document.fonts.ready.then(() => { $('scroll').scrollTop = +scrollTo; });
  if (state === 'debug') setTimeout(() => {
    const r = (sel) => { const b = document.querySelector(sel).getBoundingClientRect(); return [Math.round(b.top * 10) / 10, Math.round(b.height * 10) / 10]; };
    const sc = $('scroll');
    document.body.dataset.debug = JSON.stringify({ scrollHeight: sc.scrollHeight, client: sc.clientHeight, content: r('.content'), disclaimer: r('.disclaimer'), perps: r('.perps'), preds: r('.predictions'), tabs: r('.tabs'), lines: Math.round(document.querySelector('.disclaimer').getBoundingClientRect().height / 20) });
  }, 500);
})();
