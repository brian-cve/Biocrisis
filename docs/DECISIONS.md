# DECISIONS

Registro de decisiones técnicas: decisión, alternativas descartadas, motivo.

## D-001 Phaser 3.90.0 (no 4.x)
- **Decisión:** fijar `phaser@3.90.0`, última 3.x estable.
- **Descartado:** Phaser 4.x (existe, pero el requisito es 3.x y cambia el renderer).
- **Por qué:** Phaser solo aporta escenas, input, escalado y presentación; el raycaster es TS puro.

## D-002 Riesgo de nombre
- "BioCrisis" comparte el prefijo "Bio-" con franquicias existentes. Se mitiga con logo, tipografía,
  paleta y mundo propios; sin hexágonos, paraguas ni rojo/blanco corporativo. Revisar antes de publicar.

## D-003 Suelo y techo: floor casting (no gradiente)
- **Decisión:** floor casting por filas en una sola pasada (suelo + techo espejo), con textura por tipo de suelo
  (madera, baldosa, piedra, alfombra) y niebla por distancia de fila.
- **Descartado:** gradiente liso. Con 320×200 el coste son ~64k píxeles/frame con aritmética simple y mantiene 60 FPS
  en escritorio; el suelo texturizado da mucha más profundidad y distingue estancias.
- **Salvaguarda:** si H6/H7 muestran <30 FPS en móvil, se añade un flag de calidad que cae a gradiente.

## D-004 Puertas
- **Modelo:** la puerta ocupa una celda y su panel desliza hacia +wallX; el DDA deja pasar el rayo si `wallX < apertura`.
  Sin geometría extra y sin asignaciones. Es sólida hasta apertura ≥ 0.8.
- **Interacción:** tecla `F`. El diseño inicial asignaba `E` tanto a strafe como a "usar"; se resuelve dejando `E` para strafe
  (Q/E) y `F` para interactuar. En móvil será el botón B.
- **Cierre:** no se puede cerrar una puerta con alguien dentro de su celda.
- La puerta de salida empieza bloqueada; la llave llega en H3.

## D-005 Diseño de la casa
- Pasillo central de 1 celda (x=9) = "pasillo estrecho de tensión". Bucles: Recibidor→Sala→Pasillo→Recibidor y
  Dormitorio→Estudio→Pasillo. Inicio en el recibidor mirando al oeste: la puerta de salida (0,15) se ve desde el inicio
  (test automático). Llave prevista en el dormitorio (NE, zona más lejana); escopeta prevista en el estudio.
- Test BFS: toda celda libre es alcanzable desde el inicio.

## D-006 Sprites billboard
- Texturas de sprite 32×32 en índices de paleta (255 = transparente), dibujadas por código (`engine/sprites.ts`).
- Orden lejano→cercano con ordenación por inserción sobre un `SpriteBatch` reutilizable (cero asignaciones por frame);
  recorte con el z-buffer de columna de las paredes. Un sprite no oculta a otro por z-buffer (algoritmo del pintor
  entre sprites: suficiente porque no se solapan en profundidad de forma relevante).
- Los objetos recogibles flotan con un vaivén suave para que se lean en la penumbra. La decoración no tiene colisión
  (decisión de simplicidad: evita atascos en un mapa estrecho).

## D-007 Mundo en TS puro
- `game/world.ts` agrupa mapa, puertas, jugador, objetos y objetivo, sin Phaser: testeable (llave, puerta de salida,
  victoria). Los contadores de objetos (tónicos/munición/escopeta) son provisionales y se sustituyen en H4b por el
  modelo de inventario.
- Más allá del borde del mapa (tras la puerta de salida) se pinta oscuridad en lugar de pared: señala "afuera".
- Victoria = entrar en la celda de salida (solo posible con la puerta abierta, que exige la llave).

## D-008 Zombis: IA y sensores
- **Estados:** `Idle → Alert (0.6 s) → Chase → Attack → Dead`. Hurt = aturdimiento (`stagger`) con empuje, no un estado aparte.
- **Detección:** vista (distancia ≤ `sight` + línea de visión; las puertas cerradas la bloquean) y oído (un disparo
  alerta a los zombis a ≤ 9 celdas). Probado primero con 14: despertaba toda la casa de un tiro y eliminaba el sigilo,
  así que se bajó a 9.
- **Movimiento:** recto si ven al jugador a < 2.5 celdas; si no, A* (4 vecinos, buffers reutilizables, repath cada 0.5 s).
  Si pierden de vista al jugador van a la última posición conocida y se rinden a los 6 s (o a los 2 s tras llegar).
- **Puertas:** los zombis las abren (0.6 s de espera). Cerrar una puerta retrasa pero no salva: decisión deliberada para
  que no haya refugios gratis; la puerta de salida es inaccesible para ellos.
- **Anti-apilamiento:** separación por solapamiento de círculos en cada paso.
- **Tipos:** Rezagado (60 PV, 0.75 c/s, 18 daño, ataque lento) y Corredor (30 PV, 1.55 c/s, 10 daño). Ambos más lentos
  que el jugador (2.6 c/s), de modo que huir funciona pero consume recursos/espacio. Pistola = 10 de daño: 6 y 3 balas.
- **Colocación:** 3 rezagados + 3 corredores (sala, cocina, pasillo estrecho, dormitorio junto a la llave, estudio junto
  a la escopeta, almacén). El balance fino va en `BALANCE.md` (H7).

## D-009 Arma
- `Weapon` (TS puro) con cargador, cadencia, recarga y reserva; cambiar de arma cancela la recarga sin gastar reserva.
  La escopeta (H4b) reutilizará la misma clase añadiendo perdigones.
- Hitscan con tolerancia angular (`aimAssist`, 0.05 rad) y línea de visión; el más cercano gana. Intentar disparar con
  el cargador vacío recarga automáticamente si hay reserva.
- El arma en primera persona es un bitmap procedural ×2 con balanceo, retroceso, destello y bajada al recargar.

## D-010 Escopeta (y por qué no invalida a la pistola)
- 7 perdigones de 7 de daño en abanico (semiángulo 0.14 rad, con algo de azar), cadencia 1.0 s (animación de bombeo),
  cargador de 4 recargado **cartucho a cartucho** (0.55 s cada uno; disparar interrumpe la recarga) y empuje/aturdimiento
  de 0.8 s frente a los 0.25 s de la pistola.
- **Daño decreciente:** factor `clamp(1.4 − 0.18·dist, 0.12, 1)`: pleno hasta ~2 celdas y ~0.14 a 7. Además el abanico
  deja de acertar a distancia (a 6 celdas solo ~1/3 de perdigones alcanzan a un zombi). Resultado: de cerca ~49 de daño
  (un corredor muere; un rezagado, con 60 PV, necesita un segundo cartucho), de lejos casi nada. Test automatizado.
- Munición: al recogerla trae 2 cartuchos cargados y solo hay otra caja de 4 en la casa (6 en total): escasez deliberada.
- La ayuda de puntería centra el abanico en el objetivo más cercano dentro de la tolerancia.

## D-011 Cambio de arma
- Teclas `1`/`2`, rueda del ratón (ciclo) y, más adelante, botón L. Cambiar **interrumpe la recarga** sin gastar reserva
  (la recarga solo transfiere munición al completarse) y el arma guardada queda congelada.
- **Cooldown de 0.4 s** tras cambiar (no se puede disparar): evita el "cambio-spam" para saltarse la cadencia de la
  escopeta (disparar, cambiar a pistola, disparar, volver) y la recarga. Es corto para no castigar el cambio táctico.

## D-012 Medicina
- El tónico cura **35** de 100 (cantidad fija). Con la vida llena no se consume (mensaje "Vida llena").
- **En juego** (`H`, botón R en móvil): animación de 0.8 s. El jugador **puede moverse** (no se le inmoviliza: huir
  mientras se cura es la apuesta de riesgo) pero **no puede usar armas** (tiene las manos ocupadas) y **sigue siendo
  vulnerable**; el tónico se gasta al terminar, no al empezar. Recibir un golpe no cancela la cura.
- **Desde el inventario** el mundo está en pausa, así que se aplica al instante: es el trueque clásico (gestión segura
  fuera del combate) y es lo que hace útiles los atajos rápidos.

## D-013 Inventario
- **8 ranuras (4×2).** Pistola, escopeta y llave ocupan una cada una; los tónicos no se apilan (una ranura por unidad).
  La munición no ocupa ranura y se muestra junto al arma. Con 3 objetos fijos quedan 5 ranuras para tónicos: en esta
  casa solo hay 2, así que la capacidad nunca debería llenarse; existe y está probada (mensaje "Inventario lleno" y el
  objeto queda en el suelo) para que el modelo sea honesto y ampliable.
- **Pausa total** mientras está abierto (la escena Game se pausa y se reanuda sin perder estado). Se evita reabrirlo con
  la misma pulsación que lo cierra (el teclado de Phaser encola eventos de escenas pausadas): bloqueo de 250 ms.
- Controles del menú: flechas/WASD, Enter/Espacio/F actúan, Esc/I/Tab/Backspace cierran; gamepad con cruceta/stick,
  A actúa, B/SELECT/START cierran; táctil: tocar selecciona y volver a tocar actúa, `[CERRAR]` cierra.

## D-014 Flujo y escenas (H5)
- **Superposiciones vs. sustitución:** Pause, Inventory, Controls y Options se lanzan encima y pausan la escena de
  origen; Boot/Title/Intro/Game/GameOver/Win se sustituyen con fundido. Las escenas de salida paran la partida
  explícitamente (`scene.stop('Game')`) para que se ejecute su limpieza.
- **Controles tras la intro, solo una vez:** `controlsSeen` en `localStorage` (con `try/catch`; sin almacenamiento se
  muestra en cada sesión, que es lo seguro). Después solo a demanda desde título y pausa.
- **Bug encontrado y corregido:** un fundido de *entrada* en curso bloqueaba el siguiente fundido de *salida* (el primer
  Enter tras entrar al título se ignoraba). `fadeTo` ahora solo ignora si ya se está yendo a negro.
- **Eventos de teclado en pausa:** Phaser encola eventos de las escenas pausadas y los reproduce al reanudar, por lo que
  la tecla que cierra Pausa/Inventario reabría el menú. Solución: `resetKeys()` + bloqueo de 250 ms al reanudar.

## D-015 Controles por defecto (¿"tank"?)
- **Teclado:** izquierda/derecha (A/D, ←/→) **giran**; Q/E hacen strafe. Es decir, el esquema "tank" clásico es el
  predeterminado. Razones: (1) coincide con el género y con el D-pad móvil (que gira); (2) con 20×20 celdas y pasillos
  de una celda, girar con el teclado da más control que un ratón y no exige Pointer Lock; (3) mantiene una única
  semántica en escritorio, mando y táctil. El **giro con ratón** (Pointer Lock) existe como opción (apagada).
- **Una sola tabla** (`game/controls.ts`) alimenta el input, la pantalla de Controles y el overlay móvil; hay tests de que
  cada botón táctil tiene su acción (B = recargar/usar contextual, L = cambiar arma, R = curarse).
- **`E` = strafe, `F` = usar:** el diseño inicial asignaba `E` a ambas; se resolvió así (ver D-004).
- **Mando:** stick izquierdo mueve/gira, derecho gira, A dispara, B usa, X recarga, Y/RB cura, LB cambia arma, SELECT
  inventario, START pausa. *Implementado pero no probado con un mando físico* (no disponible aquí).

## D-016 Audio
- **Un `AudioContext`** creado en el primer gesto (pantalla "pulsa una tecla"), con buses `sfx / ambient / music → master`.
  Volumen independiente de música y efectos, silencio global, y *ducking* al pausar (efectos ×0.12, ambiente ×0.25,
  música ×0.3). El motor de música (H5b) cuelga del bus `music`.
- **Voces:** cada oscilador/ráfaga de ruido se desconecta en `onended`; **tope de 28 voces** simultáneas (CPU móvil).
  Un buffer de ruido de 2 s compartido. Bucles ambientales (viento en juego, lluvia en el título) con `stop()` que los
  libera. Verificado en navegador: tras 80 disparos de saturación las voces se quedan en 28 y vuelven a 0.
- **Espacial:** paneo = sen(ángulo relativo), atenuación cuadrática hasta 14 celdas (`audio/spatial.ts`, con tests).
  Gruñidos, puertas, impactos y muertes de zombis llevan posición; el resto suena "en la cabeza".
- **Director (`GameAudio`):** pasos por distancia recorrida, gruñido al alertarse/atacar y esporádico mientras acechan
  (más frecuente si persiguen), latido con vida ≤ 30 (más rápido cuanto menos vida), goteo lejano aleatorio.

## D-017 Título, logo y HUD
- **Logo** dibujado por código con una fuente de bloques propia (5×7): letras gastadas, una grieta, goteos de sangre y la
  "O" con una ranura vertical roja (identidad propia). Sin hexágonos, paraguas, rojo/blanco corporativo ni tipografía de
  ninguna franquicia. Sigue anotado el riesgo del prefijo "Bio-" (D-002).
- **Título:** casa en la tormenta (cielo, luna velada, árbol muerto, valla rota, ventana que parpadea, puerta entreabierta
  con rendija de luz), niebla en dos capas, lluvia, relámpagos con trueno retardado y viñeta.
- **Texto de menús:** fuente del sistema (monoespaciada) a 8–12 px; el logo es la única tipografía propia. Tamaño mínimo
  8 px sobre 320×200 (≈ 24 px reales al escalar a 960×600).
- **Minimapa:** opcional y **apagado por defecto**: un mapa siempre visible rompe el desconcierto de una casa
  desconocida y la tensión de perderse; se deja como ayuda de accesibilidad.

## D-018 Música generativa (H5b)
**Principio:** *texturas y silencios antes que melodía.* La melodía generativa suele sonar mal (repetitiva o estridente);
aquí lo que carga el clima es el pad, el bajo continuo, la reverb y la escasez de notas.

- **Reloj:** el secuenciador programa con `AudioContext.currentTime`, no con `setInterval`. `MusicEngine.tick()` se llama
  en cada frame de Phaser y programa los siguientes **0.8 s** de notas con tiempos absolutos del reloj de audio: el ritmo
  no depende de los FPS. Si el programador se retrasa >0.4 s (pestaña oculta, tirón) se **resincroniza** en vez de
  disparar una ráfaga de notas atrasadas.
- **Separación pura/audio:** `composer.ts` (qué suena), `theory.ts` (escalas/acordes) e `intensity.ts` son TS puro con RNG
  de semilla y tests (determinismo, pertenencia a la escala, densidad, capas); `synth.ts` y `index.ts` solo reproducen.
- **Menú (54 BPM, Do menor):** progresión Cm7–Abmaj7–Fm7–G, un acorde cada 2 compases. Pad (2 sierras desafinadas +
  triángulo, filtrado, ataque 1.6 s), bajo continuo que se solapa 2 compases, nota grave de piano ocasional y un
  arpegio de campana **muy escaso** (≈ 1 de cada 4 pulsos, ≤ 3 por compás, paseo corto sobre el acorde + novena, silencio
  el último compás de cada frase de 8). Reverb por convolución con impulso generado con ruido (3.4 s, cola oscura).
- **Exploración (Re frigio):** drones con batido, y entre 7 y 20 s de silencio, un evento al azar: racimo disonante
  (2ª menor o tritono, swell lento, ≥ 12 s entre racimos), nota grave de piano en la escala, o un crujido filtrado; más de
  un tercio de los turnos son silencio puro. Semilla distinta por partida → no se repite exacto, pero conserva carácter.
- **Persecución (108 BPM) por capas según la intensidad 0..1:** pulso grave (>0.08) → hi-hats y toms (>0.35/0.45) →
  cuerdas agudas en 2ª menor con trémolo (>0.55). La intensidad sube en ~1.6 s con zombis alerta/persiguiendo/atacando
  (más cerca = más) y **baja en ~8 s** al calmarse. La capa de persecución entra por crossfade y la exploración se repliega.
  El pulso solo se programa mientras es audible (ahorra CPU).
- **Stings:** Game Over (golpe seco + racimo grave disonante + caída de sierra, ≈ 6 s) y Victoria (acorde de Do mayor
  cálido + campanas ascendentes, ≈ 8 s). Callan el resto de capas.
- **Pausa y silencio:** la música pasa por el bus `music`: en pausa baja ×0.3 (≈ −10 dB) y el botón de silencio la
  anula (verificado con un analizador: −120 dBFS).
- **CPU/nodos:** tope de 44 fuentes de música vivas; cada voz se desconecta en `onended`. Las capas tienen ganancia propia y
  envío propio a la reverb (el crossfade apaga también la cola de reverb). El nodo de reverb es único y persistente.

**Mediciones en navegador (analizador sobre el master):** menú ≈ −23.5 dBFS (pico 0.5, sin saturar); exploración ≈ −26
dBFS (pico 0.13–0.17); persecución ≈ −23 dBFS con picos 0.53 (percusivo); el pulso se ve en la envolvente
(autocorrelación a 556 ms = 0.73 frente a ≈ 0.2 en lags sin relación); pausa ≈ −15 dB; silencio −120 dB; sting audible
y silencio después; nodos de música acotados (menú 13–36, exploración 4–13) y **0 tras apagar** (≤ 50 s: los drones
largos terminan su cola). *No he podido escucharla: la comprobación es instrumental; el criterio estético (¿suena bien?)
queda para el oído del jugador.*

## D-019 Controles táctiles (H6)
- **Overlay DOM/CSS** (`ui/touchUI.ts`), no canvas: hereda `touch-action: none`, safe-areas (`env(safe-area-inset-*)`) y
  escala con `vmin`/`clamp()`; el lienzo de Phaser queda debajo. D-pad a la izquierda; A y B a la derecha; L/R en las
  esquinas superiores; START/SELECT arriba al centro.
- **Multitouch real:** Pointer Events con `setPointerCapture` y seguimiento por `pointerId`. Cada botón admite varios
  punteros y solo se libera cuando se levantan todos; el D-pad sigue **un único dedo** (el primero) y calcula las
  direcciones por posición, así que se puede deslizar entre ellas y pulsar diagonales (avanzar + girar). Verificado con toques
  reales por CDP (dos dedos a la vez: `up+left` y `A`) y con Pointer Events sintéticos de distinto `pointerId` (D-pad
  mantenido + 3 disparos con A: 3 pulsaciones, 3 disparos, movimiento continuo, nada queda pegado). `blur` suelta todo.
- **Estado compartido por contadores** (`ui/touchState.ts`): cada botón tiene `held` y un contador de pulsaciones; quien
  consume (juego, cada menú) compara con el último contador que vio. Un toque más corto que un frame no se pierde y varios
  consumidores no se roban eventos (tests).
- **Mismos botones en los menús:** `PadNav` (que ya leía el gamepad) también lee el mando táctil: D-pad mueve, A acepta,
  B vuelve, START/SELECT. La intro se salta con cualquier botón. Los toques directos sobre los menús siguen funcionando.
- **Tamaños:** todas las zonas táctiles ≥ 48 px CSS (medido: mínimo 48), con tope máximo en tabletas para que no crezcan
  sin límite. Los rótulos de los botones se ocultan en pantallas poco panorámicas (< 18:10), donde no caben entre botones;
  siguen en la pantalla de Controles. Medido en 667×375, 740×360, 844×390, 932×430 y 1024×768: sin superposiciones, sin
  botones fuera de pantalla y sin scroll.
- **Posición:** A/B por encima de la barra del HUD (la munición no queda tapada) y START/SELECT arriba al centro, sobre
  el techo, donde tapan lo menos relevante de la imagen (la primera versión los puso abajo y tapaban arma y HUD).
- **D-pad para girar (crítica):** es menos preciso que un stick. Mitigaciones: (1) sensibilidad de giro ajustable (0.5–2);
  (2) el giro táctil **acelera** (arranca al 50 % y llega a velocidad plena en ~0.35 s) para apuntar fino con toques
  cortos sin perder rapidez al mantener; (3) ayuda de puntería activable. Strafe omitido en móvil (el D-pad ya gira).
- **B contextual:** abre la puerta si hay una delante; si no, recarga (L = cambiar arma, R = curarse). Estas son las
  únicas acciones que no estorban a la vista; el diseño con L/R pequeños arriba **no satura** la pantalla en 16:9+ ya que
  ocupan una franja que casi siempre es techo.
- **Vertical: aviso en vez de layout alternativo.** Un layout vertical daría una imagen de ~28 % de la pantalla (390×244
  sobre 390×844), peor FOV y menos inmersión para un juego de oscuridad y espacios estrechos, además de un segundo diseño de
  controles que probar. Decisión: mostrar "GIRA EL DISPOSITIVO", **congelar el juego** (`loop.sleep()`) y suspender el audio
  en vertical; al volver a horizontal se reanuda todo (verificado: tiempo del mundo constante y audio `suspended` → `running`).
- **Háptica:** `navigator.vibrate` (si existe) al pulsar botones (6–8 ms), al disparar (14/34 ms), al recibir daño (60 ms) y
  al morir (patrón). iOS Safari no la implementa: se degrada a nada.
- **Ajuste "Controles táctiles":** AUTO (según `pointer: coarse`), SÍ o NO (útil en portátiles táctiles o para depurar).
  El arranque ("pulsa para empezar") oculta el mando para que los toques lleguen al lienzo.
- **Disparo por toque en el lienzo desactivado** con el mando visible (evita disparos accidentales).

## D-020 Rendimiento en móvil (método y resultados)
- **Método:** Chromium con emulación móvil (`isMobile`, `hasTouch`, DPR 2, 844×390) y `Emulation.setCPUThrottlingRate`.
  Se comprobó que el *throttling* es real con un microbenchmark (16 ms → 65 / 98 / 163 ms a ×4 / ×6 / ×10). Escena de
  máxima carga: partida con los 6 zombis persiguiendo a la vez, música de persecución activa y el jugador girando.
  Se mide el FPS real de Phaser cada 250 ms y el coste por frame (de `step` a `postrender`).
- **Resultado:** 60.5–60.7 FPS medios y mínimo 60.3 con CPU ×1, ×4, ×6 y ×10; coste por frame 1.3 ms (×1), máximo 2.9 ms.
  Aunque el coste medido no escaló linealmente con el límite de CPU, **incluso multiplicando por 10 el coste de ×1 (≈ 13 ms)
  cabe en el presupuesto de 16.6 ms** de 60 FPS. Objetivo (≥ 30 FPS estables en gama media) cumplido con margen.
- **Limitación honesta:** es una emulación sobre un portátil; no sustituye a un dispositivo real (GPU, térmica, el
  compositor del navegador móvil, el coste de `putImageData` en WebViews antiguos). Cómo probar en un móvil real: ver README (H7).

## D-021 Balance y diseño de dificultad (H7)
Ver `docs/BALANCE.md` para cifras y barridos. Decisiones de diseño que salieron de medir, no de intuir:
- **Zombis sólidos** para el jugador (antes se les atravesaba: un pasillo de una celda no cerraba nada).
- **Marcha atrás ×0.6 / lateral ×0.85**: sin esto, andar hacia atrás disparando a un rezagado era una victoria segura.
- **La llave despierta la casa** (`ALARM_RADIUS = 40`) y **la puerta de salida es lenta** (≈ 1 s): convierte el tramo de vuelta
  en el clímax y elimina "correr hasta la salida" como estrategia dominante.
- **Persistencia de los zombis** (12 s, siguen los pasos a ≤ 5.5): perder a un perseguidor ya no es gratis.
- Ayuda de puntería 0.035 rad, activada por defecto, desactivable. Munición 30 balas + 5 cartuchos.
- Se añadieron **tests de invariantes** (`tests/balance.test.ts`) para que ningún retoque futuro rompa la regla "no se
  puede matar a todos con la pistola, pero no es imposible".

## D-022 Rendimiento: asignaciones por frame
- **Medido** con muestreo del heap (`tools/heapprof.mjs`, `tools/alloc.mjs`): el bucle caliente asignaba ≈ 1.6 MB/s
  (≈ 27 KB/frame), dominado por el *boxing* de dobles al pasar 4 argumentos decimales a `castRay` 320 veces por frame
  (`drawWalls` + `castRay` ≈ 1 MB/s).
- **Arreglo:** `castHit(map, hit)` lee el rayo de campos de un objeto reutilizado (los campos doble no asignan); `castRay`
  queda como envoltorio para el resto del código/tests. `GameInput` sin objetos temporales ni iteradores por frame y
  `hyp()` en la IA en lugar de `Math.hypot`.
- **Resultado:** 1.6 MB/s → 0.55–0.9 MB/s (los GC menores pasan de ~1/s a ~0.5/s). El resto es sobre todo interno de Phaser
  (Graphics/`emit`) más un resto de boxing menor en `castHit`. No supera el presupuesto: el coste por frame sigue en ~1–3 ms.
  Honestamente: el requisito "sin asignaciones en el bucle caliente" se cumple en el *render* (z-buffer, sprites, suelos) pero
  **no al 100 %** en el juego completo.

## Jefe final y arena (ampliación)
- La puerta del recibidor (3,19) (`CELL_BOSS_DOOR`, id 6) pide la llave y da a una arena de 18×14 (filas 20-34) con columnas de
  cobertura. El mapa pasa de 20×20 a 20×35; la salida real (9,34) queda sellada hasta vencer al jefe.
- Abrir esa puerta crea al jefe (`World.startBossFight`, aparece en `BOSS_SPAWN`): se añade a `world.zombies` en ese momento, así
  que la casa sin abrir sigue teniendo exactamente 6 zombis (balance y tests intactos).
- Jefe (`BOSS`): 650 PV, velocidad 1.15 (se enfurece bajo el 50 %: ×1.45 velocidad y recuperación más corta; sigue siendo más
  lento que el jugador, `MOVE_SPEED = 2.1`), 32 de daño, `poise` 0.12 (apenas se aturde/empuja) y nunca pierde el rastro.
- Metralleta (`SMG`, tecla `3`, fuego automático al mantener, comparte balas con la pistola): 30 de cargador, 9 de daño.
  Se recoge en la arena junto a la puerta. 6 cajas de 40 balas y 2 de 8 cartuchos + 2 tónicos repartidos por la arena.
- `tools/bot.ts` aún asume la salida antigua (0,15): no sabe pelear contra el jefe.
