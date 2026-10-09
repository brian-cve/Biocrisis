# DECISIONS

Log of technical decisions: the decision, discarded alternatives, and the reason.

## D-001 Phaser 3.90.0 (not 4.x)
- **Decision:** pin `phaser@3.90.0`, the latest stable 3.x.
- **Discarded:** Phaser 4.x (it exists, but the requirement is 3.x and it changes the renderer).
- **Why:** Phaser only provides scenes, input, scaling and presentation; the raycaster is pure TS.

## D-002 Naming risk
- "BioCrisis" shares the "Bio-" prefix with existing franchises. Mitigated with our own logo, typography,
  palette and world; no hexagons, umbrellas or corporate red/white. Review before publishing.

## D-003 Floor and ceiling: floor casting (not a gradient)
- **Decision:** row-based floor casting in a single pass (floor + mirrored ceiling), with a texture per floor type
  (wood, tile, stone, carpet) and fog by row distance.
- **Discarded:** a smooth gradient. At 320×200 the cost is ~64k pixels/frame with simple arithmetic and it holds 60 FPS
  on desktop; the textured floor gives far more depth and distinguishes rooms.
- **Safeguard:** if H6/H7 show <30 FPS on mobile, a quality flag is added that falls back to a gradient.

## D-004 Doors
- **Model:** the door occupies one cell and its panel slides toward +wallX; the DDA lets the ray through if `wallX < opening`.
  No extra geometry and no allocations. It is solid until opening ≥ 0.8.
- **Interaction:** `F` key. The initial design assigned `E` to both strafe and "use"; it is resolved by leaving `E` for strafe
  (Q/E) and `F` for interaction. On mobile it will be the B button.
- **Closing:** a door can't be closed with someone inside its cell.
- The exit door starts locked; the key arrives in H3.

## D-005 House design
- A 1-cell central corridor (x=9) = the "tense narrow corridor". Loops: Foyer→Living room→Corridor→Foyer and
  Bedroom→Study→Corridor. Start in the foyer facing west: the exit door (0,15) is visible from the start
  (automated test). Key planned for the bedroom (NE, the farthest area); shotgun planned for the study.
- BFS test: every free cell is reachable from the start.

## D-006 Billboard sprites
- 32×32 sprite textures in palette indices (255 = transparent), drawn in code (`engine/sprites.ts`).
- Far→near ordering with insertion sort over a reusable `SpriteBatch` (zero allocations per frame);
  clipped against the walls' column z-buffer. A sprite doesn't occlude another via z-buffer (painter's algorithm
  between sprites: enough because they don't overlap meaningfully in depth).
- Pickups bob gently so they read in the dim light. Decoration has no collision
  (a simplicity decision: it avoids getting stuck in a narrow map).

## D-007 World in pure TS
- `game/world.ts` groups map, doors, player, items and objective, with no Phaser: testable (key, exit door,
  victory). The item counters (tonics/ammo/shotgun) are provisional and are replaced in H4b by the
  inventory model.
- Beyond the map edge (past the exit door) darkness is painted instead of a wall: it signals "outside".
- Victory = entering the exit cell (only possible with the door open, which requires the key).

## D-008 Zombies: AI and sensors
- **States:** `Idle → Alert (0.6 s) → Chase → Attack → Dead`. Hurt = stagger (`stagger`) with knockback, not a separate state.
- **Detection:** sight (distance ≤ `sight` + line of sight; closed doors block it) and hearing (a gunshot
  alerts zombies within ≤ 9 cells). Tried first with 14: it woke the whole house with one shot and killed stealth,
  so it was lowered to 9.
- **Movement:** straight if they see the player at < 2.5 cells; otherwise A* (4 neighbors, reusable buffers, repath every 0.5 s).
  If they lose sight of the player they go to the last known position and give up after 6 s (or 2 s after arriving).
- **Doors:** zombies open them (0.6 s wait). Closing a door delays but doesn't save you: a deliberate decision so
  there are no free refuges; the exit door is inaccessible to them.
- **Anti-stacking:** separation by circle overlap on every step.
- **Types:** Shambler (60 HP, 0.75 c/s, 18 damage, slow attack) and Runner (30 HP, 1.55 c/s, 10 damage). Both slower
  than the player (2.6 c/s), so fleeing works but costs resources/space. Pistol = 10 damage: 6 and 3 bullets.
- **Placement:** 3 shamblers + 3 runners (living room, kitchen, narrow corridor, bedroom next to the key, study next to
  the shotgun, storeroom). Fine balance goes in `BALANCE.md` (H7).

## D-009 Weapon
- `Weapon` (pure TS) with magazine, fire rate, reload and reserve; switching weapons cancels the reload without spending reserve.
  The shotgun (H4b) reuses the same class, adding pellets.
- Hitscan with angular tolerance (`aimAssist`, 0.05 rad) and line of sight; the nearest wins. Trying to fire with an
  empty magazine reloads automatically if there is reserve.
- The first-person weapon is a procedural ×2 bitmap with sway, recoil, muzzle flash and a drop while reloading.

## D-010 Shotgun (and why it doesn't make the pistol obsolete)
- 7 pellets of 7 damage in a spread (half-angle 0.14 rad, with some randomness), 1.0 s fire rate (pump animation),
  4-round magazine reloaded **shell by shell** (0.55 s each; firing interrupts the reload) and 0.8 s of knockback/stagger
  versus the pistol's 0.25 s.
- **Falling damage:** factor `clamp(1.4 − 0.18·dist, 0.12, 1)`: full up to ~2 cells and ~0.14 at 7. Also, the spread
  stops hitting at range (at 6 cells only ~1/3 of pellets reach a zombie). Result: up close ~49 damage
  (a runner dies; a shambler, with 60 HP, needs a second shell), from afar almost nothing. Automated test.
- Ammo: it comes with 2 loaded shells when picked up and there is only one other box of 4 in the house (6 total): deliberate scarcity.
- Aim assist centers the spread on the nearest target within tolerance.

## D-011 Weapon switching
- Keys `1`/`2`, mouse wheel (cycle) and, later, the L button. Switching **interrupts the reload** without spending reserve
  (reloading only transfers ammo on completion) and the holstered weapon is frozen.
- **0.4 s cooldown** after switching (can't fire): avoids "switch-spam" to skip the shotgun's fire rate
  (fire, switch to pistol, fire, switch back) and the reload. It's short so as not to punish tactical switching.

## D-012 Medicine
- The tonic heals **35** of 100 (fixed amount). It is not consumed at full health ("Health full" message).
- **In-game** (`H`, R button on mobile): 0.8 s animation. The player **can move** (not immobilized: fleeing
  while healing is the risk gamble) but **can't use weapons** (hands are busy) and **remains vulnerable**;
  the tonic is spent at the end, not the start. Taking a hit doesn't cancel the heal.
- **From the inventory** the world is paused, so it applies instantly: the classic trade-off (safe management
  outside combat), and what makes the quick shortcuts useful.

## D-013 Inventory
- **8 slots (4×2).** Pistol, shotgun and key take one each; tonics don't stack (one slot per unit).
  Ammo takes no slot and is shown next to the weapon. With 3 fixed items, 5 slots remain for tonics: this house has
  only 2, so capacity should never fill; it exists and is tested ("Inventory full" message and the
  item stays on the floor) so the model is honest and extensible.
- **Full pause** while open (the Game scene is paused and resumed without losing state). Reopening it with the
  same keypress that closes it is avoided (Phaser's keyboard queues events from paused scenes): a 250 ms lock.
- Menu controls: arrows/WASD, Enter/Space/F act, Esc/I/Tab/Backspace close; gamepad with d-pad/stick,
  A acts, B/SELECT/START close; touch: tap to select and tap again to act, `[CLOSE]` closes.

## D-014 Flow and scenes (H5)
- **Overlays vs. replacement:** Pause, Inventory, Controls and Options are launched on top and pause the originating scene;
  Boot/Title/Intro/Game/GameOver/Win replace one another with a fade. Exiting scenes stop the game
  explicitly (`scene.stop('Game')`) so its cleanup runs.
- **Controls after the intro, only once:** `controlsSeen` in `localStorage` (with `try/catch`; without storage it is
  shown every session, which is the safe option). Afterwards only on demand from title and pause.
- **Bug found and fixed:** an in-progress *entry* fade blocked the next *exit* fade (the first Enter after entering
  the title was ignored). `fadeTo` now only ignores if it's already going to black.
- **Keyboard events while paused:** Phaser queues events from paused scenes and replays them on resume, so
  the key that closes Pause/Inventory reopened the menu. Fix: `resetKeys()` + a 250 ms lock on resume.

## D-015 Default controls ("tank"?)
- **Keyboard:** left/right (A/D, ←/→) **turn**; Q/E strafe. That is, the classic "tank" scheme is the
  default. Reasons: (1) it matches the genre and the mobile D-pad (which turns); (2) with 20×20 cells and one-cell
  corridors, turning with the keyboard gives more control than a mouse and doesn't require Pointer Lock; (3) it keeps a single
  semantics across desktop, gamepad and touch. **Mouse turning** (Pointer Lock) exists as an option (off).
- **A single table** (`game/controls.ts`) feeds the input, the Controls screen and the mobile overlay; there are tests that
  every touch button has its action (B = contextual reload/use, L = switch weapon, R = heal).
- **`E` = strafe, `F` = use:** the initial design assigned `E` to both; resolved this way (see D-004).
- **Gamepad:** left stick moves/turns, right turns, A fires, B uses, X reloads, Y/RB heals, LB switches weapon, SELECT
  inventory, START pause. *Implemented but not tested with a physical gamepad* (not available here).

## D-016 Audio
- **One `AudioContext`** created on the first gesture ("press a key" screen), with `sfx / ambient / music → master` buses.
  Independent music and effects volume, global mute, and *ducking* on pause (effects ×0.12, ambient ×0.25,
  music ×0.3). The music engine (H5b) hangs off the `music` bus.
- **Voices:** every oscillator/noise burst is disconnected on `onended`; **cap of 28 simultaneous voices** (mobile CPU).
  A shared 2 s noise buffer. Ambient loops (wind in game, rain on the title) with a `stop()` that
  releases them. Verified in the browser: after 80 saturating shots the voices stay at 28 and return to 0.
- **Spatial:** pan = sin(relative angle), quadratic attenuation up to 14 cells (`audio/spatial.ts`, with tests).
  Groans, doors, impacts and zombie deaths carry a position; everything else sounds "in the head".
- **Director (`GameAudio`):** footsteps by distance walked, groan when alerted/attacking and sporadic while stalking
  (more frequent when chasing), heartbeat at health ≤ 30 (faster the lower the health), random distant dripping.

## D-017 Title, logo and HUD
- **Logo** drawn in code with our own block font (5×7): worn letters, a crack, blood drips and the
  "O" with a vertical red slit (own identity). No hexagons, umbrellas, corporate red/white or any franchise's
  typography. The "Bio-" prefix risk remains noted (D-002).
- **Title:** house in the storm (sky, veiled moon, dead tree, broken fence, flickering window, ajar door
  with a sliver of light), two fog layers, rain, lightning with delayed thunder and vignette.
- **Menu text:** system font (monospace) at 8–12 px; the logo is the only own typography. Minimum size
  8 px on 320×200 (≈ 24 px actual when scaled to 960×600).
- **Minimap:** optional and **off by default**: an always-visible map breaks the disorientation of an
  unfamiliar house and the tension of getting lost; it is kept as an accessibility aid.

## D-018 Generative music (H5b)
**Principle:** *textures and silences before melody.* Generative melody tends to sound bad (repetitive or shrill);
here what carries the mood is the pad, the continuous bass, the reverb and the scarcity of notes.

- **Clock:** the sequencer schedules with `AudioContext.currentTime`, not `setInterval`. `MusicEngine.tick()` is called
  every Phaser frame and schedules the next **0.8 s** of notes with absolute audio-clock times: the rhythm
  doesn't depend on FPS. If the scheduler falls behind by >0.4 s (hidden tab, hitch) it **resyncs** instead of
  firing a burst of overdue notes.
- **Pure/audio separation:** `composer.ts` (what plays), `theory.ts` (scales/chords) and `intensity.ts` are pure TS with a seeded
  RNG and tests (determinism, scale membership, density, layers); `synth.ts` and `index.ts` only play.
- **Menu (54 BPM, C minor):** progression Cm7–Abmaj7–Fm7–G, one chord every 2 bars. Pad (2 detuned saws +
  triangle, filtered, 1.6 s attack), continuous bass overlapping by 2 bars, an occasional low piano note and a **very sparse**
  bell arpeggio (≈ 1 in 4 beats, ≤ 3 per bar, a short walk over the chord + ninth, silence
  in the last bar of each 8-bar phrase). Convolution reverb with a noise-generated impulse (3.4 s, dark tail).
- **Exploration (Phrygian D):** drones with beating, and between 7 and 20 s of silence, a random event: dissonant cluster
  (minor 2nd or tritone, slow swell, ≥ 12 s between clusters), a low piano note in the scale, or a filtered creak; more than
  a third of the turns are pure silence. A different seed per game → it never repeats exactly, but keeps its character.
- **Chase (108 BPM) in layers by intensity 0..1:** low pulse (>0.08) → hi-hats and toms (>0.35/0.45) →
  high strings in minor 2nds with tremolo (>0.55). Intensity rises in ~1.6 s with zombies alert/chasing/attacking
  (closer = more) and **falls in ~8 s** as things calm down. The chase layer enters by crossfade and exploration recedes.
  The pulse is only scheduled while audible (saves CPU).
- **Stingers:** Game Over (dry hit + low dissonant cluster + saw drop, ≈ 6 s) and Victory (warm C major chord +
  rising bells, ≈ 8 s). They silence the other layers.
- **Pause and mute:** the music goes through the `music` bus: on pause it drops ×0.3 (≈ −10 dB) and the mute button
  zeroes it (verified with an analyzer: −120 dBFS).
- **CPU/nodes:** cap of 44 live music sources; every voice is disconnected on `onended`. Layers have their own gain and
  their own send to the reverb (the crossfade also shuts off the reverb tail). The reverb node is single and persistent.

**Browser measurements (analyzer on the master):** menu ≈ −23.5 dBFS (peak 0.5, no clipping); exploration ≈ −26
dBFS (peak 0.13–0.17); chase ≈ −23 dBFS with peaks 0.53 (percussive); the pulse shows in the envelope
(autocorrelation at 556 ms = 0.73 versus ≈ 0.2 at unrelated lags); pause ≈ −15 dB; silence −120 dB; stinger audible
and silence afterwards; music nodes bounded (menu 13–36, exploration 4–13) and **0 after shutting off** (≤ 50 s: the long
drones finish their tail). *I couldn't listen to it: the check is instrumental; the aesthetic criterion (does it sound good?)
is left to the player's ear.*

## D-019 Touch controls (H6)
- **DOM/CSS overlay** (`ui/touchUI.ts`), not canvas: it inherits `touch-action: none`, safe areas (`env(safe-area-inset-*)`) and
  scales with `vmin`/`clamp()`; the Phaser canvas stays underneath. D-pad on the left; A and B on the right; L/R in the
  top corners; START/SELECT at the top center.
- **Real multitouch:** Pointer Events with `setPointerCapture` and tracking by `pointerId`. Each button supports several
  pointers and is only released when all are lifted; the D-pad follows **a single finger** (the first) and computes
  directions by position, so you can slide between them and press diagonals (forward + turn). Verified with real touches
  via CDP (two fingers at once: `up+left` and `A`) and with synthetic Pointer Events of different `pointerId` (D-pad
  held + 3 shots with A: 3 presses, 3 shots, continuous movement, nothing stuck). `blur` releases everything.
- **Shared state through counters** (`ui/touchState.ts`): each button has `held` and a press counter; the consumer
  (game, each menu) compares with the last counter it saw. A tap shorter than a frame isn't lost and several
  consumers don't steal each other's events (tests).
- **Same buttons in menus:** `PadNav` (which already read the gamepad) also reads the touch pad: D-pad moves, A accepts,
  B goes back, START/SELECT. The intro is skipped with any button. Direct taps on menus still work.
- **Sizes:** all touch zones ≥ 48 CSS px (measured: minimum 48), with a max cap on tablets so they don't grow
  without limit. Button labels are hidden on screens that aren't very wide (< 18:10), where they don't fit between buttons;
  they remain on the Controls screen. Measured at 667×375, 740×360, 844×390, 932×430 and 1024×768: no overlaps, no
  off-screen buttons and no scrolling.
- **Position:** A/B above the HUD bar (ammo isn't covered) and START/SELECT at the top center, over the ceiling, where they cover the
  least relevant part of the image (the first version put them at the bottom and they covered weapon and HUD).
- **D-pad for turning (critique):** it's less precise than a stick. Mitigations: (1) adjustable turn sensitivity (0.5–2);
  (2) touch turning **accelerates** (starts at 50 % and reaches full speed in ~0.35 s) to aim finely with short taps
  without losing speed when held; (3) toggleable aim assist. Strafe omitted on mobile (the D-pad already turns).
- **Contextual B:** opens the door if one is in front; otherwise reloads (L = switch weapon, R = heal). These are the
  only actions that don't get in the way of the view; the design with small L/R at the top **doesn't clutter** the screen at 16:9+ since they
  take up a strip that is almost always ceiling.
- **Portrait: a warning instead of an alternative layout.** A portrait layout would give an image of ~28 % of the screen (390×244
  on 390×844), a worse FOV and less immersion for a game of darkness and tight spaces, plus a second controls design to
  test. Decision: show "ROTATE YOUR DEVICE", **freeze the game** (`loop.sleep()`) and suspend the audio
  in portrait; on returning to landscape everything resumes (verified: world time constant and audio `suspended` → `running`).
- **Haptics:** `navigator.vibrate` (if present) on button presses (6–8 ms), on firing (14/34 ms), on taking damage (60 ms) and
  on dying (pattern). iOS Safari doesn't implement it: it degrades to nothing.
- **"Touch controls" setting:** AUTO (based on `pointer: coarse`), YES or NO (useful on touch laptops or for debugging).
  The start screen ("tap to start") hides the pad so taps reach the canvas.
- **Tap-to-fire on the canvas disabled** while the pad is visible (avoids accidental shots).

## D-020 Mobile performance (method and results)
- **Method:** Chromium with mobile emulation (`isMobile`, `hasTouch`, DPR 2, 844×390) and `Emulation.setCPUThrottlingRate`.
  The *throttling* was confirmed to be real with a microbenchmark (16 ms → 65 / 98 / 163 ms at ×4 / ×6 / ×10). Worst-case
  scene: a game with all 6 zombies chasing at once, chase music active and the player turning.
  Real Phaser FPS is measured every 250 ms, as is the per-frame cost (from `step` to `postrender`).
- **Result:** 60.5–60.7 FPS average and minimum 60.3 with CPU ×1, ×4, ×6 and ×10; per-frame cost 1.3 ms (×1), max 2.9 ms.
  Although the measured cost didn't scale linearly with the CPU limit, **even multiplying the ×1 cost by 10 (≈ 13 ms)
  fits within the 16.6 ms budget** of 60 FPS. Target (≥ 30 stable FPS on mid-range) met with margin.
- **Honest limitation:** it is an emulation on a laptop; it doesn't replace a real device (GPU, thermals, the mobile
  browser's compositor, the cost of `putImageData` in old WebViews). How to test on a real phone: see the README (H7).

## D-021 Balance and difficulty design (H7)
See `docs/BALANCE.md` for figures and sweeps. Design decisions that came from measuring, not from intuition:
- **Solid zombies** for the player (before, you walked through them: a one-cell corridor blocked nothing).
- **Backward ×0.6 / sideways ×0.85**: without this, walking backward while shooting a shambler was a sure win.
- **The key wakes the house** (`ALARM_RADIUS = 40`) and **the exit door is slow** (≈ 1 s): it turns the return stretch into the climax and
  removes "run to the exit" as a dominant strategy.
- **Zombie persistence** (12 s, they follow footsteps at ≤ 5.5): losing a pursuer is no longer free.
- Aim assist 0.035 rad, on by default, can be disabled. Ammo 30 bullets + 5 shells.
- **Invariant tests** were added (`tests/balance.test.ts`) so that no future tweak breaks the rule "you can't
  kill everyone with the pistol, but it's not impossible".

## D-022 Performance: per-frame allocations
- **Measured** with heap sampling (`tools/heapprof.mjs`, `tools/alloc.mjs`): the hot loop allocated ≈ 1.6 MB/s
  (≈ 27 KB/frame), dominated by the *boxing* of doubles when passing 4 decimal arguments to `castRay` 320 times per frame
  (`drawWalls` + `castRay` ≈ 1 MB/s).
- **Fix:** `castHit(map, hit)` reads the ray from fields of a reused object (double fields don't allocate); `castRay`
  remains as a wrapper for the rest of the code/tests. `GameInput` with no temporary objects or per-frame iterators, and
  `hyp()` in the AI instead of `Math.hypot`.
- **Result:** 1.6 MB/s → 0.55–0.9 MB/s (minor GCs go from ~1/s to ~0.5/s). The rest is mostly internal to Phaser
  (Graphics/`emit`) plus a minor leftover of boxing in `castHit`. It doesn't exceed the budget: per-frame cost stays at ~1–3 ms.
  Honestly: the "no allocations in the hot loop" requirement is met in *rendering* (z-buffer, sprites, floors) but
  **not 100 %** in the full game.

## Final boss and arena (expansion)
- The foyer door (3,19) (`CELL_BOSS_DOOR`, id 6) requires the key and leads to an 18×14 arena (rows 20-34) with cover pillars. The map goes from 20×20 to 20×35; the real exit (9,34) stays sealed until the boss is defeated.
- Opening that door creates the boss (`World.startBossFight`, spawns at `BOSS_SPAWN`): it is added to `world.zombies` at that moment, so the unopened house still has exactly 6 zombies (balance and tests intact).
- Boss (`BOSS`): 650 HP, speed 1.15 (enrages below 50 %: ×1.45 speed and shorter recovery; it is still slower than the player, `MOVE_SPEED = 2.1`), 32 damage, `poise` 0.12 (barely staggers/gets knocked back) and never loses the trail.
- Submachine gun (`SMG`, key `3`, automatic fire while held, shares bullets with the pistol): 30-round magazine, 9 damage.
  It is picked up in the arena next to the door. 6 boxes of 40 bullets and 2 of 8 shells + 2 tonics spread around the arena.
- `tools/bot.ts` still assumes the old exit (0,15): it doesn't know how to fight the boss.
