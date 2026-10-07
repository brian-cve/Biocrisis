// Prueba de fugas: 10 ciclos de iniciar → jugar → abandonar → volver al menú, más Game Over y Victoria. Uso: node tools/cycles.mjs
import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--js-flags=--expose-gc'] });
const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
const errors = [];
page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) errors.push(`${m.type()}: ${m.text()}`); });
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
await page.goto('http://localhost:5173/');
const active = () => page.evaluate(() => window.__game.scene.getScenes(true).map((s) => s.scene.key).join(','));
const tap = async (k, ms = 90) => { await page.keyboard.down(k); await page.waitForTimeout(ms); await page.keyboard.up(k); };
const waitFor = async (key, ms = 8000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if ((await active()).split(',').includes(key)) return; await page.waitForTimeout(50); } throw new Error(`timeout esperando ${key}; activas=${await active()}`); };
const metrics = () => page.evaluate(async () => {
  window.gc?.(); await new Promise((r) => setTimeout(r, 100)); window.gc?.();
  const g = window.__game;
  const gs = window.__bc;
  const kb = g.input.keyboard;
  return {
    heapMB: +(performance.memory.usedJSHeapSize / 1048576).toFixed(2),
    textures: g.textures.getTextureKeys().length,
    sceneObjs: g.scene.getScenes(false).length,
    gameEvents: g.events.eventNames().length,
    sceneKeys: gs ? gs.input.keyboard.keys.filter(Boolean).length : 0,
    ptr: gs ? gs.input.listenerCount('pointerdown') + gs.input.listenerCount('wheel') + gs.input.listenerCount('pointermove') : 0,
    gsEvents: gs ? gs.events.eventNames().length : 0,
    voices: window.__audio.voices, loops: window.__audio.loops,
    audioState: window.__audio.ctx?.state,
  };
});

await waitFor('Boot'); await tap('Space'); await waitFor('Title');
const rows = [];
for (let i = 1; i <= 10; i++) {
  await page.waitForTimeout(500);
  await tap('Enter'); await waitFor('Intro'); await page.waitForTimeout(300);
  await tap('Space');
  if ((await page.evaluate(() => !JSON.parse(localStorage.getItem('biocrisis.settings.v1') || '{}').controlsSeen))) { await waitFor('Controls'); await page.waitForTimeout(300); await tap('Enter'); }
  await waitFor('Game'); await page.waitForTimeout(900);
  // jugar un poco: disparar, moverse, abrir inventario y cerrar
  await tap('Space'); await page.waitForTimeout(400);
  await page.keyboard.down('w'); await page.waitForTimeout(500); await page.keyboard.up('w');
  await tap('Tab'); await waitFor('Inventory'); await page.waitForTimeout(200); await tap('Escape'); await page.waitForTimeout(500);
  await tap('Escape'); await waitFor('Pause'); await page.waitForTimeout(200);
  for (let k = 0; k < 4; k++) await tap('ArrowDown');
  await tap('Enter'); await page.waitForTimeout(250);
  await tap('ArrowDown'); await tap('Enter'); // SÍ, volver al menú
  await waitFor('Title'); await page.waitForTimeout(700);
  const m = await metrics();
  rows.push(m);
  console.log(`ciclo ${i}`, JSON.stringify(m));
}
// Game Over → reintentar → abandonar
await tap('Enter'); await waitFor('Intro'); await tap('Space'); await waitFor('Game'); await page.waitForTimeout(600);
await page.evaluate(() => window.__bc.world.hurtPlayer(999));
await waitFor('GameOver', 6000); await page.waitForTimeout(800);
console.log('gameover', await active());
await page.screenshot({ path: process.argv[2] ? `${process.argv[2]}/g1_gameover.png` : 'g1.png' });
await tap('Enter'); await waitFor('Game'); await page.waitForTimeout(600);
// Victoria
await page.evaluate(() => { const w = window.__bc.world; w.inventory.add(3); const p = w.player; p.x = 1.6; p.y = 15.5; p.angle = Math.PI; w.interact(); });
await page.waitForTimeout(1500);
await page.keyboard.down('w'); await page.waitForTimeout(1600); await page.keyboard.up('w');
await waitFor('Win', 6000); await page.waitForTimeout(900);
console.log('win', await active());
await page.screenshot({ path: process.argv[2] ? `${process.argv[2]}/g2_win.png` : 'g2.png' });
await tap('ArrowDown'); await tap('Enter'); await waitFor('Title'); await page.waitForTimeout(600);
const last = await metrics();
console.log('final', JSON.stringify(last));

const first = rows[1], end = rows[rows.length - 1];
const grew = ['textures', 'sceneKeys', 'ptr', 'gsEvents', 'gameEvents'].filter((k) => end[k] > first[k]);
console.log('crecimiento ciclo2→10:', grew.length ? grew : 'ninguno', `| heap ${first.heapMB}→${end.heapMB} MB`);
console.log(errors.length ? errors : 'consola limpia');
await browser.close();
