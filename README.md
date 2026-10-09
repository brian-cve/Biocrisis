# BioCrisis

Homenaje original a los survival-horror en primera persona de la era PS1: una casa pequeña de noche, munición escasa,
zombis lentos y amenazantes, una llave que encontrar y una puerta de salida. Seudo-3D con *raycasting*, jugable en
escritorio y en móvil (horizontal).

- **Todo el arte y el audio son procedurales**: texturas, sprites, HUD, logo, SFX y música se generan por código
  (Canvas 2D / `ImageData` / Web Audio). No hay ni un archivo de imagen o sonido: `dist/` contiene solo un HTML y un JS.
- **Contenido 100 % original.** Nombre, personajes, casa, logo y tipografía son propios.
- Stack: Phaser 3.90.0 + Vite + TypeScript. El motor (`src/engine/`) y la lógica (`src/game/`) son TypeScript puro, sin
  Phaser ni DOM, y están cubiertos por tests (Vitest).

## Ejecutar

Requisitos: Node 20+ (probado con Node 26).

```bash
npm install
npm run dev          # servidor de desarrollo en http://localhost:5173 (también accesible por red local)
npm test             # tests unitarios (Vitest, 128 tests)
npm run build        # comprueba tipos (tsc) y genera dist/
npm run preview      # sirve dist/ en http://localhost:4173
npm run sim          # simulación de balance con un jugador automático (ver docs/BALANCE.md)
```

## Cómo se juega

**Objetivo:** encuentra la llave (zona más lejana: el dormitorio) y abre la puerta del recibidor —la ves desde el inicio—.
**Aviso:** al coger la llave la casa despierta, y al abrir esa puerta despierta algo mucho peor: una gran sala con un jefe, una
metralleta y munición de sobra. Derrótalo para abrir la salida real, al fondo. Fuera de la arena la munición no da para matar a
todos: elige tus peleas.

### Controles (escritorio)
| Acción | Teclas |
|---|---|
| Avanzar / retroceder | `W` `↑` / `S` `↓` |
| Girar | `A` `←` / `D` `→` (o ratón, opción "Giro con ratón") |
| Strafe | `Q` / `E` |
| Disparar (la metralleta dispara en ráfaga si mantienes) | `Espacio` o clic |
| Recargar | `R` |
| Usar / abrir puerta | `F` |
| Pistola / escopeta / metralleta | `1` / `2` / `3` (o rueda del ratón) |
| Curarse (tónico) | `H` |
| Inventario | `I` o `Tab` |
| Pausa | `P` |

Mando: stick izquierdo mueve y gira (derecho también gira), A dispara, B usa, X recarga, Y/RB cura, LB cambia de arma, SELECT
inventario, START pausa. *(Implementado, no probado con un mando físico.)*

### Controles (móvil, en horizontal)
Mando estilo Game Boy: **D-pad** (avanzar/retroceder/girar; admite diagonales), **A** disparar, **B** recargar o usar
(contextual: abre la puerta si tienes una delante), **L** cambiar de arma, **R** curarse, **SELECT** inventario,
**START** pausa. Los mismos botones manejan los menús. En vertical se muestra un aviso y el juego se pausa.

La pantalla **CONTROLES** (menú de título y de pausa) muestra ambos esquemas y se genera desde la misma tabla que usa el
juego (`src/game/controls.ts`): nunca queda desactualizada.

## Probar en un móvil real (red local)

1. El móvil y el ordenador en la misma red Wi-Fi.
2. `npm run dev` (Vite escucha en `0.0.0.0`). Averigua la IP del ordenador: `ipconfig getifaddr en0` (macOS) o
   `hostname -I` (Linux).
3. En el móvil, abre `http://<IP>:5173` en horizontal y toca la pantalla para empezar (desbloquea el audio).
4. Si no carga: revisa el cortafuegos del ordenador (puerto 5173).
5. Depuración remota: Android → `chrome://inspect` por USB; iOS → Safari › Desarrollar › tu iPhone.
6. Notas: en iOS el interruptor de silencio mutea el audio web; `navigator.vibrate` no existe en iOS Safari (sin
   vibración); no hay modo pantalla completa ni PWA todavía.

## Cómo se midió el rendimiento

- **Objetivo:** 60 FPS en escritorio, ≥ 30 FPS estables en un móvil de gama media.
- **Método:** Chromium con emulación móvil (`isMobile`, `hasTouch`, 844×390) y `Emulation.setCPUThrottlingRate`
  (comprobado con un microbenchmark: ×4 → 4× más lento). Escena de máxima carga: 6 zombis persiguiendo, música de
  persecución, el jugador girando. FPS reales de Phaser cada 250 ms y coste por frame de `step` a `postrender`.
- **Resultado:** 60.5–60.7 FPS medios (mínimo 60.3) con CPU ×1, ×4, ×6 y ×10; coste por frame ≈ 1.3 ms (máx. 2.9 ms).
  Detalle y limitaciones en `docs/DECISIONS.md` (D-020, D-022). **No sustituye a un dispositivo real.**
- Reproducir: con `npm run dev` en marcha, `node tools/mobile.mjs <carpeta-capturas>`.

## Estructura

```
src/engine/    raycaster DDA, renderizador a Uint32Array, texturas/sprites procedurales, z-buffer, overlay
src/game/      mapa, mundo, IA de zombis (A*), armas, inventario, controles (fuente única), ajustes, rango
src/audio/     motor Web Audio, SFX, audio espacial, director del juego; music/ = música generativa
src/ui/        HUD, menús, mando táctil, entrada unificada, logo y arte del título
src/scenes/    Boot, Title, Controls, Options, Intro, Game, Pause, Inventory, GameOver, Win
docs/          DECISIONS.md, ASSETS.md, BALANCE.md, FLOW.md, REVIEW.md
tests/         tests unitarios (motor, IA, armas, inventario, balance, música, controles, táctil…)
tools/         scripts de verificación en navegador real y simulación de balance (ver abajo)
```

## Herramientas de verificación (`tools/`)

Usan Playwright (dependencia de desarrollo). La primera vez: `npx playwright install chromium`. Con `npm run dev` en marcha:

| Script | Qué comprueba |
|---|---|
| `node tools/flow.mjs <dir>` | recorre Boot → Título → Opciones → Controles → Intro → Juego → Pausa con capturas |
| `node tools/cycles.mjs <dir>` | 10 ciclos de iniciar/abandonar partida + Game Over + Victoria; mide fugas |
| `node tools/musiccheck.mjs` | música real con un analizador: niveles, pulso, intensidad, pausa, silencio, nodos |
| `node tools/audiocheck.mjs` | motor de audio: límite de voces, ducking, silencio, limpieza |
| `node tools/mobile.mjs <dir>` | móvil emulado: táctil real, multitouch, vertical, tamaños, CPU ×1/×4/×6/×10 |
| `node tools/alloc.mjs`, `tools/heapprof.mjs` | tasa de asignaciones y perfil del heap |
| `node tools/prodcheck.mjs` | build de producción (con `npm run preview`): flujo, sin dominios externos ni ganchos dev |
| `node tools/combat.mjs`, `arsenal.mjs`, `playthrough.mjs`, `tour.mjs`, `shot.mjs` | combate, armas/inventario, partida sin enemigos, recorrido y capturas |

En desarrollo, `?scene=Game` (o cualquier escena) salta directamente a esa escena.

## Documentación

- `docs/DECISIONS.md` — cada decisión técnica, alternativas descartadas y por qué (incluye el riesgo del nombre).
- `docs/BALANCE.md` — números, presupuesto de munición, resultados del bot y qué se cambió según las mediciones.
- `docs/FLOW.md` — máquina de estados de escenas. `docs/ASSETS.md` — qué se genera y cómo.
- `docs/REVIEW.md` — **revisión crítica honesta**: lo que quedó flojo y cómo mejorarlo.
