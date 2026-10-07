# BALANCE

Los números viven en el código (`game/zombie.ts`, `game/weapons.ts`, `game/world.ts`, `game/map.ts`, `game/player.ts`) y los
invariantes están protegidos por `tests/balance.test.ts`. Las cifras de dificultad se midieron con un **jugador automático**
(`tools/bot.ts`, `npm run sim`); ver "Qué dice y qué no dice el bot".

## Armas
| | Pistola | Escopeta |
|---|---|---|
| Daño | 10 por bala | 7 × 7 perdigones, ×(1.4 − 0.18·d) con mínimo 0.12 (≈ 49 a bocajarro) |
| Cargador | 12 | 4 (recarga cartucho a cartucho) |
| Cadencia / recarga | 0.32 s / 1.3 s | 1.0 s (bombeo) / 0.55 s por cartucho |
| Aturdimiento | 0.25 s | 0.8 s + empuje |
| Ruido (alerta a zombis) | 9 celdas | 12 celdas |
| Munición en la casa | 12 en el cargador + 6 de reserva + 3 cajas de 4 = **30 balas** | 2 cargados al recogerla + 1 caja de 3 = **5 cartuchos** |

Por qué la escopeta no invalida a la pistola: casi sin munición (5), recarga lenta, cadencia de 1 s, y a más de ~6 celdas
casi todos los perdigones fallan o hacen daño mínimo. La pistola es la única arma "de fondo".

## Jugador y zombis
| | Jugador | Rezagado | Corredor |
|---|---|---|---|
| Velocidad (celdas/s) | 2.1 (marcha atrás ×0.6, de lado ×0.85) | 0.95 | 1.75 |
| PV | 100 (+2 tónicos de +35) | 70 (7 balas) | 35 (4 balas) |
| Daño por golpe | — | 18 (preparación 0.55 s) | 12 (preparación 0.35 s) |
| Sentidos | — | vista 7, oye pasos a 5.5 | vista 9, oye pasos a 5.5 |

- Los zombis son **sólidos** para el jugador (no se les atraviesa: un zombi en el pasillo de una celda lo cierra).
- Persisten: 12 s sin ver ni oír antes de rendirse; siguen los pasos a ≤ 5.5 celdas aunque no te vean.
- **Clímax:** al coger la llave la casa despierta (el ruido llega a todos los zombis vivos) y la puerta de salida tarda
  ≈ 1 s en ser transitable. Es lo que impide ganar corriendo: 6 zombis convergen justo cuando tienes que volver.

## Presupuesto de munición (invariantes con test)
- Matar a todos con la pistola exigiría 3×7 + 3×4 = **33 balas** y hay **30** → *no se puede matar a todos con la pistola,
  ni acertando siempre*.
- Pero **no es imposible**: un cartucho mata a un corredor a bocajarro (3 cartuchos) y los rezagados cuestan 21 balas: con
  los 5 cartuchos y 30 balas, 9 balas de margen (≈ 30 %) para fallar. Quien dispare a todo sin cuidado se queda sin munición.

## Qué dice y qué no dice el bot (`npm run sim`, 40 partidas por política, aleatoriedad de puntería)
Cota optimista: ruta perfecta, sin dudas, pero con puntería ruidosa (σ ≈ 0.2 rad) y 0.35 s de reacción.

| Política | Victorias | Muertes | Tiempo mediano | Balas | Acierto | Bajas | Tónicos |
|---|---|---|---|---|---|---|---|
| Huida (correr sin disparar) | 0 % | 100 % | — | 0 | — | 0/6 | 0 |
| Sigilo (dispara solo a quien le persigue ≤ 5) | 0 % | 100 % | — | 11.6 | 88 % | 1.0/6 | 0 |
| Agresivo (mata todo ≤ 9, recoge todo) | 40 % | 60 % | 111 s | 31.8 | 87 % | 5.3/6 | 0.6 |
| Táctico (mata corredores, esquiva rezagados) | 98 % | 3 % | 115 s | 28.3 | 99 % | 6.0/6 | 0.0 |

Lectura:
- **Correr no funciona** (era 100 % en 37 s antes del clímax de la llave: ver "Historia de ajustes"). Hay que pelear o
  esquivar con cabeza, y la munición no da para todo.
- La estrategia ingenua (disparar a todo) gana 4 de cada 10; la reflexiva casi siempre. Una persona estará en medio: el
  objetivo era una **curva de habilidad**, no una cifra única.
- El bot táctico es sobrehumano (99 % de acierto, esquiva perfecta): su 98 % es el techo, no la media.
- **Duración (criterio 5–10 min): NO verificada con personas.** El bot, sin dudar, tarda ≈ 2 min recogiéndolo todo.
  Las personas se paran, se asoman, retroceden, recargan y se curan; la estimación (×2.5–4) da 5–8 min, pero es una
  *estimación*. Mandos para alargar/acortar sin tocar el diseño: `MOVE_SPEED` (2.1), nº de zombis, `EXIT_DOOR_SPEED`,
  `GIVE_UP` de los zombis. Recomendación: 3–5 partidas de prueba con gente antes de dar el criterio por cumplido.

## Historia de ajustes (qué se cambió y por qué, según las mediciones)
1. Primera medición: **huida 100 % en 33 s**, agresivo 100 % en 68 s sin perder vida. Causas: el jugador atravesaba a
   los zombis; los zombis eran muy lentos (0.75 / 1.55) para un jugador a 2.6; el bot acertaba el 100 %.
2. Jugador 2.6 → 2.1, marcha atrás ×0.6 (se acabó el "kiting" andando hacia atrás), zombis sólidos, zombis 0.95 / 1.75.
3. Los zombis se rendían a los 2–6 s: ahora 12 s y oyen los pasos de cerca.
4. Seguía ganando corriendo (nadie se enteraba a tiempo): **la llave despierta la casa** y la salida tarda ≈ 1 s.
5. Munición 36+6 → 30+5 y ayuda de puntería 0.05 → 0.035 rad (el bot seguía acertando el 90 %).
6. Barrido de PV/daño: (90, 40) con daño 20/12 hacía imposible incluso al táctico (93 % de muertes); (60, 30) lo hacía trivial;
   se eligió **(70, 35) con daño 18/12** (agresivo 40 %, táctico 98 %).
