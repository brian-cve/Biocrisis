// Uso: node tools/shot.mjs <salida.png> [teclas-a-mantener-ms ...]  — abre el juego, captura y vuelca errores de consola.
import { chromium } from 'playwright';
const out = process.argv[2] ?? 'shot.png';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`); });
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
await page.goto('http://localhost:5173/?scene=Game');
await page.waitForTimeout(1500);
await page.waitForTimeout(500);
await page.waitForTimeout(300);
await page.screenshot({ path: out });
const fps = await page.evaluate(() => document.querySelector('canvas') ? 'canvas ok' : 'no canvas');
console.log(fps, errors.length ? errors : 'consola limpia');
await browser.close();
