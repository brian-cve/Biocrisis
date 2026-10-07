// Verifica en navegador: escopeta, cambio de arma, curación e inventario. Uso: node tools/arsenal.mjs <dir>
import { chromium } from 'playwright';
const dir = process.argv[2] ?? '.';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
const errors = [];
page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) errors.push(`${m.type()}: ${m.text()}`); });
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
await page.goto('http://localhost:5173/?scene=Game');
await page.waitForTimeout(1200);
const st = () => page.evaluate(() => { const w = window.__bc.world; return { hp: w.hp, eq: w.equipped, mag: w.weapon.mag, bullets: w.ammo.bullets, shells: w.ammo.shells, tonics: w.tonics, slots: w.inventory.slots.slice(), heal: w.healTimer > 0, paused: window.__bc.scene.isPaused('Game'), invActive: window.__bc.scene.isActive('Inventory') }; });
const tap = async (k, ms = 90) => { await page.keyboard.down(k); await page.waitForTimeout(ms); await page.keyboard.up(k); };
const shot = async (n, wait = 250) => { await page.waitForTimeout(wait); await page.screenshot({ path: `${dir}/${n}.png` }); };
const setup = () => page.evaluate(() => {
  const w = window.__bc.world;
  w.inventory.add(1); w.inventory.add(2); w.inventory.add(2); w.inventory.add(3); // escopeta, 2 tónicos, llave
  w.weapons.shotgun.mag = 4; w.ammo.shells = 5; w.hp = 55;
  for (const z of w.zombies) { z.x = 1.5; z.y = 1.5; z.hp = 1e9; }
});
await setup();

// 1) escopeta equipada con la tecla 2 (tras el bloqueo de cambio)
await tap('2'); await page.waitForTimeout(600);
console.log('equipar', JSON.stringify(await st()));
await page.evaluate(() => { const w = window.__bc.world; const p = w.player; p.x = 9.5; p.y = 3.5; p.angle = Math.PI / 2; const z = w.zombies[2]; z.x = 9.5; z.y = 6.0; z.hp = 60; z.state = 0; });
await shot('a1_shotgun_idle', 200);
await tap('Space'); await shot('a2_shotgun_fire', 40);
await shot('a3_shotgun_pump', 450);
console.log('disparo', JSON.stringify(await st()), 'zombi', JSON.stringify(await page.evaluate(() => { const z = window.__bc.world.zombies[2]; return [z.hp, z.state]; })));
// 2) curarse en juego con H
await page.waitForTimeout(1000);
await tap('h'); await shot('a4_healing', 350);
console.log('curando', JSON.stringify(await st()));
await page.waitForTimeout(800);
console.log('curado', JSON.stringify(await st()));
// 3) inventario con Tab
await tap('Tab'); await shot('a5_inventory', 400);
console.log('inventario abierto', JSON.stringify(await st()));
await tap('ArrowRight'); await tap('ArrowRight'); await shot('a6_inv_tonic', 200);
await tap('Enter'); await shot('a7_inv_used', 200);
console.log('tras usar', JSON.stringify(await st()));
await tap('Escape'); await page.waitForTimeout(500);
console.log('cerrado', JSON.stringify(await st()));
await shot('a8_back', 200);
const fps = await page.evaluate(() => Math.round(window.__bc.game.loop.actualFps));
console.log('fps', fps, errors.length ? errors : 'consola limpia');
await browser.close();
