// Comprueba el motor de audio en un navegador real: voces, limpieza y ducking. Uso: node tools/audiocheck.mjs
import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
const errors = [];
page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) errors.push(`${m.type()}: ${m.text()}`); });
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
await page.goto('http://localhost:5173/');
await page.waitForTimeout(800);
await page.keyboard.down('Space'); await page.waitForTimeout(90); await page.keyboard.up('Space');
await page.waitForTimeout(1200);
const r = await page.evaluate(async () => {
  const a = window.__audio;
  const sfxMod = await import('/src/audio/sfx.ts');
  const sfx = sfxMod.sfx;
  const out = { state: a.ctx.state, sampleRate: a.ctx.sampleRate };
  const sp = { pan: -0.5, gain: 0.8 };
  sfx.pistol(); sfx.shotgun(); sfx.pump(0.3); sfx.reload(); sfx.groan(sp, false); sfx.groan(sp, true); sfx.door(sp, true);
  sfx.heal(); sfx.heartbeat(); sfx.step(); sfx.zombieDie(sp); sfx.thunder(); sfx.keyPickup();
  out.voicesPeak = a.voices;
  for (let i = 0; i < 80; i++) sfx.pistol(); // saturar: el límite de voces debe frenar
  out.voicesAfterSpam = a.voices;
  out.limitOk = a.voices <= 28;
  const g = (n) => +a.buses[n].gain.value.toFixed(3);
  out.gainsNormal = { sfx: g('sfx'), ambient: g('ambient'), music: g('music') };
  a.setDucked(true);
  await new Promise((r) => setTimeout(r, 400));
  out.gainsDucked = { sfx: g('sfx'), ambient: g('ambient'), music: g('music') };
  a.setDucked(false);
  a.setVolumes({ musicVolume: 0.7, sfxVolume: 0.9, muted: true });
  await new Promise((r) => setTimeout(r, 300));
  out.masterMuted = +a.master.gain.value.toFixed(3);
  a.setVolumes({ musicVolume: 0.7, sfxVolume: 0.9, muted: false });
  await new Promise((r) => setTimeout(r, 6000)); // las voces más largas (trueno 3.2 s) terminan
  out.voicesAfterWait = a.voices;
  return out;
});
console.log(JSON.stringify(r, null, 1));
console.log(errors.length ? errors : 'consola limpia');
await browser.close();
