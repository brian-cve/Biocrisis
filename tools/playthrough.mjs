// Partida de prueba sin enemigos: recoge la llave y sale. Usa window.__bc (solo dev). Uso: node tools/playthrough.mjs <dir>
import { chromium } from 'playwright';
const dir = process.argv[2] ?? '.';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
const errors = [];
page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) errors.push(`${m.type()}: ${m.text()}`); });
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
await page.goto('http://localhost:5173/?scene=Game');
await page.waitForTimeout(1200);
const put = (x, y, a) => page.evaluate(([x, y, a]) => { const p = window.__bc.world.player; p.x = x; p.y = y; p.angle = a; }, [x, y, a]);
const shot = async (n) => { await page.waitForTimeout(500); await page.screenshot({ path: `${dir}/${n}.png` }); };

await put(14.5, 1.5, 0); await shot('p1_key_view');          // llave a la vista en el dormitorio
await put(16.6, 1.5, 0); await page.keyboard.down('w'); await page.waitForTimeout(500); await page.keyboard.up('w');
await shot('p2_key_taken');
await put(14.5, 10.5, 0); await shot('p3_shotgun_view');
await put(1.8, 15.5, Math.PI);
await page.keyboard.down('f'); await page.waitForTimeout(100); await page.keyboard.up('f');
await page.waitForTimeout(2000);
await shot('p4_exit_open');
await put(2.5, 15.5, Math.PI);
await page.keyboard.down('w'); await page.waitForTimeout(1500); await page.keyboard.up('w');
await shot('p5_win');
const st = await page.evaluate(() => ({ key: window.__bc.world.hasKey, won: window.__bc.world.won, fps: Math.round(window.__bc.game.loop.actualFps) }));
console.log(JSON.stringify(st), errors.length ? errors : 'consola limpia');
await browser.close();
