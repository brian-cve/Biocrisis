import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const dir = process.argv[2] ?? 'frames';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const sleep = (ms) => page.waitForTimeout(ms);
const world = (fn, arg) => page.evaluate(fn, arg);

async function record(name, frames, hook = async () => {}) {
  mkdirSync(`${dir}/${name}`, { recursive: true });
  const t0 = Date.now();
  for (let i = 0; i < frames; i++) {
    await hook(i);
    writeFileSync(`${dir}/${name}/${String(i).padStart(3, '0')}.jpg`, await page.screenshot({ type: 'jpeg', quality: 85 }));
  }
  writeFileSync(`${dir}/${name}/ms.txt`, String(Math.round((Date.now() - t0) / frames)));
}
const fresh = async (scene = 'Game') => {
  await page.goto(`http://localhost:5173/?scene=${scene}`);
  await sleep(1200);
};
const put = (x, y, a) => world(([x, y, a]) => { const p = window.__bc.world.player; p.x = x; p.y = y; p.angle = a; }, [x, y, a]);
const key = async (k, ms = 120) => { await page.keyboard.down(k); await sleep(ms); await page.keyboard.up(k); };

await fresh('Title');
await record('titulo', 24);

await fresh();
await world(() => { for (const z of window.__bc.world.zombies) { z.x = 1.5; z.y = 1.5; } });
await put(11.6, 1.5, 0);
await record('llave', 30, async () => {
  await page.keyboard.down('w');
  await sleep(40);
});
await page.keyboard.up('w');

await fresh();
await world(() => { const w = window.__bc.world; w.hp = 1e6; for (const z of w.zombies) { z.x = 1.5; z.y = 1.5; } const z = w.zombies[1]; z.x = 7.5; z.y = 7.5; z.hear(2.5, 7.5); });
await put(2.5, 7.5, 0);
await record('zombie', 50, async (i) => {
  if (i % 6 === 3 && i > 8) await key('Space', 60);
  else await sleep(30);
});

await fresh();
await world(() => {
  const w = window.__bc.world; w.hp = 1e6;
  for (const z of w.zombies) { z.x = 1.5; z.y = 1.5; }
  w.inventory.add(3);
  w.inventory.add(4); w.weapons.smg.mag = 30; w.ammo.bullets = 300;
});
await put(3.5, 17.8, Math.PI / 2);
await record('arena', 36, async (i) => {
  if (i === 3) await world(() => window.__bc.world.interact());
  if (i > 12 && i < 24) await page.keyboard.down('w'); else await page.keyboard.up('w');
  await sleep(30);
});
await page.keyboard.up('w');

await fresh();
await world(() => {
  const w = window.__bc.world; w.hp = 1e6;
  for (const z of w.zombies) { z.x = 1.5; z.y = 1.5; }
  w.inventory.add(3); w.inventory.add(4);
  w.weapons.smg.mag = 30; w.ammo.bullets = 400;
  w.doors.unlock(3, 19); w.doors.use(3, 19);
  w.player.x = 9.5; w.player.y = 22.5; w.player.angle = Math.PI / 2;
});
await sleep(200);
await key('3', 150);
await sleep(500);
await page.keyboard.down('Space');
await record('jefe', 48, async (i) => {
  await world((i) => {
    const w = window.__bc.world; const b = w.boss; const p = w.player;
    if (b && !b.dead) p.angle = Math.atan2(b.y - p.y, b.x - p.x);
    if (i === 20) b.hp = Math.min(b.hp, b.maxHp * 0.45);
  }, i);
  await sleep(20);
});
await page.keyboard.up('Space');

console.log(errors.length ? errors : 'clean console');
await browser.close();
