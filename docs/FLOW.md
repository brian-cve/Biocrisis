# FLOW — scene state machine

Phaser scenes: `Boot · Title · Controls · Options · Intro · Game · Pause · Inventory · GameOver · Win`.
`Controls`, `Options`, `Pause` and `Inventory` are **overlays** (the originating scene is paused and resumed when they
close, without losing state). The rest replace one another with a fade to black (`ui/transition.ts`).

```mermaid
stateDiagram-v2
    [*] --> Boot
    Boot --> Title: user gesture (unlocks audio)
    Title --> Intro: NEW GAME
    Title --> Controls: CONTROLS (overlay)
    Title --> Options: OPTIONS (overlay)
    Title --> Credits: CREDITS (title's own panel)
    Controls --> Title: Esc / B / BACK
    Options --> Title: Esc / B / BACK
    Intro --> Controls: first time (controlsSeen = false)
    Intro --> Game: already seen / after skipping
    Controls --> Game: CONTINUE (first time only)

    Game --> Pause: P / START (overlay)
    Game --> Inventory: I / Tab / SELECT (overlay, world paused)
    Inventory --> Game: Esc / I / Tab / B
    Pause --> Game: RESUME / P / Esc
    Pause --> Controls: CONTROLS (overlay over pause)
    Pause --> Options: OPTIONS (overlay over pause)
    Controls --> Pause: BACK
    Options --> Pause: BACK
    Pause --> Game: RESTART (new game)
    Pause --> Confirm: BACK TO MAIN MENU
    Confirm --> Pause: NO
    Confirm --> Title: YES (the game is destroyed)

    Game --> GameOver: health = 0 (after 1.8 s)
    Game --> Win: cross the exit door (after 0.7 s)
    GameOver --> Game: RETRY
    GameOver --> Title: MAIN MENU
    Win --> Game: PLAY AGAIN
    Win --> Title: MAIN MENU
```

## Game lifecycle
`GameScene.create()` creates all the state (World, textures, input, audio, HUD); `SHUTDOWN` releases it
(`GameScene.dispose()`): pointer/wheel listeners, ambient loop, event hooks, the `fb` texture, pointer lock.
Every exit (menu, restart, Game Over, Victory) goes through there, so games can be chained without reloading.

## Input
`ui/gameInput.ts` unifies keyboard, gamepad and touch (the H6 touch overlay only fills `GameInput.touch`) from
`game/controls.ts`. Menus use `ui/menu.ts` (keyboard, gamepad, mouse/touch with tap).
