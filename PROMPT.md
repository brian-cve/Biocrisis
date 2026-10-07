# PROMPT PARA CLAUDE CODE — "BIOCRISIS" (homenaje survival-horror, Phaser + raycasting)

## Rol
Actúa como desarrollador senior de juegos web, experto en Phaser 3, raycasting estilo Wolfenstein 3D/Doom, rendimiento en móvil y arte/audio procedural. Sé analítico y crítico: antes de implementar cada sistema importante, escribe en `docs/DECISIONS.md` la decisión, las alternativas descartadas y por qué. Si algo de este prompt es una mala idea técnica, dilo y propón una alternativa en lugar de obedecer a ciegas.

## Objetivo
Construir un **homenaje original** a los survival-horror en primera persona de PS1 (el espíritu de *Resident Evil Survivor*): una casa pequeña, munición escasa, zombies lentos y amenazantes, una llave que encontrar y una puerta de salida. Un seudo-3D con raycasting jugable en escritorio y en móvil.

## Restricción legal y creativa (no negociable)
- **Cero contenido de Capcom**: ningún nombre, personaje, logo, mapa, sonido ni sprite de Resident Evil. El juego se llama **BioCrisis** (nombre definitivo). Personajes, historia, casa, logotipo y tipografía son originales. El logo de BioCrisis debe dibujarse proceduralmente con identidad propia: nada que imite el logo de Resident Evil/Biohazard ni el de Umbrella (sin hexágonos/paraguas rojiblancos, sin su tipografía característica). Si ves un riesgo de parecido por el nombre, anótalo en `DECISIONS.md`.
- **Todo el arte y audio es procedural**: texturas, sprites, HUD e iconos se generan por código (Canvas 2D / `ImageData` / `Phaser.Textures.CanvasTexture`); sonidos con Web Audio API (osciladores, ruido filtrado, envolventes). **No descargues ni incluyas assets externos.** Puedes usar solo una fuente del sistema o dibujar tu propia fuente bitmap procedural.
- Interpreto "busca los assets ideales" como: **diseña y genera** el set de assets ideal para el gameplay. Lista en `docs/ASSETS.md` qué assets necesita el juego y cómo se genera cada uno.

## Decisión de estética (ya analizada; cuestiónala solo con argumentos)
**Pixel art de baja resolución con look PS1 oscuro**, no "moderno":
- Render interno ~**320×200** (o 384×216) escalado con `image-rendering: pixelated`. Razones: (1) rendimiento de raycasting en CPU/móvil, (2) el arte procedural a baja resolución se ve intencional, el "moderno" procedural se ve barato, (3) coincide con la época y con Wolfenstein/Doom.
- Paleta limitada (≈32 colores), niebla por distancia hacia casi negro, sombreado por lado de pared (N/S más claro que E/O), ligero dithering ordenado (Bayer) para degradados, viñeta y grano sutil.
- Ambiente: casa abandonada de noche, tonos verde-grisáceos y sangre oscura, luz pobre. El miedo viene de la oscuridad y la escasez, no de gráficos complejos.

## Stack
- **Phaser 3 (última versión estable 3.x)** + **Vite** + **TypeScript**. Fija la versión exacta en `package.json`.
- Phaser se usa para: ciclo de juego, escenas, input (teclado/touch/gamepad), escalado y presentación del canvas. **El raycaster va en módulos TS puros sin dependencia de Phaser** (`src/engine/`), para poder probarlos con tests unitarios (Vitest). Sé crítico: Phaser aporta poco al raycasting en sí; no lo uses para renderizar cada columna como Game Object (eso destruye el rendimiento). Escribe en un `ImageData`/buffer `Uint32Array` y súbelo a una `CanvasTexture` una vez por frame.

## Motor (requisitos técnicos)
1. Raycasting con **DDA**, corrección de ojo de pez, paredes texturizadas (texturas procedurales 64×64, ≥5 tipos: papel tapiz, madera, ladrillo, puerta, puerta cerrada con cerradura), suelo y techo (liso con gradiente o *floor casting* si el presupuesto de frames lo permite; decide y justifica).
2. **Sprites billboard** (zombies, ítems, decoración) ordenados por distancia, recortados con **z-buffer por columna**.
3. **Puertas** interiores que se abren (animación deslizante) y una puerta de salida que requiere la llave.
4. Colisiones con círculo vs. grilla, deslizamiento por paredes, sin atravesar esquinas.
5. Loop con **paso fijo** (p. ej. 60 Hz de lógica) independiente del framerate. Objetivo: 60 FPS en escritorio y ≥30 FPS estables en un móvil de gama media (documenta cómo lo mediste).
6. Sin asignaciones de memoria en el bucle caliente (reutiliza arrays/buffers).

## Gameplay
- **Mapa**: una casa de ~**20×20 celdas**, 6–8 estancias (recibidor, sala, cocina, pasillo, dormitorio, sótano/almacén, etc.), definida como grilla de datos en `src/game/map.ts`. Diseño de nivel con intención: la llave está en la zona más lejana, hay un bucle para huir, un pasillo estrecho de tensión, y la puerta de salida se ve desde el inicio (el jugador sabe qué busca).
- **Controles de cámara**: gira + avanza/retrocede + strafe. Considera una opción "tank" estilo clásico; justifica el valor por defecto.
- **Armas (2)**, cada una con su propio sprite de primera persona dibujado proceduralmente, animación de disparo/recarga/cambio, sonido, destello y retroceso:
  - **Pistola**: la tienes desde el inicio. Cargador (p. ej. 12) y reserva limitados, hitscan preciso, cadencia media, daño bajo, recarga rápida. Ideal para ahorrar y para disparos lejanos.
  - **Escopeta**: se encuentra en la casa (no al inicio; colócala tras un riesgo o un rincón explorado, para dar sensación de progreso). Cartuchos propios (cargador pequeño, p. ej. 4–6), disparo en **abanico de perdigones** (varios rayos con dispersión, daño decreciente con la distancia), cadencia lenta con animación de bombeo, daño alto a corta distancia y retroceso/aturdimiento al zombie. Equilibra para que no invalide a la pistola: munición muy escasa y poco útil de lejos. Justifícalo en `BALANCE.md`.
  - Tipos de munición separados (balas / cartuchos). Cambiar de arma interrumpe la recarga.
  - Incluye una pequeña ayuda de puntería (tolerancia angular) activable, importante en móvil.
- **Zombies**: 2 tipos (lento resistente; más rápido y frágil), 4–7 en total repartidos por el mapa, estados `idle → alerta → persecución → ataque → muerto`, detección por distancia + línea de visión + ruido de disparos, pathfinding simple (A* en grilla o seguimiento de flujo), evitan apilarse. Animación procedural de 2–3 frames (caminar, ataque, muerte) y reacción al impacto.
- **Medicina**: ítem consumible (p. ej. "spray médico" o hierba/botiquín pequeño, original, sin imitar el de RE) que **cura una cantidad fija de vida** (no al 100 %). Se puede usar **en cualquier momento, incluso mientras te atacan**, tanto desde el inventario como con un atajo rápido; usarla tiene una breve animación/sonido durante la cual el jugador sigue siendo vulnerable (decisión de riesgo deliberada: decide y justifica si bloquea el movimiento). Aviso visual de vida baja (viñeta roja, latido sonoro, HUD parpadeante). Con la vida llena no se consume.
- **Recursos**: botiquines y munición escasos y bien colocados (el balance es parte del diseño: documenta cuánta munición hay vs. cuánta se necesita para matar a todos; no se debe poder matar a todos sin errar *ni* ser imposible).
- **Objetivo**: encontrar la llave → abrir la puerta de salida → pantalla de victoria. Muerte → pantalla de game over con reinicio rápido.
- **Inventario (menú)**: se abre con una tecla/botón dedicado (escritorio: `I` o `Tab`; móvil: SELECT), con estética de survival-horror clásico (panel oscuro, ranuras en cuadrícula, ítems con icono procedural, descripción del ítem seleccionado, cursor navegable con teclado/gamepad/touch). Contenido:
  - **Equipar arma**: Pistola y Escopeta (la escopeta aparece solo cuando se ha recogido). Muestra cargador/reserva de cada una y marca la equipada.
  - **Usar medicina** (con contador de unidades) para curarse; muestra la barra de vida y su estado ("Bien / Precaución / Peligro").
  - **Llave** (y futuros objetos clave) visible en el inventario, no consumible; "examinar" muestra su descripción.
  - Capacidad limitada y explícita (p. ej. 6–8 ranuras: arma/s, medicinas, llave; la munición no ocupa ranuras y se muestra junto al arma). Decide, justifica y documenta.
  - **Decisión crítica**: el inventario clásico **pausa el juego**, lo que mantiene la tensión de gestión pero resta presión en combate. Impleméntalo así (pausa total mientras está abierto), y añade **atajos rápidos fuera del menú** para no depender de él en plena huida: cambiar de arma (teclas `1` pistola / `2` escopeta y ciclo con rueda/botones) y curarse (`H`). Evalúa en `DECISIONS.md` si es mejor un cooldown al cambiar de arma para evitar abuso.
  - El inventario y la pausa son pantallas distintas; Esc/B cierra el inventario y vuelve al juego sin perder estado. Se destruye limpiamente al volver al menú principal.
- **HUD**: vida, arma equipada con munición (cargador/reserva), medicinas restantes, ícono de llave, mensajes cortos ("Necesitas una llave"), minimapa opcional (desactivado por defecto; decide con criterio si encaja con el género).

## Flujo de juego y menús
Define el flujo como una máquina de estados explícita (documéntala con un diagrama en `docs/FLOW.md`):

`Boot → "Toca/pulsa para empezar" (desbloquea audio) → Menú de título → [Nueva partida → Intro corta → Juego] → [Muerte → Game Over → Reintentar / Menú] → [Victoria → Créditos/estadísticas → Menú]`

- **Menú de título estilo survival-horror clásico (inspirado en la era RE2, sin copiar nada)**: fondo oscuro y estático con composición dramática dibujada proceduralmente (silueta de la casa o puerta entreabierta, niebla animada, destellos de relámpago ocasionales, gotas/lluvia, parpadeo de luz), logo BioCrisis con efecto de desgaste/sangre, lista vertical de opciones (NUEVA PARTIDA, CONTROLES, OPCIONES, SALIR/CRÉDITOS) con cursor/resaltado y sonido de selección, fundidos a negro entre pantallas, música propia del menú. Navegable con teclado, gamepad y táctil.
- **Pantalla de CONTROLES** (opción del menú de título, también accesible desde el menú de pausa; escena propia reutilizable `Controls`), con el mismo estilo visual oscuro del juego:
  - Dos pestañas/páginas: **ESCRITORIO** y **MÓVIL**, alternables con izquierda/derecha, `Tab`, clic/tap o L/R. Al abrirla se muestra primero la que corresponde al dispositivo detectado.
  - **Escritorio**: diagrama dibujado proceduralmente de teclado (WASD/flechas resaltadas) y ratón, con tabla de acciones: mover, girar, strafe (Q/E), disparar, recargar, usar/interactuar, cambiar arma (`1`/`2`), curarse (`H`), inventario (`I`/`Tab`), pausa (Esc), giro con ratón (Pointer Lock) y gamepad básico.
  - **Móvil**: diagrama del mando estilo Game Boy con cada botón rotulado: D-pad (avanzar/retroceder/girar), A (disparar), B (usar/recargar), START (pausa), SELECT (inventario), L (ciclar arma), R (curarse). Indica la orientación recomendada (horizontal).
  - Los diagramas deben generarse **a partir de la misma tabla de configuración de controles** que usa el juego (una única fuente de verdad en `src/game/controls.ts`), de modo que si cambia un atajo la pantalla se actualiza sola y nunca queda desactualizada.
  - Sección breve de objetivo y consejos (p. ej. "Encuentra la llave", "La munición es escasa"), y un botón VOLVER (Esc/B) que regresa a la pantalla de origen (título o pausa) sin perder estado.
  - Se muestra automáticamente una vez, antes de la primera partida (tras la intro), y luego solo a demanda; recuerda en `localStorage` que ya se vio.
  - Legible en pantallas pequeñas: texto con tamaño mínimo, sin desbordes en móvil horizontal.
- **Intro corta** (5–10 s, saltable): texto narrativo mínimo sobre negro o pantalla de "tutorial" con controles, para que el jugador entienda el objetivo.
- **Menú de pausa** (Esc / START): opciones REANUDAR, CONTROLES, OPCIONES (volumen música/efectos, sensibilidad, ayuda de puntería), **VOLVER AL MENÚ PRINCIPAL** (con confirmación "¿Abandonar partida?") y REINICIAR. Al pausar se congela toda la lógica y se atenúan los sonidos, y la música se reduce o se pausa. Al volver al menú se destruye limpiamente el estado de la partida (sin fugas de listeners, audio o timers) y se puede iniciar otra partida sin recargar la página.
- **Game Over** y **Victoria** con estadísticas (tiempo, balas usadas, zombies eliminados, rango simple tipo A/B/C) y opciones de reintentar o volver al menú.
- Todos los menús deben funcionar con teclado, gamepad y touch (mismos botones Game Boy en móvil).
- Opciones persistentes en `localStorage` (volumen, sensibilidad), manejando que pueda no estar disponible.

## Audio (Web Audio procedural)
**Efectos**: disparo, recarga, pasos, gruñidos de zombie (con paneo/atenuación por distancia y dirección), golpe recibido, puerta, recoger ítem, sonidos de menú (mover cursor, aceptar, volver). Desbloquear audio tras el primer gesto del usuario (política de autoplay). Botón de silencio y buses separados (música / efectos / ambiente) con control de volumen independiente.

**Música generada proceduralmente (sin samples ni archivos)**: crea un pequeño motor de música generativa en `src/audio/music/` con un secuenciador propio (programado con el reloj de `AudioContext`, no con `setInterval`, para evitar desincronización):
- **Tema del menú**: pad lento y sombrío en tonalidad menor (p. ej. Do menor/Re frigio), arpegio escaso tipo piano o campana sintetizada, drone grave, reverb sintética (convolver con impulso generado por ruido).
- **Exploración**: música mínima y tensa — drones, disonancias esporádicas (segundas menores, tritonos), silencios largos; semilla aleatoria para que no se repita exacto pero mantenga carácter.
- **Persecución/combate**: capa de intensidad (pulso rítmico, percusión sintetizada, cuerdas agudas) que sube cuando hay zombies en persecución y baja al calmarse, con transición por crossfade (música adaptativa por capas).
- **Game Over** (sting corto) y **Victoria** (resolución en mayor/alivio).
- Todo parametrizado con escalas, progresiones y un RNG con semilla para poder probar. Sé crítico: genera música *sutil* y atmosférica; la melodía generativa suele sonar mal, así que prioriza texturas y silencios sobre melodías complejas, y documenta en `DECISIONS.md` cómo evitaste que sonara repetitiva o estridente. Cuida el consumo de CPU en móvil (limita nodos simultáneos, libera osciladores terminados).

## Controles
**Escritorio**: WASD/flechas (mover/girar), Q/E strafe, ratón opcional con Pointer Lock para girar, clic/Espacio disparar, R recargar, E/F usar/interactuar, `1`/`2` cambiar arma, `H` curarse rápido, `I`/`Tab` inventario, Esc pausa. Soporte básico de gamepad.

**Móvil** (detección por touch + orientación, también activable manualmente): **overlay estilo Game Boy** en horizontal:
- D-pad a la izquierda (arriba/abajo = avanzar/retroceder, izquierda/derecha = girar).
- Botones **A** (disparar) y **B** (usar/recargar contextual o recargar) a la derecha; **START** (pausa) y **SELECT** (**inventario**) abajo al centro. En móvil el strafe se omite (el D-pad ya gira) salvo que justifiques lo contrario.
- Dos **botones de hombro L/R** pequeños en la parte superior (estilo GBA): L = ciclar arma, R = curarse rápido (medicina). Esto evita abrir el inventario en plena huida. Críticalo: si saturan la pantalla en móvil, propón una disposición alternativa.
- Dibujado por código (DOM/CSS o canvas), con **multitouch real** (mover y disparar a la vez; usa Pointer Events con seguimiento por `pointerId`), áreas táctiles grandes (≥48 px), feedback visual y háptico (`navigator.vibrate` si existe), `touch-action: none`, sin zoom ni scroll, safe-areas. En vertical, muestra aviso para girar el dispositivo o un layout alternativo; sé crítico sobre cuál es mejor y decide.
- Sé crítico con el d-pad para girar: es menos preciso que un stick. Justifica, y si lo ves necesario ofrece sensibilidad ajustable.

## Estructura sugerida
```
src/engine/    raycaster, texturas procedurales, sprites, z-buffer  (puro TS)
src/game/      mapa, entidades, IA, armas, estado del juego
src/audio/     sintetizador procedural + src/audio/music/ (música generativa)
src/ui/        HUD, menús, controles táctiles
src/scenes/    Boot, Title, Controls, Intro, Game, Pause, Inventory, GameOver, Win (Phaser)
docs/          DECISIONS.md, ASSETS.md, BALANCE.md, FLOW.md
tests/         unit tests del motor y de la lógica
```

## Método de trabajo (obligatorio)
1. **Primero, modo plan**: propón arquitectura, riesgos y orden de implementación y espera mi aprobación.
2. Implementa por hitos, y verifica cada uno ejecutando el juego de verdad (servidor de desarrollo + navegador, capturas de pantalla, consola sin errores) antes de pasar al siguiente:
   - H1: ventana, loop fijo, raycaster con paredes texturizadas y movimiento con colisión.
   - H2: puertas, suelo/techo, niebla, mapa completo de la casa.
   - H3: sprites con z-buffer, ítems, llave y puerta de salida (juego completable sin enemigos).
   - H4: pistola, zombies con IA, daño, muerte.
   - H4b: sistema de armas (escopeta con perdigones, cambio de arma, munición por tipo), medicina y curación, y modelo de datos del inventario (en TS puro, con tests). Luego el **menú de inventario** (UI, navegación teclado/gamepad/touch, atajos rápidos).
   - H5: HUD, efectos de audio, flujo completo de juego (Boot → Título → Intro → Juego → Pausa → Game Over/Victoria → Menú), menú de título clásico y menú de pausa con "volver al menú". Verifica el ciclo de iniciar/abandonar/reiniciar partida 10 veces seguidas sin fugas ni errores.
   - H5b: motor de música procedural (menú, exploración, persecución, stings) integrado con el flujo y la pausa.
   - H6: controles táctiles Game Boy, escalado responsivo, pruebas en viewport móvil emulado.
   - H7: balance, rendimiento, pulido, README.
3. Tests unitarios (Vitest) para: DDA/distancia de pared, colisiones, línea de visión, daño/munición, lógica de llave y puerta, dispersión y daño de la escopeta, cambio de arma durante recarga, curación (tope de vida, no consumir con vida llena) y capacidad del inventario.
4. Al final, entrega: `README.md` (cómo ejecutar, controles, build), `npm run build` funcionando y una **revisión crítica honesta** de lo que quedó flojo (rendimiento, balance, IA, UX táctil) con propuestas de mejora.

## Criterios de aceptación
- Se puede jugar de inicio a fin en escritorio y en móvil (emulado y, si es posible, descrito cómo probar en dispositivo real en la red local).
- ≥ 60 FPS escritorio; sin caídas visibles en móvil emulado con throttling de CPU.
- El flujo completo funciona sin recargar la página: título → partida → pausa → volver al menú → nueva partida; también tras Game Over y Victoria.
- La música es 100 % generada por código, cambia según el estado (menú/exploración/persecución), respeta la pausa y el silencio, y no se acumulan nodos de audio con el tiempo.
- La pantalla de Controles muestra las páginas Escritorio y Móvil, es accesible desde el menú de título y el de pausa, y refleja exactamente los atajos reales del juego (misma fuente de datos).
- Se puede abrir el inventario, cambiar entre pistola y escopeta, curarse con medicina (también en plena persecución con el atajo rápido) y cerrar el inventario sin perder estado, en escritorio y en móvil.
- Cero assets externos; cero referencias a Capcom/Resident Evil en código, texto y nombres de archivo.
- Sin errores en consola; build de producción generado.
- Partida completa dura entre 5 y 10 minutos, con tensión real por la escasez de munición.

## Fuera de alcance (no lo hagas)
Multijugador, guardado en la nube, múltiples niveles, inventario complejo más allá de lo descrito (sin combinar ítems, sin cajas de almacenamiento, sin arrastrar y soltar), física avanzada, assets descargados.
