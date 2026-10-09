import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
const errors = [];
page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) errors.push(`${m.type()}: ${m.text()}`); });
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
await page.goto('http://localhost:5173/');
const tap = async (k, ms = 90) => { await page.keyboard.down(k); await page.waitForTimeout(ms); await page.keyboard.up(k); };
const active = () => page.evaluate(() => window.__game.scene.getScenes(true).map((s) => s.scene.key).join(','));
const waitFor = async (key, ms = 8000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if ((await active()).split(',').includes(key)) return; await page.waitForTimeout(50); } throw new Error(`timeout ${key}; ${await active()}`); };
await page.waitForTimeout(800); await tap('Space'); await waitFor('Title');

await page.evaluate(() => {
  const a = window.__audio; const an = a.ctx.createAnalyser(); an.fftSize = 1024; a.master.connect(an);
  const buf = new Float32Array(an.fftSize); window.__rec = [];
  setInterval(() => { an.getFloatTimeDomainData(buf); let s = 0, pk = 0; for (const v of buf) { s += v * v; pk = Math.max(pk, Math.abs(v)); } window.__rec.push({ t: performance.now(), rms: Math.sqrt(s / buf.length), pk }); }, 20);
});
const mark = () => page.evaluate(() => window.__rec.length);
const slice = (from) => page.evaluate((f) => window.__rec.slice(f), from);
const db = (x) => (x > 0 ? +(20 * Math.log10(x)).toFixed(1) : -120);
const stat = (rows) => { const rms = Math.sqrt(rows.reduce((s, r) => s + r.rms * r.rms, 0) / rows.length); const pk = Math.max(...rows.map((r) => r.pk)); return { rmsDb: db(rms), peak: +pk.toFixed(3) }; };
const music = () => page.evaluate(() => ({ ...window.__music.stats(), chaseGain: window.__music.graph ? +window.__music.graph.layers.chase.gain.value.toFixed(2) : null, exploreGain: window.__music.graph ? +window.__music.graph.layers.explore.gain.value.toFixed(2) : null, busMusic: +window.__audio.buses.music.gain.value.toFixed(2) }));
const report = async (name, from) => console.log(name.padEnd(24), JSON.stringify(stat(await slice(from))), JSON.stringify(await music()));

let m0 = await mark(); await page.waitForTimeout(20000); await report('A menu 20 s', m0);
let nodesMenu = []; for (let i = 0; i < 6; i++) { await page.waitForTimeout(5000); nodesMenu.push((await music()).musicNodes); }
console.log('   music nodes (menu, every 5 s):', nodesMenu.join(','));

await tap('Enter'); await waitFor('Intro'); await tap('Space');
if (await page.evaluate(() => !JSON.parse(localStorage.getItem('biocrisis.settings.v1') || '{}').controlsSeen)) { await waitFor('Controls'); await page.waitForTimeout(300); await tap('Enter'); }
await waitFor('Game'); await page.evaluate(() => { const w = window.__bc.world; w.hp = 1e6; for (const z of w.zombies) { z.x = 1.5; z.y = 1.5; z.state = 0; } });
await page.waitForTimeout(6000);
m0 = await mark(); await page.waitForTimeout(30000); await report('B exploration 30 s', m0);
let nodesEx = []; for (let i = 0; i < 6; i++) { await page.waitForTimeout(5000); nodesEx.push((await music()).musicNodes); }
console.log('   music nodes (explore, every 5 s):', nodesEx.join(','));

const force = (st) => page.evaluate((st) => { const w = window.__bc.world; w.zombies.forEach((z, i) => { z.state = st; if (st === 2) { z.x = w.player.x + 3 + i * 0.01; z.y = w.player.y; } }); }, st);
m0 = await mark();
for (let i = 0; i < 24; i++) { await force(2); await page.evaluate(() => { const w = window.__bc.world; w.hp = 1e6; for (const z of w.zombies) { z.x = w.player.x + 6; z.y = w.player.y; } }); await page.waitForTimeout(500); }
await report('C chase 12 s', m0);
const rec = await slice(m0 + 250);
const env = rec.map((r) => r.rms); const n = env.length; const mean = env.reduce((a, b) => a + b, 0) / n; const d = env.map((v) => v - mean);
const ac = (lagMs) => { const lag = Math.round(lagMs / 20); let s = 0, e = 0; for (let i = 0; i + lag < n; i++) s += d[i] * d[i + lag]; for (const v of d) e += v * v; return +(s / e).toFixed(2); };
console.log('   envelope autocorrelation: lag 556 ms (108 BPM pulse) =', ac(556), '| lag 278 ms =', ac(278), '| lag 833 ms (unrelated) =', ac(833));

m0 = await mark(); const traj = [];
for (let i = 0; i < 28; i++) { await force(0); await page.waitForTimeout(500); if (i % 4 === 3) traj.push((await music()).intensity); }
console.log('D calm 14 s  intensity every 2 s:', traj.join(' -> '));
await page.waitForTimeout(3000); await report('D after calming', m0 + 600);

m0 = await mark(); await page.waitForTimeout(3000); const before = stat(await slice(m0));
await tap('Escape'); await waitFor('Pause'); await page.waitForTimeout(1200);
m0 = await mark(); await page.waitForTimeout(3000); const paused = stat(await slice(m0)); const busP = (await music()).busMusic;
console.log('E pause: before', before.rmsDb, 'dB -> paused', paused.rmsDb, 'dB; music bus', busP);
await tap('Escape'); await waitFor('Game'); await page.waitForTimeout(1200);
await page.evaluate(() => window.__audio.setVolumes({ musicVolume: 0.7, sfxVolume: 0.9, muted: true }));
await page.waitForTimeout(800); m0 = await mark(); await page.waitForTimeout(3000); console.log('F muted:', JSON.stringify(stat(await slice(m0))));
await page.evaluate(() => window.__audio.setVolumes({ musicVolume: 0.7, sfxVolume: 0.9, muted: false }));

await page.evaluate(() => { const w = window.__bc.world; w.hp = 3; w.hurtPlayer(10); });
await waitFor('GameOver', 8000); m0 = await mark(); await page.waitForTimeout(6000); await report('G game over sting 6 s', m0);
m0 = await mark(); await page.waitForTimeout(5000); await report('G after the sting', m0);
await page.screenshot({ path: './m_end.png' });
await page.waitForTimeout(50000); console.log('music nodes 50 s after stopping:', (await music()).musicNodes, '| voices', await page.evaluate(() => window.__audio.voices));
console.log(errors.length ? errors : 'clean console');
await browser.close();
