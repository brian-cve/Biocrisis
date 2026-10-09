import { chromium, devices } from 'playwright';
const dir = process.argv[2] ?? '.';
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: devices['iPhone 13'].userAgent });
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
const errors = [];
page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) errors.push(`${m.type()}: ${m.text()}`); });
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
await page.goto('http://localhost:5173/');
const active = () => page.evaluate(() => window.__game.scene.getScenes(true).map((s) => s.scene.key).join(','));
const waitFor = async (key, ms = 8000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if ((await active()).split(',').includes(key)) return; await page.waitForTimeout(50); } throw new Error(`timeout ${key}; active=${await active()}`); };
const shot = (n) => page.screenshot({ path: `${dir}/${n}.png` });
const center = (sel) => page.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, sel);
const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
const tapSel = async (sel, ms = 90) => { const c = await center(sel); await touch('touchStart', [{ x: c.x, y: c.y, id: 1 }]); await page.waitForTimeout(ms); await touch('touchEnd', []); };
const held = () => page.evaluate(() => JSON.stringify(Object.entries(window.__touch.held).filter(([, v]) => v).map(([k]) => k)));

await page.evaluate(async () => { window.__touch = (await import('/src/ui/touchState.ts')).touchState; });
await page.waitForTimeout(600);
console.log('Boot: pad visible =', await page.evaluate(() => !document.querySelector('.tc-root').hidden), '(should be false)');
await shot('t1_boot');
await page.touchscreen.tap(400, 200); await waitFor('Title'); await page.waitForTimeout(1500);
console.log('Title: pad visible =', await page.evaluate(() => !document.querySelector('.tc-root').hidden), '| pointer coarse =', await page.evaluate(() => matchMedia('(pointer: coarse)').matches));
await shot('t2_title');

const hits = await page.evaluate(() => [...document.querySelectorAll('.tc-hit, .tc-dpad .arm')].map((e) => { const r = e.getBoundingClientRect(); return { cls: e.className.replace('tc-hit ', '').slice(0, 24), w: Math.round(r.width), h: Math.round(r.height) }; }));
const small = hits.filter((h) => h.w < 48 || h.h < 48);
console.log('Touch zones:', hits.length, '| under 48 px:', small.length ? JSON.stringify(small) : 'none', '| min', Math.min(...hits.map((h) => Math.min(h.w, h.h))), 'px');

await tapSel('.tc-dpad .down'); await page.waitForTimeout(150); await tapSel('.tc-dpad .up'); await page.waitForTimeout(150);
await tapSel('.tc-a'); await waitFor('Intro'); console.log('A on NEW GAME -> Intro');
await tapSel('.tc-b');
await waitFor('Controls', 6000); await page.waitForTimeout(500); await shot('t3_controls_mobile');
console.log('Controls: mobile page first =', await page.evaluate(() => window.__game.scene.getScene('Controls').tab === 1));
await tapSel('.tc-a'); await waitFor('Game'); await page.waitForTimeout(1500); await shot('t4_game_landscape');

const state = () => page.evaluate(() => { const w = window.__bc.world; return { x: +w.player.x.toFixed(2), y: +w.player.y.toFixed(2), a: +w.player.angle.toFixed(2), shots: w.stats.shots }; });
await page.evaluate(() => { const w = window.__bc.world; w.hp = 1e6; for (const z of w.zombies) { z.x = 1.5; z.y = 1.5; } });
const s0 = await state();
const dp = await page.evaluate(() => { const r = document.querySelector('.tc-dpad').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
const f1 = { x: dp.x + dp.w * 0.28, y: dp.y + dp.h * 0.12, id: 1 };
await touch('touchStart', [f1]); await page.waitForTimeout(300);
console.log('finger 1 on D-pad (diagonal):', await held());
const A = await center('.tc-a');
const f2 = { x: A.x, y: A.y, id: 2 };
for (let i = 0; i < 3; i++) {
  await touch('touchStart', [f1, f2]); await page.waitForTimeout(120);
  if (i === 0) console.log('two fingers at once:', await held());
  await touch('touchEnd', [f1]); await page.waitForTimeout(450);
}
await page.waitForTimeout(400);
await touch('touchEnd', []); await page.waitForTimeout(250);
const s1 = await state();
console.log('multitouch -> moved', Math.hypot(s1.x - s0.x, s1.y - s0.y).toFixed(2), 'cells, turned', (s1.a - s0.a).toFixed(2), 'rad, shots', s1.shots - s0.shots, '| stuck buttons after release:', await held());
await shot('t5_multitouch');

const syn = await page.evaluate(async () => {
  const q = (s) => document.querySelector(s); const T = window.__touch; const w = window.__bc.world;
  const ev = (el, type, id, x, y) => el.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: 'touch', isPrimary: id === 21, clientX: x, clientY: y, bubbles: true, cancelable: true }));
  const d = q('.tc-dpad').getBoundingClientRect(), a = q('.tc-a').getBoundingClientRect();
  const x0 = w.player.x, y0 = w.player.y, shots0 = w.stats.shots, p0 = T.presses.A;
  ev(q('.tc-dpad'), 'pointerdown', 21, d.left + d.width / 2, d.top + d.height * 0.1);
  const heldUp = T.held.up;
  for (let i = 0; i < 3; i++) { ev(q('.tc-a'), 'pointerdown', 22, a.left + 10, a.top + 10); await new Promise((r) => setTimeout(r, 120)); ev(q('.tc-a'), 'pointerup', 22, a.left + 10, a.top + 10); await new Promise((r) => setTimeout(r, 420)); }
  const stillUp = T.held.up;
  ev(q('.tc-dpad'), 'pointerup', 21, d.left, d.top);
  await new Promise((r) => setTimeout(r, 100));
  return { heldUp, stillUp, aPresses: T.presses.A - p0, shots: w.stats.shots - shots0, moved: +Math.hypot(w.player.x - x0, w.player.y - y0).toFixed(2), released: !T.held.up };
});
console.log('Pointer Events with 2 pointerIds:', JSON.stringify(syn));

await page.evaluate(() => { window.__bc.world.weapon.mag = 5; });
await tapSel('.tc-b'); await page.waitForTimeout(200);
console.log('contextual B with no door -> reload:', await page.evaluate(() => window.__bc.world.weapon.reloading));
await tapSel('.tc-r'); console.log('R heal at full health -> message:', await page.evaluate(() => window.__bc.world.message));
await tapSel('.tc-select'); await waitFor('Inventory'); await page.waitForTimeout(300); await shot('t6_inventory'); await tapSel('.tc-b'); await waitFor('Game'); console.log('SELECT opens inventory and B closes it');
await tapSel('.tc-start'); await waitFor('Pause'); await shot('t7_pause'); await tapSel('.tc-b'); await waitFor('Game'); console.log('START pauses and B resumes');

const t0 = await page.evaluate(() => window.__bc.world.time);
await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(700);
console.log('Portrait: warning visible =', await page.evaluate(() => !document.querySelector('.tc-rotate').hidden));
const t1 = await page.evaluate(() => window.__bc.world.time); await page.waitForTimeout(800); const t2 = await page.evaluate(() => window.__bc.world.time);
console.log('   world frozen (same time):', t1 === t2, `(${t1.toFixed(2)} -> ${t2.toFixed(2)})`, '| audio:', await page.evaluate(() => window.__audio.ctx.state));
await shot('t8_portrait');
await page.setViewportSize({ width: 844, height: 390 }); await page.waitForTimeout(900);
const t3 = await page.evaluate(() => window.__bc.world.time); await page.waitForTimeout(600);
console.log('Back to landscape: world advances =', (await page.evaluate(() => window.__bc.world.time)) > t3, '| audio:', await page.evaluate(() => window.__audio.ctx.state));

for (const [w, h, n] of [[667, 375, 'se'], [932, 430, 'max'], [740, 360, 'small'], [1024, 768, 'tablet']]) {
  await page.setViewportSize({ width: w, height: h }); await page.waitForTimeout(600); await shot(`t9_${n}_${w}x${h}`);
  const ov = await page.evaluate(() => { const rs = [...document.querySelectorAll('.tc-hit')].map((e) => e.getBoundingClientRect()); let o = 0; for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) { const a = rs[i], b = rs[j]; if (a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom) o++; } const out = rs.filter((r) => r.left < 0 || r.top < 0 || r.right > innerWidth || r.bottom > innerHeight).length; return { superpuestas: o, fuera: out, scrollW: document.documentElement.scrollWidth <= innerWidth, scrollH: document.documentElement.scrollHeight <= innerHeight }; });
  console.log(`${w}x${h}:`, JSON.stringify(ov));
}
await page.setViewportSize({ width: 844, height: 390 }); await page.waitForTimeout(600);

await page.evaluate(() => { const g = window.__game; window.__cost = { t: 0, n: 0, max: 0, on: false }; let t0 = 0; g.events.on('step', () => { t0 = performance.now(); }); g.events.on('postrender', () => { if (!window.__cost.on) return; const e = performance.now() - t0; const c = window.__cost; c.t += e; c.n++; c.max = Math.max(c.max, e); }); });
const perf = async (rate, label) => {
  await cdp.send('Emulation.setCPUThrottlingRate', { rate });
  await page.evaluate(() => { const w = window.__bc.world; w.hp = 1e6; w.zombies.forEach((z, i) => { z.state = 2; z.x = w.player.x + 3 + i * 0.4; z.y = w.player.y; z.hp = 1e9; }); window.__cost.t = 0; window.__cost.n = 0; window.__cost.max = 0; window.__cost.on = true; window.__fps = []; window.__iv = setInterval(() => window.__fps.push(window.__game.loop.actualFps), 250); });
  await page.keyboard.down('d'); await page.waitForTimeout(8000); await page.keyboard.up('d');
  const r = await page.evaluate(() => { window.__cost.on = false; clearInterval(window.__iv); const f = window.__fps.slice(4); const c = window.__cost; return { fpsAvg: +(f.reduce((a, b) => a + b, 0) / f.length).toFixed(1), fpsMin: +Math.min(...f).toFixed(1), msPerFrameAvg: +(c.t / c.n).toFixed(2), msMax: +c.max.toFixed(1), frames: c.n }; });
  console.log(`CPU x${rate} (${label}):`, JSON.stringify(r));
};
await perf(1, 'no limit'); await perf(4, 'mid range'); await perf(6, 'low range'); await perf(10, 'very slow');
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
console.log(errors.length ? errors : 'clean console');
await browser.close();
