# Revisión crítica (H7)

Lo que funciona está medido; lo que está flojo, dicho. Ordenado por importancia.

## 1. Lo que NO está verificado (y debería)
- **Duración de 5–10 min y "tensión real": sin jugadores humanos no se puede dar por cumplido.** El bot lo recorre en ≈ 2 min;
  la estimación para una persona es 5–8 min (×2.5–4), pero es una estimación. **Propuesta:** 3–5 partidas con gente que no
  conozca el mapa, cronometradas, y ajustar `MOVE_SPEED`, nº de zombis o la puerta de salida según el resultado.
- **Dispositivo móvil real.** Todo el trabajo táctil se probó en Chromium emulado (táctil real vía CDP, multitouch real,
  CPU ×1–×10). Faltan GPU/térmica/compositor reales, el comportamiento de Safari iOS (silencio, `dvh`, gestos de borde) y
  la ergonomía real de los pulgares. **Propuesta:** pasada de 30 min en un Android de gama media y un iPhone.
- **Gamepad físico**: implementado, sin probar.
- **La música y los SFX no se han escuchado**: se midieron (niveles, picos, pulso, intensidad, silencio) pero que
  *suenen bien* es un juicio humano. Los parámetros están aislados en `composer.ts`/`synth.ts`/`sfx.ts`.

## 2. Balance
- La curva de habilidad existe (torpe 40 %, hábil ≈ 98 %), pero el bot táctico es sobrehumano; **la dificultad real para
  una persona está entre ambos y es desconocida**. El balance se afinó contra bots, no contra gente.
- Una vez que la casa despierta, **los zombis convergen y el jugador ya no tiene muchas opciones**: el diseño premia la
  preparación (recoger todo antes de la llave) y castiga improvisar. Puede ser frustrante para quien no lo espere.
  **Propuesta:** una señal más clara antes de coger la llave (la sala de la llave visualmente más inquietante) o una puerta
  lateral de escape en el dormitorio.
- **Soft-lock posible, aunque improbable:** si se gasta toda la munición y un rezagado bloquea la única ruta, solo se
  puede esquivar. Hay bucles en el mapa y los zombis persiguen (desbloquean), pero no está probado exhaustivamente.
- No hay dificultad ajustable. Son baratas de añadir (multiplicadores de PV/daño/munición).

## 3. IA de los zombis
- Funcional pero **simple**: A* recalculado cada 0.5 s, sin coordinación (no flanquean, no se reparten rutas), se apilan
  en los pasillos de una celda y tras perder al jugador no "buscan" (no inspeccionan habitaciones). Abren puertas pero
  nunca las cierran. Se rinden a los 12 s.
- Visión de 360° (sin cono): detectan por detrás con línea de visión. Es más duro que lo clásico, pero previsible.
- **Propuesta:** cono de visión, búsqueda por estancias tras perder el rastro, y un sonido de gruñido distinto por estado
  (ya se ve un estado `alert` en el audio, falta darle más personalidad).

## 4. Rendimiento
- Cumple con margen en lo medido (≈ 1–3 ms/frame; 60 FPS con CPU ×10 emulado), **pero**:
  - el requisito de "cero asignaciones en el bucle caliente" se cumple en el *render* y no del todo en el juego completo
    (queda ≈ 0.55–0.9 MB/s de basura, sobre todo interna de Phaser y un resto de *boxing* en `castHit`);
  - el JS pesa **1.3 MB (358 KB gzip)**, casi todo Phaser; para móviles lentos sobre 3G puede ser lento. Se usa Phaser
    solo como cáscara: una versión sin Phaser sería ≈ 40 KB;
  - el suelo texturizado es *floor casting* por frame; no hay modo "calidad baja" para móviles mucho más lentos que lo
    emulado (la salvaguarda D-003 sigue pendiente de implementar si hiciera falta).

## 5. UX táctil
- **El D-pad es impreciso para girar** (se mitiga con sensibilidad y aceleración, no se resuelve). Un stick virtual
  flotante en la mitad izquierda sería mejor, a costa de perder los botones de dirección discretos en los menús.
- Los botones **tapan parte de la imagen** (A/B a la derecha, D-pad a la izquierda, L/R y START/SELECT arriba). Se
  colocaron para no cubrir el HUD, pero en pantallas poco panorámicas se solapan con el juego. Hay que decidir con
  jugadores si aceptan la opacidad actual.
- **Solo horizontal**, con aviso en vertical. Un layout vertical alternativo se descartó (D-019) y sigue siendo una
  carencia si el usuario tiene el móvil bloqueado en vertical.
- Sin pantalla completa ni PWA; en iOS el Safari normal mantiene su barra y la imagen es más pequeña.

## 6. Accesibilidad
- **Relámpagos de la pantalla de título**: destellos fuertes y aleatorios. No hay aviso de fotosensibilidad ni opción de
  reducirlos. **Propuesta (rápida): opción "reducir destellos" y limitar el contraste del relámpago.**
- Las pistas de audio (gruñidos espaciales, latido) **no tienen equivalente visual**: no hay indicador direccional de
  daño ni subtítulos de sonido.
- Texto monoespaciado de 8–12 px sobre 320×200 (≈ 24 px reales a 960×600): legible en escritorio, justo en móviles
  pequeños. Colores del HUD (verde/ámbar/rojo) pensados sin depender solo del color (hay texto Bien/Precaución/Peligro).

## 7. Arte y audio procedural
- Los zombis son **billboards de 32×32 con 5 poses**, sin rotación por ángulo: se ven iguales de frente que de espaldas.
- Las **texturas se repiten mucho** (5 de pared, 4 de suelo): la casa resulta uniforme. El ladrillo sigue algo saturado.
- La música es sutil por diseño (texturas y silencios); un jugador que espere melodía la encontrará escasa.
- La fuente es del sistema (monoespaciada); solo el logo tiene tipografía propia.

## 8. Alcance y deuda técnica
- Un solo nivel y una sola partida; sin guardado (fuera de alcance por el prompt).
- `tools/` es un conjunto de scripts útiles pero **no son tests automáticos de CI**: dependen del servidor y de Playwright.
  Convertirlos en una suite E2E con aserciones y `npm run e2e` sería lo siguiente.
- `GameScene` concentra bastante (render, entrada, fin de partida, ajustes): se podría dividir.
- El nombre "BioCrisis" comparte el prefijo "Bio-" con franquicias existentes (D-002); si se publica, conviene una
  búsqueda de marcas.

## Lo que haría después (por orden)
1. Playtest humano de duración y dificultad → ajustar `MOVE_SPEED`/zombis. 2. Prueba en dispositivos reales. 3. Opción de
reducir destellos + indicador visual de daño direccional. 4. IA: cono de visión y búsqueda. 5. E2E automático con aserciones.
6. Stick virtual flotante opcional y modo de calidad baja.
