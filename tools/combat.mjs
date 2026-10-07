// Prueba de combate en navegador: ver zombis, disparar, recargar, ser atacado y morir. Uso: node tools/combat.mjs <dir>
import { chromium } from 'playwright';
const dir = process.argv[2] ?? '.';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
const errors = [];
page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) errors.push(`${m.type()}: ${m.text()}`); });
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
await page.goto('http://localhost:5173/?scene=Game');
await page.waitForTimeout(1200);
const W = () => page.evaluate(() => { const w = window.__bc.world; return { hp: w.hp, mag: w.weapon.mag, reserve: w.ammo.bullets, kills: w.stats.kills, shots: w.stats.shots, hits: w.stats.hits, dead: w.dead, z: w.zombies.map((z) => [z.state, +z.x.toFixed(1), +z.y.toFixed(1), z.hp]) }; });
const put = (x, y, a) => page.evaluate(([x, y, a]) => { const p = window.__bc.world.player; p.x = x; p.y = y; p.angle = a; }, [x, y, a]);
const shot = async (n, wait = 300) => { await page.waitForTimeout(wait); await page.screenshot({ path: `${dir}/${n}.png` }); };
const tap = async (k) => { await page.keyboard.down(k); await page.waitForTimeout(90); await page.keyboard.up(k); };

// 1) zombi de la sala (5.5,8.5) a la vista, desde el sur-oeste
await put(5.5, 6.5, Math.PI / 2); await shot('c1_see_zombie', 200);
// 2) disparos hasta matarlo (rezagado: 6 impactos)
for (let i = 0; i < 3; i++) { await tap('Space'); await page.waitForTimeout(400); }
await shot('c2_firing', 0);
console.log('tras 3 tiros', JSON.stringify(await W()));
// 3) recarga
await tap('r'); await page.waitForTimeout(500); await shot('c3_reload', 0);
await page.waitForTimeout(900);
console.log('tras recarga', JSON.stringify(await W()));
// 4) dejar que se acerque y ataque
await page.evaluate(() => { const z = window.__bc.world.zombies[0]; const p = window.__bc.world.player; p.x = z.x - 1.5; p.y = z.y; p.angle = 0; });
await page.waitForTimeout(3500); await shot('c4_attacked', 0);
console.log('atacado', JSON.stringify(await W()));
// 5) morir
await page.evaluate(() => window.__bc.world.hurtPlayer(500));
await shot('c5_dead', 300);
const fps = await page.evaluate(() => Math.round(window.__bc.game.loop.actualFps));
console.log('fps', fps, errors.length ? errors : 'consola limpia');
await browser.close();
