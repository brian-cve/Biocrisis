# FLOW — máquina de estados de escenas

Escenas Phaser: `Boot · Title · Controls · Options · Intro · Game · Pause · Inventory · GameOver · Win`.
`Controls`, `Options`, `Pause` e `Inventory` son **superposiciones** (la escena de origen se pausa y se reanuda al
cerrarlas, sin perder estado). El resto se sustituyen con un fundido a negro (`ui/transition.ts`).

```mermaid
stateDiagram-v2
    [*] --> Boot
    Boot --> Title: gesto del usuario (desbloquea audio)
    Title --> Intro: NUEVA PARTIDA
    Title --> Controls: CONTROLES (overlay)
    Title --> Options: OPCIONES (overlay)
    Title --> Credits: CRÉDITOS (panel del propio título)
    Controls --> Title: Esc / B / VOLVER
    Options --> Title: Esc / B / VOLVER
    Intro --> Controls: 1ª vez (controlsSeen = false)
    Intro --> Game: ya vistos / tras saltarla
    Controls --> Game: CONTINUAR (solo en la 1ª vez)

    Game --> Pause: Esc / START (overlay)
    Game --> Inventory: I / Tab / SELECT (overlay, mundo en pausa)
    Inventory --> Game: Esc / I / Tab / B
    Pause --> Game: REANUDAR / Esc
    Pause --> Controls: CONTROLES (overlay sobre la pausa)
    Pause --> Options: OPCIONES (overlay sobre la pausa)
    Controls --> Pause: VOLVER
    Options --> Pause: VOLVER
    Pause --> Game: REINICIAR (partida nueva)
    Pause --> Confirm: VOLVER AL MENÚ PRINCIPAL
    Confirm --> Pause: NO
    Confirm --> Title: SÍ (se destruye la partida)

    Game --> GameOver: vida = 0 (tras 1.8 s)
    Game --> Win: cruzar la puerta de salida (tras 0.7 s)
    GameOver --> Game: REINTENTAR
    GameOver --> Title: MENÚ PRINCIPAL
    Win --> Game: JUGAR DE NUEVO
    Win --> Title: MENÚ PRINCIPAL
```

## Ciclo de vida de una partida
`GameScene.create()` crea todo el estado (World, texturas, input, audio, HUD); `SHUTDOWN` lo libera
(`GameScene.dispose()`): listeners de puntero/rueda, bucle de ambiente, hooks de eventos, textura `fb`, pointer lock.
Cualquier salida (menú, reiniciar, Game Over, Victoria) pasa por ahí, así que se puede encadenar partidas sin recargar.

## Entrada
`ui/gameInput.ts` unifica teclado, gamepad y táctil (el overlay táctil de H6 solo rellena `GameInput.touch`) a partir de
`game/controls.ts`. Los menús usan `ui/menu.ts` (teclado, gamepad, ratón/táctil con tap).
