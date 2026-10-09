# Critical review (H7)

What works has been measured; what's weak is stated. Ordered by importance.

## 1. What is NOT verified (and should be)
- **The 5-10 min duration and "real tension": without human players this can't be considered met.** The bot clears it in ~ 2 min;
  the estimate for a person is 5-8 min (x2.5-4), but it is an estimate. **Proposal:** 3-5 timed games with people who
  don't know the map, then adjust `MOVE_SPEED`, the number of zombies or the exit door accordingly.
- **A real mobile device.** All the touch work was tested in emulated Chromium (real touch via CDP, real multitouch,
  CPU x1-x10). Missing: real GPU/thermals/compositor, Safari iOS behavior (silent switch, `dvh`, edge gestures) and
  the real ergonomics of thumbs. **Proposal:** a 30-minute pass on a mid-range Android and an iPhone.
- **Physical gamepad**: implemented, untested.
- **The music and SFX have not been listened to**: they were measured (levels, peaks, pulse, intensity, silence) but whether they
  *sound good* is a human judgment. The sample-to-sound mapping is isolated in the `BANK` table in `sfx.ts`.

## 2. Balance
- The skill curve exists (clumsy 40 %, skilled ~ 98 %), but the tactical bot is superhuman; **the real difficulty for
  a person lies between the two and is unknown**. Balance was tuned against bots, not people.
- Once the house wakes, **the zombies converge and the player has few options left**: the design rewards
  preparation (collecting everything before the key) and punishes improvising. It may be frustrating for anyone who doesn't expect it.
  **Proposal:** a clearer signal before taking the key (make the key room visually more unsettling) or a side
  escape door in the bedroom.
- **Possible soft-lock, though unlikely:** if all the ammo is spent and a shambler blocks the only route, the only option is to
  dodge. The map has loops and zombies chase (which unblocks them), but it hasn't been exhaustively tested.
- There is no adjustable difficulty. It's cheap to add (HP/damage/ammo multipliers).

## 3. Zombie AI
- Functional but **simple**: A* recomputed every 0.5 s, no coordination (they don't flank or split routes), they pile up
  in one-cell corridors and after losing the player they don't "search" (they don't inspect rooms). They open doors but
  never close them. They give up after 12 s.
- 360 deg vision (no cone): they detect from behind with line of sight. It's harsher than the classics, but predictable.
- **Proposal:** a vision cone, room-by-room searching after losing the trail, and a different groan per state
  (an `alert` state already exists in the audio; it needs more personality).

## 4. Performance
- It meets the target with margin in what was measured (~ 1-3 ms/frame; 60 FPS with emulated CPU x10), **but**:
  - the "zero allocations in the hot loop" requirement is met in *rendering* and not entirely in the full game
    (~ 0.55-0.9 MB/s of garbage remains, mostly internal to Phaser plus some leftover *boxing* in `castHit`);
  - the JS weighs **1.3 MB (358 KB gzip)**, mostly Phaser; on slow phones over 3G it may be slow. Phaser is used
    only as a shell: a Phaser-free version would be ~ 40 KB;
  - the textured floor is *floor casting* every frame; there is no "low quality" mode for phones much slower than what was
    emulated (the D-003 safeguard is still pending implementation if needed).

## 5. Touch UX
- **The D-pad is imprecise for turning** (mitigated with sensitivity and acceleration, not solved). A floating virtual
  stick on the left half would be better, at the cost of losing the discrete direction buttons in menus.
- The buttons **cover part of the image** (A/B on the right, D-pad on the left, L/R and START/SELECT at the top). They were
  placed to avoid covering the HUD, but on screens that aren't very wide they overlap the game. We need to decide with
  players whether they accept the current opacity.
- **Landscape only**, with a warning in portrait. An alternative portrait layout was discarded (D-019) and remains
  a gap if the user has their phone locked in portrait.
- No fullscreen or PWA; on iOS regular Safari keeps its bar and the image is smaller.

## 6. Accessibility
- **Title screen lightning**: strong, random flashes. There is no photosensitivity warning or option to
  reduce them. **Proposal (quick): a "reduce flashes" option and limiting the lightning's contrast.**
- The audio cues (spatial groans, heartbeat) **have no visual equivalent**: there is no directional damage indicator
  or sound captions.
- Monospaced text of 8-12 px on 320x200 (~ 24 px actual at 960x600): readable on desktop, tight on small
  phones. HUD colors (green/amber/red) were designed to not rely on color alone (there is Fine/Caution/Danger text).

## 7. Procedural art and recorded audio
- Zombies are **32x32 billboards with 5 poses**, with no per-angle rotation: they look the same from the front as from behind.
- The **textures repeat a lot** (5 wall, 4 floor): the house feels uniform. The brick is still somewhat oversaturated.
- The audio is third-party CC0 material chosen without listening; some samples may need swapping (see `BANK` in `sfx.ts`).
- The font is a system font (monospace); only the logo has its own typography.

## 8. Scope and technical debt
- A single level and a single run; no saving (outside the project's scope).
- `tools/` is a set of useful scripts but **they are not automated CI tests**: they depend on the server and Playwright.
  Turning them into an E2E suite with assertions and `npm run e2e` would be the next step.
- `GameScene` concentrates a lot (rendering, input, game end, settings): it could be split up.
- The name "BioCrisis" shares the "Bio-" prefix with existing franchises (D-002); if published, a trademark
  search is advisable.

## What I would do next (in order)
1. Human playtest of duration and difficulty -> adjust `MOVE_SPEED`/zombies. 2. Testing on real devices. 3. A reduce-flashes
option + a directional damage indicator. 4. AI: vision cone and searching. 5. Automated E2E with assertions.
6. Optional floating virtual stick and a low-quality mode.
