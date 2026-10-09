# BALANCE

The numbers live in the code (`game/zombie.ts`, `game/weapons.ts`, `game/world.ts`, `game/map.ts`, `game/player.ts`) and the
invariants are protected by `tests/balance.test.ts`. The difficulty figures were measured with an **automated player**
(`tools/bot.ts`, `npm run sim`); see "What the bot does and doesn't tell us".

## Weapons
| | Pistol | Shotgun |
|---|---|---|
| Damage | 10 per bullet | 7 x 7 pellets, x(1.4 - 0.18*d) with a minimum of 0.12 (~ 49 point-blank) |
| Magazine | 12 | 4 (reloads shell by shell) |
| Fire rate / reload | 0.32 s / 1.3 s | 1.0 s (pump) / 0.55 s per shell |
| Stagger | 0.25 s | 0.8 s + knockback |
| Noise (alerts zombies) | 9 cells | 12 cells |
| Ammo in the house | 12 in the magazine + 6 in reserve + 3 boxes of 4 = **30 bullets** | 2 loaded on pickup + 1 box of 3 = **5 shells** |

Why the shotgun doesn't make the pistol obsolete: almost no ammo (5), slow reload, 1 s fire rate, and beyond ~6 cells
nearly all pellets miss or do minimal damage. The pistol is the only "long-haul" weapon.

## Player and zombies
| | Player | Shambler | Runner |
|---|---|---|---|
| Speed (cells/s) | 2.1 (backward x0.6, sideways x0.85) | 0.95 | 1.75 |
| HP | 100 (+2 tonics of +35) | 70 (7 bullets) | 35 (4 bullets) |
| Damage per hit | - | 18 (0.55 s wind-up) | 12 (0.35 s wind-up) |
| Senses | - | sight 7, hears footsteps at 5.5 | sight 9, hears footsteps at 5.5 |

- Zombies are **solid** to the player (you can't walk through them: a zombie in a one-cell corridor blocks it).
- They persist: 12 s without seeing or hearing you before giving up; they follow footsteps within <= 5.5 cells even without seeing you.
- **Climax:** picking up the key wakes the house (the noise reaches every living zombie) and the exit door takes
  ~ 1 s to become passable. This is what prevents winning by running: 6 zombies converge just when you have to go back.

## Ammo budget (invariants covered by tests)
- Killing everything with the pistol would take 3x7 + 3x4 = **33 bullets** and there are **30** -> *you can't kill everyone
  with the pistol, even never missing*.
- But it's **not impossible**: a shell kills a runner point-blank (3 shells) and the shamblers cost 21 bullets: with
  the 5 shells and 30 bullets, that leaves 9 bullets of margin (~ 30 %) to miss. Anyone who shoots everything carelessly runs out of ammo.

## What the bot does and doesn't tell us (`npm run sim`, 40 games per policy, aim randomness)
An optimistic bound: perfect route, no hesitation, but with noisy aim (sigma ~ 0.2 rad) and 0.35 s reaction time.

| Policy | Wins | Deaths | Median time | Bullets | Accuracy | Kills | Tonics |
|---|---|---|---|---|---|---|---|
| Flee (run without shooting) | 0 % | 100 % | - | 0 | - | 0/6 | 0 |
| Stealth (shoots only whoever chases it <= 5) | 0 % | 100 % | - | 11.6 | 88 % | 1.0/6 | 0 |
| Aggressive (kills everything <= 9, picks up everything) | 40 % | 60 % | 111 s | 31.8 | 87 % | 5.3/6 | 0.6 |
| Tactical (kills runners, dodges shamblers) | 98 % | 3 % | 115 s | 28.3 | 99 % | 6.0/6 | 0.0 |

Reading:
- **Running doesn't work** (it was 100 % in 37 s before the key climax: see "Tuning history"). You have to fight or
  dodge smartly, and there isn't enough ammo for everything.
- The naive strategy (shoot everything) wins 4 out of 10; the thoughtful one almost always. A person will land in between: the
  goal was a **skill curve**, not a single number.
- The tactical bot is superhuman (99 % accuracy, perfect dodging): its 98 % is the ceiling, not the average.
- **Duration (5-10 min target): NOT verified with people.** The bot, without hesitating, takes ~ 2 min picking everything up.
  People stop, peek around, back up, reload and heal; the estimate (x2.5-4) gives 5-8 min, but it is an
  *estimate*. Knobs to lengthen/shorten without touching the design: `MOVE_SPEED` (2.1), number of zombies, `EXIT_DOOR_SPEED`,
  the zombies' `GIVE_UP`. Recommendation: 3-5 test games with people before considering the target met.

## Tuning history (what was changed and why, based on measurements)
1. First measurement: **flee 100 % in 33 s**, aggressive 100 % in 68 s without losing health. Causes: the player walked through
   zombies; zombies were too slow (0.75 / 1.55) for a player at 2.6; the bot hit 100 %.
2. Player 2.6 -> 2.1, backward x0.6 (no more "kiting" by walking backward), solid zombies, zombies 0.95 / 1.75.
3. Zombies gave up after 2-6 s: now 12 s and they hear nearby footsteps.
4. It was still winnable by running (nobody noticed in time): **the key wakes the house** and the exit takes ~ 1 s.
5. Ammo 36+6 -> 30+5 and aim assist 0.05 -> 0.035 rad (the bot was still hitting 90 %).
6. HP/damage sweep: (90, 40) with damage 20/12 made it impossible even for the tactical bot (93 % deaths); (60, 30) made it trivial;
   **(70, 35) with damage 18/12** was chosen (aggressive 40 %, tactical 98 %).
