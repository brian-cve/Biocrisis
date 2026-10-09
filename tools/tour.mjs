import { chromium } from 'playwright';
const dir = process.argv[2] ?? '.';
const spots = JSON.parse(process.argv[3] ?? '[]');
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
const errors = [];
page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) errors.push(`${m.type()}: ${m.text()}`); });
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
await page.goto('http://localhost:5173/?scene=Game');
await page.waitForTimeout(1200);
for (const s of spots) {
  await page.evaluate((s) => {
    const g = window.__bc;
    g.player.x = s.x; g.player.y = s.y; g.player.angle = s.a;
    for (const d of s.open ?? []) { g.doors.use(d[0], d[1]); }
  }, s);
  await page.waitForTimeout(s.wait ?? 900);
  await page.screenshot({ path: `${dir}/${s.name}.png` });
}
const fps = await page.evaluate(() => Math.round(window.__bc.game.loop.actualFps));
console.log('fps', fps, errors.length ? errors : 'clean console');
await browser.close();
