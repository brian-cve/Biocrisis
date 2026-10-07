# ASSETS (todo procedural, cero archivos externos)

| Asset | Generación | Módulo |
|---|---|---|
| Paleta de 32 colores + LUT de niebla/sombreado | tabla fija + mezcla hacia niebla | `engine/palette.ts` |
| Paredes 64×64: papel tapiz, madera, ladrillo, puerta, puerta con cerradura | funciones por píxel con hash determinista | `engine/textures.ts` |
| Suelos 64×64: madera, baldosa, piedra, alfombra; techo con vigas | ídem | `engine/textures.ts` |
| Sprites 32×32: llave, tónico, balas, cartuchos, escopeta, lámpara, planta, barril | primitivas (rect/disco/línea) + contorno | `engine/sprites.ts` |
| Zombies, armas en primera persona, HUD, iconos, logo, fuente bitmap | pendiente (H4–H5) | — |
| SFX y música | pendiente (H5/H5b), Web Audio | `audio/` |
